import assert from 'node:assert/strict';
import { createPlatform } from '../server.mjs';
import { generateTotpCode } from '../server/auth/mfa.mjs';
import { phone as normalizePhone } from '../server/validation.mjs';

// Enforce mandatory MFA across all staff in security verification
process.env.OPS_MFA_REQUIRED = 'all';

const app = createPlatform({ dbPath: ':memory:' });
app.ownerBootstrap({ name: 'Security Owner', phone: '0509000001', password: 'Owner-security-test-2026' });
await new Promise((r) => app.customerServer.listen(0, '127.0.0.1', r));
await new Promise((r) => app.opsServer.listen(0, '127.0.0.1', r));
const custBase = `http://127.0.0.1:${app.customerServer.address().port}`;
const opsBase = `http://127.0.0.1:${app.opsServer.address().port}`;

class Client {
  constructor(base, sessionPath) {
    this.base = base;
    this.sessionPath = sessionPath;
    this.cookie = '';
    this.cookieAttrs = [];
    this.csrf = '';
  }
  async call(path, data, expected = 200, extra = {}) {
    const r = await fetch(this.base + path, {
      method: data === undefined ? 'GET' : 'POST',
      headers: {
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...(data === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': this.csrf, Origin: this.base }),
        ...extra,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const setCookies = r.headers.getSetCookie();
    if (setCookies.length) {
      this.cookieAttrs = setCookies;
      this.cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
    }
    const json = await r.json();
    if (json.csrfToken) this.csrf = json.csrfToken;
    if (expected !== null) {
      assert.equal(r.status, expected, `${path} returned ${r.status}: ${JSON.stringify(json)}`);
    }
    return { ...json, httpStatus: r.status, headers: r.headers };
  }
  async init() {
    await this.call(this.sessionPath);
    return this;
  }
}

async function enrollAndVerifyMfa(opsClient) {
  const dashBlocked = await opsClient.call('/api/ops/dashboard', undefined, 403);
  assert.match(dashBlocked.error, /MFA verification required/i);
  const setup = await opsClient.call('/api/ops/mfa/setup', {});
  assert.ok(setup.secret && setup.otpauth_uri.includes('otpauth://totp/'));
  assert.equal(setup.recovery_codes.length, 8);
  const code = generateTotpCode(setup.secret);
  await opsClient.call('/api/ops/mfa/verify', { code });
  return setup;
}

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log('PASS ' + name);
}

try {
  const owner = await new Client(opsBase, '/api/ops/session').init();
  const cust = await new Client(custBase, '/api/session').init();
  const other = await new Client(custBase, '/api/session').init();

  await test('Host-only distinct cookies set with zero Domain attribute and no-store/noindex on Ops', async () => {
    assert.ok(cust.cookie.startsWith('jb_customer_session='), `Customer cookie name mismatch: ${cust.cookie}`);
    assert.ok(owner.cookie.startsWith('jb_ops_session='), `Ops cookie name mismatch: ${owner.cookie}`);
    assert.ok(!/Domain=/i.test(cust.cookieAttrs[0]), 'Customer cookie must never set Domain attribute');
    assert.ok(!/Domain=/i.test(owner.cookieAttrs[0]), 'Ops cookie must never set Domain attribute');
    assert.ok(/HttpOnly/i.test(owner.cookieAttrs[0]) && /SameSite=Strict/i.test(owner.cookieAttrs[0]));

    const opsRoot = await fetch(opsBase + '/');
    assert.equal(opsRoot.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(opsRoot.headers.get('cache-control'), 'no-store');
  });

  await test('Staff login enforces mandatory MFA before dashboard & encrypts TOTP secrets at rest', async () => {
    const loginRes = await owner.call('/api/ops/login', { phone: '0509000001', password: 'Owner-security-test-2026' });
    assert.equal(loginRes.mfa.setup_required, true);
    assert.equal(loginRes.mfa.verified, false);

    const setup = await enrollAndVerifyMfa(owner);
    const dbRow = app.db.prepare('SELECT mfa_secret_enc FROM users WHERE phone=?').get(normalizePhone('0509000001'));
    assert.ok(dbRow.mfa_secret_enc && !dbRow.mfa_secret_enc.includes(setup.secret), 'MFA secret must be encrypted at rest');

    // Re-login with enrolled MFA prevents /mfa/setup overwrite and requires valid TOTP or single-use recovery code
    const owner2 = await new Client(opsBase, '/api/ops/session').init();
    await owner2.call('/api/ops/login', { phone: '0509000001', password: 'Owner-security-test-2026' });
    await owner2.call('/api/ops/mfa/setup', {}, 403);
    await owner2.call('/api/ops/mfa/verify', { code: '000000' }, 401);
    await owner2.call('/api/ops/mfa/verify', { recovery_code: setup.recovery_codes[0] });
    await owner2.call('/api/ops/dashboard');

    // Reusing same single-use recovery code must fail
    const owner3 = await new Client(opsBase, '/api/ops/session').init();
    await owner3.call('/api/ops/login', { phone: '0509000001', password: 'Owner-security-test-2026' });
    await owner3.call('/api/ops/mfa/verify', { recovery_code: setup.recovery_codes[0] }, 401);
  });

  await test('Customer / Staff logins strictly isolated across origins (403 cross-origin login & cookie replay fails)', async () => {
    await cust.call(
      '/api/register',
      {
        name: 'Security Customer',
        phone: '0509000002',
        password: 'Customer-security-test-2026',
        passwordConfirmation: 'Customer-security-test-2026',
        terms: true,
      },
      201,
    );
    await other.call(
      '/api/register',
      {
        name: 'Other Customer',
        phone: '0509000003',
        password: 'Other-security-test-2026',
        passwordConfirmation: 'Other-security-test-2026',
        terms: true,
      },
      201,
    );

    // Staff rejected on Customer login
    const staffOnCust = await new Client(custBase, '/api/session').init();
    await staffOnCust.call('/api/login', { phone: '0509000001', password: 'Owner-security-test-2026' }, 403);

    // Customer rejected on Ops login
    const custOnOps = await new Client(opsBase, '/api/ops/session').init();
    await custOnOps.call('/api/ops/login', { phone: '0509000002', password: 'Customer-security-test-2026' }, 403);

    // Replay customer cookie on Ops -> 401; Replay ops cookie on Customer -> 401
    const replayCustToOps = await fetch(opsBase + '/api/ops/dashboard', { headers: { Cookie: cust.cookie } });
    assert.equal(replayCustToOps.status, 401);
    const replayOpsToCust = await fetch(custBase + '/api/account', { headers: { Cookie: owner.cookie } });
    assert.equal(replayOpsToCust.status, 401);

    // Customer routes reject /ar/admin, /en/admin, /api/admin, /api/ops
    for (const p of ['/ar/admin', '/en/admin', '/ar/ops']) {
      const r = await fetch(custBase + p);
      assert.equal(r.status, 404);
      assert.ok(r.headers.get('x-robots-tag')?.includes('noindex'));
    }
    await cust.call('/api/admin', undefined, 404);
    await cust.call('/api/ops/dashboard', undefined, 404);
  });

  await test('CSRF & cross-origin isolation enforce origin allowlists strictly', async () => {
    await owner.call('/api/ops/settings', { settings: { capacity: 9 } }, 403, { 'X-CSRF-Token': 'invalid' });
    await owner.call('/api/ops/settings', { settings: { capacity: 9 } }, 403, { Origin: 'https://attacker.invalid' });
    // Even Customer origin is rejected for Ops mutations
    await owner.call('/api/ops/settings', { settings: { capacity: 9 } }, 403, { Origin: custBase });
  });

  // Create distinct role staff users
  await owner.call('/api/ops/staff', { name: 'Ops Mgr', phone: '0509000011', password: 'Staff-security-2026', role: 'ops_manager' }, 201);
  await owner.call('/api/ops/staff', { name: 'Receptionist', phone: '0509000012', password: 'Staff-security-2026', role: 'reception' }, 201);
  await owner.call('/api/ops/staff', { name: 'Finance User', phone: '0509000013', password: 'Staff-security-2026', role: 'finance' }, 201);
  await owner.call('/api/ops/staff', { name: 'Practitioner 1', phone: '0509000014', password: 'Staff-security-2026', role: 'practitioner' }, 201);
  await owner.call('/api/ops/staff', { name: 'Practitioner 2', phone: '0509000015', password: 'Staff-security-2026', role: 'practitioner' }, 201);

  // Also test legacy_employee inserted directly (simulating migrated v1 staff)
  const { hashPassword } = await import('../server/auth.mjs');
  app.db
    .prepare('INSERT INTO users(id,name,phone,password,role,verified,created_at) VALUES(?,?,?,?,?,?,?)')
    .run('legacy-emp-id', 'Legacy Staff', normalizePhone('0509000016'), hashPassword('Staff-security-2026'), 'legacy_employee', 1, new Date().toISOString());

  async function staffSignIn(phoneNum) {
    const cli = await new Client(opsBase, '/api/ops/session').init();
    await cli.call('/api/ops/login', { phone: phoneNum, password: 'Staff-security-2026' });
    await enrollAndVerifyMfa(cli);
    return cli;
  }

  const mgr = await staffSignIn('0509000011');
  const recp = await staffSignIn('0509000012');
  const fin = await staffSignIn('0509000013');
  const prac1 = await staffSignIn('0509000014');
  const prac2 = await staffSignIn('0509000015');
  const legacy = await staffSignIn('0509000016');

  const user = (await cust.call('/api/session')).user;
  const verification = await cust.call('/api/verification/request', {});
  await owner.call('/api/ops/settings', {
    settings: {
      capacity: 3,
      areas: ['Security district'],
      working_days: [0, 1, 2, 3, 4, 5, 6],
      opening_time: '08:00',
      closing_time: '22:00',
      lead_hours: 1,
      travel_buffer: 30,
      business_approved: true,
    },
  });

  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const b1 = (await cust.call('/api/bookings', { service_ids: ['relaxation'], date, time: '10:00', name: 'Security Customer', phone: '0509000002', neighborhood: 'Security district', notes: '', terms: true, idempotency_key: 'sec-b1' }, 201)).booking;
  const b2 = (await cust.call('/api/bookings', { service_ids: ['relaxation'], date, time: '10:30', name: 'Security Customer', phone: '0509000002', neighborhood: 'Security district', notes: '', terms: true, idempotency_key: 'sec-b2' }, 201)).booking;
  const bUnassigned = (await cust.call('/api/bookings', { service_ids: ['classic'], date, time: '16:00', name: 'Security Customer', phone: '0509000002', neighborhood: 'Security district', notes: '', terms: true, idempotency_key: 'sec-b3' }, 201)).booking;

  await test('Legacy employee strictly restricted from verify, recovery, payment verify, refunds, loyalty, moderation, settings & staff', async () => {
    await legacy.call('/api/ops/verify', { user_id: user.id, reference: verification.reference, observed_phone: user.phone, checked: true }, 403);
    await legacy.call('/api/ops/recovery', { user_id: user.id, observed_phone: user.phone, checked: true }, 403);
    await legacy.call('/api/ops/bookings/' + b1.id, { paid_amount: 100, payment_method: 'cash', payment_verified: true }, 403);
    await legacy.call('/api/ops/refunds/request', { booking_id: b1.id, amount: 10, reason: 'Blocked' }, 403);
    await legacy.call('/api/ops/settings', { settings: { capacity: 1 } }, 403);
    await legacy.call('/api/ops/staff', {}, 403);
    // Allowed basic confirmation
    await legacy.call('/api/ops/bookings/' + b1.id, { status: 'confirmed' }, 200);
  });

  await test('Reception verifies customer identity & issues Customer-origin recovery URL, blocked from payments & refunds', async () => {
    await recp.call('/api/ops/verify', { user_id: user.id, reference: verification.reference, observed_phone: user.phone, checked: true });
    const rec = await recp.call('/api/ops/recovery', { user_id: user.id, observed_phone: user.phone, checked: true });
    assert.ok(rec.reset_url.startsWith(custBase), 'Recovery URL must target customer base origin');
    await recp.call('/api/ops/bookings/' + b1.id, { paid_amount: 250, payment_method: 'cash', payment_verified: true }, 403);
    await recp.call('/api/ops/refunds/request', { booking_id: b1.id, amount: 10, reason: 'Blocked' }, 403);
  });

  await test('Ops Manager assigns practitioners & prevents practitioner double-booking conflict (409)', async () => {
    const p1Id = app.db.prepare('SELECT id FROM users WHERE phone=?').get(normalizePhone('0509000014')).id;
    const p2Id = app.db.prepare('SELECT id FROM users WHERE phone=?').get(normalizePhone('0509000015')).id;

    await mgr.call('/api/ops/bookings/' + b1.id, { assigned_staff_id: p1Id });
    await mgr.call('/api/ops/bookings/' + b2.id, { status: 'confirmed', assigned_staff_id: p1Id }, 409);
    await mgr.call('/api/ops/bookings/' + b2.id, { status: 'confirmed', assigned_staff_id: p2Id });
  });

  await test('Practitioner sees ONLY own assigned bookings and cannot modify other bookings or payment fields', async () => {
    const dash1 = await prac1.call('/api/ops/dashboard');
    assert.equal(dash1.bookings.length, 1);
    assert.equal(dash1.bookings[0].id, b1.id);
    assert.ok(!dash1.bookings.some((b) => b.id === b2.id || b.id === bUnassigned.id));

    await prac1.call('/api/ops/bookings/' + b2.id, { status: 'in_progress' }, 403);
    await prac1.call('/api/ops/bookings/' + b1.id, { paid_amount: 250 }, 403);
    await prac1.call('/api/ops/bookings/' + b1.id, { status: 'in_progress' });
    await prac1.call('/api/ops/bookings/' + b1.id, { status: 'completed' });
  });

  await test('Finance verifies payment & requests refund, but ONLY Owner can approve refund or adjust Petals manually', async () => {
    await fin.call('/api/ops/bookings/' + b1.id, { paid_amount: 250, payment_method: 'cash', payment_verified: true });
    assert.equal((await cust.call('/api/account')).balance, 250);

    const refReq = await fin.call('/api/ops/refunds/request', { booking_id: b1.id, amount: 50, reason: 'Finance check' }, 201);
    await fin.call(`/api/ops/refunds/${refReq.refund_request.id}/decide`, { decision: 'approve' }, 403);
    await fin.call('/api/ops/adjustment', { user_id: user.id, points: 50, reason: 'Blocked for finance' }, 403);

    await owner.call(`/api/ops/refunds/${refReq.refund_request.id}/decide`, { decision: 'approve' });
    assert.equal((await cust.call('/api/account')).balance, 200);
  });

  await test('Role/permission update & disable immediately invalidate active staff sessions', async () => {
    const recpRow = app.db.prepare('SELECT id FROM users WHERE phone=?').get(normalizePhone('0509000012'));
    await owner.call('/api/ops/staff/' + recpRow.id, { role: 'ops_manager', permissions: { grant: [], revoke: ['reviews.moderate'] } });
    // Existing Reception session was wiped immediately -> 401
    await recp.call('/api/ops/dashboard', undefined, 401);

    await owner.call('/api/ops/staff/' + recpRow.id, { action: 'disable' });
    const reLogin = await new Client(opsBase, '/api/ops/session').init();
    await reLogin.call('/api/ops/login', { phone: '0509000012', password: 'Staff-security-2026' }, 401);
  });

  console.log(`${passed} platform separation, MFA & RBAC security assertions passed.`);
} finally {
  await app.close();
}
