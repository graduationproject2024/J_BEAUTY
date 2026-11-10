# J SPA — Brand & Visual Design System (`DESIGN.md`)

## 1. Brand Positioning & Visual Direction
- **Brand:** J SPA — Women’s Home Spa & Beauty Services (`سبا نسائي منزلي`)
- **Location:** Al Madinah Al Munawwarah, Saudi Arabia (at-home service only; no walk-in address)
- **Arabic Tagline:** لحظتكِ الخاصة… في راحة بيتكِ
- **English Tagline:** Your Moment of Beauty, At Home.
- **Personality:** Quiet Luxury × Botanical Beauty × Soft Editorial Design

## 2. Design Exploration (`/concepts.html`)
Four refined design directions were implemented and evaluated in `public/concepts.html`, `public/concepts.css`, and `public/concepts.js` (with interactive Desktop and Mobile Hero viewport toggles):

1. **Direction S — Luxury Botanical Synthesis (Selected Final System)**
   - **Aesthetic:** Combines Botanical Ritual’s calming warm ivory (`#FBF7F4`), cream (`#F4EBE6`), and sage green (`#A7B79F` / `#607257`) palette with Luxury Editorial’s spacious typographic rhythm (`Newsreader` + `Noto Naskh Arabic`) and Modern Blush’s feminine arch/pearl geometry.
   - **Strengths:** Highest bilingual RTL/LTR clarity across both quiet-luxury storytelling and dense interactive workflows (Atelier, Studio, Booking Wizard, Beauty Passport, Admin Operations), preserving crisp WCAG AA contrast and GPU-composited transitions (`cubic-bezier(0.23, 1, 0.32, 1)`).
2. **Direction A — Botanical Ritual**
   - **Aesthetic:** Organic soft curves, arched travertine sanctuary photography, sage botanical accents, warm ivory surfaces.
3. **Direction B — Modern Blush**
   - **Aesthetic:** Blush-tinted surfaces (`#FAF1F2` / `#F2DFE3`), tilted hero arch, sans-serif geometric display headers, pill silhouettes.
   - **Evaluation:** Engaging for nail and gel highlights, though extended pink backgrounds lower visual breathing room on long forms and dense operational screens.
4. **Direction C — Luxury Editorial**
   - **Aesthetic:** Crisp zero-radius architectural grids, stark hairline dividers, magazine asymmetry, charcoal/ivory restraint.
   - **Evaluation:** Strong editorial authority, blended into Direction S rather than used wholesale with harsh corners.

### Interactive 2.5D vs. 3D Rendering Evaluation (`J Nail Atelier`)
Three.js / WebGL 3D hand-mesh rendering was explicitly evaluated against strict project constraints (`script-src 'self'` CSP, zero external CDNs, low mobile payload, 60fps scroll/touch performance, and zero synthetic skin/hand distortion). Because unbundled WebGL frameworks would inflate runtime payload without guaranteeing superior close-up French tip geometry or Arabic RTL UI overlays on mid-range mobile devices, **J Nail Atelier** (`public/js/atelier.js`) uses a bespoke **pointer-reactive 2.5D layered SVG lighting stage** (`<15 KB`, dynamic specular sheen tracked smoothly across polish, pearl, and matte finishes, plus 5 shapes, 3 lengths, 10 polish shades, 5 French styles, 5 tip shades, 4 accents, and 4 skin undertones).

*(Note: 12ui hosted generation services were unavailable / excluded under the zero-paid-services rule; all concepts, SVG components, and system refinements were engineered locally with self-hosted assets.)*

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
  - Replaced the single repeated placeholder SVG across all services with service-specific optimized `.webp` visuals (`28–87 KB` each) representing the actual treatment without invented staff or customer faces (`docs/audits/IMAGE-QUALITY-AUDIT.md`):
    - Hero: `hero-sanctuary.webp`
    - 12 AI-generated quiet-luxury treatment stills converted to WebP: `relaxation.webp`, `therapeutic.webp`, `hot-stone.webp`, `lymphatic.webp`, `classic.webp`, `pedicure.webp`, `french-tip.webp`, `french-polish.webp`, `gel-polish.webp`, `french-gel.webp`, `colored-french.webp`, `gel-reapplication.webp`.
    - `gel-removal.webp` (`28.5 KB` WebP): Replaced the earlier cartoon vector illustration with a real open-licensed photograph (`File:Person pours liquid from a bottle onto a tissue in a bright indoor space.jpg` by **Shixart1985 via Wikimedia Commons, `CC BY 2.0`**), warm color-graded and cropped to `720×720` (`docs/audits/IMAGE-QUALITY-AUDIT.md`).
  - **Provisional Status:** All current imagery is documented in `docs/audits/IMAGE-QUALITY-AUDIT.md` and remains replaceable per service via **Admin → Services**.

## 6. Component & Page Architecture
- **Homepage 8-Section Narrative:** Editorial Hero -> **Choose Your Mood** interactive selector ("ما نوع العناية التي ترغبين بها اليوم؟") -> Featured Rituals (`4`-column catalog cards with heart Favorites toggles) -> **Home Visit Timeline** (`01–04` compact step timeline, zero unverified sterilization claims) -> Inline **J Nail Atelier** continuous anatomical hand preview -> Asymmetric Botanical Peony **J Petals Club** emblem (`renderSignatureBloomSVG`) -> Honest Care Standards (or verified moderated 5-star customer reviews) -> Final Booking CTA.
- **Interactive Discovery & Retention Extensions:** **J Ritual Studio** (`/studio` sticky preferences + visual card recommender), **J Nail Atelier** (`/atelier` continuous dorsum silhouette with `Almond`, `Oval`, `Soft Square`, `Square`, `Coffin` shapes), **Beauty Lookbook** (`/lookbook`), **Occasion Experiences — تنسيق جلسات المناسبات** (`/occasions`, with `301` redirect from `/group-booking`), **Gift a Ritual** (`/gifts`), **Verified 5-Star Reviews** (`/reviews` with interactive `radiogroup` modal), and **My Beauty Passport** (`/account` / `/passport`).
- **Motion & Reduced-Motion Support (`public/js/motion.js`):** GPU-composited scroll reveals (`IntersectionObserver`) and petal transitions honoring `@media (prefers-reduced-motion: reduce)`.
- **Responsive Mobile Navigation & Data Views:** Persistent header CTA across desktop/mobile, slide-over drawer (`Escape`, `aria-expanded`, focus restoration on SPA navigation), sticky scrolled bottom bar on public pages, and automatic key-value card lists replacing wide admin/ledger tables below `780px`.
