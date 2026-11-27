# J Beauty — Production Readiness Review

## 1. Completed Engineering & Architectural Controls
- **Application-Level Platform Separation:** Customer application (`apps/customer` on `:3000`) and Operations Portal (`apps/staff` on `:3100`) run on distinct origins, HTML entrypoints, asset bundles, and host-only scoped session cookies (`__Host-jb_customer_session` vs `__Host-jb_ops_session` in TLS prod, zero `Domain` attribute).
- **Mandatory Staff TOTP MFA:** `OPS_MFA_REQUIRED=all` default in `NODE_ENV=production` with RFC 6238 verification, AES-256-GCM secret encryption (`OPS_MFA_SECRET_KEY`), hashed single-use recovery codes, and strict pre-MFA API lockout (`403`).
- **Least-Privilege Capability RBAC & Safe Legacy Migration:** Fine-grained capability checks (`server/authorization/permissions.mjs`) enforce role boundaries for `owner`, `ops_manager`, `reception`, `finance`, `practitioner`, and downgraded `legacy_employee`; pre-migration staff sessions are invalidated on migration and permission edits while active customer sessions and loyalty balances remain preserved.
- **Two-Step Refund Governance & Financial Integrity:** Currency calculations run in integer halalas; verified payments cannot be overwritten; Finance initiates refund requests (`refunds.request`) and Owner approves/rejects (`refunds.approve`), reconciling J Petals balances atomically.
- **Visual, Accessibility & Mobile Hardening:** Customer and Operations portals both measure `0` WCAG 2.1 AA violations (`axe-core`), max CLS `0.0007`, progressive 5-step Occasions Wizard replacing the 65-checkbox mobile screen, upgraded glossy 3D Nail Atelier compositing, and independent read-only visual sign-off (`FINAL VERDICT: PASS`).

## 2. Explicit Pre-Launch Operational Prerequisites (Outside Code Scope)
Before opening live public bookings in Al Madinah, the business Owner must complete these operational actions (none are automated by code):
1. **Provision Hosting, DNS & TLS Reverse Proxy:** Configure HTTPS termination and split origins (`https://jbeauty.sa` -> `:3000`, `https://ops.jbeauty.sa` -> `:3100`) using `deploy/nginx.conf.example` or `deploy/Caddyfile.example` with optional IP/VPN restriction for Operations.
2. **Generate Secrets & Environment Variables:** Configure `NODE_ENV=production`, `OPS_MFA_REQUIRED=all`, `OPS_MFA_SECRET_KEY` (32-byte key stored with restricted host permissions outside git), `CUSTOMER_ORIGIN`, `PUBLIC_ORIGIN`, `OPS_ORIGIN`, and persistent `DB_PATH` outside static web directories.
3. **Owner Account Bootstrap & Legacy Staff Audit:** Run `node server.mjs --create-owner`, sign in to Operations to complete 2FA TOTP enrollment, upgrade any `legacy_employee` staff rows under **Team & Roles** to least-privilege roles (`ops_manager`, `reception`, `finance`, `practitioner`), and remove/do not mix test records.
4. **Business Catalog & Legal Sign-Off (`OPERATIONS.md`):** Configure real business WhatsApp (`business_phone`), service neighborhoods (`areas`), capacity, opening hours, practitioner credentials, approved final prices (`business_approved = true`), off-host encrypted SQLite backup drill (`node backup.mjs`), and qualified Saudi PDPL legal compliance review.

