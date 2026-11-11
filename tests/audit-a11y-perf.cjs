const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const { spawn, spawnSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');

const root = resolve(__dirname, '..');
const phase = process.env.AUDIT_PHASE === 'after' ? 'after' : 'before';
const shotDir = join(root, 'screenshots', 'quality-recovery', phase);
const opsShotDir = join(root, 'screenshots', 'quality-recovery', 'ops');
mkdirSync(shotDir, { recursive: true });
mkdirSync(opsShotDir, { recursive: true });

const ROUTES = [
  '/ar/',
  '/en/',
  '/ar/services',
  '/ar/services/gel-removal',
  '/ar/packages',
  '/ar/studio',
  '/ar/atelier',
  '/ar/lookbook',
  '/ar/occasions',
  '/ar/gifts',
  '/ar/booking',
  '/ar/account',
  '/ar/petals',
  '/ar/reviews',
  '/ar/policies',
  '/ar/privacy',
  '/ar/terms',
  '/ar/contact',
];

(async () => {
  const { generateTotpCode } = await import('../server/auth/mfa.mjs');
  const dir = mkdtempSync(join(tmpdir(), `jspa-audit-${phase}-`));
  const port = phase === 'before' ? 3194 : 3195;
  const opsPort = phase === 'before' ? 3294 : 3295;
  const base = `http://127.0.0.1:${port}`;
  const opsBase = `http://127.0.0.1:${opsPort}`;
  const env = {
    ...process.env,
    PORT: String(port),
    OPS_PORT: String(opsPort),
    CUSTOMER_ORIGIN: base,
    OPS_ORIGIN: opsBase,
    OPS_MFA_REQUIRED: 'all',
    DB_PATH: join(dir, 'audit.sqlite'),
    OWNER_NAME: 'Audit Owner',
    OWNER_PHONE: '0500000031',
    OWNER_PASSWORD: 'AuditOwner!2026',
  };
  const boot = spawnSync(process.execPath, ['server.mjs', '--create-owner'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(boot.status, 0, boot.stderr);
  const server = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });

  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base + '/api/session');
      await fetch(opsBase + '/api/ops/session');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-webgl'],
  });

  const summary = {
    phase,
    timestamp: new Date().toISOString(),
    a11y: [],
    opsA11y: [],
    performance: [],
    typography: [],
    screenshots: [],
    opsScreenshots: [],
  };

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.addInitScript(() => {
      window.__jspaPerf = { cls: 0, lcp: 0, fcp: 0 };
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (!e.hadRecentInput) window.__jspaPerf.cls += e.value || 0;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((list) => {
          const last = list.getEntries().at(-1);
          if (last) window.__jspaPerf.lcp = Math.round(last.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.name === 'first-contentful-paint') window.__jspaPerf.fcp = Math.round(e.startTime);
          }
        }).observe({ type: 'paint', buffered: true });
      } catch {}
    });

    for (const route of ROUTES) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.locator('h1').waitFor();
      await page.evaluate(async () => {
        document.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
        for (let y = 0; y <= document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 30));
        }
        window.scrollTo(0, 0);
        await Promise.all(
          [...document.images].map((img) =>
            img.complete
              ? img.decode().catch(() => {})
              : new Promise((resolve) => {
                  img.addEventListener('load', () => img.decode().catch(() => {}).then(resolve), { once: true });
                  img.addEventListener('error', resolve, { once: true });
                  setTimeout(resolve, 2500);
                }),
          ),
        );
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(160);

      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const bodyStyle = getComputedStyle(document.body);
        const h1Style = document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')) : null;
        return {
          dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
          load: nav ? Math.round(nav.loadEventEnd) : 0,
          fcp: window.__jspaPerf?.fcp || 0,
          lcp: window.__jspaPerf?.lcp || 0,
          cls: Number((window.__jspaPerf?.cls || 0).toFixed(4)),
          bodyFontSize: parseFloat(bodyStyle.fontSize),
          bodyLineHeight: parseFloat(bodyStyle.lineHeight),
          h1FontSize: h1Style ? parseFloat(h1Style.fontSize) : 0,
          dir: document.documentElement.dir,
        };
      });

      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const slug = route === '/ar/' ? 'ar-home' : route === '/en/' ? 'en-home' : route.slice(1).replaceAll('/', '-');
      const desktopShot = `${slug}-1440.png`;
      await page.screenshot({ path: join(shotDir, desktopShot), fullPage: true });
      summary.screenshots.push(desktopShot);

      if (['/ar/', '/en/', '/ar/atelier', '/ar/petals', '/ar/occasions', '/ar/reviews', '/ar/booking', '/ar/services/gel-removal'].includes(route)) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(120);
        const mobShot = `${slug}-390.png`;
        await page.screenshot({ path: join(shotDir, mobShot), fullPage: true });
        summary.screenshots.push(mobShot);
      }

      summary.a11y.push({
        route,
        violations: axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          targets: v.nodes.slice(0, 3).map((n) => n.target),
        })),
      });
      summary.performance.push({ route, ...metrics });
      summary.typography.push({ route, dir: metrics.dir, bodyFontSize: metrics.bodyFontSize, bodyLineHeight: metrics.bodyLineHeight, h1FontSize: metrics.h1FontSize });
    }

    // Nail Atelier & Petals focal crops
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + '/ar/atelier', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const atelierVisual = page.locator('#atelier-canvas-wrap, .atelier-stage').first();
    if (await atelierVisual.count()) {
      await atelierVisual.screenshot({ path: join(shotDir, 'crop-atelier-hand.png') });
      summary.screenshots.push('crop-atelier-hand.png');
    }
    await page.goto(base + '/ar/petals', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const bloomEl = page.locator('.jb-rewards-main, .loyalty-gallery-card, .petal-cameo').first();
    if (await bloomEl.count()) {
      await bloomEl.screenshot({ path: join(shotDir, 'crop-petals-flower.png') });
      summary.screenshots.push('crop-petals-flower.png');
    }

    // Standalone J Beauty Operations Portal audit & screenshots (Desktop 1440 + Mobile 390)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(opsBase + '/', { waitUntil: 'networkidle' });
    await page.locator('#ops-login-form').waitFor();
    summary.opsA11y.push({ route: 'ops-login', violations: (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations });
    await page.screenshot({ path: join(opsShotDir, 'ops-login-1440.png'), fullPage: true });
    summary.opsScreenshots.push('ops-login-1440.png');

    await page.locator('#ops-login-form [name=phone]').fill(env.OWNER_PHONE);
    await page.locator('#ops-login-form [name=password]').fill(env.OWNER_PASSWORD);
    await page.locator('#ops-login-form button[type=submit]').click();
    await page.locator('#ops-start-mfa-setup').waitFor();
    await page.locator('#ops-start-mfa-setup').click();
    await page.locator('#ops-mfa-verify-form').waitFor();
    await page.screenshot({ path: join(opsShotDir, 'ops-mfa-1440.png'), fullPage: true });
    summary.opsScreenshots.push('ops-mfa-1440.png');

    const secret = (await page.locator('.alert.warn .mono bdi').innerText()).trim();
    await page.locator('#ops-mfa-verify-form [name=code]').fill(generateTotpCode(secret));
    await page.locator('#ops-mfa-verify-form button[type=submit]').click();
    await page.locator('.ops-sidebar').waitFor();

    // Seed sample operational activity in the temporary audit DB so populated desktop rows & mobile cards can be inspected
    await page.evaluate(async () => {
      const s = await (await fetch('/api/ops/session')).json();
      await fetch('/api/ops/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': s.csrfToken },
        body: JSON.stringify({ settings: { areas: ['العوالي', 'سلطانة'], capacity: 2, lead_hours: 1, business_approved: true } }),
      });
    });
    const guestCtx = await browser.newContext();
    const gp = await guestCtx.newPage();
    await gp.goto(base + '/ar/');
    await gp.evaluate(async () => {
      const s = await (await fetch('/api/session')).json();
      const dt = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': s.csrfToken },
        body: JSON.stringify({ service_ids: ['french-gel'], date: dt, time: '16:00', name: 'سارة العتيبي', phone: '0500000091', neighborhood: 'العوالي', notes: 'زيارة مسائية', terms: true, idempotency_key: 'audit-bk-1' }),
      });
    });
    await guestCtx.close();
    await page.locator('#ops-refresh-btn').click();
    await page.waitForTimeout(200);

    for (const [tabName, shotName] of [
      ['overview', 'ops-overview-1440.png'],
      ['bookings', 'ops-bookings-1440.png'],
      ['calendar', 'ops-calendar-1440.png'],
      ['staff', 'ops-staff-1440.png'],
      ['payments', 'ops-payments-1440.png'],
    ]) {
      await page.locator(`[data-ops-tab="${tabName}"]`).click();
      await page.waitForTimeout(150);
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      summary.opsA11y.push({
        route: `ops-${tabName}`,
        violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      });
      await page.screenshot({ path: join(opsShotDir, shotName), fullPage: true });
      summary.opsScreenshots.push(shotName);
    }

    // Mobile 390px Ops overview & bookings
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#ops-menu-btn').click();
    await page.locator('[data-ops-tab="overview"]').click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(opsShotDir, 'ops-overview-390.png'), fullPage: true });
    summary.opsScreenshots.push('ops-overview-390.png');
    await page.locator('#ops-menu-btn').click();
    await page.locator('[data-ops-tab="bookings"]').click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(opsShotDir, 'ops-bookings-390.png'), fullPage: true });
    summary.opsScreenshots.push('ops-bookings-390.png');

    await context.close();
  } finally {
    await browser.close();
    server.kill('SIGTERM');
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }

  mkdirSync(join(root, 'docs', 'quality-recovery'), { recursive: true });
  writeFileSync(join(root, 'docs', 'quality-recovery', `audit-${phase}.json`), JSON.stringify(summary, null, 2));
  console.log(`Audit (${phase}) completed across ${ROUTES.length} Customer + Ops Portal views.`);
})();
