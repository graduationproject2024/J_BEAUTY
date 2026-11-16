# J Beauty — Tooling, Subagent & Licensing Roster

**Project:** J Beauty Quality Recovery & Next-Generation Nail Simulator  
**Repository:** `https://github.com/graduationproject2024/J_BEAUTY.git`  
**Branch:** `feat/j-beauty-atelier-v2-quality-recovery`

---

## 1. Multidisciplinary Agent Roster

1. **Principal Software Architect:** Dual-origin application architecture (`apps/customer` on port 3000, `apps/staff` on port 3100), host-only cookie isolation, separate bundle entry points, and unified SQLite transactional backend.
2. **3D Graphics & PBR Engineer:** Procedural Catmull-Clark manifold hand mesh generator, 15 parametric solid nail plate models, PBR physical material shaders (clearcoat lacquer, velvet matte, iridescent pearl, warm gold leaf), and softbox environment lighting.
3. **Computational Geometry Specialist:** Polar-smooth nail boundary curves, parabolic U-cuticle pockets, continuous C1 almond petal contours, and manifold topology verification.
4. **Application Security & Financial Engineer:** Staff MFA enforcement (`OPS_MFA_REQUIRED=all`), AES-256-GCM TOTP secret encryption at rest, role-based access control (RBAC), atomic Petals rewards ledger, and idempotent payment verification.
5. **Mobile Interaction & Luxury Brand Designer:** Botanical Editorial Luxury aesthetic, mobile 3-tab studio UX (360px–430px), single persistent WebGL context, touch orbit controls, and Saudi Modern Standard Arabic copy.
6. **Independent Visual QA Auditor (`independent-visual-auditor`):** Dedicated read-only subagent inspecting every raw screenshot file with `read_file` across 3 rigorous audit rounds to enforce genuine visual quality standards.

---

## 2. Dependencies & Runtime Licenses

All dependencies are self-hosted and offline-capable in strict compliance with Content Security Policy (`script-src 'self'`):

| Dependency | Version | License | Path | Purpose |
|---|---|---|---|---|
| Three.js | 0.187.0 | MIT | `apps/customer/vendor/three/three.module.js` | 3D WebGL2 scene, geometry, and materials |
| OrbitControls | 0.187.0 | MIT | `apps/customer/vendor/three/addons/controls/OrbitControls.js` | Touch-drag 360° rotation and camera navigation |
| RoomEnvironment | 0.187.0 | MIT | `apps/customer/vendor/three/addons/environments/RoomEnvironment.js` | Studio softbox HDR environment map generation |
| BufferGeometryUtils | 0.187.0 | MIT | `apps/customer/vendor/three/addons/utils/BufferGeometryUtils.js` | Vertex normal generation and mesh merging |
| SQLite3 | Built-in Node | Public Domain | `sqlite3` via Node.js | Authoritative operational database |
| Playwright | Local Dev | Apache 2.0 | Dev Tooling | Headless browser test runner & visual screenshot capture |
| Axe-Core | 4.10.2 | MPL 2.0 | Dev Tooling | WCAG 2.1 AA automated accessibility audit |

Zero external runtime scripts or CDNs are loaded.
