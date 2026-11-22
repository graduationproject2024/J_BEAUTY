import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isKnownAppRoute, pageMetadata, publicOrigin, publicRoutes } from '../seo.mjs';
import { createHelpers, now, openDatabase, uid } from './db.mjs';
import {
  checkRateLimit,
  generateCsrfToken,
  hash,
  hashPassword,
  publicUser,
  readScopedSessionCookie,
  setScopedSessionCookie,
  token,
  verifyCsrfToken,
  verifyPassword,
} from './auth.mjs';
import { fail, optionalText, phone, text, whatsappUrl } from './validation.mjs';
import { createBooking, findActiveGiftByCode } from './booking.mjs';
import { requestReward } from './loyalty.mjs';
import {
  generateInvoicePdfBuffer,
  invoiceToken,
  renderInvoiceHtml,
  renderOccasionContractHtml,
  validateReceiptUpload,
  verifyInvoiceToken,
} from './pdf-invoice.mjs';
import {
  parseMutationRequest,
  resolveSafeSubpath,
  serveFileResponse,
  setBaseSecurityHeaders,
} from './http-utils.mjs';
import { computeAvailableSlots } from './scheduling/availability.mjs';
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
  opsApp = null,
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
      const query = Object.fromEntries(url.searchParams.entries());

      if (opsApp) {
        if (route.startsWith('/api/ops') || route === '/ops' || route.startsWith('/ops/') || /^\/(ar|en)\/ops(\/|$)/.test(route)) {
          return await opsApp.handler(req, res);
        }
      }

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

      // If session is absent from local DB (e.g. fresh lambda container in multi-instance serverless),
      // reconstitute it if the client provides an HMAC-valid CSRF token:
      if (!session && sid) {
        const clientCsrf = req.headers['x-csrf-token'];
        if (clientCsrf && verifyCsrfToken(clientCsrf, sid)) {
          const nowMs = Date.now();
          session = {
            id: hash(sid),
            user_id: null,
            csrf: clientCsrf,
            expires: nowMs + 12 * 3600000,
            app_scope: 'customer',
            last_seen_at: nowMs,
            mfa_verified: 0,
          };
          try {
            db.run(
              'INSERT OR REPLACE INTO sessions(id,user_id,csrf,expires,app_scope,last_seen_at,mfa_verified) VALUES(?,?,?,?,?,?,?)',
              session.id,
              null,
              session.csrf,
              session.expires,
              'customer',
              nowMs,
              0,
            );
          } catch {}
        }
      }

      if (!session) {
        sid = token();
        const nowMs = Date.now();
        session = {
          id: hash(sid),
          user_id: null,
          csrf: generateCsrfToken(sid),
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
        const isReceiptRoute = /^\/api\/(bookings|gift-requests|group-requests)\/[^/]+\/receipt$/.test(route);
        body = await parseMutationRequest(
          req,
          session.csrf,
          [expectedOrigin, process.env.CUSTOMER_ORIGIN, process.env.PUBLIC_ORIGIN],
          sid,
          isReceiptRoute ? 2_900_000 : 50000,
        );
      }

      const rotateCustomerSession = (u) => {
        db.run('DELETE FROM sessions WHERE id=?', session.id);
        sid = token();
        const nowMs = Date.now();
        session = {
          id: hash(sid),
          user_id: u.id,
          csrf: generateCsrfToken(sid),
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
        const nailShades = helpers.nailShades ? helpers.nailShades().filter((s) => s.active) : [];
        return send({
          services: helpers.services().filter((s) => s.active),
          packages: helpers.packages().filter((p) => p.active),
          settings: helpers.settings(),
          nail_shades: nailShades,
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

      if (method === 'GET' && route === '/api/availability') {
        checkRate(`avail:${req.socket.remoteAddress}`, 120, 60000);
        const slotsResult = computeAvailableSlots(db, helpers, {
          date: query.date,
          duration: query.duration ? Number(query.duration) : 60,
          neighborhood: query.neighborhood,
        });
        return send(slotsResult);
      }

      if (method === 'GET' && route === '/api/bookings/track') {
        checkRate(`track:${req.socket.remoteAddress}`, 60, 600000);
        const ref = String(query.ref || '').trim();
        const phoneDigits = String(query.phone || '').trim();
        if (!ref) fail('رقم الحجز المرجعي مطلوب', 400);
        const b = helpers.bookings().find((x) => x.id === ref || x.reference === ref.toUpperCase());
        if (!b) fail('لم يتم العثور على حجز بهذا الرقم المرجعي', 404);

        if (!user || (user.role === 'customer' && b.user_id && b.user_id !== user.id)) {
          const cleanPhone = String(b.phone || '').replace(/\D/g, '');
          const last4 = cleanPhone.slice(-4);
          if (!phoneDigits || phoneDigits.slice(-4) !== last4) {
            fail('يرجى إدخال آخر 4 أرقام من جوال الحجز للتحقق والأمان', 403);
          }
        }

        return send({
          reference: b.reference,
          name: b.name,
          neighborhood: b.neighborhood,
          date: b.date,
          time: b.time,
          duration: b.duration,
          status: b.status,
          payment_status: b.payment_status || (b.payment_verified ? 'verified_paid' : (b.receipt_uploaded ? 'receipt_submitted' : 'awaiting_receipt')),
          payment_verified: !!b.payment_verified,
          receipt_uploaded: !!b.receipt_uploaded,
          total: b.total,
          items: b.items,
          add_ons: b.add_ons,
          created_at: b.created_at,
          hold_expires_at: b.hold_expires_at || null,
        });
      }

      if (method === 'GET' && route === '/api/atelier/colors') {
        return send({ colors: db.all('SELECT * FROM nail_shades WHERE active=1 ORDER BY sort_order ASC, created_at DESC') });
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
        db.tx(() => {
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
          // Award 50 welcome petals immediately upon registration
          helpers.recordLedger(u.id, null, 50, `welcome:${u.id}`, 'welcome_bonus');
          helpers.audit(u, 'account.register', u.id, JSON.stringify({ welcome_petals: 50 }));
        });
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

      if (method === 'GET' && /^\/api\/group-requests\/[^/]+$/.test(route)) {
        const id = route.split('/')[3];
        const row = db.get('SELECT id, reference, data FROM group_requests WHERE id=? OR reference=?', id, id);
        if (!row) fail('Group request not found', 404);
        const gr = JSON.parse(row.data);
        return send({ ok: true, group_request: gr });
      }

      if (method === 'GET' && /^\/api\/group-requests\/[^/]+\/invoice$/.test(route)) {
        const id = route.split('/')[3];
        const row = db.get('SELECT id, reference, data FROM group_requests WHERE id=? OR reference=?', id, id);
        if (!row) fail('Group request not found', 404);
        const gr = JSON.parse(row.data);
        const html = renderOccasionContractHtml(gr, helpers.settings());
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        return res.end(html);
      }

      if (method === 'GET' && /^\/api\/invoices\/[^/]+\/[^/]+$/.test(route)) {
        const parts = route.split('/');
        const ref = decodeURIComponent(parts[3] || '');
        const rawTok = decodeURIComponent(parts[4] || '');
        const isPdf = rawTok.endsWith('.pdf');
        const tok = isPdf ? rawTok.slice(0, -4) : rawTok;
        const b = helpers.bookings().find((x) => x.reference === ref);
        if (!b || !verifyInvoiceToken(b, tok)) {
          fail('Invoice not found or link invalid', 404);
        }
        const s = helpers.settings();
        if (isPdf) {
          const pdfBuf = generateInvoicePdfBuffer(b, s);
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="J-Beauty-Invoice-${b.reference}.pdf"`,
            'Cache-Control': 'no-store',
          });
          return res.end(pdfBuf);
        }
        const html = renderInvoiceHtml(b, s, `/api/invoices/${encodeURIComponent(b.reference)}/${encodeURIComponent(tok)}.pdf`);
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        return res.end(html);
      }

      if (method === 'POST' && /^\/api\/bookings\/[^/]+\/receipt$/.test(route)) {
        checkRate(`receipt:${req.socket.remoteAddress}`, 20, 3600000);
        const rawParam = decodeURIComponent(route.split('/')[3] || '').trim();
        const b = helpers.bookings().find((x) => x.id === rawParam || x.reference === rawParam.toUpperCase());
        if (!b) fail('لم يتم العثور على الحجز المحدد', 404);

        // Verify ownership: either logged-in owner, same booking session scope, or matching phone number
        const rowMeta = db.get('SELECT scope, user_id FROM bookings WHERE id=?', b.id);
        let authorized = false;
        if (user && b.user_id && b.user_id === user.id) authorized = true;
        else if (rowMeta && rowMeta.scope === session.id) authorized = true;
        else if (body.phone) {
          try {
            if (phone(body.phone) === b.phone) authorized = true;
          } catch {}
        }
        if (!authorized) {
          fail('يرجى إدخال رقم الجوال المسجل في الحجز لتأكيد رفع الإيصال', 403);
        }

        const parsed = validateReceiptUpload(body);
        const recId = uid();
        const uploadedAt = now();
        db.tx(() => {
          db.run(
            'INSERT INTO payment_receipts(id, booking_id, reference, filename, mime_type, data_url, sender_name, transfer_ref, uploaded_by, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
            recId,
            b.id,
            b.reference,
            parsed.filename,
            parsed.mime_type,
            parsed.data_url,
            parsed.sender_name,
            parsed.transfer_ref,
            user ? user.id : 'customer',
            uploadedAt,
          );
          b.receipt_uploaded = true;
          b.receipt_uploaded_at = uploadedAt;
          b.receipt_id = recId;
          b.receipt_sender_name = parsed.sender_name;
          b.receipt_transfer_ref = parsed.transfer_ref;
          b.payment_status = 'receipt_submitted';
          b.payment_method = 'bank_transfer';
          if (!b.paid_cents || b.paid_cents <= 0) {
            b.paid_amount = b.total;
            b.paid_cents = Math.round(b.total * 100);
          }
          b.hold_expires_at = new Date(Date.now() + 86400000).toISOString();
          helpers.saveBooking(b);
          helpers.audit(user, 'booking.receipt_upload', b.id, JSON.stringify({ reference: b.reference, filename: parsed.filename, transfer_ref: parsed.transfer_ref }));
        });
        return send(
          {
            ok: true,
            receipt: {
              id: recId,
              booking_reference: b.reference,
              filename: parsed.filename,
              mime_type: parsed.mime_type,
              created_at: uploadedAt,
            },
          },
          201,
        );
      }

      if (method === 'POST' && route === '/api/coupons/validate') {
        checkRate(`coupon:${req.socket.remoteAddress}`, 40);
        const code = String(body?.code || '').trim().toUpperCase();
        const spend = Number(body?.total || body?.subtotal || 0);
        if (!code) fail('يرجى إدخال كود الكوبون', 400);

        // First check auto-generated Gift Cards against Ops DB directly
        const giftMatch = findActiveGiftByCode(db, code);
        if (giftMatch) {
          const { gift } = giftMatch;
          if (gift.status === 'cancelled') {
            fail('تم إلغاء بطاقة الإهداء هذه من قبل الإدارة.', 400);
          }
          if (gift.status === 'redeemed' || gift.redeemed) {
            fail('تم استخدام بطاقة الإهداء هذه مسبقاً.', 400);
          }
          if (gift.status === 'pending_payment' || !gift.payment_verified) {
            fail('بطاقة الإهداء بانتظار تأكيد التحويل البنكي والاعتماد من الإدارة قبل تفعيلها.', 400);
          }
          const giftVal = Number(gift.estimated_amount || gift.chosen?.price || 0);
          const discountAmount = Math.min(spend > 0 ? spend : giftVal, giftVal);
          return send({
            valid: true,
            is_gift: true,
            coupon: {
              code: gift.gift_code || gift.reference,
              discount_type: 'fixed',
              discount_value: giftVal,
              value: giftVal,
              min_spend: 0,
              is_gift: true,
              recipient_name: gift.recipient_name,
            },
            code: gift.gift_code || gift.reference,
            discount_type: 'fixed',
            discount_value: giftVal,
            discount_amount: discountAmount,
            final_total: Math.max(0, spend - discountAmount),
          });
        }

        const coupon = db.get('SELECT * FROM coupons WHERE UPPER(code)=? AND active=1', code);
        if (!coupon) fail('كود الكوبون غير صحيح أو غير مفعّل', 404);
        const today = new Date().toISOString().slice(0, 10);
        if (coupon.valid_from && coupon.valid_from > today) fail('هذا الكوبون لم يبدأ تفعيله بعد', 400);
        if (coupon.valid_until && coupon.valid_until < today) fail('عذراً، انتهت صلاحية هذا الكوبون', 400);
        if (coupon.min_spend && spend < coupon.min_spend) {
          fail(`الحد الأدنى للاستفادة من هذا الكوبون هو ${coupon.min_spend} ر.س`, 400);
        }
        if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
          fail('عذراً، اكتمل الحد الأقصى لاستخدام هذا الكوبون', 400);
        }

        // Single-use check per customer (enforced by normalized phone or user_id)
        let clientPhone = '';
        let altPhone = '';
        if (body?.phone || user?.phone) {
          const raw = String(body?.phone || user?.phone || '').trim();
          try {
            clientPhone = phone(raw);
            altPhone = clientPhone.startsWith('966') ? '0' + clientPhone.slice(3) : clientPhone;
          } catch {
            clientPhone = raw;
            altPhone = raw;
          }
        }
        if (clientPhone) {
          const used = db.get(
            'SELECT id FROM coupon_redemptions WHERE UPPER(coupon_code)=? AND (phone=? OR phone=? OR (user_id IS NOT NULL AND user_id=?))',
            coupon.code,
            clientPhone,
            altPhone,
            user?.id || null,
          );
          if (used) {
            fail('تم استخدام كود الخصم هذا مسبقاً لهذا الرقم. الكوبون صالح للاستخدام مرة واحدة فقط لكل عميلة.', 400);
          }
        }

        let discountAmount = 0;
        if (coupon.discount_type === 'percent') {
          discountAmount = Math.round((spend * coupon.discount_value) / 100);
        } else {
          discountAmount = Math.min(spend, coupon.discount_value);
        }
        return send({
          valid: true,
          coupon: {
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            value: coupon.discount_value,
            min_spend: coupon.min_spend,
          },
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          discount_amount: discountAmount,
          final_total: Math.max(0, spend - discountAmount),
        });
      }

      if (method === 'POST' && route === '/api/gift-requests') {
        checkRate(`gift:${req.socket.remoteAddress}`, 15, 3600000);
        return send(createGiftRequest(db, helpers, user, body), 201);
      }

      if (method === 'POST' && /^\/api\/gift-requests\/[^/]+\/receipt$/.test(route)) {
        checkRate(`gift-receipt:${req.socket.remoteAddress}`, 20, 3600000);
        const giftId = route.split('/')[3];
        const row = db.get('SELECT id, reference, data FROM gift_requests WHERE id=? OR reference=?', giftId, giftId);
        if (!row) fail('Gift request not found', 404);
        const fileData = String(body.file_data || '');
        if (!fileData || !fileData.startsWith('data:')) fail('Valid receipt file is required', 400);
        if (fileData.length > 3.5 * 1024 * 1024) fail('Receipt file too large (max 2.5MB)', 400);
        const mimeType = fileData.slice(5, fileData.indexOf(';')) || 'image/jpeg';
        const recId = uid();
        const uploadedAt = now();
        const gf = JSON.parse(row.data);
        gf.receipt_uploaded = true;
        gf.receipt_uploaded_at = uploadedAt;
        gf.receipt_id = recId;
        gf.receipt_file = fileData;
        gf.transfer_ref = body.transfer_ref ? String(body.transfer_ref).trim().slice(0, 80) : (gf.transfer_ref || '');
        gf.sender_account = body.sender_name ? String(body.sender_name).trim().slice(0, 100) : (gf.sender_account || '');
        db.tx(() => {
          db.run(
            'INSERT INTO payment_receipts(id, booking_id, reference, filename, mime_type, data_url, sender_name, transfer_ref, uploaded_by, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
            recId,
            row.id,
            row.reference,
            String(body.filename || 'gift-receipt').slice(0, 120),
            mimeType,
            fileData,
            gf.sender_account,
            gf.transfer_ref,
            user ? 'customer' : 'guest',
            uploadedAt,
          );
          db.run('UPDATE gift_requests SET data=? WHERE id=?', JSON.stringify(gf), row.id);
          helpers.audit(user, 'gift.receipt_uploaded', row.id, JSON.stringify({ transfer_ref: gf.transfer_ref }));
        });
        return send({ ok: true, receipt_id: recId });
      }

      if (method === 'POST' && /^\/api\/group-requests\/[^/]+\/receipt$/.test(route)) {
        checkRate(`group-receipt:${req.socket.remoteAddress}`, 20, 3600000);
        const grpId = route.split('/')[3];
        const row = db.get('SELECT id, reference, data FROM group_requests WHERE id=? OR reference=?', grpId, grpId);
        if (!row) fail('Group request not found', 404);
        const fileData = String(body.file_data || '');
        if (!fileData || !fileData.startsWith('data:')) fail('Valid receipt file is required', 400);
        if (fileData.length > 3.5 * 1024 * 1024) fail('Receipt file too large (max 2.5MB)', 400);
        const mimeType = fileData.slice(5, fileData.indexOf(';')) || 'image/jpeg';
        const recId = uid();
        const uploadedAt = now();
        const gr = JSON.parse(row.data);
        gr.receipt_uploaded = true;
        gr.receipt_uploaded_at = uploadedAt;
        gr.receipt_id = recId;
        gr.receipt_file = fileData;
        gr.status = 'deposit_receipt_uploaded';
        gr.transfer_ref = body.transfer_ref ? String(body.transfer_ref).trim().slice(0, 80) : (gr.transfer_ref || '');
        gr.sender_account = body.sender_name ? String(body.sender_name).trim().slice(0, 100) : (gr.sender_account || '');
        db.tx(() => {
          db.run(
            'INSERT INTO payment_receipts(id, booking_id, reference, filename, mime_type, data_url, sender_name, transfer_ref, uploaded_by, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
            recId,
            row.id,
            row.reference,
            String(body.filename || 'occasion-receipt').slice(0, 120),
            mimeType,
            fileData,
            gr.sender_account,
            gr.transfer_ref,
            user ? 'customer' : 'coordinator',
            uploadedAt,
          );
          db.run('UPDATE group_requests SET data=? WHERE id=?', JSON.stringify(gr), row.id);
          helpers.audit(user, 'group.receipt_uploaded', row.id, JSON.stringify({ transfer_ref: gr.transfer_ref }));
        });
        return send({ ok: true, receipt_id: recId });
      }

      if (method === 'GET' && route === '/api/account') {
        needUser();
        const myBookings = helpers
          .bookings()
          .filter((b) => b.user_id === user.id)
          .map((b) => {
            const tok = invoiceToken(b);
            return {
              ...b,
              invoice_url: `/api/invoices/${encodeURIComponent(b.reference)}/${tok}`,
              invoice_pdf_url: `/api/invoices/${encodeURIComponent(b.reference)}/${tok}.pdf`,
            };
          });
        const passport = getPassportData(db, helpers, user);
        const referralCode = 'REF' + user.phone.slice(-6);
        if (!db.get("SELECT id FROM ledger WHERE user_id=? AND reason='welcome_bonus'", user.id)) {
          helpers.recordLedger(user.id, null, 50, `welcome:${user.id}`, 'welcome_bonus');
        }
        return send({
          user: publicUser(user),
          bookings: myBookings,
          ledger: db.all('SELECT * FROM ledger WHERE user_id=? ORDER BY created_at DESC', user.id),
          balance: helpers.balance(user.id),
          has_pending_entitlement: false,
          rewards: helpers.settings().rewards,
          reward_requests: db
            .all('SELECT data FROM reward_requests WHERE user_id=?', user.id)
            .map((r) => JSON.parse(r.data)),
          reviews: db
            .all('SELECT data,booking_id FROM reviews WHERE user_id=?', user.id)
            .map((r) => ({ ...JSON.parse(r.data), booking_id: r.booking_id })),
          passport,
          referral: {
            code: referralCode,
            bonus_petals: 50,
            friend_discount_percent: 15,
            share_text: `مرحباً! جربي العناية الفاخرة مع J Beauty Spa في المدينة المنورة واحصلي على خصم 15% على حجزك الأول باستخدام كود الإحالة: ${referralCode}`,
          },
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
        if (!body.booking_id || body.guest === true) {
          if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
            fail('Invalid rating');
          }
          const reviewBody = text(body.body, 2000);
          const displayName = optionalText(body.display_name, 60) || (user?.name || 'زائرة J Beauty');
          if (/(?:\+?966|05)\d{8,9}/.test(`${reviewBody} ${displayName}`)) {
            fail('Please remove phone numbers from your review');
          }
          const review = {
            id: uid(),
            rating: body.rating,
            body: reviewBody,
            display_name: displayName,
            service_name: optionalText(body.service_name, 80) || '',
            approved: false,
            moderation_status: 'pending',
            moderation_note: '',
            is_guest: true,
            created_at: now(),
          };
          const guestBookingId = `guest_rev_${review.id}`;
          const reviewerId = user ? user.id : 'guest';
          db.run(
            'INSERT INTO reviews(id,user_id,booking_id,data) VALUES(?,?,?,?)',
            review.id,
            reviewerId,
            guestBookingId,
            JSON.stringify(review),
          );
          return send({ ok: true, review: { ...review, booking_id: guestBookingId } }, 201);
        }

        needUser();
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
    handler,
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
