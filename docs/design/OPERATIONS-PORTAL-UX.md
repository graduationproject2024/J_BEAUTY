# J Beauty Operations Portal — UX & Workstation Architecture

## 1. Visual Hierarchy & Purpose
Unlike a consumer editorial marketing showcase, `apps/staff/` renders an uncluttered internal workstation using the shared **J Beauty** color and typography foundation (`packages/shared/tokens.css`):
- **Dedicated Navigation Chrome (`apps/staff/ops-app.js`):** Persistent `268px` charcoal/plum sidebar with live pending item badges (bookings, refunds, J Petals rewards, occasions) on desktop (`>= 961px`), transforming cleanly into a keyboard-accessible slide-over drawer (`Escape` + close button + backdrop click) below `961px`.
- **Top Status Bar:** Compact sticky header showing active view title, live Refresh button (`#ops-refresh-btn`), staff name and localized role badge, active MFA indicator (`MFA ✓`), outbound link to Customer Site (`customerOrigin`), and instant AR RTL / EN LTR toggle.
- **No Marketing Surface:** Zero consumer hero sections, seasonal banners, Instagram links, or booking upsells; pages are served with `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`.

## 2. Responsive Layout Strategy (`<= 767px` vs `>= 768px`)
- **Desktop (`>= 768px`):** High-density tables (`.ops-table-wrap`) displaying reference IDs, client details, scheduled date/time, assigned practitioner, payment verification badge, status pills, and inline action forms.
- **Mobile (`360px–767px`):** Switches cleanly via CSS media queries to stacked action cards (`.ops-mobile-cards`), stacking filters vertically with `min-width: 0` grid containers so zero horizontal scrolling occurs.
- **Standalone Authentication & Mandatory TOTP Gates (`views/auth.js`, `views/mfa.js`):** Centered, single-purpose card preventing sidebar or dashboard navigation from mounting before password + TOTP verification succeed.

## 3. Core Operational Modules
- **Overview (`views/overview.js`):** Real-time operational queue counters, Urgent Action Queue, and capability-gated financial & Petals analytics (strictly omitted for restricted staff roles).
- **Bookings (`views/bookings.js`):** Live query search (`q`), status dropdown filtering, practitioner assignment (`bookings.assign`) with 409 double-booking conflict alerts, rescheduling, internal team notes, and immutable payment verification.
- **Calendar (`views/calendar.js`):** Toggleable Day / 7-Day Week schedule grids and blocked-date controls (`calendar.manage`).
- **Customers (`views/customers.js`):** Masked phone table, WhatsApp sender verification workflow (`customers.verify_identity`), and cross-origin reset URL issuance targeting `CUSTOMER_ORIGIN` (`customers.recovery_token`).
- **Payments & Refunds (`views/payments.js`):** Financial reconciliation table plus two-step Refund Workflow (`refunds.request` -> Owner `refunds.approve` decision).
- **J Petals (`views/petals.js`):** Pending reward redemption commits/cancellations (`loyalty.redeem`), Owner manual balance adjustments (`loyalty.adjust`), and paginated ledger history.
- **Reviews, Occasions/Gifts, Catalog, Team/Roles, Audit Log & Settings:** Capability-gated views including Owner per-user base role assignment, custom permission overrides (`grant` / `revoke`), instant session invalidation, disable/enable controls, and MFA reset.

