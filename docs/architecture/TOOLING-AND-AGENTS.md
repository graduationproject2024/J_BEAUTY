# Tooling, Skills & Agents Inventory — J Beauty Platform Separation

**Branch:** `feat/platform-separation-ops-portal` (branched from PR #1 HEAD `fix/j-beauty-brand-navigation-loyalty-clarity` @ `39ba646`)  
**Audit Date:** 2026-11-11

## 1. Runtime & Platform Stack
| Tool / Runtime | Verified Status | Purpose & Security Notes |
|---|---|---|
| **Node.js `v24.18.1`** (`node:http`, `node:sqlite`, `node:crypto`) | Verified present | Single-process runtime hosting separated HTTP listeners (`:3000` Customer, `:3100` Operations), WAL-mode SQLite, native Argon2id, SHA-256, AES-256-GCM, and RFC 6238 HMAC-SHA1 TOTP with zero third-party npm runtime dependencies (`CONTRACT.md`). |
| **Google Chrome + Playwright + `@axe-core/playwright`** | Verified present (`chrome: true`, `playwright: true`, `axe: true`) | Dev-only E2E browser testing across `360, 390, 430, 768, 1024, 1440px` RTL/LTR and automated WCAG 2.1/2.2 AA scans against isolated temporary SQLite databases. |

## 2. Discovered & Activated Skills
- **Workspace Skills (`.agents/skills/` & `.agents/rules/visual-quality-gate.md`):**
  - `jspa-security-regression`: enforces halala accounting, Argon2id/CSRF/Origin checks, customer isolation, and role least privilege.
  - `jspa-browser-qa`: enforces multi-viewport (`360–1440px`) RTL/LTR browser verification, `@axe-core/playwright`, and performance telemetry.
  - `jspa-visual-quality`: enforces Botanical Editorial Luxury visual quality criteria.
  - `jspa-nail-rendering`: enforces anatomical registration, cuticle integration, lighting, and finish realism across all Nail Atelier combinations.
  - `jspa-saudi-copywriting`: enforces contemporary Saudi Modern Standard Arabic tailored for Al Madinah Al Munawwarah (zero Egyptian colloquialisms, `<bdi>` numeric wrapping, zero misleading clinical claims).
- **Global Engineering & Workflow Skills:**
  - `migration`: backward-compatible additive SQLite schema upgrade, backup verification, and rollback proof.
  - `safe-refactor` & `lean-build`: extracting separated Customer (`apps/customer`) and Operations (`apps/staff`) shells cleanly around existing business logic without breaking invariants.
  - `verify-and-stop`: independent gate validation prior to sign-off.
  - `12ui-design`: `SKILL.md` read; hosted/CLI `@12ui/design` check confirmed **not installed** in environment (`Get-Command 12ui` missing).

## 3. Plugins & Subagents
| Agent / Plugin | Status | Role / Disposition |
|---|---|---|
| `independent-visual-auditor` | Available (`EnableWriteTools: false`) | Read-only visual inspector reviewing desktop/mobile renders for clipping, overflow, hierarchy, contrast, Nail Atelier realism, and Operations dashboard clarity. |
| `research` / `self` / `image-generator` | Available | Read-only audit/synthesis and studio asset support where visual retouching is justified. |
| `railway_mcp` plugin | Waiting user sign-in | Not used; no unauthorized remote deployment or authentication bypass performed. |
| `12ui` CLI / MCP | Unavailable locally | Not installed or fabricated; UI design relies on repository design tokens, editorial hierarchy, Playwright visual captures, and read-only independent review. |

## 4. Agent Specialization Map (Sequential / Coordinated Ownership)
Because platform separation splits `server.mjs`, `server/*`, `public/` -> `apps/customer/` + `apps/staff/` + `packages/shared/`, work proceeds with strict layer ownership and read-only independent review checkpoints for Visual Quality, Security/IAM, and E2E validation.

