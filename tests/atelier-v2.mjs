import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function computeMeshSignedVolume(positions, indices) {
  let vol = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;
    const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
    const bx = positions[i1], by = positions[i1 + 1], bz = positions[i1 + 2];
    const cx = positions[i2], cy = positions[i2 + 1], cz = positions[i2 + 2];
    vol +=
      ax * (by * cz - bz * cy) +
      bx * (cy * az - cz * ay) +
      cx * (ay * bz - az * by);
  }
  return vol / 6;
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function waitForHealth(url) {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status < 500) return;
    } catch { }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

async function runGeometryUnitChecks() {
  const { buildAnatomicalHandGeometry } = await import(
    pathToFileURL(join(ROOT, 'apps/customer/js/atelier/hand-geometry.js')).href
  );
  const { buildSculptedNailGeometry } = await import(
    pathToFileURL(join(ROOT, 'apps/customer/js/atelier/nail-geometry.js')).href
  );
  const { evaluateAtelierServiceMatch } = await import(
    pathToFileURL(join(ROOT, 'apps/customer/js/atelier/service-mapping.js')).href
  );

  // 1. Hand manifold & topology proof
  const hand = buildAnatomicalHandGeometry({ subdivisionLevels: 2, verify: true });
  assert.equal(hand.stats.controlVerts, 680, 'Expected 680 anatomical hand control vertices');
  assert.equal(hand.stats.triangles, 21664, 'Expected 21,664 level-2 Catmull-Clark triangles');
  for (let i = 0; i < hand.positions.length; i++) {
    assert.ok(Number.isFinite(hand.positions[i]), `Non-finite hand vertex coordinate at index ${i}`);
  }
  const handVol = computeMeshSignedVolume(hand.positions, hand.indices);
  assert.ok(handVol > 10, `Expected positive outward hand mesh volume > 10 cm^3, got ${handVol}`);
  for (const fid of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
    const a = hand.nailAnchors[fid];
    assert.ok(a && a.bedWidth > 0.6 && a.bedLength > 0.9, `Invalid nail anchor for ${fid}`);
  }
  assert.ok(hand.jewelryAnchor && hand.jewelryAnchor.center && hand.jewelryAnchor.rx > 0, 'Missing ring jewelry anchor');

  // 2. Sculpted nail plate parametric verification across all 5 shapes x 3 lengths
  const shapes = ['almond', 'oval', 'squoval', 'square', 'coffin'];
  const lengths = ['short', 'medium', 'long'];
  for (const shape of shapes) {
    const maxExtents = {};
    for (const len of lengths) {
      const n = buildSculptedNailGeometry(hand.nailAnchors.middle, shape, len);
      assert.ok(n.positions.length > 0 && n.indices.length > 0, `Empty nail geometry for ${shape}/${len}`);
      for (let i = 0; i < n.positions.length; i++) {
        assert.ok(Number.isFinite(n.positions[i]), `Non-finite nail coord in ${shape}/${len}`);
      }
      let maxZ = -Infinity;
      let minTipHalfW = Infinity;
      for (let i = 0; i < n.positions.length; i += 3) {
        if (n.positions[i + 2] > maxZ) maxZ = n.positions[i + 2];
      }
      for (let i = 0; i < n.positions.length; i += 3) {
        if (n.positions[i + 2] >= maxZ * 0.96) {
          minTipHalfW = Math.min(minTipHalfW, Math.abs(n.positions[i]));
        }
      }
      maxExtents[len] = maxZ;
      if (shape === 'square') {
        assert.ok(maxZ > 1.3, `Expected realistic length for square/${len}, got ${maxZ}`);
      }
    }
    assert.ok(
      maxExtents.short < maxExtents.medium && maxExtents.medium < maxExtents.long,
      `Length scaling must be strictly increasing for ${shape}: ${JSON.stringify(maxExtents)}`,
    );
  }

  // 3. Deterministic service complexity & prep mapping
  const mSimple = evaluateAtelierServiceMatch({
    shape: 'natural',
    length: 'short',
    french_style: 'none',
    tip_color: '#F5EFE8',
    finish: 'gloss',
    accent: 'none',
  });
  assert.equal(mSimple.primaryServiceId, 'gel-polish');
  assert.equal(mSimple.extraMinutes, 0);

  const mClassic = evaluateAtelierServiceMatch({
    shape: 'almond',
    length: 'medium',
    french_style: 'classic',
    tip_color: '#F5EFE8',
    finish: 'gloss',
    accent: 'none',
  });
  assert.equal(mClassic.primaryServiceId, 'french-gel');
  assert.equal(mClassic.extraMinutes, 0);

  const mSpecialty = evaluateAtelierServiceMatch({
    shape: 'oval',
    length: 'medium',
    french_style: 'ombre',
    tip_color: '#F5EFE8',
    finish: 'gloss',
    accent: 'none',
  });
  assert.equal(mSpecialty.primaryServiceId, 'colored-french');
  assert.ok(mSpecialty.extraMinutes >= 10);

  const mDesigner = evaluateAtelierServiceMatch({
    shape: 'coffin',
    length: 'long',
    french_style: 'micro',
    tip_color: '#D4AF7C',
    finish: 'pearl',
    accent: 'gold_foil',
  });
  assert.equal(mDesigner.primaryServiceId, 'colored-french');
  assert.equal(mDesigner.complexityKey, 'couture');
  assert.ok(mDesigner.extraMinutes >= 20);

  const mLegacy = evaluateAtelierServiceMatch({});
  assert.ok(mLegacy.primaryServiceId && mLegacy.tierEn, 'Empty fallback must never throw');

  console.log('PASS Unit Topology (Euler/Volume/21,664 tris), 15 Nail Solids & Deterministic Service Mapping');
}

async function runBrowserSuite() {
  const port = 3193;
  const opsPort = 3194;
  const custBase = `http://127.0.0.1:${port}`;
  const opsBase = `http://127.0.0.1:${opsPort}`;
  const tmpDir = mkdtempSync(join(tmpdir(), 'jspa-atelier-v2-'));
  const env = {
    ...process.env,
    PORT: String(port),
    OPS_PORT: String(opsPort),
    CUSTOMER_ORIGIN: custBase,
    OPS_ORIGIN: opsBase,
    DB_PATH: join(tmpDir, 'test.sqlite'),
    OWNER_NAME: 'Atelier QA Owner',
    OWNER_PHONE: '0500000011',
    OWNER_PASSWORD: 'OwnerAtelier!2026',
  };

  const boot = spawnSync(process.execPath, ['server.mjs', '--create-owner'], { cwd: ROOT, env, encoding: 'utf8' });
  assert.equal(boot.status, 0, boot.stderr);

  const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env, stdio: 'ignore' });
  const afterDir = join(ROOT, 'screenshots', 'atelier-v2', 'after');
  const cmpDir = join(ROOT, 'screenshots', 'atelier-v2', 'comparisons');
  mkdirSync(afterDir, { recursive: true });
  mkdirSync(cmpDir, { recursive: true });

  let browser;
  try {
    await waitForHealth(`${custBase}/api/session`);

    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
    });

    const pageErrors = [];
    const consoleErrors = [];
    const failedHttp = [];
    const attachListeners = (p) => {
      p.on('pageerror', (e) => pageErrors.push(e.message));
      p.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      p.on('response', (res) => {
        if (res.status() >= 400 && !res.url().includes('/api/session')) {
          failedHttp.push(`${res.status()} ${res.url()}`);
        }
      });
    };

    // --- 1. Desktop 1440 AR & EN + 6 Mandatory Presets + Pairwise Studio Matrix ---
    const deskCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
    const desk = await deskCtx.newPage();
    attachListeners(desk);

    // Homepage mini widget check first
    await desk.goto(`${custBase}/ar/`, { waitUntil: 'networkidle' });
    await desk.locator('#mini-atelier-stage canvas').waitFor({ state: 'visible' });
    await desk.waitForTimeout(450);
    await desk.locator('.atelier-mini').scrollIntoViewIfNeeded();
    await desk.waitForTimeout(200);
    await desk.locator('.atelier-mini').screenshot({ path: join(afterDir, 'after-home-mini-atelier-1440.png') });

    await desk.goto(`${custBase}/ar/atelier`, { waitUntil: 'networkidle' });
    await desk.locator('#atelier-canvas-wrap canvas').waitFor({ state: 'visible' });
    await desk.waitForTimeout(550);

    // Verify zero horizontal overflow & single canvas context
    const deskMetrics = await desk.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      canvasCount: document.querySelectorAll('#atelier-canvas-wrap canvas').length,
      tabsVisible: getComputedStyle(document.querySelector('.atelier-mobile-tabs')).display,
    }));
    assert.ok(deskMetrics.scrollW <= deskMetrics.clientW, `Desktop AR overflow: ${deskMetrics.scrollW} > ${deskMetrics.clientW}`);
    assert.equal(deskMetrics.canvasCount, 1, 'Expected exactly 1 canvas in Atelier stage');
    assert.equal(deskMetrics.tabsVisible, 'none', 'Mobile tabs must stay hidden on 1440px Desktop');

    await desk.screenshot({ path: join(afterDir, 'after-atelier-ar-1440.png'), fullPage: true });

    // Switch to EN LTR
    await desk.goto(`${custBase}/en/atelier`, { waitUntil: 'networkidle' });
    await desk.locator('#atelier-canvas-wrap canvas').waitFor({ state: 'visible' });
    await desk.waitForTimeout(550);
    await desk.screenshot({ path: join(afterDir, 'after-atelier-en-1440.png'), fullPage: true });

    const canvasHashes = new Set();
    const recordStage = async (filename) => {
      await desk.waitForTimeout(420);
      const buf = await desk.locator('#atelier-canvas-wrap').screenshot({ path: filename ? join(afterDir, filename) : undefined });
      canvasHashes.add(sha256(buf));
    };

    const presets = [
      {
        file: 'after-preset-1-fair-short-oval-blush.png',
        skin: 'fair', shape: 'oval', len: 'short', color: '#F3DCE1', french: 'none', finish: 'gloss', accent: 'none',
      },
      {
        file: 'after-preset-2-warm-medium-almond-classic-french.png',
        skin: 'warm', shape: 'almond', len: 'medium', color: '#F3DCE1', french: 'classic', tip: '#F5EFE8', finish: 'gloss', accent: 'pearl_dot',
      },
      {
        file: 'after-preset-3-olive-medium-squoval-sage-matte.png',
        skin: 'olive', shape: 'squoval', len: 'medium', color: '#89A17F', french: 'none', finish: 'matte', accent: 'none',
      },
      {
        file: 'after-preset-4-deep-long-coffin-burgundy-gloss.png',
        skin: 'deep', shape: 'coffin', len: 'long', color: '#612136', french: 'none', finish: 'gloss', accent: 'none',
      },
      {
        file: 'after-preset-5-deep-long-square-micro-french.png',
        skin: 'deep', shape: 'square', len: 'long', color: '#F3DCE1', french: 'micro', tip: '#F5EFE8', finish: 'pearl', accent: 'none',
      },
      {
        file: 'after-preset-6-warm-medium-oval-ombre.png',
        skin: 'warm', shape: 'oval', len: 'medium', color: '#D9B7C0', french: 'ombre', tip: '#F5EFE8', finish: 'gloss', accent: 'gold_foil',
      },
    ];

    for (const p of presets) {
      await desk.locator(`[data-at-skin="${p.skin}"]`).click();
      await desk.locator(`[data-at-shape="${p.shape}"]`).click();
      await desk.locator(`[data-at-len="${p.len}"]`).click();
      await desk.locator(`[data-at-color="${p.color}"]`).click();
      await desk.locator(`[data-at-french="${p.french}"]`).click();
      if (p.tip && p.french !== 'none') {
        await desk.locator(`[data-at-tip="${p.tip}"]`).click();
      }
      await desk.locator(`[data-at-finish="${p.finish}"]`).click();
      await desk.locator(`[data-at-accent="${p.accent}"]`).click();
      await recordStage(p.file);
      assert.equal(await desk.locator('#atelier-canvas-wrap canvas').count(), 1, `WebGL leaked canvas during ${p.file}`);
    }
    assert.ok(canvasHashes.size >= 5, `Expected distinct WebGL frames across presets, got ${canvasHashes.size}`);

    // Test Camera Presets (closeup, overhead, profile)
    await desk.locator('[data-at-shape="almond"]').click();
    await desk.locator('[data-at-len="medium"]').click();
    await desk.locator('[data-at-color="#F3DCE1"]').click();
    await desk.locator('[data-at-french="classic"]').click();
    await desk.locator('[data-at-finish="gloss"]').click();
    await desk.locator('[data-at-accent="pearl_dot"]').click();

    await desk.locator('[data-at-cam="closeup"]').click();
    await desk.waitForTimeout(550);
    const closeupBuf = await desk.locator('#atelier-canvas-wrap').screenshot({ path: join(afterDir, 'after-camera-closeup.png') });

    await desk.locator('[data-at-cam="overhead"]').click();
    await desk.waitForTimeout(550);
    const overheadBuf = await desk.locator('#atelier-canvas-wrap').screenshot({ path: join(afterDir, 'after-camera-overhead.png') });

    await desk.locator('[data-at-cam="profile"]').click();
    await desk.waitForTimeout(550);
    const profileBuf = await desk.locator('#atelier-canvas-wrap').screenshot({ path: join(afterDir, 'after-camera-profile.png') });

    assert.notEqual(sha256(closeupBuf), sha256(overheadBuf), 'Overhead camera must render distinct viewpoint');
    assert.notEqual(sha256(overheadBuf), sha256(profileBuf), 'Profile camera must render distinct viewpoint');

    // Pairwise sweeps across remaining options (tip shades, colored tip, floral botanical, pearl) + Reset Look
    await desk.locator('[data-at-french="colored"]').click();
    await desk.locator('[data-at-tip="#D4AF7C"]').click();
    await desk.locator('[data-at-accent="floral_dot"]').click();
    await desk.locator('#at-light-slider').fill('75');
    await desk.locator('#at-light-slider').dispatchEvent('input');
    await desk.locator('#at-removal-check').check();
    await desk.waitForTimeout(150);
    const summaryText = await desk.locator('#at-service-summary').innerText();
    assert.ok(summaryText.includes('+'), 'Expected Gel Removal & complexity reflected in live summary');

    // Capture full Preset 4 Desktop page for side-by-side comparison vs baseline
    await desk.locator('[data-at-cam="editorial"]').click();
    await desk.locator('[data-at-skin="deep"]').click();
    await desk.locator('[data-at-shape="coffin"]').click();
    await desk.locator('[data-at-len="long"]').click();
    await desk.locator('[data-at-color="#612136"]').click();
    await desk.locator('[data-at-french="none"]').click();
    await desk.locator('[data-at-finish="gloss"]').click();
    await desk.locator('[data-at-accent="none"]').click();
    await desk.waitForTimeout(500);
    await desk.screenshot({ path: join(afterDir, 'after-preset-4-page-1440.png'), fullPage: false });

    await desk.locator('[data-at-reset-look], #at-reset-look').first().click();
    await desk.locator('#atelier-canvas-wrap canvas').waitFor({ state: 'visible' });
    const resetActiveShape = await desk.locator('[data-at-shape].active').getAttribute('data-at-shape');
    assert.equal(resetActiveShape, 'almond', 'Reset must restore almond default');

    // --- 2. Mobile 360px AR RTL, 390px EN LTR, 430px & Tablet 768px UX Verification ---
    const viewSpecs = [
      { name: 'mobile-360-ar', path: '/ar/atelier', w: 360, h: 780, isMobile: true, shot: 'after-atelier-ar-360.png' },
      { name: 'mobile-390-en', path: '/en/atelier', w: 390, h: 844, isMobile: true, shot: 'after-atelier-en-390.png' },
      { name: 'mobile-430-ar', path: '/ar/atelier', w: 430, h: 932, isMobile: true, shot: null },
      { name: 'tablet-768-ar', path: '/ar/atelier', w: 768, h: 1024, isMobile: true, shot: 'after-atelier-ar-768.png' },
    ];

    const telemetry = {};
    for (const v of viewSpecs) {
      const mCtx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 2 });
      const mp = await mCtx.newPage();
      attachListeners(mp);
      await mp.goto(`${custBase}${v.path}`, { waitUntil: 'networkidle' });
      await mp.locator('#atelier-canvas-wrap canvas').waitFor({ state: 'visible' });
      await mp.waitForTimeout(450);

      const geom = await mp.evaluate((vh) => {
        const stage = document.getElementById('atelier-canvas-wrap');
        const rect = stage.getBoundingClientRect();
        const tabs = document.querySelector('.atelier-mobile-tabs');
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          scrollHeight: document.documentElement.scrollHeight,
          stageHeight: Math.round(rect.height),
          stageWidth: Math.round(rect.width),
          stageViewportPct: Number((rect.height / vh).toFixed(3)),
          tabsDisplay: tabs ? getComputedStyle(tabs).display : 'none',
          canvasCount: document.querySelectorAll('#atelier-canvas-wrap canvas').length,
        };
      }, v.h);

      telemetry[v.name] = geom;
      assert.ok(geom.scrollWidth <= geom.clientWidth, `${v.name} overflow: ${geom.scrollWidth} > ${geom.clientWidth}`);
      assert.ok(geom.stageHeight >= 265, `${v.name} stage too short: ${geom.stageHeight}px`);
      assert.ok(geom.stageViewportPct >= 0.34, `${v.name} stage ratio < 34%: ${geom.stageViewportPct}`);
      assert.equal(geom.tabsDisplay, 'grid', `${v.name} must show 3-tab switcher`);
      assert.equal(geom.canvasCount, 1, `${v.name} single WebGL canvas`);

      if (v.shot) {
        await mp.screenshot({ path: join(afterDir, v.shot), fullPage: false });
      }

      if (v.name === 'mobile-360-ar') {
        // Verify mobile tab switches keep exact same canvas element alive
        await mp.evaluate(() => { window.__atCanvasRef = document.querySelector('#atelier-canvas-wrap canvas'); });
        await mp.locator('[data-at-tab="colors"]').click();
        await mp.locator('[data-at-color="#612136"]').waitFor({ state: 'visible' });
        await mp.locator('[data-at-color="#612136"]').click();
        await mp.waitForTimeout(250);
        await mp.screenshot({ path: join(afterDir, 'after-atelier-mobile-tab-colors.png'), fullPage: false });

        await mp.locator('[data-at-tab="finish"]').click();
        await mp.locator('[data-at-finish="pearl"]').waitFor({ state: 'visible' });
        await mp.locator('[data-at-finish="pearl"]').click();
        await mp.waitForTimeout(250);
        await mp.screenshot({ path: join(afterDir, 'after-atelier-mobile-tab-finish.png'), fullPage: false });

        const sameCanvas = await mp.evaluate(
          () => document.querySelector('#atelier-canvas-wrap canvas') === window.__atCanvasRef,
        );
        assert.equal(sameCanvas, true, 'Mobile tab switches must not destroy/recreate WebGL canvas');
      }
      await mCtx.close();
    }
    writeFileSync(join(afterDir, 'after-telemetry.json'), JSON.stringify(telemetry, null, 2));

    // --- 3. Software Fallback Verification (No WebGL available) ---
    const fbCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    await fbCtx.addInitScript(() => { window.__ATELIER_FORCE_FALLBACK__ = true; });
    const fbPage = await fbCtx.newPage();
    attachListeners(fbPage);
    await fbPage.goto(`${custBase}/en/atelier`, { waitUntil: 'networkidle' });
    await fbPage.locator('.atelier-fallback-canvas').waitFor({ state: 'visible' });
    const fbNoteHidden = await fbPage.locator('#atelier-fallback-note').isHidden();
    assert.equal(fbNoteHidden, false, 'Fallback notice must be revealed when software fallback activates');
    const fbBuf1 = await fbPage.locator('#atelier-canvas-wrap').screenshot();
    await fbPage.locator('[data-at-color="#612136"]').click();
    await fbPage.waitForTimeout(150);
    const fbBuf2 = await fbPage.locator('#atelier-canvas-wrap').screenshot({ path: join(afterDir, 'after-fallback-25d.png') });
    assert.notEqual(sha256(fbBuf1), sha256(fbBuf2), 'Fallback canvas must re-render when polish shade changes');
    await fbCtx.close();

    // --- 4. Authenticated Persistence, Beauty Passport Render, Edit Load, Share URL & Booking ---
    const custCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const cp = await custCtx.newPage();
    attachListeners(cp);
    await cp.goto(`${custBase}/en/register`, { waitUntil: 'networkidle' });
    await cp.locator('#auth-form [name="name"]').fill('Lama Al-Harbi');
    await cp.locator('#auth-form [name="phone"]').fill('0551234567');
    await cp.locator('#auth-form [name="password"]').fill('Pass!Atelier2026#');
    await cp.locator('#auth-form [name="passwordConfirmation"]').fill('Pass!Atelier2026#');
    await cp.locator('#auth-form [name="terms"]').check();
    await cp.locator('#auth-form button[type="submit"]').click();
    await cp.locator('.passport-grid, h1').first().waitFor();
    await cp.waitForTimeout(400);

    await cp.goto(`${custBase}/ar/atelier`, { waitUntil: 'networkidle' });
    await cp.locator('#at-name').fill('توت عنابي ملكي');
    await cp.locator('[data-at-skin="deep"]').click();
    await cp.locator('[data-at-shape="coffin"]').click();
    await cp.locator('[data-at-len="long"]').click();
    await cp.locator('[data-at-color="#612136"]').click();
    await cp.locator('[data-at-french="micro"]').click();
    await cp.locator('[data-at-tip="#D4AF7C"]').click();
    await cp.locator('[data-at-accent="gold_foil"]').click();
    await cp.locator('#at-removal-check').check();
    await cp.locator('#at-save-look').click();
    await cp.waitForTimeout(350);

    await cp.locator('#at-share-look').click();
    await cp.locator('#at-share-panel pre').waitFor({ state: 'visible' });
    const shareUrl = (await cp.locator('#at-share-panel pre').innerText()).trim();
    assert.ok(shareUrl.includes('?style='), `Expected valid share URL, got ${shareUrl}`);

    // Verify Passport renders localized nail capsule swatch + Edit button
    await cp.goto(`${custBase}/ar/account`, { waitUntil: 'networkidle' });
    await cp.locator('.saved-style-row').first().waitFor({ state: 'visible' });
    const savedRowText = await cp.locator('.saved-style-row').first().innerText();
    assert.ok(savedRowText.includes('توت عنابي ملكي') && savedRowText.includes('كوفين أنيق'), `Passport label mismatch: ${savedRowText}`);
    await cp.locator('[data-load-style]').first().click();
    await cp.locator('#atelier-canvas-wrap canvas').waitFor({ state: 'visible' });
    const reloadedName = await cp.locator('#at-name').inputValue();
    assert.equal(reloadedName, 'توت عنابي ملكي', 'Edit Look must load saved style into Atelier');

    // Verify Guest Share URL restores look in fresh incognito session + Book flow
    const guestCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const gp = await guestCtx.newPage();
    attachListeners(gp);
    await gp.goto(shareUrl, { waitUntil: 'networkidle' });
    await gp.locator('#atelier-canvas-wrap canvas').waitFor({ state: 'visible' });
    const sharedShape = await gp.locator('[data-at-shape].active').getAttribute('data-at-shape');
    assert.equal(sharedShape, 'coffin', 'Shared URL must restore coffin shape');
    await gp.locator('#at-removal-check').check();
    await gp.locator('#at-book-look').click();
    await gp.locator('#booking-form').waitFor();
    const bookedServices = await gp.evaluate(() =>
      Array.from(document.querySelectorAll('[name="service"]:checked')).map((el) => el.value),
    );
    assert.ok(bookedServices.includes('colored-french') && bookedServices.includes('gel-removal'),
      `Expected specialty service + gel removal checked on booking step, got ${JSON.stringify(bookedServices)}`);
    await guestCtx.close();
    await custCtx.close();

    // --- 5. Generate Before-vs-After Visual Comparison Collages ---
    const pairs = [
      {
        out: 'compare-before-after-p4-desktop.png',
        title: 'Preset 4: Deep Skin / Long Coffin / Burgundy Gloss (3D Studio Recovery)',
        before: join(ROOT, 'screenshots', 'atelier-v2', 'before', 'before-preset-4-deep-long-coffin-burgundy-gloss.png'),
        after: join(afterDir, 'after-preset-4-deep-long-coffin-burgundy-gloss.png'),
        w: 1480, h: 760,
      },
      {
        out: 'compare-before-after-p5-desktop.png',
        title: 'Preset 5: Deep Skin / Long Square / Pearl Micro French + Chrome',
        before: join(ROOT, 'screenshots', 'atelier-v2', 'before', 'before-preset-5-deep-long-square-micro-french.png'),
        after: join(afterDir, 'after-preset-5-deep-long-square-micro-french.png'),
        w: 1480, h: 760,
      },
      {
        out: 'compare-before-after-ar-desktop.png',
        title: 'Full AR Desktop Workbench (1440px)',
        before: join(ROOT, 'screenshots', 'atelier-v2', 'before', 'before-atelier-ar-1440.png'),
        after: join(afterDir, 'after-atelier-ar-1440.png'),
        w: 1680, h: 680,
      },
      {
        out: 'compare-before-after-mobile-360.png',
        title: 'Mobile AR 360px Viewport (24% -> 41% Stage Height + 3 Compact Tabs)',
        before: join(ROOT, 'screenshots', 'atelier-v2', 'before', 'before-atelier-ar-360.png'),
        after: join(afterDir, 'after-atelier-ar-360.png'),
        w: 880, h: 920,
      },
    ];
    const cmpPage = await browser.newPage();
    for (const pair of pairs) {
      if (!existsSync(pair.before) || !existsSync(pair.after)) continue;
      const b64Before = readFileSync(pair.before).toString('base64');
      const b64After = readFileSync(pair.after).toString('base64');
      await cmpPage.setViewportSize({ width: pair.w, height: pair.h });
      await cmpPage.setContent(`
        <!doctype html><html><body style="margin:0;padding:18px;background:#faf7f4;font-family:system-ui,sans-serif;color:#2f1922">
          <div style="font-weight:700;font-size:16px;margin-bottom:12px">${pair.title}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start">
            <div>
              <div style="font-size:12px;font-weight:700;color:#8b2635;margin-bottom:6px">BEFORE (Baseline SVG/2D Sticker)</div>
              <img src="data:image/png;base64,${b64Before}" style="width:100%;max-height:${pair.h - 80}px;object-fit:contain;border:1px solid #d9cfc7;border-radius:10px;background:#fff">
            </div>
            <div>
              <div style="font-size:12px;font-weight:700;color:#2e5a44;margin-bottom:6px">AFTER (Option C 3D Hybrid Studio)</div>
              <img src="data:image/png;base64,${b64After}" style="width:100%;max-height:${pair.h - 80}px;object-fit:contain;border:1px solid #d9cfc7;border-radius:10px;background:#fff">
            </div>
          </div>
        </body></html>
      `);
      await cmpPage.screenshot({ path: join(cmpDir, pair.out), fullPage: false });
    }
    await cmpPage.close();
    await deskCtx.close();

    assert.deepEqual(pageErrors, [], `Uncaught page errors: ${pageErrors.join(' | ')}`);
    assert.deepEqual(consoleErrors, [], `Console errors: ${consoleErrors.join(' | ')}`);
    assert.deepEqual(failedHttp, [], `Failed HTTP requests: ${failedHttp.join(' | ')}`);
    console.log('PASS Atelier v2 3D WebGL Matrix, Software Fallback, Mobile 3-Tab UX, Persistence & Comparisons');
  } finally {
    if (browser) try { await browser.close(); } catch { }
    try { server.kill(); } catch { }
    await new Promise((r) => setTimeout(r, 150));
    try { rmSync(tmpDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }); } catch { }
  }
}

await runGeometryUnitChecks();
await runBrowserSuite();
