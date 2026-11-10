---
name: jspa-security-regression
description: Preserves J SPA security, financial integrity, authentication, CSRF/Origin checks, role least privilege, and review/loyalty invariants across UI and API updates.
---

# J SPA Security & Financial Regression Skill

## Non-Negotiable Invariants
1. **No Paid External APIs:** Zero SMS OTP, zero paid WhatsApp Business API, zero third-party SaaS telemetry/CDN runtime dependencies. Strict CSP (`script-src 'self'`, `font-src 'self' data:`) preserved in `server.mjs`.
2. **Points & Payments (`server/loyalty.mjs`, `server/booking.mjs`):**
   - Points accrue **only** when booking is `completed` AND `payment_verified === true` AND owned by a `verified` customer account.
   - All money stored as integer halalas; partial/full refunds subtract prorated points transactionally and reject negative balances.
3. **Least Privilege (`server/admin.mjs`):**
   - `employee` accounts never view `payments`, `ledger`, `reviews`, `settings`, `staff`, `audit`, `analytics`, or full unmasked closed customer/gift sender phones.
4. **Access Control & Validation (`server.mjs`, `server/experiences.mjs`):**
   - Timing-safe CSRF validation + same-origin check on all state-changing routes.
   - `reviews`: strictly require authenticated, verified owner of completed `booking_id`; default `moderation_status: 'pending'`; editing re-queues moderation.
   - Cross-customer isolation on `nail_styles`, `passport_favorites`, `passport_prefs`, `bookings`, and `group_requests`.
5. **Regression Proof:** After every backend or UI flow modification, execute `tests/integration.mjs`, `tests/financial.mjs`, `tests/security.mjs`, `tests/browser-flow.cjs`, and `backup.mjs` snapshot integrity checks with zero failures.

