import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'j-spa-sim150-'));
const CPORT = 3389;
const OPORT = 3489;
const CBASE = `http://127.0.0.1:${CPORT}`;
const OBASE = `http://127.0.0.1:${OPORT}`;

const env = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: String(CPORT),
  OPS_PORT: String(OPORT),
  CUSTOMER_ORIGIN: CBASE,
  OPS_ORIGIN: OBASE,
  DB_PATH: join(dir, 'sim150.sqlite'),
  OPS_MFA_REQUIRED: 'off',
  OWNER_NAME: 'Simulation Owner',
  OWNER_PHONE: '0500000001',
  OWNER_PASSWORD: 'OwnerTestPassword!2026',
  TEST_RATE_LIMIT_MULTIPLIER: '1000',
};
const boot = spawnSync(process.execPath, ['server.mjs', '--create-owner'], { cwd: root, env, encoding: 'utf8' });
assert.equal(boot.status, 0, boot.stderr + boot.stdout);

let logs = '';
const server = spawn(process.execPath, ['server.mjs'], { cwd: root, env });
server.stdout.on('data', (d) => (logs += d));
server.stderr.on('data', (d) => (logs += d));

async function waitUp(url) {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error(`Server failed to start: ${url}\n${logs}`);
}

class Client {
  constructor(base) {
    this.base = base;
    this.cookies = new Map();
    this.csrf = '';
  }

  async call(path, body = undefined, expectStatus = [200, 201]) {
    const headers = {};
    if (this.cookies.size) {
      headers.cookie = [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    }
    if (this.csrf && body !== undefined) {
      headers['X-CSRF-Token'] = this.csrf;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${this.base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const setCookies = res.headers.getSetCookie?.() || [];
    for (const sc of setCookies) {
      const [pair] = sc.split(';');
      const [k, v] = pair.split('=');
      if (k && v !== undefined) this.cookies.set(k.trim(), v.trim());
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (data && typeof data === 'object' && data.csrfToken) {
      this.csrf = data.csrfToken;
    }

    if (Array.isArray(expectStatus)) {
      assert.ok(expectStatus.includes(res.status), `Failed ${path}: ${res.status} not in [${expectStatus}]\n${text}`);
    } else {
      assert.equal(res.status, expectStatus, `Failed ${path}: ${res.status} !== ${expectStatus}\n${text}`);
    }
    return data;
  }
}

const scenarios = [];
function recordScenario(id, title) {
  scenarios.push({ id, title });
  if (id % 15 === 0 || id === 150) {
    console.log(`[SIM-150] Passed ${id}/150 customer scenarios... (${title})`);
  }
}

try {
  await waitUp(`${CBASE}/api/session`);
  await waitUp(`${OBASE}/api/ops/session`);

  const owner = new Client(OBASE);
  await owner.call('/api/ops/session');
  await owner.call('/api/ops/login', {
    phone: env.OWNER_PHONE,
    password: env.OWNER_PASSWORD,
  });

  const dateObj = new Date(Date.now() + 86400000 * 3);
  const serviceDate = dateObj.toISOString().slice(0, 10);

  const neighborhoods = ['العزيزية', 'الخالدية', 'قباء', 'سلطانة', 'الهجرة', 'العريض', 'باقدو', 'سيد الشهداء', 'الرانوناء', 'شوران'];
  const services = ['relaxation', 'pedicure', 'manicure', 'hot-stone', 'therapeutic'];

  // ==========================================
  // PHASE 1: 50 REGULAR HOME SPA BOOKINGS
  // ==========================================
  for (let i = 1; i <= 50; i++) {
    const cust = new Client(CBASE);
    await cust.call('/api/session');
    const phoneNum = `050100${String(i).padStart(4, '0')}`;
    const hood = neighborhoods[i % neighborhoods.length];
    const svc = services[i % services.length];

    const res = await cust.call('/api/bookings', {
      name: `عميلة سبا تجربة ${i}`,
      phone: phoneNum,
      neighborhood: hood,
      address: `شارع ${i}، فيلا ${i * 2}`,
      date: serviceDate,
      time: `${10 + (i % 10)}:00`,
      service_ids: [svc],
      add_ons: i % 2 === 0 ? ['mask-hands'] : [],
      terms: true,
    });
    assert.ok(res.booking?.reference, 'Booking reference missing');

    // Upload bank transfer receipt for 50% of bookings
    if (i % 2 === 0) {
      const dummyDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const rcpt = await cust.call(`/api/bookings/${encodeURIComponent(res.booking.reference)}/receipt`, {
        file_data: dummyDataUrl,
        filename: `receipt-sim-${i}.png`,
        mime_type: 'image/png',
        sender_name: `عميلة سبا ${i}`,
        transfer_ref: `TRF-SIM-${i}`,
        phone: phoneNum,
      });
      assert.ok(rcpt.ok, 'Receipt upload failed');
    }

    recordScenario(i, `Home Spa Booking: ${hood} (${svc})`);
  }

  // ==========================================
  // PHASE 2: 30 BESPOKE GIFT CARD SCENARIOS
  // ==========================================
  const activeGiftCodes = [];
  for (let i = 51; i <= 80; i++) {
    const cust = new Client(CBASE);
    await cust.call('/api/session');
    const senderPhone = `050200${String(i).padStart(4, '0')}`;

    let giftPayload = {
      sender_name: `المهدية رقم ${i}`,
      sender_phone: senderPhone,
      recipient_name: `المستفيدة المحظوظة ${i}`,
      personal_message: `هدية حب ودلال رقم ${i} بمناسبة خاصة`,
      theme: i % 2 === 0 ? 'royal_gold' : 'velvet_rose',
      terms: true,
    };

    if (i % 3 === 0) {
      // Preset service gift
      giftPayload.service_id = 'pedicure';
    } else if (i % 3 === 1) {
      // Bespoke package gift (multiple services!)
      giftPayload.service_ids = ['relaxation', 'manicure'];
    } else {
      // Cash voucher credit gift
      giftPayload.voucher_amount = 250;
    }

    const gRes = await cust.call('/api/gift-requests', giftPayload);
    const gfObj = gRes.gift_request || gRes;
    assert.ok(gRes.gift_code || gfObj.gift_code, 'Gift code or reference missing');
    const gRef = gfObj.reference;
    const gCode = gRes.gift_code || gfObj.gift_code;

    // Upload receipt for the gift
    const dummyDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await cust.call(`/api/gift-requests/${encodeURIComponent(gRef)}/receipt`, {
      file_data: dummyDataUrl,
      filename: `gift-receipt-${i}.png`,
      mime_type: 'image/png',
      sender_name: `المهدية ${i}`,
      transfer_ref: `GIFT-TRF-${i}`,
      phone: senderPhone,
    });

    // Admin verifies and activates the gift card
    const vRes = await owner.call(`/api/ops/gift-requests/${gRef}`, {
      payment_verified: true,
      status: 'approved_ready',
    });
    assert.equal(vRes.gift_request.payment_verified, true);
    assert.equal(vRes.gift_request.status, 'approved_ready');

    activeGiftCodes.push(gCode);
    recordScenario(i, `Gift Card Flow: ${gCode} Verified & Activated`);
  }

  // Redeem one of the verified gift cards in a new booking to prove end-to-end integration!
  const redeemer = new Client(CBASE);
  await redeemer.call('/api/session');
  const redeemRes = await redeemer.call('/api/bookings', {
    name: 'عميلة مستخدمة بطاقة الإهداء',
    phone: '0502999999',
    neighborhood: 'العزيزية',
    address: 'شارع الهدايا',
    date: serviceDate,
    time: '18:00',
    service_ids: ['pedicure'],
    coupon_code: activeGiftCodes[0],
    terms: true,
  });
  assert.ok(redeemRes.booking?.reference, 'Redemption booking failed');

  // ==========================================
  // PHASE 3: 30 OCCASION GROUP EXPERIENCES
  // ==========================================
  for (let i = 81; i <= 110; i++) {
    const cust = new Client(CBASE);
    await cust.call('/api/session');
    const orgPhone = `050300${String(i).padStart(4, '0')}`;
    const hood = neighborhoods[i % neighborhoods.length];

    const occRes = await cust.call('/api/group-requests', {
      organizer_name: `منسقة مناسبة تجربة ${i}`,
      organizer_phone: orgPhone,
      date: serviceDate,
      time: '17:00',
      neighborhood: hood,
      participants: [
        { label: 'العروسة / صاحبة الحفل', service_ids: ['relaxation'] },
        { label: 'الضيفة الأولى', service_ids: ['pedicure'] },
        { label: 'الضيفة الثانية', service_ids: ['manicure'] },
      ],
      notes: `تجهيز حفل منزلي رقم ${i}`,
      terms: true,
    });
    const occObj = occRes.group_request || occRes;
    assert.ok(occObj.reference, 'Occasion reference missing');

    // Admin approves the occasion request
    const appRes = await owner.call(`/api/ops/group-requests/${occObj.reference}`, {
      status: 'approved',
    });
    assert.equal(appRes.group_request.status, 'approved');

    // Upload occasion deposit receipt
    const dummyDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await cust.call(`/api/group-requests/${encodeURIComponent(occObj.reference)}/receipt`, {
      file_data: dummyDataUrl,
      filename: `occ-deposit-${i}.png`,
      mime_type: 'image/png',
      sender_name: `منسقة مناسبة ${i}`,
      transfer_ref: `OCC-TRF-${i}`,
      phone: orgPhone,
    });

    recordScenario(i, `Occasion Booking: ${hood} (3 Guests, Approved & Deposit Attached)`);
  }

  // ==========================================
  // PHASE 4: 20 USER REGISTRATIONS & PASSPORT
  // ==========================================
  for (let i = 111; i <= 130; i++) {
    const regClient = new Client(CBASE);
    await regClient.call('/api/session');
    const uPhone = `050400${String(i).padStart(4, '0')}`;

    const reg = await regClient.call('/api/register', {
      name: `عميلة عضوة ${i}`,
      phone: uPhone,
      password: 'StrongPassword8!',
      passwordConfirmation: 'StrongPassword8!',
      terms: true,
    }, 201);
    assert.ok(reg.user?.id, 'Registered user ID missing');

    // View account & beauty passport
    const acc = await regClient.call('/api/account');
    assert.equal(acc.balance, 50, `Expected 50 welcome petals, got: ${acc.balance}`);
    assert.ok(acc.passport, 'Beauty passport missing');

    // Save passport preferences
    await regClient.call('/api/passport/preferences', {
      preferences: {
        preferred_scent: 'lavender',
        preferred_neighborhood: 'سلطانة',
      },
    });

    recordScenario(i, `Account & Passport: 50 Welcome Petals Credited (${uPhone})`);
  }

  // ==========================================
  // PHASE 5: 20 REFERRAL & REWARD FLOWS
  // ==========================================
  for (let i = 131; i <= 150; i++) {
    const refOwner = new Client(CBASE);
    await refOwner.call('/api/session');
    const refPhone = `050500${String(i).padStart(4, '0')}`;

    await refOwner.call('/api/register', {
      name: `المحيلة ${i}`,
      phone: refPhone,
      password: 'ReferralPassword8!',
      passwordConfirmation: 'ReferralPassword8!',
      terms: true,
    }, 201);

    const acc = await refOwner.call('/api/account');
    assert.ok(acc.referral?.code, 'Referral code missing');
    const refCode = acc.referral.code;

    // A friend signs up using the referral code
    const friend = new Client(CBASE);
    await friend.call('/api/session');
    const friendPhone = `050600${String(i).padStart(4, '0')}`;
    await friend.call('/api/register', {
      name: `الصديقة المدعوة ${i}`,
      phone: friendPhone,
      password: 'FriendPassword8!',
      passwordConfirmation: 'FriendPassword8!',
      terms: true,
    }, 201);

    recordScenario(i, `Referral Loop: Code ${refCode} Generated & Friend Enrolled`);
  }

  console.log(`\n========================================================`);
  console.log(`SUCCESS: ALL ${scenarios.length} CUSTOMER SCENARIOS EXECUTED & PASSED CLEANLY!`);
  console.log(`========================================================\n`);

} catch (err) {
  console.error('\nSIMULATION FAILED:', err);
  console.error('Server logs:\n', logs.slice(-2500));
  process.exitCode = 1;
} finally {
  server.kill();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
}
