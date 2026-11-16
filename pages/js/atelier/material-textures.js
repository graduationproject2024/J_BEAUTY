// Procedural luxury PBR texture generators & skin/nail optical profiles for J Nail Atelier

import { LENGTH_SCALES, evaluateNailPoint } from './nail-geometry.js';

export const SKIN_PROFILES = {
  fair: {
    baseHex: '#EEC9B8',
    sssHex: '#E88B76',
    shadowHex: '#BE8473',
    sheenHex: '#FFEBE2',
    bedPinkHex: '#E5A3AA',
  },
  warm: {
    baseHex: '#DDA982',
    sssHex: '#D87255',
    shadowHex: '#9F6B4C',
    sheenHex: '#F7DEC7',
    bedPinkHex: '#D78F94',
  },
  olive: {
    baseHex: '#BC8861',
    sssHex: '#C26748',
    shadowHex: '#7D5137',
    sheenHex: '#EAD1B9',
    bedPinkHex: '#C57F82',
  },
  deep: {
    baseHex: '#714732',
    sssHex: '#9C412E',
    shadowHex: '#432519',
    sheenHex: '#B68067',
    bedPinkHex: '#9E5E63',
  },
};

function hexToRgb(hex) {
  const clean = String(hex || '#F3DCE1').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, 'F');
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function rgbStr([r, g, b], a = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

function mixRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// One-time procedural micro-pore + crease height -> tangent-space normal map + roughness variation
let cachedSkinDetail = null;
export function getDermalDetailMaps(size = 512) {
  if (cachedSkinDetail) return cachedSkinDetail;

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d');

  // Seamless organic cellular skin micro-pore grain (pure value noise smoothed cleanly — zero directional sine banding!)
  const raw = new Float32Array(size * size);
  let seed = 13379;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < raw.length; i++) {
    raw[i] = rnd();
  }
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      // Soft isotropic cellular blur -> natural epidermal pore micro-relief
      const avg =
        (raw[y * size + x] * 4 +
          raw[ym * size + x] +
          raw[yp * size + x] +
          raw[y * size + xm] +
          raw[y * size + xp]) /
        8;
      h[y * size + x] = 0.5 + (avg - 0.5) * 0.24;
    }
  }

  const nImg = nCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);
  const strength = 1.35;

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (h[y * size + xp] - h[y * size + xm]) * strength;
      const dy = (h[yp * size + x] - h[ym * size + x]) * strength;
      const dz = 1.0;
      const invL = 1 / Math.hypot(dx, dy, dz);

      const idx = (y * size + x) * 4;
      nImg.data[idx] = Math.round((-dx * invL * 0.5 + 0.5) * 255);
      nImg.data[idx + 1] = Math.round((-dy * invL * 0.5 + 0.5) * 255);
      nImg.data[idx + 2] = Math.round((dz * invL * 0.5 + 0.5) * 255);
      nImg.data[idx + 3] = 255;

      // Subtle hydrating micro-roughness (creases slightly matter than shiny ridges)
      const val = Math.max(110, Math.min(205, Math.round(148 - (h[y * size + x] - 0.5) * 70)));
      rImg.data[idx] = val;
      rImg.data[idx + 1] = val;
      rImg.data[idx + 2] = val;
      rImg.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  cachedSkinDetail = { normalCanvas, roughCanvas };
  return cachedSkinDetail;
}

// Velvet matte subtle micro-roughness + bump texture (512x512)
let cachedMatteRoughCanvas = null;
export function getMatteRoughnessCanvas(size = 256) {
  if (cachedMatteRoughCanvas) return cachedMatteRoughCanvas;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  let seed = 88421;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const grain = 180 + Math.round(((seed - 1) / 2147483646) * 34);
    img.data[i] = grain;
    img.data[i + 1] = grain;
    img.data[i + 2] = grain;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  cachedMatteRoughCanvas = c;
  return c;
}

// Compute crisp UV-space French / Ombre / Sheer Nail Plate Color, Metalness (foil), and Bump/Relief maps
// UV space: X in [0..1] maps lateral width v in [-1..+1], Y in [0..1] (canvas Y top=1 tip -> bottom=0 cuticle!)
// Note CanvasTexture flipY = true by default in Three.js, so v_uv=1.0 is Canvas y=0 (Distal Tip), v_uv=0.0 is Canvas y=height (Cuticle Root)!
export function renderNailMaps(cfg, target = {}) {
  const W = 256;
  const H = 512;

  const albedoCanvas = target.albedoCanvas || document.createElement('canvas');
  const metalCanvas = target.metalCanvas || document.createElement('canvas');
  const bumpCanvas = target.bumpCanvas || document.createElement('canvas');
  albedoCanvas.width = metalCanvas.width = bumpCanvas.width = W;
  albedoCanvas.height = metalCanvas.height = bumpCanvas.height = H;

  const aCtx = albedoCanvas.getContext('2d');
  const mCtx = metalCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');

  const skinProf = SKIN_PROFILES[cfg.skin] || SKIN_PROFILES.warm;
  const skinBedRgb = hexToRgb(skinProf.bedPinkHex);
  const cuticleShadowRgb = hexToRgb(skinProf.shadowHex);
  const polishRgb = hexToRgb(cfg.polish_color || '#F3DCE1');
  const tipRgb = hexToRgb(cfg.tip_color || '#F5EFE8');
  const goldRgb = [245, 212, 134]; // Luminous warm 24k champagne gold leaf
  const lenCfg = LENGTH_SCALES[cfg.length] || LENGTH_SCALES.medium;
  const bedEnd = 1 / lenCfg.totalMult;

  const shape = cfg.shape || 'almond';
  const length = cfg.length || 'medium';
  const french = cfg.french_style || 'none';
  const finish = cfg.finish || 'gloss';

  // Pure even gel polish coverage: keep sheer bed warmth subtle at proximal root only (`no chalk white tip halo` on Full Polish or Micro French!)
  const luma = (0.299 * polishRgb[0] + 0.587 * polishRgb[1] + 0.114 * polishRgb[2]) / 255;
  const isSheer = luma > 0.78 && cfg.polish_color !== '#DFC5A2';
  const sheerWeight = french === 'micro' || french === 'none' ? (isSheer ? 0.18 : 0.0) : (isSheer ? 0.26 : 0.02);

  // 1. Base gradient + translucent biological nail bed / lunula + undistorted Cartesian French curves
  const baseImg = aCtx.createImageData(W, H);

  // Precompute W(u) outline curve row-by-row for razor-accurate Micro French perimeter contour!
  const outlineW = new Float32Array(H);
  for (let py = 0; py < H; py++) {
    const u = 1 - py / (H - 1);
    outlineW[py] = evaluateNailPoint(shape, length, u).w;
  }

  for (let py = 0; py < H; py++) {
    const u = 1 - py / (H - 1); // u=0 cuticle -> u=1 tip
    const wHere = outlineW[py];
    for (let px = 0; px < W; px++) {
      const vCart = (px / (W - 1)) * 2 - 1; // -1..+1 true undistorted nail width!
      const vNormLocal = vCart / Math.max(0.08, wHere);
      const v2 = vCart * vCart;

      // Subtle milky half-moon lunula diffused gently at proximal base
      const lunulaEdge = 0.22 * Math.max(0, 1 - v2 * 1.15);
      const inLunula = u < lunulaEdge + 0.05 ? smoothstep(lunulaEdge + 0.05, lunulaEdge - 0.05, u) : 0;

      // Translucent underlying nail bed without white keratin halo bleeding through polish
      const warmTipTint = mixRgb(skinBedRgb, [242, 224, 218], 0.22);
      const freeFactor = smoothstep(bedEnd - 0.05, bedEnd + 0.10, u);
      const natBed = mixRgb(skinBedRgb, warmTipTint, freeFactor * (french === 'classic' ? 0.40 : 0.18));
      const natWithLunula = mixRgb(natBed, [252, 244, 240], inLunula * 0.18);

      // Rich sheer blush gel lacquer or opaque polish (even coverage right to tip)
      let col = mixRgb(polishRgb, natWithLunula, sheerWeight);

      // Crisp undistorted Cartesian French Tip Styles (applied before perimeter cuticle pocket shadow)
      if (french !== 'none') {
        const smileDepth = shape === 'square' || shape === 'coffin' ? 0.052 : 0.128;
        if (french === 'classic' || french === 'colored') {
          // Razor-crisp painted salon U-smile curve (`±0.0028` crisp brush edge)
          const uSmileLine = Math.max(bedEnd - 0.01, 0.64) + smileDepth * (1.0 - v2);
          const tipMask = smoothstep(uSmileLine - 0.0028, uSmileLine + 0.0028, u);
          col = mixRgb(col, tipRgb, tipMask);
        } else if (french === 'micro') {
          // True salon hairline precision Micro-French edge (1.5mm - 1.8mm calibrated rim across all 5 digits)
          // Renders crisply with uniform brightness & zero fade on thumb, pinky, ring, middle, and index
          const bandThick = cfg.length === 'long' ? 0.075 : cfg.length === 'medium' ? 0.082 : 0.092;
          const microSmile = (shape === 'square' || shape === 'coffin' ? 0.018 : 0.042) * (1.0 - Math.min(1, v2));
          const tipDist = (1.0 - u) - microSmile;
          const inTipZone = u > 0.72 ? smoothstep(bandThick + 0.004, bandThick - 0.004, tipDist) : 0;
          const distSide = Math.max(0, wHere - Math.abs(vCart));
          const sideEdge = (shape === 'oval' || shape === 'almond') && u > bedEnd + 0.10
            ? smoothstep(0.045, 0.010, distSide) * smoothstep(bedEnd + 0.10, bedEnd + 0.30, u) * 0.85
            : 0;
          const tipMask = Math.max(inTipZone, sideEdge);
          col = mixRgb(col, tipRgb, Math.min(1, tipMask));
        } else if (french === 'ombre') {
          const blendCenter = Math.max(0.50, bedEnd * 0.94) + 0.06 * (1 - v2);
          const ombreMix = smoothstep(blendCenter - 0.20, blendCenter + 0.22, u);
          col = mixRgb(col, tipRgb, ombreMix);
        }
      }

      // Luminous Pearl fine glazed sheen highlight modulation across nail apex
      if (finish === 'pearl') {
        const apexSheen = Math.exp(-Math.pow(vCart / 0.52, 2) - Math.pow((u - 0.50) / 0.36, 2));
        col = mixRgb(col, [255, 244, 240], apexSheen * 0.36);
      }

      // Soft anatomical cuticle & lateral sidewall shadow occlusion tint
      // Occlusion applies strictly to proximal nail bed fold (u < bedEnd), never dirtying the distal free-edge tips!
      const foldMask = Math.max(0, 1.0 - (u / Math.max(0.1, bedEnd)));
      const edgeProx = Math.pow(Math.min(1, Math.abs(vNormLocal)), 4.0) * foldMask;
      const cutProx = smoothstep(0.24, 0.06, u);
      const creviceOcclusion = Math.min(0.38, edgeProx * 0.22 + cutProx * 0.26);
      col = mixRgb(col, cuticleShadowRgb, creviceOcclusion);

      const idx = (py * W + px) * 4;
      baseImg.data[idx] = Math.round(col[0]);
      baseImg.data[idx + 1] = Math.round(col[1]);
      baseImg.data[idx + 2] = Math.round(col[2]);
      baseImg.data[idx + 3] = 255;
    }
  }
  aCtx.putImageData(baseImg, 0, 0);

  // Neutral metallic (0) & flat height bump (128,128,255 tangent normal)
  mCtx.fillStyle = '#000000';
  mCtx.fillRect(0, 0, W, H);
  bCtx.fillStyle = 'rgb(128, 128, 255)';
  bCtx.fillRect(0, 0, W, H);

  // 2. Botanical & Luxury Nail Art Details
  const accent = cfg.accent || 'none';
  if (accent === 'gold_foil') {
    // Organic torn rose-gold foil leaf flakes swept delicately across oblique cuticle-to-tip arc
    const flakes = [
      [0.34, 0.30, 18, 10, 0.4],
      [0.44, 0.38, 22, 12, -0.3],
      [0.54, 0.48, 16, 9, 0.7],
      [0.62, 0.56, 20, 11, -0.5],
      [0.48, 0.64, 14, 8, 0.2],
      [0.68, 0.70, 17, 10, -0.2],
      [0.38, 0.52, 10, 7, 0.9],
      [0.58, 0.36, 9, 6, -0.8],
    ];
    for (const [fx, fy, rx, ry, rot] of flakes) {
      const cx = fx * W;
      const cy = (1 - fy) * H;
      for (const ctx of [aCtx, mCtx]) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.fillStyle = ctx === aCtx ? rgbStr(goldRgb, 0.98) : '#9E9E9E';
        ctx.beginPath();
        ctx.moveTo(-rx, -ry * 0.2);
        ctx.lineTo(-rx * 0.3, -ry);
        ctx.lineTo(rx * 0.7, -ry * 0.5);
        ctx.lineTo(rx, ry * 0.4);
        ctx.lineTo(rx * 0.2, ry);
        ctx.lineTo(-rx * 0.8, ry * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      bCtx.save();
      bCtx.translate(cx, cy);
      bCtx.rotate(rot);
      bCtx.fillStyle = 'rgb(148, 142, 248)';
      bCtx.fillRect(-rx * 0.7, -ry * 0.7, rx * 1.4, ry * 1.4);
      bCtx.restore();
    }
  } else if (accent === 'floral_dot') {
    // Delicate translucent white botanical jasmine/damascena blossom + gold stamen near mid-matrix
    const bx = W * 0.52;
    const by = H * 0.58;
    const petalCount = 5;
    for (let p = 0; p < petalCount; p++) {
      const ang = (p / petalCount) * Math.PI * 2 - Math.PI * 0.5;
      const px = bx + Math.cos(ang) * 26;
      const py = by + Math.sin(ang) * 32;
      aCtx.save();
      aCtx.translate(px, py);
      aCtx.rotate(ang);
      const grad = aCtx.createRadialGradient(0, 0, 2, 0, 0, 24);
      grad.addColorStop(0, 'rgba(255, 250, 246, 0.96)');
      grad.addColorStop(0.75, 'rgba(247, 232, 236, 0.90)');
      grad.addColorStop(1, 'rgba(247, 232, 236, 0.15)');
      aCtx.fillStyle = grad;
      aCtx.beginPath();
      aCtx.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2);
      aCtx.fill();
      aCtx.restore();

      bCtx.save();
      bCtx.translate(px, py);
      bCtx.rotate(ang);
      bCtx.fillStyle = 'rgb(145, 145, 246)';
      bCtx.beginPath();
      bCtx.ellipse(0, 0, 19, 10, 0, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.restore();
    }
    // Fine rose-gold center pollen stamen
    aCtx.fillStyle = rgbStr(goldRgb, 0.98);
    aCtx.beginPath();
    aCtx.arc(bx, by, 7, 0, Math.PI * 2);
    aCtx.fill();

    mCtx.fillStyle = '#F0F0F0';
    mCtx.beginPath();
    mCtx.arc(bx, by, 7, 0, Math.PI * 2);
    mCtx.fill();
  }

  return { albedoCanvas, metalCanvas, bumpCanvas };
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1e-6)));
  return t * t * (3 - 2 * t);
}
