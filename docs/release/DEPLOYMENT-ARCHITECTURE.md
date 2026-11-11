# Deployment Architecture — J Beauty Dual-Origin Setup

## 1. Process Topology & Entry Points
J Beauty runs as one lightweight Node.js 24 LTS process (`node server.mjs`) hosting two isolated HTTP servers backed by a single transactional SQLite (`WAL`) database:
- `127.0.0.1:3000` (`PORT`): Customer Application (`server/customer-server.mjs`, `apps/customer/`)
- `127.0.0.1:3100` (`OPS_PORT`): Operations Portal (`server/ops-server.mjs`, `apps/staff/`)

Each listener can also start standalone (`node server/customer-server.mjs` / `node server/ops-server.mjs`) against the same host filesystem when single-writer coordination is preserved.

## 2. Recommended Production Origins (HTTPS Proxy)
Ready-to-adapt reverse proxy templates ship in `deploy/`:
- [`deploy/nginx.conf.example`](../../deploy/nginx.conf.example)
- [`deploy/Caddyfile.example`](../../deploy/Caddyfile.example)

Key production proxy guarantees:
- **Public Customer Origin (`https://jbeauty.sa`):** Proxies cleanly to `127.0.0.1:3000`; explicitly returns `404` (`X-Robots-Tag: noindex, nofollow`) at the proxy edge for `/(ar|en)/(admin|ops)` and `/api/(admin|ops)` paths as defense-in-depth alongside Node routing.
- **Internal Operations Origin (`https://ops.jbeauty.sa`):** Proxies to `127.0.0.1:3100`; injects `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`, strict HSTS, and supports IP allowlisting / VPN / mTLS restriction at the TLS edge.

## 3. Secrets & Key Management
- Store `OPS_MFA_SECRET_KEY` (32-byte base64 key) outside the repository and web root with strict `0600` filesystem permissions.
- Set `NODE_ENV=production` and `OPS_MFA_REQUIRED=all` so `__Host-` prefixed cookies, `Secure`, `HSTS`, and mandatory RFC 6238 TOTP MFA apply across every staff login.
- Set `CUSTOMER_ORIGIN=https://jbeauty.sa`, `PUBLIC_ORIGIN=https://jbeauty.sa`, and `OPS_ORIGIN=https://ops.jbeauty.sa` so recovery reset URLs always target Customer and origin validation enforces cross-site isolation.

## 4. Backup & Disaster Recovery
- Create online WAL-safe backups via `node backup.mjs <destination.sqlite>` (`DB_PATH` pointing to production DB).
- Store encrypted off-host copies outside web roots and verify restoration drills regularly (`OPERATIONS.md`).

