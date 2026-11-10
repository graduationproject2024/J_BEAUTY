# J Beauty — targeted recovery changes (not production-ready yet)

## Implemented
- Corrected **J SPA → J Beauty** across major live UI, SEO metadata, seeded catalog labels and generated static showcase sources.
- Added **Occasions** and **Reviews** to primary navigation.
- Added two prominent homepage destinations immediately after the hero, and a stronger verified-reviews CTA.
- Rebuilt public **Petals** messaging around transparent earning/redemption rules, removing fictional 250-petal guest balances.
- Verified-only customer balances derive from the existing backend; financial ledger, redemption authorization and booking logic remain unchanged.
- Added tablet navigation fallback for the wider menu.
- Synchronized GitHub Pages showcase files and explicitly marked the static preview as non-operational for live bookings/accounts.
- Added `tests/brand-visibility.mjs` source regression checks.

## Important limitations / release blockers
1. **Not browser-verified:** Changes were made through GitHub connector, without running local Node 24 / Playwright suites or capturing new browser screenshots. Run all suites and visually inspect Arabic/English at 360/390/768/1024/1440 widths before merging.
2. **Nail Atelier:** Existing photographic canvas overlays remain; visual calibration is not accepted as final and needs dedicated real-device, nail-shape, lighting and skin-tone QA. Do not claim it has been fixed.
3. **Loyalty:** Presentation was redesigned, but the actual points and redemption business engine is intentionally preserved. Product owner should approve rates and rewards; validate edge cases and full end-to-end redemption.
4. **GitHub Pages is a static demo** and cannot save bookings or reviews and cannot operate private accounts or rewards. Production requires Node.js + SQLite hosting. It must not be treated as the final public booking app.
5. **Brand asset:** Visual monogram remains J-based; branding display text is J Beauty. Review legal brand materials and service photo approvals before production.

## Required commands
```bash
node tests/brand-visibility.mjs
node tests/integration.mjs
node tests/financial.mjs
node tests/security.mjs
node tests/browser.cjs
node tests/browser-flow.cjs
node scripts/build-gh-pages.mjs
```

## Required follow-up
Use the repo's 12ui design skill and relevant `.agents/skills` with a genuinely independent visual critic. Inspect screenshots and reject visual regression; no pass merely from successful JavaScript tests. Preserve real verified reviews and protect customer information.