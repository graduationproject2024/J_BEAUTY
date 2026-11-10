import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isKnownAppRoute, pageMetadata, publicOrigin, publicRoutes } from './seo.mjs';
import { createHelpers, now, openDatabase, uid } from './server/db.mjs';
import {
  checkRateLimit,
  hash,
  hashPassword,
  publicUser,
  setSessionCookie,
  token,
  verifyPassword,
} from './server/auth.mjs';
import { fail, optionalText, phone, text, whatsappUrl } from './server/validation.mjs';
import { createBooking } from './server/booking.mjs';
import { requestReward } from './server/loyalty.mjs';
import { handleAdminRoute } from './server/admin.mjs';
import {
  createGiftRequest,
  createGroupRequest,
  getPassportData,
  getSharedNailStyle,
  recommendRituals,
  recordFunnelEvent,
  saveNailStyle,
  savePassportPreferences,
  togglePassportFavorite,
} from './server/experiences.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(ROOT, 'public');

const MIME_TYPES = {
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

const IMMUTABLE_EXTS = new Set(['.woff2', '.woff', '.webp', '.avif', '.png', '.jpg', '.jpeg']);

function setSecurityHeaders(res, secure) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  if (secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
}

export function createApp({ dbPath = process.env.DB_PATH || path.join(ROOT, 'data', 'jspa.sqlite') } = {}) {
  const db = openDatabase(dbPath);
  const helpers = createHelpers(db);

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
    db.run('INSERT INTO users VALUES(?,?,?,?,?,?,?)', u.id, u.name, u.phone, u.password, 'owner', 1, now());
    return publicUser({ ...u, role: 'owner', verified: true });
  }

  async function handler(req, res) {
    const secure = process.env.NODE_ENV === 'production';
    setSecurityHeaders(res, secure);

    const send = (data, status = 200) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(data));
    };

    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      const method = req.method;
      const query = Object.fromEntries(url.searchParams.entries());

      if (route === '/robots.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        const sitemap = process.env.PUBLIC_ORIGIN ? `Sitemap: ${process.env.PUBLIC_ORIGIN}/sitemap.xml` : '';
        return res.end(`User-agent: *\nDisallow: /api/\nDisallow: /ar/admin\nDisallow: /en/admin\n${sitemap}`);
      }

      if (route === '/sitemap.xml') {
        const base = publicOrigin();
        if (!base) return send({ error: 'Configure PUBLIC_ORIGIN to enable the production sitemap' }, 503);
        const urls = publicRoutes(helpers.services());
        res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
        const body = ['ar', 'en']
          .flatMap((l) => urls.map((p) => `<url><loc>${base}/${l}/${p}</loc></url>`))
          .join('');
        return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
      }

      if (['GET', 'HEAD'].includes(method) && (route === '/' || /^\/(ar|en)(\/|$)/.test(route))) {
        const entry = path.join(PUBLIC_DIR, 'index.html');
        const allSvcs = helpers.services();
        const known = isKnownAppRoute(route, allSvcs);
        const html = pageMetadata(readFileSync(entry, 'utf8'), route, allSvcs, helpers.packages());
        res.writeHead(known ? 200 : 404, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        });
        return res.end(method === 'HEAD' ? '' : html);
      }

      if (!route.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(method)) fail('Method not allowed', 405);
        const decoded = decodeURIComponent(route);
        if (decoded.split('/').some((seg) => seg.startsWith('.'))) {
          fail('Forbidden', 403);
        }
        const resolved = path.resolve(PUBLIC_DIR, `.${decoded}`);
        if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) {
          fail('Forbidden', 403);
        }

        const ext = path.extname(resolved);
        let fileToServe = resolved;
        if (ext) {
          if (!existsSync(fileToServe)) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('Not found');
          }
        } else {
          const entry = path.join(PUBLIC_DIR, 'index.html');
          const html = pageMetadata(readFileSync(entry, 'utf8'), '/ar/404', helpers.services(), helpers.packages());
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
          return res.end(method === 'HEAD' ? '' : html);
        }

        if (!existsSync(fileToServe)) return send({ error: 'Interface is being prepared' }, 503);
        const servedExt = path.extname(fileToServe);
        const cacheHeader = IMMUTABLE_EXTS.has(servedExt) ? 'public, max-age=86400' : 'no-cache';
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[servedExt] || 'application/octet-stream',
          'Cache-Control': cacheHeader,
        });
        return res.end(method === 'HEAD' ? '' : readFileSync(fileToServe));
      }

      // Session initialization / validation
      let sid = String(req.headers.cookie || '')
        .split(';')
        .map((v) => v.trim())
        .find((v) => v.startsWith('jspa_session='))
        ?.slice(13);

      let session = sid && db.get('SELECT * FROM sessions WHERE id=? AND expires>?', hash(sid), Date.now());
      if (!session) {
        sid = token();
        session = {
          id: hash(sid),
          user_id: null,
          csrf: token(),
          expires: Date.now() + 12 * 3600000,
        };
        db.run('INSERT INTO sessions VALUES(?,?,?,?)', session.id, null, session.csrf, session.expires);
        setSessionCookie(res, sid, 43200, secure);
      }

      const user = session.user_id ? db.get('SELECT * FROM users WHERE id=?', session.user_id) : null;
      const needUser = () => {
        if (!user) fail('Please sign in', 401);
        return user;
      };
      const requireStaff = () => {
        needUser();
        if (!['owner', 'employee'].includes(user.role)) fail('Staff access required', 403);
      };

      // Parse & verify mutation requests
      let body;
      if (!['GET', 'HEAD'].includes(method)) {
        const origin = req.headers.origin;
        const expectedOrigin = `${secure ? 'https' : 'http'}://${req.headers.host}`;
        if (origin && origin !== expectedOrigin && origin !== process.env.PUBLIC_ORIGIN) {
          fail('Cross-origin request rejected', 403);
        }
        if (req.headers['sec-fetch-site'] === 'cross-site') {
          fail('Cross-site request rejected', 403);
        }
        if (req.headers['x-csrf-token'] !== session.csrf) {
          fail('Invalid CSRF token', 403);
        }
        if (!String(req.headers['content-type']).startsWith('application/json')) {
          fail('JSON content required', 415);
        }
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > 50000) fail('Request too large', 413);
        }
        try {
          body = JSON.parse(raw || '{}');
        } catch {
          fail('Invalid JSON');
        }
        if (!body || Array.isArray(body) || typeof body !== 'object') {
          fail('Invalid request');
        }
      }

      const rotateAuthSession = (u) => {
        db.run('DELETE FROM sessions WHERE id=?', session.id);
        sid = token();
        session = {
          id: hash(sid),
          user_id: u.id,
          csrf: token(),
          expires: Date.now() + 12 * 3600000,
        };
        db.run('INSERT INTO sessions VALUES(?,?,?,?)', session.id, u.id, session.csrf, session.expires);
        setSessionCookie(res, sid, 43200, secure);
        return { user: publicUser(u), csrfToken: session.csrf };
      };

      const checkRate = (key, max, windowMs) => checkRateLimit(db, key, max, windowMs);

      if (method === 'GET' && route === '/api/session') {
        return send({ user: publicUser(user), csrfToken: session.csrf });
      }

      if (method === 'GET' && route === '/api/catalog') {
        return send({
          services: helpers.services().filter((s) => s.active),
          packages: helpers.packages().filter((p) => p.active),
          settings: helpers.settings(),
          reviews: db
            .all('SELECT data FROM reviews')
            .map((r) => JSON.parse(r.data))
            .filter((r) => r.approved)
            .map(({ rating, body: textBody, display_name, created_at }) => ({
              rating,
              body: textBody,
              display_name,
              created_at,
            })),
        });
      }

      if (method === 'POST' && route === '/api/telemetry/event') {
        checkRate(`telemetry:${req.socket.remoteAddress}`, 120, 60000);
        recordFunnelEvent(db, body.event);
        return send({ ok: true });
      }

      if (method === 'POST' && route === '/api/studio/recommend') {
        checkRate(`studio:${req.socket.remoteAddress}`, 60, 600000);
        const recommendations = recommendRituals(helpers, body);
        recordFunnelEvent(db, 'studio_complete');
        return send({ recommendations });
      }

      if (method === 'GET' && /^\/api\/atelier\/styles\/[^/]+$/.test(route)) {
        const code = route.split('/').pop();
        return send({ style: getSharedNailStyle(db, code) });
      }

      if (method === 'POST' && route === '/api/atelier/styles') {
        checkRate(`atelier:${req.socket.remoteAddress}`, 40, 600000);
        if (!user && !body.share) {
          fail('Please sign in to save styles to your Beauty Passport', 401);
        }
        return send({ style: saveNailStyle(db, user, body) }, 201);
      }

      if (method === 'POST' && /^\/api\/atelier\/styles\/[^/]+\/delete$/.test(route)) {
        needUser();
        const id = route.split('/')[4];
        const row = db.get('SELECT user_id FROM nail_styles WHERE id=?', id);
        if (!row) fail('Style not found', 404);
        if (row.user_id !== user.id) fail('Forbidden', 403);
        db.run('DELETE FROM nail_styles WHERE id=?', id);
        return send({ ok: true });
      }

      if (method === 'POST' && route === '/api/register') {
        checkRate(`register:${req.socket.remoteAddress}`, 15);
        if (body.terms !== true || body.password !== body.passwordConfirmation) {
          fail('Accept the terms and confirm your password');
        }
        const p = phone(body.phone);
        if (db.get('SELECT id FROM users WHERE phone=?', p)) {
          fail('Unable to register this number. Sign in or contact staff for recovery.', 409);
        }
        const u = {
          id: uid(),
          name: text(body.name, 100),
          phone: p,
          password: hashPassword(body.password),
          role: 'customer',
          verified: 0,
        };
        db.run('INSERT INTO users VALUES(?,?,?,?,?,?,?)', u.id, u.name, u.phone, u.password, u.role, 0, now());
        helpers.audit(u, 'account.register', u.id);
        return send(rotateAuthSession(u), 201);
      }

      if (method === 'POST' && route === '/api/login') {
        checkRate(`login-ip:${req.socket.remoteAddress}`, 40);
        const p = phone(body.phone);
        checkRate(`login:${p}`, 10);
        const u = db.get('SELECT * FROM users WHERE phone=?', p);
        if (!u || u.role === 'disabled_employee' || !verifyPassword(body.password, u.password)) {
          fail('Invalid phone or password', 401);
        }
        return send(rotateAuthSession(u));
      }

      if (method === 'POST' && route === '/api/logout') {
        db.run('DELETE FROM sessions WHERE id=?', session.id);
        setSessionCookie(res, '', 0, secure);
        return send({ ok: true });
      }

      if (method === 'POST' && route === '/api/verification/request') {
        needUser();
        if (user.verified) fail('Already verified');
        checkRate(`verification:${user.id}`, 5);
        const reference = randomBytes(5).toString('hex').toUpperCase();
        const expires = Date.now() + 30 * 60000;
        db.tx(() => {
          db.run('UPDATE verification SET used=1 WHERE user_id=?', user.id);
          db.run('INSERT INTO verification VALUES(?,?,?,?,0)', uid(), user.id, hash(reference), expires);
        });
        return send({
          reference,
          expires_at: new Date(expires).toISOString(),
          whatsapp_url: whatsappUrl(
            helpers.settings(),
            `مرحباً J SPA، أرجو تأكيد ملكية رقم جوالي ${user.phone}. رمز التحقق: ${reference}`,
          ),
        });
      }

      if (method === 'POST' && route === '/api/reset') {
        checkRate(`reset:${req.socket.remoteAddress}`, 15);
        const hashedPw = hashPassword(body.password);
        db.tx(() => {
          const rec = db.get(
            'SELECT * FROM recovery WHERE token_hash=? AND used=0 AND expires>?',
            hash(String(body.token || '')),
            Date.now(),
          );
          if (!rec) fail('Invalid or expired reset token');
          db.run('UPDATE users SET password=? WHERE id=?', hashedPw, rec.user_id);
          db.run('UPDATE recovery SET used=1 WHERE user_id=?', rec.user_id);
          db.run('DELETE FROM sessions WHERE user_id=?', rec.user_id);
          helpers.audit(null, 'account.password_reset', rec.user_id);
        });
        return send({ ok: true });
      }

      if (method === 'POST' && route === '/api/bookings') {
        checkRate(`booking:${req.socket.remoteAddress}`, 30, 3600000);
        const { created, result } = createBooking(db, helpers, user, session.id, body);
        if (created) recordFunnelEvent(db, 'booking_submitted');
        return send(result, created ? 201 : 200);
      }

      if (method === 'POST' && route === '/api/group-requests') {
        checkRate(`group:${req.socket.remoteAddress}`, 15, 3600000);
        return send(createGroupRequest(db, helpers, user, body), 201);
      }

      if (method === 'POST' && route === '/api/gift-requests') {
        checkRate(`gift:${req.socket.remoteAddress}`, 15, 3600000);
        return send(createGiftRequest(db, helpers, user, body), 201);
      }

      if (method === 'GET' && route === '/api/account') {
        needUser();
        const myBookings = helpers.bookings().filter((b) => b.user_id === user.id);
        const hasPendingEntitlement =
          !user.verified &&
          myBookings.some((b) => b.status === 'completed' && b.payment_verified);
        const passport = getPassportData(db, helpers, user);
        return send({
          user: publicUser(user),
          bookings: myBookings,
          ledger: user.verified
            ? db.all('SELECT * FROM ledger WHERE user_id=? ORDER BY created_at DESC', user.id)
            : [],
          balance: user.verified ? helpers.balance(user.id) : 0,
          has_pending_entitlement: hasPendingEntitlement,
          rewards: helpers.settings().rewards,
          reward_requests: db
            .all('SELECT data FROM reward_requests WHERE user_id=?', user.id)
            .map((r) => JSON.parse(r.data)),
          reviews: db
            .all('SELECT data,booking_id FROM reviews WHERE user_id=?', user.id)
            .map((r) => ({ ...JSON.parse(r.data), booking_id: r.booking_id })),
          passport,
        });
      }

      if (method === 'POST' && route === '/api/passport/favorites') {
        needUser();
        return send({ favorites: togglePassportFavorite(db, helpers, user, body) });
      }

      if (method === 'POST' && route === '/api/passport/preferences') {
        needUser();
        return send({ preferences: savePassportPreferences(db, helpers, user, body) });
      }

      if (method === 'POST' && route === '/api/rewards/request') {
        needUser();
        return send({ reward_request: requestReward(db, helpers, user, body.reward_id) }, 201);
      }

      if (method === 'POST' && route === '/api/reviews') {
        needUser();
        if (!user.verified) fail('Phone verification required', 403);
        const b = helpers.bookings().find((x) => x.id === body.booking_id);
        if (!b || b.user_id !== user.id || b.status !== 'completed') {
          fail('Completed owned booking required', 403);
        }
        if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
          fail('Invalid rating');
        }
        const reviewBody = text(body.body, 2000);
        const displayName = optionalText(body.display_name, 60) || 'عميلة J SPA';
        if (/(?:\+?966|05)\d{8,9}/.test(`${reviewBody} ${displayName}`)) {
          fail('Please remove phone numbers from your review');
        }

        const existingRow = db.get('SELECT * FROM reviews WHERE booking_id=?', b.id);
        if (existingRow) {
          if (body.edit !== true) fail('A review already exists', 409);
          if (existingRow.user_id !== user.id) fail('Forbidden', 403);
          const prev = JSON.parse(existingRow.data);
          const updated = {
            ...prev,
            rating: body.rating,
            body: reviewBody,
            display_name: displayName,
            approved: false,
            updated_at: now(),
          };
          db.run('UPDATE reviews SET data=? WHERE id=?', JSON.stringify(updated), existingRow.id);
          return send({ review: { ...updated, booking_id: b.id } });
        }

        const review = {
          id: uid(),
          rating: body.rating,
          body: reviewBody,
          display_name: displayName,
          approved: false,
          created_at: now(),
        };
        db.run('INSERT INTO reviews VALUES(?,?,?,?)', review.id, user.id, b.id, JSON.stringify(review));
        return send({ review: { ...review, booking_id: b.id } }, 201);
      }

      if (route.startsWith('/api/admin')) {
        requireStaff();
        return handleAdminRoute({ db, helpers, user, route, query, body, checkRate, send });
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
      new Promise((resolve) =>
        server.close(() => {
          db.close();
          resolve();
        }),
      ),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApp();
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
    const port = Number(process.env.PORT || 3000);
    app.server.listen(port, process.env.HOST || '127.0.0.1', () => {
      console.log(`J SPA running at http://${process.env.HOST || '127.0.0.1'}:${port}`);
    });
  }
}
