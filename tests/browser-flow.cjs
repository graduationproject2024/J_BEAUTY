const { chromium } = require('playwright');
const { spawn, spawnSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');

const root = resolve(__dirname, '..');
const out = join(root, 'screenshots');
const base = 'http://127.0.0.1:3189';
const env = {
  ...process.env,
  PORT: '3189',
  DB_PATH: join(mkdtempSync(join(tmpdir(), 'jspa-browser-')), 'test.sqlite'),
  OWNER_NAME: 'Browser Test Owner',
  OWNER_PHONE: '0500000011',
  OWNER_PASSWORD: 'OwnerBrowser!2026',
};
const boot = spawnSync(process.execPath, ['server.mjs', '--create-owner'], {
  cwd: root,
  env,
  encoding: 'utf8',
});
assert.equal(boot.status, 0, boot.stderr);
const server = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
let browser;

(async () => {
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base + '/api/session');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const customerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const owner = await ownerContext.newPage();
  const customer = await customerContext.newPage();
  const guest = await guestContext.newPage();
  const errors = [];
  for (const p of [owner, customer, guest]) p.on('pageerror', (e) => errors.push(e.message));

  async function login(page, phone, password) {
    await page.goto(base + '/en/login');
    await page.locator('[name=phone]').fill(phone);
    await page.locator('[name=password]').fill(password);
    await page.locator('#auth-form button[type=submit]').click();
  }

  await login(owner, env.OWNER_PHONE, env.OWNER_PASSWORD);
  await owner.waitForURL('**/en/admin');

  async function api(page, url, data) {
    return page.evaluate(
      async ({ url, data }) => {
        const s = await (await fetch('/api/session')).json();
        const r = await fetch('/api' + url, {
          method: data === undefined ? 'GET' : 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': s.csrfToken },
          body: data === undefined ? undefined : JSON.stringify(data),
        });
        const j = await r.json();
        if (!r.ok) throw Error(JSON.stringify(j));
        return j;
      },
      { url, data },
    );
  }

  await api(owner, '/admin/settings', {
    settings: {
      business_phone: '966500000011',
      areas: ['Test district'],
      capacity: 1,
      lead_hours: 1,
      working_days: [0, 1, 2, 3, 4, 5, 6],
      opening_time: '08:00',
      closing_time: '22:00',
      business_approved: true,
    },
  });

  async function book(page, registered = false, packageBooking = false) {
    await page.goto(base + '/en/booking');
    await page.locator('#booking-form').waitFor();
    await page.locator('#booking-form button[type=submit]').click();
    await page.getByText('Please choose a service or package.').waitFor();

    if (packageBooking) {
      await page.locator('[data-booktype="packages"]').click();
      // Verify packages tab does not auto-select the first package
      const checkedCount = await page.locator('[name=package]:checked').count();
      assert.equal(checkedCount, 0, 'Packages tab must not auto-select first package');
      await page.screenshot({ path: join(out, 'booking-step1-packages-mobile.png'), fullPage: true });
      await page.locator('[name=package][value=nail-glow]').check();
    } else {
      await page.locator('[name=service][value=relaxation]').check();
    }
    await page.locator('#booking-form button[type=submit]').click();

    const targetDate = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
    await page.locator('[name=date]').fill(targetDate);
    await page.locator('[name=time]').fill(registered ? '15:00' : '12:00');
    await page.locator('[name=neighborhood]').selectOption({ label: 'Test district' });
    await page.locator('#booking-form button[type=submit]').click();

    await page.locator('[name=name]').fill(registered ? 'Browser Customer' : 'Guest Example');
    await page.locator('[name=phone]').fill(registered ? '0500000012' : '0500000013');
    await page.locator('[name=notes]').fill('Automated browser test only');
    await page.locator('#booking-form button[type=submit]').click();

    await page.locator('[name=terms]').check();
    await page.locator('#booking-form button[type=submit]').click();
    await page.getByText('Your request is saved. J SPA will review and personally confirm your appointment.').waitFor();

    const wa = await page.getByRole('link', { name: 'Open WhatsApp', exact: true }).getAttribute('href');
    assert.ok(wa.startsWith('https://wa.me/966500000011?text='));
    assert.match(decodeURIComponent(wa), /J SPA/i);
  }

  mkdirSync(out, { recursive: true });
  await book(guest, false, true);
  await guest.screenshot({ path: join(out, 'guest-booking-success-mobile.png'), fullPage: true });

  await customer.goto(base + '/en/register');
  await customer.locator('[name=name]').fill('Browser Customer');
  await customer.locator('[name=phone]').fill('0500000012');
  await customer.locator('[name=password]').fill('CustomerBrowser!2026');
  await customer.locator('[name=passwordConfirmation]').fill('CustomerBrowser!2026');
  await customer.locator('[name=terms]').check();
  await customer.locator('#auth-form button[type=submit]').click();
  await customer.waitForURL('**/en/account');

  await customer.locator('#verify-request').click();
  await customer.locator('#verification-result strong bdi').waitFor();
  const reference = await customer.locator('#verification-result strong bdi').innerText();
  const session = await api(customer, '/session');
  await api(owner, '/admin/verify', {
    user_id: session.user.id,
    reference,
    observed_phone: '0500000012',
    checked: true,
  });

  await book(customer, true, false);
  const adm = await api(owner, '/admin');
  const booking = adm.bookings.find((b) => b.user_id === session.user.id);
  assert.ok(booking);

  await owner.reload();
  await owner.locator('[data-admin-tab="bookings"]').click();
  await owner.locator('[data-admin-bfilter="all"]').click();

  for (const state of ['confirmed', 'in_progress', 'completed']) {
    const f = owner.locator(`[data-admin-form="bookings/${booking.id}"]`).first();
    if (!(await f.isVisible())) await f.locator('..').locator('..').locator('summary').click();
    await f.locator('[name=status]').selectOption(state);
    await f.locator('button[type=submit]').click();
    await owner.getByText('Saved', { exact: true }).waitFor();
    await owner.waitForTimeout(150);
  }

  const f = owner.locator(`[data-admin-form="bookings/${booking.id}"]`).first();
  if (!(await f.isVisible())) await f.locator('..').locator('..').locator('summary').click();
  await f.locator('[name=paid_amount]').fill('250');
  await f.locator('[name=payment_method]').selectOption('cash');
  await f.locator('[name=payment_verified]').check();
  await f.locator('button[type=submit]').click();
  await owner.waitForTimeout(300);

  await customer.goto(base + '/en/rewards');
  await customer.locator('.loyalty-balance-num', { hasText: '250' }).waitFor();
  await customer.screenshot({ path: join(out, 'customer-loyalty-desktop.png'), fullPage: true });

  await owner.screenshot({ path: join(out, 'admin-bookings-desktop.png'), fullPage: true });
  await owner.locator('[data-admin-tab="calendar"]').click();
  await owner.locator('#cal-date-input').fill(booking.date);
  await owner.getByText(booking.reference).first().waitFor();
  await owner.screenshot({ path: join(out, 'admin-calendar-desktop.png'), fullPage: true });

  await owner.locator('[data-admin-tab="payments"]').click();
  await owner.getByText(booking.reference).first().waitFor();
  await owner.getByText('250 SAR').first().waitFor();
  await owner.screenshot({ path: join(out, 'admin-payments-desktop.png'), fullPage: true });

  await owner.locator('[data-admin-tab="audit"]').click();
  await owner.getByText('booking.update').first().waitFor();
  await owner.screenshot({ path: join(out, 'admin-audit-desktop.png'), fullPage: true });

  assert.deepEqual(errors, []);
  writeFileSync(
    join(root, 'BROWSER-FLOW-RESULTS.json'),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        passed: [
          'Guest package booking with clean Packages tab (no auto-select), validation and WhatsApp message',
          'Customer registration and WhatsApp manual verification reference',
          'Registered service booking',
          'Staff confirmation, progress, completion and verified cash payment through UI',
          'Customer J Petals Club balance (250) displayed after verified payment',
          'Admin calendar timeline, payments field alignment, and audit log rendering verified',
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Browser workflow checks passed.');
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    server.kill();
  });
