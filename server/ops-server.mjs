import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHelpers, now, openDatabase, uid } from './db.mjs';
import {
  checkRateLimit,
  hash,
  hashPassword,
  publicUser,
  readScopedSessionCookie,
  setScopedSessionCookie,
  staffPublicUser,
  token,
  verifyPassword,
} from './auth.mjs';
import {
  base32Encode,
  buildOtpAuthUri,
  consumeRecoveryCode,
  createRecoveryCodes,
  decryptMfaSecret,
  encryptMfaSecret,
  isMfaRequiredForUser,
  loadOrCreateMfaKey,
  mfaModeForEnv,
  verifyTotpCode,
} from './auth/mfa.mjs';
import { isStaffRole } from './authorization/permissions.mjs';
import { fail, phone, text } from './validation.mjs';
import { handleOpsRoute } from './staff/ops.mjs';
import {
  parseMutationRequest,
  resolveSafeSubpath,
  serveFileResponse,
  setBaseSecurityHeaders,
} from './http-utils.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const STAFF_DIR = path.resolve(ROOT, 'apps', 'staff');
const SHARED_DIR = path.resolve(ROOT, 'packages', 'shared');
const FONTS_DIR = path.resolve(ROOT, 'apps', 'customer', 'fonts');

export function createOpsApp({
  dbPath = process.env.DB_PATH || path.join(ROOT, 'data', 'jspa.sqlite'),
  db: sharedDb = null,
  helpers: sharedHelpers = null,
  customerOrigin = process.env.CUSTOMER_ORIGIN || process.env.PUBLIC_ORIGIN || 'http://127.0.0.1:3000',
} = {}) {
  const ownsDb = !sharedDb;
  const db = sharedDb || openDatabase(dbPath);
  const helpers = sharedHelpers || createHelpers(db);
  const prod = process.env.NODE_ENV === 'production';
  const mfaKey = loadOrCreateMfaKey({ dbPath, prod });

  const resolveCustomerOrigin = () =>
    typeof customerOrigin === 'function' ? customerOrigin() : customerOrigin;

  function ownerBootstrap({ name, phone: ph, password: pw }) {
    if (db.get("SELECT id FROM users WHERE role='owner'")) {
      fail('Owner already exists');
    }
    const u = {
      id: uid(),
      name: text(name),
      phone: phone(ph),
      password: hashPassword(pw),
    };
    db.run(
      'INSERT INTO users(id,name,phone,password,role,verified,created_at) VALUES(?,?,?,?,?,?,?)',
      u.id,
      u.name,
      u.phone,
      u.password,
      'owner',
      1,
      now(),
    );
    return publicUser({ ...u, role: 'owner', verified: true });
  }

  async function handler(req, res) {
    const secure = process.env.NODE_ENV === 'production';
    setBaseSecurityHeaders(res, { secure, noindex: true, referrerPolicy: 'no-referrer' });

    const send = (data, status = 200) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      });
      res.end(JSON.stringify(data));
    };

    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      const method = req.method;
      const query = Object.fromEntries(url.searchParams.entries());

      if (route === '/robots.txt') {
        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        });
        return res.end('User-agent: *\nDisallow: /\n');
      }

      if (!route.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(method)) fail('Method not allowed', 405);

        if (route.startsWith('/shared/')) {
          const resolvedShared = resolveSafeSubpath(SHARED_DIR, route.slice('/shared/'.length));
          if (path.extname(resolvedShared) && serveFileResponse(res, method, resolvedShared, { noStore: true })) {
            return;
          }
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Not found');
        }

        if (route.startsWith('/fonts/')) {
          const resolvedFont = resolveSafeSubpath(FONTS_DIR, route.slice('/fonts/'.length));
          if (serveFileResponse(res, method, resolvedFont)) return;
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Not found');
        }

        const resolved = resolveSafeSubpath(STAFF_DIR, route === '/' ? '/index.html' : route);
        const ext = path.extname(resolved);
        if (ext) {
          if (serveFileResponse(res, method, resolved, { noStore: true })) return;
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Not found');
        }

        const entry = path.join(STAFF_DIR, 'index.html');
        if (!existsSync(entry)) return send({ error: 'Operations Portal is being prepared' }, 503);
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        });
        return res.end(method === 'HEAD' ? '' : readFileSync(entry, 'utf8'));
      }

      if (route.startsWith('/api/admin')) {
        fail('Not found', 404);
      }

      // Operations-scoped session initialization / validation (strictly app_scope='ops')
      const idleMinutes = Math.max(5, Number(process.env.OPS_IDLE_MINUTES || 60));
      const idleMs = idleMinutes * 60000;
      const nowMs = Date.now();

      let sid = readScopedSessionCookie(req, 'ops', secure);
      let session =
        sid && db.get("SELECT * FROM sessions WHERE id=? AND app_scope='ops' AND expires>?", hash(sid), nowMs);

      if (session && session.user_id && session.last_seen_at && nowMs - Number(session.last_seen_at) > idleMs) {
        db.run('DELETE FROM sessions WHERE id=?', session.id);
        session = null;
      }

      if (!session) {
        sid = token();
        session = {
          id: hash(sid),
          user_id: null,
          csrf: token(),
          expires: nowMs + 8 * 3600000,
          app_scope: 'ops',
          last_seen_at: nowMs,
          mfa_verified: 0,
        };
        db.run(
          'INSERT INTO sessions(id,user_id,csrf,expires,app_scope,last_seen_at,mfa_verified) VALUES(?,?,?,?,?,?,?)',
          session.id,
          null,
          session.csrf,
          session.expires,
          'ops',
          nowMs,
          0,
        );
        setScopedSessionCookie(res, 'ops', sid, 28800, secure);
      } else if (session.user_id) {
        db.run('UPDATE sessions SET last_seen_at=? WHERE id=?', nowMs, session.id);
      }

      let user = session.user_id ? db.get('SELECT * FROM users WHERE id=?', session.user_id) : null;
      if (user && (!isStaffRole(user.role) || user.role === 'disabled_employee')) {
        db.run('DELETE FROM sessions WHERE id=?', session.id);
        user = null;
      }

      let body;
      if (!['GET', 'HEAD'].includes(method)) {
        const expectedOrigin = `${secure ? 'https' : 'http'}://${req.headers.host}`;
        body = await parseMutationRequest(req, session.csrf, [expectedOrigin, process.env.OPS_ORIGIN]);
      }

      const checkRate = (key, max, windowMs) => checkRateLimit(db, key, max, windowMs);

      const mfaStatusFor = (u, sess) => {
        if (!u) return { required: false, enabled: false, verified: false, setup_required: false, mode: mfaModeForEnv() };
        const required = isMfaRequiredForUser(u);
        return {
          required,
          enabled: !!u.mfa_enabled,
          verified: !!sess.mfa_verified || !required,
          setup_required: required && !u.mfa_enabled,
          mode: mfaModeForEnv(),
        };
      };

      const rotateOpsSession = (u, mfaVerified = 0) => {
        db.run('DELETE FROM sessions WHERE id=?', session.id);
        sid = token();
        const t = Date.now();
        session = {
          id: hash(sid),
          user_id: u.id,
          csrf: token(),
          expires: t + 8 * 3600000,
          app_scope: 'ops',
          last_seen_at: t,
          mfa_verified: mfaVerified ? 1 : 0,
        };
        db.run(
          'INSERT INTO sessions(id,user_id,csrf,expires,app_scope,last_seen_at,mfa_verified) VALUES(?,?,?,?,?,?,?)',
          session.id,
          u.id,
          session.csrf,
          session.expires,
          'ops',
          t,
          session.mfa_verified,
        );
        setScopedSessionCookie(res, 'ops', sid, 28800, secure);
        return {
          user: staffPublicUser(u),
          csrfToken: session.csrf,
          mfa: mfaStatusFor(u, session),
        };
      };

      if (method === 'GET' && route === '/api/ops/session') {
        return send({
          user: user ? staffPublicUser(user) : null,
          csrfToken: session.csrf,
          mfa: mfaStatusFor(user, session),
          customerOrigin: resolveCustomerOrigin(),
        });
      }

      if (method === 'POST' && route === '/api/ops/login') {
        checkRate(`ops-login-ip:${req.socket.remoteAddress}`, 40);
        const p = phone(body.phone);
        checkRate(`ops-login:${p}`, 10);
        const u = db.get('SELECT * FROM users WHERE phone=?', p);
        if (!u || u.role === 'disabled_employee' || !verifyPassword(body.password, u.password)) {
          fail('Invalid phone or password', 401);
        }
        if (!isStaffRole(u.role)) {
          helpers.audit(u, 'ops.customer_login_rejected', u.id);
          fail('Staff account required to access Operations Portal', 403);
        }

        const mfaReq = isMfaRequiredForUser(u);
        let mfaVerified = mfaReq ? 0 : 1;

        if (mfaReq && u.mfa_enabled && body.totp_code) {
          const secret = decryptMfaSecret(u.mfa_secret_enc, mfaKey);
          if (verifyTotpCode(secret, body.totp_code)) {
            mfaVerified = 1;
          } else {
            fail('Invalid authenticator code', 401);
          }
        }

        helpers.audit(u, 'ops.login', u.id, JSON.stringify({ role: u.role, mfa_verified: !!mfaVerified }));
        return send(rotateOpsSession(u, mfaVerified));
      }

      if (method === 'POST' && route === '/api/ops/logout') {
        if (user) helpers.audit(user, 'ops.logout', user.id);
        db.run('DELETE FROM sessions WHERE id=?', session.id);
        setScopedSessionCookie(res, 'ops', '', 0, secure);
        return send({ ok: true });
      }

      if (method === 'POST' && route === '/api/ops/mfa/setup') {
        if (!user) fail('Please sign in', 401);
        if (user.mfa_enabled && !session.mfa_verified) {
          fail('MFA is already enrolled; verify with authenticator or recovery code first', 403);
        }
        const secretBase32 = base32Encode(randomBytes(20));
        const encSecret = encryptMfaSecret(secretBase32, mfaKey);
        const { codes, hashes } = createRecoveryCodes(8);
        db.run(
          'UPDATE users SET mfa_secret_enc=?, mfa_recovery_hashes=?, mfa_enabled=0, updated_at=? WHERE id=?',
          encSecret,
          JSON.stringify(hashes),
          now(),
          user.id,
        );
        helpers.audit(user, 'staff.mfa_setup_initiated', user.id);
        return send({
          secret: secretBase32,
          otpauth_uri: buildOtpAuthUri({
            accountLabel: `${user.name} (${user.phone})`,
            issuer: 'J Beauty Operations',
            secretBase32,
          }),
          recovery_codes: codes,
        });
      }

      if (method === 'POST' && route === '/api/ops/mfa/verify') {
        if (!user) fail('Please sign in', 401);
        checkRate(`ops-mfa:${user.id}`, 10);
        if (!user.mfa_secret_enc) fail('MFA setup required before verification', 400);

        const secret = decryptMfaSecret(user.mfa_secret_enc, mfaKey);
        let ok = false;
        let usedRecovery = false;

        if (body.code) {
          ok = verifyTotpCode(secret, body.code);
        } else if (body.recovery_code && user.mfa_enabled) {
          const rec = consumeRecoveryCode(body.recovery_code, user.mfa_recovery_hashes);
          if (rec.matched) {
            ok = true;
            usedRecovery = true;
            db.run(
              'UPDATE users SET mfa_recovery_hashes=?, updated_at=? WHERE id=?',
              JSON.stringify(rec.remainingHashes),
              now(),
              user.id,
            );
          }
        }

        if (!ok) {
          helpers.audit(user, 'staff.mfa_failed', user.id);
          fail('Invalid verification code', 401);
        }

        db.tx(() => {
          db.run('UPDATE users SET mfa_enabled=1, updated_at=? WHERE id=?', now(), user.id);
          helpers.audit(user, usedRecovery ? 'staff.mfa_recovery_used' : 'staff.mfa_verified', user.id);
        });
        const freshUser = db.get('SELECT * FROM users WHERE id=?', user.id);
        const rotated = rotateOpsSession(freshUser, 1);
        return send({ ok: true, ...rotated });
      }

      if (route.startsWith('/api/ops')) {
        if (!user) fail('Please sign in', 401);
        if (isMfaRequiredForUser(user) && !session.mfa_verified) {
          fail('MFA verification required', 403);
        }
        return handleOpsRoute({ db, helpers, user, route, query, body, checkRate, send, customerOrigin: resolveCustomerOrigin() });
      }

      fail('Not found', 404);
    } catch (error) {
      if (!error.status) console.error(error);
      send({ error: error.status ? error.message : 'Internal server error' }, error.status || 500);
    }
  }

  const server = http.createServer(handler);
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;

  return {
    server,
    db: db.raw,
    ownerBootstrap,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(() => {
          if (ownsDb) db.close();
          resolve();
        });
      }),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createOpsApp();
  if (process.argv.includes('--create-owner')) {
    try {
      console.log(
        app.ownerBootstrap({
          name: process.env.OWNER_NAME,
          phone: process.env.OWNER_PHONE,
          password: process.env.OWNER_PASSWORD,
        }),
      );
    } finally {
      app.db.close();
    }
  } else {
    const port = Number(process.env.OPS_PORT || 3100);
    const host = process.env.HOST || '127.0.0.1';
    app.server.listen(port, host, () => {
      console.log(`J Beauty Operations Portal running at http://${host}:${port}`);
    });
  }
}
