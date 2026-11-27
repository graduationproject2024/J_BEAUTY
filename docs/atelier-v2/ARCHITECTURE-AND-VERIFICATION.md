# J Nail Atelier 2.0 — Architecture & Verification Specification

**Project:** J Beauty — Botanical Editorial Luxury  
**Module:** J Nail Atelier 2.0 (Option C: 3D Hybrid Studio)  
**Status:** **PASSED & APPROVED** (Independent Visual Quality Audit — Round 3 Final)

---

## 1. Architectural Architecture & Graphics Engine

The J Nail Atelier 2.0 is a 3D manicure visualization studio built specifically for high-end home beauty services in Al Madinah Al Munawwarah. It replaces legacy 2D SVG/Canvas sticker overlays with an offline, high-precision WebGL2 / Three.js physical rendering pipeline combined with a fallback compositor.

### Key Engine Components:

1. **Procedural Manifold Hand Geometry (`apps/customer/js/atelier/hand-geometry.js`, `catmull-clark.js`):**
   - Pure quad control cage: 680 control vertices $\to$ 21,664 triangles after 2-level Catmull-Clark subdivision.
   - Guaranteed watertight 2-manifold surface with zero boundary edges, zero non-manifold edges, and strictly positive signed volume ($\approx +278.4\text{ cm}^3$).
   - Anatomically tailored female hand proportions with dorsal extensor tendon ridges, Thenar and Hypothenar palmar cushioning, relaxed wrist flow, and opposable thumb geometry supinated toward the camera.

2. **Parametric Solid Nail Geometry (`apps/customer/js/atelier/nail-geometry.js`):**
   - 15 parametric solid nail plate models: 5 salon shapes (Oval, Almond, Squoval, Coffin, Square) $\times$ 3 lengths (Short $1.18\times$, Medium $1.46\times$, Long $1.82\times$).
   - Smooth C1 continuous proximal root contour ($w = 0.90 \to 1.0$ at $u = 0.16$) eliminating pointed chevron/pentagon corners.
   - True parabolic/elliptical U-cuticle pocket ($\frac{\mathrm{d}z}{\mathrm{d}v} = 0$ at centerline) tucking gently ($0.35\text{ mm}$) into the eponychium fold.
   - Continuous, uniform lateral sidewall thickness eliminating side-profile V-notch slicing.
   - C1/G1 petal curve almond apex dome eliminating blunt/notched tip truncations.
   - Undistorted Cartesian UV parameterization ($u = 0.5 + 0.5 \cdot v \cdot w$) ensuring painted French curves and nail art maintain crisp proportions without pinching or chevron distortion.

3. **Physically-Based Shader & Material Texture Pipeline (`apps/customer/js/atelier/material-textures.js`):**
   - Multi-layer dermal optical model: Subsurface scattering tint, micro-pore normal and roughness maps, and crease ambient occlusion.
   - Dual-layer clearcoat nail lacquer: High-gloss clearcoat ($IOR = 1.50$, roughness $= 0.05$), velvet matte ($0.74$ roughness with micro-satin grain), and glazed pearl iridescent sheen.
   - Calibrated French styles:
     - Classic French & Colored French: Smooth salon U-smile curve ($\pm 0.0028$ razor-crisp brush boundary).
     - Micro French: Uniform $1.5\text{--}1.8\text{ mm}$ perimeter band ($0.075\text{--}0.092$ UV space) with salon micro-smile, distinctly articulated across all 5 digits (thumb, index, middle, ring, pinky) and isolated from proximal bed occlusion.
     - Ombre: Soft, diffused vertical gradient transition.
   - Botanical & jewelry accents: Organic 24k warm champagne gold leaf flecks ($[245, 212, 134]$) with metallic modulation, and pearl cabochon seated in a polished gold bezel.

4. **Deterministic Catalog Service Mapping (`apps/customer/js/atelier/service-mapping.js`):**
   - Directly maps custom atelier designs into verified salon catalog services (`gel-polish`, `french-gel`, `colored-french`, duration extensions, and prep advisories).
   - Seamless transition into the 4-step customer booking funnel.

5. **Pixel-Registered 2.5D Fallback Compositor (`apps/customer/js/atelier/renderer-25d.js`):**
   - Graceful offline fallback for devices without WebGL2 support.
   - Pixel-exact anchor registration across all 5 digits on `atelier-hand-base.webp` ($720\times 720$), curved U-smile tips, and multi-layer highlight compositing.

6. **Mobile-First 3-Tab Studio UX (`apps/customer/js/atelier.js`, `styles.css`):**
   - 360px–430px responsive viewport design where the interactive 3D stage occupies 35%–41% viewport height.
   - Persistent single WebGL context across viewport resizes and camera switches.
   - Streamlined 3-tab drawer:
     1. الشكل والطول (Shape & Length)
     2. الألوان والفرنش (Colors & French Styles)
     3. اللمسة والزخرفة (Finish & Luxury Accents)
   - Multi-angle camera quick pills (Overview 3/4, Overhead Top, Macro Closeup, Side Profile) with full touch-drag 360° orbit controls.

---

## 2. Independent Visual Quality Verification

- **Auditor:** `independent-visual-auditor` (Read-Only Independent Visual Reviewer)
- **Rounds Conducted:** 3 Rounds
- **Round 1 Verdict:** REJECTED (Identified 5 initial defects: fallback registration, Micro French white bleed, thumb cuticle line, Arabic bidi, gold foil spots).
- **Round 2 Verdict:** REJECTED (Confirmed Round 1 fixes; identified 4 specific geometric & shader refinements).
- **Round 3 Verdict:** **APPROVED (`FINAL VERDICT: PASS`)**
  - Confirmed smooth parabolic U-cuticle curvature across all 5 digits.
  - Confirmed zero side-profile V-notch slicing.
  - Confirmed crisp Micro French articulation on thumb, pinky, ring, middle, and index.
  - Confirmed natural thumb phalanx tapering and symmetric centerline alignment.
  - Confirmed smooth C1/G1 petal curve almond apex.
  - Confirmed 100% 2.5D fallback registration, correct Arabic MSA typography, and studio lighting cohesion.
