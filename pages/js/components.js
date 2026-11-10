import { $, api, descOf, esc, href, minutes, money, nameOf, num, page, safeURL, state, t, toast } from './state.js';
import { renderSignatureBloomSVG } from './motion.js';

export function monogramSvg(cls = 'brand-mark') {
  return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" aria-hidden="true">
    <circle cx="48" cy="48" r="44" stroke="#D4AF7C" stroke-width="1.6"/>
    <path d="M48 12C54 22 54 32 48 40C42 32 42 22 48 12Z" fill="#D9B7C0" fill-opacity="0.45" stroke="currentColor" stroke-width="1.2"/>
    <path d="M18 36C27 34 36 39 40 46C31 48 22 44 18 36Z" fill="#A7B79F" fill-opacity="0.45" stroke="currentColor" stroke-width="1.2"/>
    <path d="M78 36C69 34 60 39 56 46C65 48 74 44 78 36Z" fill="#A7B79F" fill-opacity="0.45" stroke="currentColor" stroke-width="1.2"/>
    <path d="M53 34V61C53 70.5 46.5 76 38.5 76C32.5 76 28.5 72.5 28.5 68C28.5 64.5 31 62 34 62C36.8 62 38.5 64 38.5 66.2" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="53" cy="25" r="2.6" fill="#D4AF7C"/>
  </svg>`;
}

export function icon(kind) {
  const icons = {
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    spark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z"/><path d="M9 12l2 2 4-4"/></svg>',
    user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    heart: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    star: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><polygon points="12 2.5 15.09 8.76 22 9.77 17 14.64 18.18 21.5 12 18.26 5.82 21.5 7 14.64 2 9.77 8.91 8.76 12 2.5"/></svg>',
    calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 13l4 4L19 7"/></svg>',
  };
  return icons[kind] || '';
}

export function header() {
  const cur = page();
  const navLinks = [
    ['home', 'الرئيسية', 'Home'],
    ['services', 'الخدمات', 'Services'],
    ['packages', 'الباقات', 'Packages'],
    ['atelier', 'أتيليه الأظافر', 'Nail Atelier'],
    ['studio', 'استوديو الاختيار', 'Ritual Studio'],
    ['petals', 'بتلات J', 'J Petals'],
  ];
  const accountRoute = state.user
    ? ['owner', 'employee'].includes(state.user.role)
      ? 'admin'
      : 'account'
    : 'login';

  return `
    <div class="announcement">
      ${t(
        'معاينة واجهة J SPA على GitHub Pages · سبا نسائي منزلي في المدينة المنورة (للحجوزات الفعلية يلزم خادم Node.js)',
        'J SPA GITHUB PAGES PREVIEW · AL MADINAH WOMEN’S HOME SPA (LIVE BOOKINGS REQUIRE NODE.JS SERVER)',
      )}
    </div>
    <div class="header-shell">
      <header class="wrap header">
        <a class="brand" href="${href('home')}">
          ${monogramSvg()}
          <span class="brand-wordmark">
            <strong>J SPA</strong>
            <small>${t('سبا نسائي منزلي · المدينة المنورة', 'WOMEN’S HOME SPA · AL MADINAH')}</small>
          </span>
        </a>
        <nav class="nav" id="nav" aria-label="${t('التنقل الرئيسي', 'Main navigation')}">
          ${navLinks
            .map(
              ([r, ar, en]) =>
                `<a href="${href(r)}" class="${cur === r ? 'active' : ''}">${t(ar, en)}</a>`,
            )
            .join('')}
          <div class="nav-mobile-cta">
            <a class="btn" href="${href('booking')}">${t('احجزي موعدكِ الآن', 'Book your moment')}</a>
          </div>
        </nav>
        <div class="header-tools">
          <button class="lang" id="language" type="button" aria-label="${t('Switch to English', 'التبديل للعربية')}">
            ${t('EN', 'عربي')}
          </button>
          <a class="account-pill" href="${href(accountRoute)}" aria-label="${t('حسابي وجواز الجمال', 'Beauty Passport')}">
            ${icon('user')}
            <span>${state.user ? esc(state.user.name.split(' ')[0]) : t('جواز الجمال', 'Account')}</span>
          </a>
          <a class="btn small header-book-btn" href="${href('booking')}">${t('احجزي موعدكِ', 'Book')}</a>
          <button class="menu" id="menu" type="button" aria-label="${t('فتح القائمة', 'Toggle menu')}" aria-expanded="false" aria-controls="nav">
            ${icon('menu')}
          </button>
        </div>
      </header>
    </div>
  `;
}

export function footer() {
  const s = state.catalog.settings || {};
  const waDigits = String(s.business_phone || '').replace(/\D/g, '');
  const socialLinks = ['instagram', 'tiktok']
    .filter((k) => safeURL(s[k]))
    .map(
      (k) =>
        `<a href="${esc(s[k])}" target="_blank" rel="noopener noreferrer">${k === 'instagram' ? 'Instagram' : 'TikTok'}</a>`,
    )
    .join('');

  return `
    <footer class="footer">
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <a class="brand" href="${href('home')}">
              ${monogramSvg()}
              <span class="brand-wordmark">
                <strong>J SPA</strong>
                <small>${t('سبا نسائي منزلي · المدينة المنورة', 'WOMEN’S HOME SPA · AL MADINAH')}</small>
              </span>
            </a>
            <p>${t('عناية منزلية نسائية فاخرة في المدينة المنورة: خدمات المساج والعناية بالأظافر والجل في راحة منزلكِ.', 'Quiet-luxury women’s home spa in Al Madinah: curated massage, nail care, and gel treatments delivered to your door.')}</p>
          </div>
          <div class="footer-links">
            <strong>${t('التجارب والخدمات', 'Experiences')}</strong>
            ${[
              ['services', 'جميع الخدمات (13)', 'All services (13)'],
              ['packages', 'الباقات', 'Packages'],
              ['atelier', 'أتيليه J للأظافر', 'J Nail Atelier'],
              ['studio', 'استوديو اختيار الخدمات', 'J Ritual Studio'],
              ['lookbook', 'معرض الإطلالات', 'Beauty Lookbook'],
              ['occasions', 'تنسيق جلسات المناسبات', 'Occasion Experiences'],
              ['gifts', 'أهدي لحظة عناية', 'Gift a Ritual'],
              ['petals', 'نادي بتلات J', 'J Petals Club'],
            ]
              .map(([r, ar, en]) => `<a href="${href(r)}">${t(ar, en)}</a>`)
              .join('')}
          </div>
          <div class="footer-links">
            <strong>${t('المساندة والسياسات', 'Care & Policies')}</strong>
            ${[
              ['booking', 'طلب موعد منزلي', 'Request appointment'],
              ['reviews', 'تجارب العميلات', 'Customer reviews'],
              ['faq', 'الأسئلة الشائعة', 'FAQ'],
              ['contact', 'تواصلي معنا', 'Contact'],
              ['policies', 'سياسة الحجز', 'Booking policies'],
              ['privacy', 'سياسة الخصوصية', 'Privacy policy'],
              ['terms', 'الشروط والأحكام', 'Terms & conditions'],
              ['admin', 'لوحة الفريق والإدارة', 'Staff access'],
            ]
              .map(([r, ar, en]) => `<a href="${href(r)}">${t(ar, en)}</a>`)
              .join('')}
            ${waDigits ? `<a href="https://wa.me/${esc(waDigits)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}
            ${socialLinks}
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} J SPA · ${t('المدينة المنورة، المملكة العربية السعودية', 'Al Madinah, Saudi Arabia')}</span>
          <span>${t('للسيدات فقط · التأكيد يتم يدوياً عبر الفريق', 'Women only · Manual staff confirmation')}</span>
        </div>
      </div>
    </footer>
  `;
}

export const head = (title, sub = '', crumbs = []) => `
  <div class="page-head">
    ${
      crumbs.length
        ? `<nav class="breadcrumbs" aria-label="Breadcrumb">${crumbs
            .map(([label, route], idx) =>
              route && idx < crumbs.length - 1
                ? `<a href="${href(route)}">${esc(label)}</a> <span aria-hidden="true">/</span>`
                : `<span>${esc(label)}</span>`,
            )
            .join(' ')}</nav>`
        : `<span class="eyebrow">J SPA · ${t('المدينة المنورة', 'MADINAH')}</span>`
    }
    <h1 tabindex="-1">${title}</h1>
    ${sub ? `<p class="muted">${sub}</p>` : ''}
  </div>
`;

export const provisional = () =>
  state.catalog.settings?.business_approved
    ? ''
    : `<div class="notice">${t(
        'الأسعار والباقات والوصف الحالي تقديرية وقابلة للتعديل لحين اعتمادها النهائي من إدارة J SPA. إرسال الطلب لا يعني تأكيد الموعد.',
        'Current prices, packages, and service details are provisional pending business approval. Submitting a request does not confirm an appointment.',
      )}</div>`;

export function serviceArt(s, cls = '') {
  const src =
    s?.image && /^(\/[^/]|https:\/\/)/.test(s.image)
      ? s.image
      : `/J_BEAUTY/public/assets/images/services/${s?.id || 'relaxation'}.webp`;
  const catLabel =
    s?.category === 'massage'
      ? t('المساج', 'Massage')
      : s?.category === 'nails'
        ? t('الأظافر', 'Nail care')
        : t('الجل', 'Gel');

  return `
    <div class="art ${cls}">
      <img src="${esc(src)}" alt="${esc(nameOf(s))}" loading="eager" decoding="async">
      <span class="service-badge">${catLabel}</span>
    </div>
  `;
}

export function serviceCard(s) {
  const isFav = state.favorites.includes(s.id);
  return `
    <article class="service-card" data-reveal>
      <div class="service-media-wrap">
        <a href="${href('services/' + s.id)}">${serviceArt(s)}</a>
        <button type="button" class="fav-btn ${isFav ? 'active' : ''}" data-fav-toggle="${esc(s.id)}" aria-label="${t('حفظ في المفضلة', 'Save to favorites')}" aria-pressed="${isFav}">
          ${icon('heart')}
        </button>
      </div>
      <div class="service-body">
        <h3><a href="${href('services/' + s.id)}">${esc(nameOf(s))}</a></h3>
        <p>${esc(descOf(s))}</p>
        <div class="card-meta">
          <span>${minutes(s.duration)}</span>
          <span>${money(s.price)}</span>
        </div>
        <div class="service-actions">
          <a class="btn small" href="${href('booking')}?service=${esc(s.id)}">${t('احجزي الخدمة', 'Book')}</a>
          <a class="btn small light" href="${href('services/' + s.id)}">${t('التفاصيل', 'Details')}</a>
        </div>
      </div>
    </article>
  `;
}

export function packageCard(p, i) {
  const svcs = (p.service_ids || [])
    .map((id) => state.catalog.services.find((s) => s.id === id))
    .filter(Boolean);
  const saving = Math.max(0, Number(p.original_total || 0) - Number(p.price || 0));
  const tagline = p[`tagline_${state.lang}`] || '';

  return `
    <article class="package" data-reveal>
      <div class="package-top">
        <span class="number">0${i + 1}</span>
        ${saving > 0 ? `<span class="saving-pill">${t(`توفير ${money(saving)}`, `Save ${money(saving)}`)}</span>` : ''}
      </div>
      <h3>${esc(nameOf(p))}</h3>
      ${tagline ? `<p class="muted">${esc(tagline)}</p>` : ''}
      <div class="package-items">
        ${svcs.map((s) => `<span class="package-chip">${esc(nameOf(s))}</span>`).join('')}
      </div>
      <div class="package-footer">
        <div>
          <p class="price">${money(p.price)} <del>${money(p.original_total)}</del></p>
          <small class="muted">${minutes(p.duration)}</small>
        </div>
        <a class="btn small" href="${href('booking')}?package=${esc(p.id)}">${t('اختاري الباقة', 'Choose package')}</a>
      </div>
    </article>
  `;
}

export function reviewAuthorName(r) {
  const raw = String(r?.display_name || '').trim();
  return !raw || raw === 'عميلة J SPA' || raw === 'عميلة موثقة'
    ? t('عميلة J SPA', 'J SPA Client')
    : raw;
}

function editableDisplayName(existing) {
  const raw = String(existing?.display_name || '').trim();
  return !raw || raw === 'عميلة J SPA' || raw === 'عميلة موثقة' ? '' : raw;
}

export function reviewsContent(reviews = [], fallbackAsTrust = false) {
  if (!reviews.length) {
    if (fallbackAsTrust) {
      return `
        <div class="trust-pillars" data-reveal>
          <div class="card">
            <span class="eyebrow">01</span>
            <h3>${t('خصوصية تامة للسيدات فقط', 'Women-Only Home Privacy')}</h3>
            <p class="muted">${t('جميع جلساتنا المنزلية تُقدّم في راحة بيتكِ بواسطة أخصائيات نسائيات فقط في المدينة المنورة.', 'Delivered solely for women inside the comfort and privacy of your home in Madinah.')}</p>
          </div>
          <div class="card">
            <span class="eyebrow">02</span>
            <h3>${t('نظافة وتعقيم فردي', 'Sanitized Preparation')}</h3>
            <p class="muted">${t('أدوات عناية مغلفة ونظيفة ومناشف مرتبة ومستلزمات متكاملة تصل مع كل زيارة.', 'Fresh linens and individually sanitized nail and spa instruments prepared for each visit.')}</p>
          </div>
          <div class="card">
            <span class="eyebrow">03</span>
            <h3>${t('تأكيد بشري ومكافآت صادقة', 'Personal Care & Real Loyalty')}</h3>
            <p class="muted">${t('لا توجد مراجعات منشورة بعد؛ تُنشر الآراء فقط بعد زيارة مكتملة ومراجعة الإدارة.', 'No reviews have been published yet; reviews appear strictly after verified completed visits.')}</p>
          </div>
        </div>
      `;
    }
    return `
      <div class="empty">
        <h3>${t('نترك المساحة لتجربتكِ الحقيقية', 'A space for genuine experiences')}</h3>
        <p class="muted">${t(
          'تُعرض هنا التقييمات المرتبطة بزيارات منزلية مكتملة بعد مراجعتها واعتمادها من الإدارة. لا توجد تقييمات منشورة حتى الآن.',
          'Verified customer reviews from completed home visits appear here after moderation. No reviews have been published yet.',
        )}</p>
      </div>
    `;
  }

  return `
    <div class="grid">
      ${reviews
        .map(
          (r) => `
          <article class="card review-card">
            <div class="review-stars" aria-label="${r.rating} / 5">${Array.from({ length: 5 }, (_, idx) => `<span class="star-static ${idx < r.rating ? 'is-filled' : ''}">${icon('star')}</span>`).join('')}</div>
            <p>${esc(r.body)}</p>
            <span class="muted">${esc(reviewAuthorName(r))} · ${t('زيارة مكتملة وموثقة', 'Verified completed visit')}</span>
          </article>
        `,
        )
        .join('')}
    </div>
  `;
}

export const petalBloomSVG = (filledCount = 4, totalPetals = 8, lightMode = false) =>
  renderSignatureBloomSVG(filledCount, totalPetals, lightMode);

export function statusBadge(s) {
  const map = {
    pending_confirmation: [t('بانتظار التأكيد', 'Pending confirmation'), 'pending'],
    confirmed: [t('مؤكد', 'Confirmed'), ''],
    in_progress: [t('قيد التنفيذ', 'In progress'), ''],
    completed: [t('مكتمل', 'Completed'), ''],
    cancelled: [t('ملغي', 'Cancelled'), 'danger'],
    no_show: [t('لم تحضر', 'No show'), 'danger'],
    pending_approval: [t('بانتظار موافقة الإدارة', 'Pending admin approval'), 'pending'],
    approved: [t('تمت الموافقة', 'Approved'), ''],
    pending_staff_payment: [t('بانتظار توثيق الدفع', 'Pending payment check'), 'pending'],
    approved_ready: [t('جاهزة للإهداء', 'Ready to redeem'), ''],
    redeemed: [t('مستخدمة', 'Redeemed'), ''],
  };
  const [label, cls] = map[s] || [esc(s), ''];
  return `<span class="badge ${cls}">${label}</span>`;
}

export function fieldLabel(k) {
  return (
    {
      id: t('المرجع', 'Reference'),
      reference: t('رقم الطلب', 'Booking Ref'),
      created_at: t('التاريخ', 'Timestamp'),
      payment_verified_at: t('تاريخ التحقق', 'Verified At'),
      service_date: t('تاريخ الموعد', 'Service Date'),
      customer_name: t('العميلة', 'Customer'),
      booking_total: t('قيمة الحجز', 'Booking Value'),
      paid_amount: t('المدفوع', 'Paid'),
      refund_amount: t('المسترد', 'Refunded'),
      net_amount: t('الصافي', 'Net Revenue'),
      payment_method: t('الطريقة', 'Method'),
      payment_verified: t('الحالة', 'Status'),
      points: t('البتلات', 'Petals'),
      reason: t('السبب', 'Reason'),
      booking_id: t('الحجز', 'Booking'),
      status: t('الحالة', 'Status'),
      value: t('القيمة', 'Value'),
      name: t('الاسم', 'Name'),
      phone: t('الجوال', 'Phone'),
      verified: t('موثق', 'Verified'),
      role: t('الدور', 'Role'),
      action: t('الإجراء', 'Action'),
      actor_name: t('المنفّذ', 'Actor'),
      target: t('الهدف', 'Target'),
      detail: t('التفاصيل', 'Details'),
      metric: t('المؤشر', 'Metric'),
    }[k] || k.replaceAll('_', ' ')
  );
}

export function simpleTable(rows, keys) {
  if (!rows.length) {
    return `<div class="empty muted">${t('لا توجد سجلات بعد.', 'No records yet.')}</div>`;
  }
  return `
    <div class="table-wrap desktop-table-wrap">
      <table>
        <thead>
          <tr>${keys.map((k) => `<th>${esc(fieldLabel(k))}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) =>
                `<tr>${keys
                  .map((k) => {
                    const val = r[k];
                    const formatted =
                      val === null || val === undefined || val === ''
                        ? '—'
                        : typeof val === 'object'
                          ? JSON.stringify(val)
                          : String(val);
                    return `<td>${esc(formatted)}</td>`;
                  })
                  .join('')}</tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <div class="mobile-cards-list">
      ${rows
        .map(
          (r) => `
        <article class="card mobile-kv-card">
          ${keys
            .map((k) => {
              const val = r[k];
              const formatted =
                val === null || val === undefined || val === ''
                  ? '—'
                  : typeof val === 'object'
                    ? JSON.stringify(val)
                    : String(val);
              return `<div class="kv-row"><span class="muted">${esc(fieldLabel(k))}</span><strong>${esc(formatted)}</strong></div>`;
            })
            .join('')}
        </article>
      `,
        )
        .join('')}
    </div>
  `;
}

export const starRatingLabels = () => [
  '',
  t('نجمة واحدة', 'One star'),
  t('نجمتان', 'Two stars'),
  t('ثلاث نجوم', 'Three stars'),
  t('أربع نجوم', 'Four stars'),
  t('خمس نجوم', 'Five stars'),
];

export function reviewModerationStatusBadge(r) {
  if (r?.approved) {
    return `<span class="badge">${t('منشور', 'Published')}</span>`;
  }
  if (r?.moderation_status === 'needs_edit') {
    return `<span class="badge danger">${t('يتطلب تعديلاً', 'Needs revision')}</span>`;
  }
  return `<span class="badge pending">${t('بانتظار المراجعة', 'Pending review')}</span>`;
}

export function openReviewModal({ bookings = [], existingReviews = [], initialBookingId = '', onSaved }) {
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  if (!completedBookings.length) return;
  const chosenId = initialBookingId && completedBookings.some((b) => b.id === initialBookingId)
    ? initialBookingId
    : completedBookings[0].id;
  const labels = starRatingLabels();

  const findReview = (bid) => existingReviews.find((r) => r.booking_id === bid) || null;
  let currentBookingId = chosenId;
  let existing = findReview(currentBookingId);
  let selectedRating = Number(existing?.rating || 0);

  openDialog(`
    <h2>${existing ? t('تعديل تقييمكِ', 'Edit your review') : t('قيّمي تجربتكِ معنا', 'Rate Your Experience')}</h2>
    <p class="muted" style="margin-bottom:14px">${t(
      'تُراجع التقييمات من فريقنا قبل نشرها لضمان المصداقية وحماية خصوصيتكِ.',
      'All reviews are verified against completed appointments and moderated before publication.',
    )}</p>
    <form id="review-form" novalidate>
      <div id="review-form-error" role="alert"></div>
      <label class="field">
        ${t('الزيارة المكتملة', 'Completed appointment')}
        <select name="booking_id" id="review-booking-select">
          ${completedBookings
            .map((b) => {
              const ex = findReview(b.id);
              const itemsText = (b.items || []).map((i) => esc(nameOf(i) || i.name)).join(' + ');
              return `<option value="${esc(b.id)}" ${b.id === currentBookingId ? 'selected' : ''}>${esc(b.reference)} · ${esc(b.date)} · ${itemsText}${ex ? ` (${t('تقييم سابق', 'Reviewed')})` : ''}</option>`;
            })
            .join('')}
        </select>
      </label>

      <div class="control-group">
        <span class="control-label" id="star-group-label">${t('التقييم العام *', 'Your star rating *')}</span>
        <div class="star-picker" id="star-picker" role="radiogroup" aria-labelledby="star-group-label">
          ${[1, 2, 3, 4, 5]
            .map(
              (n) => `
            <button type="button" class="star-btn ${n <= selectedRating ? 'is-filled' : ''}" role="radio"
              aria-checked="${n === selectedRating ? 'true' : 'false'}"
              aria-label="${esc(labels[n])}"
              data-star="${n}" tabindex="${n === (selectedRating || 1) ? '0' : '-1'}">
              ${icon('star')}
            </button>`,
            )
            .join('')}
        </div>
        <div class="muted" id="star-rating-caption" aria-live="polite" style="font-size:13px;margin-top:6px">
          ${selectedRating ? `${selectedRating} / 5 · ${esc(labels[selectedRating])}` : t('اختاري من نجمة واحدة إلى خمس نجوم', 'Select between 1 and 5 stars')}
        </div>
      </div>

      ${field(t('الاسم الظاهر للعامة (اختياري)', 'Public display name (optional)'), 'display_name', 'text', editableDisplayName(existing), 'maxlength="60" placeholder="' + t('مثال: نورة ع.', 'e.g. Noura A.') + '"')}
      <label class="field">
        ${t('تفاصيل تجربتكِ *', 'Your experience *')}
        <textarea name="body" id="review-body-input" required maxlength="2000" placeholder="${t('شاركينا رأيكِ في جودة الخدمة، اللباقة، وترتيب الزيارة...', 'Share your honest impression of service care and attention...')}">${esc(existing?.body || '')}</textarea>
      </label>
      <p class="muted" style="font-size:13px">${t(
        'حفاظاً على خصوصيتكِ، يُرجى عدم إدراج رقم الجوال أو العنوان التفصيلي.',
        'For your privacy, please do not include phone numbers or home addresses.',
      )}</p>
      <button class="btn" type="submit" id="submit-review-btn">${existing ? t('إرسال التعديل للمراجعة', 'Update & submit for review') : t('إرسال التقييم للمراجعة', 'Submit review for moderation')}</button>
    </form>
  `);

  const paintStars = (hoverVal = 0) => {
    const activeCount = hoverVal || selectedRating;
    document.querySelectorAll('#star-picker [data-star]').forEach((btn) => {
      const val = Number(btn.dataset.star);
      btn.classList.toggle('is-filled', val <= selectedRating);
      btn.classList.toggle('is-hover', hoverVal > 0 && val <= hoverVal);
      btn.setAttribute('aria-checked', String(val === selectedRating));
      btn.setAttribute('tabindex', val === (selectedRating || 1) ? '0' : '-1');
      if (hoverVal > 0) btn.classList.toggle('is-preview', val <= activeCount);
      else btn.classList.remove('is-preview');
    });
    const cap = $('#star-rating-caption');
    if (cap) {
      cap.textContent = selectedRating
        ? `${selectedRating} / 5 · ${labels[selectedRating]}`
        : t('اختاري من نجمة واحدة إلى خمس نجوم', 'Select between 1 and 5 stars');
    }
  };

  const starButtons = [...document.querySelectorAll('#star-picker [data-star]')];
  starButtons.forEach((btn) => {
    const val = Number(btn.dataset.star);
    btn.addEventListener('mouseenter', () => paintStars(val));
    btn.addEventListener('mouseleave', () => paintStars(0));
    btn.addEventListener('click', () => {
      selectedRating = val;
      paintStars(0);
    });
    btn.addEventListener('keydown', (ev) => {
      const isRtl = document.documentElement.dir === 'rtl';
      let next = null;
      if (ev.key === 'ArrowRight') next = isRtl ? val - 1 : val + 1;
      else if (ev.key === 'ArrowLeft') next = isRtl ? val + 1 : val - 1;
      else if (ev.key === 'ArrowUp') next = val + 1;
      else if (ev.key === 'ArrowDown') next = val - 1;
      else if (ev.key === 'Home') next = 1;
      else if (ev.key === 'End') next = 5;
      else if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        selectedRating = val;
        paintStars(0);
        return;
      }
      if (next !== null) {
        ev.preventDefault();
        const clamped = Math.max(1, Math.min(5, next));
        selectedRating = clamped;
        paintStars(0);
        starButtons[clamped - 1]?.focus();
      }
    });
  });

  $('#review-booking-select')?.addEventListener('change', (ev) => {
    currentBookingId = ev.target.value;
    existing = findReview(currentBookingId);
    selectedRating = Number(existing?.rating || 0);
    const bodyEl = $('#review-body-input');
    const nameEl = document.querySelector('#review-form [name="display_name"]');
    const btnEl = $('#submit-review-btn');
    if (bodyEl) bodyEl.value = existing?.body || '';
    if (nameEl) nameEl.value = editableDisplayName(existing);
    if (btnEl) {
      btnEl.textContent = existing
        ? t('إرسال التعديل للمراجعة', 'Update & submit for review')
        : t('إرسال التقييم للمراجعة', 'Submit review for moderation');
    }
    paintStars(0);
  });

  $('#review-form')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const errEl = $('#review-form-error');
    if (!Number.isInteger(selectedRating) || selectedRating < 1 || selectedRating > 5) {
      errEl.innerHTML = `<div class="error">${t('يرجى اختيار عدد النجوم من 1 إلى 5.', 'Please choose a rating between 1 and 5 stars.')}</div>`;
      starButtons[0]?.focus();
      return;
    }
    const f = ev.target;
    const d = Object.fromEntries(new FormData(f));
    const reviewText = String(d.body || '').trim();
    if (!reviewText) {
      errEl.innerHTML = `<div class="error">${t('يرجى كتابة نص التقييم قبل الإرسال.', 'Please share your written review before submitting.')}</div>`;
      $('#review-body-input')?.focus();
      return;
    }
    const submitBtn = $('#submit-review-btn');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await api('/reviews', {
        booking_id: currentBookingId,
        rating: selectedRating,
        display_name: d.display_name,
        body: reviewText,
        edit: Boolean(existing),
      });
      $('#modal')?.close();
      state.account = null;
      toast(t('تم استلام تقييمكِ بنجاح؛ بانتظار مراجعة الإدارة قبل النشر.', 'Thank you — your review is saved and pending moderation.'));
      if (onSaved) await onSaved();
    } catch (err) {
      errEl.innerHTML = `<div class="error">${esc(err.message)}</div>`;
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

export function openDialog(content) {
  document.querySelector('#modal')?.remove();
  document.body.insertAdjacentHTML(
    'beforeend',
    `<dialog id="modal">
      <div class="row" style="margin-bottom:14px">
        <span></span>
        <button class="btn light small" id="close-dialog" type="button">${t('إغلاق', 'Close')}</button>
      </div>
      ${content}
    </dialog>`,
  );
  const modal = document.querySelector('#modal');
  modal.showModal();
  document.querySelector('#close-dialog').onclick = () => modal.close();
}

export function confirmActionDialog(message, onConfirm) {
  openDialog(`
    <h2>${t('تأكيد الإجراء', 'Confirm Action')}</h2>
    <p>${esc(message)}</p>
    <div class="hero-actions" style="margin-top:20px">
      <button type="button" class="btn small" id="confirm-yes">${t('نعم، تأكيد', 'Yes, proceed')}</button>
      <button type="button" class="btn small light" id="confirm-no">${t('إلغاء', 'Cancel')}</button>
    </div>
  `);
  document.querySelector('#confirm-no').onclick = () => document.querySelector('#modal')?.close();
  document.querySelector('#confirm-yes').onclick = async () => {
    document.querySelector('#modal')?.close();
    await onConfirm();
  };
}

export const field = (label, key, type = 'text', value = '', extra = '') => {
  const dirAttr = ['date', 'time'].includes(type)
    ? 'dir="ltr" lang="en-GB"'
    : ['tel', 'email'].includes(type) && !extra.includes('dir=')
      ? 'dir="ltr"'
      : '';
  return `<label class="field">${label}<input name="${key}" type="${type}" value="${esc(value)}" ${dirAttr} ${extra}></label>`;
};
