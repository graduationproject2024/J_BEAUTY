# J Beauty — Forensic Root-Cause Quality Audit

**Module:** Quality Recovery Forensic Audit  
**Author:** Principal Software Architect & Lead Graphics Engineer

---

## 1. Executive Summary & Root-Cause Analysis

The J Beauty project had accumulated multiple iterations where tests passed but the visual, operational, and user experience quality failed to meet professional standards. A forensic audit uncovered the fundamental root causes:

### 1.1 The Graphics Problem: 2D Overlay Paradigm Failure
- **Symptom:** Previous agents attempted to refine the nail simulator by tweaking 2D SVG paths, canvas linear gradients, fake drop shadows, and gloss overlays on static hand photos.
- **Root Cause:** A hand in real space is a 3D curved form. Manicure styles (C-curves, apex domes, sidewall tucks, French smile lines, clearcoat Fresnel reflections) are inherently 3D volumetric phenomena. Fitting a 2D flat path onto a 2D photograph resulted in perspective mismatch, missing C-curves, unnatural cuticle seams, and lighting conflicts between the photo and the nail.
- **Resolution:** Replaced the 2D overlay with **Option C: 3D Hybrid Studio**, featuring a procedurally subdivided manifold 3D hand, 15 parametric solid nail plate models, and real-time physical materials (Three.js WebGL2), while upgrading the 2D mode into a pixel-exact fallback.

### 1.2 Platform Architecture: Embedded Operations Dashboard
- **Symptom:** The staff management and owner tools were served from within the customer application bundle under `/ar/admin`.
- **Root Cause:** Single-origin architecture blurred security boundaries, exposed internal staff routes to public search engines and customer bundles, and allowed cross-contamination of sessions and cookies.
- **Resolution:** Implemented true application-level dual-origin separation (`apps/customer` on `:3000`, `apps/staff` on `:3100`), distinct host-only cookie isolation, mandatory staff TOTP MFA (`OPS_MFA_REQUIRED=all`), and strict RBAC permission matrices.

### 1.3 Financial & Ledger Integrity: Unverified Points Allocation
- **Symptom:** Points and refunds were vulnerable to race conditions, duplicate grants, or out-of-order ledger updates.
- **Root Cause:** Absence of strict state machine transitions between booking completion, payment verification, and points accrual.
- **Resolution:** Enforced atomic, verified-only financial transitions in SQLite. Points accrue only when staff confirms completed service and verified payment. Refunds use a two-step approval process (Finance request $\to$ Owner approval) that rolls back Petals balance cleanly without allowing negative balances.

### 1.4 Cultural & Localized Copy Quality
- **Symptom:** Mixed Egyptian colloquialisms and inconsistent brand references ("J SPA", "صالون جي سبا").
- **Root Cause:** Inconsistent copy templates and lack of Saudi Modern Standard Arabic review.
- **Resolution:** Standardized official brand name to **J Beauty** throughout all views, metadata, and communications. Audited and polished all customer-facing text into warm, respectful Saudi Modern Standard Arabic tailored to women in Al Madinah Al Munawwarah.
