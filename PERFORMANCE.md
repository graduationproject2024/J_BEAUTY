# J SPA — Performance & Optimization Report (`PERFORMANCE.md`)

## Architecture & Payload Budget
- **Zero-Bundle Runtime:** Pure native ESM (`public/app.js` + `public/js/*.js`) and single compiled design stylesheet (`public/styles.css`), eliminating large client frameworks and third-party tracker scripts.
- **Self-Hosted Fonts (`public/fonts/`):** Removed external `fonts.googleapis.com` stylesheet requests (which previously failed CSP and added third-party latency). Critical `plex-arabic-400.woff2` and `newsreader-roman.woff2` are preloaded via `<link rel="preload" as="font" crossorigin>` with `font-display: swap`.
- **Optimized WebP Media (`public/assets/images/`):**
  - Hero asset (`hero-sanctuary.webp`): `76,088 bytes` (down from `768,242 bytes` JPEG — **90.1% smaller**).
  - Service images (`13` files in `public/assets/images/services/*.webp`): `9.8 KB – 86.8 KB` each (`~54 KB` average), resized to `720×720` with `aspect-ratio: 1 / 1` containers to prevent Cumulative Layout Shift (CLS).
  - Below-the-fold service and category images use native `loading="lazy"`.
- **HTTP Caching (`server.mjs`):**
  - Immutable media and `.woff2` fonts are served with `Cache-Control: public, max-age=86400`.
  - HTML/CSS/JS shell uses `no-cache` and API endpoints enforce `no-store`.
- **Initial Paint & Crawlability (`seo.mjs`):**
  - Public routes (`/ar/`, `/en/`, `/ar/services`, `/ar/services/:id`, `/ar/packages`, etc.) receive server-rendered semantic HTML headings, descriptions, and JSON-LD directly in the initial HTTP response before client hydration.
- **Reduced Motion:** `prefers-reduced-motion: reduce` disables transitions and smooth scrolling automatically.

## Verification Scope
Asset sizes and non-broken rendering were measured directly on disk and across real Chromium route loads in `tests/browser.cjs`. Formal Lighthouse / field CrUX Core Web Vitals runs must be executed against the final production HTTPS host.

