import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'j-spa-stress-'));
const CPORT = 3588;
const OPORT = 3688;
const CBASE = `http://127.0.0.1:${CPORT}`;
const OBASE = `http://127.0.0.1:${OPORT}`;

const env = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: String(CPORT),
  OPS_PORT: String(OPORT),
  CUSTOMER_ORIGIN: CBASE,
  OPS_ORIGIN: OBASE,
  DB_PATH: join(dir, 'stress.sqlite'),
  OPS_MFA_REQUIRED: 'off',
  OWNER_NAME: 'Stress Owner',
  OWNER_PHONE: '0500000001',
  OWNER_PASSWORD: 'OwnerTestPassword!2026',
  TEST_RATE_LIMIT_MULTIPLIER: '500',
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
  capture(res) {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      if (i > 0) this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }
  async req(path, body) {
    const headers = { Origin: this.base };
    if (this.cookies.size) headers.Cookie = [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      if (this.csrf) headers['X-CSRF-Token'] = this.csrf;
    }
    const res = await fetch(`${this.base}${path}`, {
      method: body !== undefined ? 'POST' : 'GET',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    this.capture(res);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    if (json?.csrfToken) this.csrf = json.csrfToken;
    return { status: res.status, json, text, bytes: text.length };
  }
}

try {
  await waitUp(`${CBASE}/api/session`);
  await waitUp(`${OBASE}/api/ops/session`);

  const owner = new Client(OBASE);
  await owner.req('/api/ops/session');
  const login = await owner.req('/api/ops/login', {
    phone: env.OWNER_PHONE,
    password: env.OWNER_PASSWORD,
  });
  assert.equal(login.status, 200);
  await owner.req('/api/ops/settings', {
    settings: { working_days: [0, 1, 2, 3, 4, 5, 6], opening_time: '08:00', closing_time: '23:00', lead_hours: 1 },
  });

  const serviceDate = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);

  // TEST 1: 300 concurrent reads across public catalog, SSR pages, reviews, ops dashboard
  console.log('Running Test 1: 300 concurrent read & SSR requests...');
  const t0 = Date.now();
  const readUrls = [
    `${CBASE}/api/catalog`,
    `${CBASE}/api/session`,
    `${CBASE}/ar`,
    `${CBASE}/ar/services`,
    `${CBASE}/ar/gifts`,
    `${CBASE}/ar/atelier`,
  ];
  const readResults = await Promise.all(
    Array.from({ length: 300 }, (_, i) =>
      fetch(readUrls[i % readUrls.length]).then((r) => ({ status: r.status })),
    ),
  );
  const readMs = Date.now() - t0;
  const read500s = readResults.filter((r) => r.status >= 500).length;
  const read200s = readResults.filter((r) => r.status === 200).length;
  assert.equal(read500s, 0, 'Got 5xx under 300 concurrent reads');
  assert.equal(read200s, 300, `Expected 300 HTTP 200s, got ${read200s}`);
  console.log(`PASS [STRESS-1] 300 concurrent reads succeeded in ${readMs}ms (0 5xx errors)`);

  // TEST 2: Atomic Race Condition Attack — 25 simultaneous bookings using the SAME single-use Gift Card!
  console.log('Running Test 2: 25-way concurrent Gift Card double-spend race attack...');
  const sender = new Client(CBASE);
  await sender.req('/api/session');
  const giftRes = await sender.req('/api/gift-requests', {
    sender_name: 'مها',
    sender_phone: '0502222221',
    recipient_name: 'سلمى',
    personal_message: 'اختبار ضغط',
    service_id: 'relaxation',
    terms: true,
  });
  assert.ok([200, 201].includes(giftRes.status), `Gift create failed: ${giftRes.status}`);
  // Approve gift card via Ops so it becomes approved_ready for redemption
  const approveRes = await owner.req(`/api/ops/gift-requests/${giftRes.json.gift_request.id}`, {
    status: 'approved_ready',
    payment_verified: true,
  });
  assert.equal(approveRes.status, 200, `Gift approval failed: ${approveRes.status} ${JSON.stringify(approveRes.json)}`);
  const raceGiftCode = giftRes.json.gift_request.gift_code;

  const giftAttackers = await Promise.all(
    Array.from({ length: 25 }, async () => {
      const c = new Client(CBASE);
      await c.req('/api/session');
      return c;
    }),
  );

  const giftRaceResults = await Promise.all(
    giftAttackers.map((c, i) =>
      c.req('/api/bookings', {
        name: `مهاجم هدية ${i}`,
        phone: `05033300${String(i).padStart(2, '0')}`,
        neighborhood: 'العزيزية',
        address: `شقة ${i}`,
        date: serviceDate,
        time: `${String(14 + (i % 7)).padStart(2, '0')}:00`,
        service_ids: ['relaxation'],
        coupon_code: raceGiftCode,
        terms: true,
      }),
    ),
  );
  const giftWinners = giftRaceResults.filter((r) => [200, 201].includes(r.status)).length;
  const gift500s = giftRaceResults.filter((r) => r.status >= 500).length;
  assert.equal(gift500s, 0, 'Got 5xx during gift race attack');
  assert.equal(giftWinners, 1, `RACE CONDITION BUG: ${giftWinners} bookings redeemed the same single-use gift card!`);
  console.log(`PASS [STRESS-2] 25-way Gift Card race: strictly 1 winner, 24 cleanly rejected, 0 5xx`);

  // TEST 3: Atomic Race Condition Attack — 25 simultaneous bookings by SAME phone using SAME single-use Coupon!
  console.log('Running Test 3: 25-way concurrent Single-Use Coupon race attack...');
  const couponAttackers = await Promise.all(
    Array.from({ length: 25 }, async () => {
      const c = new Client(CBASE);
      await c.req('/api/session');
      return c;
    }),
  );
  const couponRaceResults = await Promise.all(
    couponAttackers.map((c, i) =>
      c.req('/api/bookings', {
        name: `عميلة متسابقة ${i}`,
        phone: '0504444444',
        neighborhood: 'العزيزية',
        address: `فيلا ${i}`,
        date: serviceDate,
        time: `${String(14 + (i % 7)).padStart(2, '0')}:30`,
        service_ids: ['relaxation'],
        coupon_code: 'JB10',
        terms: true,
      }),
    ),
  );
  const couponWinners = couponRaceResults.filter((r) => [200, 201].includes(r.status)).length;
  const coupon500s = couponRaceResults.filter((r) => r.status >= 500).length;
  assert.equal(coupon500s, 0, 'Got 5xx during coupon race attack');
  assert.equal(couponWinners, 1, `RACE CONDITION BUG: ${couponWinners} bookings used JB10 with same phone!`);
  console.log(`PASS [STRESS-3] 25-way Single-Use Coupon race: strictly 1 winner, 24 cleanly rejected, 0 5xx`);

  // TEST 4: 150 concurrent mixed writes + PDF Invoice binary renders + Ops dashboard polling
  console.log('Running Test 4: 150 concurrent mixed bookings + PDF invoice renders + Ops dashboard queries...');
  const sampleWinner = giftRaceResults.find((r) => [200, 201].includes(r.status)).json.booking;
  const t1 = Date.now();
  const mixedClients = await Promise.all(
    Array.from({ length: 50 }, async () => {
      const c = new Client(CBASE);
      await c.req('/api/session');
      return c;
    }),
  );

  const mixedTasks = [
    ...mixedClients.map((c, i) =>
      c.req('/api/bookings', {
        name: `ضغط ${i}`,
        phone: `050555${String(1000 + i).slice(0, 4)}`,
        neighborhood: 'شوران',
        address: `موقع ${i}`,
        date: serviceDate,
        time: `${String(14 + (i % 8)).padStart(2, '0')}:00`,
        service_ids: ['classic'],
        terms: true,
      }),
    ),
    ...Array.from({ length: 60 }, () =>
      fetch(`${CBASE}${sampleWinner.invoice_pdf_url}`).then(async (r) => ({
        status: r.status,
        okPdf: (await r.text()).startsWith('%PDF-1.4'),
      })),
    ),
    ...Array.from({ length: 40 }, () => owner.req('/api/ops/dashboard?bookings_page=1&bookings_limit=20')),
  ];

  const mixedRes = await Promise.all(mixedTasks);
  const mixedMs = Date.now() - t1;
  const mixed500s = mixedRes.filter((r) => r.status >= 500).length;
  const mixedOk = mixedRes.filter((r) => [200, 201].includes(r.status)).length;
  assert.equal(mixed500s, 0, 'Got 5xx during 150 concurrent mixed writes/PDF/Ops');
  assert.equal(mixedOk, 150, `Expected 150 HTTP 200s, got ${mixedOk}`);
  console.log(`PASS [STRESS-4] 150 concurrent mixed writes + PDF generation + Ops polling completed in ${mixedMs}ms (0 errors)`);

  console.log('\nALL EXTREME STRESS TESTS (500+ CONCURRENT REQUESTS + ATOMIC RACE ATTACKS) PASSED WITH ZERO 5XX ERRORS!');
} catch (err) {
  console.error('\nSTRESS TEST FAILED:', err);
  console.error('Server logs:\n', logs.slice(-2000));
  process.exitCode = 1;
} finally {
  server.kill();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
}
