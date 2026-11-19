# J BEAUTY — PRESERVATION BASELINE INVENTORY

**Document Version:** 1.0.0  
**Date:** 2026-11-19  
**Target Branch:** `feat/platform-refinement-and-scheduling`  
**Platform:** J BEAUTY (Women's At-Home Spa & Beauty Services in Al Madinah Al Munawwarah)

---

## 1. Executive Summary & Non-Negotiable Preservation Directives

This inventory documents every working feature, API route, user journey, visual asset, and operational workflow currently active across the J BEAUTY platform. In accordance with the project directives:

1. **Brand & Visual Identity:** The recognized quiet luxury aesthetic (calm ivory `#FBF7F4`, linen cream `#F4EBE6`, deep plum `#503C45`, sage moss `#A7B79F`, dusty pink `#D9B7C0`, brushed rose-gold `#D4AF7C`) and typography (IBM Plex Sans Arabic + Newsreader serif accents) must be strictly preserved.
2. **Zero Paid Runtime Services:** No payment gateways (Moyasar, Stripe, Tap), no paid SMS/OTP services, no paid WhatsApp Business APIs, and no paid mapping APIs. All features run on self-hosted Node.js + SQLite.
3. **Core Functionality Preservation:** Existing customer account flows, booking wizard, Beauty Passport, Nail Atelier, Ritual Studio, J Petals loyalty, Occasion Experiences, reviews, staff RBAC, and Ops Portal must remain functional with zero regressions.

---

## 2. Feature & Route Preservation Inventory

| ID | Route / Feature | Component / File | Current Behavior | Expected Behavior | Tests Guarding Feature | Regression Risks |
|---|---|---|---|---|---|---|
| **FEAT-01** | `/ar/` & `/en/` (Homepage) | `apps/customer/js/pages-public.js`, `apps/customer/index.html` | Renders hero, signature services, experience teaser, petals club teaser, reviews | High-end botanical editorial hero with clear navigation and fast service discovery | `tests/integration.mjs`, `tests/brand-visibility.mjs` | Layout shift, broken hero typography, missing brand logo |
| **FEAT-02** | `/ar/services` & `/ar/packages` | `apps/customer/js/pages-public.js` | Displays 17 individual services and 4 luxury packages with category tabs | Crisp service cards with duration, price, Arabic descriptions, and direct booking CTA | `tests/integration.mjs` | Category filtering breaking, missing duration chips |
| **FEAT-03** | `/ar/booking` (Booking Wizard) | `apps/customer/js/booking.js`, `server/booking.mjs` | Multi-step booking wizard with service selection, date/time, customer details, bank transfer, and receipt upload | Streamlined single-flow experience with real availability based on duration and travel buffer | `tests/integration.mjs`, `tests/simulate-100-customers.mjs` | Concurrent double bookings, capacity overflow, lost form state |
| **FEAT-04** | `/ar/atelier` (Nail Atelier 3D) | `apps/customer/js/atelier.js`, `apps/customer/js/atelier/*` | Interactive 3D WebGL hand & nail simulator with shape, length, shade, French style, and finishes | Anatomically realistic feminine hand, flush cuticles, studio PBR materials, mobile touch orbit | `tests/atelier-v2.mjs` | WebGL context loss, mesh clipping, mobile scroll hijacking |
| **FEAT-05** | `/ar/studio` (Ritual Studio) | `apps/customer/js/pages-public.js`, `server/customer-server.mjs` | Mood and need-based interactive quiz that recommends tailored spa rituals | Deterministic catalog-backed recommendations matching customer skin/mood needs | `tests/integration.mjs` | Incoherent recommendations, unhandled quiz state |
| **FEAT-06** | `/ar/passport` & `/ar/account` | `apps/customer/js/account.js`, `server/customer-server.mjs` | Customer profile, bookings history, saved nail designs, Beauty Passport preferences | Frictionless login/registration (8-char min password), 50 welcome petals, real-time booking status | `tests/integration.mjs`, `tests/security.mjs` | Cross-customer data leakage (IDOR), broken session persistence |
| **FEAT-07** | `/ar/gifts` (Luxury Gift Cards) | `apps/customer/js/experiences.js`, `server/experiences.mjs` | Gift card creator with bespoke service packages and custom amounts, bank transfer instructions, and receipt upload | Strict payment gate: card unredeemable until Ops verifies payment; luxury PNG download without price or Madinah text | `tests/integration.mjs`, `tests/stress-test-extreme.mjs` | Unpaid gift code guessing, double redemption race attack |
| **FEAT-08** | `/ar/occasions` (Occasions) | `apps/customer/js/experiences.js`, `server/experiences.mjs` | Group and bridal pampering planner for 2 to 5 recipients with service configuration | Pending review submission with WhatsApp concierge routing and Ops coordination | `tests/integration.mjs` | Reversion to forbidden "حجز جماعي" terminology |
| **FEAT-09** | `/ar/petals` (J Petals Club) | `apps/customer/js/account.js`, `apps/customer/js/wheel.js`, `server/loyalty.mjs` | Loyalty points dashboard, dynamic tiers (Silver 0–199, Gold 200–499, VIP 500+), reward catalogue, and fortune wheel | Financial-grade auditable ledger, points accrued strictly upon service completion + verified payment | `tests/financial.mjs`, `tests/integration.mjs` | Unearned points on booking, negative balance on refund |
| **FEAT-10** | `/ar/reviews` | `apps/customer/js/account.js`, `server/customer-server.mjs` | Verified reviews submission for completed bookings only; moderation queue in Ops | Unverified customers cannot submit; moderation required before public display | `tests/integration.mjs` | Unauthenticated review injection, XSS in review body |
| **FEAT-11** | `/ops` (Operations Portal) | `apps/staff/ops-app.js`, `server/ops-server.mjs`, `server/staff/ops.mjs` | Dedicated portal for staff login, MFA, calendar, bookings, payment verification, staff scheduling, coupons, settings | Unified operational hub with 1-click payment verification triggering automatic confirmation and calendar hold | `tests/security.mjs`, `tests/simulate-100-customers.mjs` | Privilege escalation, CSRF bypass, session cross-contamination |

---

## 3. Financial Invariants & State Rules

1. **No External Payment Gateway:** All transactions occur via local bank transfer to Al Rajhi Bank IBAN.
2. **Receipt != Verified Payment:** Receipt upload moves state to `receipt_submitted` / `awaiting_verification`. Only authorized staff verification moves state to `payment_verified` and `confirmed`.
3. **Gift Activation Gate:** Gift cards start in `pending_payment`. Redemption is blocked (`HTTP 400`) until Ops marks `approved_ready` and `payment_verified: true`.
4. **Idempotent Rewards & Ledger:** Points are deducted transactionally on reward commit; refunds reverse points proportionally without permitting negative balances.
5. **Zero Kasrah Policy:** All Arabic user-facing text across all templates and scripts must contain 0 occurrences of Unicode Kasrah (`\u0650`).
