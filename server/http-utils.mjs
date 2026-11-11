import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fail } from './validation.mjs';

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
};

export const IMMUTABLE_EXTS = new Set(['.woff2', '.woff', '.webp', '.avif', '.png', '.jpg', '.jpeg']);

export const DEFAULT_CSP =
  "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

export function setBaseSecurityHeaders(res, { secure, noindex = false, referrerPolicy = 'strict-origin-when-cross-origin' } = {}) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', referrerPolicy);
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', DEFAULT_CSP);
  if (noindex) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  if (secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
}

export function resolveSafeSubpath(rootDir, relativePath) {
  const decoded = decodeURIComponent(relativePath);
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

export async function parseMutationRequest(req, expectedCsrf, allowedOrigins = []) {
  const origin = req.headers.origin;
  const allowed = new Set(allowedOrigins.filter(Boolean));
  if (origin && !allowed.has(origin)) {
    fail('Cross-origin request rejected', 403);
  }
  if (req.headers['sec-fetch-site'] === 'cross-site') {
    fail('Cross-site request rejected', 403);
  }
  if (req.headers['x-csrf-token'] !== expectedCsrf) {
    fail('Invalid CSRF token', 403);
  }
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    fail('JSON content required', 415);
  }
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 50000) fail('Request too large', 413);
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
  return body;
}

