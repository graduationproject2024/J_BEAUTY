# Visual & Release Quality Gate Rules

- Reject and replace any UI component whose rendered appearance looks cartoonish, distorted, visually detached, blurry, text-heavy inside tight cards, or misaligned across RTL/LTR viewports.
- Separate **Functional Acceptance** (API + workflow tests) from **Visual Acceptance** (cropped asset & composition screenshot inspection). Both must PASS independently before closing a milestone.
- Archive pre-recovery screenshots in `screenshots/quality-recovery/before/` and store every verified post-change capture in `screenshots/quality-recovery/after/` and `screenshots/quality-recovery/comparisons/`.
- Whenever external visual asset licensing is used, record author, source, license terms, and modifications in `docs/audits/IMAGE-QUALITY-AUDIT.md`.

