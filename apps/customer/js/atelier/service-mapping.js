// Deterministic Nail Atelier -> J Beauty service & artistry complexity mapping
// Never alters persisted prices or creates unauthorized charges; informs customer & booking notes accurately.

export function evaluateAtelierServiceMatch(cfg = {}) {
  const shape = cfg.shape || 'almond';
  const length = cfg.length || 'medium';
  const french = cfg.french_style || 'none';
  const tipHex = String(cfg.tip_color || '#F5EFE8').toUpperCase();
  const finish = cfg.finish || 'gloss';
  const accent = cfg.accent || 'none';

  const hasCustomColorTip = french === 'colored' || (french === 'classic' && tipHex !== '#F5EFE8');
  const hasArtistryFrench = french === 'micro' || french === 'ombre' || hasCustomColorTip;
  const has3DOrFoilArt = accent !== 'none';
  const isSculptedLong = length === 'long';

  // Primary catalog service mapping aligned with J Beauty catalog & duration realism
  let primaryServiceId = 'gel-polish';
  if (hasArtistryFrench || (french !== 'none' && (has3DOrFoilArt || isSculptedLong)) || has3DOrFoilArt) {
    primaryServiceId = 'colored-french';
  } else if (french !== 'none') {
    primaryServiceId = 'french-gel';
  }

  // Complexity classification for accurate customer expectations & prep guidance
  let complexityKey = 'essential';
  let extraMinutes = 0;
  const highlightsAr = [];
  const highlightsEn = [];

  if (french === 'ombre') {
    highlightsAr.push('تدرج أومبري احترافي');
    highlightsEn.push('Airbrushed Baby-Boomer Ombre blend');
    extraMinutes += 10;
  } else if (french === 'micro') {
    highlightsAr.push('مايكرو فرنش دقيق الحافة');
    highlightsEn.push('Precision Micro-French perimeter tip');
    extraMinutes += 5;
  } else if (french !== 'none') {
    highlightsAr.push('رسم خط الابتسامة الفرنسي');
    highlightsEn.push('Precision French smile-line artistry');
  }

  if (accent === 'gold_foil') {
    highlightsAr.push('إضافة رقائق الذهب الوردي');
    highlightsEn.push('Rose-gold leaf foil placement');
    extraMinutes += 10;
  } else if (accent === 'pearl_dot') {
    highlightsAr.push('تثبيت حبة اللؤلؤ البارزة');
    highlightsEn.push('3D pearl cabochon sealing');
    extraMinutes += 10;
  } else if (accent === 'floral_dot') {
    highlightsAr.push('رسم زهرة ناعمة يدوياً');
    highlightsEn.push('Hand-painted botanical blossom accent');
    extraMinutes += 10;
  }

  if (finish === 'pearl') {
    highlightsAr.push('تغطية لؤلؤية عاكسة للضوء');
    highlightsEn.push('Iridescent glazed-pearl chrome buff');
    extraMinutes += 5;
  } else if (finish === 'matte') {
    highlightsAr.push('طبقة مخملية مطفية');
    highlightsEn.push('Velvet soft-touch matte top coat');
  }

  if (isSculptedLong) {
    highlightsAr.push('تنسيق طول ممتد يتطلب طولاً طبيعياً مناسباً أو إضافة إطالة متفَق عليها');
    highlightsEn.push('Long sculptural contour suited to natural length or pre-confirmed extension');
    extraMinutes += 15;
  }

  if (extraMinutes >= 20 || (has3DOrFoilArt && isSculptedLong)) {
    complexityKey = 'couture';
  } else if (extraMinutes >= 5 || french !== 'none' || has3DOrFoilArt) {
    complexityKey = 'signature';
  }

  const tierLabels = {
    essential: { ar: 'عناية جل أساسية', en: 'Essential Gel Tier' },
    signature: { ar: 'إطلالة فرنش وفن أظافر', en: 'Signature Artistry Tier' },
    couture: { ar: 'تصميم أظافر متكامل بتفاصيل فاخرة', en: 'Custom Couture Artistry' },
  };

  return {
    primaryServiceId,
    complexityKey,
    tierAr: tierLabels[complexityKey].ar,
    tierEn: tierLabels[complexityKey].en,
    extraMinutes,
    highlightsAr,
    highlightsEn,
    shape,
    length,
    prepAdvisoryAr: isSculptedLong
      ? 'في حال الحاجة لإطالة إضافية أو إزالة جل سابق، يُرجى إضافتهما في الملاحظات أو اختيار إزالة الجل أدناه.'
      : 'إذا كانت لديك طبقة جل سابقة، يمكنك إرفاق خدمة إزالة الجل في خطوة الحجز.',
    prepAdvisoryEn: isSculptedLong
      ? 'If soft gel length building or soak-off removal is needed, include it cleanly in your booking note or add-on.'
      : 'Wearing existing gel? Easily toggle Gel Removal alongside this booking.',
  };
}

