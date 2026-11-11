# J Beauty Operating and Launch Guide

## Architecture & Scope
J Beauty is a bilingual Arabic / English women’s home-spa platform for Al Madinah Al Munawwarah, structured with a single Node.js 24 LTS backend serving two cleanly isolated HTTP applications sharing one authoritative transactional SQLite database (WAL mode):
- **Customer Platform (`apps/customer`, `PORT=3000`, proposed `https://jbeauty.sa`)**: public editorial discovery, J Nail Atelier, J Ritual Studio, Beauty Lookbook, 5-step Booking Wizard, 5-step Occasion Experiences Wizard, Gifts, J Petals Club, verified Reviews, and Beauty Passport. Contains zero staff/admin routes or assets.
- **Operations Portal (`apps/staff`, `OPS_PORT=3100`, proposed `https://ops.jbeauty.sa`)**: standalone `noindex, nofollow` workstation for staff login, mandatory TOTP MFA (`OPS_MFA_REQUIRED=all` in prod), practitioner assignment & conflict checks, booking confirmation/rescheduling, calendar blocking, masked customer identity verification & recovery link generation, two-step payment/refund reconciliation, J Petals redemption/adjustment, review moderation, role/permission management, and audit logs.
- **Shared Foundation (`packages/shared`)**: zero-privilege typography/color CSS tokens and pure formatting helpers.

Payment is recorded offline (cash, Mada/card POS, bank transfer) and verified manually by Finance/Owner staff. No third-party SMS OTP, paid WhatsApp Business API, or build pipeline is required.

## Environment Variables
| Variable | Purpose | Production Recommendation |
|---|---|---|
| `NODE_ENV` | Runtime mode | `production` (enables `__Host-` cookies, `Secure`, `HSTS`, defaults `OPS_MFA_REQUIRED=all`) |
| `HOST` | Bind interface | `127.0.0.1` behind TLS reverse proxy |
| `PORT` | Customer listener port | `3000` (`CUSTOMER_ORIGIN=https://jbeauty.sa`) |
| `OPS_PORT` | Operations listener port | `3100` (`OPS_ORIGIN=https://ops.jbeauty.sa`) |
| `CUSTOMER_ORIGIN` | Allowed customer Origin + recovery base URL | `https://jbeauty.sa` |
| `OPS_ORIGIN` | Allowed Operations Origin for CORS/CSRF | `https://ops.jbeauty.sa` |
| `PUBLIC_ORIGIN` | Canonical SEO/sitemap base origin | `https://jbeauty.sa` |
| `DB_PATH` | Persistent SQLite database path | `/var/lib/jbeauty/jspa.sqlite` (outside static web roots) |
| `OPS_MFA_REQUIRED` | Staff MFA policy (`all`, `owner`, `optional`, `off`) | `all` |
| `OPS_MFA_SECRET_KEY` | 32-byte AES-256-GCM key (base64 or hex) for TOTP secrets | Managed secret outside repo (`openssl rand -base64 32`) |
| `OPS_IDLE_MINUTES` | Staff session idle expiration window | `30` to `60` |

## Deployment Examples & Reverse Proxy Separation
See [`deploy/nginx.conf.example`](deploy/nginx.conf.example) and [`deploy/Caddyfile.example`](deploy/Caddyfile.example) for split virtual-host reverse proxy configurations (`jbeauty.sa -> 127.0.0.1:3000`, `ops.jbeauty.sa -> 127.0.0.1:3100`), TLS termination, `noindex` / `no-store` enforcement on Operations, and edge `404` blocking of retired `/admin` routes on the public domain. Optionally restrict `ops.jbeauty.sa` by VPN / Madinah office static IP allowlists or client mTLS.

**Database Writer Rule:** Keep the single Node process (`node server.mjs`) hosting both listeners so WAL transactions (`BEGIN IMMEDIATE`) serialize safely against the shared SQLite file. Do not launch concurrent uncoordinated SQLite writer processes without migrating to PostgreSQL.

## Startup, Migration & Owner Bootstrap
1. Back up existing SQLite before upgrading: `node backup.mjs pre-upgrade-backup.sqlite`.
2. Start (`node server.mjs`) — schema migrations (`server/database/migrations.mjs`) run idempotently on open, adding `assigned_staff_id`, `refund_requests`, `app_scope`, MFA columns, downgrading legacy `employee` rows to restricted `legacy_employee`, and invalidating stale pre-migration staff sessions while leaving active customer sessions untouched.
3. Bootstrap the first Owner account safely (never store defaults or plaintext passwords in git):
   ```powershell
   $env:OWNER_NAME = 'Your Name'
   $env:OWNER_PHONE = '05XXXXXXXX'
   $env:OWNER_PASSWORD = Read-Host 'Owner password' -MaskInput
   node server.mjs --create-owner
   Remove-Item Env:OWNER_PASSWORD
   ```
4. Sign in at `http://127.0.0.1:3100/` (`https://ops.jbeauty.sa`), enroll mandatory 2FA TOTP, and store single-use recovery codes offline. Review any `legacy_employee` staff rows under **Team & Roles** and assign least-privilege operational roles (`ops_manager`, `reception`, `finance`, `practitioner`).

## Operational & Saudi PDPL Principles
- Appointments start `pending_confirmation`; opening WhatsApp never confirms a booking or proves ownership.
- Phone ownership requires matching the actual WhatsApp sender (`observed_phone`) against a short-lived one-time code.
- Rewards reconcile strictly on verified payment + completed service + verified phone; two-step refunds require Finance request followed by Owner approval.
- Obtain formal local Saudi PDPL legal review (`sdaia.gov.sa`), approve business hours/neighborhoods/service credentials/prices, and verify encrypted off-host daily SQLite restores before live launch.
