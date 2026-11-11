# J Beauty — RBAC, MFA & Cross-Origin Security Model

## 1. Cross-Origin Authentication & Cookie Isolation
- Customer cookies (`jb_customer_session`) and Operations cookies (`jb_ops_session`) use distinct names and never set a `Domain` attribute, preventing sibling-port or subdomain leakage.
- Backend session lookup filters explicitly by `app_scope='customer'` vs `app_scope='ops'`. Replaying a valid cookie from one origin to the other fails (`401`).
- `/api/login` on Customer rejects staff roles (`403`). `/api/ops/login` on Operations rejects customer roles (`403`).
- Mutation Origin allowlists validate Customer writes against Customer origins (`CUSTOMER_ORIGIN` / `PUBLIC_ORIGIN`) and Operations writes solely against `OPS_ORIGIN` (`403` otherwise).

## 2. Mandatory TOTP MFA (`server/auth/mfa.mjs`)
- `OPS_MFA_REQUIRED=all` in `NODE_ENV=production` (`'optional'` in unconfigured local dev; `'off'` available solely for isolated automated functional tests).
- Unenrolled staff logging in under `OPS_MFA_REQUIRED=all` enter an enrollment-only state (`sessions.mfa_verified=0`). All `/api/ops/*` business routes return `403 MFA verification required` until `/api/ops/mfa/setup` + `/api/ops/mfa/verify` complete.
- RFC 6238 6-digit TOTP verification accepts `+/- 1` 30-second window steps; 8 single-use 8-hex recovery codes are SHA-256 hashed at rest.
- TOTP Base32 secrets are encrypted with AES-256-GCM (`OPS_MFA_SECRET_KEY`) before SQLite storage (`users.mfa_secret_enc`); plaintext secrets never touch disk in SQLite.
- Enrolled staff cannot call `/api/ops/mfa/setup` without an active MFA-verified session (`403`), blocking password-only MFA hijacking.

## 3. Capability Matrix (`server/authorization/permissions.mjs`)
Every Operations route and field checks explicit capabilities via default-deny (`requireCapability` / `hasCapability`):

| Role | Granted Capabilities | Explicitly Denied |
|---|---|---|
| `owner` | `*` (Full operational + sovereign platform governance) | — |
| `ops_manager` | `bookings.read/confirm/assign/update`, `calendar.*`, `customers.read_limited/verify_identity/recovery_token`, `occasions.*`, `reviews.moderate`, `reports.operational` | Payments verification, refunds, loyalty redeem/adjust, services, packages, settings, staff, audit |
| `reception` | `bookings.read/confirm/update`, `calendar.read`, `customers.read_limited/verify_identity/recovery_token`, `occasions.*` | Practitioner assignment, payment verification, refunds, loyalty, moderation, settings, staff |
| `finance` | `bookings.read`, `payments.read/verify`, `gifts.verify_payment`, `refunds.request`, `loyalty.read/redeem`, `reports.financial` | `refunds.approve` (Owner only), `loyalty.adjust`, identity verify, recovery links, moderation, settings, staff |
| `practitioner` | `bookings.read_assigned` (`idx_bookings_assigned_staff`), `bookings.update_assigned_status` (`in_progress`/`completed`), `calendar.read_assigned` | Viewing unassigned/other staff bookings, totals/payments, rescheduling, settings, staff |
| `legacy_employee` | Minimal migration baseline: `bookings.read/confirm/update_status_basic`, `calendar.read`, `customers.read_limited`, `occasions.read` | Identity verification, recovery links, payment verification, refunds, loyalty redeem/adjust, moderation, settings, staff |

## 4. Session Revocation & Two-Step Refunds
- Modifying any staff role, capability override (`grant`/`revoke`), resetting MFA, or disabling an account (`disabled_employee`) executes atomically in `db.tx()` and deletes all active sessions for that user immediately.
- Refunds follow a two-step segregation of duties (`finance` submits `POST /api/ops/refunds/request` with justification -> `owner` decides `POST /api/ops/refunds/:id/decide`), reconciling cumulative `refund_cents` and proportional Petals ledger deductions atomically inside `BEGIN IMMEDIATE`.

