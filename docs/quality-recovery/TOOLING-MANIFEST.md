# J SPA — Phase 0 Tooling & Capabilities Manifest (`TOOLING-MANIFEST.md`)

**Branch:** `recover/j-spa-complete-quality` (branched from `6e9b29a`)  
**Environment Verified:** Windows · Node.js `v24.18.1` · Headless Google Chrome `156.0.0.0` (WebGL enabled: `WebKit WebGL`)

---

## 1. Discovered Global & Built-in Skills
Located `568` global skills in `c:\Users\sam20\.agents\skills\`, built-in skills in `C:\Users\sam20\.gemini\antigravity\builtin\skills\`, and Antigravity guides via `agy-customizations`. Key skills inspected and activated for this recovery:
- `ui-design`, `design-systems`, `taste-and-craft`, `emil-design-eng`, `typography` — luxury UI craft, layout hierarchy, typography spacing, and validation checklists.
- `three-best-practices`, `threejs-materials`, `medical-visual-qa` — WebGL/PBR material realism, GPU cleanup, anatomical asset QA, and RTL canvas verification.
- `playwright-skill`, `security-owasp` — modern accessibility locators, isolated multi-context browser verification, and OWASP defense-in-depth checks.

---

## 2. Installed & Evaluated Development Tools

| Tool / Package | Version & License | Location | Local Capability & Security Assessment |
|---|---|---|---|
| `@12ui/design` CLI & `12ui-design` skill | `0.2.134` (`MIT`) | Pinned at `~\AppData\Local\12ui`; skill at `~\.gemini\config\skills\12ui-design` | Installed cleanly via `npx -y @12ui/design cli install` and `skill install --client antigravity --skip-auth`. Local `12ui scene` (bundled Three.js `r186`, camera solver, headless capture, `sheet`/`blend`/`colors`) and public `12ui corpus inspire` (`25,222` cataloged UI references) operate free without payment or server telemetry. |
| `@axe-core/playwright` | `4.14.0` (`MPL-2.0`) | Parent workspace `c:\Users\sam20\package.json` (`c:\Users\sam20\node_modules\@axe-core\playwright`) | Enables real WCAG 2.0/2.1 AA DOM contrast, ARIA, heading, and landmark scans inside Playwright while keeping `j-spa/package.json` at **zero** external runtime dependencies. |
| `playwright` / `@playwright/test` | `^1.64.1` (`Apache-2.0`) | `c:\Users\sam20\node_modules\playwright` | Runs headless Google Chrome `156.0.0.0` with SwiftShader/ANGLE WebGL2 support and CDP performance telemetry inside `j-spa` tests against isolated temporary SQLite databases. |
| `node:sqlite` + built-in Node 24 crypto | Node `v24.18.1` (`MIT`) | Runtime built-in | Preserves zero-dependency production runtime footprint (`CONTRACT.md`). |

---

## 3. Created Project-Specific Workspace Skills & Persistent Rules
- **Workspace Skills (`c:\Users\sam20\j-spa\.agents\skills\`):**
  1. `jspa-visual-quality/SKILL.md` — Botanical Editorial Luxury direction, image authenticity, anti-clutter gates.
  2. `jspa-saudi-copywriting/SKILL.md` — Modern Standard Arabic standards, zero Egyptian colloquialisms, `<bdi>` RTL numeric rules, and **تنسيق جلسات المناسبات** enforcement.
  3. `jspa-nail-rendering/SKILL.md` — Anatomical fidelity, Option A vs Option B prototype gating, 5 nail shapes/3 lengths/4 tones/finishes calibration, and mobile sticky preview criteria.
  4. `jspa-browser-qa/SKILL.md` — Multi-width (`360–1440px`) RTL/LTR Chrome Playwright verification, `axe-core` WCAG gates, and Core Web Vitals capture.
  5. `jspa-security-regression/SKILL.md` — Loyalty halala math, verification ownership, CSRF/Origin checks, role least privilege, and review moderation regression guardrails.
- **Persistent Project Rules:**
  - `c:\Users\sam20\j-spa\AGENTS.md` (standalone directory rules, < 24 KB, no frontmatter).
  - `c:\Users\sam20\j-spa\.agents\rules\visual-quality-gate.md` (separate visual vs functional gates, screenshot archiving under `screenshots/quality-recovery/`, image license logging).

---

## 4. Activated Specialized Subagent Roles
Configured via `define_subagent` for modular workflow execution and independent critique:
- `visual-creative-director` (design direction & image realism)
- `anatomy-nail-specialist` (hand anatomy & manicure shaders/compositing)
- `brand-illustration-motion-designer` (J Petals floral alternatives & motion)
- `saudi-arabic-editor` (Saudi Fusha & RTL typography readability)
- `ux-conversion-specialist` (discovery, mobile UX & flow friction)
- `frontend-architect` (CSS rhythm, modular JS, strict CSP compliance)
- `backend-security-engineer` (SQLite, booking, loyalty, auth, least privilege)
- `browser-a11y-qa` (Playwright, `axe-core`, Chrome performance telemetry)
- `independent-visual-auditor` (**READ-ONLY** — `EnableWriteTools: false`; evaluates rendered PNG screenshots strictly without trusting implementation claims)

---

## 5. MCP Servers, Built-in Tools & Unavailable Limitations

| Capability | Status | Honest Observed Scope / Limitation |
|---|---|---|
| MCP Servers (`~/.gemini/config/mcp_config.json`) | Empty / None Connected | File verified empty (`0 bytes`). Marketplace lists `antigravity-plugins-official/plugin/chrome-devtools-plugin`, left uninstalled cleanly per plugin-card policy; headless Google Chrome `156.0.0.0` + Playwright + `12ui scene capture` are operational directly. |
| Hosted `12ui` commands (`draft`, `improve`, `branch`, `workspace`) | **Unavailable (Unauthenticated)** | Prompts for interactive sign-in at `https://12ui.com/connect-cli` (`auth status` unauthenticated). Excluded from hosted calls; only unauthenticated **local** `12ui scene` tools and free `12ui corpus inspire` retrieval are used cleanly. |
| `image-generator` subagent (`gemini-3.1-flash-image`) | **Temporarily Exhausted (`HTTP 429`)** | Direct quota probe failed at recovery start: *"You have exhausted your capacity on this model. Your quota will reset after 1h40m7s"* (`2026-11-10T16:51:59Z`). Recovery sources properly licensed free open photography (`CC0` / `CC BY` Wikimedia Commons / curated open beauty photography) + high-precision WebGL/Three.js (`12ui scene` bundled `r186`) / HD Canvas studio compositing — with every external media license logged in `docs/audits/IMAGE-QUALITY-AUDIT.md`. |
| Paid third-party APIs / CDN runtime scripts | **Disallowed & Unused** | Zero paid services, SMS OTP, WhatsApp Business API, or external CDN scripts (`script-src 'self'`). |

