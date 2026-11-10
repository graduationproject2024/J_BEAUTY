# J SPA — Audit & Remediation Report (`AUDIT.md`)

Branches:
- `codex/jspa-premium-overhaul` / `feature/j-beauty-transformation`: Architecture, modularity, 5-step wizard, J Nail Atelier, J Ritual Studio, Beauty Passport, security & pagination foundation.
- `fix/j-beauty-quality-recovery` (branched from `8de4ade`): **J SPA Premium Quality Recovery** — Saudi localization, `occasions` rebranding, real photography for `gel-removal.webp`, anatomical Atelier hand, botanical Peony emblem, and interactive 5-star review workflow.

## Issue Inventory & Fixes

### 1. Payment Dashboard Field Mismatch (`P0`)
- **Affected Files:** `public/app.js` (refactored into `public/js/admin.js`), `server/booking.mjs`, `server/admin.mjs`
- **Root Cause:** The legacy Payments view rendered `['booking_id','amount','payment_method','created_at']`, whereas bookings store `reference`, `paid_amount`, `refund_cents`, `payment_method`, `payment_verified`, and did not record `payment_verified_at`.
- **Implemented Fix:**
  - `server/booking.mjs` now records `payment_verified_at` at the exact moment `payment_verified` becomes `true` (never inventing timestamps for historical records lacking one).
  - `server/admin.mjs` projects structured payment rows (`reference`, `customer_name`, `service_date`, `booking_total`, `paid_amount`, `refund_amount`, `net_amount`, `payment_method`, `payment_verified`, `payment_verified_at`).
  - `public/js/admin.js` displays verified revenue separately from pending/unpaid completed bookings.
- **Evidence:** Verified in `tests/integration.mjs` (`payment_verified_at` assertion) and `tests/browser-flow.cjs` (`admin-payments-desktop.png` visually inspected).
- **Status:** Fixed & Verified.

### 2. Audit Log Field Mismatch (`P1`)
- **Affected Files:** `public/app.js` -> `public/js/admin.js`, `server/admin.mjs`
- **Root Cause:** Frontend expected `actor_id` and `details`, whereas the `audit` SQLite table supplies `actor`, `action`, `target`, `detail`, `created_at`.
- **Implemented Fix:** Aligned table keys to `['created_at','actor_name','action','target','detail']`, enriched `actor_name` safely on the server from user IDs without leaking secrets/phones, and formatted JSON details cleanly in the UI.
- **Evidence:** Verified in `tests/browser-flow.cjs` (`admin-audit-desktop.png` visually inspected).
- **Status:** Fixed & Verified.

### 3. Invalid Browser Test Route (`P1`)
- **Affected Files:** `tests/browser.cjs`
- **Root Cause:** Test visited `/ar/loyalty` instead of `/ar/petals` and only checked `document.body.innerText.length > 100`, allowing 404/fallback views to pass silently.
- **Implemented Fix:** Updated route list to `/ar/petals` (and added `/ar/services/relaxation`, `/ar/about`, `/ar/contact`, `/ar/faq`), asserted real non-empty `<h1>` headings, rejected any 404 text (`This page isn’t here` / `هذه الصفحة غير موجودة`), checked all images decoded (`naturalWidth > 0`), and verified `360, 390, 430, 768, 1024, 1440` widths.
- **Status:** Fixed.

### 4. Excessive Employee Data Access (`P1`)
- **Affected Files:** `server.mjs` -> `server/admin.mjs`, `public/js/admin.js`
- **Root Cause:** `GET /api/admin` returned full 500-row `ledger`, full `payments`, unmasked `customers.phone` list, and all historical bookings to `employee` accounts.
- **Implemented Fix:**
  - Employees now receive `payments: []`, `ledger: []`, `reviews: []`, `settings: {}`, `staff: []`, `audit: []`, `analytics: {}`.
  - Employees receive `customers` with masked phone numbers (`phone_masked` only, omitting full `phone`), requiring employees to genuinely read the WhatsApp sender number before approving verification or recovery.
  - Employees receive only operationally active/unpaid/recent bookings (masking phone numbers and stripping notes on closed `cancelled`/`no_show`/settled bookings) and `pending` reward requests only.
  - Calendar hours & capacity are exposed to employees via a minimal `schedule_config` subset without exposing business/financial settings.
- **Evidence:** Verified via expanded assertions in `tests/security.mjs`.
- **Status:** Fixed & Verified.

### 5. Booking Step 1 Tab Auto-Selection & Crowded UI (`P1`)
- **Affected Files:** `public/app.js` -> `public/js/booking.js`
- **Root Cause:** Step 1 rendered all 13 services and 4 packages simultaneously, and clicking the Packages tab silently auto-selected `catalog.packages[0]`.
- **Implemented Fix:** Separated Services and Packages into mutually exclusive tabs (`data-booktype="services"` / `"packages"`) with zero auto-selection on tab change, category pills inside Services, thumbnails, collapsible mobile summary card, and step validation.
- **Evidence:** Verified in `tests/browser-flow.cjs` (`checkedCount === 0` after clicking Packages tab) and `booking-step1-packages-mobile.png`.
- **Status:** Fixed & Verified.

### 6. Mobile Navigation Hidden Booking CTA (`P1`)
- **Affected Files:** `public/styles.css`, `public/js/components.js`, `public/index.html`, `public/app.js`
- **Root Cause:** `.header-tools .btn { display: none; }` at `<=1000px` removed the primary booking CTA on tablet and mobile viewports.
- **Implemented Fix:** Kept a crisp compact `Book` / `احجزي موعدكِ` header button visible at all widths (`360px–1440px`), added a dedicated booking CTA inside the mobile menu drawer, and added a sticky bottom mobile booking bar on browsing pages.
- **Status:** Fixed & Verified.

### 7. Repetitive Placeholder SVG Art & Generic Copy (`P1`)
- **Affected Files:** `server/db.mjs`, `public/js/*`, `public/assets/images/*`
- **Root Cause:** All 13 services reused two nearly identical inline SVG drawings and a single generic 1-sentence description; `styles.css` lacked local Arabic/English editorial fonts.
- **Implemented Fix:** Generated service-specific WebP imagery for all 13 services + hero sanctuary, added original SVG monogram/favicon, bundled self-hosted SIL OFL fonts (`IBM Plex Sans Arabic`, `Noto Naskh Arabic`, `Newsreader`, `IBM Plex Sans`), and authored distinct Arabic/English descriptions, inclusions, and precautions with non-destructive startup upgrade logic for existing databases.
- **Status:** Fixed & Verified.

### 8. Unauthenticated Account Route Missing `<h1>` & Wide Admin Tables (`P2` — discovered during overhaul QA)
- **Affected Files:** `public/js/account.js`, `public/styles.css`, `public/js/admin.js`
- **Root Cause:** `auth()` rendered `<h2>` instead of `<h1>`, sticky header covered content in full-page mobile captures, and 10-column admin tables / unbroken JSON clipped on desktop panes.
- **Implemented Fix:** Promoted `auth()` heading to `<h1>`, changed `.header-shell` to relative flow alongside the mobile bottom bar, formatted ISO timestamps & audit details cleanly, and tightened `.admin-grid` table cells.
- **Status:** Fixed & Verified.

### 9. Unknown Subroutes Returning HTTP 200 & Missing Open Graph Tags (`P1` — `feature/j-beauty-transformation`)
- **Affected Files:** `seo.mjs`, `server.mjs`
- **Root Cause:** SPA shell catch-all served HTTP `200` on invalid `/ar/...` and `/en/...` paths instead of `404` with `noindex`, and HTML lacked `og:*` / Twitter preview metadata.
- **Implemented Fix:** Added `isKnownAppRoute(pathname, services)` in `seo.mjs`, returned HTTP `404` with `noindex,nofollow` HTML on unknown routes, and emitted Open Graph + Twitter metadata per route.
- **Evidence:** Verified in `tests/integration.mjs` and `tests/browser.cjs` (`/ar/unknown-route-404` -> HTTP 404 + `noindex`).
- **Status:** Fixed & Verified.

### 10. Checkbox / Radio Focus Loss & 5-Step Booking Navigation (`P1`)
- **Affected Files:** `public/js/booking.js`, `public/styles.css`
- **Root Cause:** Re-rendering the full form tree on every checkbox toggle dropped DOM keyboard/screen-reader focus and required dense horizontal scrolling on mobile.
- **Implemented Fix:** Upgraded to a true 5-step mobile-first wizard (`Category` -> `Ritual` -> `Time` -> `Details` -> `Review`) with returning-customer `"كرري آخر حجز"` shortcut, working-day/blocked-date chips, and incremental summary updates (`updateSelectionSummaryDOM()`) that preserve exact DOM focus on checked inputs.
- **Evidence:** Verified in `tests/browser-flow.cjs` (`document.activeElement` stays on toggled checkbox) and mobile captures.
- **Status:** Fixed & Verified.

### 11. Admin Table Overflow, Irreversible Actions & Group/Gift Workflow (`P1`)
- **Affected Files:** `public/js/components.js`, `public/js/admin.js`, `server/admin.mjs`, `server/experiences.mjs`, `public/styles.css`
- **Root Cause:** Wide payments/ledger/audit tables truncated on narrow viewports, owner refunds/staff disables submitted without explicit confirmation, and group/gift requests lacked pagination/management UI.
- **Implemented Fix:** Added automatic `.mobile-cards-list` rendering replacing `.desktop-table-wrap` below `780px`, `confirmActionDialog` before owner refunds, staff revocations, and reward commits, paginated `/api/admin` queries (`bookings_page`, `audit_page`, `ledger_page`), **Group & Gifts** tab, and privacy-safe aggregate **Digital Funnel Metrics** in Owner Overview.
- **Status:** Fixed & Verified.

### 12. Visual Overlap Discovered & Fixed During Screenshot Inspection (`P2`)
- **Affected Files:** `public/styles.css`, `public/js/admin.js`, `public/js/atelier.js`
- **Root Cause:** Heart favorite toggle (`.fav-btn`) overlapped `.service-badge` on the top-start thumbnail edge; fixed `#toast` (`top: 20px`) overlapped the top-right header CTA; Gift Voucher rows in Admin rendered `gf.value` (`0 SAR`) instead of `gf.estimated_amount`; `.split` and `.content.card` sat too close to the footer on mobile/Studio views.
- **Implemented Fix:** Anchored `.fav-btn` to `inset-inline-end: 12px`, repositioned `#toast` to bottom-end (`bottom: 24px`, `82px` with sticky mobile bar), displayed `gf.estimated_amount ?? gf.value ?? gf.chosen?.price`, added `padding-bottom` / `margin-bottom` spacing, and refined Atelier accent Arabic label (`زهرة ناعمة`).
- **Status:** Fixed & Re-Verified Visually.

### 13. Premium Quality Recovery (`P0` / `P1` — `fix/j-beauty-quality-recovery`)
- **Affected Files:** `public/js/pages-public.js`, `public/js/atelier.js`, `public/js/motion.js`, `public/js/components.js`, `public/js/experiences.js`, `public/js/booking.js`, `public/js/account.js`, `public/js/admin.js`, `public/js/state.js`, `public/app.js`, `public/styles.css`, `server.mjs`, `server/experiences.mjs`, `server/booking.mjs`, `server/admin.mjs`, `seo.mjs`, `public/assets/images/services/gel-removal.webp`
- **Root Causes Addressed:**
  1. Egyptian colloquial Arabic (`عايزة`, `النهارده`, `إيه`, `أدلع`, `بجهز`, `جربي`) across UI & WhatsApp templates.
  2. Inappropriate `حجز جماعي` / `Beauty Together` labeling & unaligned route naming.
  3. Cartoonish vector SVG placeholder on `gel-removal.webp`.
  4. Blocky rectangular finger illustration in **J Nail Atelier** & generic radial oval flower in **J Petals Club**.
  5. Un-discoverable review submission flow missing interactive 5-star selection and explicit moderation status feedback; stale `state.admin` caching across admin tabs; review cards fading slowly with Arabic fallback names on EN pages; `#toast` contrast edge against dark footer.
- **Implemented Fixes:** Complete Saudi MSA overhaul (`docs/localization/SAUDI-AR-COPY-AUDIT.md`), canonical **Occasion Experiences (`تنسيق جلسات المناسبات`)** at `/occasions` with `301` redirect from `/group-booking`, Wikimedia `CC BY 2.0` real photography for `gel-removal.webp` (`28.5 KB`), continuous dorsum anatomical Atelier hand (+ `Oval` shape & sticky mobile preview), asymmetric botanical Damascus Peony emblem, interactive `"قيّمي تجربتكِ معنا"` 5-star `radiogroup` workflow with `pending / approved / needs_edit` moderation & admin live tab reload, compact `01–04` Home Visit Timeline without unverified claims, and sticky Ritual Studio visual layout.
- **Status:** Fixed & Verified Across Test Suites & Visual Screenshots.

