# J SPA — Performance & Optimization Report (`PERFORMANCE.md`)

## Architecture & Payload Budget
- **Zero-Bundle Runtime:** Pure native ESM (`public/app.js`: `8,230 bytes`, plus 9 domain modules in `public/js/*.js`, totaling `229,766 bytes` uncompressed including the Admin dashboard `admin.js`: `51,417 bytes`, `motion.js`: `3,095 bytes`, `atelier.js`: `23,909 bytes`, `experiences.js`: `24,533 bytes`, `booking.js`: `29,803 bytes`, `account.js`: `29,921 bytes`, `pages-public.js`: `34,180 bytes`, `components.js`: `20,683 bytes`, `state.js`: `3,995 bytes`) and a single design stylesheet (`public/styles.css`: `46,383 bytes`), eliminating heavy external frameworks and tracker scripts.
- **2.5D Interactive Graphics vs. 3D WebGL:** **J Nail Atelier** (`atelier.js`: `23,909 bytes` including UI & SVG engine) runs natively with pointer-reactive SVG specular lighting at `<24 KB` uncompressed instead of loading external WebGL/Three.js bundles (`600+ KB`), keeping interactions responsive on mobile without violating `script-src 'self'` CSP.
- **Self-Hosted Fonts (`public/fonts/`):** Zero external Google Fonts requests. Critical `.woff2` files (`plex-arabic-400.woff2`: `42,848 bytes`, `newsreader-roman.woff2`: `34,804 bytes`) are preloaded via `<link rel="preload" as="font" crossorigin>` with `font-display: swap`.
- **Optimized WebP Media (`public/assets/images/`):**
  - Hero asset (`hero-sanctuary.webp`): `76,088 bytes`.
  - Service images (`13` files in `public/assets/images/services/*.webp`): `9,798` (`gel-removal.webp`) to `86,822` bytes (`classic.webp`), inside fixed `aspect-ratio` containers to avoid layout shifts.
  - Below-the-fold service and category images use native `loading="lazy"`.
- **GPU-Only Motion (`motion.js` & `styles.css`):** Scroll reveals (`IntersectionObserver`) and blooming petals animate solely `opacity` and `transform` (`translate3d` / `scale`), avoiding layout-thrashing properties and disabling animations/transitions automatically under `@media (prefers-reduced-motion: reduce)`.
- **HTTP Caching (`server.mjs`):**
  - Immutable media and `.woff2` fonts are served with `Cache-Control: public, max-age=86400`.
  - HTML/CSS/JS shell uses `no-cache` and API endpoints enforce `no-store`.
- **Initial Paint & Crawlability (`seo.mjs`):**
  - Public routes (`/ar/`, `/en/`, `/ar/services`, `/ar/services/:id`, `/ar/packages`, etc.) receive server-rendered semantic HTML headings, descriptions, and JSON-LD directly in the initial HTTP response before client hydration.
- **Reduced Motion:** `prefers-reduced-motion: reduce` disables transitions and smooth scrolling automatically.

## Verification Scope
Asset sizes and non-broken rendering were measured directly on disk and across real Chromium route loads in `tests/browser.cjs`. Formal Lighthouse / field CrUX Core Web Vitals runs must be executed against the final production HTTPS host.

