import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isKnownAppRoute, pageMetadata, publicOrigin, publicRoutes } from '../seo.mjs';
import { createHelpers, now, openDatabase, uid } from './db.mjs';
import {
  checkRateLimit,
  hash,
  hashPassword,
  publicUser,
  readScopedSessionCookie,
  setScopedSessionCookie,
  token,
  verifyPassword,
} from './auth.mjs';
import { fail, optionalText, phone, text, whatsappUrl } from './validation.mjs';
import { createBooking } from './booking.mjs';
import { requestReward } from './loyalty.mjs';
import {
  parseMutationRequest,
  resolveSafeSubpath,
  serveFileResponse,
  setBaseSecurityHeaders,
} from './http-utils.mjs';
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
} from './experiences.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CUSTOMER_DIR = path.resolve(ROOT, 'apps', 'customer');
const SHARED_DIR = path.resolve(ROOT, 'packages', 'shared');

export function createCustomerApp({
  dbPath = process.env.DB_PATH || path.join(ROOT, 'data', 'jspa.sqlite'),
  db: sharedDb = null,
  helpers: sharedHelpers = null,
} = {}) {
  const ownsDb = !sharedDb;
  const db = sharedDb || openDatabase(dbPath);
  const helpers = sharedHelpers || createHelpers(db);

  async function handler(req, res) {
    const secure = process.env.NODE_ENV === 'production';
    setBaseSecurityHeaders(res, { secure, noindex: false });

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

      if (route === '/robots.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        const origin = process.env.CUSTOMER_ORIGIN || process.env.PUBLIC_ORIGIN;
        const sitemap = origin ? `Sitemap: ${origin.replace(/\/$/, '')}/sitemap.xml` : '';
        return res.end(`User-agent: *\nDisallow: /api/\n${sitemap}`);
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

      if (['GET', 'HEAD'].includes(method) && /^\/(ar|en)\/group-booking\/?$/.test(route)) {
        const lang = route.split('/')[1];
        res.writeHead(301, {
          Location: `/${lang}/occasions${url.search}`,
          'Cache-Control': 'no-cache',
        });
        return res.end();
      }

      // Hard block staff/admin routes on the customer origin
      if (/^\/(ar|en)\/(admin|ops)(\/|$)/.test(route) || /^\/(admin|ops)(\/|$)/.test(route)) {
        const entry = path.join(CUSTOMER_DIR, 'index.html');
        if (!existsSync(entry)) return send({ error: 'Not found' }, 404);
        const html = pageMetadata(readFileSync(entry, 'utf8'), '/ar/404', helpers.services(), helpers.packages());
        res.writeHead(404, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Robots-Tag': 'noindex, nofollow',
        });
        return res.end(method === 'HEAD' ? '' : html);
      }

      if (['GET', 'HEAD'].includes(method) && (route === '/' || /^\/(ar|en)(\/|$)/.test(route))) {
        const entry = path.join(CUSTOMER_DIR, 'index.html');
        if (!existsSync(entry)) return send({ error: 'Interface is being prepared' }, 503);
        const allSvcs = helpers.services();
        const known = isKnownAppRoute(route, allSvcs);
        const html = pageMetadata(readFileSync(entry, 'utf8'), route, allSvcs, helpers.packages());
        const headers = {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        };
        if (!known) headers['X-Robots-Tag'] = 'noindex, nofollow';
        res.writeHead(known ? 200 : 404, headers);
        return res.end(method === 'HEAD' ? '' : html);
      }

      if (!route.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(method)) fail('Method not allowed', 405);
        if (route.startsWith('/shared/')) {
          const resolvedShared = resolveSafeSubpath(SHARED_DIR, route.slice('/shared/'.length));
          if (path.extname(resolvedShared) && serveFileResponse(res, method, resolvedShared)) {
            return;
          }
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Not found');
        }

        const resolved = resolveSafeSubpath(CUSTOMER_DIR, route);
        const ext = path.extname(resolved);
        if (ext) {
          if (serveFileResponse(res, method, resolved)) return;
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Not found');
        }

        const entry = path.join(CUSTOMER_DIR, 'index.html');
        if (!existsSync(entry)) return send({ error: 'Interface is being prepared' }, 503);
        const html = pageMetadata(readFileSync(entry, 'utf8'), '/ar/404', helpers.services(), helpers.packages());
        res.writeHead(404, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Robots-Tag': 'noindex, nofollow',
        });
        return res.end(method === 'HEAD' ? '' : html);
      }

      // Explicitly reject staff/admin API namespaces on Customer origin
      if (route.startsWith('/api/admin') || route.startsWith('/api/ops')) {
        fail('Not found', 404);
      }

      // Customer-scoped session initialization / validation (strictly app_scope='customer')
      let sid = readScopedSessionCookie(req, 'customer', secure);
      let session =
        sid && db.get("SELECT * FROM sessions WHERE id=? AND app_scope='customer' AND expires>?", hash(sid), Date.now());
      if (!session) {
        sid = token();
        const nowMs = Date.now();
        session = {
          id: hash(sid),
          user_id: null,
          csrf: token(),
          expires: nowMs + 12 * 3600000,
          app_scope: 'customer',
          last_seen_at: nowMs,
          mfa_verified: 0,
        };
        db.run(
          'INSERT INTO sessions(id,user_id,csrf,expires,app_scope,last_seen_at,mfa_verified) VALUES(?,?,?,?,?,?,?)',
          session.id,
          null,
          session.csrf,
          session.expires,
          'customer',
          nowMs,
          0,
        );
        setScopedSessionCookie(res, 'customer', sid, 43200, secure);
      }

      let user = session.user_id ? db.get('SELECT * FROM users WHERE id=?', session.user_id) : null;
      if (user && user.role !== 'customer') {
        db.run('DELETE FROM sessions WHERE id=?', session.id);
        user = null;
      }

      const needUser = () => {
        if (!user) fail('Please sign in', 401);
        return user;
      };

      let body;
      if (!['GET', 'HEAD'].includes(method)) {
        const expectedOrigin = `${secure ? 'https' : 'http'}://${req.headers.host}`;
        body = await parseMutationRequest(req, session.csrf, [
          expectedOrigin,
          process.env.CUSTOMER_ORIGIN,
          process.env.PUBLIC_ORIGIN,
        ]);
      }

      const rotateCustomerSession = (u) => {
        db.run('DELETE FROM sessions WHERE id=?', session.id);
        sid = token();
        const nowMs = Date.now();
        session = {
          id: hash(sid),
          user_id: u.id,
          csrf: token(),
          expires: nowMs + 12 * 3600000,
          app_scope: 'customer',
          last_seen_at: nowMs,
          mfa_verified: 0,
        };
        db.run(
          'INSERT INTO sessions(id,user_id,csrf,expires,app_scope,last_seen_at,mfa_verified) VALUES(?,?,?,?,?,?,?)',
          session.id,
          u.id,
          session.csrf,
          session.expires,
          'customer',
          nowMs,
          0,
        );
        setScopedSessionCookie(res, 'customer', sid, 43200, secure);
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
        db.run(
          'INSERT INTO users(id,name,phone,password,role,verified,created_at) VALUES(?,?,?,?,?,?,?)',
          u.id,
          u.name,
          u.phone,
          u.password,
          'customer',
          0,
          now(),
        );
        helpers.audit(u, 'account.register', u.id);
        return send(rotateCustomerSession(u), 201);
      }

      if (method === 'POST' && route === '/api/login') {
        checkRate(`login-ip:${req.socket.remoteAddress}`, 40);
        const p = phone(body.phone);
        checkRate(`login:${p}`, 10);
        const u = db.get('SELECT * FROM users WHERE phone=?', p);
        if (!u || u.role === 'disabled_employee' || !verifyPassword(body.password, u.password)) {
          fail('Invalid phone or password', 401);
        }
        if (u.role !== 'customer') {
          helpers.audit(u, 'auth.staff_login_rejected_on_customer', u.id);
          fail('Staff accounts must sign in through the J Beauty Operations Portal', 403);
        }
        return send(rotateCustomerSession(u));
      }

      if (method === 'POST' && route === '/api/logout') {
        db.run('DELETE FROM sessions WHERE id=?', session.id);
        setScopedSessionCookie(res, 'customer', '', 0, secure);
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
          db.run('INSERT INTO verification(id,user_id,reference_hash,expires,used) VALUES(?,?,?,?,0)', uid(), user.id, hash(reference), expires);
        });
        return send({
          reference,
          expires_at: new Date(expires).toISOString(),
          whatsapp_url: whatsappUrl(
            helpers.settings(),
            `مرحباً J Beauty، أرجو تأكيد ملكية رقم جوالي ${user.phone}. رمز التحقق: ${reference}`,
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
          const target = db.get('SELECT * FROM users WHERE id=?', rec.user_id);
          if (!target || target.role !== 'customer') fail('Invalid or expired reset token');
          db.run('UPDATE users SET password=?, updated_at=? WHERE id=?', hashedPw, now(), rec.user_id);
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
        const displayName = optionalText(body.display_name, 60) || 'عميلة J Beauty';
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
            moderation_status: 'pending',
            moderation_note: '',
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
          moderation_status: 'pending',
          moderation_note: '',
          created_at: now(),
        };
        db.run('INSERT INTO reviews(id,user_id,booking_id,data) VALUES(?,?,?,?)', review.id, user.id, b.id, JSON.stringify(review));
        return send({ review: { ...review, booking_id: b.id } }, 201);
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
  const app = createCustomerApp();
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  app.server.listen(port, host, () => {
    console.log(`J Beauty Customer Portal running at http://${host}:${port}`);
  });
}
