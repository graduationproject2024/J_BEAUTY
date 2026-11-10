import { $, api, esc, href, money, nameOf, state, t, toast } from './state.js';
import { head } from './components.js';
import { trackFunnel } from './motion.js';

export const NAIL_SHADES = [
  { id: 'sheer-blush', hex: '#F3DCE1', ar: 'وردي شفاف', en: 'Sheer Blush' },
  { id: 'warm-ivory', hex: '#F7EFE7', ar: 'عاجي حليبي', en: 'Milky Ivory' },
  { id: 'dusty-rose', hex: '#D9B7C0', ar: 'وردي ناعم', en: 'Dusty Rose' },
  { id: 'mauve-silk', hex: '#C49AA6', ar: 'موف حريري', en: 'Mauve Silk' },
  { id: 'sage-mist', hex: '#A7B79F', ar: 'أخضر مريمية', en: 'Sage Mist' },
  { id: 'caramel-nude', hex: '#D7B9A5', ar: 'نيود دافئ', en: 'Caramel Nude' },
  { id: 'rose-quartz', hex: '#E6BCC4', ar: 'كوارتز وردي', en: 'Rose Quartz' },
  { id: 'deep-plum', hex: '#5E3B49', ar: 'برقوقي عميق', en: 'Deep Plum' },
  { id: 'mocha-velvet', hex: '#7A5754', ar: 'موكا مخملي', en: 'Mocha Velvet' },
  { id: 'champagne-gold', hex: '#DFC5A2', ar: 'شامبين ذهبي', en: 'Champagne Gold' },
];

export const TIP_SHADES = [
  { hex: '#FBF7F4', ar: 'عاجي كلاسيك', en: 'Classic Ivory' },
  { hex: '#D9B7C0', ar: 'وردي ناعم', en: 'Dusty Pink' },
  { hex: '#607257', ar: 'مريمية داكن', en: 'Deep Sage' },
  { hex: '#D4AF7C', ar: 'ذهبي وردي', en: 'Rose Gold' },
  { hex: '#503C45', ar: 'برقوقي', en: 'Deep Plum' },
];

export const SKIN_TONES = [
  { id: 'fair', base: '#F4D7C8', mid: '#EAC4B1', shadow: '#D5A996', pocket: 'rgba(130, 82, 70, 0.20)', ar: 'فاتحة', en: 'Fair' },
  { id: 'warm', base: '#E6BFA5', mid: '#D9AE91', shadow: '#C09172', pocket: 'rgba(115, 68, 52, 0.24)', ar: 'حنطية دافئة', en: 'Warm Sand' },
  { id: 'olive', base: '#CFA180', mid: '#C1906D', shadow: '#A47555', pocket: 'rgba(92, 54, 40, 0.25)', ar: 'قمحية زيتونية', en: 'Olive' },
  { id: 'deep', base: '#9B694E', mid: '#8C5B41', shadow: '#71442D', pocket: 'rgba(54, 28, 18, 0.30)', ar: 'سمراء غنية', en: 'Deep Rich' },
];

const SHAPES = [
  ['almond', 'لوزي', 'Almond'],
  ['oval', 'بيضاوي', 'Oval'],
  ['squoval', 'مربع ناعم', 'Soft Square'],
  ['square', 'مربع', 'Square'],
  ['coffin', 'كوفين أنيق', 'Coffin'],
];

const LENGTHS = [
  ['short', 'قصير', 'Short'],
  ['medium', 'متوسط', 'Medium'],
  ['long', 'طويل', 'Long'],
];

const FRENCH_STYLES = [
  ['none', 'طلاء كامل', 'Full Polish'],
  ['classic', 'فرنش كلاسيك', 'Classic French'],
  ['micro', 'مايكرو فرنش', 'Micro French'],
  ['colored', 'أطراف ملونة', 'Colored Tip'],
  ['ombre', 'تدرج ناعم (أومبري)', 'Soft Ombre'],
];

const FINISHES = [
  ['gloss', 'لمعة زجاجية', 'High Gloss'],
  ['pearl', 'لؤلؤي ناعم', 'Pearl Sheen'],
  ['matte', 'مخملي مطفي', 'Velvet Matte'],
];

const ACCENTS = [
  ['none', 'طلاء صافٍ', 'Clean'],
  ['gold_foil', 'رقائق ذهب وردي', 'Rose Gold Foil'],
  ['pearl_dot', 'نقطة لؤلؤ', 'Pearl Dot'],
  ['floral_dot', 'لمسة زهرية ناعمة', 'Botanical Dot'],
];

export function recommendedServiceForStyle(cfg) {
  if (cfg.french_style === 'colored') return 'colored-french';
  if (cfg.french_style !== 'none') return 'french-gel';
  return 'gel-polish';
}

function nailContour(cx, baseY, nailW, bedH, extH, shape) {
  const half = nailW / 2;
  const sideY = baseY - bedH * 0.62;
  const freeY = baseY - bedH;
  const topY = freeY - extH;
  const s = shape === 'natural' ? 'oval' : shape || 'almond';

  // Proximal cuticle pocket arc stays tucked smoothly inside the finger apex
  const baseArc = `M ${cx - half * 0.88} ${sideY} C ${cx - half * 0.88} ${baseY - 1}, ${cx + half * 0.88} ${baseY - 1}, ${cx + half * 0.88} ${sideY}`;

  if (s === 'square') {
    return `${baseArc} L ${cx + half * 0.90} ${topY + 3.5} Q ${cx + half * 0.90} ${topY}, ${cx + half * 0.58} ${topY} L ${cx - half * 0.58} ${topY} Q ${cx - half * 0.90} ${topY}, ${cx - half * 0.90} ${topY + 3.5} Z`;
  }
  if (s === 'squoval') {
    return `${baseArc} C ${cx + half * 0.92} ${freeY}, ${cx + half * 0.88} ${topY + 5}, ${cx + half * 0.66} ${topY + 1} C ${cx + half * 0.34} ${topY - 1}, ${cx - half * 0.34} ${topY - 1}, ${cx - half * 0.66} ${topY + 1} C ${cx - half * 0.88} ${topY + 5}, ${cx - half * 0.92} ${freeY}, ${cx - half * 0.88} ${sideY} Z`;
  }
  if (s === 'coffin') {
    return `${baseArc} L ${cx + half * 0.85} ${freeY + 2} L ${cx + half * 0.44} ${topY + 1.5} Q ${cx} ${topY}, ${cx - half * 0.44} ${topY + 1.5} L ${cx - half * 0.85} ${freeY + 2} Z`;
  }
  if (s === 'oval') {
    return `${baseArc} C ${cx + half * 0.92} ${freeY}, ${cx + half * 0.86} ${topY + 7}, ${cx + half * 0.50} ${topY + 1.5} C ${cx + half * 0.22} ${topY - 1.5}, ${cx - half * 0.22} ${topY - 1.5}, ${cx - half * 0.50} ${topY + 1.5} C ${cx - half * 0.86} ${topY + 7}, ${cx - half * 0.92} ${freeY}, ${cx - half * 0.88} ${sideY} Z`;
  }
  // Almond (default): graceful inward taper to an elliptical parabolic apex
  return `${baseArc} C ${cx + half * 0.90} ${freeY}, ${cx + half * 0.72} ${topY + extH * 0.58 + 7}, ${cx + half * 0.24} ${topY + 1.2} C ${cx + half * 0.08} ${topY - 0.8}, ${cx - half * 0.08} ${topY - 0.8}, ${cx - half * 0.24} ${topY + 1.2} C ${cx - half * 0.72} ${topY + extH * 0.58 + 7}, ${cx - half * 0.90} ${freeY}, ${cx - half * 0.88} ${sideY} Z`;
}

export function renderNailPreviewSVG(cfg, lightX = 42) {
  const skin = SKIN_TONES.find((s) => s.id === (cfg.skin || 'warm')) || SKIN_TONES[1];
  const extMap = { short: 5.5, medium: 12.5, long: 19.5 };
  const extBase = extMap[cfg.length] || 12.5;
  const tipColor = cfg.tip_color || '#FBF7F4';
  const polish = cfg.polish_color || '#F3DCE1';
  const glossOffset = ((lightX - 50) / 50) * 3.8;

  // Anatomical 5-digit geometry matching a unified dorsum hand path (Pinky -> Ring -> Middle -> Index -> Thumb)
  const digits = [
    { id: 'pinky', cx: 82, baseY: 192, w: 16.5, bedH: 19, scale: 0.76, rot: -9.5, tx: 82, ty: 192 },
    { id: 'ring', cx: 132, baseY: 130, w: 19.5, bedH: 23, scale: 0.94, rot: -3.2, tx: 132, ty: 130 },
    { id: 'middle', cx: 186, baseY: 109, w: 20.5, bedH: 24.5, scale: 1.0, rot: 0, tx: 186, ty: 109 },
    { id: 'index', cx: 240, baseY: 133, w: 19.8, bedH: 23, scale: 0.95, rot: 4.5, tx: 240, ty: 133 },
    { id: 'thumb', cx: 315, baseY: 256, w: 22.5, bedH: 23.5, scale: 0.90, rot: 31, tx: 315, ty: 256 },
  ];

  const renderDigitNail = (d) => {
    const ext = extBase * d.scale;
    const totalH = d.bedH + ext;
    const topY = d.baseY - totalH;
    const freeEdgeY = d.baseY - d.bedH;
    const path = nailContour(d.cx, d.baseY, d.w, d.bedH, ext, cfg.shape);
    const clipId = `nclip-${d.id}`;

    let frenchOverlay = '';
    if (cfg.french_style === 'classic' || cfg.french_style === 'colored') {
      const smileDepth = Math.max(5.5, ext * 0.72 + 2.8);
      const smileY = freeEdgeY - ext * 0.25;
      frenchOverlay = `<path d="M ${d.cx - d.w} ${topY - 4} H ${d.cx + d.w} V ${smileY + 3} Q ${d.cx} ${smileY + smileDepth} ${d.cx - d.w} ${smileY + 3} Z" fill="${tipColor}" fill-opacity="0.96"/>`;
    } else if (cfg.french_style === 'micro') {
      const lineDepth = Math.max(3.6, ext * 0.34 + 1.8);
      frenchOverlay = `<path d="M ${d.cx - d.w} ${topY - 3} H ${d.cx + d.w} V ${topY + lineDepth + 1.5} Q ${d.cx} ${topY + lineDepth + 4.5} ${d.cx - d.w} ${topY + lineDepth + 1.5} Z" fill="${tipColor}" fill-opacity="0.98"/>`;
    } else if (cfg.french_style === 'ombre') {
      frenchOverlay = `<rect x="${d.cx - d.w}" y="${topY - 2}" width="${d.w * 2}" height="${totalH * 0.72}" fill="url(#ombre-${d.id})"/>`;
    }

    let accentOverlay = '';
    if (cfg.accent === 'gold_foil' && (d.id === 'ring' || d.id === 'middle')) {
      accentOverlay = `
        <path d="M ${d.cx - 3} ${d.baseY - 12} L ${d.cx + 1} ${d.baseY - 15} L ${d.cx + 4} ${d.baseY - 10} Z" fill="#D4AF7C" opacity="0.88"/>
        <path d="M ${d.cx - 5.5} ${d.baseY - 19} L ${d.cx - 2} ${d.baseY - 21.5} L ${d.cx - 0.5} ${d.baseY - 17} Z" fill="#E6C697" opacity="0.78"/>
      `;
    } else if (cfg.accent === 'pearl_dot') {
      accentOverlay = `<circle cx="${d.cx}" cy="${d.baseY - 6.5}" r="2.1" fill="#FBF7F4" stroke="#D4AF7C" stroke-width="0.65"/>`;
    } else if (cfg.accent === 'floral_dot' && d.id === 'ring') {
      const py = d.baseY - 10;
      accentOverlay = `
        <circle cx="${d.cx}" cy="${py - 3.2}" r="1.7" fill="#FBF7F4" opacity="0.9"/>
        <circle cx="${d.cx + 3}" cy="${py}" r="1.7" fill="#FBF7F4" opacity="0.9"/>
        <circle cx="${d.cx}" cy="${py + 3.2}" r="1.7" fill="#FBF7F4" opacity="0.9"/>
        <circle cx="${d.cx - 3}" cy="${py}" r="1.7" fill="#FBF7F4" opacity="0.9"/>
        <circle cx="${d.cx}" cy="${py}" r="1.4" fill="#D4AF7C"/>
      `;
    }

    const highlightOpacity = cfg.finish === 'matte' ? 0.08 : cfg.finish === 'pearl' ? 0.34 : 0.54;
    const lunulaOpacity = cfg.finish === 'matte' ? 0.14 : 0.26;

    return `
      <g transform="rotate(${d.rot} ${d.tx} ${d.ty})">
        <defs>
          <clipPath id="${clipId}"><path d="${path}"/></clipPath>
        </defs>
        <!-- Subtle lateral shadow framing proximal nail pocket -->
        <path d="${path}" transform="translate(0, 1.3)" fill="${skin.pocket}"/>
        <!-- Base sculpted nail polish plate -->
        <path d="${path}" fill="${polish}"/>
        <g clip-path="url(#${clipId})">
          <!-- Soft natural lunula moon near proximal nail fold -->
          <ellipse cx="${d.cx}" cy="${d.baseY - 1}" rx="${d.w * 0.42}" ry="5.5" fill="#FBF7F4" fill-opacity="${lunulaOpacity}"/>
          <!-- Lateral nail bed edge depth for realistic dome curvature -->
          <path d="${path}" fill="none" stroke="rgba(68, 42, 46, 0.22)" stroke-width="2.4"/>
          ${frenchOverlay}
          ${cfg.finish === 'pearl' ? `<rect x="${d.cx - d.w}" y="${topY - 3}" width="${d.w * 2}" height="${totalH + 6}" fill="url(#pearlSheen)"/>` : ''}
          ${accentOverlay}
          <!-- Directional dome gloss highlight tracking pointer -->
          <path d="M ${d.cx - d.w * 0.34 + glossOffset} ${topY + 4} Q ${d.cx - d.w * 0.40 + glossOffset} ${d.baseY - d.bedH * 0.45}, ${d.cx - d.w * 0.28 + glossOffset} ${d.baseY - 4}"
            stroke="white" stroke-width="${d.w * 0.16}" stroke-linecap="round" opacity="${highlightOpacity}" fill="none"/>
          ${
            cfg.finish === 'gloss'
              ? `<path d="M ${d.cx + d.w * 0.25 + glossOffset * 0.5} ${topY + 6} Q ${d.cx + d.w * 0.30 + glossOffset * 0.5} ${topY + totalH * 0.34}, ${d.cx + d.w * 0.22 + glossOffset * 0.5} ${topY + totalH * 0.52}" stroke="white" stroke-width="1.3" stroke-linecap="round" opacity="0.34" fill="none"/>`
              : ''
          }
        </g>
        <!-- Proximal cuticle fold (eponychium) gentle lip seam -->
        <path d="M ${d.cx - d.w * 0.44} ${d.baseY - d.bedH * 0.42} C ${d.cx - d.w * 0.40} ${d.baseY + 0.5}, ${d.cx + d.w * 0.40} ${d.baseY + 0.5}, ${d.cx + d.w * 0.44} ${d.baseY - d.bedH * 0.42}"
          fill="none" stroke="${skin.shadow}" stroke-width="1.4" stroke-linecap="round" opacity="0.72"/>
      </g>
    `;
  };

  // Continuous organic dorsum hand outline (natural finger taper, angled palm, smooth web valleys, natural abducted thumb)
  const handSilhouette = `
    M 122 460
    C 118 424, 114 394, 102 362
    C 90 330, 86 300, 82 272
    L 62 198
    C 59 182, 65 166, 77 164
    C 89 162, 97 175, 100 192
    L 111 247
    C 113 255, 117 256, 118 246
    L 114 134
    C 113 116, 121 103, 132 103
    C 143 103, 151 116, 152 134
    L 158 228
    C 159 236, 165 236, 166 227
    L 166 112
    C 166 93, 175 81, 186 81
    C 197 81, 206 93, 206 112
    L 208 229
    C 209 237, 214 237, 216 228
    L 223 135
    C 225 117, 234 106, 245 107
    C 256 108, 263 121, 261 139
    L 246 278
    C 245 289, 250 293, 257 284
    L 298 232
    C 309 218, 325 218, 333 227
    C 341 236, 338 253, 326 268
    L 286 322
    C 271 344, 258 370, 250 400
    C 245 422, 243 442, 242 460
    Z
  `;

  return `
    <svg class="atelier-hand-svg" viewBox="0 0 380 460" fill="none" role="img" aria-label="${t('معاينة تفاعلية لتصميم الأظافر على اليد', 'Interactive manicure design hand preview')}">
      <defs>
        <linearGradient id="bg-atelier" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FBF7F4"/>
          <stop offset="60%" stop-color="#F4EBE6"/>
          <stop offset="100%" stop-color="#ECE0DA"/>
        </linearGradient>
        <radialGradient id="skin-subsurface" cx="${Math.round(lightX)}%" cy="42%" r="65%">
          <stop offset="0%" stop-color="${skin.base}"/>
          <stop offset="62%" stop-color="${skin.mid}"/>
          <stop offset="100%" stop-color="${skin.shadow}"/>
        </radialGradient>
        <linearGradient id="pearlSheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.46"/>
          <stop offset="48%" stop-color="#F7DCE5" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.06"/>
        </linearGradient>
        ${digits
          .map(
            (d) => `
          <linearGradient id="ombre-${d.id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${tipColor}" stop-opacity="0.98"/>
            <stop offset="60%" stop-color="${tipColor}" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="${tipColor}" stop-opacity="0"/>
          </linearGradient>`,
          )
          .join('')}
        <filter id="handSoftShadow" x="-15%" y="-10%" width="135%" height="125%">
          <feDropShadow dx="4" dy="14" stdDeviation="12" flood-color="#503C45" flood-opacity="0.16"/>
        </filter>
      </defs>

      <!-- Quiet-luxury linen background + subtle eucalyptus botanical shadow -->
      <rect width="380" height="460" rx="22" fill="url(#bg-atelier)"/>
      <circle cx="310" cy="76" r="78" fill="#D9B7C0" fill-opacity="0.14"/>
      <path d="M22 418 C52 365 62 318 46 250" stroke="#A7B79F" stroke-width="1.4" opacity="0.45" fill="none"/>
      <ellipse cx="44" cy="272" rx="13" ry="6" transform="rotate(-32 44 272)" fill="#A7B79F" opacity="0.28"/>
      <ellipse cx="62" cy="304" rx="14" ry="6.5" transform="rotate(24 62 304)" fill="#A7B79F" opacity="0.24"/>

      <!-- Anatomical Continuous Hand -->
      <g filter="url(#handSoftShadow)">
        <path d="${handSilhouette}" fill="url(#skin-subsurface)"/>
        <!-- Subtle inner palm contour shadow & interdigital valley soft shading -->
        <path d="M 118 250 C 145 232 195 232 238 250 C 216 266 144 266 118 250 Z" fill="${skin.shadow}" opacity="0.14"/>
        <path d="M 244 292 C 258 318 242 356 218 378" stroke="${skin.shadow}" stroke-width="2" stroke-linecap="round" opacity="0.18" fill="none"/>

        <!-- Fine anatomical phalanx knuckle creases -->
        <g stroke="${skin.shadow}" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.32">
          <!-- Pinky PIP / DIP -->
          <path d="M 73 216 Q 82 213 91 217"/>
          <path d="M 78 240 Q 87 237 97 241"/>
          <!-- Ring PIP / DIP -->
          <path d="M 122 178 Q 134 174 146 178"/>
          <path d="M 125 212 Q 137 209 149 213"/>
          <!-- Middle PIP / DIP -->
          <path d="M 174 162 Q 186 158 198 162"/>
          <path d="M 176 198 Q 187 195 200 199"/>
          <!-- Index PIP / DIP -->
          <path d="M 229 180 Q 241 177 251 182"/>
          <path d="M 225 214 Q 237 211 248 216"/>
          <!-- Thumb IP joint -->
          <path d="M 284 266 Q 294 269 301 278"/>
        </g>

        <!-- Sculpted Parametric Nails on All 5 Digits -->
        ${digits.map(renderDigitNail).join('')}
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
          <h3>${t('صمّمي إطلالة أظافركِ قبل الحجز', 'Preview your manicure look before booking')}</h3>
          <p class="muted">${t(
            'اختاري شكل الظفر ودرجات الجل أو الفرنش مع معاينة فورية متكاملة، واحفظي التصميم أو ابدئي حجزه مباشرة.',
            'Explore nail shapes, polish shades, and French tips in real time, then save or book your signature look.',
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
        t('اختاري الشكل والطول واللون والفرنش واللمعة النهائية مع معاينة فورية دقيقة قبل طلب موعدكِ.', 'Customize nail shape, length, polish shade, French tip, and finish with live anatomical preview.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('أتيليه الأظافر', 'J Nail Atelier'), '']],
      )}

      <div class="atelier-layout">
        <div class="atelier-canvas-card card">
          <div id="atelier-canvas-wrap" class="atelier-stage" title="${t('حرّكي المؤشر لمعاينة انعكاس الإضاءة', 'Move pointer to shift studio specular highlight')}">
            ${renderNailPreviewSVG(cfg, cfg.lightX || 45)}
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
          ${
            cfg.lastShareUrl
              ? `<div class="success" style="margin-top:14px;text-align:start">
                   <p style="margin-bottom:6px"><strong>${t('تم إنشاء رابط المشاركة الخاص بكِ:', 'Your share link is ready:')}</strong></p>
                   <pre style="margin:0;padding:8px 10px;font-size:11.5px">${esc(cfg.lastShareUrl)}</pre>
                   <button type="button" class="btn small light" id="copy-style-url" style="margin-top:8px">${t('نسخ الرابط', 'Copy URL')}</button>
                 </div>`
              : ''
          }
        </div>

        <div class="atelier-controls card">
          <div class="control-group">
            <label class="control-label" for="at-name">${t('اسم التصميم (اختياري للحفظ)', 'Look name')}</label>
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

          ${
            cfg.french_style !== 'none'
              ? `<div class="control-group">
                   <span class="control-label">${t('لون الطرف الفرنسي', 'French Tip Shade')}</span>
                   <div class="swatch-row">
                     ${TIP_SHADES.map(
                       (s) =>
                         `<button type="button" class="swatch small ${cfg.tip_color === s.hex ? 'active' : ''}" data-at-tip="${s.hex}" title="${t(s.ar, s.en)}" aria-label="${t(s.ar, s.en)}" style="background:${s.hex}"></button>`,
                     ).join('')}
                   </div>
                 </div>`
              : ''
          }

          <div class="control-group">
            <span class="control-label">5. ${t('اللمسة النهائية والزخرفة', 'Finish & Detail')}</span>
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
                ? `<p class="muted" style="margin-bottom:12px">${t('الخدمة المقترحة لهذا التصميم:', 'Suggested matching service:')} <strong>${esc(nameOf(svc))}</strong> (<bdi>${money(svc.price)}</bdi>)</p>`
                : ''
            }
            <div class="hero-actions" style="gap:10px">
              <button type="button" class="btn" id="at-book-look">${t('اطلبي الخدمة بهذا التصميم', 'Book This Look')}</button>
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
      toast(t('تم حفظ التصميم في جواز جمالكِ', 'Style saved to your Beauty Passport'));
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
      renderFn();
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
