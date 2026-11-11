# J Beauty — Verification Evidence Summary (`feat/platform-separation-ops-portal`)

All verification suites executed cleanly against the separated **J Beauty** Customer Platform (`127.0.0.1:3000`, `apps/customer`) and standalone **J Beauty Operations Portal** (`127.0.0.1:3100`, `apps/staff`) on Node.js v24.18.1 + `node:sqlite`.

## 1. Automated Verification Suites

| Suite | Command | Verified Result |
|---|---|---|
| Branding & Bundle Isolation | `node tests/brand-visibility.mjs` | `PASS` — zero `J SPA` copy, zero `admin.js`/`admin` routes/footer links in `apps/customer` and `pages/` |
| Schema Migration & Rollback | `node tests/migration.mjs` | `PASS` — v1 -> v2 upgrade downgrades `employee` -> `legacy_employee`, revokes stale staff sessions, preserves customer sessions/bookings/ledger balances, `EXPLAIN QUERY PLAN` confirms `idx_bookings_assigned_staff`, idempotent re-run & rollback pass |
| Financial & Ledger Integrity | `node tests/financial.mjs` | `PASS` (9 checks) — completion-only earning, verified payment immutability, two-step refund (`finance` request -> `owner` approval), proportional point reversal, atomic rollback on negative balance, recovery reset |
| Dual-Origin Integration | `node tests/integration.mjs` | `PASS` (22 checks) — seed catalog, idempotent guest booking, phone ownership check, capacity conflict prevention, SSR headings, `404` on `/ar/admin`, `301` legacy redirect, Ritual Studio, Nail Atelier, Occasions, Gifts & Telemetry |
| Responsive Dual-Origin Matrix | `node tests/browser.cjs` | `PASS` (114 checks across 360, 390, 430, 768, 1024, 1440px AR & EN Customer + Ops Login; 0 JS errors, 0 failed assets, 0 overflow, `404` `/ar/admin` & `/en/admin`) |
| Platform Separation, MFA & RBAC | `node tests/security.mjs` | `PASS` (10 checks) — host-only cookies (`jb_customer_session` vs `jb_ops_session`) without `Domain`, `noindex`/`no-store` on Ops, `OPS_MFA_REQUIRED=all` enforcement + encrypted TOTP + single-use recovery codes, 403 cross-origin login rejections, `legacy_employee`, `reception`, `finance`, `ops_manager`, `practitioner` capability isolation, `409` practitioner conflict, immediate session revocation |
| E2E Chromium Dual-Origin Flow | `node tests/browser-flow.cjs` | `PASS` (8 workflows) — Guest & Customer 5-step bookings, Reviews guards, 5-step Occasions Wizard (`<=13` service boxes in tabbed UI), Owner TOTP MFA enrollment in Chromium, Practitioner creation & assignment, cash verification, moderation, Petals cancellation, 390px Ops mobile drawer & cards |
| Accessibility & Performance Audit | `$env:AUDIT_PHASE='after'; node tests/audit-a11y-perf.cjs` | `PASS` — `0` WCAG 2.1 AA violations across all 18 Customer routes (`0`) and 6 Operations views (`0`), max CLS `0.0007`, max LCP `368 ms`, 28 Customer screenshots + 9 Operations screenshots |
| Database Online Snapshot | `node backup.mjs <tmp>/snap.sqlite` | `PASS` — Verified online WAL backup snapshot created (`exit 0`) |
| Static GitHub Pages Build | `node scripts/build-gh-pages.mjs --base=/J_BEAUTY` | `PASS` — Built clean customer-only `index.html`, `404.html`, `.nojekyll`, `pages/` |
