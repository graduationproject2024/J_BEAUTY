# J SPA — Security Architecture & Review (`SECURITY.md`)

## 1. Threat Model & Key Controls
J SPA collects names, Saudi mobile numbers, Madinah neighborhoods, optional appointment notes, and staff-recorded payment statuses for women-only home visits. No card numbers are stored or processed by the application.

### Authentication & Password Storage
- **Password Hashing:** `server/auth.mjs` uses Node 24’s native **Argon2id** (`crypto.argon2Sync('argon2id', { memory: 65536, passes: 3, parallelism: 1, tagLength: 32 })`) with 16-byte random nonces for all new passwords (`register`, `staff`, `reset`, `--create-owner`). Legacy `salt:scryptHex` hashes remain verifiable for seamless backward compatibility.
- **Session Management:** Opaque 256-bit session cookies (`jspa_session`), stored SHA-256 hashed in SQLite (`sessions`), rotated on every login/register (`rotateAuthSession`), flagged `HttpOnly; SameSite=Strict` (plus `Secure` when `NODE_ENV=production`).
- **CSRF & Origin Protection:** Every mutating `/api/*` request validates `Origin` against host / `PUBLIC_ORIGIN`, blocks `Sec-Fetch-Site: cross-site`, enforces `Content-Type: application/json`, caps request body size at 50 KB, and checks `X-CSRF-Token` against the session secret.
- **Rate Limiting:** Database-persisted sliding windows (`rate_limits`) throttle `/api/register`, `/api/login` (by IP and by phone), `/api/verification/request`, `/api/reset`, `/api/bookings`, and `/api/admin/recovery`.

### Authorization & Least Privilege
- **Customer Isolation (IDOR Prevention):** Customers only access bookings, ledger entries, reward requests, and reviews tied directly to `session.user_id === user.id`. Historical guest bookings are **never** auto-merged by matching phone numbers.
- **Employee vs. Owner RBAC (`server/admin.mjs`):**
  - `owner` has full access to catalog, packages, settings, staff, reviews, payments, ledger, analytics, and audit logs.
  - `employee` is strictly restricted to operational duties (`bookings` active/unpaid/recent scope with masked phones/omitted notes on closed bookings, masked `customers.phone_masked`, pending `verifications`, pending `reward_requests`, and read-only catalog/schedule config). Employees receive empty `payments`, `ledger`, `reviews`, `settings`, `staff`, `audit`, and `analytics`, and receive `403 Forbidden` on any owner-only mutation or refund attempt.
  - Disabling an employee immediately deletes all of their active SQLite sessions.

### Manual Phone Ownership & Recovery Integrity
- Typing a mobile number never grants verification (`verified = 0`).
- Verification creates a 30-minute one-time reference (`verification`), hashed via SHA-256. Staff must check the `checked: true` confirmation and supply the actual WhatsApp sender number (`observed_phone`) matching `users.phone` before verification succeeds.
- Staff-assisted recovery creates a 15-minute single-use token (`recovery`), hashed via SHA-256, and invalidates all active sessions upon reset. Reclaiming an unverified phone detaches previous unverified self-created records (`user_id = NULL`) before issuing recovery.

### Financial & Loyalty Integrity
- All currency arithmetic runs server-side in integer halalas (`money()`).
- Points are reconciled atomically inside `BEGIN IMMEDIATE` SQLite transactions (`reconcileLoyalty`) strictly when `status === 'completed'`, `payment_verified === true`, and `user.verified === true`.
- Verified payments are immutable (changes require owner cumulative refunds with a mandatory written reason); refunds that would drive a balance negative abort (`409 Conflict`) and roll back atomically until the related reward is reversed.
- Reward commits and cancellations execute atomically with unique event keys (`reward:<id>`, `reward-cancel:<id>`).

### Static Serving & Headers
- Security headers applied to every response: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Content-Security-Policy` (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none'`), and `Strict-Transport-Security` in production.
- Static handler rejects dotfiles/traversal (`..`), serves strictly within `public/`, and returns `404` for missing asset extensions instead of falling back to `index.html`.
- SQLite files, backups, and `server/` modules reside outside `public/` and cannot be downloaded via HTTP.

### Pre-Launch Security & Privacy Reminder
Local automated security tests verify the controls above against synthetic test databases, but do **not** constitute production certification or formal legal PDPL sign-off. Before public launch, configure `PUBLIC_ORIGIN`, HTTPS reverse proxy TLS, off-host encrypted backups, and formal Saudi PDPL legal review (see `OPERATIONS.md` and `LAUNCH-CHECKLIST.md`).

