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
mkdirSync(shotDir, { recursive: true });

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
  const dir = mkdtempSync(join(tmpdir(), `jspa-audit-${phase}-`));
  const port = phase === 'before' ? 3194 : 3195;
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    PORT: String(port),
    DB_PATH: join(dir, 'audit.sqlite'),
    OWNER_NAME: 'Audit Owner',
    OWNER_PHONE: '0500000031',
    OWNER_PASSWORD: 'AuditOwner!2026',
  };
  const boot = spawnSync(process.execPath, ['server.mjs', '--create-owner'], {
    cwd: root,
    env,
    encoding: 'utf8',
  });
  assert.equal(boot.status, 0, boot.stderr);
  const server = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base + '/api/session');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader-webgl',
      '--enable-webgl',
    ],
  });

  const summary = {
    phase,
    timestamp: new Date().toISOString(),
    a11y: [],
    performance: [],
    typography: [],
    screenshots: [],
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
            if (e.name === 'first-contentful-paint') {
              window.__jspaPerf.fcp = Math.round(e.startTime);
            }
          }
        }).observe({ type: 'paint', buffered: true });
      } catch {}
    });

    for (const route of ROUTES) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        document.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
        await Promise.all([...document.images].map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())));
      });
      await page.waitForTimeout(300);

      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const bodyStyle = getComputedStyle(document.body);
        const h1 = document.querySelector('#main h1');
        const h1Style = h1 ? getComputedStyle(h1) : null;
        const smallTexts = [];
        document.querySelectorAll('#main p, #main label, #main button, #main a').forEach((el) => {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          const txt = (el.textContent || '').trim();
          if (txt && fs > 0 && fs < 13) {
            smallTexts.push({ tag: el.tagName, fs, text: txt.slice(0, 32) });
          }
        });
        return {
          dir: document.documentElement.dir,
          dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
          load: nav ? Math.round(nav.loadEventEnd) : 0,
          fcp: window.__jspaPerf?.fcp || 0,
          lcp: window.__jspaPerf?.lcp || 0,
          cls: Number((window.__jspaPerf?.cls || 0).toFixed(4)),
          bodyFontSize: parseFloat(bodyStyle.fontSize),
          bodyLineHeight: parseFloat(bodyStyle.lineHeight),
          h1FontSize: h1Style ? parseFloat(h1Style.fontSize) : 0,
          sub13pxCount: smallTexts.length,
        };
      });

      const routeSlug = route.replace(/\//g, '-').replace(/^-|-$/g, '') || 'home';
      const desktopShot = `${routeSlug}-desktop.png`;
      await page.screenshot({ path: join(shotDir, desktopShot), fullPage: true });
      summary.screenshots.push(desktopShot);

      if (['/ar/', '/ar/services', '/ar/services/gel-removal', '/ar/studio', '/ar/atelier', '/ar/petals', '/ar/booking', '/ar/account', '/ar/reviews', '/ar/occasions', '/en/'].includes(route)) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(250);
        const mobileShot = `${routeSlug}-mobile.png`;
        await page.screenshot({ path: join(shotDir, mobileShot), fullPage: true });
        summary.screenshots.push(mobileShot);
      }

      summary.a11y.push({
        route,
        violations: axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          help: v.help,
          targets: v.nodes.slice(0, 3).map((n) => n.target),
        })),
      });
      summary.performance.push({
        route,
        dcl: metrics.dcl,
        load: metrics.load,
        fcp: metrics.fcp,
        lcp: metrics.lcp,
        cls: metrics.cls,
      });
      summary.typography.push({
        route,
        dir: metrics.dir,
        bodyFontSize: metrics.bodyFontSize,
        bodyLineHeight: metrics.bodyLineHeight,
        h1FontSize: metrics.h1FontSize,
        sub13pxCount: metrics.sub13pxCount,
      });
    }

    // Cropped focal component inspections (Desktop 1440px)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + '/ar/atelier', { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    const atelierVisual = page.locator('#atelier-canvas-wrap, .atelier-stage, .atelier-preview-wrap canvas').first();
    if (await atelierVisual.count()) {
      await atelierVisual.screenshot({ path: join(shotDir, 'crop-atelier-hand.png') });
      summary.screenshots.push('crop-atelier-hand.png');
    }
    // Multi-variant Nail Atelier close-ups (Fair Burgundy Gloss, Oval Blush French, Olive Coffin Gold Foil, Deep Sage Matte)
    await page.locator('[data-at-skin="deep"]').click();
    await page.locator('[data-at-shape="coffin"]').click();
    await page.locator('[data-at-len="long"]').click();
    await page.locator('[data-at-accent="gold_foil"]').click();
    await page.locator('[data-at-finish="pearl"]').click();
    await page.waitForTimeout(300);
    if (await atelierVisual.count()) {
      await atelierVisual.screenshot({ path: join(shotDir, 'crop-atelier-coffin-deep.png') });
      summary.screenshots.push('crop-atelier-coffin-deep.png');
    }
    await page.locator('[data-at-skin="olive"]').click();
    await page.locator('[data-at-shape="squoval"]').click();
    await page.locator('[data-at-len="medium"]').click();
    await page.locator('[data-at-french="none"]').click();
    await page.locator('[data-at-color="#89A17F"]').click();
    await page.locator('[data-at-finish="matte"]').click();
    await page.locator('[data-at-accent="none"]').click();
    await page.waitForTimeout(300);
    if (await atelierVisual.count()) {
      await atelierVisual.screenshot({ path: join(shotDir, 'crop-atelier-matte-sage.png') });
      summary.screenshots.push('crop-atelier-matte-sage.png');
    }

    await page.goto(base + '/ar/petals', { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    const bloomEl = page.locator('.jb-rewards-main, .loyalty-gallery-card, .petal-cameo, .signature-bloom').first();
    if (await bloomEl.count()) {
      await bloomEl.screenshot({ path: join(shotDir, 'crop-petals-flower.png') });
      summary.screenshots.push('crop-petals-flower.png');
    }

    await page.goto(base + '/ar/services/gel-removal', { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const gelImg = page.locator('#main .art img, #main .service-detail img').first();
    if (await gelImg.count()) {
      await gelImg.screenshot({ path: join(shotDir, 'crop-gel-removal-photo.png') });
      summary.screenshots.push('crop-gel-removal-photo.png');
    }

    // Owner Admin dashboard capture
    await page.goto(base + '/en/admin', { waitUntil: 'networkidle' });
    await page.locator('#auth-form [name="phone"]').fill('0500000031');
    await page.locator('#auth-form [name="password"]').fill('AuditOwner!2026');
    await page.locator('#auth-form button[type="submit"]').click();
    await page.locator('[data-admin-tab]').first().waitFor();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(shotDir, 'admin-overview-desktop.png'), fullPage: true });
    summary.screenshots.push('admin-overview-desktop.png');

    await context.close();
  } finally {
    await browser.close();
    server.kill('SIGTERM');
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }

  writeFileSync(
    join(root, 'docs', 'quality-recovery', `audit-${phase}.json`),
    JSON.stringify(summary, null, 2),
  );
  console.log(`Audit (${phase}) completed across ${ROUTES.length} routes; screenshots saved to ${shotDir}`);
})();
