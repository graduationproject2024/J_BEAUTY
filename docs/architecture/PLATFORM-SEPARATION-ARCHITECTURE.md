# J Beauty — Platform Separation Architecture

## 1. Overview
J Beauty separates the customer-facing booking platform and the internal staff Operations Portal into two distinct HTTP applications, frontend asset trees, cookie namespaces, and routing boundaries while sharing one transactional SQLite backend (`WAL` mode) inside Node 24 LTS.

| Concern | J Beauty Customer Portal | J Beauty Operations Portal |
|---|---|---|
| Frontend Directory | `apps/customer/` | `apps/staff/` |
| Shared Package | `packages/shared/` (`/shared/tokens.css`, `/shared/format.js`) | `packages/shared/` (`/shared/*`, read-only `/fonts/*`) |
| HTTP Listener & Origin | `server/customer-server.mjs` (`PORT=3000`, `https://jbeauty.sa`) | `server/ops-server.mjs` (`OPS_PORT=3100`, `https://ops.jbeauty.sa`) |
| Standalone Entry | `node server/customer-server.mjs` | `node server/ops-server.mjs` |
| Unified Local Runner | `node server.mjs` (both listeners sharing one SQLite WAL connection) | `node server.mjs` |
| Session Cookie Name | `jb_customer_session` (`__Host-jb_customer_session` in prod) | `jb_ops_session` (`__Host-jb_ops_session` in prod) |
| Cookie Attributes | Host-only (zero `Domain`), `Path=/`, `HttpOnly`, `SameSite=Strict`, `Secure` in prod | Host-only (zero `Domain`), `Path=/`, `HttpOnly`, `SameSite=Strict`, `Secure` in prod |
| DB Session Scope | `sessions.app_scope = 'customer'` | `sessions.app_scope = 'ops'` |
| Admin UI / API Routes | None (`/ar/admin`, `/en/admin`, `/api/admin*`, `/api/ops*` return `404 noindex`) | Exclusive `/api/ops/*` REST handlers (`server/staff/ops.mjs`) |
| Search Indexing | Canonical bilingual SEO & sitemap | `X-Robots-Tag: noindex, nofollow`, `Disallow: /`, `Cache-Control: no-store` |
| Static GitHub Pages Export | `scripts/build-gh-pages.mjs` (customers-only preview in `pages/`) | Never exported to GitHub Pages |

## 2. Database Continuity & Non-Destructive v2 Migration
`server/database/migrations.mjs` upgrades v1 schemas cleanly in an atomic migration step without losing existing bookings, verified customer ledger balances, reviews, or active customer sessions:
- Adds `users.{permissions_json, mfa_enabled, mfa_secret_enc, mfa_recovery_hashes, updated_at}`.
- Adds `sessions.{app_scope, last_seen_at, mfa_verified}`.
- Adds indexed relational column `bookings.assigned_staff_id` + `idx_bookings_assigned_staff` (`EXPLAIN QUERY PLAN` verified).
- Creates `refund_requests(id, booking_id, requested_by, amount_cents, reason, status, decided_by, created_at, decided_at)` for two-step financial refund governance.
- Downgrades pre-migration `employee` accounts cleanly to restricted `legacy_employee` and revokes pre-migration staff sessions so least privilege and MFA enrollment apply immediately upon upgrade.

## 3. Shared Data Boundaries
Shared SQLite write transactions (`BEGIN IMMEDIATE`) serialize safely inside `createPlatform()` (`server.mjs`). Production deployments with Nginx or Caddy (`deploy/nginx.conf.example`, `deploy/Caddyfile.example`) route separate virtual hosts (`jbeauty.sa` and `ops.jbeauty.sa`) to ports `3000` and `3100` respectively, maintaining TLS termination and edge `404` blocks.

