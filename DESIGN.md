# J SPA — Brand & Visual Design System (`DESIGN.md`)

## 1. Brand Positioning & Visual Direction
- **Brand:** J SPA — Women’s Home Spa & Beauty Services (`سبا نسائي منزلي`)
- **Location:** Al Madinah Al Munawwarah, Saudi Arabia (at-home service only; no walk-in address)
- **Arabic Tagline:** لحظتكِ الخاصة… في راحة بيتكِ
- **English Tagline:** Your Moment of Beauty, At Home.
- **Personality:** Quiet Luxury × Botanical Beauty × Soft Editorial Design

## 2. Design Exploration (`/concepts.html`)
Three refined design directions were implemented and evaluated in `public/concepts.html`, `public/concepts.css`, and `public/concepts.js` (with interactive Desktop and Mobile Hero viewport toggles):

1. **Direction A — Botanical Ritual (Selected Primary System)**
   - **Aesthetic:** Warm ivory (`#FBF7F4`) and cream (`#F4EBE6`) architectural surfaces, sage green (`#A7B79F` / `#607257`) accents, rose-gold hairline details (`#D4AF7C`), deep plum-brown (`#503C45`) primary ink, arched travertine sanctuary photography, and soft organic radii.
   - **Strengths:** High bilingual legibility in both Arabic RTL and English LTR; calm spa restraint across both marketing pages and dense operational/booking/admin screens; strong WCAG AA text contrast on ivory and white surfaces.
2. **Direction B — Modern Blush**
   - **Aesthetic:** Blush-tinted surfaces (`#FAF1F2` / `#F2DFE3`), tilted hero arch, sans-serif geometric display headers, pill silhouettes.
   - **Evaluation:** Engaging for nail and gel promotions, but extended pink backgrounds reduce visual breathing room on long massage descriptions, booking forms, and admin tables.
3. **Direction C — Luxury Editorial**
   - **Aesthetic:** Crisp zero-radius architectural grids, stark hairline dividers, magazine asymmetry, charcoal/ivory restraint.
   - **Evaluation:** Strong editorial authority, though ultra-sharp corners feel slightly austere for warm in-home hospitality.

### Final Selection
**Direction A (Botanical Ritual) refined with Direction C’s editorial hierarchy and generous whitespace** was selected.

*(Note: 12ui hosted generation services were unavailable / excluded under the zero-paid-services rule; the exploration and final system were authored locally using self-hosted assets.)*

## 3. Official Color Tokens (`public/styles.css`)
| Token | Hex | Role |
|---|---|---|
| `--dusty-pink` | `#D9B7C0` | Floral accents, loyalty petals, blush package cards |
| `--mauve-pink` | `#C9AEB6` | Soft editorial highlights & secondary borders |
| `--sage` / `--sage-deep` | `#A7B79F` / `#607257` | Botanical badges, WhatsApp CTAs, accessible sage ink |
| `--rose-gold` / `--rose-gold-deep` | `#D4AF7C` / `#9A723E` | Hairline borders, seal accents, saving badges, star ratings |
| `--ivory` / `--cream` | `#FBF7F4` / `#F4EBE6` | Primary warm background & secondary soft panels |
| `--plum` / `--charcoal` | `#503C45` / `#352F32` | Primary brand ink, buttons, footer, announcement bar |
| `--white` | `#FFFFFF` | Card, form input, and table surfaces |

## 4. Typography (Self-Hosted SIL OFL Fonts)
Zero external font requests (`fonts.googleapis.com` removed to satisfy strict CSP `font-src 'self' data:` and offline reliability). Local `.woff2` fonts and `OFL-*.txt` license files are served from `public/fonts/`:
- **Arabic Body & UI:** `IBM Plex Sans Arabic` (`400`, `500`, `600`)
- **Arabic Display Headings:** `Noto Naskh Arabic` (`600`), falling back to `IBM Plex Sans Arabic`
- **English Display Headings:** `Newsreader` (`300–600` roman & italic)
- **English Body & UI:** `IBM Plex Sans` (`400`, `600`)

## 5. Brand Mark & Visual Asset Strategy
- **Original Monogram & Favicon:** `public/assets/brand/monogram.svg` and `public/assets/brand/favicon.svg` — an original floral-botanical `J` monogram enclosed in a fine rose-gold circle with sage leaves and a dusty-pink petal.
- **Photography & Service Visuals (`public/assets/images/`):**
  - Replaced the single repeated placeholder SVG across all services with service-specific optimized `.webp` visuals (`40–86 KB` each) representing the actual treatment without invented staff or customer faces:
    - Hero: `hero-sanctuary.webp`
    - 12 AI-generated quiet-luxury treatment stills converted to WebP: `relaxation.webp`, `therapeutic.webp`, `hot-stone.webp`, `lymphatic.webp`, `classic.webp`, `pedicure.webp`, `french-tip.webp`, `french-polish.webp`, `gel-polish.webp`, `french-gel.webp`, `colored-french.webp`, `gel-reapplication.webp`.
    - `gel-removal.webp`: Provisional bespoke apothecary still-life composition (`9.8 KB` WebP) rendered locally because image-generation quota exhausted (`429 RESOURCE_EXHAUSTED`) on the 14th image request.
  - **Provisional Status:** All current imagery is provisional until the business approves or replaces each service’s `image` URL/path directly in **Admin → Services**.

## 6. Component & Page Architecture
- **Responsive Mobile Navigation:** Prominent `Book` / `احجزي موعدكِ` button remains visible in the header across desktop, tablet, and mobile (`360px`–`1440px`), paired with an accessible slide-over menu drawer (`Escape` & `aria-expanded`) and a sticky mobile bottom CTA bar on public browsing routes.
- **Booking Wizard (`public/js/booking.js`):** Step 1 isolates Individual Services and Curated Packages into mutually exclusive tabs with zero auto-selection on switch, service category pills, treatment thumbnails, and a collapsible mobile summary drawer.
- **J Petals Club (`public/js/account.js`):** 8-petal SVG floral bloom arc meter showing live progress toward the next reward for verified customers (or illustrative preview for guests).
- **Admin Dashboard (`public/js/admin.js`):** Role-aware navigation with a 7-day Calendar strip & slot timeline, capacity conflict indicators, status-filtered booking queue, clean payments ledger, and formatted audit logs.
