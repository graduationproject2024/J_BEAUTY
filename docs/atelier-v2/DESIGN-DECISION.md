# Architectural Decision Record — Nail Atelier Rendering & UX

**Decision:** Adopt **Option C — Hybrid Luxury Architecture** across Customer Web (`apps/customer`) and static GitHub Pages showcase (`scripts/build-gh-pages.mjs`).

---

## 1. Decision Drivers
- **Independent Visual Gate Findings:** Static 2D photographic compositing (`Option B` and the legacy `720x720` Canvas overlay) failed visual credibility whenever shapes (`Coffin`, `Square`, `Long`) diverged from the base photograph's short oval manicure or when skin tone shifts interacted with adjacent fabric lighting.
- **Luxury Brand Positioning (`J Beauty`, Al Madinah):** High-trust beauty clientele expect genuine multi-angle studio inspection (comparing Almond vs Oval vs Squoval silhouettes, Micro French vs Classic U-smile lines, Gloss vs Pearl vs Matte luster, and authentic skin-tone contrast across `Fair`, `Warm`, `Olive`, and `Deep`) within calm Botanical Editorial styling.
- **Strict Security & Platform Constraints:**
  - Strict CSP (`script-src 'self'`, `connect-src 'self'`) forbids third-party CDNs or external runtime calls. Self-hosted MIT `three@0.187.0` ESM modules with relative imports require zero bundler and run identically on Node 24 (`http://127.0.0.1:3000`) and static GitHub Pages (`/J_BEAUTY`).
  - Browser WebGL context caps require **single active context budget per route** (`/atelier` and `/` use 1 live on-demand `Atelier3DRenderer` disposed automatically before SPA route teardown; Beauty Passport `/account` uses zero extra WebGL contexts).

---

## 2. Production Architecture Summary

1. **Interactive 3D Core (`apps/customer/js/atelier/`):**
   - `catmull-clark.js`: Exact all-quad subdivision surface (`Euler = 2` manifold verified).
   - `hand-geometry.js`: Anatomical female left hand (`21,664` subdivided tris) with webbed interdigital saddles, relaxed pronated thumb, elliptical 18k rose-gold band anchor, and post-subdivision limit-vertex flush cuticle sockets.
   - `nail-geometry.js`: Polar-smooth solid closed beveled nail plates across 5 shapes × 3 lengths using undistorted Cartesian UVs.
   - `material-textures.js`: On-the-fly UV texture painting (`sheer natural bed + lunula`, razor-sharp `classic`/`colored`/`micro`/`ombre` French tips, metallic `gold_foil`, floral relief `floral_dot`, cutaneous micro-pore normal maps).
   - `renderer-3d.js`: Single feathered softbox studio equirectangular HDRI (`zero Y-glare`), draped woven raw-linen plinth + soft cast shadows, `OrbitControls`, 4 curated camera poses (`editorial`, `closeup`, `overhead`, `profile`), idle render-on-demand loop (`0%` idle GPU usage), and explicit GPU resource disposal.
2. **Graceful Software Fallback (`renderer-25d.js`):**
   - Automatically engaged ONLY if WebGL2 fails initialization or triggers `webglcontextlost`, preventing UI breakage on restricted hardware.
3. **Mobile-First Workbench (`apps/customer/js/atelier.js` + `styles.css`):**
   - Dominant sticky-free top 3D viewer (`42svh` / `~300–355px`) with inline **Camera Preset Pills**, **Drag-to-Orbit** hint, and **Skin Tone Swatches**.
   - Compact 3-tab segmented controls (`Shape & Length` | `Colors & Styles` | `Finish & Details`) directly beneath the hand stage, eliminating vertical control-wall scrolling on `360px`–`430px` viewports.
   - Dedicated **Service Complexity & Eligibility Engine (`service-mapping.js` + `server/experiences.mjs`)** mapping Ombre/Micro-French/Gold Foil/Pearl/Blossom/Long Sculpting accurately to J Beauty services (`gel-polish`, `french-gel`, `colored-french`), plus optional 1-click Gel Removal companion selection and Reset Look button.

