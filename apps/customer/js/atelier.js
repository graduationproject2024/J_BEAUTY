import { $, api, esc, href, money, nameOf, state, t, toast } from './state.js';
import { head } from './components.js';
import { trackFunnel } from './motion.js';

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
  { id: 'fair', base: '#F4D7C8', ar: 'فاتحة', en: 'Fair' },
  { id: 'warm', base: '#E4BD9F', ar: 'حنطية دافئة', en: 'Warm Sand' },
  { id: 'olive', base: '#C79672', ar: 'قمحية زيتونية', en: 'Olive' },
  { id: 'deep', base: '#7B513A', ar: 'سمراء غنية', en: 'Deep Rich' },
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
  ['pearl_dot', 'حبة لؤلؤ ناعمة', 'Pearl Cabochon'],
  ['floral_dot', 'لمسة زهرية ناعمة', 'Botanical Blossom'],
];

// Calibrated 5-digit anatomical nail bed anchors on `/assets/images/atelier-hand-base.webp` (720x720)
const HAND_NAILS = [
  { id: 'thumb', cx: 240, cy: 395, w: 31.5, h: 54, a: 2.44, skewX: 0.06, blur: 0.25 },
  { id: 'index', cx: 413, cy: 465, w: 34.5, h: 60, a: 2.49, skewX: -0.04, blur: 0.22 },
  { id: 'middle', cx: 483, cy: 463, w: 35, h: 61, a: 2.49, skewX: -0.03, blur: 0.22 },
  { id: 'ring', cx: 511.5, cy: 404.5, w: 31.5, h: 55, a: 2.52, skewX: -0.04, blur: 0.24 },
  { id: 'pinky', cx: 512, cy: 318, w: 24.5, h: 43, a: 2.49, skewX: -0.02, blur: 0.30 },
];

let handBasePromise = null;
const skinCanvasCache = new Map();

function loadStudioHandResources() {
  if (!handBasePromise) {
    handBasePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 720;
        c.height = 720;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0, 720, 720);
        const baseRaw = g.getImageData(0, 0, 720, 720).data;

        // Feathered anatomical hand/wrist/forearm silhouette extending seamlessly to top-left frame corner
        const mC = document.createElement('canvas');
        mC.width = 720;
        mC.height = 720;
        const mg = mC.getContext('2d');
        mg.fillStyle = '#000';
        mg.fillRect(0, 0, 720, 720);
        mg.filter = 'blur(10px)';
        mg.fillStyle = '#fff';
        mg.beginPath();
        mg.moveTo(-12, -12);
        mg.lineTo(58, -12);
        mg.lineTo(124, 68);
        mg.lineTo(188, 136);
        mg.lineTo(285, 175);
        mg.lineTo(415, 222);
        mg.lineTo(522, 305);
        mg.lineTo(542, 342);
        mg.lineTo(516, 368);
        mg.lineTo(540, 422);
        mg.lineTo(514, 495);
        mg.lineTo(445, 502);
        mg.lineTo(395, 468);
        mg.lineTo(340, 405);
        mg.lineTo(272, 434);
        mg.lineTo(212, 412);
        mg.lineTo(112, 336);
        mg.lineTo(48, 228);
        mg.lineTo(-12, 195);
        mg.closePath();
        mg.fill();
        mg.filter = 'none';
        const maskData = mg.getImageData(0, 0, 720, 720).data;

        skinCanvasCache.set('warm', c);
        resolve({ baseCanvas: c, baseRaw, maskData });
      };
      img.onerror = reject;
      img.src = '/assets/images/atelier-hand-base.webp';
    }).catch(() => null);
  }
  return handBasePromise;
}

function applyMelaninCurve(r, g, b, toneId) {
  if (toneId === 'fair') {
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const lifted = Math.pow(luma, 0.78);
    const boost = (lifted - luma) * 235;
    return [
      Math.max(0, Math.min(255, r + boost + 10)),
      Math.max(0, Math.min(255, g + boost + 4)),
      Math.max(0, Math.min(255, b + boost + 7)),
    ];
  }
  if (toneId === 'olive') {
    return [
      Math.min(255, Math.pow(r / 255, 1.18) * 246),
      Math.min(255, Math.pow(g / 255, 1.22) * 238),
      Math.min(255, Math.pow(b / 255, 1.28) * 222),
    ];
  }
  // Natural espresso cocoa umber for 'deep'
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const darkCurve = Math.pow(luma, 1.72);
  const nr = darkCurve * 240 * 0.94 + (r - luma * 255) * 0.42;
  const ng = darkCurve * 222 * 0.90 + (g - luma * 255) * 0.42;
  const nb = darkCurve * 204 * 0.86 + (b - luma * 255) * 0.42;
  return [Math.max(0, Math.min(255, nr)), Math.max(0, Math.min(255, ng)), Math.max(0, Math.min(255, nb))];
}

function getSkinHandCanvas(resources, toneId) {
  const tone = ['fair', 'warm', 'olive', 'deep'].includes(toneId) ? toneId : 'warm';
  if (skinCanvasCache.has(tone)) return skinCanvasCache.get(tone);

  const c = document.createElement('canvas');
  c.width = 720;
  c.height = 720;
  const g = c.getContext('2d');
  const imgData = new ImageData(new Uint8ClampedArray(resources.baseRaw), 720, 720);
  const d = imgData.data;
  const maskData = resources.maskData;

  for (let i = 0; i < d.length; i += 4) {
    const m = maskData[i] / 255;
    if (m > 0.03) {
      const r = d[i];
      const gr = d[i + 1];
      const bl = d[i + 2];
      const neutralPaper = r - bl < 9 && r > 205;
      const alpha = neutralPaper ? m * 0.15 : m;
      const [nr, ng, nb] = applyMelaninCurve(r, gr, bl, tone);
      d[i] = r + (nr - r) * alpha;
      d[i + 1] = gr + (ng - gr) * alpha;
      d[i + 2] = bl + (nb - bl) * alpha;
    }
  }
  g.putImageData(imgData, 0, 0);
  skinCanvasCache.set(tone, c);
  return c;
}

function nailPath(ctx, w, bedH, ext, shape) {
  const hw = (w / 2) * 1.04;
  const baseD = bedH * 0.49;
  const shoulder = -bedH * 0.16;
  const tipY = -bedH * 0.50 - ext;
  ctx.beginPath();
  ctx.moveTo(-hw, 0);
  ctx.bezierCurveTo(-hw, baseD * 0.80, -hw * 0.62, baseD, 0, baseD);
  ctx.bezierCurveTo(hw * 0.62, baseD, hw, baseD * 0.80, hw, 0);
  ctx.lineTo(hw * 0.99, shoulder);

  if (shape === 'almond') {
    ctx.bezierCurveTo(hw * 0.96, tipY * 0.42, hw * 0.52, tipY * 0.94, 0, tipY * 1.05);
    ctx.bezierCurveTo(-hw * 0.52, tipY * 0.94, -hw * 0.96, tipY * 0.42, -hw * 0.99, shoulder);
  } else if (shape === 'coffin') {
    const tw = hw * 0.56;
    ctx.bezierCurveTo(hw * 0.90, shoulder + (tipY - shoulder) * 0.34, tw * 1.10, tipY * 0.85, tw * 1.02, tipY * 1.01);
    ctx.quadraticCurveTo(tw, tipY * 1.05, tw * 0.80, tipY * 1.05);
    ctx.lineTo(-tw * 0.80, tipY * 1.05);
    ctx.quadraticCurveTo(-tw, tipY * 1.05, -tw * 1.02, tipY * 1.01);
    ctx.bezierCurveTo(-tw * 1.10, tipY * 0.85, -hw * 0.90, shoulder + (tipY - shoulder) * 0.34, -hw * 0.99, shoulder);
  } else if (shape === 'square') {
    ctx.lineTo(hw * 0.91, tipY * 0.85);
    ctx.quadraticCurveTo(hw * 0.90, tipY * 0.98, hw * 0.68, tipY * 1.00);
    ctx.quadraticCurveTo(0, tipY * 1.02, -hw * 0.68, tipY * 1.00);
    ctx.quadraticCurveTo(-hw * 0.90, tipY * 0.98, -hw * 0.91, tipY * 0.85);
    ctx.lineTo(-hw * 0.99, shoulder);
  } else if (shape === 'squoval' || shape === 'soft_square') {
    ctx.lineTo(hw * 0.96, tipY * 0.78);
    ctx.quadraticCurveTo(hw * 0.95, tipY * 1.01, hw * 0.48, tipY * 1.01);
    ctx.lineTo(-hw * 0.48, tipY * 1.01);
    ctx.quadraticCurveTo(-hw * 0.95, tipY * 1.01, -hw * 0.96, tipY * 0.78);
    ctx.lineTo(-hw * 0.99, shoulder);
  } else {
    ctx.bezierCurveTo(hw * 0.98, tipY * 0.56, hw * 0.62, tipY * 1.00, 0, tipY * 1.04);
    ctx.bezierCurveTo(-hw * 0.62, tipY * 1.00, -hw * 0.98, tipY * 0.56, -hw * 0.99, shoulder);
  }
  ctx.closePath();
}

export function recommendedServiceForStyle(cfg) {
  if (cfg.french_style === 'colored') return 'colored-french';
  if (cfg.french_style !== 'none') return 'french-gel';
  return 'gel-polish';
}

function drawTipOverlay(sg, n, ext, topReach, cfg) {
  const rawTip = cfg.tip_color || '#F5EFE8';
  const tipColor = rawTip.toUpperCase() === '#FFFFFF' || rawTip.toUpperCase() === '#FBF7F4' ? '#F6EFE7' : rawTip;
  if (cfg.french_style === 'ombre') {
    const om = sg.createLinearGradient(0, -topReach, 0, n.h * 0.16);
    om.addColorStop(0, tipColor);
    om.addColorStop(0.50, tipColor);
    om.addColorStop(1, 'rgba(255,255,255,0)');
    sg.globalAlpha = 0.74;
    sg.fillStyle = om;
    sg.fillRect(-n.w, -topReach - 10, n.w * 2, topReach + n.h * 0.25);
    return;
  }

  sg.save();
  sg.globalAlpha = 0.88;
  sg.fillStyle = tipColor;
  sg.shadowColor = tipColor;
  sg.shadowBlur = 1.6;
  const isMicro = cfg.french_style === 'micro';
  const tipY = -n.h * 0.50 - ext;
  const flatTip = cfg.shape === 'square' || cfg.shape === 'squoval' || cfg.shape === 'coffin';
  const bandDepth = isMicro ? n.h * 0.048 : n.h * 0.155 + ext * 0.42;
  const smileApex = tipY + bandDepth;
  const smileSpanX = n.w * 0.62;
  const wingRise = isMicro ? (flatTip ? n.h * 0.01 : n.h * 0.055) : flatTip ? n.h * 0.05 : n.h * 0.14;
  sg.beginPath();
  sg.moveTo(-smileSpanX, tipY + wingRise + (isMicro ? bandDepth * 0.55 : bandDepth * 0.28));
  sg.quadraticCurveTo(0, smileApex + (isMicro ? 0.5 : 2.4), smileSpanX, tipY + wingRise + (isMicro ? bandDepth * 0.55 : bandDepth * 0.28));
  sg.lineTo(n.w, -topReach - 16);
  sg.lineTo(-n.w, -topReach - 16);
  sg.closePath();
  sg.fill();
  sg.restore();
}

function drawAccentDetail(sg, n, cfg) {
  if (cfg.accent === 'gold_foil' && n.id !== 'thumb') {
    const leaves = [
      { cx: -3.2, cy: -n.h * 0.08, rx: 2.3, ry: 1.5, rot: -0.35 },
      { cx: 3.1, cy: 1.2, rx: 2.6, ry: 1.4, rot: 0.42 },
      { cx: -0.8, cy: n.h * 0.14, rx: 2.0, ry: 1.3, rot: 0.22 },
      { cx: 1.8, cy: -n.h * 0.22, rx: 1.7, ry: 1.1, rot: -0.58 },
    ];
    leaves.forEach((lf, fi) => {
      sg.save();
      sg.translate(lf.cx, lf.cy);
      sg.rotate(lf.rot);
      const fg = sg.createRadialGradient(-lf.rx * 0.25, -lf.ry * 0.25, 0.2, 0, 0, Math.max(lf.rx, lf.ry) * 1.15);
      fg.addColorStop(0, '#FFFDF0');
      fg.addColorStop(0.45, fi % 2 === 0 ? '#F3D693' : '#E3BC6E');
      fg.addColorStop(0.85, '#B7863E');
      fg.addColorStop(1, 'rgba(183, 134, 62, 0)');
      sg.fillStyle = fg;
      sg.beginPath();
      sg.moveTo(-lf.rx, 0);
      sg.bezierCurveTo(-lf.rx * 0.6, -lf.ry * 1.1, lf.rx * 0.7, -lf.ry * 0.9, lf.rx, 0.15);
      sg.bezierCurveTo(lf.rx * 0.6, lf.ry * 1.05, -lf.rx * 0.7, lf.ry * 0.85, -lf.rx, 0);
      sg.closePath();
      sg.fill();
      sg.restore();
    });
  } else if (cfg.accent === 'pearl_dot') {
    const py = n.h * 0.24;
    sg.save();
    const pg = sg.createRadialGradient(-0.8, py - 0.8, 0.3, 0, py, 2.5);
    pg.addColorStop(0, '#FFFFFF');
    pg.addColorStop(0.65, '#F2EAE2');
    pg.addColorStop(1, '#CBB39B');
    sg.fillStyle = pg;
    sg.beginPath();
    sg.arc(0, py, 2.5, 0, Math.PI * 2);
    sg.fill();
    sg.restore();
  } else if (cfg.accent === 'floral_dot' && n.id === 'ring') {
    const py = n.h * 0.06;
    sg.save();
    sg.translate(0, py);
    for (let i = 0; i < 5; i++) {
      sg.save();
      sg.rotate((i * Math.PI * 2) / 5);
      const petG = sg.createRadialGradient(0, -2.8, 0.2, 0, -2.8, 3.2);
      petG.addColorStop(0, '#FFFFFF');
      petG.addColorStop(0.65, 'rgba(255, 249, 246, 0.95)');
      petG.addColorStop(1, 'rgba(232, 208, 214, 0.82)');
      sg.fillStyle = petG;
      sg.beginPath();
      sg.moveTo(0, -0.5);
      sg.bezierCurveTo(2.4, -1.8, 2.3, -5.2, 0, -5.6);
      sg.bezierCurveTo(-2.3, -5.2, -2.4, -1.8, 0, -0.5);
      sg.closePath();
      sg.fill();
      sg.restore();
    }
    const core = sg.createRadialGradient(-0.3, -0.3, 0.1, 0, 0, 1.55);
    core.addColorStop(0, '#F5DFA2');
    core.addColorStop(1, '#C59A54');
    sg.fillStyle = core;
    sg.beginPath();
    sg.arc(0, 0, 1.45, 0, Math.PI * 2);
    sg.fill();
    sg.restore();
  }
}

export async function paintAtelierCanvas(canvas, cfg, lightX = 45) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const resources = await loadStudioHandResources();
  if (!resources) return;

  const skinCanvas = getSkinHandCanvas(resources, cfg.skin || 'warm');
  ctx.clearRect(0, 0, 720, 720);
  ctx.drawImage(skinCanvas, 0, 0, 720, 720);

  const extBaseMap = { short: 2.0, medium: 5.2, long: 9.6 };
  const extVal = extBaseMap[cfg.length] ?? 5.2;
  const polish = cfg.polish_color || '#F3DCE1';
  const hasFrench = cfg.french_style && cfg.french_style !== 'none';
  const lightShift = ((lightX - 45) / 45) * 4.5;
  const cuticleShadeBySkin = {
    fair: ['rgba(162, 108, 96, 0.20)', 'rgba(182, 126, 112, 0.06)'],
    warm: ['rgba(128, 78, 58, 0.26)', 'rgba(148, 92, 70, 0.07)'],
    olive: ['rgba(98, 62, 44, 0.30)', 'rgba(124, 78, 56, 0.08)'],
    deep: ['rgba(48, 26, 19, 0.38)', 'rgba(72, 42, 32, 0.10)'],
  };
  const [cutDeep, cutMid] = cuticleShadeBySkin[cfg.skin] || cuticleShadeBySkin.warm;

  for (const n of HAND_NAILS) {
    const ext = extVal * (n.h / 52) * (n.id === 'ring' ? 0.78 : 1);
    const topReach = n.h * 0.56 + ext;

    // Diffused studio contact shadow onto the linen/fingerpad beneath extended nail tips
    if (ext > 2.4) {
      ctx.save();
      ctx.translate(n.cx + 1.4, n.cy + 2.8);
      ctx.rotate(n.a);
      ctx.transform(1, 0, n.skewX || 0, 1, 0, 0);
      ctx.scale(0.90, 0.99);
      nailPath(ctx, n.w, n.h, ext * 0.94, cfg.shape);
      ctx.filter = 'blur(3.0px)';
      ctx.fillStyle = ext > 6.5 ? 'rgba(42, 28, 20, 0.17)' : 'rgba(42, 28, 20, 0.11)';
      ctx.fill();
      ctx.filter = 'none';
      ctx.restore();
    }

    // Recessed anatomical nail-fold contact shadow onto surrounding skin before placing plate
    ctx.save();
    ctx.translate(n.cx, n.cy);
    ctx.rotate(n.a);
    ctx.transform(1, 0, n.skewX || 0, 1, 0, 0);
    ctx.scale(1.03, 1.015);
    nailPath(ctx, n.w, n.h, 0, cfg.shape);
    ctx.filter = 'blur(1.8px)';
    ctx.strokeStyle = cfg.skin === 'deep' ? 'rgba(26, 14, 10, 0.34)' : 'rgba(92, 56, 46, 0.22)';
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.filter = 'none';
    ctx.restore();

    const spr = document.createElement('canvas');
    spr.width = 160;
    spr.height = 180;
    const sg = spr.getContext('2d');
    sg.translate(80, 90);
    sg.transform(1, 0, n.skewX || 0, 1, 0, 0);

    // Clipped nail plate compositing
    sg.save();
    nailPath(sg, n.w, n.h, ext, cfg.shape);
    sg.clip();

    if (hasFrench) {
      sg.fillStyle = '#E8C5CA';
      sg.globalAlpha = 0.72;
      sg.fillRect(-n.w, -topReach - 8, n.w * 2, topReach + n.h);
    }
    sg.globalAlpha = hasFrench ? 0.86 : 0.96;
    sg.fillStyle = polish;
    sg.fillRect(-n.w, -topReach - 8, n.w * 2, topReach + n.h);

    // Subtle natural lunula half-moon & longitudinal gel depth gradient
    sg.globalAlpha = 1;
    const lunula = sg.createRadialGradient(0, n.h * 0.44, 1, 0, n.h * 0.44, n.w * 0.40);
    lunula.addColorStop(0, 'rgba(255, 248, 246, 0.30)');
    lunula.addColorStop(0.55, 'rgba(255, 245, 243, 0.12)');
    lunula.addColorStop(1, 'rgba(255, 245, 243, 0)');
    sg.fillStyle = lunula;
    sg.fillRect(-n.w, 0, n.w * 2, n.h * 0.56);

    if (hasFrench) {
      const bedG = sg.createLinearGradient(0, n.h * 0.48, 0, -topReach * 0.2);
      bedG.addColorStop(0, 'rgba(222, 164, 172, 0.36)');
      bedG.addColorStop(0.55, 'rgba(238, 198, 206, 0.18)');
      bedG.addColorStop(1, 'rgba(252, 238, 242, 0.03)');
      sg.fillStyle = bedG;
      sg.fillRect(-n.w, -topReach, n.w * 2, topReach + n.h);
    }

    // 3D cylindrical C-curve sidewall shading & dome curvature matching warm top-left daylight
    sg.globalAlpha = 1;
    const baseCyl = sg.createLinearGradient(-n.w * 0.54, 0, n.w * 0.54, 0);
    baseCyl.addColorStop(0, 'rgba(38, 18, 22, 0.28)');
    baseCyl.addColorStop(0.16, 'rgba(38, 18, 22, 0.08)');
    baseCyl.addColorStop(0.45, 'rgba(255, 250, 248, 0.06)');
    baseCyl.addColorStop(0.84, 'rgba(38, 18, 22, 0.09)');
    baseCyl.addColorStop(1, 'rgba(38, 18, 22, 0.30)');
    sg.fillStyle = baseCyl;
    sg.fillRect(-n.w, -topReach - 8, n.w * 2, topReach + n.h + 8);

    if (hasFrench) {
      drawTipOverlay(sg, n, ext, topReach, cfg);
      const tipWrap = sg.createLinearGradient(-n.w * 0.52, 0, n.w * 0.52, 0);
      tipWrap.addColorStop(0, 'rgba(42, 22, 24, 0.16)');
      tipWrap.addColorStop(0.22, 'rgba(255, 255, 255, 0.02)');
      tipWrap.addColorStop(0.50, 'rgba(255, 255, 255, 0.06)');
      tipWrap.addColorStop(0.78, 'rgba(255, 255, 255, 0.02)');
      tipWrap.addColorStop(1, 'rgba(42, 22, 24, 0.18)');
      sg.globalAlpha = 1;
      sg.fillStyle = tipWrap;
      sg.fillRect(-n.w, -topReach - 8, n.w * 2, topReach * 0.72);
    }

    drawAccentDetail(sg, n, cfg);

    // Top coat finish studio lighting extending cleanly through the tip edge
    sg.globalAlpha = 1;
    if (cfg.finish === 'gloss' || cfg.finish === 'pearl') {
      if (cfg.finish === 'pearl') {
        const pr = sg.createRadialGradient(-n.w * 0.10 + lightShift * 0.4, -n.h * 0.14, 2, 0, -n.h * 0.05, n.w * 0.72);
        pr.addColorStop(0, 'rgba(255,250,255,0.58)');
        pr.addColorStop(0.45, 'rgba(252,226,238,0.26)');
        pr.addColorStop(0.82, 'rgba(232,238,246,0.14)');
        pr.addColorStop(1, 'rgba(255,255,255,0)');
        sg.fillStyle = pr;
        sg.fillRect(-n.w, -topReach - 6, n.w * 2, topReach + n.h + 6);
      }
      // Curved subtle midtone contrast dip adjacent to specular rib so high-key pinks hold crisp gloss definition
      const depthBand = sg.createLinearGradient(0, -topReach, 0, n.h * 0.45);
      depthBand.addColorStop(0, 'rgba(58, 30, 38, 0.04)');
      depthBand.addColorStop(0.50, 'rgba(58, 30, 38, 0.09)');
      depthBand.addColorStop(1, 'rgba(58, 30, 38, 0.14)');
      sg.fillStyle = depthBand;
      sg.fillRect(-n.w, -topReach - 4, n.w * 2, topReach + n.h);

      const hx = Math.max(-n.w * 0.28, Math.min(n.w * 0.26, -n.w * 0.16 + lightShift * 0.85));
      const ribHalf = cfg.finish === 'gloss' ? 5.6 : 7.6;
      const peakA = cfg.finish === 'gloss' ? 0.86 : 0.48;
      const rib = sg.createLinearGradient(hx - ribHalf, 0, hx + ribHalf, 0);
      rib.addColorStop(0, 'rgba(255,255,255,0)');
      rib.addColorStop(0.28, `rgba(255,255,255,${(peakA * 0.36).toFixed(2)})`);
      rib.addColorStop(0.50, `rgba(255,255,255,${peakA.toFixed(2)})`);
      rib.addColorStop(0.72, `rgba(255,255,255,${(peakA * 0.32).toFixed(2)})`);
      rib.addColorStop(1, 'rgba(255,255,255,0)');
      sg.fillStyle = rib;
      sg.beginPath();
      sg.ellipse(hx, -topReach * 0.14, ribHalf, (topReach + n.h * 0.36) * 0.46, 0.05, 0, Math.PI * 2);
      sg.fill();

      // Secondary crisp studio window catchlight bead along the apex
      if (cfg.finish === 'gloss') {
        const apexCatch = sg.createRadialGradient(hx + 0.6, -n.h * 0.18, 0.2, hx + 0.6, -n.h * 0.18, ribHalf * 1.45);
        apexCatch.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
        apexCatch.addColorStop(0.45, 'rgba(255, 253, 250, 0.45)');
        apexCatch.addColorStop(1, 'rgba(255, 255, 255, 0)');
        sg.fillStyle = apexCatch;
        sg.beginPath();
        sg.ellipse(hx + 0.6, -n.h * 0.18, ribHalf * 0.95, n.h * 0.22, 0.04, 0, Math.PI * 2);
        sg.fill();
      }

      const rimR = sg.createLinearGradient(n.w * 0.20, 0, n.w * 0.44, 0);
      rimR.addColorStop(0, 'rgba(255,250,246,0)');
      rimR.addColorStop(0.55, 'rgba(255,250,246,0.18)');
      rimR.addColorStop(1, 'rgba(255,250,246,0)');
      sg.fillStyle = rimR;
      sg.fillRect(n.w * 0.20, -topReach - 2, n.w * 0.26, topReach + n.h * 0.4);
    } else {
      // Velvet satin matte with distinct 3D cylindrical dome curvature & recessed sidewalls
      const mt = sg.createLinearGradient(-n.w * 0.54, 0, n.w * 0.54, 0);
      mt.addColorStop(0, 'rgba(30, 18, 16, 0.18)');
      mt.addColorStop(0.22, 'rgba(255, 255, 255, 0.04)');
      mt.addColorStop(0.45, 'rgba(255, 255, 255, 0.16)');
      mt.addColorStop(0.72, 'rgba(255, 255, 255, 0.03)');
      mt.addColorStop(1, 'rgba(30, 18, 16, 0.18)');
      sg.fillStyle = mt;
      sg.fillRect(-n.w, -topReach - 8, n.w * 2, topReach + n.h + 8);
    }

    // Subtle lateral sidewall crease & skin-toned proximal cuticle pocket fold
    const groove = sg.createLinearGradient(-n.w * 0.54, 0, n.w * 0.54, 0);
    groove.addColorStop(0, cutDeep);
    groove.addColorStop(0.06, 'rgba(0,0,0,0)');
    groove.addColorStop(0.94, 'rgba(0,0,0,0)');
    groove.addColorStop(1, cutDeep);
    sg.fillStyle = groove;
    sg.fillRect(-n.w, -topReach - 6, n.w * 2, topReach + n.h + 6);

    const cut = sg.createLinearGradient(0, n.h * 0.50, 0, n.h * 0.20);
    cut.addColorStop(0, cutDeep);
    cut.addColorStop(0.42, cutMid);
    cut.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sg.fillStyle = cut;
    sg.fillRect(-n.w, n.h * 0.16, n.w * 2, n.h * 0.40);
    sg.restore();

    ctx.save();
    ctx.translate(n.cx, n.cy);
    ctx.rotate(n.a);
    if (n.blur > 0) ctx.filter = `blur(${n.blur}px)`;
    ctx.drawImage(spr, -80, -90);
    ctx.filter = 'none';
    ctx.restore();
  }
}

let drawQueued = false;
function syncAtelierCanvases() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    document.querySelectorAll('.atelier-hand-canvas').forEach((canvas) => {
      paintAtelierCanvas(canvas, state.atelier, state.atelier.lightX || 45);
    });
  });
}

export function renderNailPreviewSVG(cfg, lightX = 45) {
  syncAtelierCanvases();
  return `
    <div class="atelier-canvas-frame">
      <canvas
        class="atelier-hand-canvas atelier-hand-svg"
        width="720"
        height="720"
        role="img"
        data-light-x="${Math.round(lightX)}"
        aria-label="${t('معاينة واقعية لتصميم الأظافر على اليد', 'Photographic studio nail design preview on hand')}">
      </canvas>
    </div>
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
          <span class="eyebrow">${t('أتيليه J للأظافر · معاينة واقعية', 'J NAIL ATELIER · INTERACTIVE STUDIO')}</span>
          <h3>${t('صمّمي إطلالة أظافركِ قبل الحجز', 'Preview your manicure look before booking')}</h3>
          <p class="muted">${t(
            'اختاري شكل الظفر ودرجات الجل أو الفرنش على معاينة واقعية، واحفظي التصميم أو ابدئي حجزه مباشرة.',
            'Explore nail shapes, polish shades, and French tips in real time on a live studio preview, then save or book your look.',
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
        t('اختاري الشكل والطول واللون والفرنش واللمعة النهائية على معاينة استوديو واقعية قبل طلب موعدكِ.', 'Customize nail shape, length, polish shade, French tip, and finish with live studio photographic rendering.'),
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
                   <pre style="margin:0;padding:8px 10px" dir="ltr">${esc(cfg.lastShareUrl)}</pre>
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

          <div class="atelier-action-box">
            ${
              svc
                ? `<p class="muted" style="margin-bottom:12px">${t('الخدمة المقترحة لهذا التصميم:', 'Suggested matching service:')} <strong>${esc(nameOf(svc))}</strong> (<bdi>${money(svc.price)}</bdi>)</p>`
                : ''
            }
            <div class="hero-actions atelier-cta-row">
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
    document.querySelectorAll('.atelier-hand-canvas').forEach((canvas) => {
      paintAtelierCanvas(canvas, state.atelier, state.atelier.lightX || 45);
    });
  }

  // Trigger initial studio draw immediately upon route mount
  syncAtelierCanvases();

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
      const canvas = stage.querySelector('.atelier-hand-canvas');
      if (canvas) paintAtelierCanvas(canvas, state.atelier, state.atelier.lightX);
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
