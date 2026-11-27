// Pure ES module all-quad Catmull-Clark subdivision engine for smooth anatomical hand geometry
// Preserves custom per-vertex channels (ao, warmth, nailMask) cleanly across subdivisions.

export function subdivideAllQuads(verts, quads, { levels = 2, verifyManifold = false } = {}) {
  let curVerts = verts.map((v) => ({
    x: v.x,
    y: v.y,
    z: v.z,
    ao: v.ao ?? 1,
    warmth: v.warmth ?? 0,
    crease: v.crease ?? 0,
  }));
  let curQuads = quads.map((q) => [...q]);

  if (verifyManifold) {
    assertWatertightQuads(curVerts.length, curQuads);
  }

  for (let lvl = 0; lvl < levels; lvl++) {
    const facePts = new Array(curQuads.length);
    const edgeMap = new Map();
    const vertFaces = Array.from({ length: curVerts.length }, () => []);
    const vertEdges = Array.from({ length: curVerts.length }, () => new Set());

    const edgeKey = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);

    // 1. Face points & adjacency
    for (let fi = 0; fi < curQuads.length; fi++) {
      const q = curQuads[fi];
      const fp = { x: 0, y: 0, z: 0, ao: 0, warmth: 0, crease: 0 };
      for (let k = 0; k < 4; k++) {
        const v = curVerts[q[k]];
        fp.x += v.x;
        fp.y += v.y;
        fp.z += v.z;
        fp.ao += v.ao;
        fp.warmth += v.warmth;
        fp.crease += v.crease;
        vertFaces[q[k]].push(fi);
      }
      fp.x *= 0.25;
      fp.y *= 0.25;
      fp.z *= 0.25;
      fp.ao *= 0.25;
      fp.warmth *= 0.25;
      fp.crease *= 0.25;
      facePts[fi] = fp;

      for (let k = 0; k < 4; k++) {
        const a = q[k];
        const b = q[(k + 1) & 3];
        const key = edgeKey(a, b);
        let edge = edgeMap.get(key);
        if (!edge) {
          edge = { a: Math.min(a, b), b: Math.max(a, b), faces: [], idx: -1, pt: null };
          edgeMap.set(key, edge);
        }
        edge.faces.push(fi);
        vertEdges[a].add(edge);
        vertEdges[b].add(edge);
      }
    }

    // 2. Build new vertex array: [updated originals | face points | edge points]
    const nextVerts = new Array(curVerts.length + facePts.length + edgeMap.size);
    const faceOffset = curVerts.length;
    let edgeOffset = faceOffset + facePts.length;

    for (let fi = 0; fi < facePts.length; fi++) {
      nextVerts[faceOffset + fi] = facePts[fi];
    }

    for (const edge of edgeMap.values()) {
      const va = curVerts[edge.a];
      const vb = curVerts[edge.b];
      if (edge.faces.length === 2) {
        const f0 = facePts[edge.faces[0]];
        const f1 = facePts[edge.faces[1]];
        const sharp = Math.min(va.crease, vb.crease);
        const smoothX = (va.x + vb.x + f0.x + f1.x) * 0.25;
        const smoothY = (va.y + vb.y + f0.y + f1.y) * 0.25;
        const smoothZ = (va.z + vb.z + f0.z + f1.z) * 0.25;
        const midX = (va.x + vb.x) * 0.5;
        const midY = (va.y + vb.y) * 0.5;
        const midZ = (va.z + vb.z) * 0.5;
        edge.pt = {
          x: smoothX * (1 - sharp * 0.65) + midX * (sharp * 0.65),
          y: smoothY * (1 - sharp * 0.65) + midY * (sharp * 0.65),
          z: smoothZ * (1 - sharp * 0.65) + midZ * (sharp * 0.65),
          ao: (va.ao + vb.ao + f0.ao + f1.ao) * 0.25,
          warmth: (va.warmth + vb.warmth + f0.warmth + f1.warmth) * 0.25,
          crease: sharp * 0.5,
        };
      } else {
        edge.pt = {
          x: (va.x + vb.x) * 0.5,
          y: (va.y + vb.y) * 0.5,
          z: (va.z + vb.z) * 0.5,
          ao: (va.ao + vb.ao) * 0.5,
          warmth: (va.warmth + vb.warmth) * 0.5,
          crease: (va.crease + vb.crease) * 0.25,
        };
      }
      edge.idx = edgeOffset++;
      nextVerts[edge.idx] = edge.pt;
    }

    // 3. Original vertex limit smoothing
    for (let vi = 0; vi < curVerts.length; vi++) {
      const P = curVerts[vi];
      const adjFaces = vertFaces[vi];
      const adjEdges = [...vertEdges[vi]];
      const n = adjFaces.length;
      if (n === 0 || adjEdges.length !== n) {
        nextVerts[vi] = { ...P };
        continue;
      }

      let fx = 0;
      let fy = 0;
      let fz = 0;
      for (const fi of adjFaces) {
        fx += facePts[fi].x;
        fy += facePts[fi].y;
        fz += facePts[fi].z;
      }
      fx /= n;
      fy /= n;
      fz /= n;

      let rx = 0;
      let ry = 0;
      let rz = 0;
      for (const e of adjEdges) {
        const va = curVerts[e.a];
        const vb = curVerts[e.b];
        rx += (va.x + vb.x) * 0.5;
        ry += (va.y + vb.y) * 0.5;
        rz += (va.z + vb.z) * 0.5;
      }
      rx /= n;
      ry /= n;
      rz /= n;

      const sX = (fx + 2 * rx + (n - 3) * P.x) / n;
      const sY = (fy + 2 * ry + (n - 3) * P.y) / n;
      const sZ = (fz + 2 * rz + (n - 3) * P.z) / n;
      const keep = P.crease * 0.55;
      nextVerts[vi] = {
        x: sX * (1 - keep) + P.x * keep,
        y: sY * (1 - keep) + P.y * keep,
        z: sZ * (1 - keep) + P.z * keep,
        ao: P.ao,
        warmth: P.warmth,
        crease: P.crease * 0.5,
      };
    }

    // 4. Split every quad into 4 refined quads
    const nextQuads = new Array(curQuads.length * 4);
    let qOut = 0;
    for (let fi = 0; fi < curQuads.length; fi++) {
      const [a, b, c, d] = curQuads[fi];
      const fIdx = faceOffset + fi;
      const eAB = edgeMap.get(edgeKey(a, b)).idx;
      const eBC = edgeMap.get(edgeKey(b, c)).idx;
      const eCD = edgeMap.get(edgeKey(c, d)).idx;
      const eDA = edgeMap.get(edgeKey(d, a)).idx;
      nextQuads[qOut++] = [a, eAB, fIdx, eDA];
      nextQuads[qOut++] = [b, eBC, fIdx, eAB];
      nextQuads[qOut++] = [c, eCD, fIdx, eBC];
      nextQuads[qOut++] = [d, eDA, fIdx, eCD];
    }

    curVerts = nextVerts;
    curQuads = nextQuads;
  }

  return { verts: curVerts, quads: curQuads };
}

export function assertWatertightQuads(vertCount, quads) {
  const counts = new Map();
  const used = new Set();
  for (const q of quads) {
    if (q.length !== 4) throw new Error('Expected quad face');
    for (let k = 0; k < 4; k++) {
      const a = q[k];
      const b = q[(k + 1) & 3];
      used.add(a);
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  const bad = [];
  for (const [k, c] of counts.entries()) {
    if (c !== 2) bad.push(`${k}:${c}`);
  }
  if (bad.length) {
    throw new Error(`Non-manifold hand control cage edges (${bad.length}): ${bad.slice(0, 6).join(', ')}`);
  }
  const euler = used.size - counts.size + quads.length;
  if (euler !== 2) {
    throw new Error(`Invalid Euler characteristic ${euler} (expected 2 for closed sphere-equivalent hand mesh; unused=${vertCount - used.size})`);
  }
}
