# J Beauty Atelier v2 — Baseline Audit & Defect Register

**Audit Branch:** `feat/j-beauty-atelier-v2-quality-recovery` (branched from `feat/platform-separation-ops-portal` HEAD `c80a6e988805879ef7ba77fc2de16aea7b299019`)  
**Audit Date:** 2026-11-11  
**Baseline Evidence:** [`screenshots/atelier-v2/before/`](../../screenshots/atelier-v2/before/) and [`baseline-telemetry.json`](../../screenshots/atelier-v2/before/baseline-telemetry.json)

---

## 1. Baseline Suite Execution Status

| Test Suite | Scope | Baseline Result | Notes |
| --- | --- | --- | --- |
| `node tests/brand-visibility.mjs` | Brand mark, bundle isolation, nav & rewards source | **PASS** | Ran before code edits |
| `node tests/migration.mjs` | Schema migration, downgrade safety, rollback | **PASS** | Ran before code edits |
| `node tests/financial.mjs` | Petals ledger, refunds, payment immutability | **PASS (9 checks)** | Ran against isolated temp SQLite |
| `node tests/integration.mjs` | Catalog, booking, verification, reviews, Passport | **PASS (22 checks)** | Ran against isolated temp SQLite |
| `node tests/security.mjs` | Dual-origin cookies, TOTP MFA, CSRF, RBAC | **PASS (10 checks)** | Ran against isolated temp SQLite |
| `node tests/browser-flow.cjs` | End-to-end dual-origin Playwright workflows | **PASS** | Verified end-to-end browser flows |

*(Note: Full 108-navigation `tests/browser.cjs` timed out past the interactive command window on baseline and will be run in full cleanly at final verification.)*

---

## 2. Measured Baseline Nail Atelier Telemetry

From [`baseline-telemetry.json`](../../screenshots/atelier-v2/before/baseline-telemetry.json):

| Viewport / Language | Full Page Height | Preview Stage Height | Viewport Share (`stageHeight / vh`) | Controls Card Height |
| --- | --- | --- | --- | --- |
| `ar` `1440x900` | `1757px` | `346px` (`346x346`) | `38%` | `864px` |
| `en` `1440x900` | `1696px` | `346px` (`346x346`) | `38%` | `833px` |
| `ar` `360x780` | `2602px` | `185px` | **`24%`** | **`1286px`** |
| `ar` `390x844` | `2498px` | `185px` | **`22%`** | **`1182px`** |
| `en` `390x844` | `2459px` | `185px` | **`22%`** | **`1138px`** |

Observed `recommendedServiceForStyle` outputs on the 6 mandatory presets:
1. Fair + Short + Oval + Sheer Blush -> `طلاء جل (115 ر.س)`
2. Warm + Medium + Almond + Classic French -> `جل فرنسي (145 ر.س)`
3. Olive + Medium + Soft Square + Sage Matte -> `طلاء جل (115 ر.س)`
4. Deep + Long + Coffin + Burgundy Gloss -> **`طلاء جل (115 ر.س)`** *(no extension/complexity distinction)*
5. Deep + Long + Square + Micro French -> **`جل فرنسي (145 ر.س)`** *(same flat mapping regardless of micro-tip or long coffin/square length)*
6. Warm + Medium + Oval + Ombre -> **`جل فرنسي (145 ر.س)`** *(no ombre complexity/art nuance)*

---

## 3. Baseline Defect Register

| ID | Severity | Component / Route | Measured Defect & Root Cause | Fix Target |
| --- | --- | --- | --- | --- |
| **DEF-AT-01** | **P0 Critical** | `apps/customer/js/atelier.js` (`/ar/atelier`, `/en/atelier`, homepage widget) | **Architectural 2D overlay failure:** Paints flat 2D `bezierCurveTo` paths over one diagonal `720x720` photo (`atelier-hand-base.webp`). Nails look like pasted plastic stickers with hard dark painted perimeter smears, flat glare ribbons, zero transverse C-curve / longitudinal apex thickness, and no angle/pose inspection. Over 65% of the frame is blurry linen rather than the hand and nails. | Replace with true 3D PBR sculpted anatomy + UV-mapped nail plates (`Prototype A` vs `B` vs `C` evaluation). |
| **DEF-AT-02** | **P0 Critical** | `apps/customer/js/atelier.js` (`paintAtelierCanvas` skin tone curves) | Skin-tone filter multiplies across the full bitmap regions with harsh tonal flattening (`Deep` preset looks desaturated/ashy around shadows while tablecloth & eucalyptus leaves stay unaffected in contrast). | Replace with physiologically modeled multi-tone skin reflectance / SSS lighting. |
| **DEF-AT-03** | **P0 Critical** | Mobile Atelier Layout (`360px` / `390px`) in `apps/customer/styles.css` & `atelier.js` | On mobile (`360x780`), the hand canvas is restricted to `185px` (`24%` viewport height) while all 6 control sections stack to `1286px` (`2602px` page height), forcing excessive scrolling away from the live hand preview. | Redesign Mobile Atelier with dominant live stage (`~45%–52%` viewport height) + compact segmented tabs (`Shape & Length`, `Colors & Styles`, `Finish & Details`) + unobtrusive action strip (`Reset`, `Save`, `Share`, `Book`). |
| **DEF-AT-04** | **P1 High** | `recommendedServiceForStyle` (`apps/customer/js/atelier.js`, `server/experiences.mjs`) | Overly simplistic switch (`colored` -> `colored-french`, `french !== none` -> `french-gel`, else `gel-polish`). Ignores `long` sculptural length, `ombre`, `micro`, `gold_foil`, `pearl_dot`, `floral_dot` complexity, and service preparation notes. | Implement deterministic complexity/tier & catalog matching (with transparent add-on/prep guidance and backward compatibility with existing saved styles). |
| **DEF-AT-05** | **P1 High** | Matte / Pearl optical distinction (`before-preset-3-olive-medium-squoval-sage-matte.png`, `before-preset-6-warm-medium-oval-ombre.png`) | "Matte" finish still renders a bright vertical pale plastic stripe across the nail, and "Ombre" blends poorly under the uniform white highlight bar; French smile curves skew noticeably on the index/ring fingers. | Real PBR roughness/clearcoat/iridescence response (`gloss` vs `pearl` vs `matte`) and UV-locked curved smile/ombre shaders. |
| **DEF-AT-06** | **P1 High** | `apps/customer/js/account.js` Passport Saved Looks | Saved nail style thumbnails re-instantiate heavyweight full canvas rendering per saved item cleanly? Verified works for few items, but upgrading to 3D WebGL requires shared renderer / lightweight snapshot hybrid so multiple cards never exhaust WebGL contexts. | Support clean static/cached preview thumbnails for Passport & mini widget (`Hybrid` / context-pooled rendering). |
| **DEF-AT-07** | **P2 Medium** | Full Customer Website & Ops Regression Audit | Need systematic visual verification of every Customer route (`/services`, `/services/gel-removal`, `/packages`, `/studio`, `/lookbook`, `/occasions`, `/gifts`, `/petals`, `/reviews`, `/booking`, `/account`, `/policies`, `/contact`) + Operations Portal (`127.0.0.1:3100`) in AR/EN at `360, 390, 430, 768, 1024, 1440px` to catch any lingering layout, Arabic phrasing, or asset mismatches. | Audit and polish all remaining Customer & Ops screens in Phases 6–7. |

