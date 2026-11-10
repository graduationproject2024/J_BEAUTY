# J Beauty

Local Arabic / English home-spa booking and operations application. Requires **Node.js 24.18 or later in the Node 24 LTS line**. No package installation, paid API, email provider, SMS gateway, or WhatsApp API is required.

## Run

```powershell
cd outputs/j-spa
node server.mjs
```

Open http://localhost:3000/ar/. Design explorations: http://localhost:3000/concepts.html.

Create the owner separately, using a unique password held in your password manager:

```powershell
$env:OWNER_NAME = 'Your name'
$env:OWNER_PHONE = '05XXXXXXXX'
$env:OWNER_PASSWORD = Read-Host 'Owner password' -MaskInput
node server.mjs --create-owner
Remove-Item Env:OWNER_PASSWORD
```

There is no default administrator password. Sign in through the account screen, then open Administration. Configure real contact details, service areas, operating hours, staff capacity, approved prices and business content before taking live requests.

## Architecture

One Node process serves static HTML/CSS/JavaScript and a same-origin JSON API. SQLite uses persistent local storage. Passwords use salted scrypt; account sessions use secure random opaque cookies, server-side authorization and CSRF tokens. All booking, reward and loyalty decisions take place on the server. Monetary values are stored as integer halalas.

This deliberately uses the browser platform and Node standard library rather than adding a build pipeline and runtime dependencies. No public analytics tracker, remote font, social feed or external payment integration is needed.

See [OPERATIONS.md](OPERATIONS.md) for production hosting, backups, costs and business approval requirements, and [DESIGN.md](DESIGN.md) for visual exploration. The application is a local implementation; deployment and real business verification are separate launch requirements. Concept previews are demonstrations and do not submit bookings.

## Verification

```powershell
node tests/integration.mjs
node tests/financial.mjs
node tests/security.mjs
```

Integration tests create their own temporary database and test-only owner. They do not populate the operational database with invented bookings, reviews, revenue or customers.

Browser verification scripts use an existing local Playwright installation and Chrome, which are development tools rather than application dependencies.

Run `node tests/browser.cjs` against the running application and `node tests/browser-flow.cjs` for a separate browser test database. Set `CHROME_PATH` if Chrome is installed elsewhere. See [QA.md](QA.md) for results and coverage.

For production, set `PUBLIC_ORIGIN` to the actual HTTPS site origin and use `NODE_ENV=production` behind the HTTPS proxy. To make a verified SQLite snapshot, set `DB_PATH` to the active database and run `node backup.mjs <new-backup-file.sqlite>`.

## Operational principles

- Every submitted appointment starts pending. Staff must confirm it explicitly.
- WhatsApp links prepare text only; the customer must press Send herself.
- A typed telephone number does not establish ownership. Staff must check the actual sender and the one-time reference.
- Account ownership uses user IDs, never a blanket match on guest phone numbers.
- Points require both completed service and staff-verified payment. Retries cannot issue points twice.
- Reviews require a completed owned booking and approval before publication.
- All catalog prices and package offerings are provisional until approved by the owner.
