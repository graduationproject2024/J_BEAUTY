import { readFileSync, existsSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fail } from './validation.mjs';
import { verifyCsrfToken } from './auth.mjs';

export const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
};

export const IMMUTABLE_EXTS = new Set(['.woff2', '.woff', '.webp', '.avif', '.png', '.jpg', '.jpeg']);

export const DEFAULT_CSP =
  "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; connect-src 'self' https://*.railway.app https://*.vercel.app https://*.j-beauty.com https://*.j-beauty-spa.com https://j-beauty.com https://j-beauty-spa.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

export function setBaseSecurityHeaders(res, { secure, noindex = false, referrerPolicy = 'strict-origin-when-cross-origin' } = {}) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', referrerPolicy);
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', DEFAULT_CSP);
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (noindex) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  if (secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

export function resolveSafeSubpath(rootDir, relativePath) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(relativePath || ''));
  } catch {
    fail('Invalid path encoding', 400);
  }
  if (decoded.includes('\0') || decoded.includes('\\')) {
    fail('Forbidden', 403);
  }
  if (decoded.split('/').some((seg) => seg.startsWith('.'))) {
    fail('Forbidden', 403);
  }
  const cleanRel = decoded.replace(/^\/+/, '');
  const resolved = path.resolve(rootDir, cleanRel);
  if (resolved !== rootDir && !resolved.startsWith(rootDir + path.sep)) {
    fail('Forbidden', 403);
  }
  return resolved;
}

export function serveFileResponse(res, method, filePath, { noStore = false } = {}) {
  if (!existsSync(filePath)) return false;
  const ext = path.extname(filePath);
  let cacheHeader = IMMUTABLE_EXTS.has(ext) ? 'public, max-age=86400' : 'no-cache';
  if (noStore && !['.woff2', '.woff'].includes(ext)) {
    cacheHeader = 'no-store';
  }
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': cacheHeader,
  });
  res.end(method === 'HEAD' ? '' : readFileSync(filePath));
  return true;
}

function sanitizeJsonObject(val, depth = 0) {
  if (depth > 16) fail('Payload too deeply nested', 400);
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeJsonObject(item, depth + 1));
  }
  if (val && typeof val === 'object') {
    const clean = Object.create(null);
    for (const [k, v] of Object.entries(val)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      clean[k] = sanitizeJsonObject(v, depth + 1);
    }
    return clean;
  }
  return val;
}

function safeStrEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function isTrustedHost(host) {
  if (!host || typeof host !== 'string') return false;
  const h = host.toLowerCase().split(':')[0].trim();
  if (!h) return false;
  if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0') return true;
  if (h === 'j-beauty.com' || h.endsWith('.j-beauty.com')) return true;
  if (h === 'j-beauty-spa.com' || h.endsWith('.j-beauty-spa.com')) return true;
  if (h === 'jbeauty-production.up.railway.app' || (h.endsWith('.railway.app') && (h.includes('jbeauty') || h.includes('j-beauty')))) return true;
  if (h.endsWith('.vercel.app') && (h.startsWith('j-beauty') || h.startsWith('jbeauty'))) return true;
  return false;
}

export function isTrustedOrigin(origin, allowed = new Set()) {
  if (!origin || typeof origin !== 'string') return false;
  if (allowed.has(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return isTrustedHost(url.host);
  } catch {
    return false;
  }
}

export async function parseMutationRequest(req, expectedCsrf, allowedOrigins = [], sessionId = '', maxBytes = 50000) {
  const allowed = new Set(allowedOrigins.filter(Boolean));

  if (req.headers['x-forwarded-host']) {
    const fwdHost = String(req.headers['x-forwarded-host']).split(',')[0].trim();
    if (fwdHost && req.headers.host && fwdHost !== req.headers.host) {
      if (!isTrustedHost(fwdHost)) {
        fail('Host header mismatch', 403);
      }
      const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
      allowed.add(`${proto}://${fwdHost}`);
    }
  }

  const origin = req.headers.origin;
  if (origin && !allowed.has(origin) && !isTrustedOrigin(origin, allowed)) {
    fail('Cross-origin request rejected', 403);
  }
  if (req.headers['sec-fetch-site'] === 'cross-site') {
    fail('Cross-site request rejected', 403);
  }
  const referer = req.headers.referer;
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (refOrigin && !allowed.has(refOrigin) && !isTrustedOrigin(refOrigin, allowed)) {
        fail('Cross-origin referer rejected', 403);
      }
    } catch {
      fail('Invalid referer header', 400);
    }
  }
  const clientCsrf = req.headers['x-csrf-token'];
  const isDirect = safeStrEqual(clientCsrf, expectedCsrf);
  const isHmac = clientCsrf && verifyCsrfToken(clientCsrf, sessionId);
  if (!isDirect && !isHmac) {
    fail('Invalid CSRF token', 403);
  }
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    fail('JSON content required', 415);
  }
  let raw = '';
  let tooLarge = false;
  for await (const chunk of req) {
    if (!tooLarge) {
      raw += chunk;
      if (Buffer.byteLength(raw) > maxBytes) {
        tooLarge = true;
      }
    }
  }
  if (tooLarge) {
    fail('Request too large', 413);
  }
  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    fail('Invalid JSON');
  }
  if (!body || Array.isArray(body) || typeof body !== 'object') {
    fail('Invalid request');
  }
  return sanitizeJsonObject(body);
}

