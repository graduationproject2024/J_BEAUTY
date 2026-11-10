---
name: jspa-browser-qa
description: Governs headless Google Chrome Playwright verification, axe-core WCAG accessibility scans, WebGL/performance checks, RTL/LTR layout checks, and before/after screenshot comparisons for J SPA.
---

# J SPA Browser & Accessibility QA Skill

## Execution Procedure
1. Always test against isolated temporary SQLite databases — never mutate operational `data/jspa.sqlite` in automated tests.
2. Run Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`) across all 6 required widths: `360, 390, 430, 768, 1024, 1440 px` in both `/ar/` RTL and `/en/` LTR.
3. Assert on every route:
   - `document.documentElement.scrollWidth <= window.innerWidth + 1`
   - Zero console errors, uncaught page errors, failed network asset loads, or broken `<img>` (`naturalWidth === 0`)
   - Valid `document.documentElement.dir` (`rtl` for Arabic, `ltr` for English) and readable computed Arabic body font size (`>= 15px`)
   - Non-empty visible `<h1>` and zero accidental `404` fallback renders on known routes
   - Zero forbidden colloquial strings or `حجز جماعي` / `Beauty Together` leakage
   - Interactive canvas/WebGL checks on `/atelier` verifying real pixels draw cleanly and respond to control clicks without WebGL context loss
4. Run `@axe-core/playwright` (`wcag2a`, `wcag2aa`, `wcag21aa`) across public pages, interactive configurators, forms, and dialogs; record and resolve all critical/serious violations.
5. Capture performance metrics (`DOMContentLoaded`, `load`, `FCP`, `LCP`, `CLS`, JS transfer bytes) via `PerformanceObserver` / Chrome CDP in headless runs.
6. Capture structured screenshots under `screenshots/quality-recovery/{before,after,comparisons}` and visually inspect every file with `read_file`.

