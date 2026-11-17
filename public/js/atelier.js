import { $, api, esc, href, money, nameOf, state, t, toast } from './state.js';
import { head } from './components.js';
import { trackFunnel } from './motion.js';
import { Atelier3DRenderer } from './atelier/renderer-3d.js';
import { paintAtelier25DCanvas } from './atelier/renderer-25d.js';
import { evaluateAtelierServiceMatch } from './atelier/service-mapping.js';

export const NAIL_SHADES = [
  { id: 'sheer-blush', hex: '#F3DCE1', ar: 'وردي شفاف', en: 'Sheer Blush' },
  { id: 'warm-ivory', hex: '#F7EFE7', ar: 'عاجي حليبي', en: 'Milky Ivory' },
  { id: 'dusty-rose', hex: '#D9B7C0', ar: 'وردي ناعم', en: 'Dusty Rose' },
  { id: 'mauve-silk', hex: '#C49AA6', ar: 'موف حريري', en: 'Mauve Silk' },
  { id: 'burgundy-silk', hex: '#612136', ar: 'عنابي حريري', en: 'Burgundy Silk' },
  { id: 'sage-mist', hex: '#89A17F', ar: 'أخضر مريمية', en: 'Sage Mist' },
  { id: 'caramel-nude', hex: '#D7B9A5', ar: 'نيود دافئ', en: 'Caramel Nude' },
  { id: 'rose-quartz', hex: '#E6BCC4', ar: 'كوارتز وردي', en: 'Rose Quartz' },
  { id: 'deep-plum', hex: '#503C45', ar: 'برقوقي عميق', en: 'Deep Plum' },
  { id: 'champagne-gold', hex: '#DFC5A2', ar: 'شامبين ذهبي', en: 'Champagne Gold' },
];

export const TIP_SHADES = [
  { hex: '#F5EFE8', ar: 'عاجي كلاسيك', en: 'Classic Ivory' },
  { hex: '#D9B7C0', ar: 'وردي ناعم', en: 'Dusty Pink' },
  { hex: '#607257', ar: 'مريمية داكن', en: 'Deep Sage' },
  { hex: '#D4AF7C', ar: 'ذهبي وردي', en: 'Rose Gold' },
  { hex: '#612136', ar: 'عنابي عميق', en: 'Deep Burgundy' },
];

export const SKIN_TONES = [
  { id: 'fair', base: '#EEC9B8', ar: 'فاتحة', en: 'Fair' },
  { id: 'warm', base: '#DDA982', ar: 'حنطية دافئة', en: 'Warm Sand' },
  { id: 'olive', base: '#BC8861', ar: 'قمحية زيتونية', en: 'Olive' },
  { id: 'deep', base: '#714732', ar: 'سمراء غنية', en: 'Deep Rich' },
];

export const SHAPES = [
  ['almond', 'لوزي', 'Almond'],
  ['oval', 'بيضاوي', 'Oval'],
  ['squoval', 'مربع ناعم', 'Soft Square'],
  ['square', 'مربع', 'Square'],
  ['coffin', 'كوفين أنيق', 'Coffin'],
];

export const LENGTHS = [
  ['short', 'قصير', 'Short'],
  ['medium', 'متوسط', 'Medium'],
  ['long', 'طويل', 'Long'],
];

export const FRENCH_STYLES = [
  ['none', 'طلاء كامل', 'Full Polish'],
  ['classic', 'فرنش كلاسيك', 'Classic French'],
  ['micro', 'مايكرو فرنش', 'Micro French'],
  ['colored', 'أطراف ملونة', 'Colored Tip'],
  ['ombre', 'تدرج ناعم (أومبري)', 'Soft Ombre'],
];

export const FINISHES = [
  ['gloss', 'لمعة زجاجية', 'High Gloss'],
  ['pearl', 'لؤلؤي ناعم', 'Pearl Sheen'],
  ['matte', 'مخملي مطفي', 'Velvet Matte'],
];

export const ACCENTS = [
  ['none', 'طلاء صافٍ', 'Clean'],
  ['gold_foil', 'رقائق ذهب وردي', 'Rose Gold Foil'],
  ['pearl_dot', 'حبة لؤلؤ ناعمة', 'Pearl Cabochon'],
  ['floral_dot', 'لمسة زهرية ناعمة', 'Botanical Blossom'],
];

const CAMERA_VIEWS = [
  ['editorial', 'إطلالة شاملة', 'Full Hand'],
  ['closeup', 'عن قرب', 'Close-Up'],
  ['overhead', 'من الأعلى', 'Overhead'],
  ['profile', 'الجانب', 'Side Apex'],
];

const ACTIVE_RENDERERS = new Map();

export function disposeAtelierRenderers() {
  for (const entry of ACTIVE_RENDERERS.values()) {
    try {
      entry.renderer?.dispose?.();
    } catch {}
  }
  ACTIVE_RENDERERS.clear();
}

export function recommendedServiceForStyle(cfg = {}) {
  return evaluateAtelierServiceMatch(cfg).primaryServiceId;
}

export function localizedShapeLabel(shape) {
  const found = SHAPES.find((x) => x[0] === shape);
  return found ? t(found[1], found[2]) : String(shape || '');
}

export function localizedFinishLabel(finish) {
  const found = FINISHES.find((x) => x[0] === finish);
  return found ? t(found[1], found[2]) : String(finish || '');
}

export function localizedLengthLabel(len) {
  const found = LENGTHS.find((x) => x[0] === len);
  return found ? t(found[1], found[2]) : String(len || '');
}

// Lightweight fallback / non-WebGL preview stage markup (0 WebGL context cost unless mounted interactively)
export function paintAtelierCanvas(canvas, cfg, lightX = 42) {
  return paintAtelier25DCanvas(canvas, cfg, lightX);
}

export function renderNailPreviewSVG(cfg = state.atelier) {
  const isFrench = cfg.french_style && cfg.french_style !== 'none';
  const tipCss = isFrench ? esc(cfg.tip_color || '#F5EFE8') : esc(cfg.polish_color || '#F3DCE1');
  const radius =
    cfg.shape === 'square' ? '3px' : cfg.shape === 'squoval' ? '8px' : cfg.shape === 'coffin' ? '4px 4px 10px 10px' : '999px';
  return `
    <span class="atelier-swatch-nail" style="background:${esc(cfg.polish_color || '#F3DCE1')};border-radius:${radius}" aria-hidden="true">
      ${isFrench ? `<span class="atelier-swatch-tip" style="background:${tipCss}"></span>` : ''}
    </span>
  `;
}

function mountHybridStage(containerId, cfg, { interactive = true, onFallback } = {}) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return null;

  const prev = ACTIVE_RENDERERS.get(containerId);
  if (prev && prev.wrap === wrap && prev.mode === '3d' && !prev.renderer.disposed) {
    prev.renderer.setCameraPreset(cfg.cameraPreset || 'editorial', false);
    prev.renderer.updateConfig(cfg, { lightX: cfg.lightX ?? 42 });
    return prev;
  }
  if (prev) {
    try {
      prev.renderer?.dispose?.();
    } catch {}
    ACTIVE_RENDERERS.delete(containerId);
  }

  wrap.innerHTML = '';

  const activateFallback = (reason = 'webgl-unavailable') => {
    const existing = ACTIVE_RENDERERS.get(containerId);
    if (existing?.mode === '25d' && existing.canvas?.isConnected) {
      paintAtelier25DCanvas(existing.canvas, cfg, cfg.lightX ?? 42);
      return existing;
    }
    try {
      existing?.renderer?.dispose?.();
    } catch {}
    wrap.innerHTML = `
      <canvas class="atelier-hand-canvas atelier-fallback-canvas" width="720" height="720" role="img"
        aria-label="${t('معاينة استوديو تصميم الأظافر', 'Studio nail design preview')}">
      </canvas>
    `;
    const fbCanvas = wrap.querySelector('canvas');
    paintAtelier25DCanvas(fbCanvas, cfg, cfg.lightX ?? 42);
    const rec = { mode: '25d', wrap, canvas: fbCanvas, reason };
    ACTIVE_RENDERERS.set(containerId, rec);
    if (onFallback) onFallback(reason);
    const fbNote = document.getElementById('atelier-fallback-note');
    if (fbNote) fbNote.hidden = false;
    return rec;
  };

  // Explicit test hook / environment check for software fallback verification
  if (window.__ATELIER_FORCE_FALLBACK__) {
    return activateFallback('forced-fallback');
  }

  try {
    const ren = new Atelier3DRenderer(wrap, {
      interactive,
      onContextLost: () => activateFallback('webglcontextlost'),
    });
    ren.setCameraPreset(cfg.cameraPreset || 'editorial', true);
    ren.updateConfig(cfg, { lightX: cfg.lightX ?? 42, immediate: true });
    const rec = { mode: '3d', wrap, renderer: ren };
    ACTIVE_RENDERERS.set(containerId, rec);
    const fbNote = document.getElementById('atelier-fallback-note');
    if (fbNote) fbNote.hidden = true;
    return rec;
  } catch {
    return activateFallback('webgl-init-error');
  }
}

export function renderServiceSummaryHtml(cfg = state.atelier) {
  const match = evaluateAtelierServiceMatch(cfg);
  const svcs = state.catalog?.services || [];
  const svc = svcs.find((s) => s.id === match.primaryServiceId);
  const remSvc = svcs.find((s) => s.id === 'gel-removal');
  const highlights = state.lang === 'ar' ? match.highlightsAr : match.highlightsEn;
  const totalEst = Number(svc?.price || 0) + (state.atelier.includeRemoval ? Number(remSvc?.price || 0) : 0);
  const baseDur = Number(svc?.duration || 45);
  const totalMins = baseDur + match.extraMinutes + (state.atelier.includeRemoval ? Number(remSvc?.duration || 25) : 0);

  return `
    <div class="atelier-tier-row">
      <span class="atelier-tier-pill">${esc(t(match.tierAr, match.tierEn))}</span>
      <span class="muted" style="font-size:13px"><bdi>~${totalMins}</bdi> ${t('دقيقة تقديرياً', 'min est.')}</span>
    </div>
    ${
      svc
        ? `<p class="atelier-matched-line">
             ${t('الخدمة المقترحة:', 'Matched service:')}
             <strong>${esc(nameOf(svc))}</strong>
             (<bdi>${money(totalEst)}</bdi>)
           </p>`
        : ''
    }
    ${
      highlights.length
        ? `<ul class="atelier-highlights">
             ${highlights.map((item) => `<li>${esc(item)}</li>`).join('')}
           </ul>`
        : ''
    }
    <p class="muted atelier-prep-note">${esc(t(match.prepAdvisoryAr, match.prepAdvisoryEn))}</p>
    ${
      remSvc
        ? `<label class="check atelier-removal-opt">
             <input type="checkbox" id="at-removal-check" ${cfg.includeRemoval ? 'checked' : ''}>
             <span>${t('إضافة إزالة جل سابق', 'Include soak-off Gel Removal')} (+<bdi>${money(remSvc.price)}</bdi>)</span>
           </label>`
        : ''
    }
  `;
}

export function atelierMiniWidget() {
  const cfg = state.atelier;
  return `
    <div class="atelier-mini card">
      <div class="atelier-mini-grid">
        <div class="atelier-stage atelier-stage-mini" id="mini-atelier-stage" role="region" aria-label="${t('معاينة ثلاثية الأبعاد لتصميم الأظافر', 'Interactive 3D nail design preview')}"></div>
        <div>
          <span class="eyebrow">${t('أتيليه J للأظافر · استوديو ثلاثي الأبعاد', 'J NAIL ATELIER · 3D INTERACTIVE STUDIO')}</span>
          <h3>${t('صمّمي إطلالة أظافرك قبل الحجز', 'Design and inspect your manicure in 3D before booking')}</h3>
          <p class="muted">${t(
            'جرّبي شكل الظفر واللون واللمعة على يد ثلاثية الأبعاد بوضوح استوديو حقيقي، واحفظي التصميم أو احجزي مباشرة.',
            'Explore shapes, shades, French styles, and finishes on an interactive 3D studio hand, then save or book your look.',
          )}</p>
          <div class="swatch-row" style="margin:14px 0">
            ${NAIL_SHADES.slice(0, 6)
              .map(
                (s) =>
                  `<button type="button" class="swatch ${cfg.polish_color === s.hex ? 'active' : ''}" data-mini-shade="${s.hex}" title="${t(s.ar, s.en)}" aria-label="${t(s.ar, s.en)}" style="background:${s.hex}"></button>`,
              )
              .join('')}
          </div>
          <div class="chip-row" style="margin-bottom:18px">
            ${SHAPES.slice(0, 4)
              .map(
                ([id, ar, en]) =>
                  `<button type="button" class="mini-chip ${cfg.shape === id ? 'active' : ''}" data-mini-shape="${id}">${t(ar, en)}</button>`,
              )
              .join('')}
          </div>
          <a class="btn small" href="${href('atelier')}">${t('افتحي أتيليه الأظافر الكامل', 'Open Full 3D Nail Atelier')}</a>
        </div>
      </div>
    </div>
  `;
}

export function atelierPage() {
  const cfg = state.atelier;
  const activeTab = cfg.activeTab || 'shape';
  const curCam = cfg.cameraPreset || 'editorial';

  return `
    <main id="main" class="wrap atelier-main">
      ${head(
        t('أتيليه J للأظافر', 'J Nail Atelier'),
        t('عايني الشكل والطول واللون والفرنش بزاوية 360 درجة على نموذج يد ثلاثي الأبعاد قبل طلب موعدك.', 'Customize nail shape, length, polish shade, French tip, and finish on an interactive 3D manicure stage before booking.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('أتيليه الأظافر', 'J Nail Atelier'), '']],
      )}

      <div class="atelier-layout">
        <div class="atelier-canvas-card card">
          <div class="atelier-viewer-head">
            <span class="atelier-drag-hint">${t('اسحبي باللمس لتدوير اليد · اختاري الزاوية', 'Drag to orbit · Select angle')}</span>
            <button type="button" class="btn small light atelier-reset-btn" id="at-reset-look">${t('إعادة ضبط', 'Reset')}</button>
          </div>

          <div id="atelier-canvas-wrap" class="atelier-stage atelier-stage-3d" role="region" aria-label="${t('منصة المعاينة ثلاثية الأبعاد لتصميم الأظافر', 'Interactive 3D hand and manicure preview stage')}"></div>

          <div id="atelier-fallback-note" class="muted" style="font-size:12px;margin-top:6px" hidden>
            ${t('تم تفعيل المعاينة الخفيفة (WebGL غير نشط على هذا الجهاز).', 'Lightweight studio fallback active (WebGL unavailable on this device).')}
          </div>

          <div class="atelier-cam-bar" role="group" aria-label="${t('زوايا المعاينة', 'Camera angles')}">
            ${CAMERA_VIEWS.map(
              ([id, ar, en]) =>
                `<button type="button" class="mini-chip atelier-cam-pill ${curCam === id ? 'active' : ''}" data-at-cam="${id}">${t(ar, en)}</button>`,
            ).join('')}
          </div>

          <div class="atelier-skin-bar">
            <span class="muted">${t('لون البشرة:', 'Skin undertone:')}</span>
            <div class="swatch-row">
              ${SKIN_TONES.map(
                (sk) =>
                  `<button type="button" class="swatch small ${(cfg.skin || 'warm') === sk.id ? 'active' : ''}" data-at-skin="${sk.id}" title="${t(sk.ar, sk.en)}" aria-label="${t(sk.ar, sk.en)}" style="background:${sk.base}"></button>`,
              ).join('')}
            </div>
          </div>

          <div id="at-share-panel" ${cfg.lastShareUrl ? '' : 'hidden'}>
            ${
              cfg.lastShareUrl
                ? `<div class="success atelier-share-box">
                     <p style="margin-bottom:6px"><strong>${t('تم إنشاء رابط المشاركة الخاص بك:', 'Your share link is ready:')}</strong></p>
                     <pre style="margin:0;padding:8px 10px" dir="ltr">${esc(cfg.lastShareUrl)}</pre>
                     <button type="button" class="btn small light" id="copy-style-url" style="margin-top:8px">${t('نسخ الرابط', 'Copy URL')}</button>
                   </div>`
                : ''
            }
          </div>
        </div>

        <div class="atelier-controls card">
          <div class="atelier-mobile-tabs" role="tablist" aria-label="${t('أقسام تخصيص الأظافر', 'Manicure studio controls')}">
            <button type="button" role="tab" class="atelier-tab-btn ${activeTab === 'shape' ? 'active' : ''}" aria-selected="${activeTab === 'shape'}" data-at-tab="shape">${t('الشكل والطول', 'Shape & Length')}</button>
            <button type="button" role="tab" class="atelier-tab-btn ${activeTab === 'colors' ? 'active' : ''}" aria-selected="${activeTab === 'colors'}" data-at-tab="colors">${t('الألوان والفرنش', 'Colors & Styles')}</button>
            <button type="button" role="tab" class="atelier-tab-btn ${activeTab === 'finish' ? 'active' : ''}" aria-selected="${activeTab === 'finish'}" data-at-tab="finish">${t('اللمسة والزخرفة', 'Finish & Details')}</button>
          </div>

          <div class="atelier-panel ${activeTab === 'shape' ? 'is-active' : ''}" data-at-panel="shape">
            <div class="control-group">
              <label class="control-label" for="at-name">${t('اسم التصميم (اختياري للحفظ)', 'Look name (optional)')}</label>
              <input id="at-name" type="text" maxlength="80" value="${esc(cfg.name || '')}" placeholder="${t('مثال: فرنش لؤلؤي ناعم', 'e.g. Eid Soft French')}">
            </div>

            <div class="control-group">
              <span class="control-label">1. ${t('شكل الظفر', 'Nail Shape')}</span>
              <div class="chip-row">
                ${SHAPES.map(
                  ([id, ar, en]) =>
                    `<button type="button" class="mini-chip ${cfg.shape === id ? 'active' : ''}" data-at-shape="${id}">${t(ar, en)}</button>`,
                ).join('')}
              </div>
            </div>

            <div class="control-group">
              <span class="control-label">2. ${t('طول الأظافر', 'Length')}</span>
              <div class="chip-row">
                ${LENGTHS.map(
                  ([id, ar, en]) =>
                    `<button type="button" class="mini-chip ${cfg.length === id ? 'active' : ''}" data-at-len="${id}">${t(ar, en)}</button>`,
                ).join('')}
              </div>
            </div>
          </div>

          <div class="atelier-panel ${activeTab === 'colors' ? 'is-active' : ''}" data-at-panel="colors">
            <div class="control-group">
              <span class="control-label">3. ${t('درجة اللون الأساسية', 'Base Shade')}</span>
              <div class="swatch-row">
                ${NAIL_SHADES.map(
                  (s) =>
                    `<button type="button" class="swatch ${cfg.polish_color === s.hex ? 'active' : ''}" data-at-color="${s.hex}" title="${t(s.ar, s.en)}" aria-label="${t(s.ar, s.en)}" style="background:${s.hex}"></button>`,
                ).join('')}
              </div>
            </div>

            <div class="control-group">
              <span class="control-label">4. ${t('نمط الفرنش والأطراف', 'Tip / French Style')}</span>
              <div class="chip-row">
                ${FRENCH_STYLES.map(
                  ([id, ar, en]) =>
                    `<button type="button" class="mini-chip ${cfg.french_style === id ? 'active' : ''}" data-at-french="${id}">${t(ar, en)}</button>`,
                ).join('')}
              </div>
            </div>

            <div class="control-group" id="at-tip-color-group" ${cfg.french_style === 'none' ? 'hidden' : ''}>
              <span class="control-label">${t('لون الطرف الفرنسي', 'French Tip Shade')}</span>
              <div class="swatch-row">
                ${TIP_SHADES.map(
                  (s) =>
                    `<button type="button" class="swatch small ${cfg.tip_color === s.hex ? 'active' : ''}" data-at-tip="${s.hex}" title="${t(s.ar, s.en)}" aria-label="${t(s.ar, s.en)}" style="background:${s.hex}"></button>`,
                ).join('')}
              </div>
            </div>
          </div>

          <div class="atelier-panel ${activeTab === 'finish' ? 'is-active' : ''}" data-at-panel="finish">
            <div class="control-group">
              <span class="control-label">5. ${t('اللمسة النهائية (التغطية)', 'Top Coat Finish')}</span>
              <div class="chip-row">
                ${FINISHES.map(
                  ([id, ar, en]) =>
                    `<button type="button" class="mini-chip ${cfg.finish === id ? 'active' : ''}" data-at-finish="${id}">${t(ar, en)}</button>`,
                ).join('')}
              </div>
            </div>

            <div class="control-group">
              <span class="control-label">6. ${t('الزخرفة والإضافة الدقيقة', 'Botanical Detail')}</span>
              <div class="chip-row">
                ${ACCENTS.map(
                  ([id, ar, en]) =>
                    `<button type="button" class="mini-chip ${cfg.accent === id ? 'active' : ''}" data-at-accent="${id}">${t(ar, en)}</button>`,
                ).join('')}
              </div>
            </div>

            <div class="control-group atelier-light-group">
              <label class="control-label" for="at-light-slider">${t('زاوية إضاءة الاستوديو', 'Studio Softbox Angle')}</label>
              <input id="at-light-slider" type="range" min="15" max="85" step="1" value="${Math.round(cfg.lightX ?? 42)}" dir="ltr">
            </div>
          </div>

          <div class="atelier-action-box">
            <div id="at-service-summary">${renderServiceSummaryHtml(cfg)}</div>
            <div class="hero-actions atelier-cta-row">
              <button type="button" class="btn" id="at-book-look">${t('اطلبي الخدمة بهذا التصميم', 'Book This Look')}</button>
              <button type="button" class="btn light" id="at-save-look">${t('حفظ في جواز الجمال', 'Save to Passport')}</button>
              <button type="button" class="btn light" id="at-share-look">${t('مشاركة التصميم', 'Share Look')}</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  `;
}

export function bindAtelier(goFn, renderFn) {
  function syncActiveRenderers() {
    if (document.getElementById('atelier-canvas-wrap')) {
      mountHybridStage('atelier-canvas-wrap', state.atelier, { interactive: true });
    }
    if (document.getElementById('mini-atelier-stage')) {
      mountHybridStage('mini-atelier-stage', state.atelier, { interactive: false });
    }
  }

  function refreshInPlace() {
    syncActiveRenderers();
    const tipGroup = document.getElementById('at-tip-color-group');
    if (tipGroup) tipGroup.hidden = state.atelier.french_style === 'none';

    const summaryEl = document.getElementById('at-service-summary');
    if (summaryEl) {
      summaryEl.innerHTML = renderServiceSummaryHtml(state.atelier);
      bindRemovalCheckbox();
    }
  }

  function bindRemovalCheckbox() {
    document.getElementById('at-removal-check')?.addEventListener('change', (e) => {
      state.atelier.includeRemoval = !!e.target.checked;
      refreshInPlace();
    });
  }

  syncActiveRenderers();
  bindRemovalCheckbox();

  // Homepage mini widget controls
  document.querySelectorAll('[data-mini-shade]').forEach((b) => {
    b.onclick = () => {
      state.atelier.polish_color = b.dataset.miniShade;
      document.querySelectorAll('[data-mini-shade]').forEach((x) => x.classList.toggle('active', x === b));
      syncActiveRenderers();
    };
  });

  document.querySelectorAll('[data-mini-shape]').forEach((b) => {
    b.onclick = () => {
      state.atelier.shape = b.dataset.miniShape;
      document.querySelectorAll('[data-mini-shape]').forEach((x) => x.classList.toggle('active', x === b));
      syncActiveRenderers();
    };
  });

  // Mobile 3-tab switcher (never tears down 3D WebGL stage!)
  document.querySelectorAll('[data-at-tab]').forEach((b) => {
    b.onclick = () => {
      const targetTab = b.dataset.atTab;
      state.atelier.activeTab = targetTab;
      document.querySelectorAll('[data-at-tab]').forEach((btn) => {
        const on = btn.dataset.atTab === targetTab;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', String(on));
      });
      document.querySelectorAll('[data-at-panel]').forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.atPanel === targetTab);
      });
    };
  });

  // 3D Camera Angle Preset switcher
  document.querySelectorAll('[data-at-cam]').forEach((b) => {
    b.onclick = () => {
      const cam = b.dataset.atCam;
      state.atelier.cameraPreset = cam;
      document.querySelectorAll('[data-at-cam]').forEach((x) => x.classList.toggle('active', x === b));
      const rec = ACTIVE_RENDERERS.get('atelier-canvas-wrap');
      if (rec?.mode === '3d') rec.renderer.setCameraPreset(cam, false);
    };
  });

  const bindProp = (attr, key) => {
    document.querySelectorAll(`[${attr}]`).forEach((b) => {
      b.onclick = () => {
        state.atelier[key] = b.getAttribute(attr);
        document.querySelectorAll(`[${attr}]`).forEach((x) => x.classList.toggle('active', x === b));
        refreshInPlace();
      };
    });
  };

  bindProp('data-at-skin', 'skin');
  bindProp('data-at-shape', 'shape');
  bindProp('data-at-len', 'length');
  bindProp('data-at-color', 'polish_color');
  bindProp('data-at-french', 'french_style');
  bindProp('data-at-tip', 'tip_color');
  bindProp('data-at-finish', 'finish');
  bindProp('data-at-accent', 'accent');

  $('#at-name')?.addEventListener('input', (e) => {
    state.atelier.name = e.target.value;
  });

  $('#at-light-slider')?.addEventListener('input', (e) => {
    state.atelier.lightX = Number(e.target.value) || 42;
    const rec = ACTIVE_RENDERERS.get('atelier-canvas-wrap');
    if (rec?.mode === '3d') rec.renderer.setLightAngle(state.atelier.lightX);
    else if (rec?.mode === '25d') paintAtelier25DCanvas(rec.canvas, state.atelier, state.atelier.lightX);
  });

  $('#at-reset-look')?.addEventListener('click', () => {
    Object.assign(state.atelier, {
      name: '',
      shape: 'almond',
      length: 'medium',
      polish_color: '#F3DCE1',
      french_style: 'classic',
      tip_color: '#F5EFE8',
      finish: 'gloss',
      accent: 'none',
      skin: 'warm',
      lightX: 42,
      cameraPreset: 'editorial',
      includeRemoval: false,
      lastShareUrl: '',
    });
    renderFn();
    toast(t('تمت إعادة ضبط التصميم الافتراضي', 'Studio look reset'));
  });

  $('#at-book-look')?.addEventListener('click', () => {
    const match = evaluateAtelierServiceMatch(state.atelier);
    const chosenIds = state.atelier.includeRemoval ? [match.primaryServiceId, 'gel-removal'] : [match.primaryServiceId];
    const summary = `[Nail Atelier · ${match.tierEn}] Shape:${state.atelier.shape}, Length:${state.atelier.length}, Base:${state.atelier.polish_color}, Tip:${state.atelier.french_style}${state.atelier.french_style !== 'none' ? ` (${state.atelier.tip_color})` : ''}, Finish:${state.atelier.finish}, Accent:${state.atelier.accent}${state.atelier.includeRemoval ? ' + Soak-Off Removal' : ''}`;
    state.bookingStep = 2;
    state.bookingMode = 'services';
    state.bookingCategory = 'gel';
    state.draft.package_id = null;
    state.draft.service_ids = chosenIds;
    state.draft.notes = state.draft.notes ? `${state.draft.notes}\n${summary}` : summary;
    goFn('booking');
  });

  $('#at-save-look')?.addEventListener('click', async () => {
    if (!state.user) {
      toast(t('يرجى تسجيل الدخول أولاً لحفظ التصميم في جواز الجمال', 'Sign in to save this style to your Beauty Passport'));
      goFn('login');
      return;
    }
    try {
      const saved = await api('/atelier/styles', {
        ...state.atelier,
        name: state.atelier.name || t('تصميم أظافري', 'My Nail Look'),
        share: false,
      });
      state.account = null;
      toast(t('تم حفظ التصميم في جواز جمالك', 'Style saved to your Beauty Passport'));
      trackFunnel('atelier_save');
      return saved;
    } catch (err) {
      toast(err.message);
    }
  });

  $('#at-share-look')?.addEventListener('click', async () => {
    try {
      const res = await api('/atelier/styles', {
        ...state.atelier,
        name: state.atelier.name || t('تصميم من أتيليه J للأظافر', 'J Nail Atelier Look'),
        share: true,
      });
      state.atelier.lastShareUrl = new URL(href('atelier') + '?style=' + res.style.share_code, location.origin).href;
      const box = document.getElementById('at-share-panel');
      if (box) {
        box.hidden = false;
        box.innerHTML = `
          <div class="success atelier-share-box">
            <p style="margin-bottom:6px"><strong>${t('تم إنشاء رابط المشاركة الخاص بك:', 'Your share link is ready:')}</strong></p>
            <pre style="margin:0;padding:8px 10px" dir="ltr">${esc(state.atelier.lastShareUrl)}</pre>
            <button type="button" class="btn small light" id="copy-style-url" style="margin-top:8px">${t('نسخ الرابط', 'Copy URL')}</button>
          </div>
        `;
        box.querySelector('#copy-style-url')?.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(state.atelier.lastShareUrl || '');
            toast(t('تم نسخ الرابط بنجاح', 'Link copied'));
          } catch {}
        });
      }
    } catch (err) {
      toast(err.message);
    }
  });

  $('#copy-style-url')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.atelier.lastShareUrl || '');
      toast(t('تم نسخ الرابط بنجاح', 'Link copied'));
    } catch {}
  });
}
