import { $, api, esc, href, state, t, toast } from './state.js';
import { head } from './components.js';
import { trackFunnel } from './motion.js';

export const NAIL_SHADES = [
  { id: 'sheer-blush', hex: '#F3DCE1', ar: 'وردي شفاف', en: 'Sheer Blush' },
  { id: 'warm-ivory', hex: '#F7EFE7', ar: 'عاجي دافئ', en: 'Milky Ivory' },
  { id: 'dusty-rose', hex: '#D9B7C0', ar: 'وردي مغبر', en: 'Dusty Rose' },
  { id: 'mauve-silk', hex: '#C49AA6', ar: 'موف حريري', en: 'Mauve Silk' },
  { id: 'sage-mist', hex: '#A7B79F', ar: 'مريمية هادئة', en: 'Sage Mist' },
  { id: 'caramel-nude', hex: '#D7B9A5', ar: 'نيود كراميل', en: 'Caramel Nude' },
  { id: 'rose-quartz', hex: '#E6BCC4', ar: 'كوارتز وردي', en: 'Rose Quartz' },
  { id: 'deep-plum', hex: '#5E3B49', ar: 'برقوقي عميق', en: 'Deep Plum' },
  { id: 'mocha-velvet', hex: '#7A5754', ar: 'موكا مخملي', en: 'Mocha Velvet' },
  { id: 'champagne-gold', hex: '#DFC5A2', ar: 'شامبين ذهبي', en: 'Champagne Gold' },
];

export const TIP_SHADES = [
  { hex: '#FBF7F4', ar: 'عاجي كلاسيك', en: 'Classic Ivory' },
  { hex: '#D9B7C0', ar: 'وردي ناعم', en: 'Dusty Pink' },
  { hex: '#607257', ar: 'أخضر مريمية', en: 'Deep Sage' },
  { hex: '#D4AF7C', ar: 'ذهبي وردي', en: 'Rose Gold' },
  { hex: '#503C45', ar: 'برقوقي', en: 'Deep Plum' },
];

export const SKIN_TONES = [
  { id: 'fair', fill: '#F3D6C6', shadow: '#E2BCAE', ar: 'فاتحة', en: 'Fair' },
  { id: 'warm', fill: '#E4BDA3', shadow: '#CFA084', ar: 'حنطية دافئة', en: 'Warm Sand' },
  { id: 'olive', fill: '#D1A484', shadow: '#B78767', ar: 'قمحية زيتونية', en: 'Olive' },
  { id: 'deep', fill: '#9E6D51', shadow: '#80533A', ar: 'سمراء غنية', en: 'Deep Rich' },
];

const SHAPES = [
  ['almond', 'لوزي', 'Almond'],
  ['squoval', 'مربع ناعم', 'Squoval'],
  ['square', 'مربع', 'Square'],
  ['coffin', 'كوفين أنيق', 'Coffin'],
  ['natural', 'طبيعي قصير', 'Natural'],
];

const LENGTHS = [
  ['short', 'قصير', 'Short'],
  ['medium', 'متوسط', 'Medium'],
  ['long', 'طويل', 'Long'],
];

const FRENCH_STYLES = [
  ['none', 'لون كامل', 'Full Polish'],
  ['classic', 'فرنش كلاسيك', 'Classic French'],
  ['micro', 'مايكرو فرنش', 'Micro French'],
  ['colored', 'فرنش ملون', 'Colored Tip'],
  ['ombre', 'بيبي بومر / أومبري', 'Soft Ombre'],
];

const FINISHES = [
  ['gloss', 'لمعة زجاجية', 'High Gloss'],
  ['pearl', 'لؤلؤي ناعم', 'Pearl Sheen'],
  ['matte', 'مخملي مطفي', 'Velvet Matte'],
];

const ACCENTS = [
  ['none', 'بدون زخرفة', 'Clean'],
  ['gold_foil', 'رقائق ذهب وردي', 'Rose Gold Foil'],
  ['pearl_dot', 'نقطة لؤلؤ', 'Pearl Dot'],
  ['floral_dot', 'زهرة ناعمة', 'Botanical Dot'],
];

export function recommendedServiceForStyle(cfg) {
  if (cfg.french_style === 'colored') return 'colored-french';
  if (cfg.french_style !== 'none') return 'french-gel';
  return 'gel-polish';
}

export function renderNailPreviewSVG(cfg, lightX = 42) {
  const skin = SKIN_TONES.find((s) => s.id === (cfg.skin || 'warm')) || SKIN_TONES[1];
  const lenScale = cfg.length === 'long' ? 1.24 : cfg.length === 'medium' ? 1.0 : 0.78;
  const polish = cfg.polish_color || '#F3DCE1';
  const tip = cfg.french_style === 'classic' ? '#FBF7F4' : cfg.tip_color || '#D9B7C0';
  const glossOpacity = cfg.finish === 'matte' ? 0.08 : cfg.finish === 'pearl' ? 0.35 : 0.62;

  const fingers = [
    { x: 64, y: 158, w: 32, h: 152, rot: -10, scale: 0.84 },
    { x: 112, y: 98, w: 35, h: 196, rot: -3, scale: 0.96 },
    { x: 168, y: 74, w: 37, h: 214, rot: 0, scale: 1.0 },
    { x: 226, y: 102, w: 34, h: 188, rot: 4, scale: 0.93 },
  ];

  function nailPath(cx, topY, nw, nh) {
    const hw = nw / 2;
    if (cfg.shape === 'square') {
      return `M${cx - hw} ${topY + nh} L${cx - hw} ${topY + 4} Q${cx - hw} ${topY} ${cx - hw + 4} ${topY} L${cx + hw - 4} ${topY} Q${cx + hw} ${topY} ${cx + hw} ${topY + 4} L${cx + hw} ${topY + nh} Q${cx} ${topY + nh + 6} ${cx - hw} ${topY + nh} Z`;
    }
    if (cfg.shape === 'coffin') {
      const tipW = hw * 0.62;
      return `M${cx - hw} ${topY + nh} L${cx - hw} ${topY + nh * 0.45} L${cx - tipW} ${topY + 2} Q${cx} ${topY} ${cx + tipW} ${topY + 2} L${cx + hw} ${topY + nh * 0.45} L${cx + hw} ${topY + nh} Q${cx} ${topY + nh + 6} ${cx - hw} ${topY + nh} Z`;
    }
    if (cfg.shape === 'almond') {
      return `M${cx - hw} ${topY + nh} C${cx - hw} ${topY + nh * 0.38} ${cx - hw * 0.55} ${topY + 4} ${cx} ${topY} C${cx + hw * 0.55} ${topY + 4} ${cx + hw} ${topY + nh * 0.38} ${cx + hw} ${topY + nh} Q${cx} ${topY + nh + 6} ${cx - hw} ${topY + nh} Z`;
    }
    if (cfg.shape === 'natural') {
      return `M${cx - hw} ${topY + nh} L${cx - hw} ${topY + 12} Q${cx} ${topY + 2} ${cx + hw} ${topY + 12} L${cx + hw} ${topY + nh} Q${cx} ${topY + nh + 6} ${cx - hw} ${topY + nh} Z`;
    }
    // squoval
    return `M${cx - hw} ${topY + nh} L${cx - hw} ${topY + 8} Q${cx - hw} ${topY} ${cx} ${topY} Q${cx + hw} ${topY} ${cx + hw} ${topY + 8} L${cx + hw} ${topY + nh} Q${cx} ${topY + nh + 6} ${cx - hw} ${topY + nh} Z`;
  }

  function renderNail(id, cx, baseTop, w, scale) {
    const nw = w * 0.66;
    const nh = 34 * lenScale * scale;
    const topY = baseTop - (nh - 26 * scale);
    const d = nailPath(cx, topY, nw, nh);
    const tipBandH = cfg.french_style === 'micro' ? nh * 0.16 : cfg.french_style === 'ombre' ? nh * 0.45 : nh * 0.28;

    return `
      <g>
        <clipPath id="nc-${id}"><path d="${d}"/></clipPath>
        <path d="${d}" fill="${polish}"/>
        ${
          cfg.french_style === 'ombre'
            ? `<rect x="${cx - nw}" y="${topY - 2}" width="${nw * 2}" height="${tipBandH + 6}" fill="url(#ombre-${id})" clip-path="url(#nc-${id})"/>`
            : cfg.french_style !== 'none'
              ? `<path d="M${cx - nw} ${topY - 2} H${cx + nw} V${topY + tipBandH} Q${cx} ${topY + tipBandH + 6} ${cx - nw} ${topY + tipBandH} Z" fill="${tip}" clip-path="url(#nc-${id})"/>`
              : ''
        }
        ${
          cfg.finish === 'pearl'
            ? `<rect x="${cx - nw}" y="${topY}" width="${nw * 2}" height="${nh + 6}" fill="url(#pearlGrad)" opacity="0.45" clip-path="url(#nc-${id})"/>`
            : ''
        }
        ${
          cfg.accent === 'gold_foil' && (id === 'f2' || id === 'f3')
            ? `<path d="M${cx - 3} ${topY + nh * 0.35} l5 -3 l3 6 l-6 4 Z M${cx + 3} ${topY + nh * 0.58} l3 -2 l2 4 l-4 2 Z" fill="#D4AF7C" opacity="0.9" clip-path="url(#nc-${id})"/>`
            : cfg.accent === 'pearl_dot'
              ? `<circle cx="${cx}" cy="${topY + nh - 7}" r="2.6" fill="#FBF7F4" stroke="#D4AF7C" stroke-width="0.7" clip-path="url(#nc-${id})"/>`
              : cfg.accent === 'floral_dot' && id === 'f2'
                ? `<g fill="#FBF7F4" stroke="#D4AF7C" stroke-width="0.5" clip-path="url(#nc-${id})">
                     <circle cx="${cx}" cy="${topY + nh * 0.56 - 4}" r="2"/>
                     <circle cx="${cx - 4}" cy="${topY + nh * 0.56}" r="2"/>
                     <circle cx="${cx + 4}" cy="${topY + nh * 0.56}" r="2"/>
                     <circle cx="${cx}" cy="${topY + nh * 0.56 + 4}" r="2"/>
                     <circle cx="${cx}" cy="${topY + nh * 0.56}" r="1.4" fill="#D4AF7C"/>
                   </g>`
                : ''
        }
        <ellipse cx="${cx - nw * 0.16 + (lightX - 50) * 0.14}" cy="${topY + nh * 0.42}" rx="${nw * 0.14}" ry="${nh * 0.36}"
          fill="#FFFFFF" opacity="${glossOpacity}" transform="rotate(-6 ${cx} ${topY + nh * 0.42})" clip-path="url(#nc-${id})"/>
        <path d="${d}" fill="none" stroke="rgba(80,60,69,0.22)" stroke-width="0.9"/>
      </g>
    `;
  }

  return `
    <svg class="atelier-hand-svg" viewBox="0 0 340 410" role="img" aria-label="${t('معاينة تفاعلية لتصميم الأظافر', 'Interactive nail style preview')}">
      <defs>
        <linearGradient id="bg-atelier" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FBF7F4"/>
          <stop offset="100%" stop-color="#ECE1D9"/>
        </linearGradient>
        <linearGradient id="skin-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${skin.fill}"/>
          <stop offset="100%" stop-color="${skin.shadow}"/>
        </linearGradient>
        <linearGradient id="pearlGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/>
          <stop offset="50%" stop-color="#F3DCE1" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#D4AF7C" stop-opacity="0.5"/>
        </linearGradient>
        ${fingers
          .map(
            (_, idx) => `
          <linearGradient id="ombre-f${idx}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${tip}" stop-opacity="0.96"/>
            <stop offset="100%" stop-color="${tip}" stop-opacity="0"/>
          </linearGradient>`,
          )
          .join('')}
        <linearGradient id="ombre-thumb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${tip}" stop-opacity="0.96"/>
          <stop offset="100%" stop-color="${tip}" stop-opacity="0"/>
        </linearGradient>
        <filter id="handShadow" x="-15%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#503C45" flood-opacity="0.12"/>
        </filter>
      </defs>

      <rect width="340" height="410" rx="22" fill="url(#bg-atelier)"/>
      <circle cx="275" cy="72" r="56" fill="#D9B7C0" fill-opacity="0.18"/>
      <path d="M24 360 Q70 300 45 220" stroke="#A7B79F" stroke-width="2" fill="none" opacity="0.55"/>
      <ellipse cx="44" cy="242" rx="14" ry="7" transform="rotate(-30 44 242)" fill="#A7B79F" opacity="0.38"/>
      <ellipse cx="62" cy="272" rx="16" ry="8" transform="rotate(24 62 272)" fill="#A7B79F" opacity="0.32"/>

      <g filter="url(#handShadow)">
        <!-- Palm / Wrist silhouette -->
        <path d="M96 410 L82 260 C78 215 110 198 165 198 C222 198 256 218 256 266 L244 410 Z" fill="url(#skin-grad)"/>
        <!-- Thumb -->
        <g transform="rotate(-24 252 292)">
          <rect x="234" y="218" width="38" height="106" rx="19" fill="url(#skin-grad)"/>
          ${renderNail('thumb', 253, 224, 35, 0.9)}
        </g>
        <!-- Four fingers -->
        ${fingers
          .map(
            (f, idx) => `
          <g transform="rotate(${f.rot} ${f.x + f.w / 2} ${f.y + f.h})">
            <rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="${f.w / 2}" fill="url(#skin-grad)"/>
            <path d="M${f.x + 8} ${f.y + 62} H${f.x + f.w - 8}" stroke="rgba(80,60,69,0.12)" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M${f.x + 7} ${f.y + 114} H${f.x + f.w - 7}" stroke="rgba(80,60,69,0.1)" stroke-width="1.2" stroke-linecap="round"/>
            ${renderNail('f' + idx, f.x + f.w / 2, f.y + 10, f.w, f.scale)}
          </g>
        `,
          )
          .join('')}
      </g>
    </svg>
  `;
}

export function atelierMiniWidget() {
  const cfg = state.atelier;
  return `
    <div class="atelier-mini card">
      <div class="atelier-mini-grid">
        <div class="atelier-stage" id="mini-atelier-stage">
          ${renderNailPreviewSVG(cfg)}
        </div>
        <div>
          <span class="eyebrow">J NAIL ATELIER · ${t('تجربة تفاعلية', 'INTERACTIVE STUDIO')}</span>
          <h3>${t('صمّمي إطلالة أظافركِ قبل الحجز', 'Preview your nail ritual before booking')}</h3>
          <p class="muted">${t(
            'جرّبي شكل الظفر ودرجات الجل والفرنش فوراً، واحفظي إطلالتكِ المفضلة أو ابدئي حجزها مباشرة.',
            'Explore nail shapes, polish shades, and French tips in real time, then save or book your signature look.',
          )}</p>
          <div class="swatch-row" style="margin:14px 0">
            ${NAIL_SHADES.slice(0, 6)
              .map(
                (s) =>
                  `<button type="button" class="swatch ${cfg.polish_color === s.hex ? 'active' : ''}" data-mini-shade="${s.hex}" title="${t(s.ar, s.en)}" style="background:${s.hex}"></button>`,
              )
              .join('')}
          </div>
          <div class="chip-row" style="margin-bottom:18px">
            ${SHAPES.slice(0, 3)
              .map(
                ([id, ar, en]) =>
                  `<button type="button" class="mini-chip ${cfg.shape === id ? 'active' : ''}" data-mini-shape="${id}">${t(ar, en)}</button>`,
              )
              .join('')}
          </div>
          <a class="btn small" href="${href('atelier')}">${t('افتحي أتيليه الأظافر الكامل', 'Open Full Nail Atelier')}</a>
        </div>
      </div>
    </div>
  `;
}

export function atelierPage() {
  const cfg = state.atelier;
  const svcId = recommendedServiceForStyle(cfg);
  const svc = state.catalog.services.find((s) => s.id === svcId);

  return `
    <main id="main" class="wrap">
      ${head(
        t('أتيليه J للأظافر', 'J Nail Atelier'),
        t('اختاري الشكل والطول واللون والفرنش واللمعة بمعاينة فورية قبل طلب موعدكِ.', 'Customize shape, length, polish shade, French tip, and finish with live studio preview.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('أتيليه الأظافر', 'J Nail Atelier'), '']],
      )}

      <div class="atelier-layout">
        <div class="atelier-preview-col">
          <div class="atelier-canvas-card" id="atelier-canvas-wrap">
            ${renderNailPreviewSVG(cfg, cfg.lightX || 45)}
            <div class="atelier-skin-bar">
              <span class="muted">${t('لون البشرة:', 'Skin undertone:')}</span>
              <div class="swatch-row">
                ${SKIN_TONES.map(
                  (sk) =>
                    `<button type="button" class="swatch small ${cfg.skin === sk.id ? 'active' : ''}" data-at-skin="${sk.id}" title="${t(sk.ar, sk.en)}" style="background:${sk.fill}"></button>`,
                ).join('')}
              </div>
            </div>
          </div>
          ${
            cfg.lastShareUrl
              ? `<div class="success" style="margin-top:14px">
                   <strong>${t('رابط مشاركة الإطلالة:', 'Shareable look link:')}</strong>
                   <div class="row" style="margin-top:8px">
                     <code style="font-size:12px;overflow-wrap:anywhere">${esc(cfg.lastShareUrl)}</code>
                     <button type="button" class="btn small light" id="copy-style-url">${t('نسخ', 'Copy')}</button>
                   </div>
                 </div>`
              : ''
          }
        </div>

        <div class="atelier-controls card">
          <div class="control-group">
            <label class="field">
              ${t('اسم الإطلالة (اختياري للحفظ)', 'Look name')}
              <input type="text" id="at-name" value="${esc(cfg.name || '')}" maxlength="60" placeholder="${t('مثال: فرنش ناعم للعيد', 'e.g. Soft Eid French')}">
            </label>
          </div>

          <div class="control-group">
            <span class="control-label">${t('١. شكل الظفر', '1. Nail Shape')}</span>
            <div class="chip-row">
              ${SHAPES.map(
                ([id, ar, en]) =>
                  `<button type="button" class="mini-chip ${cfg.shape === id ? 'active' : ''}" data-at-shape="${id}">${t(ar, en)}</button>`,
              ).join('')}
            </div>
          </div>

          <div class="control-group">
            <span class="control-label">${t('٢. الطول', '2. Length')}</span>
            <div class="chip-row">
              ${LENGTHS.map(
                ([id, ar, en]) =>
                  `<button type="button" class="mini-chip ${cfg.length === id ? 'active' : ''}" data-at-len="${id}">${t(ar, en)}</button>`,
              ).join('')}
            </div>
          </div>

          <div class="control-group">
            <span class="control-label">${t('٣. لون الأساس', '3. Base Shade')}</span>
            <div class="swatch-row">
              ${NAIL_SHADES.map(
                (s) =>
                  `<button type="button" class="swatch ${cfg.polish_color === s.hex ? 'active' : ''}" data-at-color="${s.hex}" title="${t(s.ar, s.en)}" style="background:${s.hex}"></button>`,
              ).join('')}
            </div>
          </div>

          <div class="control-group">
            <span class="control-label">${t('٤. نمط الفرنش', '4. Tip / French Style')}</span>
            <div class="chip-row">
              ${FRENCH_STYLES.map(
                ([id, ar, en]) =>
                  `<button type="button" class="mini-chip ${cfg.french_style === id ? 'active' : ''}" data-at-french="${id}">${t(ar, en)}</button>`,
              ).join('')}
            </div>
          </div>

          ${
            cfg.french_style !== 'none' && cfg.french_style !== 'classic'
              ? `<div class="control-group">
                   <span class="control-label">${t('لون الطرف', 'Tip Shade')}</span>
                   <div class="swatch-row">
                     ${TIP_SHADES.map(
                       (s) =>
                         `<button type="button" class="swatch ${cfg.tip_color === s.hex ? 'active' : ''}" data-at-tip="${s.hex}" title="${t(s.ar, s.en)}" style="background:${s.hex}"></button>`,
                     ).join('')}
                   </div>
                 </div>`
              : ''
          }

          <div class="control-group">
            <span class="control-label">${t('٥. اللمعة واللمسة النهائية', '5. Finish & Detail')}</span>
            <div class="chip-row" style="margin-bottom:10px">
              ${FINISHES.map(
                ([id, ar, en]) =>
                  `<button type="button" class="mini-chip ${cfg.finish === id ? 'active' : ''}" data-at-finish="${id}">${t(ar, en)}</button>`,
              ).join('')}
            </div>
            <div class="chip-row">
              ${ACCENTS.map(
                ([id, ar, en]) =>
                  `<button type="button" class="mini-chip ${cfg.accent === id ? 'active' : ''}" data-at-accent="${id}">${t(ar, en)}</button>`,
              ).join('')}
            </div>
          </div>

          <div class="atelier-action-box">
            ${
              svc
                ? `<p class="muted" style="margin-bottom:12px">${t('الخدمة المقترحة لهذا التصميم:', 'Suggested matching service:')} <strong>${esc(svc[`name_${state.lang}`])}</strong> (${svc.price} ${t('ر.س', 'SAR')})</p>`
                : ''
            }
            <div class="hero-actions" style="gap:10px">
              <button type="button" class="btn" id="at-book-look">${t('احجزي هذا التصميم', 'Book This Look')}</button>
              <button type="button" class="btn light" id="at-save-look">${t('حفظ في جواز الجمال', 'Save to Passport')}</button>
              <button type="button" class="btn light" id="at-share-look">${t('إنشاء رابط مشاركة', 'Share Look')}</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  `;
}

export function bindAtelier(goFn, renderFn) {
  function refreshPreview() {
    const stage = $('#atelier-canvas-wrap');
    if (stage) {
      const existingSvg = stage.querySelector('.atelier-hand-svg');
      if (existingSvg) existingSvg.outerHTML = renderNailPreviewSVG(state.atelier, state.atelier.lightX || 45);
    }
    const mini = $('#mini-atelier-stage');
    if (mini) mini.innerHTML = renderNailPreviewSVG(state.atelier, 45);
  }

  document.querySelectorAll('[data-mini-shade]').forEach((b) => {
    b.onclick = () => {
      state.atelier.polish_color = b.dataset.miniShade;
      document.querySelectorAll('[data-mini-shade]').forEach((x) => x.classList.toggle('active', x === b));
      refreshPreview();
    };
  });

  document.querySelectorAll('[data-mini-shape]').forEach((b) => {
    b.onclick = () => {
      state.atelier.shape = b.dataset.miniShape;
      document.querySelectorAll('[data-mini-shape]').forEach((x) => x.classList.toggle('active', x === b));
      refreshPreview();
    };
  });

  const bindProp = (attr, key, needsFullRender = false) => {
    document.querySelectorAll(`[${attr}]`).forEach((b) => {
      b.onclick = () => {
        state.atelier[key] = b.getAttribute(attr);
        if (needsFullRender) {
          renderFn();
        } else {
          document.querySelectorAll(`[${attr}]`).forEach((x) => x.classList.toggle('active', x === b));
          refreshPreview();
        }
      };
    });
  };

  bindProp('data-at-skin', 'skin');
  bindProp('data-at-shape', 'shape');
  bindProp('data-at-len', 'length');
  bindProp('data-at-color', 'polish_color');
  bindProp('data-at-french', 'french_style', true);
  bindProp('data-at-tip', 'tip_color');
  bindProp('data-at-finish', 'finish');
  bindProp('data-at-accent', 'accent');

  $('#at-name')?.addEventListener('input', (e) => {
    state.atelier.name = e.target.value;
  });

  const stage = $('#atelier-canvas-wrap');
  if (stage) {
    stage.addEventListener('pointermove', (e) => {
      const rect = stage.getBoundingClientRect();
      state.atelier.lightX = Math.max(15, Math.min(85, ((e.clientX - rect.left) / rect.width) * 100));
      const svg = stage.querySelector('.atelier-hand-svg');
      if (svg) svg.outerHTML = renderNailPreviewSVG(state.atelier, state.atelier.lightX);
    });
  }

  $('#at-book-look')?.addEventListener('click', () => {
    const svcId = recommendedServiceForStyle(state.atelier);
    const summary = `[Nail Atelier] Shape:${state.atelier.shape}, Length:${state.atelier.length}, Base:${state.atelier.polish_color}, Tip:${state.atelier.french_style}${state.atelier.french_style !== 'none' ? ` (${state.atelier.tip_color})` : ''}, Finish:${state.atelier.finish}, Accent:${state.atelier.accent}`;
    state.bookingStep = 2;
    state.bookingMode = 'services';
    state.bookingCategory = 'gel';
    state.draft.package_id = null;
    state.draft.service_ids = [svcId];
    state.draft.notes = state.draft.notes ? `${state.draft.notes}\n${summary}` : summary;
    goFn('booking');
  });

  $('#at-save-look')?.addEventListener('click', async () => {
    if (!state.user) {
      toast(t('سجلي الدخول أولاً لحفظ التصميم في جواز الجمال', 'Sign in to save this style to your Beauty Passport'));
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
      toast(t('تم حفظ الإطلالة في جواز جمالكِ', 'Style saved to your Beauty Passport'));
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
        name: state.atelier.name || t('إطلالة J Nail Atelier', 'J Nail Atelier Look'),
        share: true,
      });
      state.atelier.lastShareUrl = new URL(href('atelier') + '?style=' + res.style.share_code, location.origin).href;
      renderFn();
    } catch (err) {
      toast(err.message);
    }
  });

  $('#copy-style-url')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.atelier.lastShareUrl || '');
      toast(t('تم نسخ الرابط', 'Link copied'));
    } catch {}
  });
}
