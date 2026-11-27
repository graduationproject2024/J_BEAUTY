import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dir = mkdtempSync(join(tmpdir(), 'jspa-int-'));
const port = 3187;
const opsPort = 3287;
const custBase = `http://127.0.0.1:${port}`;
const opsBase = `http://127.0.0.1:${opsPort}`;
const env = {
  ...process.env,
  DB_PATH: join(dir, 'test.sqlite'),
  PORT: String(port),
  OPS_PORT: String(opsPort),
  CUSTOMER_ORIGIN: custBase,
  OPS_ORIGIN: opsBase,
  OPS_MFA_REQUIRED: 'off',
  OWNER_NAME: 'Test Owner',
  OWNER_PHONE: '0500000001',
  OWNER_PASSWORD: 'TestOwner!Pass2026',
};

const boot = spawnSync(process.execPath, ['server.mjs', '--create-owner'], { cwd: root, env, encoding: 'utf8' });
assert.equal(boot.status, 0, boot.stderr + boot.stdout);
const server = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
server.stdout.on('data', (x) => (logs += x));
server.stderr.on('data', (x) => (logs += x));

const results = [];
class Client {
  constructor(base, sessionRoute) {
    this.base = base;
    this.sessionRoute = sessionRoute;
    this.cookie = '';
    this.csrf = '';
  }
  async call(path, data, expected = 200) {
    const r = await fetch(this.base + path, {
      method: data === undefined ? 'GET' : 'POST',
      headers: {
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...(data === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': this.csrf, Origin: this.base }),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const cookies = r.headers.getSetCookie();
    if (cookies.length) this.cookie = cookies.map((c) => c.split(';')[0]).join('; ');
    const json = await r.json();
    if (json.csrfToken) this.csrf = json.csrfToken;
    if (expected !== null) {
      assert.ok(expected === r.status || (expected === 200 && r.status === 201), `${path}: ${r.status} ${JSON.stringify(json)}`);
    }
    return { status: r.status, ...json };
  }
  async init() {
    await this.call(this.sessionRoute);
    return this;
  }
}

async function test(name, fn) {
  await fn();
  results.push(name);
  console.log('PASS ' + name);
}

try {
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(custBase + '/api/session');
      await fetch(opsBase + '/api/ops/session');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const owner = await new Client(opsBase, '/api/ops/session').init();
  const customer = await new Client(custBase, '/api/session').init();
  const guest = await new Client(custBase, '/api/session').init();
  const opsGuest = await new Client(opsBase, '/api/ops/session').init();

  await owner.call('/api/ops/login', { phone: env.OWNER_PHONE, password: env.OWNER_PASSWORD });

  let cat = await guest.call('/api/catalog');
  let bid;
  let reference;
  await test('Seed catalog: 13 services and 4 computed packages', async () => {
    assert.equal(cat.services.length, 13);
    assert.equal(cat.packages.length, 4);
    assert.equal(cat.packages.find((p) => p.price === 469).original_total, 525);
  });

  await owner.call('/api/ops/settings', {
    settings: {
      business_phone: '966500000001',
      areas: ['Test district'],
      capacity: 1,
      working_days: [0, 1, 2, 3, 4, 5, 6],
      opening_time: '08:00',
      closing_time: '22:00',
      blocked_dates: [],
      travel_buffer: 30,
      lead_hours: 1,
      business_approved: true,
    },
  });

  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const request = {
    service_ids: [cat.services[0].id],
    date,
    time: '12:00',
    name: 'Test Customer',
    phone: '0500000002',
    neighborhood: 'Test district',
    notes: 'Test only',
    terms: true,
    idempotency_key: 'test-guest-unique-001',
  };
  let gb;

  await test('Guest persists pending request and WhatsApp handoff', async () => {
    gb = await guest.call('/api/bookings', request);
    assert.equal(gb.booking.status, 'pending_confirmation');
    assert.ok(gb.message.includes(gb.booking.reference));
    assert.ok(gb.whatsapp_url.startsWith('https://wa.me/'));
  });

  await test('Duplicate guest submission does not create another booking', async () => {
    const again = await guest.call('/api/bookings', request);
    assert.equal(again.booking.id, gb.booking.id);
  });

  await test('Registration and pending verification cannot inherit guest history', async () => {
    await customer.call('/api/register', {
      name: 'Test Customer',
      phone: '0500000002',
      password: 'Customer!Pass2026',
      passwordConfirmation: 'Customer!Pass2026',
      terms: true,
    });
    await customer.call('/api/session');
    const a = await customer.call('/api/account');
    assert.equal(a.bookings.length, 0);
  });

  const user = (await customer.call('/api/session')).user;
  await test('Verification rejects incorrect reference and observed phone', async () => {
    const v = await customer.call('/api/verification/request', {});
    reference = v.reference;
    let bad = await owner.call('/api/ops/verify', { user_id: user.id, reference: 'WRONG', observed_phone: user.phone, checked: true }, null);
    assert.ok(bad.status >= 400);
    bad = await owner.call('/api/ops/verify', { user_id: user.id, reference, observed_phone: '0500000009', checked: true }, null);
    assert.ok(bad.status >= 400);
  });

  await test('Staff verifies matching reference and observed number once', async () => {
    await owner.call('/api/ops/verify', { user_id: user.id, reference, observed_phone: user.phone, checked: true });
    assert.ok((await customer.call('/api/session')).user.verified);
    const reuse = await owner.call('/api/ops/verify', { user_id: user.id, reference, observed_phone: user.phone, checked: true }, null);
    assert.ok(reuse.status >= 400);
  });

  await test('Registered booking belongs to signed in customer', async () => {
    const b = await customer.call('/api/bookings', { ...request, time: '15:00', idempotency_key: 'registered-test-001' });
    bid = b.booking.id;
    assert.equal((await customer.call('/api/account')).bookings.length, 1);
  });

  await test('Pending and confirmed bookings earn zero points', async () => {
    assert.equal((await customer.call('/api/account')).balance, 0);
    await owner.call(`/api/ops/bookings/${bid}`, { status: 'confirmed' });
    assert.equal((await customer.call('/api/account')).balance, 0);
  });

  await test('Staff capacity prevents overlapping confirmations', async () => {
    const b = await guest.call('/api/bookings', { ...request, time: '15:00', idempotency_key: 'overlap-test-001' });
    const r = await owner.call(`/api/ops/bookings/${b.booking.id}`, { status: 'confirmed' }, null);
    assert.ok(r.status >= 400);
  });

  await test('Completed unpaid booking earns zero points', async () => {
    await owner.call(`/api/ops/bookings/${bid}`, { status: 'in_progress' });
    await owner.call(`/api/ops/bookings/${bid}`, { status: 'completed' });
    assert.equal((await customer.call('/api/account')).balance, 0);
  });

  await test('Verified payment awards actual spend and repeated save is idempotent', async () => {
    await owner.call(`/api/ops/bookings/${bid}`, { paid_amount: 250, payment_method: 'cash', payment_verified: true });
    assert.equal((await customer.call('/api/account')).balance, 250);
    await owner.call(`/api/ops/bookings/${bid}`, { paid_amount: 250, payment_method: 'cash', payment_verified: true });
    assert.equal((await customer.call('/api/account')).balance, 250);
    const adm = await owner.call('/api/ops/dashboard');
    const pay = adm.payments.find((x) => x.booking_id === bid);
    assert.ok(pay && pay.payment_verified_at);
  });

  await test('Public service route includes SSR semantic heading and zero /ar/admin route', async () => {
    const res = await fetch(custBase + '/ar/services/relaxation');
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.ok(html.includes('<h1>مساج استرخائي</h1>'));

    const admRes = await fetch(custBase + '/ar/admin');
    assert.equal(admRes.status, 404);
    assert.ok(admRes.headers.get('x-robots-tag')?.includes('noindex'));
  });

  await test('Customer cannot change payment or hit removed /api/admin endpoints', async () => {
    assert.equal((await customer.call(`/api/admin/bookings/${bid}`, { paid_amount: 9999, payment_verified: true }, null)).status, 404);
    assert.equal((await customer.call('/api/ops/settings', { settings: { capacity: 9 } }, null)).status, 404);
  });

  await test('Verified reviews require owned completed booking and moderation', async () => {
    await customer.call('/api/reviews', {
      booking_id: bid,
      rating: 5,
      body: 'A real test review, never production content.',
      display_name: 'Test',
    });
    assert.equal((await guest.call('/api/catalog')).reviews.length, 0);
    assert.ok((await customer.call('/api/reviews', { booking_id: bid, rating: 5, body: 'duplicate' }, null)).status >= 400);
  });

  await test('Reward commit deducts points once', async () => {
    const a = await customer.call('/api/account');
    const rw = a.rewards.find((x) => x.points === 200);
    await customer.call('/api/rewards/request', { reward_id: rw.id });
    const admin = await owner.call('/api/ops/dashboard');
    const pending = admin.reward_requests.find((x) => x.user_id === user.id);
    const b = await customer.call('/api/bookings', { ...request, time: '18:00', idempotency_key: 'reward-booking-001' });
    await owner.call(`/api/ops/rewards/${pending.id}`, { booking_id: b.booking.id, action: 'commit' });
    assert.equal((await customer.call('/api/account')).balance, 50);
    assert.ok((await owner.call(`/api/ops/rewards/${pending.id}`, { booking_id: b.booking.id, action: 'commit' }, null)).status >= 400);
    assert.equal((await customer.call('/api/account')).balance, 50);
  });

  await test('Unauthenticated ops dashboard request rejected', async () => {
    assert.equal((await opsGuest.call('/api/ops/dashboard', undefined, null)).status, 401);
  });

  await test('Cross-origin write rejected', async () => {
    const r = await fetch(custBase + '/api/bookings', {
      method: 'POST',
      headers: { Origin: 'https://evil.invalid', 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    assert.ok(r.status >= 400);
  });

  await test('Unknown routes return HTTP 404 and legacy group-booking redirects 301 to occasions', async () => {
    const r1 = await fetch(custBase + '/ar/unknown-xyz');
    assert.equal(r1.status, 404);
    const r2 = await fetch(custBase + '/en/services/nonexistent-ritual');
    assert.equal(r2.status, 404);
    const r3 = await fetch(custBase + '/ar/group-booking', { redirect: 'manual' });
    assert.equal(r3.status, 301);
    assert.equal(r3.headers.get('location'), '/ar/occasions');
    const r4 = await fetch(custBase + '/ar/occasions');
    assert.equal(r4.status, 200);
    assert.ok((await r4.text()).includes('تنسيق جلسات المناسبات'));
  });

  await test('Ritual Studio returns deterministic catalog-backed recommendations', async () => {
    const rec = await guest.call('/api/studio/recommend', { mood: 'unwind', minutes_available: 90, budget: 300, format: 'either' });
    assert.ok(Array.isArray(rec.recommendations) && rec.recommendations.length >= 1);
    assert.ok(rec.recommendations[0].reasons_ar && rec.recommendations[0].reasons_en);
  });

  await test('Nail Atelier supports oval shape, save, share code, Passport favorites & preferences', async () => {
    const saved = await customer.call('/api/atelier/styles', {
      name: 'Test Oval Blush',
      shape: 'oval',
      length: 'medium',
      polish_color: '#D9B7C0',
      french_style: 'classic',
      tip_color: '#FBF7F4',
      finish: 'gloss',
      accent: 'none',
      share: true,
    });
    assert.ok(saved.style.share_code);
    const loaded = await guest.call(`/api/atelier/styles/${saved.style.share_code}`);
    assert.equal(loaded.style.shape, 'oval');
    await customer.call('/api/passport/favorites', { service_id: 'relaxation', action: 'add' });
    await customer.call('/api/passport/preferences', {
      preferred_neighborhood: 'Test district',
      pressure: 'medium',
      nail_finish: 'gloss',
      reminder_opt_in: true,
      scent_note: 'Lavender',
    });
    const acc = await customer.call('/api/account');
    assert.ok(acc.passport.favorites.includes('relaxation'));
    assert.ok(acc.passport.saved_styles.some((s) => s.id === saved.style.id));
    assert.equal(acc.passport.preferences.reminder_opt_in, true);
  });

  await test('Group & Gift requests persist pending review and update via ops', async () => {
    const grp = await guest.call('/api/group-requests', {
      organizer_name: 'Test Organizer',
      organizer_phone: '0500000005',
      date,
      time: '16:00',
      neighborhood: 'Test district',
      participants: [
        { label: 'Guest A', service_ids: ['relaxation'] },
        { label: 'Guest B', service_ids: ['classic'] },
      ],
      terms: true,
    });
    assert.equal(grp.group_request.status, 'pending_approval');
    await owner.call(`/api/ops/group-requests/${grp.group_request.id}`, { status: 'approved' });
    const gf = await guest.call('/api/gift-requests', {
      sender_name: 'Sender',
      sender_phone: '0500000006',
      recipient_name: 'Recipient',
      personal_message: 'For you',
      service_id: 'relaxation',
      terms: true,
    });
    assert.equal(gf.gift_request.status, 'pending_staff_payment');
    await owner.call(`/api/ops/gift-requests/${gf.gift_request.id}`, { status: 'approved_ready', payment_verified: true });
  });

  await test('Telemetry funnel and ops pagination metadata work cleanly', async () => {
    await guest.call('/api/telemetry/event', { event: 'home_view' });
    const adm = await owner.call('/api/ops/dashboard?bookings_page=1&bookings_limit=2');
    assert.ok(adm.pagination.bookings.total >= 1);
    assert.ok(adm.analytics.funnel.home_view >= 1);
  });

  await customer.call('/api/logout', {});
  assert.equal((await customer.call('/api/session')).user, null);
  console.log(`\n${results.length} dual-origin integration checks passed.`);
  writeFileSync(join(root, 'TEST-RESULTS.json'), JSON.stringify({ date: new Date().toISOString(), passed: results }, null, 2));
} catch (e) {
  console.error(logs);
  throw e;
} finally {
  server.kill();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
}
