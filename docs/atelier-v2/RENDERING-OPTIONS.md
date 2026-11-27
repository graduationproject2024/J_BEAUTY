# Nail Atelier v2 — Rendering Options & Prototype Comparison

**Date:** 2026-11-11  
**Comparison Evidence:** [`screenshots/atelier-v2/prototypes/`](../../screenshots/atelier-v2/prototypes/) across all 6 mandatory presets (`compare-p1` through `compare-p6`) plus diagnostic poses (`angle-overhead-almond-french.png`, `angle-side-profile-apex.png`).  
**Independent Review:** Conducted by read-only Visual Quality Auditor subagent (`a930b863`) across Round 1 and Round 2 captures, followed by targeted Round 3 geometry, lighting, and framing resolution.

---

## 1. The Three Evaluated Prototypes

| Architecture | Description | Strengths Observed | Structural Limitations / Failures Observed |
| --- | --- | --- | --- |
| **Option A — Full 3D Sculpted Hand & PBR Gel (`Editorial 3/4`)** | Self-hosted MIT `three@0.187.0` WebGL2 engine + Catmull-Clark subdivided closed-manifold female hand (`21,664` tris) + solid beveled UV nail plates + equirectangular softbox HDRI + woven linen plinth + 18k rose-gold ring | Genuine multi-angle depth, accurate skin tone range (`fair`, `warm`, `olive`, `deep`), smooth U-cuticle integration, accurate shape contours (`oval` vs `squoval` vs `almond` vs `coffin` vs `square`), crisp gloss vs pearl vs velvet-matte finish separation | Single fixed 3/4 angle slightly smaller when inspecting fine ~1.1mm Micro French or detailed botanical blossoms on 360px mobile screens unless macro zoom presets are provided |
| **Option B — Enhanced Zoomed 2.5D Photographic Studio** | Chromatic skin-masked zoom crop of `/assets/images/atelier-hand-base.webp` + Canvas2D curved highlight overlays (`renderer-25d.js`) | Photographic linen fabric and existing finger creases in base pose | **Rejected by Independent Auditor:** Even after zoom & skin masking, overlays look visibly flat/pasted on longer Coffin/Square shapes (`compare-p4`, `compare-p5`), cannot rotate to inspect side apex arch or overhead symmetry, fail clean Fair/Olive skin isolation, and show cuticle/edge seams |
| **Option C — Hybrid Luxury Architecture (`Selected Winner`)** | **Live 3D interactive WebGL Studio on `/atelier` & homepage widget** with 1-click camera poses (`Editorial 3/4`, `Macro Close-Up`, `Overhead`, `Side Apex Arch`), **clean WebGL lifecycle disposal** (`1` active context max per page), lightweight styled card badges in Beauty Passport (zero WebGL context exhaustion), and software `2.5D` context-loss/non-WebGL fallback | Combines full 5-finger editorial warmth (`Option A`), crystal-clear macro manicure detail (`Close-Up`), multi-angle arch inspection (`Side Profile` / `Overhead`), zero mobile/Passport context exhaustion, and strict CSP `'self'` compatibility | Requires explicit `ResizeObserver` & route-change `dispose()` lifecycle discipline (implemented cleanly in `atelier.js` + `app.js`) |

---

## 2. Preset Matrix Audit Summary

1. **Fair + Short + Oval + Sheer Blush (Gloss) (`compare-p1`):** Sheer warm translucent bed with soft milky lunula depth; curved U-cuticle edge without sharp corners.
2. **Warm + Medium + Almond + Classic French (Gloss) (`compare-p2`):** Undistorted Cartesian UV mapping produces crisp parabolic salon U-smile curve (eliminated V-chevron distortion).
3. **Olive + Medium + Soft Square + Sage Matte (`compare-p3`):** Velvety low-specular matte micro-grain roughness cleanly distinct from glass gloss; square-rounded corners preserved.
4. **Deep + Long + Coffin + Burgundy Gloss + Gold Foil (`compare-p4`):** Deep saturated burgundy wine pigment preserved under feathered softbox HDRI (`Y-forked glare eliminated`); true metallic 18k gold foil shards catch light cleanly across curved coffin plane.
5. **Deep + Long + Square + Micro French (Pearl) (`compare-p5`):** Signature ~1.1mm Micro French leading rim contrast, luminous pearl sheen, and 3D mother-of-pearl cabochon seated inside 18k rose-gold micro-bezel.
6. **Warm + Medium + Oval + Soft Ombre + Floral Dot (`compare-p6`):** Rounded elliptical Oval silhouette cleanly separated from Squoval; smooth baby-boomer gradient and 5-petal botanical relief dot.

