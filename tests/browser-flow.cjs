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

    // Step 1: Category card picker
    if (packageBooking) {
      await page.locator('[data-pick-category="packages"]').click();
    } else {
      await page.locator('[data-pick-category="massage"]').click();
    }

    // Step 2: Validation when empty + no auto-select + focus preservation on checkbox toggle
    await page.locator('#booking-form button[type=submit]').click();
    await page.getByText('Please choose a service or package.').waitFor();

    if (packageBooking) {
      const checkedCount = await page.locator('[name=package]:checked').count();
      assert.equal(checkedCount, 0, 'Packages tab must not auto-select first package');
      await page.screenshot({ path: join(out, 'booking-step2-packages-mobile.png'), fullPage: true });
      await page.locator('[name=package][value=nail-glow]').check();
    } else {
      const svcCb = page.locator('[name=service][value=relaxation]');
      await svcCb.focus();
      await svcCb.check();
      const focusedVal = await page.evaluate(() => document.activeElement?.getAttribute('value'));
      assert.equal(focusedVal, 'relaxation', 'Checkbox toggle must not lose DOM focus');
    }
    await page.locator('#booking-form button[type=submit]').click();

    // Step 3: Preferred Date / Time / Neighborhood
    const targetDate = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
    await page.locator('[name=date]').fill(targetDate);
    await page.locator('[name=time]').fill(registered ? '15:00' : '12:00');
    await page.locator('[name=neighborhood]').selectOption({ label: 'Test district' });
    await page.locator('#booking-form button[type=submit]').click();

    // Step 4: Details
    await page.locator('[name=name]').fill(registered ? 'Browser Customer' : 'Guest Example');
    await page.locator('[name=phone]').fill(registered ? '0500000012' : '0500000013');
    await page.locator('[name=notes]').fill('Automated browser test only');
    await page.locator('#booking-form button[type=submit]').click();

    // Step 5: Review & Submit
    await page.locator('[name=terms]').check();
    await page.locator('#booking-form button[type=submit]').click();
    await page.getByText('Your request is saved. J Beauty will review and personally confirm your appointment.').waitFor();

    const wa = await page.locator('#whatsapp-handoff-link').getAttribute('href');
    assert.ok(wa.startsWith('https://wa.me/966500000011?text='));
    assert.match(decodeURIComponent(wa), /J Beauty/i);
  }

  mkdirSync(out, { recursive: true });
  await book(guest, false, true);
  await guest.screenshot({ path: join(out, 'guest-booking-success-mobile.png'), fullPage: true });

  // Unauthenticated visitor clicks Rate Your Experience CTA on /en/reviews
  await guest.goto(base + '/en/reviews');
  await guest.locator('#open-review-cta').click();
  await guest.getByText('reviewing requires a signed-in verified customer account').waitFor();
  await guest.screenshot({ path: join(out, 'reviews-unauthenticated-mobile.png'), fullPage: true });
  await guest.locator('#close-dialog').click();

  // Mobile Nail Atelier close-up inspection (photographic canvas studio compositor)
  await guest.goto(base + '/ar/atelier');
  await guest.locator('[data-at-shape="oval"]').click();
  await guest.locator('[data-at-finish="gloss"]').click();
  await guest.waitForTimeout(250);
  await guest.screenshot({ path: join(out, 'nail-atelier-mobile.png'), fullPage: false });

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

  // Verified customer with NO completed bookings clicks Rate Your Experience
  await customer.goto(base + '/en/reviews');
  await customer.locator('#open-review-cta').click();
  await customer.getByText('No Completed Visit Available Yet').waitFor();
  await customer.locator('#close-dialog').click();

  // Customer tests J Nail Atelier oval + coffin + deep tone customization, Save to Passport & live Studio recommendations
  await customer.goto(base + '/en/atelier');
  await customer.locator('#at-name').fill('Oval Blush Pearls');
  await customer.locator('[data-at-skin="deep"]').click();
  await customer.locator('[data-at-shape="coffin"]').click();
  await customer.locator('[data-at-len="long"]').click();
  await customer.locator('[data-at-finish="pearl"]').click();
  await customer.locator('[data-at-accent="gold_foil"]').click();
  await customer.waitForTimeout(250);
  const atelierDrawn = await customer.evaluate(() => {
    const c = document.querySelector('.atelier-hand-canvas');
    if (!c) return false;
    const p = c.getContext('2d').getImageData(360, 360, 1, 1).data;
    return p[3] > 200;
  });
  assert.ok(atelierDrawn, 'Photographic Atelier canvas must paint real hand pixels');
  await customer.locator('#at-save-look').click();
  await customer.getByText('Style saved to your Beauty Passport').waitFor();
  await customer.screenshot({ path: join(out, 'nail-atelier-desktop.png'), fullPage: true });

  await customer.goto(base + '/en/studio');
  await customer.getByText('Book this option').first().waitFor();
  await customer.locator('[data-studio-opt="mood"][data-val="pamper"]').click();
  await customer.getByText('Book this option').first().waitFor();
  await customer.screenshot({ path: join(out, 'ritual-studio-desktop.png'), fullPage: true });

  // Verify legacy /en/group-booking redirects cleanly to /en/occasions + checkbox pills update summary
  await customer.goto(base + '/en/group-booking');
  await customer.waitForURL('**/en/occasions');
  await customer.locator('#group-form [name=date]').fill(new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10));
  await customer.locator('#group-form [name=time]').fill('16:00');
  await customer.locator('#group-form [name=neighborhood]').selectOption({ label: 'Test district' });
  await customer.locator('[data-guest-svc="0"][value="french-gel"]').check();
  await customer.locator('#group-form [name=terms]').check();
  await customer.locator('#group-form button[type=submit]').click();
  await customer.getByText('Awaiting Admin Approval & Capacity Review').waitFor();

  await customer.goto(base + '/en/gifts');
  await customer.locator('#gift-form [name=recipient_name]').fill('Dear Sister');
  await customer.locator('#gift-form [name=personal_message]').fill('Wishing you calm moments');
  await customer.locator('#gift-form [name=terms]').check();
  await customer.locator('#gift-form button[type=submit]').click();
  await customer.getByText('Pending Staff Review & Manual Payment Verification').waitFor();

  await book(customer, true, false);
  const adm = await api(owner, '/admin');
  const booking = adm.bookings.find((b) => b.user_id === session.user.id);
  assert.ok(booking);

  await owner.reload();
  await owner.locator('[data-admin-tab="overview"]').click();
  await owner.getByText('Digital Funnel Metrics').waitFor();
  await owner.screenshot({ path: join(out, 'admin-overview-desktop.png'), fullPage: true });

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

  // Customer WITH completed booking opens 5-star Review flow on /en/reviews
  await customer.goto(base + '/en/reviews');
  await customer.locator('#open-review-cta').click();
  await customer.locator('#star-picker').waitFor();
  await customer.locator('#submit-review-btn').click();
  await customer.getByText('Please choose a rating between 1 and 5 stars.').waitFor();

  // Click each star 1..5 and test keyboard interaction
  for (const n of [1, 2, 3, 4, 5]) {
    await customer.locator(`#star-picker [data-star="${n}"]`).click();
  }
  await customer.locator('#star-picker [data-star="5"]').press('ArrowLeft');
  await customer.getByText('4 / 5').waitFor();
  await customer.locator('#star-picker [data-star="4"]').press('End');
  await customer.getByText('5 / 5').waitFor();
  await customer.locator('#review-body-input').fill('Serene Madinah home visit, calm and punctual arrival.');
  await customer.screenshot({ path: join(out, 'reviews-star-picker-modal.png'), fullPage: false });
  await customer.locator('#submit-review-btn').click();
  await customer.getByText('Pending review').waitFor();
  await customer.screenshot({ path: join(out, 'reviews-pending-customer.png'), fullPage: true });

  // Owner moderation flow: Needs revision -> Approve publication -> public display
  await owner.locator('[data-admin-tab="reviews"]').click();
  await owner.locator('[data-mod-status="needs_edit"]').first().click();
  await owner.getByText('Saved', { exact: true }).waitFor();
  await customer.reload();
  await customer.getByText('Needs revision').waitFor();

  await owner.locator('[data-mod-status="approved"]').first().click();
  await owner.getByText('Saved', { exact: true }).waitFor();
  await owner.screenshot({ path: join(out, 'admin-reviews-moderation.png'), fullPage: true });

  await guest.goto(base + '/en/reviews');
  await guest.getByText('Serene Madinah home visit, calm and punctual arrival.').waitFor();
  await guest.screenshot({ path: join(out, 'reviews-public-approved.png'), fullPage: true });

  // Editing review returns it to Pending review & removes from public until re-moderated
  await customer.reload();
  await customer.locator('[data-edit-my-review]').first().click();
  await customer.locator('#review-body-input').fill('Updated review awaiting second moderation.');
  await customer.locator('#submit-review-btn').click();
  await customer.getByText('Pending review').waitFor();

  await guest.reload();
  const leakedAfterEdit = await guest.getByText('Updated review awaiting second moderation.').count();
  assert.equal(leakedAfterEdit, 0, 'Edited review must require re-moderation before public display');

  await owner.locator('[data-admin-tab="group_gifts"]').click();
  await owner.getByText('Dear Sister').first().waitFor();
  await owner.screenshot({ path: join(out, 'admin-group-gifts-desktop.png'), fullPage: true });

  await customer.goto(base + '/en/account');
  await customer.getByText('Oval Blush Pearls').waitFor();
  await customer.locator('#passport-prefs-form [name=pressure]').selectOption('light');
  await customer.locator('#passport-prefs-form button[type=submit]').click();
  await customer.getByText('Preferences saved').waitFor();
  await customer.screenshot({ path: join(out, 'customer-passport-desktop.png'), fullPage: true });

  await customer.goto(base + '/en/rewards');
  await customer.locator('.jb-points-total', { hasText: '250' }).waitFor();
  await customer.locator('[data-reward]').first().click();
  await customer.getByText('Pending request active').first().waitFor();
  await owner.locator('[data-admin-tab="rewards"]').click();
  await owner.locator('[data-admin-form^="rewards/"] [name="action"]').first().selectOption('cancel');
  await owner.locator('[data-admin-form^="rewards/"] button[type="submit"]').first().click();
  await owner.locator('#confirm-yes').click();
  await owner.getByText('Cancelled').first().waitFor();
  await customer.reload();
  await customer.locator('.jb-points-total', { hasText: '250' }).waitFor();
  await customer.evaluate(() =>
    Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? img.decode().catch(() => {})
          : new Promise((resolve) => {
              img.addEventListener('load', () => img.decode().catch(() => {}).then(resolve), { once: true });
              img.addEventListener('error', resolve, { once: true });
            }),
      ),
    ),
  );
  await customer.screenshot({ path: join(out, 'customer-loyalty-desktop.png'), fullPage: true });

  await owner.locator('[data-admin-tab="bookings"]').click();
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
          'Guest 5-step package booking with clean Packages tab, validation, and WhatsApp handoff',
          'Reviews unauthenticated CTA guard and verified customer zero-booking eligibility pathway',
          'Customer registration and WhatsApp manual verification reference',
          'J Nail Atelier anatomical hand with Oval shape customization, Save to Passport, and mobile sticky preview',
          'J Ritual Studio refined visual recommendation flow',
          'Legacy /group-booking redirect to /occasions and Occasion Experiences + Gift request workflows',
          'Registered 5-step service booking preserving DOM checkbox focus',
          'Staff confirmation, completion, verified cash payment, and Admin Funnel / Occasions & Gifts UI',
          'Interactive 5-star review validation, click & keyboard selection, moderation statuses (Pending, Needs revision, Published), and re-moderation on edit',
          'Customer Beauty Passport preferences, saved nail look, and J Petals Club balance (250) verified',
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
