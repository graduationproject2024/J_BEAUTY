const TITLES = {
  '': ['سبا نسائي منزلي في المدينة المنورة', 'Women’s Home Spa in Madinah'],
  services: ['خدمات المساج والعناية بالأظافر والجل', 'Massage, Nail Care & Gel Services'],
  packages: ['باقات السبا المنزلي في المدينة المنورة', 'Home Spa Packages in Madinah'],
  studio: ['استوديو J لاختيار طقسكِ المناسب', 'J Ritual Studio — Personalized Discovery'],
  atelier: ['أتيليه الأظافر التفاعلي | J Nail Atelier', 'J Nail Atelier — Interactive Nail Customizer'],
  lookbook: ['معرض الإطلالات والأناقة | Beauty Lookbook', 'Beauty Lookbook — Curated Styles'],
  occasions: ['تنسيق جلسات المناسبات | J SPA', 'Occasion Experiences | J SPA'],
  gifts: ['أهدي لحظة عناية | قسائم الإهداء', 'Gift a Ritual — Digital Spa Gift Request'],
  petals: ['نادي بتلات J للولاء', 'J Petals Club Loyalty Program'],
  about: ['عن J SPA — سبا منزلي للسيدات', 'About J SPA — Women’s Home Spa'],
  contact: ['تواصلي معنا ومناطق الخدمة بالمدينة', 'Contact & Madinah Service Areas'],
  faq: ['الأسئلة الشائعة عن الحجز المنزلي', 'Frequently Asked Questions'],
  reviews: ['تجارب وآراء العميلات', 'Verified Customer Reviews'],
  policies: ['سياسة الحجز والمواعيد', 'Booking Policies'],
  privacy: ['سياسة الخصوصية وحماية البيانات', 'Privacy Policy'],
  terms: ['الشروط والأحكام', 'Terms & Conditions'],
};

const APP_ONLY_ROUTES = new Set([
  'home',
  'booking',
  'account',
  'passport',
  'bookings',
  'rewards',
  'loyalty',
  'admin',
  'login',
  'register',
  'recovery',
  'reset',
]);

const DESCRIPTIONS = {
  '': [
    'J SPA — سبا نسائي منزلي في المدينة المنورة. مساج استرخائي وعلاجي، منيكير وبديكير منزلي، أتيليه الأظافر التفاعلي، وخدمات الجل في راحة بيتكِ.',
    'J SPA — Women’s home spa in Al Madinah Al Munawwarah. At-home massage rituals, manicure, pedicure, J Nail Atelier, and gel care with personal confirmation.',
  ],
  services: [
    'تصفحي 13 خدمة منزلية للسيدات في المدينة المنورة: مساج استرخائي، مساج الأحجار الساخنة، منيكير وبديكير كلاسيك، وخدمات الجل المنزلية.',
    'Browse 13 women-only home spa services in Madinah: relaxation & hot stone massage, classic manicure & pedicure, and glossy gel services.',
  ],
  packages: [
    'باقات سبا منزلي مصممة بتناغم في المدينة المنورة: باقة إشراقة J، لحظة هدوء، طقوس الورد، وباقة J المميزة.',
    'Curated home spa packages in Madinah: J Nail Glow, J Serenity, J Rose Ritual, and J Signature.',
  ],
  studio: [
    'أجيبي عن 4 أسئلة بسيطة في استوديو J للوصول إلى الطقوس أو الباقة الأنسب لوقتكِ وميزانيتكِ.',
    'Answer 4 quick questions in J Ritual Studio to find catalog-verified rituals aligned with your time and budget.',
  ],
  atelier: [
    'صممي شكل الأظافر والطول واللون والفرنش في أتيليه J التفاعلي قبل حجز موعدكِ المنزلي في المدينة المنورة.',
    'Explore nail shapes, lengths, shades, and French tip styles in J Nail Atelier before requesting your home visit in Madinah.',
  ],
  lookbook: [
    'استلهمي إطلالات أظافر وجلسات سبا منزلية منتقاة بعناية من J SPA.',
    'Browse curated home spa and nail inspiration in the J SPA Beauty Lookbook.',
  ],
  occasions: [
    'اطلبي تنسيق جلسات العناية والسبا للمناسبات في المدينة المنورة مع مراجعة السعة وتأكيد الفريق.',
    'Coordinate bespoke women’s home spa and beauty appointments for special occasions in Madinah with manual staff scheduling.',
  ],
  gifts: [
    'اختاري خدمة أو باقة لإهدائها لمن تحبين مع تنسيق يدوي متكامل من فريق J SPA.',
    'Prepare a personal digital spa gift request for a loved one with transparent manual staff confirmation.',
  ],
  petals: [
    'نادي بتلات J: اجمعي البتلات بعد زياراتكِ المكتملة والمدفوعة واستبدليها بمكافآت خصم على مواعيدكِ القادمة.',
    'J Petals Club: earn petals after completed, staff-verified paid visits and redeem rewards on eligible future bookings.',
  ],
  reviews: [
    'آراء وتجارب حقيقية موثقة من عميلات J SPA في المدينة المنورة بعد مراجعتها واعتمادها.',
    'Verified customer reviews connected to completed J SPA visits in Madinah.',
  ],
  about: [
    'تعرّفي على J SPA: تجربة سبا نسائي منزلي هادئة في المدينة المنورة بتفاصيل مدروسة وخصوصية تامة.',
    'Discover J SPA: quiet luxury home spa care exclusively for women in Madinah.',
  ],
  contact: [
    'تواصلي مع فريق J SPA في المدينة المنورة للاستفسار عن مواعيد السبا المنزلي وأحياء الخدمة.',
    'Connect with J SPA in Madinah for at-home appointments and approved service neighborhoods.',
  ],
  faq: [
    'إجابات واضحة حول طلبات الحجز المنزلي، التأكيد اليدوي عبر واتساب، توثيق الحساب، ونادي بتلات J.',
    'Answers on home spa appointment requests, manual WhatsApp confirmation, phone verification, and J Petals Club.',
  ],
  policies: [
    'سياسة طلب المواعيد المنزلية والتأكيد الشخصي والتعديل والإلغاء في J SPA المدينة المنورة.',
    'J SPA home appointment request, manual confirmation, rescheduling, and service policies.',
  ],
  privacy: [
    'سياسة الخصوصية وحماية البيانات الشخصية في منصة J SPA للسبا المنزلي.',
    'J SPA privacy policy and personal data protection practices.',
  ],
  terms: [
    'الشروط والأحكام المنظمة لخدمات J SPA المنزلية ونادي بتلات J.',
    'Terms and conditions governing J SPA home services and J Petals Club.',
  ],
};

const escape = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);

export function publicOrigin() {
  try {
    const url = new URL(process.env.PUBLIC_ORIGIN);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
  } catch {}
  return '';
}

export function publicRoutes(services = []) {
  return [
    ...Object.keys(TITLES),
    ...services.filter((service) => service.active).map((service) => `services/${service.id}`),
  ];
}

export function isKnownAppRoute(pathname, services = []) {
  if (pathname === '/') return true;
  if (!/^\/(ar|en)(\/|$)/.test(pathname)) return false;
  const route = pathname.split('/').slice(2).join('/').replace(/\/$/, '');
  if (Object.hasOwn(TITLES, route) || APP_ONLY_ROUTES.has(route)) return true;
  return services.some((item) => item.active && route === `services/${item.id}`);
}

function buildSsrBody(lang, route, services, packages) {
  const isAr = lang === 'ar';
  const service = services.find((s) => s.active && route === `services/${s.id}`);

  if (service) {
    const title = isAr ? service.name_ar : service.name_en;
    const desc = isAr ? service.description_ar : service.description_en;
    const unit = isAr ? 'ر.س' : 'SAR';
    const minLabel = isAr ? 'دقيقة' : 'min';
    const cta = isAr ? 'اطلبي هذه الخدمة' : 'Request this ritual';
    return `<main id="main" class="wrap ssr-shell"><div class="page-head"><span class="eyebrow">J SPA · MADINAH</span><h1>${escape(title)}</h1><p>${escape(desc)}</p><p>${escape(service.duration)} ${minLabel} · ${escape(service.price)} ${unit}</p><a class="btn" href="/${lang}/booking?service=${escape(service.id)}">${cta}</a></div></main>`;
  }

  if (route === 'services') {
    const heading = isAr ? 'طقوس العناية بكِ في المنزل' : 'Home Spa Rituals & Services';
    const items = services
      .filter((s) => s.active)
      .map(
        (s) =>
          `<article class="card"><h2><a href="/${lang}/services/${escape(s.id)}">${escape(isAr ? s.name_ar : s.name_en)}</a></h2><p>${escape(isAr ? s.description_ar : s.description_en)}</p></article>`,
      )
      .join('');
    return `<main id="main" class="wrap ssr-shell"><div class="page-head"><h1>${heading}</h1></div><div class="grid">${items}</div></main>`;
  }

  if (route === 'packages') {
    const heading = isAr ? 'باقات السبا المنزلي' : 'Curated Home Spa Packages';
    const items = packages
      .filter((p) => p.active)
      .map(
        (p) =>
          `<article class="package"><h2>${escape(isAr ? p.name_ar : p.name_en)}</h2><p>${escape(p.price)} ${isAr ? 'ر.س' : 'SAR'}</p></article>`,
      )
      .join('');
    return `<main id="main" class="wrap ssr-shell"><div class="page-head"><h1>${heading}</h1></div><div class="grid two">${items}</div></main>`;
  }

  if (Object.hasOwn(TITLES, route)) {
    const h1 =
      route === '' || route === 'home'
        ? isAr
          ? 'لحظتكِ الخاصة… في راحة بيتكِ'
          : 'Your Moment of Beauty, At Home.'
        : TITLES[route][isAr ? 0 : 1];
    const lead = DESCRIPTIONS[route]?.[isAr ? 0 : 1] || '';
    const cta = isAr ? 'احجزي موعدكِ' : 'Book your moment';
    return `<main id="main" class="wrap ssr-shell"><div class="page-head"><span class="eyebrow">J SPA · MADINAH</span><h1>${escape(h1)}</h1><p>${escape(lead)}</p><a class="btn" href="/${lang}/booking">${cta}</a></div></main>`;
  }

  return '';
}

function buildStructuredData(base, lang, route, services, service) {
  const safeJson = (obj) =>
    `<script type="application/ld+json">${JSON.stringify(obj).replaceAll('<', '\\u003c')}</script>`;

  if (route === '') {
    const org = {
      '@context': 'https://schema.org',
      '@type': 'HealthAndBeautyBusiness',
      name: 'J SPA',
      description:
        lang === 'ar'
          ? 'سبا نسائي منزلي في المدينة المنورة يقدم جلسات المساج والعناية بالأظافر والجل في راحة منزلكِ.'
          : 'Women-only home spa in Al Madinah Al Munawwarah offering massage, nail care, and gel rituals at home.',
      areaServed: {
        '@type': 'City',
        name: 'Al Madinah Al Munawwarah',
      },
      priceRange: '50 - 469 SAR',
      ...(base ? { url: `${base}/${lang}/` } : {}),
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: lang === 'ar' ? 'خدمات J SPA المنزلية' : 'J SPA Home Services',
        itemListElement: services
          .filter((s) => s.active)
          .map((s) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: lang === 'ar' ? s.name_ar : s.name_en,
            },
            price: s.price,
            priceCurrency: 'SAR',
          })),
      },
    };
    return safeJson(org);
  }

  if (service) {
    const svcSchema = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: lang === 'ar' ? service.name_ar : service.name_en,
      description: lang === 'ar' ? service.description_ar : service.description_en,
      provider: {
        '@type': 'HealthAndBeautyBusiness',
        name: 'J SPA',
        areaServed: 'Al Madinah Al Munawwarah',
      },
      offers: {
        '@type': 'Offer',
        price: service.price,
        priceCurrency: 'SAR',
      },
    };
    return safeJson(svcSchema);
  }

  return '';
}

export function pageMetadata(html, pathname, services = [], packages = []) {
  const lang = pathname.split('/')[1] === 'en' ? 'en' : 'ar';
  const rawRoute = pathname.split('/').slice(2).join('/').replace(/\/$/, '');
  const route = rawRoute === 'home' ? '' : rawRoute;
  const service = services.find((item) => item.active && route === `services/${item.id}`);
  const known = isKnownAppRoute(pathname, services);

  const title = known
    ? service?.[`name_${lang}`] ??
      (Object.hasOwn(TITLES, route) ? TITLES[route][lang === 'ar' ? 0 : 1] : TITLES[''][lang === 'ar' ? 0 : 1])
    : lang === 'ar'
      ? 'الصفحة غير موجودة'
      : 'Page not found';

  const description = known
    ? service?.[`description_${lang}`] ??
      DESCRIPTIONS[route]?.[lang === 'ar' ? 0 : 1] ??
      DESCRIPTIONS[''][lang === 'ar' ? 0 : 1]
    : DESCRIPTIONS[''][lang === 'ar' ? 0 : 1];

  const base = publicOrigin();
  const indexable = Boolean(Object.hasOwn(TITLES, route) || service);
  const routeSuffix = route ? route : '';
  const links =
    base && indexable
      ? `<link rel="canonical" href="${escape(`${base}/${lang}/${routeSuffix}`)}"><link rel="alternate" hreflang="ar-SA" href="${escape(`${base}/ar/${routeSuffix}`)}"><link rel="alternate" hreflang="en-SA" href="${escape(`${base}/en/${routeSuffix}`)}"><link rel="alternate" hreflang="x-default" href="${escape(`${base}/ar/${routeSuffix}`)}">`
      : '';

  const ogImage = service?.image || '/assets/images/hero-sanctuary.webp';
  const ogTags =
    `<meta property="og:type" content="website">` +
    `<meta property="og:site_name" content="J SPA">` +
    `<meta property="og:locale" content="${lang === 'ar' ? 'ar_SA' : 'en_SA'}">` +
    `<meta property="og:title" content="J SPA | ${escape(title)}">` +
    `<meta property="og:description" content="${escape(description)}">` +
    `<meta property="og:image" content="${escape((base || '') + ogImage)}">` +
    `<meta name="twitter:card" content="summary_large_image">`;

  const structured = indexable ? buildStructuredData(base, lang, route, services, service) : '';
  const ssrShell = known ? buildSsrBody(lang, route, services, packages) : '';

  let out = html
    .replace('<html lang="ar" dir="rtl">', `<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">`)
    .replace(/<title>[^<]*<\/title>/, () => `<title>J SPA | ${escape(title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*">/,
      () => `<meta name="description" content="${escape(description)}">`,
    )
    .replace(
      '</head>',
      () => `${links}${ogTags}${structured}${indexable ? '' : '<meta name="robots" content="noindex">'}</head>`,
    );

  if (ssrShell) {
    out = out.replace('<div id="app"></div>', () => `<div id="app">${ssrShell}</div>`);
  }

  return out;
}
