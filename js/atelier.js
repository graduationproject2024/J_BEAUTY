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

// Calibrated 5-digit anatomical nail bed anchors on `/J_BEAUTY/assets/images/atelier-hand-base.webp` (720x720)
const HAND_NAILS = [
  { id: 'thumb', cx: 242, cy: 396, w: 34, h: 58, a: 2.48, skewX: 0.08, blur: 0 },
  { id: 'index', cx: 414, cy: 464, w: 35, h: 61, a: 2.49, skewX: -0.04, blur: 0 },
  { id: 'middle', cx: 484, cy: 462, w: 35.5, h: 62, a: 2.49, skewX: -0.03, blur: 0 },
  { id: 'ring', cx: 513, cy: 404, w: 32.5, h: 58, a: 2.52, skewX: -0.04, blur: 0 },
  { id: 'pinky', cx: 514, cy: 316, w: 26.5, h: 46, a: 2.45, skewX: -0.05, blur: 0.15 },
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
      img.src = '/J_BEAUTY/assets/images/atelier-hand-base.webp';
    }).catch(() => null);
  }
  return handBasePromise;
}

function applyMelaninCurve(r, g, b, toneId) {
  if (toneId === 'fair') {
    return [Math.min(255, r * 1.06 + 8), Math.min(255, g * 1.05 + 5), Math.min(255, b * 1.06 + 7)];
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
  const hw = w / 2;
  const baseD = bedH * 0.44;
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
    ctx.lineTo(hw * 0.96, tipY * 0.96);
    ctx.quadraticCurveTo(0, tipY * 0.99, -hw * 0.96, tipY * 0.96);
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
  const tipColor = cfg.tip_color || '#F5EFE8';
  if (cfg.french_style === 'ombre') {
    const om = sg.createLinearGradient(0, -topReach, 0, n.h * 0.16);
    om.addColorStop(0, tipColor);
    om.addColorStop(0.55, tipColor);
    om.addColorStop(1, 'rgba(255,255,255,0)');
    sg.globalAlpha = 0.92;
    sg.fillStyle = om;
    sg.fillRect(-n.w, -topReach - 10, n.w * 2, topReach + n.h * 0.25);
    return;
  }

  sg.globalAlpha = 0.97;
  sg.fillStyle = tipColor;
  const isMicro = cfg.french_style === 'micro';
  const smileApex = isMicro ? -topReach * 0.84 : -n.h * 0.20 - ext * 0.55;
  const smileSpanX = cfg.shape === 'coffin' ? n.w * 0.42 : n.w * 0.48;
  const wingRiseY = isMicro ? n.h * 0.08 : n.h * 0.16;
  sg.beginPath();
  sg.moveTo(-smileSpanX * 1.15, smileApex + wingRiseY);
  sg.quadraticCurveTo(0, smileApex - (isMicro ? 2.0 : 3.5), smileSpanX * 1.15, smileApex + wingRiseY);
  sg.lineTo(n.w, -topReach - 12);
  sg.lineTo(-n.w, -topReach - 12);
  sg.closePath();
  sg.fill();
}

function drawAccentDetail(sg, n, cfg) {
  if (cfg.accent === 'gold_foil' && n.id !== 'thumb') {
    const flakes = [
      [[-4.8, -n.h * 0.06], [-1.2, -n.h * 0.12], [-0.4, -n.h * 0.03], [-3.8, n.h * 0.02]],
      [[2.2, 2], [6.0, 0.4], [5.4, 4.8], [1.6, 4.0]],
      [[-2.5, 9], [1.2, 7.2], [2.4, 11.2], [-1.8, 12.2]],
      [[0.8, -n.h * 0.20], [4.2, -n.h * 0.24], [3.6, -n.h * 0.16]],
    ];
    flakes.forEach((pts, fi) => {
      sg.save();
      const fg = sg.createLinearGradient(-6, -n.h * 0.2, 6, 12);
      fg.addColorStop(0, '#FFF8DC');
      fg.addColorStop(0.35, fi % 2 === 0 ? '#F2D28B' : '#DFB66A');
      fg.addColorStop(1, '#A47536');
      sg.fillStyle = fg;
      sg.beginPath();
      pts.forEach(([px, py], pi) => (pi === 0 ? sg.moveTo(px, py) : sg.lineTo(px, py)));
      sg.closePath();
      sg.fill();
      sg.strokeStyle = 'rgba(255, 250, 225, 0.65)';
      sg.lineWidth = 0.5;
      sg.stroke();
      sg.restore();
    });
  } else if (cfg.accent === 'pearl_dot') {
    const py = n.h * 0.25;
    sg.save();
    const pg = sg.createRadialGradient(-0.8, py - 0.8, 0.3, 0, py, 2.3);
    pg.addColorStop(0, '#FFFFFF');
    pg.addColorStop(0.65, '#EFE5DD');
    pg.addColorStop(1, '#CBB39B');
    sg.fillStyle = pg;
    sg.beginPath();
    sg.arc(0, py, 2.3, 0, Math.PI * 2);
    sg.fill();
    sg.restore();
  } else if (cfg.accent === 'floral_dot' && n.id === 'ring') {
    const py = n.h * 0.08;
    sg.save();
    sg.fillStyle = 'rgba(255, 252, 249, 0.94)';
    for (const [dx, dy] of [
      [0, -3.2],
      [3.1, -0.8],
      [2.0, 2.8],
      [-2.0, 2.8],
      [-3.1, -0.8],
    ]) {
      sg.beginPath();
      sg.arc(dx, py + dy, 1.75, 0, Math.PI * 2);
      sg.fill();
    }
    sg.fillStyle = '#D4AF7C';
    sg.beginPath();
    sg.arc(0, py, 1.45, 0, Math.PI * 2);
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

  const extBaseMap = { short: 1.5, medium: 5.8, long: 11.2 };
  const extVal = extBaseMap[cfg.length] ?? 5.8;
  const polish = cfg.polish_color || '#F3DCE1';
  const hasFrench = cfg.french_style && cfg.french_style !== 'none';
  const lightShift = ((lightX - 45) / 45) * 4.5;

  for (const n of HAND_NAILS) {
    const spr = document.createElement('canvas');
    spr.width = 160;
    spr.height = 180;
    const sg = spr.getContext('2d');
    sg.translate(80, 90);
    sg.transform(1, 0, n.skewX || 0, 1, 0, 0);

    const ext = extVal * (n.h / 52);
    const topReach = n.h * 0.56 + ext;

    // Compact ambient shadow beneath distal tip
    sg.save();
    sg.translate(0.6, -1.6);
    nailPath(sg, n.w, n.h, ext, cfg.shape);
    sg.filter = 'blur(1.3px)';
    sg.fillStyle = 'rgba(42, 24, 18, 0.22)';
    sg.fill();
    sg.restore();

    // Clipped nail plate compositing
    sg.save();
    nailPath(sg, n.w, n.h, ext, cfg.shape);
    sg.clip();

    if (hasFrench) {
      sg.fillStyle = '#EED4D8';
      sg.globalAlpha = 0.78;
      sg.fillRect(-n.w, -topReach - 8, n.w * 2, topReach + n.h);
    }
    sg.globalAlpha = hasFrench ? 0.90 : 0.98;
    sg.fillStyle = polish;
    sg.fillRect(-n.w, -topReach - 8, n.w * 2, topReach + n.h);

    if (hasFrench) {
      const bedG = sg.createLinearGradient(0, n.h * 0.44, 0, -topReach * 0.2);
      bedG.addColorStop(0, 'rgba(235, 182, 188, 0.42)');
      bedG.addColorStop(0.55, 'rgba(244, 210, 216, 0.24)');
      bedG.addColorStop(1, 'rgba(252, 238, 242, 0.04)');
      sg.globalAlpha = 1;
      sg.fillStyle = bedG;
      sg.fillRect(-n.w, -topReach, n.w * 2, topReach + n.h);
      drawTipOverlay(sg, n, ext, topReach, cfg);
    }

    // Subtle cylindrical C-curve depth
    sg.globalAlpha = 1;
    const cyl = sg.createLinearGradient(-n.w / 2, 0, n.w / 2, 0);
    cyl.addColorStop(0, 'rgba(42, 22, 26, 0.22)');
    cyl.addColorStop(0.20, 'rgba(42, 22, 26, 0.03)');
    cyl.addColorStop(0.50, 'rgba(255, 255, 255, 0.08)');
    cyl.addColorStop(0.84, 'rgba(42, 22, 26, 0.04)');
    cyl.addColorStop(1, 'rgba(42, 22, 26, 0.24)');
    sg.fillStyle = cyl;
    sg.fillRect(-n.w, -topReach - 8, n.w * 2, topReach + n.h);

    drawAccentDetail(sg, n, cfg);

    // Top coat finish studio lighting
    if (cfg.finish === 'gloss' || cfg.finish === 'pearl') {
      if (cfg.finish === 'pearl') {
        const pr = sg.createRadialGradient(-n.w * 0.10 + lightShift * 0.4, -n.h * 0.14, 2, 0, -n.h * 0.05, n.w * 0.72);
        pr.addColorStop(0, 'rgba(255,250,255,0.62)');
        pr.addColorStop(0.42, 'rgba(252,226,238,0.28)');
        pr.addColorStop(0.80, 'rgba(232,238,246,0.14)');
        pr.addColorStop(1, 'rgba(255,255,255,0)');
        sg.fillStyle = pr;
        sg.fillRect(-n.w, -topReach, n.w * 2, topReach + n.h);
      }
      const hx = Math.max(-n.w * 0.34, Math.min(n.w * 0.30, -n.w * 0.16 + lightShift));
      const ribHalf = cfg.finish === 'gloss' ? 6.5 : 8.0;
      const peakA = cfg.finish === 'gloss' ? 0.56 : 0.36;
      const rib = sg.createLinearGradient(hx - ribHalf, 0, hx + ribHalf, 0);
      rib.addColorStop(0, 'rgba(255,255,255,0)');
      rib.addColorStop(0.32, `rgba(255,255,255,${(peakA * 0.38).toFixed(2)})`);
      rib.addColorStop(0.50, `rgba(255,255,255,${peakA.toFixed(2)})`);
      rib.addColorStop(0.68, `rgba(255,255,255,${(peakA * 0.34).toFixed(2)})`);
      rib.addColorStop(1, 'rgba(255,255,255,0)');
      sg.fillStyle = rib;
      sg.fillRect(hx - ribHalf, -topReach * 0.94, ribHalf * 2, topReach * 0.94 + n.h * 0.38);

      const rimR = sg.createLinearGradient(n.w * 0.22, 0, n.w * 0.46, 0);
      rimR.addColorStop(0, 'rgba(255,250,246,0)');
      rimR.addColorStop(0.55, 'rgba(255,250,246,0.15)');
      rimR.addColorStop(1, 'rgba(255,250,246,0)');
      sg.fillStyle = rimR;
      sg.fillRect(n.w * 0.22, -topReach * 0.85, n.w * 0.26, topReach + n.h * 0.4);
    } else {
      const mt = sg.createLinearGradient(-n.w * 0.35, 0, n.w * 0.35, 0);
      mt.addColorStop(0, 'rgba(255,255,255,0)');
      mt.addColorStop(0.38, 'rgba(255,255,255,0.09)');
      mt.addColorStop(1, 'rgba(255,255,255,0)');
      sg.fillStyle = mt;
      sg.fillRect(-n.w, -topReach, n.w * 2, topReach + n.h);
    }

    // Tight proximal cuticle shadow pocket
    const pocketAlpha = cfg.skin === 'deep' ? 0.44 : 0.32;
    const cut = sg.createLinearGradient(0, n.h * 0.46, 0, n.h * 0.14);
    cut.addColorStop(0, `rgba(40, 18, 14, ${pocketAlpha})`);
    cut.addColorStop(0.45, 'rgba(40, 18, 14, 0.10)');
    cut.addColorStop(1, 'rgba(40, 18, 14, 0)');
    sg.fillStyle = cut;
    sg.fillRect(-n.w, n.h * 0.10, n.w * 2, n.h * 0.45);
    sg.restore();

    // Tight 0.6px anti-aliased cuticle blend
    sg.save();
    sg.globalCompositeOperation = 'destination-out';
    const cFade = sg.createLinearGradient(0, n.h * 0.455, 0, n.h * 0.43);
    cFade.addColorStop(0, 'rgba(0,0,0,0.65)');
    cFade.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = cFade;
    sg.fillRect(-n.w, n.h * 0.42, n.w * 2, n.h * 0.06);
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
