import assert from 'node:assert/strict';
import { createPlatform } from '../server.mjs';

process.env.OPS_MFA_REQUIRED = 'off';
const app = createPlatform({ dbPath: ':memory:' });
app.ownerBootstrap({ name: 'Test Owner', phone: '0500000001', password: 'TestOwner!Pass2026' });
await new Promise((r) => app.customerServer.listen(0, '127.0.0.1', r));
await new Promise((r) => app.opsServer.listen(0, '127.0.0.1', r));
const custBase = `http://127.0.0.1:${app.customerServer.address().port}`;
const opsBase = `http://127.0.0.1:${app.opsServer.address().port}`;

class Client {
  constructor(base, sessionPath) {
    this.base = base;
    this.sessionPath = sessionPath;
    this.cookie = '';
    this.csrf = '';
  }
  async call(path, data, ok = true) {
    const r = await fetch(this.base + path, {
      method: data === undefined ? 'GET' : 'POST',
      headers: {
        Cookie: this.cookie,
        Origin: this.base,
        'Content-Type': 'application/json',
        'X-CSRF-Token': this.csrf,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    if (r.headers.getSetCookie().length) {
      this.cookie = r.headers.getSetCookie()[0].split(';')[0];
    }
    const v = await r.json();
    if (v.csrfToken) this.csrf = v.csrfToken;
    if (ok) assert.ok(r.ok, `${path} ${r.status} ${JSON.stringify(v)}`);
    return { ...v, httpStatus: r.status };
  }
  async init() {
    await this.call(this.sessionPath);
    return this;
  }
}

let checks = 0;
async function test(name, fn) {
  await fn();
  checks++;
  console.log('PASS ' + name);
}

try {
  const owner = await new Client(opsBase, '/api/ops/session').init();
  const c = await new Client(custBase, '/api/session').init();
  await owner.call('/api/ops/login', { phone: '0500000001', password: 'TestOwner!Pass2026' });
  await owner.call('/api/ops/settings', {
    settings: { areas: ['Test'], capacity: 2, lead_hours: 0, business_approved: true },
  });
  await owner.call('/api/ops/staff', {
    name: 'Finance Officer',
    phone: '0500000088',
    password: 'Finance!Pass2026',
    role: 'finance',
  });
  const fin = await new Client(opsBase, '/api/ops/session').init();
  await fin.call('/api/ops/login', { phone: '0500000088', password: 'Finance!Pass2026' });

  await c.call('/api/register', {
    name: 'Customer',
    phone: '0500000002',
    password: 'TestCustomer!2026',
    passwordConfirmation: 'TestCustomer!2026',
    terms: true,
  });
  const user = (await c.call('/api/session')).user;

  await test('Expired verification references fail', async () => {
    const v = await c.call('/api/verification/request', {});
    app.db.prepare('UPDATE verification SET expires=0').run();
    const r = await owner.call(
      '/api/ops/verify',
      { user_id: user.id, reference: v.reference, observed_phone: user.phone, checked: true },
      false,
    );
    assert.equal(r.httpStatus, 400);
  });

  const v = await c.call('/api/verification/request', {});
  await owner.call('/api/ops/verify', {
    user_id: user.id,
    reference: v.reference,
    observed_phone: user.phone,
    checked: true,
  });

  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const book = async (time) =>
    (
      await c.call('/api/bookings', {
        service_ids: ['relaxation'],
        date,
        time,
        name: 'Customer',
        phone: '0500000002',
        neighborhood: 'Test',
        notes: '',
        terms: true,
        idempotency_key: crypto.randomUUID(),
      })
    ).booking;
  const update = (b, data, ok = true) => owner.call('/api/ops/bookings/' + b.id, data, ok);
  const bal = async () => (await c.call('/api/account')).balance;
  const b = await book('10:00');

  await test('Paid before completion earns zero; completion awards once', async () => {
    await update(b, { status: 'confirmed' });
    await fin.call('/api/ops/bookings/' + b.id, { paid_amount: 250, payment_method: 'cash', payment_verified: true });
    assert.equal(await bal(), 0);
    await update(b, { status: 'completed' });
    assert.equal(await bal(), 250);
    await update(b, { status: 'completed' }, false);
    assert.equal(await bal(), 250);
  });

  await test('Two-step refund request (finance -> owner) reverses exact points cleanly', async () => {
    const req = await fin.call('/api/ops/refunds/request', {
      booking_id: b.id,
      amount: 25.5,
      reason: 'Finance requested partial refund',
    });
    assert.equal(req.refund_request.status, 'pending');
    assert.equal(await bal(), 250, 'Pending refund request must not alter points before Owner approval');

    await owner.call(`/api/ops/refunds/${req.refund_request.id}/decide`, { decision: 'approve' });
    assert.equal(await bal(), 224);
    const repeat = await owner.call(`/api/ops/refunds/${req.refund_request.id}/decide`, { decision: 'approve' }, false);
    assert.equal(repeat.httpStatus, 409);
  });

  await test('Immutable verified payment rejects amount overwrite', async () => {
    assert.equal((await fin.call('/api/ops/bookings/' + b.id, { paid_amount: 999 }, false)).httpStatus, 400);
    assert.equal(await bal(), 224);
  });

  const target = await book('13:00');
  await test('Duplicate pending reward requests rejected cleanly', async () => {
    await c.call('/api/rewards/request', { reward_id: 'petal-200' });
    const dup = await c.call('/api/rewards/request', { reward_id: 'petal-200' }, false);
    assert.equal(dup.httpStatus, 409);
    const list = (await c.call('/api/account')).reward_requests;
    assert.equal(list.filter((x) => x.status === 'pending').length, 1);
    await fin.call('/api/ops/rewards/' + list[0].id, { action: 'cancel' });
    assert.equal(await bal(), 224);
  });

  const r = (await c.call('/api/rewards/request', { reward_id: 'petal-200' })).reward_request;
  await fin.call('/api/ops/rewards/' + r.id, { action: 'commit', booking_id: target.id });

  await test('Refund cannot drive balance below zero and transaction rolls back', async () => {
    const out = await update(b, { refund_amount: 250, reason: 'Full refund' }, false);
    assert.equal(out.httpStatus, 409);
    assert.equal(await bal(), 24);
    const stored = (await c.call('/api/account')).bookings.find((x) => x.id === b.id);
    assert.equal(stored.refund_cents, 2550);
  });

  await test('Reward reversal restores points once; then full refund succeeds', async () => {
    await fin.call('/api/ops/rewards/' + r.id, { action: 'cancel' });
    assert.equal(await bal(), 224);
    assert.equal((await fin.call('/api/ops/rewards/' + r.id, { action: 'cancel' }, false)).httpStatus, 409);
    await update(b, { refund_amount: 250, reason: 'Full refund' });
    assert.equal(await bal(), 0);
  });

  await test('Recovery URL targets Customer origin, expires and single-use reset invalidates all sessions', async () => {
    let rec = await owner.call('/api/ops/recovery', { user_id: user.id, observed_phone: user.phone, checked: true });
    assert.ok(rec.reset_url.includes('/ar/reset#'), 'Recovery URL must target customer reset flow');
    app.db.prepare('UPDATE recovery SET expires=0').run();
    assert.equal((await c.call('/api/reset', { token: rec.token, password: 'ResetPassword!2026' }, false)).httpStatus, 400);
    rec = await owner.call('/api/ops/recovery', { user_id: user.id, observed_phone: user.phone, checked: true });
    await c.call('/api/reset', { token: rec.token, password: 'ResetPassword!2026' });
    assert.equal((await c.call('/api/session')).user, null);
    assert.equal((await c.call('/api/reset', { token: rec.token, password: 'ResetPassword!2026' }, false)).httpStatus, 400);
    await c.call('/api/login', { phone: user.phone, password: 'ResetPassword!2026' });
  });

  await test('Malformed schedule settings rejected without saving', async () => {
    for (const settings of [
      { capacity: -1 },
      { areas: 'all' },
      { points_per_sar: -1 },
      { working_days: [9] },
      { opening_time: '25:00' },
      { rewards: [{ id: 'bad', points: -2, value: 10 }] },
    ]) {
      assert.ok((await owner.call('/api/ops/settings', { settings }, false)).httpStatus >= 400);
    }
    assert.equal((await owner.call('/api/ops/dashboard')).settings.capacity, 2);
  });

  console.log(`${checks} financial and ledger checks passed.`);
} finally {
  await app.close();
}
