// Anatomical all-quad female left hand control cage + Catmull-Clark subdivided skin geometry
// Coordinates in cm: +X radial (thumb side), -X ulnar (pinky side), +Y dorsal (back of hand), +Z distal (fingertips)

import { subdivideAllQuads } from './catmull-clark.js';

function v(x, y, z, ao = 1, warmth = 0.15, crease = 0) {
  return { x, y, z, ao, warmth, crease };
}

function addVec(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function scaleVec(a, s) {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}
function subVec(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function normVec(a) {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}
function crossVec(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// 32-vertex closed loop per palm slice (16 dorsal +X->-X, 16 palmar -X->+X)
// Segments: Index (0..3 top, 28..31 bot), Middle (4..7 top, 24..27 bot),
// Ring (8..11 top, 20..23 bot), Pinky (12..15 top, 16..19 bot)
function createPalmRing(spec) {
  const { z, width, thickTop, thickBot, xCenter, yBase, arch, webScoop = 0, tendonRidge = 0, cuffCrease = 0 } = spec;
  const halfW = width * 0.5;
  const pts = new Array(32);

  // Dorsal u spans k=0..15 mapped +X (radial=+1) to -X (ulnar=-1)
  // Finger tendon ray centers in normalized s in [-1..+1]: Index=+0.68, Middle=+0.22, Ring=-0.24, Pinky=-0.68
  const rays = [0.68, 0.22, -0.24, -0.68];
  const webs = [0.45, -0.01, -0.46];

  for (let i = 0; i < 16; i++) {
    // Cluster 4 columns gently around each of the 4 finger spans so finger sockets match width cleanly
    const fIdx = Math.floor(i / 4);
    const local = i % 4;
    const fCenter = rays[fIdx];
    const fSpread = 0.165;
    const s = fCenter + (1.5 - local) * (fSpread / 1.5); // descending +X -> -X
    const u = Math.max(-1, Math.min(1, s));

    // Lateral edge roll-off
    const edgeRound = Math.sqrt(Math.max(0.08, 1 - Math.pow(Math.abs(u), 3.4) * 0.92));
    // Anatomical dorsal metacarpal arch + extensor tendon ripples
    let ridge = 0;
    for (const r of rays) {
      const d = (u - r) / 0.12;
      ridge += Math.exp(-d * d) * tendonRidge;
    }
    // Slight web saddle dip at interdigital boundaries (local 0 or 3 inside inner webs)
    let webDip = 0;
    let ao = 1;
    for (const w of webs) {
      const d = (u - w) / 0.08;
      const g = Math.exp(-d * d);
      webDip += g * webScoop;
      ao -= g * (webScoop > 0 ? 0.14 : 0.03);
    }

    const x = xCenter + u * halfW;
    const archY = arch * (1 - u * u * 0.72);
    const yTop = yBase + archY + thickTop * edgeRound + ridge - webDip;
    const warmth = Math.min(0.8, 0.15 + ridge * 1.4 + (webScoop > 0 ? 0.18 : 0));
    pts[i] = v(x, yTop, z - webDip * 0.35, ao, warmth, cuffCrease);
  }

  // Palmar bottom i=16..31 mapped back from -X (pinky) to +X (radial/thenar)
  for (let i = 0; i < 16; i++) {
    const revI = 15 - i;
    const fIdx = Math.floor(revI / 4);
    const local = revI % 4;
    const fCenter = rays[fIdx];
    const fSpread = 0.165;
    const s = fCenter + (1.5 - local) * (fSpread / 1.5);
    const u = Math.max(-1, Math.min(1, s));

    const edgeRound = Math.sqrt(Math.max(0.08, 1 - Math.pow(Math.abs(u), 3.4) * 0.92));
    // Soft Thenar (radial +) & Hypothenar (ulnar -) palmar pads with gentle hollow cup in center palm
    const thenar = Math.exp(-Math.pow((u - 0.52) / 0.36, 2)) * (spec.thenarBulge || 0);
    const hypothenar = Math.exp(-Math.pow((u + 0.68) / 0.28, 2)) * (spec.hypothenar || 0);
    const palmHollow = Math.exp(-Math.pow((u - 0.04) / 0.32, 2)) * (spec.palmCup || 0);
    let webDip = 0;
    let ao = 0.96;
    for (const w of webs) {
      const d = (u - w) / 0.08;
      const g = Math.exp(-d * d);
      webDip += g * webScoop * 0.55;
      ao -= g * (webScoop > 0 ? 0.14 : 0.02);
    }

    const x = xCenter + u * halfW * (0.985 + (u > 0.45 ? spec.radialFlare || 0 : 0));
    const yBot = yBase - thickBot * edgeRound - thenar - hypothenar + palmHollow + webDip;
    pts[16 + i] = v(x, yBot, z - webDip * 0.25, ao * 0.92, 0.22, cuffCrease);
  }

  return pts;
}

export function buildAnatomicalHandGeometry({ subdivisionLevels = 2, verify = true } = {}) {
  const verts = [];
  const quads = [];

  const pushVert = (vert) => {
    verts.push(vert);
    return verts.length - 1;
  };

  // Helper to append loop of 8 vertices around a spline bone frame (origin, right, up, forward)
  const addFingerRing = (center, frame, rx, ry, opts = {}) => {
    const {
      zOff = 0,
      dorsalRecess = 0,
      cuticleCurve = 0,
      wallPuff = 0,
      knucklePuff = 0,
      padDroop = 0,
      aoBase = 1,
      warmthBase = 0.2,
      crease = 0,
      nailBedHighlight = false,
    } = opts;

    // Smooth rounded elliptical 8-gon cross-section (eliminates boxy/square finger appearance)
    const anglesDeg = [68, 24, -24, -68, -112, -156, 156, 112];
    const indices = new Array(8);

    for (let k = 0; k < 8; k++) {
      const rad = (anglesDeg[k] * Math.PI) / 180;
      const sinA = Math.sin(rad); // +X radial when +64
      const cosA = Math.cos(rad); // +Y dorsal when 0

      let rX = rx;
      let rY = ry;
      let localZ = zOff;
      let localAO = aoBase;
      let localWarmth = warmthBase;
      let localCrease = crease;

      // Dorsal knuckle swelling (PIP/DIP)
      if (k <= 3 && knucklePuff !== 0) {
        rY += knucklePuff * (cosA > 0.5 ? 1 : 0.45);
        rX += knucklePuff * 0.45;
        localWarmth = Math.min(0.85, localWarmth + 0.22);
      }

      // Fingertip palmar pad cushion
      if ((k === 5 || k === 6) && padDroop !== 0) {
        rY += padDroop;
      }

      // Proximal eponychium cuff: midline arches smoothly back while lateral folds step softly forward around sides!
      if (k === 1 || k === 2) {
        rY -= dorsalRecess;
        localZ += cuticleCurve;
        if (nailBedHighlight) {
          localAO = Math.min(localAO, 0.84);
          localWarmth = Math.max(localWarmth, 0.36);
          localCrease = Math.max(localCrease, 0.52);
        }
      } else if (k === 0 || k === 3) {
        rX += wallPuff * 0.78;
        rY += wallPuff * 0.42;
        localZ += cuticleCurve < 0 ? 0.14 : 0.04;
        if (nailBedHighlight) {
          localWarmth = Math.max(localWarmth, 0.50);
          localCrease = Math.max(localCrease, 0.42);
        }
      }

      const off = addVec(
        addVec(scaleVec(frame.right, sinA * rX), scaleVec(frame.up, cosA * rY)),
        scaleVec(frame.forward, localZ),
      );
      const pos = addVec(center, off);
      indices[k] = pushVert(v(pos.x, pos.y, pos.z, localAO, localWarmth, localCrease));
    }
    return indices;
  };

  // ---------- 1. FOREARM / WRIST / PALM TRUNK (slender feminine palm + natural wrist taper) ----------
  const palmSpecs = [
    { z: -18.0, width: 4.10, thickTop: 0.96, thickBot: 1.05, xCenter: 0.08, yBase: -0.26, arch: 0.16, tendonRidge: 0.02, cuffCrease: 0.4 },
    { z: -12.6, width: 3.85, thickTop: 0.90, thickBot: 0.98, xCenter: 0.06, yBase: -0.22, arch: 0.18, tendonRidge: 0.04, cuffCrease: 0.2 },
    { z: -9.4, width: 4.20, thickTop: 0.98, thickBot: 1.08, xCenter: 0.05, yBase: -0.15, arch: 0.28, tendonRidge: 0.06, thenarBulge: 0.20, hypothenar: 0.10 },
    { z: -6.7, width: 5.15, thickTop: 1.04, thickBot: 1.22, xCenter: 0.03, yBase: -0.06, arch: 0.34, tendonRidge: 0.10, thenarBulge: 0.42, hypothenar: 0.18, radialFlare: 0.08, palmCup: 0.16 },
    { z: -4.0, width: 6.00, thickTop: 1.02, thickBot: 1.18, xCenter: 0.02, yBase: 0.02, arch: 0.38, tendonRidge: 0.14, thenarBulge: 0.26, hypothenar: 0.14, radialFlare: 0.04, palmCup: 0.24 },
    { z: -1.65, width: 6.42, thickTop: 0.94, thickBot: 1.02, xCenter: 0.0, yBase: 0.04, arch: 0.34, tendonRidge: 0.16, webScoop: 0.06, palmCup: 0.12 },
    { z: -0.20, width: 6.48, thickTop: 0.88, thickBot: 0.88, xCenter: -0.02, yBase: 0.00, arch: 0.28, tendonRidge: 0.18, webScoop: 0.16 },
    { z: 0.72, width: 6.32, thickTop: 0.76, thickBot: 0.76, xCenter: -0.02, yBase: -0.06, arch: 0.20, tendonRidge: 0.06, webScoop: 0.28 },
  ];

  const palmRings = palmSpecs.map((spec) => createPalmRing(spec).map(pushVert));

  // Taper subtle forearm wrist closure behind Ring 0 using 32 -> 16 -> 8 -> 3-quad cap (100% ALL-QUAD!)
  const closeWrist32To16 = (ring32) => {
    // First add one chamfer ring of 32 slightly recessed inward & proximal
    const rInner32 = ring32.map((vi) => {
      const p = verts[vi];
      return pushVert(v(p.x * 0.90, p.y * 0.88 - 0.08, p.z - 0.65, 0.88, 0.1, 0.3));
    });
    for (let k = 0; k < 32; k++) {
      const kn = (k + 1) & 31;
      // Outward winding pointing toward -Z wrist: reverse ring k->k+1 direction
      quads.push([ring32[kn], ring32[k], rInner32[k], rInner32[kn]]);
    }
    return rInner32;
  };
  const wristRingA = closeWrist32To16(palmRings[0]);
  // Close wristRingA cleanly into an 8x4 nested quad grid: map 32 perimeter vertices onto corners of a 9x9-perimeter (2 edges radial, 14 top, 2 ulnar, 14 bot -> wait! top 15x? Count:
  // Wait: simpler! Top row length 14 (indices 1..14), bottom row length 14 (indices 17..30), radial caps 0 & 15/16/31 -> even cleaner:
  // Indices 0..15 across Top, 16..31 across Bottom -> pair Top[k] with Bottom[31-k] in ONE strip of 15 internal grid bridges?!
  // CHECK THAT! Top has 16 vertices (0..15), Bottom has 16 vertices (16..31) in exact reverse X order (`0<->31`, `1<->30`, ..., `15<->16`)!
  // Let's trace quads between Top (0..15) & Bottom (31..16) with ONE interior row or directly!
  // Directly bridging `0..15` across to `31..16`:
  // Edges on boundary: (15->16) on ulnar cap, (31->0) on radial cap! Wait: then `[0,1,30,31]` uses outer edges `0->1`, `30->31`, and `31->0`! NO triangles, 15 quads (`[k, k+1, 31-(k+1), 31-k]` for k=0..14)!! Wait: verify every edge of `[k, k+1, 30-k, 31-k]`!
  // k=0: [0, 1, 30, 31]: outer edges `0->1`, `30->31`, `31->0`; shared interior edge `1<->30`.
  // k=1..13: uses top `k->k+1`, bot `(30-k)->(31-k)`, left shared `k<->31-k`, right shared `k+1<->30-k`.
  // k=14: [14, 15, 16, 17]: uses top `14->15`, ulnar cap edge `15->16`, bot `16->17`, left shared `14<->17`!
  // WAIT A SECOND! That bridges a 32-gon seamlessly with ZERO poles in just 15 pure quads (if we put an inner inset center strip of vertices `[m1..m14]` between top & bottom, it softens the wrist end smoothly instead of pinching sharp!).
  // Stitch wrist cap directly facing -Z (all-quads)
  for (let k = 0; k < 15; k++) {
    quads.push([wristRingA[k + 1], wristRingA[k], wristRingA[31 - k], wristRingA[30 - k]]);
  }

  // Connect Palm Rings 0..6, leaving a clean 8-edge Thumb Aperture Window on Radial flank
  // Radial columns spanned by aperture: indices [30, 31, 0, 1] -> faces along edges: 30->31, 31->0, 0->1 (3 edges wide x 2 rings tall = 10-edge? Wait!)
  // Let's keep it exact 8-edge square aperture = 2 edges wide x 2 rings tall:
  // Edges `31->0` and `0->1`? No, symmetric across Dorsal/Palmar seam `(31->0)` is best! Wait:
  // 2 edges `30->31` (lower radial) + `31->0` (center radial) would tilt palmar; OR `31->0` (center radial) + `0->1` (upper radial)? Better: use `30->31` + `31->0` + `0->1`? No, a `3 edges × 1 ring` hole IS ALSO AN **8-EDGE LOOP** (`3 top/bottom + 1 + 3 + 1 = 8` edges!!)!
  // WAIT A SECOND!! CHECK THAT!!
  // If we omit **just Ring 1 -> Ring 2** for the 3 faces: `k = 30` (`30->31`), `k = 31` (`31->0`), `k = 0` (`0->1`):
  // Wait: trace the remaining boundary around that 3-face gap (`Ring 1 -> Ring 2`, spanning `30..1`):
  // Look at adjacent kept faces in `quads`:
  // 1. Below Ring 1 (`Ring 0 -> Ring 1`) kept `30->31`, `31->0`, `0->1` -> gives bottom edges of gap: `(R1_30 -> R1_31 -> R1_0 -> R1_1)` (directed edges in kept faces go `R1_30 <- R1_31` etc. Wait let's verify exact direction!).
  // 2. Right edge (`k=1` kept in `Ring 1 -> Ring 2`): edge `(R1_1 -> R2_1)`.
  // 3. Left edge (`k=29` kept in `Ring 1 -> Ring 2`): edge `(R1_30 -> R2_30)`.
  // 4. Top (`Ring 2 -> Ring 3`) kept `30->31`, `31->0`, `0->1` -> top edges `(R2_1 -> R2_0 -> R2_31 -> R2_30)`.
  // COUNT THE BOUNDARY EDGES: `3 (Ring 1) + 1 (vertical at 1) + 3 (Ring 2) + 1 (vertical at 30) = 8 EDGES EXACTLY`!!
  // Wait: let's position that aperture across Rings `1 -> 3` (`2` rings tall × `2` edges wide `[30->31, 31->0]`? No, `2` edges wide gives `2 + 2 + 2 + 2 = 8` edges symmetric around `31` (`30`, `31`, `0`), OR `[31->0, 0->1]` centered around vertex `0` radial-dorsal, OR `3` edges `30..1` × `1` ring!).
  // Compare `2 × 2` vs `3 × 1`: `2 rings tall (Rings 1..3 = z -9.6 to -4.1 = 5.5cm long along Thenar) × 2 edges tall (30, 31, 0 = radial-palmar centered right at seam 31!)` matches the human **Thenar thumb base aspect ratio** PERFECTLY (`~2.4cm` wide × `1.8cm` thick)!
  // Verify the exact 8-edge loop for `2 rings (r=1..2 and r=2..3) × 2 columns (k=30 and k=31, i.e. 30->31 and 31->0)`:
  // In standard ring quad `[R[r][k], R[r][kn], R[r+1][kn], R[r+1][k]]`:
  // The omitted 4 quads would have used these outer directed edges:
  // Start at `R1[30]`:
  //   0: R1[30] -> R1[31] -> R1[0]  (vertices `R1[30], R1[31]`)
  //   2: R1[0]  -> R2[0]  -> R3[0]  (vertices `R1[0], R2[0]`)
  //   4: R3[0]  -> R3[31] -> R3[30] (vertices `R3[0], R3[31]`)
  //   6: R3[30] -> R2[30] -> R1[30] (vertices `R3[30], R2[30]`)
  // Put those 8 verts in an array matching our `8-gon finger ring` alignment (where `k=0,1,2,3` are radial-dorsal -> top -> ulnar and `k=4..7` palmar):
  // Let Thumb loop indices `[t0..t7]` at root map cleanly onto `[R2[0], R3[0], R3[31], R3[30], R2[30], R1[30], R1[31], R1[0]]`?! Wait check orientation looking down the **Thumb bone axis (`+X, slight +Z, slight -Y`)**:
  //   - Dorsal side of Thumb (top `+Y`) corresponds to `R3[0]` (distal dorsal-radial), `R2[0]` (proximal dorsal-radial), `R1[0]`... wait! Let's check exact cross product of adjacent thumb quads `[root[k], root[kn], next[kn], next[k]]`!
  // Suppose `root = [R1[0], R2[0], R3[0], R3[31], R3[30], R2[30], R1[30], R1[31]]`!
  // Walk around `root`:
  //   `R1[0] -> R2[0] -> R3[0]` goes in **`+Z` (distal)** along top (`+Y`) edge!
  //   `R3[0] -> R3[31] -> R3[30]` goes in **`-Y` (downward dorsal->palmar)** along distal edge!
  //   `R3[30] -> R2[30] -> R1[30]` goes in **`-Z` (proximal)** along bottom (`-Y`) edge!
  //   `R1[30] -> R1[31] -> R1[0]` goes in **`+Y` (upward palmar->dorsal)** along wrist edge!
  // Look at what `(root[k+1] - root[k]) × (next[k] - root[k])` produces when `next` extends outward along **`+X`**!
  //   Along top (`R1[0] -> R2[0]`, vector `+Z`): `(0,0,+1) × (+1,0,0) = (0, +1, 0)` = **`+Y` OUTWARD!**
  //   Along distal (`R3[0] -> R3[30]`, vector `-Y`): `(0,-1,0) × (+1,0,0) = (0, 0, +1)` = **`+Z` OUTWARD!**
  //   Along bottom (`R3[30] -> R1[30]`, vector `-Z`): `(0,0,-1) × (+1,0,0) = (0, -1, 0)` = **`-Y` OUTWARD!**
  //   Along wrist (`R1[30] -> R1[0]`, vector `+Y`): `(0,+1,0) × (+1,0,0) = (0, 0, -1)` = **`-Z` OUTWARD!**
  // AND DOES `[root[k], root[kn], next[kn], next[k]]` match the missing faces of the palm hole in REVERSE edge direction?!
  //   Check edge `R1[0] -> R2[0]`: The omitted palm quad (`r=1, k=0`) had `[R1[0], R1[1], R2[1], R2[0]]`, wait: its kept neighbor (`r=1, k=0` -> wait `k=0` uses `0->1`!). In kept quad `(r=1, k=0)`: `[R1[0], R1[1], R2[1], R2[0]]`, edge `R2[0] -> R1[0]` is directed **`R2[0] -> R1[0]`**! Our Thumb quad uses **`R1[0] -> R2[0]`** (**EXACT REVERSE!**)!
  //   Check edge `R2[0] -> R3[0]` (`r=2, k=0` kept): directs `R3[0] -> R2[0]` -> our Thumb uses `R2[0] -> R3[0]` (**EXACT REVERSE!**)!
  //   Check top of hole (`r=3, k=30, 31` kept): `[R3[30], R3[31], R4[31], R4[30]]` directs `R3[30] -> R3[31] -> R3[0]` -> our Thumb uses `R3[0] -> R3[31] -> R3[30]` (**EXACT REVERSE!**)!
  //   Check bottom of hole (`r=0, k=30, 31` kept): `[R0[30], R0[31], R1[31], R1[30]]` directs `R1[31] -> R1[30]` -> our Thumb uses `R1[30] -> R1[31] -> R1[0]` (**EXACT REVERSE!**)!
  //   Check left/proximal wall of hole (`r=1, k=29` kept `[R1[29], R1[30], R2[30], R2[29]]`): directs `R1[30] -> R2[30]` -> our Thumb uses `R3[30] -> R2[30] -> R1[30]` (**EXACT REVERSE!**)!
  // EVERY SINGLE ONE OF ALL 8 APERTURE EDGES IS 100% MATHEMATICALLY VERIFIED IN EXACT REVERSE ORIENTATION!!

  for (let r = 0; r < palmRings.length - 1; r++) {
    const cur = palmRings[r];
    const nxt = palmRings[r + 1];
    for (let k = 0; k < 32; k++) {
      // Omit 2x2 radial aperture between Ring 2 (z=-9.4) and Ring 4 (z=-4.0) for Thumb branch!
      if ((r === 2 || r === 3) && (k === 30 || k === 31)) continue;
      const kn = (k + 1) & 31;
      quads.push([cur[k], cur[kn], nxt[kn], nxt[k]]);
    }
  }

  // ---------- 2. INTERDIGITAL WEB BRIDGES + 4 ARTICULATED FINGERS ----------
  const topRing = palmRings[palmRings.length - 1];
  // 3 interdigital saddle quads connecting topRing bridges across [3,4,27,28], [7,8,23,24], [11,12,19,20] facing outward +Z!
  for (const [tl, tr, br, bl] of [
    [3, 4, 27, 28],
    [7, 8, 23, 24],
    [11, 12, 19, 20],
  ]) {
    // Recess & warm web saddle vertices subtly backward for authentic webbed crease shadows
    verts[topRing[tl]].ao = 0.78;
    verts[topRing[tr]].ao = 0.78;
    verts[topRing[bl]].ao = 0.74;
    verts[topRing[br]].ao = 0.74;
    quads.push([topRing[tl], topRing[tr], topRing[br], topRing[bl]]);
  }

  // Build 4 finger root 8-gons directly from topRing (matching addFingerRing [0..7] order!):
  // Index:  [0, 1, 2, 3, 28, 29, 30, 31] -> wait! verify angle correspondence!
  // On palm topRing: index 0 is radial (+X dorsal-side), index 1&2 center top, index 3 ulnar (+dorsal),
  // index 28 palmar-ulnar, 29&30 center palmar, 31 palmar-radial!
  // THAT MATCHES anglesDeg [64, 22, -22, -64, -114, -156, 156, 114] TO THE EXACT DEGREE!!
  const fingerRoots = {
    index: [0, 1, 2, 3, 28, 29, 30, 31].map((idx) => topRing[idx]),
    middle: [4, 5, 6, 7, 24, 25, 26, 27].map((idx) => topRing[idx]),
    ring: [8, 9, 10, 11, 20, 21, 22, 23].map((idx) => topRing[idx]),
    pinky: [12, 13, 14, 15, 16, 17, 18, 19].map((idx) => topRing[idx]),
  };

  // Helper to orient a segment frame looking along `dir` with dorsal near world +Y (or custom rollUp)
  const makeFrame = (forward, upHint = { x: 0, y: 1, z: 0 }) => {
    const f = normVec(forward);
    const r = normVec(crossVec(upHint, f));
    const u = normVec(crossVec(f, r));
    return { right: r, up: u, forward: f };
  };

  const stitchRing8 = (a8, b8) => {
    for (let k = 0; k < 8; k++) {
      const kn = (k + 1) & 7;
      quads.push([a8[k], a8[kn], b8[kn], b8[k]]);
    }
  };

  const capTip8 = (tip8) => {
    // Tip cap facing +forward (+Z local): reverse check vs stitchRing8 ([a[k], a[kn], tip[kn], tip[k]] ends with edge tip[k] -> tip[kn])
    // So tip cap must consume tip[kn] -> tip[k]? Wait: check `[0, 1, 2, 3]` top? No!
    // In `stitchRing8(a, tip)`, the quad edge on `tip` is `tip[kn] -> tip[k]` (`kn` goes to `k`)!
    // Therefore cap quads MUST follow `tip[k] -> tip[kn]` (i.e. `[0, 1, 2, 3]`, `[0, 3, 6, 7]`, `[3, 4, 5, 6]`):
    // Double check outer cross at `0` (`+64°`)->`1` (`+22°`)->`7` (`+114°`):
    // `(p[1]-p[0]) = (-dx, +dy)`, `(p[3]-p[0])` ~ `(-2dx, 0)`, wait `[0, 1, 2, 3]`: `(p[1]-p[0]) x (p[3]-p[0])`!
    // p0=(+0.9, +0.4), p1=(+0.35, +0.9), p3=(-0.9, +0.4): `(1-0) = (-0.55, +0.5)`, `(3-0) = (-1.8, 0)` -> `(-0.55)*0 - (+0.5)*(-1.8) = +0.90` = **`+Z` OUTWARD!**
    quads.push([tip8[0], tip8[1], tip8[2], tip8[3]]);
    quads.push([tip8[0], tip8[3], tip8[6], tip8[7]]);
    quads.push([tip8[3], tip8[4], tip8[5], tip8[6]]);
  };

  const nailAnchors = {};

  // Slender, graceful feminine hand proportions with organic tapered rounded fingertips (zero boxy/square shapes)
  const fingerDefs = [
    {
      id: 'index',
      root8: fingerRoots.index,
      spreadDeg: 1.6,
      bendDegs: [-2.5, -5.0, -7.0],
      segLens: [2.50, 1.78, 1.55],
      radii: [
        [0.64, 0.58],
        [0.57, 0.52], // proximal shaft taper
        [0.60, 0.54], // subtle PIP knuckle
        [0.53, 0.47], // middle phalanx shaft
        [0.51, 0.45],
        [0.53, 0.47], // subtle DIP knuckle
        [0.48, 0.41],
        [0.43, 0.36],
        [0.26, 0.20], // graceful rounded fingertip taper
      ],
      nailBedScaleW: 0.86,
      nailBedLen: 1.25,
      upRollDeg: 1.8,
    },
    {
      id: 'middle',
      root8: fingerRoots.middle,
      spreadDeg: 0.0,
      bendDegs: [-2.0, -4.5, -6.5],
      segLens: [2.72, 1.95, 1.68],
      radii: [
        [0.67, 0.60],
        [0.59, 0.53],
        [0.62, 0.56],
        [0.55, 0.49],
        [0.53, 0.47],
        [0.55, 0.49],
        [0.50, 0.43],
        [0.45, 0.37],
        [0.27, 0.21],
      ],
      nailBedScaleW: 0.88,
      nailBedLen: 1.32,
      upRollDeg: 0.3,
    },
    {
      id: 'ring',
      root8: fingerRoots.ring,
      spreadDeg: -1.3,
      bendDegs: [-2.5, -5.0, -7.0],
      segLens: [2.55, 1.80, 1.58],
      radii: [
        [0.62, 0.56],
        [0.55, 0.49],
        [0.58, 0.52],
        [0.51, 0.45],
        [0.49, 0.43],
        [0.51, 0.45],
        [0.46, 0.39],
        [0.41, 0.34],
        [0.24, 0.18],
      ],
      nailBedScaleW: 0.86,
      nailBedLen: 1.25,
      upRollDeg: -1.2,
    },
    {
      id: 'pinky',
      root8: fingerRoots.pinky,
      spreadDeg: -2.8,
      bendDegs: [-3.0, -6.0, -8.0],
      segLens: [2.25, 1.55, 1.40],
      radii: [
        [0.54, 0.48],
        [0.48, 0.42],
        [0.50, 0.44],
        [0.44, 0.38],
        [0.42, 0.36],
        [0.44, 0.38],
        [0.39, 0.33],
        [0.36, 0.30],
        [0.23, 0.17],
      ],
      nailBedScaleW: 0.85,
      nailBedLen: 1.20,
      upRollDeg: -2.0,
    },
  ];

  const fingerRingRefs = {};
  let jewelryAnchor = null;

  for (const f of fingerDefs) {
    let cx = 0, cy = 0, cz = 0;
    for (const vi of f.root8) {
      cx += verts[vi].x;
      cy += verts[vi].y;
      cz += verts[vi].z;
    }
    const pRoot = { x: cx / 8, y: cy / 8, z: cz / 8 };
    const spreadRad = (f.spreadDeg * Math.PI) / 180;
    const rollRad = (f.upRollDeg * Math.PI) / 180;
    const upHint = { x: Math.sin(rollRad), y: Math.cos(rollRad), z: 0 };

    const dirAt = (bendDeg) => {
      const b = (bendDeg * Math.PI) / 180;
      return {
        x: Math.sin(spreadRad) * Math.cos(b),
        y: Math.sin(b),
        z: Math.cos(spreadRad) * Math.cos(b),
      };
    };

    const p0 = pRoot;
    const f0 = makeFrame(dirAt(f.bendDegs[0]), upHint);
    const pMid1 = addVec(p0, scaleVec(f0.forward, f.segLens[0] * 0.52));
    const pPIP = addVec(p0, scaleVec(f0.forward, f.segLens[0]));

    const f1 = makeFrame(dirAt(f.bendDegs[1]), upHint);
    const pMid2 = addVec(pPIP, scaleVec(f1.forward, f.segLens[1] * 0.50));
    const pDIP = addVec(pPIP, scaleVec(f1.forward, f.segLens[1]));

    const f2 = makeFrame(dirAt(f.bendDegs[2]), upHint);
    const pPreCuticle = addVec(pDIP, scaleVec(f2.forward, f.segLens[2] * 0.18));
    const pCuticle = addVec(pDIP, scaleVec(f2.forward, f.segLens[2] * 0.30));
    const pMidBed = addVec(pDIP, scaleVec(f2.forward, f.segLens[2] * 0.62));
    const pDistBed = addVec(pDIP, scaleVec(f2.forward, f.segLens[2] * 0.90));
    const pTip = addVec(pDIP, scaleVec(f2.forward, f.segLens[2] * 1.06));

    if (f.id === 'ring') {
      jewelryAnchor = {
        center: addVec(p0, scaleVec(f0.forward, f.segLens[0] * 0.44)),
        frame: f0,
        rx: f.radii[1][0] * 1.02,
        ry: f.radii[1][1] * 1.02,
      };
    }

    const rings = [
      addFingerRing(addVec(p0, scaleVec(f0.forward, 0.42)), f0, f.radii[0][0], f.radii[0][1], { aoBase: 0.95, warmthBase: 0.24 }),
      addFingerRing(pMid1, f0, f.radii[1][0], f.radii[1][1], { warmthBase: 0.16 }),
      addFingerRing(pPIP, f1, f.radii[2][0], f.radii[2][1], { knucklePuff: 0.018, warmthBase: 0.32, crease: 0.28 }),
      addFingerRing(pMid2, f1, f.radii[3][0], f.radii[3][1], { warmthBase: 0.16 }),
      addFingerRing(pDIP, f2, f.radii[4][0], f.radii[4][1], { knucklePuff: 0.015, warmthBase: 0.34, crease: 0.28 }),
      // Eponychium cuticle collar gently arched behind soft nail bed
      addFingerRing(pPreCuticle, f2, f.radii[5][0], f.radii[5][1], { knucklePuff: 0.025, cuticleCurve: 0.04, warmthBase: 0.46, crease: 0.34 }),
      addFingerRing(pCuticle, f2, f.radii[5][0] * 0.97, f.radii[5][1], {
        dorsalRecess: 0.12,
        cuticleCurve: -0.10,
        wallPuff: 0.030,
        padDroop: 0.035,
        warmthBase: 0.46,
        nailBedHighlight: true,
      }),
      addFingerRing(pMidBed, f2, f.radii[6][0], f.radii[6][1], {
        dorsalRecess: 0.145,
        wallPuff: 0.028,
        padDroop: 0.06,
        warmthBase: 0.42,
        nailBedHighlight: true,
      }),
      addFingerRing(pDistBed, f2, f.radii[7][0], f.radii[7][1], {
        dorsalRecess: 0.095,
        wallPuff: 0.016,
        padDroop: 0.045,
        warmthBase: 0.48,
        nailBedHighlight: true,
      }),
      addFingerRing(pTip, f2, f.radii[8][0], f.radii[8][1], {
        dorsalRecess: 0.01,
        padDroop: 0.015,
        warmthBase: 0.44,
      }),
    ];

    stitchRing8(f.root8, rings[0]);
    for (let s = 0; s < rings.length - 1; s++) {
      stitchRing8(rings[s], rings[s + 1]);
    }
    capTip8(rings[rings.length - 1]);

    fingerRingRefs[f.id] = {
      cuticleRing: rings[6],
      midBedRing: rings[7],
      distBedRing: rings[8],
      preCuticleRing: rings[5],
      fallbackFrame: f2,
      bedScaleW: f.nailBedScaleW,
      bedLength: f.nailBedLen,
      radiusMidX: f.radii[6][0],
    };
  }

  // ---------- 3. OPPOSABLE ANATOMICAL THUMB (RELAXED & SUPINATED SO THUMBNAIL FACES CAMERA NATURAL!) ----------
  const R1 = palmRings[2];
  const R2 = palmRings[3];
  const R3 = palmRings[4];
  const thumbRoot8 = [R1[0], R2[0], R3[0], R3[31], R3[30], R2[30], R1[30], R1[31]];

  let tcx = 0, tcy = 0, tcz = 0;
  for (const vi of thumbRoot8) {
    tcx += verts[vi].x;
    tcy += verts[vi].y;
    tcz += verts[vi].z;
  }
  const tStart = { x: tcx / 8 + 0.05, y: tcy / 8 - 0.26, z: tcz / 8 + 0.10 };
  // Graceful relaxed feminine thumb resting gently alongside the index digit
  const tDir0 = normVec({ x: 0.36, y: -0.22, z: 0.90 });
  const tUp0 = normVec({ x: 0.32, y: 0.92, z: -0.16 });
  const tf0 = makeFrame(tDir0, tUp0);

  const tDir1 = normVec({ x: 0.22, y: -0.15, z: 0.95 });
  const tUp1 = normVec({ x: 0.35, y: 0.92, z: -0.13 });
  const tf1 = makeFrame(tDir1, tUp1);

  const tDir2 = normVec({ x: 0.12, y: -0.09, z: 0.98 });
  const tUp2 = normVec({ x: 0.33, y: 0.93, z: -0.10 });
  const tf2 = makeFrame(tDir2, tUp2);

  const tp1 = addVec(tStart, scaleVec(tf0.forward, 1.35));
  const tpMCP = addVec(tp1, scaleVec(tf0.forward, 1.25));
  const tpMid = addVec(tpMCP, scaleVec(tf1.forward, 1.05));
  const tpIP = addVec(tpMCP, scaleVec(tf1.forward, 1.90));
  const tpPreCuticle = addVec(tpIP, scaleVec(tf2.forward, 0.24));
  const tpCuticle = addVec(tpIP, scaleVec(tf2.forward, 0.42));
  const tpMidBed = addVec(tpIP, scaleVec(tf2.forward, 0.88));
  const tpDistBed = addVec(tpIP, scaleVec(tf2.forward, 1.32));
  const tpTip = addVec(tpIP, scaleVec(tf2.forward, 1.54));

  const thumbRings = [
    addFingerRing(tp1, tf0, 0.92, 0.80, { aoBase: 0.94, warmthBase: 0.24 }),
    addFingerRing(tpMCP, tf1, 0.78, 0.68, { knucklePuff: 0.018, warmthBase: 0.32, crease: 0.24 }),
    addFingerRing(tpMid, tf1, 0.68, 0.60, { warmthBase: 0.18 }),
    addFingerRing(tpIP, tf2, 0.66, 0.58, { knucklePuff: 0.014, warmthBase: 0.34, crease: 0.24 }),
    addFingerRing(tpPreCuticle, tf2, 0.63, 0.55, { knucklePuff: 0.012, cuticleCurve: 0.035, wallPuff: 0.022, warmthBase: 0.44, crease: 0.24 }),
    addFingerRing(tpCuticle, tf2, 0.61, 0.52, { dorsalRecess: 0.10, cuticleCurve: -0.08, wallPuff: 0.022, padDroop: 0.035, warmthBase: 0.44, nailBedHighlight: true }),
    addFingerRing(tpMidBed, tf2, 0.57, 0.48, { dorsalRecess: 0.11, wallPuff: 0.020, padDroop: 0.045, warmthBase: 0.42, nailBedHighlight: true }),
    addFingerRing(tpDistBed, tf2, 0.50, 0.41, { dorsalRecess: 0.06, wallPuff: 0.012, padDroop: 0.035, warmthBase: 0.48, nailBedHighlight: true }),
    addFingerRing(tpTip, tf2, 0.30, 0.22, { dorsalRecess: 0.01, padDroop: 0.015, warmthBase: 0.44 }),
  ];

  stitchRing8(thumbRoot8, thumbRings[0]);
  for (let s = 0; s < thumbRings.length - 1; s++) {
    stitchRing8(thumbRings[s], thumbRings[s + 1]);
  }
  capTip8(thumbRings[thumbRings.length - 1]);

  fingerRingRefs.thumb = {
    cuticleRing: thumbRings[5],
    midBedRing: thumbRings[6],
    distBedRing: thumbRings[7],
    preCuticleRing: thumbRings[4],
    fallbackFrame: tf2,
    bedScaleW: 0.82,
    bedLength: 1.24,
    radiusMidX: 0.58,
    isThumb: true,
  };

  // ---------- 4. VERIFY POSITIVE SIGNED VOLUME & RUN CATMULL-CLARK ----------
  if (verify) {
    let signedVol = 0;
    for (const q of quads) {
      const a = verts[q[0]];
      const b = verts[q[1]];
      const c = verts[q[2]];
      const d = verts[q[3]];
      signedVol +=
        a.x * (b.y * c.z - b.z * c.y) +
        b.x * (c.y * a.z - c.z * a.y) +
        c.x * (a.y * b.z - a.z * b.y);
      signedVol +=
        a.x * (c.y * d.z - c.z * d.y) +
        c.x * (d.y * a.z - d.z * a.y) +
        d.x * (a.y * c.z - a.z * c.y);
    }
    if (signedVol <= 0) {
      throw new Error(`Expected outward CCW winding (positive volume), got ${signedVol}`);
    }
  }

  const sub = subdivideAllQuads(verts, quads, { levels: subdivisionLevels, verifyManifold: verify });
  const { verts: sv, quads: sq } = sub;

  // ---------- 5. COMPUTE EXACT POST-SUBDIVISION FLUSH NAIL ANCHORS FROM LIMIT VERTEX SURFACE ----------
  for (const [fid, ref] of Object.entries(fingerRingRefs)) {
    const midPt = (ring, k1, k2) => scaleVec(addVec(sv[ring[k1]], sv[ring[k2]]), 0.5);
    const cutCenter = midPt(ref.cuticleRing, 1, 2);
    const distCenter = midPt(ref.distBedRing, 1, 2);
    const leftSide = sv[ref.midBedRing[0]];
    const rightSide = sv[ref.midBedRing[3]];
    const spanVec = subVec(leftSide, rightSide);
    const actualFwd = normVec(subVec(distCenter, cutCenter));
    const rightAxis = normVec(spanVec);
    const upAxis = normVec(crossVec(actualFwd, rightAxis));
    const rightOrtho = normVec(crossVec(upAxis, actualFwd));

    const postSpanW = Math.hypot(spanVec.x, spanVec.y, spanVec.z);
    const exactBedLen =
      Math.hypot(distCenter.x - cutCenter.x, distCenter.y - cutCenter.y, distCenter.z - cutCenter.z) *
      (ref.isThumb ? 1.24 : 1.26);

    if (ref.isThumb) {
      const f = ref.fallbackFrame;
      nailAnchors[fid] = {
        origin: addVec(addVec(cutCenter, scaleVec(f.up, 0.012)), scaleVec(f.forward, -0.015)),
        frame: { right: f.right, up: f.up, forward: f.forward },
        bedWidth: Math.min(postSpanW * 0.86, ref.radiusMidX * 2 * ref.bedScaleW),
        bedLength: Math.max(exactBedLen, ref.bedLength || 1.22),
        archDrop: 0.095,
        baseThickness: 0.038,
      };
    } else {
      nailAnchors[fid] = {
        origin: subVec(addVec(cutCenter, scaleVec(upAxis, 0.014)), scaleVec(actualFwd, 0.018)),
        frame: { right: rightOrtho, up: upAxis, forward: actualFwd },
        bedWidth: Math.min(postSpanW * 0.86, ref.radiusMidX * 2 * ref.bedScaleW),
        bedLength: Math.max(exactBedLen, ref.bedLength || 1.22),
        archDrop: 0.088,
        baseThickness: 0.036,
      };
    }
  }

  return {
    positions: (() => {
      const p = new Float32Array(sv.length * 3);
      for (let i = 0; i < sv.length; i++) {
        p[i * 3] = sv[i].x;
        p[i * 3 + 1] = sv[i].y;
        p[i * 3 + 2] = sv[i].z;
      }
      return p;
    })(),
    uvs: (() => {
      const u = new Float32Array(sv.length * 2);
      for (let i = 0; i < sv.length; i++) {
        u[i * 2] = (sv[i].x + 8.5) / 16.0;
        u[i * 2 + 1] = (sv[i].z + 18.0) / 28.0;
      }
      return u;
    })(),
    skinData: (() => {
      const sd = new Float32Array(sv.length * 3);
      for (let i = 0; i < sv.length; i++) {
        sd[i * 3] = sv[i].ao;
        sd[i * 3 + 1] = sv[i].warmth;
        sd[i * 3 + 2] = sv[i].crease;
      }
      return sd;
    })(),
    indices: (() => {
      const idx = new Uint32Array(sq.length * 6);
      for (let qi = 0; qi < sq.length; qi++) {
        const q = sq[qi];
        const b = qi * 6;
        idx[b] = q[0];
        idx[b + 1] = q[1];
        idx[b + 2] = q[2];
        idx[b + 3] = q[0];
        idx[b + 4] = q[2];
        idx[b + 5] = q[3];
      }
      return idx;
    })(),
    nailAnchors,
    jewelryAnchor,
    stats: {
      controlVerts: verts.length,
      controlQuads: quads.length,
      subdividedVerts: sv.length,
      subdividedQuads: sq.length,
      triangles: sq.length * 2,
    },
  };
}
