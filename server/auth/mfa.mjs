import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fail } from '../validation.mjs';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

export function base32Decode(str) {
  const clean = String(str || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secretBase32, timestampMs = Date.now(), stepSeconds = 30) {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1000000;
  return String(code).padStart(6, '0');
}

export function verifyTotpCode(secretBase32, submittedCode, timestampMs = Date.now(), windowSteps = 1) {
  const clean = String(submittedCode || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return false;
  const actualBuf = Buffer.from(clean, 'utf8');
  for (let delta = -windowSteps; delta <= windowSteps; delta++) {
    const candidate = generateTotpCode(secretBase32, timestampMs + delta * 30000);
    const candBuf = Buffer.from(candidate, 'utf8');
    if (candBuf.length === actualBuf.length && timingSafeEqual(candBuf, actualBuf)) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUri({ accountLabel, issuer = 'J Beauty Operations', secretBase32 }) {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secretBase32)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function loadOrCreateMfaKey({ dbPath, prod = false } = {}) {
  const rawEnv = process.env.OPS_MFA_SECRET_KEY || '';
  if (rawEnv) {
    if (/^[a-fA-F0-9]{64}$/.test(rawEnv.trim())) {
      return Buffer.from(rawEnv.trim(), 'hex');
    }
    if (rawEnv.trim().length < 24) {
      fail('OPS_MFA_SECRET_KEY must be at least 24 characters or 64 hex chars', 500);
    }
    return createHash('sha256').update(rawEnv.trim()).digest();
  }
  if (prod) {
    fail('OPS_MFA_SECRET_KEY environment variable is required in production when MFA is enabled', 500);
  }
  if (!dbPath || dbPath === ':memory:') {
    return randomBytes(32);
  }
  const keyFile = `${path.resolve(dbPath)}.ops-mfa.key`;
  if (existsSync(keyFile)) {
    const hex = readFileSync(keyFile, 'utf8').trim();
    if (/^[a-fA-F0-9]{64}$/.test(hex)) return Buffer.from(hex, 'hex');
  }
  mkdirSync(path.dirname(keyFile), { recursive: true });
  const generated = randomBytes(32);
  writeFileSync(keyFile, generated.toString('hex'), { mode: 0o600 });
  return generated;
}

export function encryptMfaSecret(secretBase32, keyBuf) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBuf, iv);
  const enc = Buffer.concat([cipher.update(secretBase32, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `aes256gcm:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptMfaSecret(stored, keyBuf) {
  if (typeof stored !== 'string' || !stored.startsWith('aes256gcm:')) {
    fail('Invalid encrypted MFA secret', 500);
  }
  const [, ivHex, tagHex, encHex] = stored.split(':');
  const decipher = createDecipheriv('aes-256-gcm', keyBuf, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

export function createRecoveryCodes(count = 8) {
  const codes = [];
  const hashes = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    codes.push(formatted);
    hashes.push(createHash('sha256').update(raw).digest('hex'));
  }
  return { codes, hashes };
}

export function consumeRecoveryCode(submitted, hashesJson) {
  const clean = String(submitted || '').toUpperCase().replace(/[^A-F0-9]/g, '');
  if (!clean || clean.length < 8) return { matched: false, remainingHashes: hashesJson };
  let hashes = [];
  try {
    hashes = JSON.parse(hashesJson || '[]');
  } catch {
    return { matched: false, remainingHashes: hashesJson };
  }
  const candHash = createHash('sha256').update(clean).digest('hex');
  const idx = hashes.indexOf(candHash);
  if (idx === -1) return { matched: false, remainingHashes: hashesJson };
  const remaining = hashes.filter((_, i) => i !== idx);
  return { matched: true, remainingHashes: JSON.stringify(remaining) };
}

export function mfaModeForEnv() {
  const mode = String(process.env.OPS_MFA_REQUIRED || '').trim().toLowerCase();
  if (['all', 'owner', 'optional', 'off'].includes(mode)) return mode;
  return process.env.NODE_ENV === 'production' ? 'all' : 'optional';
}

export function isMfaRequiredForUser(user) {
  if (!user || user.role === 'customer') return false;
  if (user.mfa_enabled) return true;
  const mode = mfaModeForEnv();
  if (mode === 'all') return true;
  if (mode === 'owner' && user.role === 'owner') return true;
  return false;
}

