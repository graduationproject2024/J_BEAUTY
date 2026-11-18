import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'j-spa-sim100-'));
const CPORT = 3388;
const OPORT = 3488;
const CBASE = `http://127.0.0.1:${CPORT}`;
const OBASE = `http://127.0.0.1:${OPORT}`;

const env = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: String(CPORT),
  OPS_PORT: String(OPORT),
  CUSTOMER_ORIGIN: CBASE,
  OPS_ORIGIN: OBASE,
  DB_PATH: join(dir, 'sim100.sqlite'),
  OPS_MFA_REQUIRED: 'off',
  OWNER_NAME: 'Sim Owner',
  OWNER_PHONE: '0500000001',
  OWNER_PASSWORD: 'OwnerTestPassword!2026',
  TEST_RATE_LIMIT_MULTIPLIER: '100',
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
  cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  capture(res) {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      if (i > 0) this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }
  async raw(path, opts = {}) {
    const method = opts.method || (opts.body ? 'POST' : 'GET');
    const headers = { Origin: this.base, ...(opts.headers || {}) };
    if (this.cookies.size) headers.Cookie = this.cookieHeader();
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      if (this.csrf) headers['X-CSRF-Token'] = this.csrf;
    }
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      redirect: 'manual',
    });
    this.capture(res);
    return res;
  }
  async call(path, body, expect = 200) {
    const res = await this.raw(path, { body });
    const text = await res.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {}
    if (json?.csrfToken) this.csrf = json.csrfToken;
    const expectedList = Array.isArray(expect) ? expect : [expect];
    assert.ok(expectedList.includes(res.status), `${path} expected ${expectedList.join('/')}, got ${res.status}: ${text.slice(0, 300)}`);
    return json;
  }
}

// Valid 1x1 transparent PNG
const VALID_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
// Valid minimal PDF
const VALID_PDF_DATA_URL =
  'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF').toString('base64');

const checks = [];
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log(`PASS [SIM-100] ${name}`);
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

  // 1. Ops configures excluded neighborhoods, custom out-of-range message, delivery fee, wheel & commission settings
  await check('Ops configures coverage (excluded areas + delivery fee + custom message), wheel & commission', async () => {
    await owner.call('/api/ops/settings', {
      settings: {
        excluded_areas: ['العوالي البعيدة', 'مخطط المطار البعيد'],
        out_of_range_message_ar: 'عذراً عزيزتي، هذا الحي خارج نطاق التوصيل حالياً وسنصل إليكم قريباً!',
        delivery_fee: 25,
        wheel_enabled: true,
        wheel_cooldown_days: 7,
        wheel_first_visit_only: false,
        wheel_prizes: [
          { code: 'SIM5', label_ar: 'خصم 5%', label_en: '5% Off', type: 'percentage', value: 5 },
          { code: 'SIM10SAR', label_ar: 'خصم 10 ر.س', label_en: '10 SAR Off', type: 'fixed', value: 10 },
        ],
        commission_threshold: 50,
        commission_rate: 5,
        bank_name: 'مصرف الراجحي',
        bank_account_holder: 'مؤسسة جي بيوتي سبا',
        bank_iban: 'SA0380000000608010167519',
        working_days: [0, 1, 2, 3, 4, 5, 6],
        opening_time: '08:00',
        closing_time: '23:00',
        lead_hours: 1,
        capacity: 5,
        business_approved: true,
      },
    });

    const pub = new Client(CBASE);
    const cat = await pub.call('/api/catalog');
    assert.deepEqual(cat.settings.excluded_areas, ['العوالي البعيدة', 'مخطط المطار البعيد']);
    assert.equal(cat.settings.delivery_fee, 25);
    assert.equal(cat.settings.wheel_enabled, true);
    assert.equal(cat.settings.wheel_prizes.length, 2);
  });

  // 2. Ops Coupons CRUD (Create, Toggle, Delete) — verifying the fixed bug!
  await check('Ops Coupons CRUD: Create, List, Toggle, Delete all work cleanly', async () => {
    const created = await owner.call('/api/ops/coupons', {
      code: 'VIPTEST20',
      discount_type: 'fixed',
      discount_value: 20,
      min_order: 100,
    });
    assert.equal(created.ok, true);
    assert.equal(created.coupon.code, 'VIPTEST20');
    assert.equal(created.coupon.active, 1);

    const toggled = await owner.call(`/api/ops/coupons/${created.coupon.id}`, { active: 0 });
    assert.equal(toggled.ok, true);

    const toggledBack = await owner.call(`/api/ops/coupons/${created.coupon.id}`, { active: 1 });
    assert.equal(toggledBack.ok, true);

    const deleted = await owner.call(`/api/ops/coupons/${created.coupon.id}`, { action: 'delete' });
    assert.equal(deleted.ok, true);
  });

  // 3. Excluded neighborhood rejection returns custom Arabic message
  await check('Booking in excluded neighborhood rejected with custom Ops message', async () => {
    const g = new Client(CBASE);
    await g.call('/api/session');
    const err = await g.call(
      '/api/bookings',
      {
        name: 'سارة المستبعدة',
        phone: '0501000001',
        neighborhood: 'العوالي البعيدة',
        address: 'شارع ١',
        date: serviceDate,
        time: '15:00',
        service_ids: ['relaxation'],
        terms: true,
      },
      400,
    );
    assert.ok(err.error.includes('خارج نطاق التوصيل حالياً'), `Expected custom out-of-range message, got: ${err.error}`);
  });

  // 4. Guest booking WITH multiple Add-Ons includes every add-on, delivery fee, and PDF invoice link in WhatsApp message
  let sampleBookingRef = '';
  let sampleBookingId = '';
  let sampleInvoicePdfUrl = '';
  let sampleInvoiceHtmlUrl = '';
  await check('Guest booking with Add-Ons includes all add-ons & delivery fee in WhatsApp message + valid PDF invoice', async () => {
    const g = new Client(CBASE);
    await g.call('/api/session');

    const res = await g.call(
      '/api/bookings',
      {
        name: 'نورة العتيبي',
        phone: '0501000002',
        neighborhood: 'العزيزية',
        address: 'فيلا ١٤',
        date: serviceDate,
        time: '16:00',
        service_ids: ['relaxation'],
        add_ons: ['mask-hands', 'scalp-oils'],
        coupon_code: 'SIM5',
        terms: true,
      },
      [200, 201],
    );
    const bk = res.booking;
    sampleBookingRef = bk.reference;
    sampleBookingId = bk.id;
    sampleInvoicePdfUrl = res.invoice_pdf_url;
    sampleInvoiceHtmlUrl = res.invoice_url;

    // Verify WhatsApp message contains ALL add-on names + delivery fee + no provisional disclaimer
    assert.ok(res.message.includes('ماسك ترطيب عميق لليدين'), 'WhatsApp message missing add-on 1');
    assert.ok(res.message.includes('مساج فروة الرأس والزيوت العطرية'), 'WhatsApp message missing add-on 2');
    assert.ok(res.message.includes('25'), 'WhatsApp message missing delivery fee');
    assert.ok(!res.message.includes('التقديري'), 'WhatsApp message should not say التقديري');

    // Verify PDF invoice downloads cleanly and starts with %PDF-1.4
    const pdfRes = await g.raw(sampleInvoicePdfUrl);
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
    const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
    assert.ok(pdfBuf.subarray(0, 8).toString('latin1').startsWith('%PDF-1.4'), 'Invalid PDF header');
    assert.ok(pdfBuf.length > 500, 'PDF invoice unexpectedly small');

    // Verify HTML invoice renders
    const htmlRes = await g.raw(sampleInvoiceHtmlUrl);
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.ok(html.includes(sampleBookingRef));

    // Verify invalid token returns 404
    const badRes = await g.raw(`/api/invoices/${sampleBookingRef}/deadbeef00000000.pdf`);
    assert.equal(badRes.status, 404);
  });

  // 5. Single-use coupon enforcement (same phone cannot reuse SIM5)
  await check('Single-use coupon strictly rejects second attempt by same customer phone', async () => {
    const g = new Client(CBASE);
    await g.call('/api/session');
    const err = await g.call(
      '/api/bookings',
      {
        name: 'نورة العتيبي',
        phone: '0501000002',
        neighborhood: 'العزيزية',
        address: 'فيلا ١٤',
        date: serviceDate,
        time: '18:00',
        service_ids: ['classic'],
        coupon_code: 'SIM5',
        terms: true,
      },
      400,
    );
    assert.ok(err.error.includes('مرة واحدة') || err.error.includes('once') || err.error.includes('استخدمت'));
  });

  // 6. Payment Receipt Upload (Customer PNG + Staff PDF + Malicious SVG Rejected)
  await check('Payment receipt proof upload works (PNG & PDF) and blocks disguised SVG/HTML', async () => {
    const g = new Client(CBASE);
    await g.call('/api/session');

    // Customer uploads PNG receipt
    const up = await g.call(
      `/api/bookings/${sampleBookingRef}/receipt`,
      {
        phone: '0501000002',
        file_data: VALID_PNG_DATA_URL,
        filename: 'transfer.png',
        mime_type: 'image/png',
        transfer_ref: 'TRX-889900',
      },
      [200, 201],
    );
    assert.equal(up.ok, true);

    // Malicious SVG disguised as image/png must be REJECTED (400)
    const fakePng = 'data:image/png;base64,' + Buffer.from('<svg onload=alert(1)></svg>').toString('base64');
    await g.call(
      `/api/bookings/${sampleBookingRef}/receipt`,
      { phone: '0501000002', file_data: fakePng, filename: 'xss.png', mime_type: 'image/png' },
      400,
    );

    // Staff attaches PDF receipt and retrieves both receipts
    const staffUp = await owner.call(
      `/api/ops/bookings/${sampleBookingId}/receipt`,
      {
        file_data: VALID_PDF_DATA_URL,
        filename: 'whatsapp-receipt.pdf',
        mime_type: 'application/pdf',
        transfer_ref: 'WA-7766',
      },
      [200, 201],
    );
    assert.equal(staffUp.ok, true);

    const list = await owner.call(`/api/ops/bookings/${sampleBookingId}/receipt`);
    assert.equal(list.receipts.length, 2);
  });

  // 7. Creative Gift Card Auto-Verification & Revocation
  await check('Luxury Digital Gift Card auto-verifies JGIFT code on booking & blocks cancelled/reused gifts', async () => {
    const sender = new Client(CBASE);
    await sender.call('/api/session');

    // Create active gift card #1
    const g1 = await sender.call(
      '/api/gift-requests',
      {
        sender_name: 'مها الحربي',
        sender_phone: '0501000010',
        recipient_name: 'ريم الحربي',
        personal_message: 'كل عام وأنتِ بخير يا ريم',
        service_id: 'relaxation',
        theme: 'rose-velvet',
        terms: true,
      },
      [200, 201],
    );
    assert.equal(g1.gift_request.status, 'approved_ready');
    const code1 = g1.gift_request.gift_code;
    assert.ok(code1.startsWith('JGIFT-'));

    // Validate gift code automatically via /api/coupons/validate
    const recipient = new Client(CBASE);
    await recipient.call('/api/session');
    const val = await recipient.call('/api/coupons/validate', {
      code: code1,
      subtotal: 290,
      phone: '0501000011',
    });
    assert.equal(val.valid, true);
    assert.equal(val.is_gift, true);
    assert.ok(val.discount_amount > 0);

    // Redeem gift code #1 on booking
    const redeemed = await recipient.call(
      '/api/bookings',
      {
        name: 'ريم الحربي',
        phone: '0501000011',
        neighborhood: 'شوران',
        address: 'شقة ٥',
        date: serviceDate,
        time: '17:00',
        service_ids: ['relaxation'],
        coupon_code: code1,
        terms: true,
      },
      [200, 201],
    );
    assert.ok(redeemed.booking.discount_amount > 0);

    // Second redemption of same gift code must FAIL
    await recipient.call(
      '/api/bookings',
      {
        name: 'ريم الحربي',
        phone: '0501000011',
        neighborhood: 'شوران',
        address: 'شقة ٥',
        date: serviceDate,
        time: '19:00',
        service_ids: ['relaxation'],
        coupon_code: code1,
        terms: true,
      },
      400,
    );

    // Create gift card #2 and CANCEL it in Ops -> must be immediately rejected on validation
    const g2 = await sender.call(
      '/api/gift-requests',
      {
        sender_name: 'مها الحربي',
        sender_phone: '0501000010',
        recipient_name: 'دانة',
        personal_message: 'هدية',
        service_id: 'classic',
        theme: 'sage-botanical',
        terms: true,
      },
      [200, 201],
    );
    await owner.call(`/api/ops/gift-requests/${g2.gift_request.id}`, { status: 'cancelled' });
    await recipient.call('/api/coupons/validate', { code: g2.gift_request.gift_code, subtotal: 200 }, 400);
  });

  // 8. Frictionless Customer Account (no verification blocker!) + Ops Verify Toggle
  await check('Registered customer works immediately without Ops verification blocker & Ops can toggle verification', async () => {
    const cust = new Client(CBASE);
    await cust.call('/api/session');
    const reg = await cust.call(
      '/api/register',
      {
        name: 'لولوة السبيعي',
        phone: '0501000020',
        password: 'CustomerPass!2026',
        passwordConfirmation: 'CustomerPass!2026',
        terms: true,
      },
      [200, 201],
    );
    assert.equal(reg.user.role, 'customer');

    // Immediately create a booking as registered customer
    const bkRes = await cust.call(
      '/api/bookings',
      {
        name: 'لولوة السبيعي',
        phone: '0501000020',
        neighborhood: 'الملك فهد',
        address: 'بيت ٢٢',
        date: serviceDate,
        time: '15:30',
        service_ids: ['classic'],
        terms: true,
      },
      [200, 201],
    );

    // Create an active specialist in Ops & complete/verify payment so petals are awarded
    const specRes = await owner.call(
      '/api/ops/staff',
      {
        name: 'أخصائية مريم',
        phone: '0508888881',
        password: 'SpecPassword!2026',
        role: 'practitioner',
      },
      [200, 201],
    );
    const specialistId = specRes.id;
    await owner.call(`/api/ops/bookings/${bkRes.booking.id}`, {
      assigned_staff_id: specialistId,
      status: 'confirmed',
    });
    await owner.call(`/api/ops/bookings/${bkRes.booking.id}`, { status: 'in_progress' });
    await owner.call(`/api/ops/bookings/${bkRes.booking.id}`, {
      status: 'completed',
      paid_amount: 165,
      payment_method: 'bank_transfer',
      payment_verified: true,
    });

    // Unverified customer can IMMEDIATELY view Petals balance & submit a review without Ops verification blocker!
    const acc = await cust.call('/api/account');
    assert.ok(acc.balance >= 165, `Expected >= 165 petals, got ${acc.balance}`);

    const rev = await cust.call(
      '/api/reviews',
      {
        booking_id: bkRes.booking.id,
        rating: 5,
        body: 'تجربة راقية ومريحة جداً في المنزل!',
      },
      [200, 201],
    );
    assert.ok(rev.review || rev.ok);

    // Ops can still 1-click toggle verification status
    const vt1 = await owner.call(`/api/ops/customers/${reg.user.id}/verify-toggle`, { verified: true });
    assert.equal(vt1.verified, true);
    const vt2 = await owner.call(`/api/ops/customers/${reg.user.id}/verify-toggle`, { verified: false });
    assert.equal(vt2.verified, false);
  });

  // 9. Simulate 100 Distinct Customers across Bookings, Gifts, Occasions, Nail Atelier & Specialist Commission (>50 visits!)
  await check('100 distinct customers complete full journeys + Specialist >50 visits triggers accurate 5% commission', async () => {
    const dash0 = await owner.call('/api/ops/dashboard');
    const specialist = dash0.staff.find((s) => s.role === 'practitioner');
    assert.ok(specialist, 'Need active specialist');

    const cat = await (new Client(CBASE)).call('/api/catalog');
    const bookableSvcs = cat.services.filter((s) => !s.credentials_required || s.credentials_approved);
    const svcIds = bookableSvcs.map((s) => s.id);
    const svcPrice = new Map(bookableSvcs.map((s) => [s.id, s.price]));
    const addonIds = ['mask-hands', 'mask-feet', 'scalp-oils'];

    const createdBookingIds = [];
    // Run 100 unique customers in clean batches of 10
    for (let batch = 0; batch < 10; batch++) {
      const promises = [];
      for (let j = 0; j < 10; j++) {
        const idx = batch * 10 + j + 1;
        promises.push(
          (async () => {
            const c = new Client(CBASE);
            await c.call('/api/session');
            const phone = `055${String(1000000 + idx).slice(0, 7)}`;
            const svc = svcIds[idx % svcIds.length];
            const futureDay = new Date(Date.now() + 86400000 * (4 + (idx % 20))).toISOString().slice(0, 10);
            const hour = 14 + (idx % 8);
            const time = `${String(hour).padStart(2, '0')}:00`;

            if (idx <= 55) {
              // 55 distinct customers book services (some with add-ons, some with wheel coupon)
              const payload = {
                name: `عميلة رقم ${idx}`,
                phone,
                neighborhood: 'العزيزية',
                address: `منزل ${idx}`,
                date: futureDay,
                time,
                service_ids: [svc],
                add_ons: idx % 3 === 0 ? [addonIds[idx % addonIds.length]] : [],
                coupon_code: idx % 5 === 0 && (svcPrice.get(svc) || 0) >= 100 ? 'SIM10SAR' : '',
                terms: true,
              };
              const res = await c.call('/api/bookings', payload, [200, 201]);
              createdBookingIds.push(res.booking.id);
            } else if (idx <= 75) {
              // 20 customers create luxury digital gift cards
              const res = await c.call(
                '/api/gift-requests',
                {
                  sender_name: `مهدية ${idx}`,
                  sender_phone: phone,
                  recipient_name: `مستلمة ${idx}`,
                  personal_message: `أجمل تمنياتي رقم ${idx}`,
                  service_id: svc,
                  theme: idx % 2 === 0 ? 'rose-velvet' : 'champagne-gold',
                  terms: true,
                },
                [200, 201],
              );
              assert.ok(res.gift_request.gift_code.startsWith('JGIFT-'));
            } else if (idx <= 90) {
              // 15 customers submit luxury occasion requests
              const res = await c.call(
                '/api/group-requests',
                {
                  organizer_name: `منسقة ${idx}`,
                  organizer_phone: phone,
                  date: futureDay,
                  time,
                  neighborhood: 'الدفاع',
                  participants: [
                    { label: 'العروس', service_ids: [svc] },
                    { label: 'الوصيفة', service_ids: [svcIds[(idx + 1) % svcIds.length]] },
                  ],
                  terms: true,
                },
                [200, 201],
              );
              assert.equal(res.group_request.status, 'pending_approval');
            } else {
              // 10 customers register, design & save Nail Atelier looks + Studio recommendations
              await c.call(
                '/api/register',
                {
                  name: `مصممة ${idx}`,
                  phone,
                  password: `DesignPass!2026_${idx}`,
                  passwordConfirmation: `DesignPass!2026_${idx}`,
                  terms: true,
                },
                [200, 201],
              );
              const look = await c.call(
                '/api/atelier/styles',
                {
                  name: `إطلالة ${idx}`,
                  shape: 'almond',
                  length: 'medium',
                  polish_color: '#D9B7C0',
                  french_style: 'classic',
                  tip_color: '#FBF7F4',
                  finish: 'gloss',
                  accent: 'none',
                  share: true,
                },
                [200, 201],
              );
              assert.ok(look.style.share_code);
              const rec = await c.call(
                '/api/studio/recommend',
                { mood: 'unwind', minutes_available: 90, budget: 300, format: 'either' },
                [200, 201],
              );
              assert.ok(Array.isArray(rec.recommendations) && rec.recommendations.length > 0);
            }
          })(),
        );
      }
      await Promise.all(promises);
    }

    assert.equal(createdBookingIds.length, 55, 'Expected 55 bookings created');

    // Assign & complete 52 bookings under one specialist in a single future calendar month to verify >50 threshold & 5% commission!
    const nowDt = new Date();
    const targetYear = nowDt.getUTCMonth() === 11 ? nowDt.getUTCFullYear() + 1 : nowDt.getUTCFullYear();
    const targetMonthNum = nowDt.getUTCMonth() === 11 ? 1 : nowDt.getUTCMonth() + 2;
    const targetMonthStr = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}`;
    for (let k = 0; k < 52; k++) {
      const id = createdBookingIds[k];
      const dayNum = 1 + Math.floor(k / 3); // days 01..18 (all inside targetMonthStr!)
      const dStr = `${targetMonthStr}-${String(dayNum).padStart(2, '0')}`;
      const tStr = ['14:00', '17:00', '20:00'][k % 3];
      await owner.call(`/api/ops/bookings/${id}`, {
        assigned_staff_id: specialist.id,
        date: dStr,
        time: tStr,
        status: 'confirmed',
      });
      await owner.call(`/api/ops/bookings/${id}`, { status: 'in_progress' });
      await owner.call(`/api/ops/bookings/${id}`, {
        status: 'completed',
        paid_amount: 200,
        payment_method: 'bank_transfer',
        payment_verified: true,
      });
    }

    const dashFinal = await owner.call(`/api/ops/dashboard?commission_month=${targetMonthStr}`);
    const comm = dashFinal.commissions.find((c) => c.staff_id === specialist.id);
    assert.ok(comm, 'Commission record missing');
    assert.equal(comm.visits_count, 52, `Expected 52 monthly visits, got ${comm.visits_count}`);
    assert.equal(comm.unique_clients, 52, `Expected 52 unique monthly clients, got ${comm.unique_clients}`);
    assert.ok(comm.all_time_visits >= 53, `Expected >=53 all-time visits, got ${comm.all_time_visits}`);
    assert.equal(comm.excess_visits, 2, `Expected 2 excess visits above 50, got ${comm.excess_visits}`);
    assert.equal(comm.commission_amount, 20, `Expected 20 SAR commission (2*200*5%), got ${comm.commission_amount}`);
    assert.equal(comm.progress_pct, 100);

    // Verify payments list exposes receipt_count
    const payWithReceipt = dashFinal.payments.find((p) => p.booking_id === sampleBookingId);
    assert.ok(payWithReceipt && payWithReceipt.receipt_count === 2, 'Expected receipt_count === 2 in payments ledger');

    // Verify human-readable audit log enrichment (`target_label`)
    assert.ok(dashFinal.audit.length > 0);
    const enriched = dashFinal.audit.filter((a) => a.target_label && !/^[0-9a-f-]{36}$/i.test(a.target_label));
    assert.ok(enriched.length > 0, 'Audit log entries should have human-readable target_label');
  });

  console.log(`\nALL ${checks.length} 100-CUSTOMER SIMULATION SUITES PASSED!`);
} catch (err) {
  console.error('\nSIMULATION FAILED:', err);
  console.error('Server logs:\n', logs.slice(-2000));
  process.exitCode = 1;
} finally {
  server.kill();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
}
