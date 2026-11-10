---
name: jspa-visual-quality
description: Enforces J SPA Botanical Editorial Luxury visual direction, editorial page rhythm, typography scaling, service-image authenticity, and independent visual rejection gates across Arabic RTL and English LTR viewports.
---

# J SPA Visual Quality Skill

## Visual Identity Standard
- **Brand:** J SPA — Women's Home Spa & Beauty Services in Al Madinah Al Munawwarah (`لحظتكِ الخاصة… في راحة بيتكِ`).
- **Aesthetic:** Quiet Luxury × Botanical Editorial Design — calm ivory (`#FBF7F4`), linen cream (`#F4EBE6`), deep plum charcoal (`#503C45` / `#352F32`), sage moss (`#A7B79F` / `#607257`), dusty pink (`#D9B7C0`), and brushed rose-gold (`#D4AF7C`).
- **Anti-Patterns (Automatic Rejection):**
  - Generic stacked border-radius containers without editorial rhythm or breathing room.
  - Cartoon vector stickers, flat radial blob shapes, or geometric paper-cutout anatomy masquerading as botanical luxury art or realistic hands.
  - Irrelevant placeholder photography (e.g., generic bottles or spas pasted onto specialized gel removal, lymphatic massage, or manicure pages).
  - Cramped Arabic body text below `15px–16px` (`< 0.95rem`) or tight leading (`line-height < 1.6` for Arabic prose).

## Mandatory Pre-Merge Visual Checks
1. Render desktop (`1440px`), tablet (`768px`), and mobile (`360px`, `390px`) in both Arabic (`RTL`) and English (`LTR`).
2. Inspect tight cropped views of hero focal imagery, every service thumbnail, the **Nail Atelier** hand/nails canvas, the **J Petals Club** botanical focal graphic, and mobile form controls.
3. Verify zero clipping, zero text overlap, zero floating badges covering focal subjects, WCAG AA text contrast (`>= 4.5:1`), and smooth visual flow without dead voids.
4. Submit screenshots separately to the **Independent Visual Quality Auditor** without implementation justification. If any graphic looks artificial or weak, reject and replace the rendering strategy.

