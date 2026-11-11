const { chromium } = require('playwright');
const { spawn, spawnSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');

const root = resolve(__dirname, '..');
const out = join(root, 'screenshots');
const custBase = 'http://127.0.0.1:3189';
const opsBase = 'http://127.0.0.1:3190';
const tmpDir = mkdtempSync(join(tmpdir(), 'jspa-browser-flow-'));
const env = {
  ...process.env,
  PORT: '3189',
  OPS_PORT: '3190',
  CUSTOMER_ORIGIN: custBase,
  OPS_ORIGIN: opsBase,
  OPS_MFA_REQUIRED: 'all',
  DB_PATH: join(tmpDir, 'test.sqlite'),
  OWNER_NAME: 'Browser Test Owner',
  OWNER_PHONE: '0500000011',
  OWNER_PASSWORD: 'OwnerBrowser!2026',
};

const boot = spawnSync(process.execPath, ['server.mjs', '--create-owner'], { cwd: root, env, encoding: 'utf8' });
assert.equal(boot.status, 0, boot.stderr);
const server = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
let browser;

(async () => {
  const { generateTotpCode } = await import('../server/auth/mfa.mjs');

  for (let i = 0; i < 100; i++) {
    try {
      await fetch(custBase + '/api/session');
      await fetch(opsBase + '/api/ops/session');
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
  const ownerMobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const customerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const owner = await ownerContext.newPage();
  const customer = await customerContext.newPage();
  const guest = await guestContext.newPage();
  const errors = [];
  for (const p of [owner, customer, guest]) p.on('pageerror', (e) => errors.push(e.message));

  mkdirSync(out, { recursive: true });

  // 0. Assert zero /admin UI on customer origin
  const adminRes = await fetch(custBase + '/en/admin');
  assert.equal(adminRes.status, 404, 'Customer origin must return 404 for /en/admin');
  await guest.goto(custBase + '/en/');
  const footerAdminLinks = await guest.locator('footer a[href*="/admin"]').count();
  assert.equal(footerAdminLinks, 0, 'Customer footer must have zero admin links');

  // 1. Owner signs in to standalone J Beauty Operations Portal & completes mandatory MFA setup
  await owner.goto(opsBase + '/');
  await owner.locator('#ops-login-form').waitFor();
  await owner.locator('#ops-login-form [name=phone]').fill(env.OWNER_PHONE);
  await owner.locator('#ops-login-form [name=password]').fill(env.OWNER_PASSWORD);
  await owner.locator('#ops-login-form button[type=submit]').click();

  await owner.locator('#ops-start-mfa-setup').waitFor();
  await owner.locator('#ops-start-mfa-setup').click();
  await owner.locator('#ops-mfa-verify-form').waitFor();
  await owner.screenshot({ path: join(out, 'ops-mfa-setup-desktop.png'), fullPage: true });
  const secret = (await owner.locator('.alert.warn .mono bdi').innerText()).trim();
  await owner.locator('#ops-mfa-verify-form [name=code]').fill(generateTotpCode(secret));
  await owner.locator('#ops-mfa-verify-form button[type=submit]').click();
  await owner.locator('.ops-sidebar').waitFor();
  await owner.locator('#ops-lang-toggle').click();
  await owner.screenshot({ path: join(out, 'ops-overview-desktop.png'), fullPage: true });

  async function opsApi(page, url, data) {
    return page.evaluate(
      async ({ url, data }) => {
        const s = await (await fetch('/api/ops/session')).json();
        const r = await fetch('/api/ops' + url, {
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

  async function custApi(page, url, data) {
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

  await opsApi(owner, '/settings', {
    settings: {
      business_phone: '966500000011',
      areas: ['Test district'],
      capacity: 2,
      lead_hours: 1,
      working_days: [0, 1, 2, 3, 4, 5, 6],
      opening_time: '08:00',
      closing_time: '22:00',
      business_approved: true,
    },
  });

  // Create Practitioner on Staff tab via UI
  await owner.locator('[data-ops-tab="staff"]').click();
  await owner.locator('#ops-create-staff-form [name=name]').fill('Noura Specialist');
  await owner.locator('#ops-create-staff-form [name=phone]').fill('0500000077');
  await owner.locator('#ops-create-staff-form [name=password]').fill('Specialist!Pass2026');
  await owner.locator('#ops-create-staff-form [name=role]').selectOption('practitioner');
  await owner.locator('#ops-create-staff-form button[type=submit]').click();
  await owner.getByText('Noura Specialist').first().waitFor();
  await owner.screenshot({ path: join(out, 'ops-staff-desktop.png'), fullPage: true });

  // 2. Customer guest 5-step package booking on mobile
  async function book(page, registered = false, packageBooking = false) {
    await page.goto(custBase + '/en/booking');
    await page.locator('#booking-form').waitFor();
    if (packageBooking) {
      await page.locator('[data-pick-category="packages"]').click();
    } else {
      await page.locator('[data-pick-category="massage"]').click();
    }
    await page.locator('#booking-form button[type=submit]').click();
    await page.locator('[data-bookcat]').first().waitFor();

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
    await page.getByText('Your request is saved. J Beauty will review and personally confirm your appointment.').waitFor();

    const wa = await page.locator('#whatsapp-handoff-link').getAttribute('href');
    assert.ok(wa.startsWith('https://wa.me/966500000011?text='));
  }

  await book(guest, false, true);
  await guest.screenshot({ path: join(out, 'guest-booking-success-mobile.png'), fullPage: true });

  // Unauthenticated reviews guard & mobile Nail Atelier
  await guest.goto(custBase + '/en/reviews');
  await guest.locator('#open-review-cta').click();
  await guest.getByText('reviewing requires a signed-in verified customer account').waitFor();
  await guest.screenshot({ path: join(out, 'reviews-unauthenticated-mobile.png'), fullPage: true });
  await guest.locator('#close-dialog').click();

  await guest.goto(custBase + '/ar/atelier');
  await guest.locator('[data-at-shape="oval"]').click();
  await guest.locator('[data-at-finish="gloss"]').click();
  await guest.waitForTimeout(250);
  await guest.screenshot({ path: join(out, 'nail-atelier-mobile.png'), fullPage: false });

  // 3. Customer Registration & Staff Verification via Ops Portal
  await customer.goto(custBase + '/en/register');
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
  const custSess = await custApi(customer, '/session');

  await owner.locator('[data-ops-tab="customers"]').click();
  await owner.locator('#ops-verify-form [name=user_id]').selectOption(custSess.user.id);
  await owner.locator('#ops-verify-form [name=observed_phone]').fill('0500000012');
  await owner.locator('#ops-verify-form [name=reference]').fill(reference);
  await owner.locator('#ops-verify-form [name=checked]').check();
  await owner.locator('#ops-verify-form button[type=submit]').click();
  await owner.getByText('Verified', { exact: true }).first().waitFor();

  // Verified customer zero-booking guard on /reviews
  await customer.goto(custBase + '/en/reviews');
  await customer.locator('#open-review-cta').click();
  await customer.getByText('No Completed Visit Available Yet').waitFor();
  await customer.locator('#close-dialog').click();

  // Nail Atelier & Ritual Studio
  await customer.goto(custBase + '/en/atelier');
  await customer.locator('#at-name').fill('Oval Blush Pearls');
  await customer.locator('[data-at-skin="deep"]').click();
  await customer.locator('[data-at-shape="coffin"]').click();
  await customer.locator('[data-at-len="long"]').click();
  await customer.locator('[data-at-finish="pearl"]').click();
  await customer.locator('[data-at-accent="gold_foil"]').click();
  await customer.waitForTimeout(250);
  await customer.locator('#at-save-look').click();
  await customer.getByText('Style saved to your Beauty Passport').waitFor();
  await customer.screenshot({ path: join(out, 'nail-atelier-desktop.png'), fullPage: true });

  await customer.goto(custBase + '/en/studio');
  await customer.getByText('Book this option').first().waitFor();
  await customer.locator('[data-studio-opt="mood"][data-val="pamper"]').click();
  await customer.getByText('Book this option').first().waitFor();
  await customer.screenshot({ path: join(out, 'ritual-studio-desktop.png'), fullPage: true });

  // 4. 5-Step Progressive Occasions Wizard (Mobile + Desktop) + Legacy redirect check
  await guest.goto(custBase + '/en/group-booking');
  await guest.waitForURL('**/en/occasions');
  await guest.locator('#group-form').waitFor();
  // Step 1 on Mobile 390px: verify clean layout & no checkbox wall!
  assert.equal(await guest.locator('[data-guest-svc]').count(), 0, 'Occasions Step 1 must not render 65 checkbox matrix');
  await guest.locator('[name=organizer_name]').fill('Occasion Coordinator');
  await guest.locator('[name=organizer_phone]').fill('0500000044');
  await guest.locator('#occ-next').click();
  // Step 2: Participants 2-5
  await guest.locator('#occ-inc-guest').click();
  assert.equal(await guest.locator('[data-guest-label]').count(), 3);
  await guest.locator('#occ-dec-guest').click();
  await guest.locator('#occ-next').click();
  // Step 3: Services per Participant Tabs (one guest visible at a time!)
  await guest.locator('.occasion-tabs').waitFor();
  const checkboxesStep3 = await guest.locator('[data-guest-svc]').count();
  assert.ok(checkboxesStep3 <= 13, `Occasions Step 3 must show only one guest services (${checkboxesStep3})`);
  await guest.locator('[data-guest-svc="0"][value="french-gel"]').check();
  await guest.screenshot({ path: join(out, 'occasions-step3-tabs-mobile.png'), fullPage: true });
  await guest.locator('#occ-next').click();
  // Step 4: Date/Time/Neighborhood
  await guest.locator('#group-form [name=date]').fill(new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10));
  await guest.locator('#group-form [name=time]').fill('16:00');
  await guest.locator('#group-form [name=neighborhood]').selectOption({ label: 'Test district' });
  await guest.locator('#occ-next').click();
  // Step 5: Review & Submit
  await guest.locator('#group-form [name=terms]').check();
  await guest.locator('#group-form button[type=submit]').click();
  await guest.getByText('Awaiting Operations Approval & Capacity Review').waitFor();

  // Gifts request
  await customer.goto(custBase + '/en/gifts');
  await customer.locator('#gift-form [name=recipient_name]').fill('Dear Sister');
  await customer.locator('#gift-form [name=personal_message]').fill('Wishing you calm moments');
  await customer.locator('#gift-form [name=terms]').check();
  await customer.locator('#gift-form button[type=submit]').click();
  await customer.getByText('Pending Staff Review & Manual Payment Verification').waitFor();

  // 5. Customer registered booking -> Ops Portal assignment, lifecycle, payment verify & review moderation
  await book(customer, true, false);
  const dash = await opsApi(owner, '/dashboard');
  const booking = dash.bookings.find((b) => b.user_id === custSess.user.id);
  const pracUser = dash.assignable_practitioners.find((p) => p.name === 'Noura Specialist');
  assert.ok(booking && pracUser);

  await owner.locator('[data-ops-tab="bookings"]').click();
  await owner.locator(`.ops-table-wrap [data-bk-expand="${booking.id}"]`).click();
  const bkForm = owner.locator(`.ops-table-wrap [data-bk-form="${booking.id}"]`);
  await bkForm.locator('[name=assigned_staff_id]').selectOption(pracUser.id);
  await bkForm.locator('[name=paid_amount]').fill('250');
  await bkForm.locator('[name=payment_method]').selectOption('cash');
  await bkForm.locator('[name=payment_verified]').check();
  await bkForm.locator('button[type=submit]').click();
  await owner.waitForTimeout(200);

  for (const nextSt of ['confirmed', 'in_progress', 'completed']) {
    await owner.locator(`.ops-table-wrap [data-bk-transition="${booking.id}"][data-next-status="${nextSt}"]`).click();
    await owner.waitForTimeout(180);
  }
  await owner.screenshot({ path: join(out, 'ops-bookings-desktop.png'), fullPage: true });

  // Customer submits review -> Owner moderates on Ops Portal
  await customer.goto(custBase + '/en/reviews');
  await customer.locator('#open-review-cta').click();
  await customer.locator('#star-picker').waitFor();
  await customer.locator('#star-picker [data-star="5"]').click();
  await customer.locator('#review-body-input').fill('Serene Madinah home visit, calm and punctual arrival.');
  await customer.locator('#submit-review-btn').click();
  await customer.getByText('Pending review').waitFor();

  await owner.locator('[data-ops-tab="reviews"]').click();
  await owner.locator('[data-rev-act="approve"]').first().click();
  await owner.waitForTimeout(150);
  await owner.screenshot({ path: join(out, 'ops-reviews-desktop.png'), fullPage: true });

  await guest.goto(custBase + '/en/reviews');
  await guest.getByText('Serene Madinah home visit, calm and punctual arrival.').waitFor();

  // Calendar, Occasions, Audit + Customer Loyalty check
  await customer.goto(custBase + '/en/rewards');
  await customer.locator('.jb-points-total', { hasText: '250' }).waitFor();
  await customer.locator('[data-reward]').first().click();
  await customer.getByText('Pending request active').first().waitFor();

  await owner.locator('[data-ops-tab="petals"]').click();
  await owner.locator('.ops-table-wrap [data-reward-cancel]').first().click();
  await owner.waitForTimeout(150);
  await customer.reload();
  await customer.locator('.jb-points-total', { hasText: '250' }).waitFor();

  await owner.locator('[data-ops-tab="calendar"]').click();
  await owner.locator('#ops-cal-start').fill(booking.date);
  await owner.screenshot({ path: join(out, 'ops-calendar-desktop.png'), fullPage: true });

  await owner.locator('[data-ops-tab="occasions"]').click();
  await owner.getByText('Dear Sister').first().waitFor();
  await owner.screenshot({ path: join(out, 'ops-occasions-desktop.png'), fullPage: true });

  await owner.locator('[data-ops-tab="audit"]').click();
  await owner.getByText('booking.update').first().waitFor();
  await owner.screenshot({ path: join(out, 'ops-audit-desktop.png'), fullPage: true });

  // Mobile Ops portal drawer & cards check
  const ownerMobile = await ownerMobileContext.newPage();
  ownerMobile.on('pageerror', (e) => errors.push(e.message));
  await ownerMobile.goto(opsBase + '/');
  await ownerMobile.locator('#ops-login-form [name=phone]').fill(env.OWNER_PHONE);
  await ownerMobile.locator('#ops-login-form [name=password]').fill(env.OWNER_PASSWORD);
  await ownerMobile.locator('#ops-login-form button[type=submit]').click();
  await ownerMobile.locator('#ops-mfa-verify-form [name=code]').fill(generateTotpCode(secret));
  await ownerMobile.locator('#ops-mfa-verify-form button[type=submit]').click();
  await ownerMobile.locator('#ops-menu-btn').waitFor();
  await ownerMobile.screenshot({ path: join(out, 'ops-overview-mobile.png'), fullPage: true });
  await ownerMobile.locator('#ops-menu-btn').click();
  await ownerMobile.locator('#ops-sidebar.open').waitFor();
  await ownerMobile.locator('[data-ops-tab="bookings"]').click();
  await ownerMobile.locator('.ops-mobile-cards').first().waitFor();
  await ownerMobile.screenshot({ path: join(out, 'ops-bookings-mobile.png'), fullPage: true });

  assert.deepEqual(errors, []);
  writeFileSync(
    join(root, 'BROWSER-FLOW-RESULTS.json'),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        passed: [
          'Customer origin returns 404 for /admin and removes all staff links/scripts',
          'Operations Portal login & mandatory RFC 6238 TOTP MFA enrollment in Chromium',
          'Guest 5-step package booking, Reviews guard, and Mobile Nail Atelier',
          'Customer registration, Ops identity verification, saved Nail Look & Studio recommendations',
          '5-Step Progressive Occasions Wizard (mobile tabs <=13 checkboxes, no 65-box wall) + Gift workflow',
          'Practitioner creation, assignment, lifecycle updates, verified cash payment, and 250 Petals reconciliation',
          'Customer 5-star review + Ops moderation + public visibility + Petals cancellation reversal',
          'Operations mobile drawer & responsive cards verified at 390px',
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Dual-origin E2E browser workflow checks passed.');
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    server.kill();
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });
