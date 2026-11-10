# J SPA — Visual & Engineering Quality Recovery: Design Decisions

**Branch:** `recover/j-spa-complete-quality`  
**Base Reference Commit:** `6e9b29a`  
**Approved Visual Direction:** Botanical Editorial Luxury  
**Independent Visual Audit Verdict:** `PASS` (`DEF-01` through `DEF-10`)

---

## 1. J Nail Atelier — Photographic 2.5D Studio Compositor (`DEF-01`)

### Problem Replaced
Prior SVG hand illustrations rendered synthetic, flat geometry that failed visual inspection, while bundling heavy Three.js/WebGL frameworks violated zero-runtime-dependency constraints (`CONTRACT.md`) and inflated mobile payloads under strict CSP (`script-src 'self'`).

### Architecture & Implementation (`public/js/atelier.js`, `public/styles.css`)
- **Compositor Canvas:** Replaced inline SVG hand markup with a `720×720` HTML5 `<canvas class="atelier-hand-canvas atelier-hand-svg">` rendered directly over the cleaned studio photographic hand plate (`/assets/images/atelier-hand-base.webp`).
- **Cached Skin Undertone Buffers:** Pre-computed smooth skin-tone adaptation (`fair`, `warm`, `olive`, `deep`) extending cleanly past the wrist bracelet without knuckle speckling or cutoff boundaries.
- **Nail Geometry & Finish Matrix:**
  - **5 Shapes:** `almond`, `oval`, `squoval`, `square`, `coffin` (C2 smooth tapers and parabolic French smile curves, calibrated lateral sidewalls across all five fingers including tight pinky depth-of-field blending).
  - **3 Lengths:** Short, medium, long.
  - **10 Base Shades, 5 French/Ombré Modes, 5 Tip Shades.**
  - **Split Steps 5 & 6:** Dedicated Step 5 Finish (`gloss`, `pearl`, `matte` with pointer-reactive `lightX` specular highlight ribbon) and Step 6 Botanical Detail (`plain`, `gold_foil` two-tone jagged shards, `pearl_dot`, `floral_dot`).
- **RTL Controls Polish:** Aligned `.atelier-cta-row` cleanly to RTL start alongside compact mobile canvas scaling.

---

## 2. J Petals Loyalty — Redouté Archival Cameo System (`DEF-02`)

### Problem Replaced
Generic geometric SVG flowers with dark rectangular backgrounds conflicted with the Botanical Editorial Luxury identity and lacked visual depth across Dark Plum and Ivory panels.

### Architecture & Implementation (`public/js/components.js`, `public/js/motion.js`, `public/js/pages-public.js`, `public/js/account.js`, `public/styles.css`)
- **Botanical Plates (`public/assets/images/botanical/`):** Sourced CC0 open-access Pierre-Joseph Redouté plates from the Cleveland Museum of Art (`rose-bloom.webp`, Acc. `1943.138`, `#EFE4D1` tone; `rose-damascena.webp`, Acc. `1965.291`, `#F1EFE9` tone) and processed smooth elliptical vignetting so foliage floats seam-free with generous oval breathing margins.
- **Dual-Theme Archival Framing:** Rendered via `petalBloomSVG(..., lightMode)` inside `.petal-cameo` double-hairline archival ovals on both Dark Plum homepage cards (`.loyalty-band`) and Ivory gallery cards (`.loyalty-gallery-card`), pairing vertical RTL typography with separate italic *Rosa damascena* botanical captions.
- **Clear Milestone Scale:** Paired cameo previews with an explicit `0 · 200 · 500` `.petal-progress-*` bar featuring an annotated `40%` milestone tick (`200` petals = `10 ر.س`) and `500` petals (`30 ر.س`).
- **Contrast Hardening:** Lightened `.loyalty-band .eyebrow` to `#EED8B8` over the `#503C45` plum backdrop for WCAG AA contrast compliance.

---

## 3. Service Photography Coherence (`DEF-03`)

### Problem Replaced
`gel-removal.webp` displayed an unrelated handheld skincare toner bottle with visible barcode labels, and `colored-french.webp` suffered from mirror obstruction—breaking editorial harmony across service grids.

### Implementation (`public/assets/images/services/`, `docs/audits/IMAGE-QUALITY-AUDIT.md`)
- Replaced both assets with bespoke sunlit travertine still-life photography matching sibling cards, converted to `720×720` WebP:
  - `gel-removal.webp` (`97.2 KB`): Ceramic soak bowl, organic cotton pads, unbranded rose-gold soak packets, amber glass dropper, birch cuticle stick, and tea rose on travertine.
  - `colored-french.webp` (`61.5 KB`): Five anatomical fingers displaying sage/blush micro-French tips resting on oatmeal linen alongside a frosted polish bottle.
- Switched service card thumbnails in `serviceArt` (`public/js/components.js`) to `loading="eager" decoding="async"` for immediate above- and below-fold decode stability (`cls <= 0.0004`).

---

## 4. Scroll Visibility, Accessibility, RTL Layout & Mobile Polish (`DEF-04`–`DEF-10`)

- **Scroll Reveal Reliability (`DEF-04`, `DEF-05`):** Removed the `opacity: 0` initial hidden state trap on `[data-reveal]` in `public/styles.css` and updated `initScrollReveals()` in `public/js/motion.js` to mark elements `.is-revealed` immediately, restoring 100% visibility across lower homepage bands and all 13 catalog service cards.
- **ARIA Compliance (`DEF-07` ARIA Defect):** Changed `/services` filter group from `role="tablist"` (which lacked `role="tab"` children and triggered a critical `aria-required-children` failure in `audit-before.json`) to `role="group"` with stateful `aria-pressed` (`public/js/pages-public.js`).
- **Occasion Experiences (`DEF-06`):** Rebuilt `/occasions` (`groupBookingPage` in `public/js/experiences.js`) into a balanced 2-column `.occasion-layout.booking-layout` with sticky summary sidebar, tactile `[data-guest-svc]` checkbox pills replacing native `<select multiple size="4">` boxes, and an editable Riyadh tomorrow default date (`riyadhToday() + 1d`) eliminating garbled empty date mask placeholders in Chromium RTL.
- **Account Passport Split (`DEF-07`):** Paired login/account auth in `public/js/account.js` inside `.auth-shell` with an editorial Passport benefits panel (`.auth-aside`), eliminating the isolated white form island.
- **Ritual Studio (`DEF-08`):** Replaced native `<select>` controls with tactile `[data-studio-opt]` choice pills and immediate auto-populated recommendations on mount (`public/js/experiences.js`).
- **Mobile Booking & Header (`DEF-09`, `DEF-10`):** Restructured Step 1–5 mobile indicators into a single horizontal 5-column RTL stepper (`.progress.five` with `<b>num</b><em>label</em>`), centered Step 1 CTA with `.form-actions.single-action` (`public/js/booking.js`), flattened nested `.mood-result` styling, tuned `@media (max-width: 420px)` header spacing for zero overflow down to `360px` while retaining `44px` tap height, and eliminated all sub-`13px` typography (`sub13pxCount: 0` across all 18 audited routes).
- **Unified Numerals & Header Lockup (`public/js/state.js`, `public/js/components.js`, `public/js/admin.js`):** Standardized numeric rendering via `num(v)` (`ar-SA-u-nu-latn` / `en-US`) and unified header/footer brand lockups with `currentColor` dark-mode monogram strokes.

