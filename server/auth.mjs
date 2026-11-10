import {
  argon2Sync,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { fail, maskPhone } from './validation.mjs';

export const token = () => randomBytes(32).toString('hex');
export const hash = (value) => createHash('sha256').update(value).digest('hex');

const ARGON_OPTS = {
  parallelism: 1,
  passes: 3,
  memory: 65536,
  tagLength: 32,
};

export function hashPassword(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) {
    fail('Password must contain 12–128 characters');
  }
  const nonce = randomBytes(16);
  const derived = argon2Sync('argon2id', {
    message: value,
    nonce,
    ...ARGON_OPTS,
  });
  return `argon2id:${nonce.toString('hex')}:${derived.toString('hex')}`;
}

export function verifyPassword(value, stored) {
  if (typeof value !== 'string' || value.length > 128 || typeof stored !== 'string') {
    return false;
  }
  try {
    const parts = stored.split(':');
    if (parts[0] === 'argon2id' && parts.length === 3) {
      const nonce = Buffer.from(parts[1], 'hex');
      const expected = Buffer.from(parts[2], 'hex');
      const actual = argon2Sync('argon2id', {
        message: value,
        nonce,
        ...ARGON_OPTS,
      });
      return expected.length === actual.length && timingSafeEqual(expected, actual);
    }
    if (parts.length === 2) {
      const [salt, hex] = parts;
      const expected = Buffer.from(hex, 'hex');
      const actual = scryptSync(value, salt, 64);
      return expected.length === actual.length && timingSafeEqual(expected, actual);
    }
  } catch {
    return false;
  }
  return false;
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    verified: !!user.verified,
  };
}

export function employeeCustomerView(user, hasPendingVerification) {
  return {
    id: user.id,
    name: user.name,
    phone_masked: maskPhone(user.phone),
    verified: !!user.verified,
    has_pending_verification: !!hasPendingVerification,
  };
}

export function checkRateLimit(db, key, max, windowMs = 900000) {
  const nowMs = Date.now();
  const row = db.get('SELECT * FROM rate_limits WHERE key=?', key);
  if (!row || row.until < nowMs) {
    db.run('INSERT OR REPLACE INTO rate_limits VALUES(?,?,?)', key, 1, nowMs + windowMs);
    return;
  }
  if (row.count >= max) {
    fail('Too many attempts. Try again later.', 429);
  }
  db.run('UPDATE rate_limits SET count=count+1 WHERE key=?', key);
}

export function setSessionCookie(res, sessionId, maxAgeSeconds, secure) {
  const secureFlag = secure ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `jspa_session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secureFlag}`,
  );
}

