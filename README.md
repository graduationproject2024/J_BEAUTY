# J Beauty

Arabic / English women’s home-spa booking platform and separated Operations Portal for Al Madinah Al Munawwarah, built on **Node.js 24 LTS (`>= 24.18`)** with `node:sqlite` and zero external runtime npm dependencies.

## Separated Architecture

- **Customer Portal (`apps/customer` on `PORT=3000`):** Customer discovery, J Nail Atelier, J Ritual Studio, 5-step Booking Wizard, 5-step Occasion Experiences Wizard, Gifts, J Petals loyalty dashboard, verified customer reviews, and Beauty Passport. Zero staff/admin scripts, UI links, or endpoints exist on this origin (`/ar/admin` and `/api/admin` return `404`).
- **Operations Portal (`apps/staff` on `OPS_PORT=3100`):** Dedicated `noindex, nofollow` workstation for staff sign-in, mandatory RFC 6238 TOTP MFA (`OPS_MFA_REQUIRED=all` in production), capability-based RBAC (`owner`, `ops_manager`, `reception`, `finance`, `practitioner`, `legacy_employee`), practitioner assignment & overlap protection, calendar blocking, masked verification & cross-origin customer recovery links, two-step refund approval, reward management, review moderation, and audit trails.
- **Shared Foundation (`packages/shared`):** Zero-privilege visual tokens (`tokens.css`) and pure localization/formatting helpers (`format.js`).
- **Static GitHub Pages Showcase (`pages/`, `index.html`, `404.html`):** Static UI demonstration generated via `node scripts/build-gh-pages.mjs --base=/J_BEAUTY` strictly from `apps/customer` + `packages/shared` with clear static preview disclosures and zero staff bundles.

## Run Locally

```powershell
node server.mjs
```

- Customer Website: `http://127.0.0.1:3000/ar/` (and Design Atelier concepts at `http://127.0.0.1:3000/concepts.html`)
- Operations Portal: `http://127.0.0.1:3100/`

Create the primary Owner account separately (stored Argon2id hashed):

```powershell
$env:OWNER_NAME = 'Your name'
$env:OWNER_PHONE = '05XXXXXXXX'
$env:OWNER_PASSWORD = Read-Host 'Owner password' -MaskInput
node server.mjs --create-owner
Remove-Item Env:OWNER_PASSWORD
```

Or launch separated entrypoints explicitly: `node server/customer-server.mjs` and `node server/ops-server.mjs`. See [OPERATIONS.md](OPERATIONS.md), [SECURITY.md](SECURITY.md), [CONTRACT.md](CONTRACT.md), and `deploy/` examples (`nginx.conf.example`, `Caddyfile.example`) for production reverse proxy TLS and key management (`OPS_MFA_SECRET_KEY`).

## Verification Suites

```powershell
node tests/brand-visibility.mjs   # Branding, zero staff leakage in customer/GH Pages bundles
node tests/migration.mjs          # Legacy v1 -> v2 upgrade, legacy_employee downgrade, index plan, rollback
node tests/financial.mjs          # Ledger, two-step refunds, rewards, recovery & settings integrity
node tests/integration.mjs        # Dual-origin APIs, SSR metadata, studio, atelier & occasions
node tests/security.mjs           # Cookie isolation, cross-origin login block, mandatory TOTP MFA, all 6 roles RBAC
node tests/browser-flow.cjs       # E2E Chromium: Customer 5-step Occasions + Booking + Ops TOTP MFA + Moderation
node tests/browser.cjs            # Responsive sweeps (360..1440px AR RTL & EN LTR) across both origins
node tests/audit-a11y-perf.cjs    # WCAG 2.1 AA axe-core + CLS/LCP + Customer & Operations screenshots
```

To snapshot a live SQLite database safely: `node backup.mjs <backup-file.sqlite>`.
