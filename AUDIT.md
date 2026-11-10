# J SPA — Audit & Remediation Report (`AUDIT.md`)

Branch: `codex/jspa-premium-overhaul` (branched from `main` at `6e20931`)

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

