# J Beauty Nail Atelier v2 — Model, Library & Asset Licensing Audit

**Branch:** `feat/j-beauty-atelier-v2-quality-recovery`  
**Security Policy Alignment:** Strict CSP (`script-src 'self'`, `connect-src 'self'`, `font-src 'self' data:`) — zero runtime CDN requests and zero external tracking beacons.

---

## 1. Self-Hosted 3D Runtime Library

| Asset / Path | Source | Version | License | Modification Notes |
| --- | --- | --- | --- | --- |
| `apps/customer/vendor/three/three.module.js` | `three` npm registry | `0.187.0` | **MIT** | Copied verbatim from `three/build/three.module.js`; full MIT notice preserved at `apps/customer/vendor/three/LICENSE`. |
| `apps/customer/vendor/three/three.core.js` | `three` npm registry | `0.187.0` | **MIT** | Copied verbatim from `three/build/three.core.js`. |
| `apps/customer/vendor/three/OrbitControls.js` | `three` examples/jsm | `0.187.0` | **MIT** | Copied from `three/examples/jsm/controls/OrbitControls.js`; bare specifier `'three'` rewritten to `'./three.module.js'` for zero-bundler browser ES module compatibility under `script-src 'self'`. |
| `apps/customer/vendor/three/RoomEnvironment.js` | `three` examples/jsm | `0.187.0` | **MIT** | Copied from `three/examples/jsm/environments/RoomEnvironment.js`; bare specifier `'three'` rewritten to `'./three.module.js'`. |
| `apps/customer/vendor/three/BufferGeometryUtils.js` | `three` examples/jsm | `0.187.0` | **MIT** | Copied from `three/examples/jsm/utils/BufferGeometryUtils.js`; bare specifier `'three'` rewritten to `'./three.module.js'`. |
| `apps/customer/vendor/three/LICENSE` | `three` npm package | `0.187.0` | **MIT** | Canonical Three.js Authors copyright & MIT license text. |

---

## 2. Procedural 3D Anatomy, Nail Meshes & PBR Maps (In-House Original)

| Module | Origin | License / Rights | Description |
| --- | --- | --- | --- |
| `apps/customer/js/atelier/catmull-clark.js` | Authored cleanly for J Beauty | Project-owned | Pure ES module all-quad Catmull-Clark surface subdivision engine preserving per-vertex AO, warmth, and crease attributes with closed manifold (`V - E + F = 2`) assertion support. |
| `apps/customer/js/atelier/hand-geometry.js` | Authored cleanly for J Beauty | Project-owned | Closed watertight all-quad anatomical female left hand control cage (`648` control vertices, `645` quads) subdividing to `21,664` smooth triangles with webbed interdigital saddles, pronated thumb, and recessed cuticle nail pockets. |
| `apps/customer/js/atelier/nail-geometry.js` | Authored cleanly for J Beauty | Project-owned | Parametric solid beveled 3D nail plate shell builder covering 5 shapes (`almond`, `oval`, `squoval`, `square`, `coffin`) × 3 lengths (`short`, `medium`, `long`) with longitudinal apex dome, transverse C-arch, and natural underside keratin. |
| `apps/customer/js/atelier/material-textures.js` | Authored cleanly for J Beauty | Project-owned | Runtime offscreen Canvas PBR texture generators (seamless dermal micro-pore normal/roughness maps, matte micro-grain roughness, multi-tone skin reflectance, crisp UV French/micro-French/ombre/metallic gold-foil/blossom maps). |
| `apps/customer/js/atelier/renderer-3d.js` | Authored cleanly for J Beauty | Project-owned | Luxury studio PMREM softbox environment, travertine-linen tabletop plinth, dermal wrap-around subsurface scatter shader, 3D pearl cabochon + 18k rose-gold bezel, camera presets, and idle on-demand render loop. |
| `apps/customer/js/atelier/service-mapping.js` | Authored cleanly for J Beauty | Project-owned | Deterministic complexity, prep advisory, and catalog service matcher. |

---

## 3. Existing Static Studio Photography & Fallback Assets

| Asset / Path | Usage | Status / Provenance |
| --- | --- | --- |
| `apps/customer/assets/images/atelier-hand-base.webp` | Prototype B & WebGL context-loss / non-WebGL `2.5D` fallback compositor (`renderer-25d.js`) | Existing project visual asset curated in repo (`PR #1` / `PR #2` history), retained cleanly for non-WebGL software fallback. |
| `apps/customer/assets/images/services/*.webp` | Catalog service imagery across `/services`, `/booking`, `/lookbook`, homepage | Existing project curated visual assets (`13` services, verified individually during quality-recovery phases). |
| `apps/customer/assets/images/botanical/rose-damascena.webp` | J Petals Club cameo botanical emblem | Existing project asset preserved intact. |

---

## 4. Bundled Fonts & External Dependencies

- All fonts (`plex-arabic-*.woff2`, `newsreader-*.woff2`) remain self-hosted under `apps/customer/fonts/`.
- `package.json` backend runtime stays **zero external npm dependencies** on Node.js 24 LTS (`node:sqlite` + built-in HTTP/crypto modules).
- PlayWright (`playwright`, `@axe-core/playwright`) remain development/test tooling only outside `apps/customer/` and `apps/staff/`.

