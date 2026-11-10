---
name: jspa-nail-rendering
description: Defines anatomical accuracy, studio lighting realism, material physically-based polish appearance, French tip alignment, skin undertone rendering, and mobile sticky preview usability for J Nail Atelier.
---

# J Nail Atelier Rendering Skill

## Rejection Criteria (Hard Failure Conditions)
- Hand silhouette looks cartoonish, paper-cut, tubular, or stiffly geometric.
- Fingernails float, clip outside fingertip edges, sit off-axis, or lack cuticle pocket depth.
- Skin shading lacks natural warmth gradient, knuckle crease subtlety, or coherent lighting direction.
- Controls fail to visibly update nail shape, length, polish shade, French tip geometry, or finish sheen.

## Rendering & Verification Protocol
1. Evaluate **Option A (WebGL/Three.js 3D anatomical hand + physical clearcoat/iridescent/matte PBR materials)** vs. **Option B (High-resolution studio photographic dorsal hand composite + pixel-accurate foreshortened WebGL/Canvas manicure overlay)** before shipping to production UI.
2. Verify accurate geometry & registration across all 5 nail shapes (`almond`, `oval`, `soft-square`, `square`, `coffin`) and all 3 lengths (`short`, `medium`, `long`).
3. Verify realistic optical behavior across finishes (`glossy` crisp specular reflection, `pearl` soft pearlescent shimmer, `matte` velvety low-specular micro-diffuse) and accents (`rose-gold foil`, `pearl dot`, `floral accent`).
4. Verify all 4 skin undertones preserve natural warmth, contrast against light/nude/sheer polishes, and believable shadow falloff.
5. On mobile (`360px–430px`), keep the live nail preview visible in a compact sticky stage without blocking top header, drawer, or bottom CTA controls.
6. Capture close-up multi-configuration comparison screenshots (`almond`, `coffin`, `oval`, deep & fair skin tones, burgundy/sheer/sage shades, matte vs gloss) and inspect via independent visual review.

