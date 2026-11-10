# J SPA — Implementation Summary (`IMPLEMENTATION.md`)

## Modular Code Organization
The monolith `server.mjs` and single-line `public/app.js` were refactored into cohesive, readable modules while preserving zero external runtime dependencies and full API/SQLite compatibility (`CONTRACT.md`):

### Backend (`server/` + `server.mjs` + `seo.mjs`)
- `server/validation.mjs`: Input validation, Saudi mobile normalization & masking (`9665XXXXXXXX` / `9665****XX`), halala money math, safe URL validation, WhatsApp deep-link builder.
- `server/auth.mjs`: Argon2id hashing + legacy scrypt backward compatibility, token/hash utilities, session cookie helper, rate limiting, employee customer projection masking.
- `server/db.mjs`: SQLite WAL initialization, additive indexes, all 13 richly described services and 4 provisional packages, plus non-destructive upgrade logic preserving owner edits on existing databases.
- `server/loyalty.mjs`: Atomic `reconcileLoyalty`, reward request creation, atomic commit/cancel processing, negative-balance rollback protection.
- `server/booking.mjs`: Asia/Riyadh scheduling & capacity conflict verification, idempotent `pending_confirmation` creation, status state machine, verified payment timestamp recording (`payment_verified_at`), cumulative refunds.
- `server/admin.mjs`: Role-based `GET /api/admin` projections (least-privilege employee scoping vs. full owner telemetry), verification approval, recovery token creation, catalog/settings/staff/review moderation handlers.
- `seo.mjs`: Per-route titles, descriptions, canonical + `hreflang` (`ar-SA`, `en-SA`, `x-default`), `HealthAndBeautyBusiness` & `Service` JSON-LD (no fabricated ratings or street addresses), and semantic SSR HTML injection for public routes.
- `server.mjs`: Security headers, strict static asset boundary, HTTP router, `createApp()`, and `--create-owner` CLI bootstrap.

### Frontend (`public/` + `public/js/`)
- `public/index.html` & `public/styles.css`: Self-hosted SIL OFL typography, responsive RTL/LTR design tokens, accessible navigation + sticky mobile booking bar.
- `public/js/state.js`: Shared client state, CSRF fetch wrapper, i18n & currency formatters.
- `public/js/components.js`: Original SVG monogram, stroke icons, header, footer, service/package cards, 8-petal floral bloom arc SVG, modal & table components.
- `public/js/pages-public.js`: Editorial Homepage, Services catalog with category counts, Service detail pages with inclusions/precautions/related rituals, Packages, Reviews, About, Contact, FAQ, Policies, Privacy, Terms, Recovery.
- `public/js/booking.js`: 4-step + WhatsApp success booking wizard with mutually exclusive Services/Packages tabs, no auto-selection on switch, quick time chips, collapsible mobile summary, and explicit manual-send WhatsApp guidance.
- `public/js/account.js`: Auth forms (`h1`), Customer dashboard, 4-step manual WhatsApp verification instructions, J Petals Club progress meter & reward requests, verified review submission & controlled edit dialog.
- `public/js/admin.js`: Role-aware dashboard with Overview, Bookings queue, 7-day Calendar & capacity conflict timeline, Customers & Verification, Owner Payments ledger, Rewards & Ledger, Services/Packages editors, Reviews moderation, Staff management, Settings/Content editor, and formatted Audit Log.
- `public/concepts.html`, `public/concepts.css`, `public/concepts.js`: Interactive 3-direction design studio showcasing Botanical Ritual, Modern Blush, and Luxury Editorial with Desktop/Mobile Hero toggle.

