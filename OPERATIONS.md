# J SPA operating and launch guide

## Scope and deployment decision

This application has no paid external API requirement. WhatsApp, Instagram and TikTok are ordinary links. Payment is recorded by staff after offline payment; this application does not process card details. No SMS, email delivery service, automated WhatsApp sender, loyalty SaaS or booking SaaS is required.

The current architecture is a single Node.js 24 process, a same-origin static interface and SQLite on persistent local storage. Node’s built-in SQLite module avoids a separate database installation. See the [Node SQLite documentation](https://nodejs.org/download/release/v24.14.0/docs/api/sqlite.html). Review its stability status when maintaining or upgrading the runtime.

SQLite is appropriate for a small, single-instance operation with modest write volume. Do not place the database on an ephemeral/serverless filesystem, an object-storage mount, a browser-accessible directory or a shared network filesystem. Do not run multiple replicas against it. The web process needs durable writable storage and correct filesystem ownership. Database, backup, log and configuration directories must not be served as static files.

PostgreSQL is the alternative for multiple application instances, materially higher write concurrency, or hosting that already includes a suitable database. Moving to PostgreSQL requires a tested persistence adaptation and migration; it is not a configuration switch in this SQLite implementation. Free tiers can change and have limits, sleep behavior or retention restrictions. No free hosting or database tier is assumed.

## Startup and owner setup

Use Node.js 24 with built-in SQLite support. From the `j-spa` directory run `node server.mjs`. See the repository README for the final supported environment variables and test commands. Keep the local development server private until launch checks pass.

Create the first owner using `node server.mjs --create-owner` with `OWNER_NAME`, `OWNER_PHONE` and `OWNER_PASSWORD` supplied securely through the process environment. Do not commit these values, paste real credentials into source, or reuse test passwords. There is no intended default administrator password. Clear temporary environment values after the command and follow the README’s exact bootstrap instructions. Create individual employee accounts through the owner interface; never share owner access.

## Production deployment checklist

1. Select a host with persistent disk, supported Node runtime, process supervision and HTTPS support. Confirm its storage durability and recovery model.
2. Configure the application’s public origin, production security settings and persistent database path using the actual environment variables documented in README. Terminate TLS at a correctly configured reverse proxy. Restrict direct access to the application port.
3. Use a dedicated unprivileged OS user. Restrict database and backup file access to authorized operators. Keep secrets outside the static root and repository.
4. Configure process restart on failure and restart after operating-system updates. Test graceful shutdown, disk-full behavior, certificate renewal and restart persistence.
5. Configure only approved proxy headers; do not trust arbitrary forwarded IP addresses for rate limiting. Validate the application’s session and cookie behavior through the actual HTTPS proxy.
6. Run the automated test suite and the listed browser scenarios against the deployment. Use synthetic customers, then remove test data safely before real use. Perform an independent security review before processing real home-service records.
7. Establish a backup schedule, monitor backup success, restore a backup into an isolated environment, and record recovery time and any lost-write window.

## Backups and recovery

Back up the database using a SQLite-consistent backup mechanism, such as SQLite’s online backup API or `VACUUM INTO` executed by a trusted maintenance tool. A simple copy of the main database while WAL writes are active may omit committed records or create an inconsistent backup. If an online backup mechanism is unavailable, stop the application cleanly and verify no process is writing before copying the database and any required journal files.

Encrypt off-host backup storage and restrict access. Do not email the database or store it in a publicly shared drive. Choose retention and recovery objectives after reviewing personal-data requirements and business needs. Daily backups are a starting operational proposal, not a completed backup system or a universal retention requirement. Keep at least one recovery copy outside the live host. Backups can contain deleted customer data, so deletion and retention procedures must also cover their lifecycle.

Recovery procedure: isolate the incident, stop writes, preserve evidence without exposing customer information, restore into a separate protected location, verify integrity and representative bookings/ledger entries, then point a stopped application at the restored database. Record the restore timestamp and reconcile any manually handled bookings or payments after that point. Test the process before relying on it.

## Staff operating rules

- A submitted booking is only a request. Opening WhatsApp is not proof of sending or receipt. Staff must review schedule capacity and agree on the actual appointment before confirmation.
- Never verify a customer merely because she typed a phone number. Check the actual sender number in the business WhatsApp conversation and the current one-time reference, then record the verification in the staff interface.
- Historical guest records must not be assigned by phone-number matching alone. A wrong registration or disputed phone claim requires staff-assisted identity review; do not disclose another person’s bookings during the review.
- Never request, read or send an existing password. For recovery, verify identity in the established conversation and manually send a short-lived reset token/link. Treat reset tokens as secrets and avoid placing them in shared notes or analytics.
- Record the actual amount paid and the observed payment method. Confirm payment only after checking cash collection, POS confirmation or bank receipt. Completion and verified payment are independent conditions for loyalty.
- Record refunds and reward reversals through the authorized workflow, with reasons. Do not edit database balances directly. Use the ledger and audit trail to reconcile discrepancies.
- Publish only genuine reviews associated with eligible completed bookings. Remove accidental personal information before publication through an approved moderation procedure; do not fabricate or alter customer sentiment.

## Costs

| Item | Requirement | Cost treatment |
|---|---|---|
| Application software | Node and SQLite, locally hosted code | No software subscription required by this architecture |
| Domain | Recommended for a public branded service | Annual registrar charge; obtain actual quotation |
| Persistent hosting | Required for public single-instance operation | Recurring host charge unless existing compatible infrastructure is available |
| Backup storage | Required for a responsible live operation | May be bundled or separately charged; verify capacity, encryption and retention |
| HTTPS certificate | Required for live customer accounts | Often available without a certificate fee, but installation and renewal still need operation |
| WhatsApp | Ordinary user-operated links | No WhatsApp Business API subscription required; staff time and connectivity remain |
| Payment | Offline cash/POS/transfer recording | No gateway integration fee from this app; actual bank/POS arrangements may have their own fees |
| Maintenance | Updates, monitoring, incident response and restores | Staff or contractor time; not eliminated by free software |
| Professional photographs | Final brand photography | One-time licensing/production cost where applicable |

No hosting, domain, subscription, paid API or external account has been purchased or activated. Exact recurring totals depend on the chosen host, storage, domain and operator arrangement and must be quoted before launch.

## Required real business information

- Official legal/controller identity, trading name, registration details as applicable, privacy contact and customer support contact.
- Actual business WhatsApp number and approved Instagram/TikTok URLs. Until provided, handoff links must remain unavailable rather than pointing to invented contacts.
- Approved Madinah service neighborhoods, working days/hours, unavailable dates, staff capacity, travel buffer and lead time. Preferred times must not be described as available slots before reliable capacity records exist.
- Approved prices, durations, descriptions, package eligibility and discount conditions; tax treatment, receipts and invoice requirements require business/accounting review.
- Practitioner credentials and allowed scope, especially therapeutic massage and lymphatic drainage; applicable precautions, contraindication handling, escalation and guardian requirements. The site must not substitute for clinical advice.
- Service cancellation, rescheduling, refunds, no-show, arrival, home access and payment policies.
- Final loyalty earning rate, rounding, reward conditions, expiry if any, discount/refund treatment and dispute process.
- Approved photographs and usage rights; staff/customer consent if identifiable people are included.
- Approved privacy notice, terms, retention schedule, access/deletion process and incident-response contacts.

## Saudi privacy and legal review

This document does not certify Saudi legal compliance. Obtain qualified local review before launch. Review the official [Saudi Personal Data Protection Law English text](https://sdaia.gov.sa/en/SDAIA/about/Documents/Personal%20Data%20English%20V2-23April2023-%20Reviewed-.pdf) and [SDAIA Privacy Policy Guideline](https://sdaia.gov.sa/Documents/PrivacyPolicyGuideline.pdf), alongside applicable current implementing rules and business-sector requirements.

The business should approve a clear controller identity and privacy contact; purposes and legal bases for each processing activity; collection notices; minimum information needed for home services; customer-rights procedures; retention/deletion rules; handling of children or guardian consent; processors and contractual controls; hosting and international-transfer arrangements; and security/incident-response responsibilities. Avoid collecting detailed medical notes through free-text booking fields unless the business has established an appropriate, lawful process. Do not use booking information for marketing without the required basis and consent where applicable.

WhatsApp handoff sends customer-entered information into a separate service when the customer chooses to send. Explain that boundary in the privacy notice and minimize message contents. Do not include full home addresses, payment secrets or sensitive health information in URL query strings or public booking references.

## Acceptance status

Refer to the root delivery README and test report for what was actually executed and verified. This operations guide is an operating proposal, not evidence that deployment, backups, legal review, business approval, production security review or licensed photography have been completed.
