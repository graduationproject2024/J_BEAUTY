# J SPA / J BEAUTY — Phase 0 Baseline Audit

- **Branch Audited:** `codex/jspa-premium-overhaul` (`413203b`) -> Working Feature Branch: `feature/j-beauty-transformation`
- **Node Runtime:** `v24.18.1` (built-in `node:sqlite`, `node:crypto` Argon2id, zero external npm runtime dependencies)
- **Skill / Tool Discovery:**
  - Installed local skills consulted: `emil-design-eng`, `animate`, `improve-animations`, `design-systems`, `frontend`, `ui-design`, `landing-page-design`, `security-hardening`, `seo`, `playwright-expert`, `code-reviewer`, `taste-and-craft`, `three-best-practices`, `threejs-core`.
  - Installed automation: `playwright` (`C:\Users\sam20\node_modules\playwright`) + Google Chrome.
  - Unavailable / excluded: `12ui` hosted generation / `@12ui/design` CLI (not installed; paid/hosted remote design services avoided), `axe-core` / `lighthouse` packages (not installed globally; DOM accessibility and asset payload measurements performed directly via Playwright + Node).

## Baseline Test Results (`413203b`)
- `node tests/integration.mjs`: 17/17 checks passed (`TEST-RESULTS.json`)
- `node tests/financial.mjs`: 8/8 checks passed
- `node tests/security.mjs`: 18/18 checks passed
- `node tests/browser-flow.cjs`: Passed (`BROWSER-FLOW-RESULTS.json`)
- `node tests/browser.cjs`: 72/72 responsive route checks passed (`BROWSER-RESULTS.json`), baseline screenshots preserved under `screenshots/baseline/`.

---

## Prioritized Issue Inventory

### P0 — Missing Core Signature Product Experiences
- **Location:** `public/js/pages-public.js`, `public/js/account.js`, `public/js/booking.js`, `server/db.mjs`, `server.mjs`
- **Reproduction:** Visit `/ar/`, `/ar/account`, or attempt to browse `/ar/atelier`, `/ar/studio`, `/ar/lookbook`, `/ar/gifts`, `/ar/group-booking`.
- **Expected Behavior:** Complete beauty destination offering Mood discovery, **J Ritual Studio** deterministic recommender, interactive **J Nail Atelier** 2D/2.5D (plus evaluated 3D/WebGL enhancement with safe fallback), **My Beauty Passport** (favorites, rebooking, saved nail styles, preferences), **Beauty Lookbook**, **Beauty Together** group requests, and **Gift a Ritual** manual workflow.
- **Actual Behavior:** None of these interactive product retention experiences exist yet; unknown paths render 404 UI with HTTP 200.
- **Root Cause:** Initial overhaul focused on visual polish and operational bug fixes rather than interactive beauty personalization and retention workflows.
- **Proposed Remediation:** Implement database migrations for customer passport data, nail styles, favorites, preferences, group/gift requests, and funnel metrics; build full bilingual RTL/LTR modules with server validation and Playwright coverage.
- **Verification Method:** API integration tests + Playwright E2E flows across all new routes at 360–1440 px.

### P1 — Booking Step 1 Still Exposes Long List & Resets Keyboard Focus on Checkbox Change
- **Location:** `public/js/booking.js` (`stepOneHtml`, `bindBooking`), `public/app.js` (`render`)
- **Reproduction:** Open `/ar/booking`, inspect Step 1 on 390px mobile, tab to a service checkbox and press Space.
- **Expected Behavior:** Step 1 presents clean Category cards (Massage, Nails, Gel, Packages + "Repeat last booking" shortcut for returning customers), Step 2 filters to that category's services, and toggling checkboxes updates summary without destroying DOM focus or scrolling.
- **Actual Behavior:** Step 1 renders all 13 services immediately, and every `onchange` triggers a full `render()` replacing `#app.innerHTML`, destroying keyboard focus.
- **Root Cause:** Full-tree `$('#app').innerHTML` replacement inside input change handlers and combined category/service step design.
- **Proposed Remediation:** Split Booking into a true 5-step mobile-first wizard (`Category -> Services -> Preferred Time -> Details -> Review`), preserve form values across steps, and update the summary/selection state incrementally without tearing down active focus.
- **Verification Method:** Playwright keyboard navigation + mobile viewport booking journey test.

### P1 — Unknown Routes Return HTTP 200 & Route Navigation Lacks Focus Restoration
- **Location:** `server.mjs` (lines 85–97), `seo.mjs`, `public/app.js`
- **Reproduction:** Request `curl -i http://127.0.0.1:3000/ar/unknown-route-xyz` or `/en/services/invalid-id`.
- **Expected Behavior:** Unknown public routes return HTTP `404` status with `noindex` metadata and an accessible Not Found state; client-side route transitions move focus to `<main>`/`<h1>` cleanly.
- **Actual Behavior:** Server returns HTTP `200 OK` with `index.html`; SPA route transitions call `window.scrollTo(0,0)` without restoring focus.
- **Root Cause:** Blanket regex match `/^\/(ar|en)(\/|$)/` returns `200` unconditionally before checking known routes or active service IDs.
- **Proposed Remediation:** Validate known SPA routes + active service IDs against `seo.mjs` and return HTTP `404` on unknown routes while still serving the localized Not Found shell; add accessible focus management on SPA transitions.
- **Verification Method:** `tests/integration.mjs` HTTP status assertions on invalid routes and invalid service IDs + Playwright keyboard navigation checks.

### P1 — Homepage Lacks Mood Discovery, J SPA Visit Sequence, Atelier Preview & Trust Fallback
- **Location:** `public/js/pages-public.js` (`home()`)
- **Reproduction:** Open `/ar/` or `/en/` on desktop and mobile.
- **Expected Behavior:** 8 cohesive editorial sections: Hero -> Choose Your Mood ("إيه نوع العناية اللي محتاجاها النهارده؟") -> Featured Rituals -> The J SPA Experience (4-step home visit) -> Nail Atelier Preview -> J Petals Club -> Genuine Beauty Stories (trust pillars when 0 reviews published) -> Final Booking CTA.
- **Actual Behavior:** Shows Hero, Benefits, 3 Category cards, Packages, 3-step booking summary, Petals, empty review box, and CTA.
- **Root Cause:** Homepage not yet expanded with the interactive beauty discovery and signature Atelier/Mood previews.
- **Proposed Remediation:** Rebuild homepage sections matching Botanical Editorial Luxury rhythm while keeping copy tight and mobile above-the-fold focused.
- **Verification Method:** Visual inspection of `360, 390, 430, 768, 1024, 1440` screenshots in AR and EN.

### P1 — Missing Centralized Motion System & Signature Floral Loyalty Animation
- **Location:** `public/styles.css`, `public/js/components.js` (`petalBloomSVG`)
- **Reproduction:** Interact with transitions, step changes, modals, and J Petals Club bloom meter.
- **Expected Behavior:** Dedicated CSS + JS motion system using GPU-friendly `transform`/`opacity` (`--ease-out`, spring/scroll reveals with `IntersectionObserver`, `prefers-reduced-motion` gating) and an original animated blooming J SPA flower tied to actual petal progress.
- **Actual Behavior:** Basic static SVG petals and simple CSS hover transitions without cohesive entrance/modal/bloom choreography.
- **Root Cause:** Motion layer not extracted or choreographed yet.
- **Proposed Remediation:** Create `public/js/motion.js` + CSS motion tokens with strict `prefers-reduced-motion` support and an interactive blooming J SPA flower SVG/Canvas piece.
- **Verification Method:** Playwright reduced-motion & interaction checks + visual inspection.

### P1 — Broad Admin DB Scans, Missing Pagination, Mobile Admin Tables & No Funnel Telemetry
- **Location:** `server/db.mjs` (`bookings()`, `getAdminPayload`), `server/admin.mjs`, `public/js/admin.js`
- **Reproduction:** Load `/ar/admin` on 390px mobile or query `/api/admin` as owner with growing datasets.
- **Expected Behavior:** Paginated booking/audit/ledger queries, responsive mobile booking/payment/audit cards replacing cramped tables below `780px`, confirmation prompts before destructive/irreversible staff/refund/reward actions, and privacy-conscious aggregate funnel metrics (distinguishing WhatsApp link clicks from confirmed bookings).
- **Actual Behavior:** `all('SELECT * FROM bookings')` loads unbounded rows in memory; mobile admin displays horizontally scrolling tables; no funnel metrics or confirmation dialogs on critical actions.
- **Root Cause:** Initial single-table iteration lacked pagination, funnel event storage, and mobile card adaptations.
- **Proposed Remediation:** Add indexed `bookings` query columns / `funnel_events` aggregate table, server-side pagination parameters (`page`, `limit`) preserving backward compatibility, responsive mobile admin cards, and confirmation modal prompts.
- **Verification Method:** Integration tests for pagination, funnel tracking, and Playwright 390px admin responsiveness.

### P2 — SEO Social Previews & Inline Style Hygiene
- **Location:** `seo.mjs`, `public/js/*`
- **Reproduction:** Inspect HTML `<head>` for Open Graph / Twitter metadata and new routes (`/atelier`, `/studio`, `/lookbook`, `/gifts`, `/group-booking`).
- **Expected Behavior:** Full localized OG tags, canonical + hreflang tags, sitemap coverage for all indexable public experiences, and minimal inline styles.
- **Actual Behavior:** `seo.mjs` lacks OG metadata and new public routes.
- **Proposed Remediation:** Expand `seo.mjs` `TITLES`, `DESCRIPTIONS`, Open Graph tags, and `sitemap.xml` URLs cleanly.
- **Verification Method:** Integration checks verifying `og:title`, `canonical`, `hreflang`, and `sitemap.xml`.
