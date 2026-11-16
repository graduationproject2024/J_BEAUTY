// Parametric 3D solid sculpted nail plate geometry & UV generator (5 shapes x 3 lengths)
// Builds closed curved dorsal surface + side/tip thickness bevel + natural keratin underside.

export const LENGTH_SCALES = {
  short: { totalMult: 1.18, overhangFraction: 0.15, tipCurl: 0.03 },
  medium: { totalMult: 1.46, overhangFraction: 0.32, tipCurl: 0.085 },
  long: { totalMult: 1.82, overhangFraction: 0.45, tipCurl: 0.165 },
};

// Polar-smooth parametric nail plate coordinates (wHalfScale, zNormalized)
// Eliminates polygonal corners & spear tips on curved oval/almond shapes while preserving crisp flat edges on square/coffin!
export function evaluateNailPoint(shape, length, u) {
  const lenCfg = LENGTH_SCALES[length] || LENGTH_SCALES.medium;
  const bedEnd = 1 / lenCfg.totalMult;

  // Natural organic proximal nail root: gentle C1 continuous taper underneath cuticle eponychium
  // Real nails taper only slightly (~10-12%) at the proximal fold with zero angular chevron corners!
  const rootTaperDist = 0.16;
  const rootTaper = u < rootTaperDist ? 1.0 - 0.10 * Math.pow((rootTaperDist - u) / rootTaperDist, 2.0) : 1.0;

  if (u <= bedEnd) {
    return {
      w: rootTaper,
      zNorm: u,
      t: 0,
      inFreeEdge: false,
      bedEnd,
    };
  }

  const f = Math.max(0, Math.min(1, (u - bedEnd) / Math.max(0.05, 1 - bedEnd)));
  const freeSpan = 1 - bedEnd;

  switch (shape) {
    case 'oval': {
      // Smooth full rounded elliptical dome — clearly rounder than Squoval and softer than Almond
      const phi = f * 1.46;
      return {
        w: Math.max(0.08, Math.pow(Math.max(0.01, Math.cos(phi)), 0.82)),
        zNorm: bedEnd + freeSpan * Math.sin(phi),
        t: f,
        inFreeEdge: true,
        bedEnd,
      };
    }
    case 'almond': {
      // Soft salon couture almond tapering gracefully into rounded petal apex (C1-smooth rounded arc, no flat notch or needle)
      const phi = f * (Math.PI * 0.46);
      const cosP = Math.cos(phi);
      const wAlmond = Math.max(0.12, Math.pow(Math.max(0.01, cosP), length === 'short' ? 1.08 : 1.18));
      return {
        w: wAlmond,
        zNorm: bedEnd + freeSpan * Math.sin(phi),
        t: f,
        inFreeEdge: true,
        bedEnd,
      };
    }
    case 'squoval': {
      // Parallel sidewalls curving gently around soft square crown
      let w = 1.0;
      if (f > 0.62) {
        const phi = ((f - 0.62) / 0.38) * (Math.PI * 0.44);
        w = 0.62 + 0.38 * Math.cos(phi);
      }
      return { w, zNorm: u, t: f, inFreeEdge: true, bedEnd };
    }
    case 'coffin': {
      // Straight diagonal ballerina taper ending in dead-flat straight chopped edge
      const tipW = length === 'short' ? 0.58 : 0.47;
      return {
        w: 1.0 - (1.0 - tipW) * f,
        zNorm: u,
        t: f,
        inFreeEdge: true,
        bedEnd,
      };
    }
    case 'square': {
      // Crisp straight sidewalls right to tiny corner micro-bevel at tip
      const w = f > 0.93 ? 1.0 - 0.05 * Math.pow((f - 0.93) / 0.07, 2) : 1.0;
      return { w, zNorm: u, t: f, inFreeEdge: true, bedEnd };
    }
    default: {
      const phi = f * 1.44;
      return { w: Math.max(0.13, Math.cos(phi)), zNorm: bedEnd + freeSpan * Math.sin(phi), t: f, inFreeEdge: true, bedEnd };
    }
  }
}

export function evaluateTipForwardContour(shape, length, vAbs) {
  const lenCfg = LENGTH_SCALES[length] || LENGTH_SCALES.medium;
  const freeExt = lenCfg.totalMult - 1.0;
  // Continuous C1-smooth organic rounding on perimeter; eliminates blunt notches & preserves crisp shape definitions
  if (shape === 'squoval') return -0.04 * freeExt * Math.pow(vAbs, 3.0);
  if (shape === 'oval') return -0.025 * freeExt * (vAbs * vAbs);
  if (shape === 'almond') {
    // Elegant organic petal dome: continuous smooth rounding across tip apex without flat truncation or indented notch
    return -0.032 * freeExt * Math.pow(vAbs, 1.80);
  }
  return 0;
}

export function buildSculptedNailGeometry(anchor, shape = 'almond', length = 'medium') {
  const lenCfg = LENGTH_SCALES[length] || LENGTH_SCALES.medium;
  const totalLen = anchor.bedLength * lenCfg.totalMult;
  const halfWidth = anchor.bedWidth * 0.5;
  const bedEnd = 1 / lenCfg.totalMult;

  const uSteps = 32;
  const vSteps = 22;

  // Compute grid of dorsal top points & underside points
  const topGrid = [];
  const botGrid = [];

  const toWorld = (localRight, localUp, localFwd) => {
    const f = anchor.frame;
    return [
      anchor.origin.x + f.right.x * localRight + f.up.x * localUp + f.forward.x * localFwd,
      anchor.origin.y + f.right.y * localRight + f.up.y * localUp + f.forward.y * localFwd,
      anchor.origin.z + f.right.z * localRight + f.up.z * localUp + f.forward.z * localFwd,
    ];
  };

  for (let iu = 0; iu <= uSteps; iu++) {
    const u = iu / uSteps;
    const outline = evaluateNailPoint(shape, length, u);
    const wHalf = halfWidth * outline.w;
    const zCoord = outline.zNorm;
    const rowTop = [];
    const rowBot = [];

    for (let iv = 0; iv <= vSteps; iv++) {
      const vNorm = (iv / vSteps) * 2 - 1; // -1..+1
      const vAbs = Math.abs(vNorm);

      // Transverse convex C-arch across nail plate
      const archFactor = shape === 'square' || shape === 'coffin' ? 0.82 : 1.0;
      const cArch = -anchor.archDrop * archFactor * (vNorm * vNorm) * (0.88 + 0.12 * zCoord);

      // Longitudinal natural apex dome from cuticle to free edge
      const apexDome =
        Math.sin(Math.min(1, zCoord * 1.08) * Math.PI) * 0.046 -
        Math.pow(Math.max(0, zCoord - bedEnd) / Math.max(0.1, 1 - bedEnd), 1.45) * lenCfg.tipCurl;

      // Subtle, smooth proximal tuck under eponychium fold (0.35mm depth)
      // Eliminates sharp side-profile V-notch slicing while slipping cleanly into cuticle fold!
      const proximalTuck = zCoord < 0.12 ? -0.035 * Math.pow((0.12 - zCoord) / 0.12, 2.0) : 0;

      // Pure smooth parabolic/elliptical U-cuticle curve (dZ/dv = 0 at midline -> perfectly rounded U-moon, ZERO pointed chevron/pentagon!)
      const uFade = Math.pow(Math.max(0, 1 - zCoord / 0.22), 2.0);
      const proximalCurveZ = 0.042 * (vNorm * vNorm) * anchor.bedLength * uFade;

      const freeMask = Math.max(0, (zCoord - bedEnd * 0.80) / (1 - bedEnd * 0.80));
      const tipCurveZ = anchor.bedLength * evaluateTipForwardContour(shape, length, vAbs) * Math.pow(freeMask, 1.5);

      const localFwd = zCoord * totalLen + proximalCurveZ + tipCurveZ;
      const localRight = vNorm * wHalf;
      const topY = cArch + apexDome + proximalTuck;

      // Smooth, unbroken lateral sidewall thickness from root to tip (zero razor-thin upward chamfer!)
      const thickness = anchor.baseThickness * (0.75 + 0.25 * Math.min(1, zCoord / 0.25)) * (1.0 - 0.12 * vAbs * vAbs);
      const botY = topY - thickness;

      // TRUE UNDISTORTED CARTESIAN UVs: vNorm * outline.w prevents French chevrons & pinched foil/floral art!
      const cartU = 0.5 + 0.5 * vNorm * outline.w;
      rowTop.push({
        pos: toWorld(localRight, topY, localFwd),
        uv: [cartU, zCoord],
      });
      rowBot.push({
        pos: toWorld(localRight, botY, localFwd),
        uv: [cartU, zCoord],
      });
    }
    topGrid.push(rowTop);
    botGrid.push(rowBot);
  }

  const positions = [];
  const uvs = [];
  const indices = [];

  const pushUniqueVertex = (pt) => {
    const idx = positions.length / 3;
    positions.push(...pt.pos);
    uvs.push(...pt.uv);
    return idx;
  };

  // Indexed shared vertices for dorsal polished shell -> silky smooth clearcoat C-arch reflections!
  const topIdx = topGrid.map((row) => row.map(pushUniqueVertex));
  for (let iu = 0; iu < uSteps; iu++) {
    for (let iv = 0; iv < vSteps; iv++) {
      const a = topIdx[iu][iv];
      const b = topIdx[iu][iv + 1];
      const c = topIdx[iu + 1][iv + 1];
      const d = topIdx[iu + 1][iv];
      indices.push(a, d, c, a, c, b);
    }
  }

  // Indexed underside keratin shell
  const botIdx = botGrid.map((row) => row.map(pushUniqueVertex));
  for (let iu = 0; iu < uSteps; iu++) {
    for (let iv = 0; iv < vSteps; iv++) {
      const a = botIdx[iu][iv];
      const b = botIdx[iu][iv + 1];
      const c = botIdx[iu + 1][iv + 1];
      const d = botIdx[iu + 1][iv];
      indices.push(a, b, c, a, c, d);
    }
  }

  // Separate crisp side/tip bevel strip vertices so sharp free-edge rim doesn't crease smooth dorsal normals
  const pushWallQuad = (t0, t1, b1, b0) => {
    const i0 = pushUniqueVertex(t0);
    const i1 = pushUniqueVertex(t1);
    const i2 = pushUniqueVertex(b1);
    const i3 = pushUniqueVertex(b0);
    indices.push(i0, i3, i2, i0, i2, i1);
  };

  for (let iv = 0; iv < vSteps; iv++) {
    pushWallQuad(topGrid[uSteps][iv], topGrid[uSteps][iv + 1], botGrid[uSteps][iv + 1], botGrid[uSteps][iv]);
    pushWallQuad(topGrid[0][iv + 1], topGrid[0][iv], botGrid[0][iv], botGrid[0][iv + 1]);
  }
  for (let iu = 0; iu < uSteps; iu++) {
    pushWallQuad(topGrid[iu][0], topGrid[iu + 1][0], botGrid[iu + 1][0], botGrid[iu][0]);
    pushWallQuad(topGrid[iu + 1][vSteps], topGrid[iu][vSteps], botGrid[iu][vSteps], botGrid[iu + 1][vSteps]);
  }

  // Compute clean pearl / botanical accent seat directly on curved dorsal apex near u=0.24
  const accentU = Math.round(uSteps * 0.24);
  const accentV = Math.round(vSteps * 0.5);
  const pearlSpot = topGrid[accentU][accentV].pos;

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
    pearlSpot,
    bedEnd,
  };
}
