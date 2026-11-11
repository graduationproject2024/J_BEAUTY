# Customer Portal Improvements (`apps/customer/`)

## 1. Zero Embedded Admin Footprint
- Deleted `admin.js`, `adminPage`, `bindAdmin`, `state.admin*`, `isStaff()`, `isOwner()`, and the footer `Staff access` link (`apps/customer/js/components.js`).
- Removed `'admin'` from `APP_ONLY_ROUTES` in `seo.mjs` and returned explicit `404` (`X-Robots-Tag: noindex, nofollow`) on `/ar/admin`, `/en/admin`, `/api/admin*`, and `/api/ops*` in `server/customer-server.mjs`.
- Updated static GitHub Pages builder (`scripts/build-gh-pages.mjs`) to source solely from `apps/customer/` and `packages/shared/`, ensuring zero staff bundles or disclosures leak to GitHub Pages (`pages/`).

## 2. 5-Step Progressive Occasions Wizard (`apps/customer/js/experiences.js`)
Replaced the former 65-checkbox single-screen matrix on `/ar/occasions` and `/en/occasions` with a calm, mobile-first **5-Step Progressive Wizard**:
1. **Occasion Style & Coordinator:** Select curated occasion style (`Bridal`, `Family`, `Gathering`, `Eid/Celebration`) and validated coordinator name + Saudi mobile (`05xxxxxxxx`).
2. **Participants (`2–5`):** Clean `+ / −` stepper and editable guest role/name cards without showing service checkboxes prematurely.
3. **Tabbed Services per Participant (`<div class="occasion-tabs">`):** Category filter pills (`All`, `Massage`, `Nails`, `Gel`) and one-guest-at-a-time service tabs displaying exact SAR pricing and minutes (at most 13 services visible per screen instead of 65). Automatically localizes placeholder guest names between Arabic (`المستفيدة 1`) and English (`Participant 1`).
4. **Date, Time & Madinah Neighborhood:** Valid upcoming Riyadh day chips, opening-hours slots, neighborhood dropdown, and coordination notes.
5. **Review & Consent:** Participant-by-participant itemized breakdown above submission consent (`terms`), keeping `.summary.occasion-summary` ordered below active mobile steps so controls appear immediately above the fold on 360px/390px screens.

## 3. Shared Design Token Foundation
Customer styles (`apps/customer/index.html`) now load `/shared/tokens.css` directly (`packages/shared/tokens.css`) alongside self-hosted SIL OFL fonts and responsive refinements, ensuring cohesive luxury typography and palette across both portals while keeping customer bundles completely privilege-free.

