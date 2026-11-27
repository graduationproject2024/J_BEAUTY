# J Beauty — Security Architecture & Platform Separation (`SECURITY.md`)

## 1. Dual-Origin Platform Separation
J Beauty physically and logically separates customer-facing browsing/booking (`apps/customer` on port `3000` / proposed `https://jbeauty.sa`) from internal operations and administration (`apps/staff` on port `3100` / proposed `https://ops.jbeauty.sa`):
- **Bundle & Route Isolation:** Zero staff modules, admin routes (`/ar/admin`, `/en/admin`, `/api/admin*`), or footer navigation links exist in `apps/customer/` or the GitHub Pages showcase export (`pages/`, `index.html`). Visiting retired `/admin` paths on Customer returns `404` with `X-Robots-Tag: noindex, nofollow`.
- **Standalone Operations Shell:** The Operations Portal sets `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and disallows indexing in `/robots.txt` (`Disallow: /`).
- **Scoped Host-Only Session Cookies (`server/auth.mjs`):**
  - Customer origin uses `jb_customer_session` (`__Host-jb_customer_session` in `NODE_ENV=production`).
  - Operations origin uses `jb_ops_session` (`__Host-jb_ops_session` in `NODE_ENV=production`).
  - Both omit the `Domain` attribute strictly, bind `Path=/; HttpOnly; SameSite=Strict`, and map to `sessions.app_scope` (`'customer'` vs `'ops'`). Cross-origin cookie replay returns `401`.
- **Cross-Role Login Prevention & Origin Allowlists:**
  - Customer `/api/login` rejects staff roles (`403`). Operations `/api/ops/login` rejects customers (`403`).
  - Customer mutations accept only Customer origins (`expectedOrigin`, `CUSTOMER_ORIGIN`, `PUBLIC_ORIGIN`). Operations mutations accept only Operations origins (`expectedOrigin`, `OPS_ORIGIN`).

## 2. Mandatory Staff TOTP MFA & Encryption at Rest (`server/auth/mfa.mjs`)
- **Production Default (`OPS_MFA_REQUIRED=all`):** Every staff member (`owner`, `ops_manager`, `reception`, `finance`, `practitioner`, `legacy_employee`) enters an enrollment-only / challenge-only barrier on login until TOTP verification succeeds (`sessions.mfa_verified = 1`). All operational endpoints (`/api/ops/*`) return `403 MFA verification required` prior to completion.
- **RFC 6238 TOTP & Recovery Codes:** Enrollment generates 160-bit Base32 secrets and 8 single-use hashed recovery codes (`sha256`). Already-enrolled accounts cannot overwrite MFA via `/api/ops/mfa/setup` without passing an active MFA challenge (`403`).
- **AES-256-GCM Secret Encryption:** MFA secrets are never persisted in plaintext SQLite; `users.mfa_secret_enc` stores authenticated ciphertext encrypted via `OPS_MFA_SECRET_KEY` (32-byte base64/hex key, or auto-generated local dev key file outside the static root).
- **Idle Timeout:** Operations sessions enforce automatic idle expiry (`OPS_IDLE_MINUTES`, default `60`).

## 3. Fine-Grained Capability RBAC & Least-Privilege Migration (`server/authorization/permissions.mjs`)
- **Default-Deny Enforcement:** Every route and booking field checks explicit capabilities (`requireCapability` / `hasCapability`) rather than relying on UI visibility.
- **Staff Roles:**
  - `owner`: full platform governance, owner-only sovereign actions (`refunds.approve`, `loyalty.adjust`, `services.manage`, `packages.manage`, `settings.manage`, `staff.manage`, `audit.read`).
  - `ops_manager`: booking dispatch, practitioner assignment (`bookings.assign`), practitioner conflict checks (`validatePractitionerConflict`), calendar management, identity verification, recovery links, occasions & review moderation. Blocked from payment verification, refunds, settings, staff, and financial analytics.
  - `reception`: active booking lifecycle, identity verification, recovery links, occasion management.
  - `finance`: payment verification (`payments.verify`), gift payment verification (`gifts.verify_payment`), reward commits/cancellations (`loyalty.redeem`), financial reporting, and step-1 refund requests (`refunds.request`)—blocked from self-approving refunds (`refunds.approve` -> `403`) and identity/staff/catalog mutations.
  - `practitioner`: queries strictly via indexed `bookings.assigned_staff_id`, sees only own active bookings, and can update status (`in_progress` / `completed`) without accessing financial totals, unmasked closed client contacts, or other staff schedules.
  - `legacy_employee`: migration safety profile applied automatically to existing v1 `employee` rows (`server/database/migrations.mjs`) with strictly read/basic confirmation scope only—zero identity verify, password recovery, payment verify, refunds, loyalty adjustments, or moderation until explicitly upgraded by Owner.
- **Instant Session Invalidation:** Updating any staff member's role/capabilities, resetting MFA, disabling an account (`disabled_employee`), or running v2 migration invalidates active non-customer sessions immediately while preserving customer sessions intact.

## 4. Financial, Loyalty & Verification Integrity
- Passwords hashed with **Argon2id** (`64 MiB`, `t=3`, legacy `scrypt` verification kept for compatibility).
- Phone ownership verification (`observed_phone` + 30-min one-time reference) and 15-min recovery tokens (generating `customerOrigin/ar/reset#...` URLs) never link historical bookings by phone alone.
- Currency arithmetic runs server-side in integer halalas; verified payments are immutable (`400` on overwrite); loyalty credits reconcile atomically in `BEGIN IMMEDIATE` transactions only when `status === 'completed'`, `payment_verified === true`, and `user.verified === true`.
- Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, strict `Content-Security-Policy`, `HSTS` in production) apply on every listener. Local automated tests prove controls against synthetic/ephemeral SQLite DBs; production deployment also requires HTTPS proxy TLS, off-host encrypted SQLite backups, and qualified Saudi PDPL legal review (`OPERATIONS.md`).
