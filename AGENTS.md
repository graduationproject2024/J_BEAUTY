# J SPA — Project Engineering & Visual Quality Rules

1. **Zero Superficial Fixes & Zero Unverified Claims:** Never report visual completion from SVG edits, CSS tweaks, or functional Playwright pass logs alone. Every visual change must be rendered in headless Chrome at desktop (`1440px`), tablet (`768px`), and mobile (`360px`/`390px`) in Arabic RTL and English LTR, and inspected visually before claiming success.
2. **Visual & Anatomical Integrity:**
   - Never use cartoon or paper-cutout SVG silhouettes for **J Nail Atelier** hand visualization.
   - Never use generic radial blob vectors for **J Petals Club**.
   - Every service photograph must accurately portray its real treatment (`gel-removal.webp` must depict soak-off gel removal).
3. **Saudi Arabic Localization:** All customer-facing Arabic copy must be refined contemporary Modern Standard Arabic suited to Al Madinah Al Munawwarah, Saudi Arabia. Zero Egyptian dialect (`عايزة`, `النهارده`, `إيه`, `أدلع`, `بجهز`, `جربي`), zero awkward literal phrasing, and zero unverified clinical claims. Keep **تنسيق جلسات المناسبات** / **Occasion Experiences** at `/occasions` with `301` redirect from `/group-booking`.
4. **Business & Architecture Constraints:**
   - Zero paid third-party runtime services, SMS OTP, or external CDN scripts (`script-src 'self'`, `font-src 'self' data:`).
   - Preserve Node 24 + SQLite + modular ES module architecture, existing booking rules, WhatsApp manual confirmations, J Petals financial integrity, review verification/moderation, and role least privilege.
   - Tests must always run against isolated temporary SQLite databases — never mutate operational data.
5. **Independent Visual QA Gate:** Final visual approval must be conducted independently against actual cropped and full-page screenshots (`docs/quality-recovery/VISUAL-QA.md`) before merging or declaring completion.

