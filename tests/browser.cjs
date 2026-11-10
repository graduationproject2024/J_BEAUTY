const { chromium } = require('playwright');
const { spawn, spawnSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');

const root = resolve(__dirname, '..');
const out = join(root, 'screenshots');
mkdirSync(out, { recursive: true });

(async () => {
  let server = null;
  let base = process.env.TEST_BASE_URL;
  if (!base) {
    const dir = mkdtempSync(join(tmpdir(), 'jspa-routes-'));
    const port = 3191;
    base = `http://127.0.0.1:${port}`;
    const env = {
      ...process.env,
      PORT: String(port),
      DB_PATH: join(dir, 'test.sqlite'),
      OWNER_NAME: 'Route Test Owner',
      OWNER_PHONE: '0500000021',
      OWNER_PASSWORD: 'OwnerRoutes!2026',
    };
    const boot = spawnSync(process.execPath, ['server.mjs', '--create-owner'], {
      cwd: root,
      env,
      encoding: 'utf8',
    });
    assert.equal(boot.status, 0, boot.stderr);
    server = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
    for (let i = 0; i < 100; i++) {
      try {
        await fetch(base + '/api/session');
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('/api/')) {
      failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });

  const routes = [
    '/ar/',
    '/en/',
    '/ar/services',
    '/ar/services/relaxation',
    '/ar/packages',
    '/ar/studio',
    '/ar/atelier',
    '/ar/lookbook',
    '/ar/group-booking',
    '/ar/gifts',
    '/ar/booking',
    '/ar/account',
    '/ar/petals',
    '/ar/reviews',
    '/ar/about',
    '/ar/contact',
    '/ar/faq',
  ];

  const results = [];
  try {
    const r404 = await fetch(base + '/ar/unknown-route-404');
    assert.equal(r404.status, 404, 'Unknown route must return HTTP 404');
    const html404 = await r404.text();
    assert.ok(html404.includes('noindex'), '404 route must include noindex');

    for (const width of [360, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width >= 1024 ? 1000 : 844 });
      for (const route of routes) {
        await page.goto(base + route, { waitUntil: 'networkidle' });
        await page.locator('h1').waitFor();
        await page.evaluate(async () => {
          document.querySelectorAll('img').forEach((img) => {
            img.loading = 'eager';
          });
          for (let y = 0; y <= document.body.scrollHeight; y += 500) {
            window.scrollTo({ top: y, behavior: 'instant' });
            await new Promise((r) => setTimeout(r, 40));
          }
          window.scrollTo({ top: 0, behavior: 'instant' });
        });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(120);
        const info = await page.evaluate(async () => {
          const imgs = [...document.querySelectorAll('img')];
          await Promise.all(
            imgs.map((img) =>
              img.complete
                ? Promise.resolve()
                : new Promise((resolve) => {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                    setTimeout(resolve, 1500);
                  }),
            ),
          );
          const brokenImgs = imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src);
          const h1 = document.querySelector('h1')?.innerText?.trim() || '';
          const unrevealed = [...document.querySelectorAll('[data-reveal]')].filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.top < window.innerHeight && getComputedStyle(el).opacity === '0';
          }).length;
          return {
            scroll: document.documentElement.scrollWidth,
            client: document.documentElement.clientWidth,
            text: document.body.innerText.length,
            dir: document.documentElement.dir,
            h1,
            brokenImgs,
            unrevealed,
            hasBookCta: !!document.querySelector('a[href*="/booking"]'),
          };
        });
        assert.ok(info.text > 100, `Empty page ${route}`);
        assert.ok(info.h1.length > 0, `Missing h1 on ${route}`);
        assert.ok(!/هذه الصفحة غير موجودة|This page isn’t here/i.test(info.h1), `404 rendered on ${route}`);
        assert.deepEqual(info.brokenImgs, [], `Broken images on ${route}: ${info.brokenImgs}`);
        assert.equal(info.unrevealed, 0, `Above-fold elements stuck invisible on ${route} at ${width}px`);
        assert.ok(info.hasBookCta, `Missing booking CTA on ${route} at ${width}px`);
        assert.ok(
          info.scroll <= info.client + 1,
          `Horizontal overflow ${width}px ${route}: scrollWidth=${info.scroll} clientWidth=${info.client}`,
        );
        assert.equal(info.dir, route.startsWith('/ar') ? 'rtl' : 'ltr');
        results.push(`${width}px ${route}: OK (${info.h1})`);

        if (
          (width === 390 || width === 1440) &&
          [
            '/ar/',
            '/en/',
            '/ar/services',
            '/ar/services/relaxation',
            '/ar/packages',
            '/ar/studio',
            '/ar/atelier',
            '/ar/lookbook',
            '/ar/group-booking',
            '/ar/gifts',
            '/ar/booking',
            '/ar/account',
            '/ar/petals',
            '/ar/reviews',
          ].includes(route)
        ) {
          const slug = route.slice(1).replaceAll('/', '-') || 'home';
          await page.screenshot({ path: join(out, `${slug}-${width}.png`), fullPage: true });
        }
      }
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + '/ar/', { waitUntil: 'networkidle' });
    const revealedOnReduce = await page.evaluate(() =>
      [...document.querySelectorAll('[data-reveal]')].every((el) => el.classList.contains('is-revealed')),
    );
    assert.ok(revealedOnReduce, 'prefers-reduced-motion must reveal all sections immediately');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    await page.goto(base + '/concepts.html', { waitUntil: 'networkidle' });
    for (const theme of ['synthesis', 'botanical', 'blush', 'editorial']) {
      await page.locator(`button[data-theme="${theme}"]`).click();
      await page.waitForTimeout(150);
      await page.screenshot({ path: join(out, `concept-${theme}-1440.png`), fullPage: true });
    }
    await page.locator('button[data-theme="synthesis"]').click();
    await page.screenshot({ path: join(out, 'concepts-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(out, 'concepts-mobile.png'), fullPage: true });

    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    assert.deepEqual(failedRequests, [], 'Failed static asset requests');
    writeFileSync(
      join(root, 'BROWSER-RESULTS.json'),
      JSON.stringify({ date: new Date().toISOString(), count: results.length, passed: results, errors }, null, 2),
    );
    console.log(`${results.length} responsive route checks passed; screenshots saved.`);
  } finally {
    await browser.close();
    if (server) server.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
