// Prototype B & WebGL-Fallback: High-Craft 2.5D Photorealistic Studio Compositor
// Isolates skin hue from background linen, zooms closer on fingers, and applies curved C-arch nail lighting.

let cachedStudioImg = null;
let cachedSkinMask = null;

function loadStudioHand(src = '/J_BEAUTY/apps/customer/assets/images/atelier-hand-base.webp') {
  if (cachedStudioImg) return cachedStudioImg;
  cachedStudioImg = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  return cachedStudioImg;
}

// Pixel-verified 720x720 zoomed natural nail plate anchors (mapped on grid-25d.png)
const CROP_X = 118;
const CROP_Y = 152;

const ZOOM_NAILS = [
  { id: 'thumb', cx: 178, cy: 365, w: 56, h: 86, a: 2.52, blur: 0.1 },
  { id: 'index', cx: 429, cy: 444, w: 48, h: 82, a: 2.67, blur: 0 },
  { id: 'middle', cx: 533, cy: 444, w: 50, h: 82, a: 2.70, blur: 0 },
  { id: 'ring', cx: 585, cy: 360, w: 46, h: 78, a: 2.67, blur: 0 },
  { id: 'pinky', cx: 582, cy: 247, w: 38, h: 58, a: 2.46, blur: 0.25 },
];

const SKIN_ADJUST = {
  fair: { mult: [1.08, 1.04, 1.04], shadow: [215, 168, 158], gamma: 0.94 },
  warm: { mult: [1.0, 0.96, 0.93], shadow: [175, 128, 102], gamma: 1.0 },
  olive: { mult: [0.89, 0.85, 0.77], shadow: [142, 102, 74], gamma: 1.06 },
  deep: { mult: [0.58, 0.45, 0.37], shadow: [76, 48, 35], gamma: 1.24 },
};

function hexToRgb(hex) {
  const c = String(hex || '#F3DCE1').replace('#', '');
  const f = c.length === 3 ? c.split('').map((x) => x + x).join('') : c.padEnd(6, 'F');
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}
function rgbStr([r, g, b], a = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}
function mixColor(hex1, hex2, t) {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  return rgbStr([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], 1);
}

function getZoomedSkinLayer(img) {
  if (cachedSkinMask) return cachedSkinMask;
  const c = document.createElement('canvas');
  c.width = 720;
  c.height = 720;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, CROP_X, CROP_Y, 490, 490, 0, 0, 720, 720);
  const raw = ctx.getImageData(0, 0, 720, 720);

  // Chromatic skin detector: warm skin has R > G > B and warmth (R - B) significantly above cool beige linen!
  const skinAlpha = new Float32Array(720 * 720);
  const d = raw.data;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const rg = r - g;
    const rb = r - b;
    const warmthScore = Math.max(0, Math.min(1, (rb - 22) / 30)) * Math.max(0, Math.min(1, (rg - 6) / 22));
    // Soft feathered hand boundary mask (keeps linen fabric & eucalyptus 100% pure with zero boxy seam)
    const x = (p % 720) / 720;
    const y = Math.floor(p / 720) / 720;
    const radial = Math.hypot((x - 0.36) / 0.56, (y - 0.32) / 0.52);
    const spatial = Math.max(0, Math.min(1, 1 - (radial - 0.85) / 0.28));
    skinAlpha[p] = warmthScore * spatial;
  }

  cachedSkinMask = { raw, skinAlpha };
  return cachedSkinMask;
}

function traceShape(ctx, w, h, topReach, shape) {
  const rx = w * 0.5;
  const ry = h * 0.5;
  ctx.beginPath();
  ctx.moveTo(-rx * 0.88, ry * 0.64);
  ctx.bezierCurveTo(-rx * 0.45, ry * 0.98, rx * 0.45, ry * 0.98, rx * 0.88, ry * 0.64);
  ctx.bezierCurveTo(rx * 1.0, ry * 0.36, rx * 0.99, -ry * 0.14, rx * 0.96, -ry * 0.55);

  if (shape === 'square') {
    ctx.lineTo(rx * 0.95, -topReach + 2);
    ctx.quadraticCurveTo(rx * 0.94, -topReach, rx * 0.72, -topReach);
    ctx.lineTo(-rx * 0.72, -topReach);
    ctx.quadraticCurveTo(-rx * 0.94, -topReach, -rx * 0.95, -topReach + 2);
  } else if (shape === 'squoval') {
    ctx.quadraticCurveTo(rx * 0.95, -topReach * 0.94, rx * 0.62, -topReach);
    ctx.lineTo(-rx * 0.62, -topReach);
    ctx.quadraticCurveTo(-rx * 0.95, -topReach * 0.94, -rx * 0.96, -ry * 0.55);
  } else if (shape === 'coffin') {
    ctx.lineTo(rx * 0.46, -topReach);
    ctx.lineTo(-rx * 0.46, -topReach);
  } else if (shape === 'almond') {
    ctx.bezierCurveTo(rx * 0.86, -topReach * 0.78, rx * 0.34, -topReach * 1.06, 0, -topReach * 1.06);
    ctx.bezierCurveTo(-rx * 0.34, -topReach * 1.06, -rx * 0.86, -topReach * 0.78, -rx * 0.96, -ry * 0.55);
  } else {
    ctx.bezierCurveTo(rx * 0.9, -topReach * 0.82, rx * 0.48, -topReach * 1.01, 0, -topReach * 1.01);
    ctx.bezierCurveTo(-rx * 0.48, -topReach * 1.01, -rx * 0.9, -topReach * 0.82, -rx * 0.96, -ry * 0.55);
  }

  ctx.bezierCurveTo(-rx * 0.99, -ry * 0.14, -rx * 1.0, ry * 0.36, -rx * 0.88, ry * 0.64);
  ctx.closePath();
}

export async function paintAtelier25DCanvas(canvas, cfg, lightX = 45) {
  if (!canvas) return;
  const img = await loadStudioHand();
  const ctx = canvas.getContext('2d');
  if (!ctx || !img) return;

  const { raw, skinAlpha } = getZoomedSkinLayer(img);
  const adj = SKIN_ADJUST[cfg.skin] || SKIN_ADJUST.warm;
  const out = new ImageData(new Uint8ClampedArray(raw.data), 720, 720);
  const d = out.data;

  // Luminance-preserving skin tone adjustment leaving linen fabric crisp & bright!
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const a = skinAlpha[p];
    if (a < 0.02) continue;
    const rN = Math.pow(d[i] / 255, adj.gamma) * adj.mult[0] * 255;
    const gN = Math.pow(d[i + 1] / 255, adj.gamma) * adj.mult[1] * 255;
    const bN = Math.pow(d[i + 2] / 255, adj.gamma) * adj.mult[2] * 255;
    d[i] = Math.min(255, d[i] + (rN - d[i]) * a);
    d[i + 1] = Math.min(255, d[i + 1] + (gN - d[i + 1]) * a);
    d[i + 2] = Math.min(255, d[i + 2] + (bN - d[i + 2]) * a);
  }
  ctx.putImageData(out, 0, 0);

  const lengthMap = { short: 0.82, medium: 1.18, long: 1.56 };
  const extMult = lengthMap[cfg.length] || 1.18;
  const cutCol = rgbStr(adj.shadow, 0.56);
  const lightBias = (Number(lightX || 45) - 50) / 50;

  for (let ni = 0; ni < ZOOM_NAILS.length; ni++) {
    const n = ZOOM_NAILS[ni];
    const topReach = (n.h * 0.54) * extMult;
    const spr = document.createElement('canvas');
    spr.width = 180;
    spr.height = 220;
    const sg = spr.getContext('2d');
    sg.translate(90, 118);

    // Subtle soft contact shadow under overhanging free tip
    if (cfg.length !== 'short') {
      sg.save();
      sg.translate(2, -4);
      sg.shadowColor = 'rgba(28,16,14,0.30)';
      sg.shadowBlur = 9;
      traceShape(sg, n.w, n.h, topReach, cfg.shape);
      sg.fillStyle = 'rgba(0,0,0,0.01)';
      sg.fill();
      sg.restore();
    }

    sg.save();
    traceShape(sg, n.w, n.h, topReach, cfg.shape);
    sg.clip();

    const baseBg = sg.createLinearGradient(0, n.h * 0.5, 0, -topReach);
    baseBg.addColorStop(0, mixColor(cfg.polish_color, '#1A0B0E', 0.16));
    baseBg.addColorStop(0.35, cfg.polish_color);
    baseBg.addColorStop(1, mixColor(cfg.polish_color, '#FFFFFF', 0.08));
    sg.fillStyle = baseBg;
    sg.fillRect(-n.w, -topReach - 10, n.w * 2, topReach + n.h + 15);

    // French / Micro / Ombre
    const tipColor = cfg.tip_color || '#F5EFE8';
    if (cfg.french_style === 'ombre') {
      const om = sg.createLinearGradient(0, 4, 0, -topReach);
      om.addColorStop(0, rgbStr(hexToRgb(cfg.polish_color), 0));
      om.addColorStop(0.55, rgbStr(hexToRgb(tipColor), 0.72));
      om.addColorStop(1, rgbStr(hexToRgb(tipColor), 0.98));
      sg.fillStyle = om;
      sg.fillRect(-n.w, -topReach - 8, n.w * 2, topReach + n.h);
    } else if (cfg.french_style === 'classic' || cfg.french_style === 'colored') {
      const rx = n.w * 0.5;
      const syCenter = -topReach * 0.68;
      const sySide = -topReach * 0.44;
      sg.fillStyle = tipColor;
      sg.beginPath();
      sg.moveTo(-rx * 1.04, sySide);
      sg.quadraticCurveTo(0, syCenter - 6, rx * 1.04, sySide);
      sg.lineTo(rx * 1.05, -topReach - 18);
      sg.lineTo(-rx * 1.05, -topReach - 18);
      sg.closePath();
      sg.fill();
    } else if (cfg.french_style === 'micro') {
      sg.strokeStyle = tipColor;
      sg.lineWidth = 4.2;
      traceShape(sg, n.w, n.h, topReach, cfg.shape);
      sg.stroke();
    }

    // Accents on ring/thumb
    if (n.id === 'ring' || n.id === 'thumb') {
      if (cfg.accent === 'gold_foil') {
        sg.fillStyle = 'rgba(226, 184, 130, 0.92)';
        for (const [fx, fy, fw, fh, rot] of [[-5, -2, 8, 5, 0.3], [3, -10, 9, 4, -0.4], [-2, -18, 6, 4, 0.6]]) {
          sg.save();
          sg.translate(fx, fy);
          sg.rotate(rot);
          sg.fillRect(-fw / 2, -fh / 2, fw, fh);
          sg.restore();
        }
      } else if (cfg.accent === 'pearl_dot') {
        const pg = sg.createRadialGradient(-1, 6, 1, 0, 7, 4.5);
        pg.addColorStop(0, '#FFFFFF');
        pg.addColorStop(0.7, '#EFE4DB');
        pg.addColorStop(1, '#B39784');
        sg.fillStyle = pg;
        sg.beginPath();
        sg.arc(0, 7, 4.2, 0, Math.PI * 2);
        sg.fill();
      } else if (cfg.accent === 'floral_dot') {
        sg.fillStyle = 'rgba(255,250,245,0.92)';
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          sg.beginPath();
          sg.arc(Math.cos(ang) * 5.2, -3 + Math.sin(ang) * 5.2, 2.8, 0, Math.PI * 2);
          sg.fill();
        }
        sg.fillStyle = '#D4AF7C';
        sg.beginPath();
        sg.arc(0, -3, 2.1, 0, Math.PI * 2);
        sg.fill();
      }
    }

    // Curved C-arch lighting + Gloss/Pearl/Matte finish
    if (cfg.finish === 'matte') {
      const mt = sg.createLinearGradient(-n.w * 0.55, 0, n.w * 0.55, 0);
      mt.addColorStop(0, 'rgba(28,16,14,0.22)');
      mt.addColorStop(0.45, 'rgba(255,255,255,0.06)');
      mt.addColorStop(1, 'rgba(28,16,14,0.22)');
      sg.fillStyle = mt;
      sg.fillRect(-n.w, -topReach - 10, n.w * 2, topReach + n.h);
    } else {
      const shX = -n.w * 0.14 + lightBias * n.w * 0.20;
      const spec = sg.createLinearGradient(shX - 10, 0, shX + 10, 0);
      spec.addColorStop(0, 'rgba(255,255,255,0)');
      spec.addColorStop(0.5, cfg.finish === 'pearl' ? 'rgba(255,244,240,0.34)' : 'rgba(255,255,255,0.28)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      sg.fillStyle = spec;
      sg.fillRect(-n.w, -topReach - 10, n.w * 2, topReach + n.h);
    }

    // Cuticle pocket depth shadow
    const cutG = sg.createLinearGradient(0, n.h * 0.52, 0, n.h * 0.15);
    cutG.addColorStop(0, cutCol);
    cutG.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = cutG;
    sg.fillRect(-n.w, n.h * 0.12, n.w * 2, n.h * 0.45);
    sg.restore();

    ctx.save();
    ctx.translate(n.cx, n.cy);
    ctx.rotate(n.a);
    if (n.blur > 0) ctx.filter = `blur(${n.blur}px)`;
    ctx.drawImage(spr, -90, -118);
    ctx.filter = 'none';
    ctx.restore();
  }
}
