import {
  $,
  api,
  esc,
  href,
  minutes,
  money,
  nameOf,
  riyadhToday,
  state,
  t,
  toast,
} from './state.js';
import { field, head, provisional } from './components.js';
import { trackFunnel } from './motion.js';
import { isWheelVisible, openRewardsWheelDialog } from './wheel.js';

function isNeighborhoodOutOfRange(neighborhood) {
  const s = state.catalog?.settings || {};
  const excluded = Array.isArray(s.excluded_areas) ? s.excluded_areas : [];
  if (!excluded.length || !neighborhood) return false;
  const norm = (str) =>
    String(str || '')
      .trim()
      .toLowerCase()
      .replace(/^حي\s+/, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه');
  const target = norm(neighborhood);
  return excluded.some((a) => {
    const ex = norm(a);
    return ex && (target === ex || target.includes(ex) || ex.includes(target));
  });
}

export const BOOKING_ADD_ONS = [
  {
    id: 'mask-hands',
    price: 35,
    duration: 15,
    ar: 'ماسك ترطيب وتغذية اليدين',
    en: 'Deep Hand Hydration Mask',
    desc_ar: 'ماسك مغذٍ بزيوت طبيعية يمنح اليدين نعومة فائقة ونضارة حريرية.',
    desc_en: 'Nutrient-rich natural oil mask for deep softness.',
  },
  {
    id: 'mask-feet',
    price: 40,
    duration: 15,
    ar: 'ماسك ترطيب وتنعيم القدمين',
    en: 'Foot Nourishing Mask',
    desc_ar: 'عناية مركزة بكعب وقدمين ناعمتين بمرطبات طبيعية عميقة.',
    desc_en: 'Intensive nourishing foot treatment for silky softness.',
  },
  {
    id: 'extend-massage',
    price: 50,
    duration: 15,
    ar: 'تمديد وقت المساج ١٥ دقيقة',
    en: '15-Min Massage Extension',
    desc_ar: 'ربع ساعة إضافية من الاسترخاء والتركيز على مناطق الشد والتوتر.',
    desc_en: 'Extra 15 minutes dedicated to deep muscle relaxation.',
  },
  {
    id: 'scalp-oils',
    price: 45,
    duration: 15,
    ar: 'زيوت عطرية ومساج فروة الرأس',
    en: 'Scalp Ritual & Botanical Oils',
    desc_ar: 'مساج استرخائي مخصص لفروة الرأس بزيوت عطرية مهدئة.',
    desc_en: 'Calming scalp massage infused with botanical oils.',
  },
  {
    id: 'heel-peel',
    price: 35,
    duration: 15,
    ar: 'تقشير وتنعيم الكعبين',
    en: 'Heel Polish & Softening Peel',
    desc_ar: 'تقشير بحبيبات السكر وزبدة الشيا لنعومة كعبين فائقة.',
    desc_en: 'Sugar polish and shea butter treatment for smooth heels.',
  },
];

export function selectedSummary() {
  const pkg = state.catalog.packages.find((p) => p.id === state.draft.package_id);
  const items = pkg
    ? (pkg.service_ids || [])
        .map((id) => state.catalog.services.find((s) => s.id === id))
        .filter(Boolean)
    : state.catalog.services.filter((s) => state.draft.service_ids.map(String).includes(String(s.id)));

  const selectedAddOnObjs = (state.draft.add_ons || [])
    .map((aid) => BOOKING_ADD_ONS.find((a) => a.id === aid))
    .filter(Boolean);

  const basePrice = pkg ? pkg.price : items.reduce((sum, s) => sum + Number(s.price), 0);
  const addOnsPrice = selectedAddOnObjs.reduce((sum, a) => sum + Number(a.price), 0);
  const deliveryFee = Math.max(0, Number(state.catalog?.settings?.delivery_fee || 0));
  const subtotal = basePrice + addOnsPrice + deliveryFee;

  const baseDuration = pkg ? pkg.duration : items.reduce((sum, s) => sum + Number(s.duration), 0);
  const addOnsDuration = selectedAddOnObjs.reduce((sum, a) => sum + Number(a.duration), 0);
  const duration = baseDuration + addOnsDuration;

  let discount = 0;
  if (state.draft.coupon) {
    if (state.draft.coupon.discount_type === 'percent') {
      discount = Math.round((subtotal * Number(state.draft.coupon.value)) / 100);
    } else {
      discount = Math.min(subtotal, Number(state.draft.coupon.value));
    }
  }
  const total = Math.max(0, subtotal - discount);

  return {
    items,
    package: pkg || null,
    addOns: selectedAddOnObjs,
    basePrice,
    addOnsPrice,
    deliveryFee,
    subtotal,
    discount,
    coupon: state.draft.coupon || null,
    total,
    duration,
  };
}

function summaryBodyHtml() {
  const s = selectedSummary();
  return `
    <span class="eyebrow" style="margin-bottom:8px">${t('لحظتك المختارة', 'YOUR CHOSEN MOMENT')}</span>
    <h3>${s.package ? esc(nameOf(s.package)) : t('ملخص الطلب', 'Request summary')}</h3>
    ${
      s.items.length
        ? s.items
            .map(
              (x) =>
                `<div class="summary-line"><span>${esc(nameOf(x))}</span><span>${money(x.price)}</span></div>`,
            )
            .join('')
        : `<p class="muted">${t('اختاري خدمة أو باقة للبدء.', 'Choose a ritual or package to begin.')}</p>`
    }
    ${
      s.addOns.length
        ? s.addOns
            .map(
              (a) =>
                `<div class="summary-line summary-addon-line" style="font-size:13.5px;color:var(--rose-gold-deep)"><span>✦ ${esc(t(a.ar, a.en))}</span><span>+${money(a.price)}</span></div>`,
            )
            .join('')
        : ''
    }
    ${
      s.deliveryFee > 0
        ? `<div class="summary-line"><span>${t('رسوم التوصيل المنزلي', 'Home delivery fee')}</span><span>${money(s.deliveryFee)}</span></div>`
        : ''
    }
    <div class="summary-line">
      <span>${t('مدة الجلسة', 'Duration')}</span>
      <span>${minutes(s.duration)}</span>
    </div>
    ${
      s.discount > 0
        ? `
          <div class="summary-line" style="color:var(--sage-deep);font-weight:600">
            <span>${t('كود الخصم / الإهداء', 'Promo / Gift Code')} (${esc(s.coupon.code)})</span>
            <span>-${money(s.discount)}</span>
          </div>
        `
        : ''
    }
    <div class="summary-line summary-total">
      <span>${t('إجمالي الحجز', 'Booking total')}</span>
      <span>${money(s.total)}</span>
    </div>
    <p class="muted" style="margin-top:12px;margin-bottom:0">${t(
      'فريق J Beauty Spa يتواصل معك مباشرة عبر واتساب لتأكيد الموعد بكل يسر.',
      'Our J Beauty Spa concierge confirms your appointment smoothly via WhatsApp.',
    )}</p>
  `;
}

function updateSelectionSummaryDOM() {
  const s = selectedSummary();
  const countLabel = s.package
    ? esc(nameOf(s.package))
    : `${s.items.length} ${t('خدمات مختارة', 'selected')}`;
  const toggleBtn = $('#summary-toggle');
  if (toggleBtn) {
    toggleBtn.innerHTML = `<span>${t('ملخص لحظتك', 'Summary')} (${countLabel})</span><strong>${money(s.total)}</strong>`;
  }
  const body = $('#summary-body-content');
  if (body) body.innerHTML = summaryBodyHtml();
}

function renderSummary() {
  const s = selectedSummary();
  const countLabel = s.package
    ? esc(nameOf(s.package))
    : `${s.items.length} ${t('خدمات مختارة', 'selected')}`;

  return `
    <aside class="summary">
      <button type="button" class="summary-toggle" id="summary-toggle" aria-expanded="${!state.summaryExpanded ? 'false' : 'true'}">
        <span>${t('ملخص لحظتك', 'Summary')} (${countLabel})</span>
        <strong>${money(s.total)}</strong>
      </button>
      <div class="summary-body ${state.summaryExpanded ? '' : 'collapsed'}" id="summary-body-content">
        ${summaryBodyHtml()}
      </div>
    </aside>
  `;
}

function stepOneCategoryHtml() {
  const svcs = state.catalog.services || [];
  const pkgs = state.catalog.packages || [];
  const lastBooking = state.account?.passport?.last_booking;

  const categories = [
    {
      id: 'massage',
      ar: 'خدمات المساج',
      en: 'Massage Therapy',
      sub_ar: 'استرخائي، علاجي، الأحجار الساخنة، التصريف اللمفاوي',
      sub_en: 'Relaxation, therapeutic, hot stone, lymphatic drainage',
      img: '/assets/images/services/hot-stone.webp',
      count: svcs.filter((x) => x.category === 'massage').length,
    },
    {
      id: 'nails',
      ar: 'العناية بالأظافر',
      en: 'Nail Care',
      sub_ar: 'منيكير وبديكير كلاسيك، بديكير، فرنش تيب وطلاء فرنسي',
      sub_en: 'Classic mani-pedi, pedicure, French tip, French polish',
      img: '/assets/images/services/classic.webp',
      count: svcs.filter((x) => x.category === 'nails').length,
    },
    {
      id: 'gel',
      ar: 'خدمات الجل',
      en: 'Gel Services',
      sub_ar: 'طلاء جل، جل فرنسي، أطراف ملونة، إزالة وإعادة تطبيق',
      sub_en: 'Gel polish, French gel, colored micro-tips, removal',
      img: '/assets/images/services/french-gel.webp',
      count: svcs.filter((x) => x.category === 'gel').length,
    },
    {
      id: 'packages',
      ar: 'الباقات المتناغمة',
      en: 'Curated Packages',
      sub_ar: 'إشراقة J، لحظة هدوء، طقوس الورد، وباقة J المميزة',
      sub_en: 'J Nail Glow, J Serenity, J Rose Ritual, J Signature',
      img: '/assets/images/hero-sanctuary.webp',
      count: pkgs.length,
    },
  ];

  return `
    <h3>${t('اختاري فئة الخدمة المناسبة لك', 'Choose your service category')}</h3>
    ${
      lastBooking
        ? `<div class="card repeat-banner" style="background:var(--sage-tint);margin-bottom:18px;border-color:var(--sage-deep)">
             <div class="row">
               <div>
                 <span class="eyebrow" style="margin-bottom:2px">${t('اختصار لعميلاتنا', 'RETURNING GUEST')}</span>
                 <strong>${t('إعادة طلب آخر زيارة:', 'Repeat your last booking:')} ${(lastBooking.items || []).map((i) => esc(nameOf(i))).join(' + ')}</strong>
               </div>
               <button type="button" class="btn small sage" id="repeat-last-booking">${t('إعادة طلب آخر زيارة', 'Repeat last booking')}</button>
             </div>
           </div>`
        : ''
    }
    <div class="category-pick-grid">
      ${categories
        .map(
          (c) => `
        <button type="button" class="category-pick-card ${state.bookingCategory === c.id ? 'active' : ''}" data-pick-category="${c.id}">
          <img src="${c.img}" alt="${esc(t(c.ar, c.en))}">
          <div class="category-pick-body">
            <div class="row">
              <strong>${t(c.ar, c.en)}</strong>
              <span class="badge">${c.count}</span>
            </div>
            <small class="muted">${t(c.sub_ar, c.sub_en)}</small>
          </div>
        </button>
      `,
        )
        .join('')}
    </div>
  `;
}

function stepTwoServiceHtml() {
  const cat = state.bookingCategory || 'massage';
  const isPackages = cat === 'packages' || (state.bookingMode === 'packages' && !state.bookingCategory);
  const visibleServices = state.catalog.services.filter((s) => (isPackages ? false : s.category === cat));

  return `
    <div class="row" style="margin-bottom:14px">
      <h3 style="margin:0">${isPackages ? t('اختاري الباقة المناسبة', 'Choose a curated package') : t('اختاري الخدمة أو أكثر', 'Select one or more rituals')}</h3>
      <div class="chip-row">
        ${[
          ['massage', 'المساج', 'Massage'],
          ['nails', 'الأظافر', 'Nails'],
          ['gel', 'الجل', 'Gel'],
          ['packages', 'الباقات', 'Packages'],
        ]
          .map(
            ([id, ar, en]) =>
              `<button type="button" data-bookcat="${id}" class="mini-chip ${cat === id ? 'active' : ''}">${t(ar, en)}</button>`,
          )
          .join('')}
      </div>
    </div>

    ${
      !isPackages
        ? `<div class="selection-list">
            ${visibleServices
              .map((s) => {
                const checked = state.draft.service_ids.map(String).includes(String(s.id));
                const imgSrc =
                  s.image && /^(\/[^/]|https:\/\/)/.test(s.image)
                    ? s.image
                    : `/assets/images/services/${s.id}.webp`;
                return `
                <label class="selection">
                  <input type="checkbox" name="service" value="${esc(s.id)}" ${checked ? 'checked' : ''}>
                  <img class="selection-thumb" src="${esc(imgSrc)}" alt="${esc(nameOf(s))}">
                  <span class="selection-info">
                    <strong>${esc(nameOf(s))}</strong>
                    <small>${minutes(s.duration)}${s.credentials_required ? ' · ' + t('يتطلب اعتماد المؤهلات قبل التأكيد', 'Requires credential review') : ''}</small>
                  </span>
                  <span class="amount">${money(s.price)}</span>
                </label>
              `;
              })
              .join('')}
          </div>`
        : `<div class="selection-list">
            ${state.catalog.packages
              .map((p) => {
                const checked = state.draft.package_id === p.id;
                const includedNames = (p.service_ids || [])
                  .map((id) => nameOf(state.catalog.services.find((s) => s.id === id)))
                  .filter(Boolean)
                  .join(' + ');
                return `
                <label class="selection pkg-selection">
                  <input type="radio" name="package" value="${esc(p.id)}" ${checked ? 'checked' : ''}>
                  <span class="selection-info">
                    <strong>${esc(nameOf(p))}</strong>
                    <small>${esc(includedNames)} · ${minutes(p.duration)}</small>
                  </span>
                  <span class="amount">${money(p.price)}</span>
                </label>
              `;
              })
              .join('')}
          </div>`
    }

    <div class="booking-addons-panel card" style="margin-top:24px;border:1.5px solid var(--border-gold);background:var(--cream);border-radius:var(--r-md);padding:20px">
      <div class="row" style="margin-bottom:6px">
        <strong style="font-size:16px;color:var(--plum)">${t('أضيفي لمسة من الدلال إلى حجزك 🌸', 'Add a Touch of Indulgence 🌸')}</strong>
        <span class="badge" style="background:var(--blush-tint);color:var(--rose-gold-deep)">${t('خدمات إضافية', 'Add-ons')}</span>
      </div>
      <p class="muted" style="margin-bottom:16px;font-size:13.5px">${t('اختاري خدمات إضافية لتخصيص تجربتك والتمتع بأقصى درجات الراحة والعناية', 'Select optional add-ons to customize your experience.')}</p>
      <div class="selection-list">
        ${BOOKING_ADD_ONS.map((a) => {
          const checked = (state.draft.add_ons || []).includes(a.id);
          return `
            <label class="selection addon-selection">
              <input type="checkbox" data-addon-id="${esc(a.id)}" ${checked ? 'checked' : ''}>
              <span class="selection-info">
                <strong>${esc(t(a.ar, a.en))}</strong>
                <small>${minutes(a.duration)} · ${esc(t(a.desc_ar, a.desc_en))}</small>
              </span>
              <span class="amount">+${money(a.price)}</span>
            </label>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function stepThreeTimeHtml() {
  const s = state.catalog.settings || {};
  const openTime = s.opening_time || '09:00';
  const closeTime = s.closing_time || '22:00';
  const workingDays = s.working_days || [0, 1, 2, 3, 4, 5, 6];
  const blocked = new Set(s.blocked_dates || []);
  const suggestedTimes = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].filter(
    (slot) => slot >= openTime && slot <= closeTime,
  );

  const today = riyadhToday();
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(Date.parse(today + 'T12:00:00+03:00') + (i + 1) * 86400000);
    const iso = dt.toISOString().slice(0, 10);
    const weekday = dt.getUTCDay();
    const disabled = blocked.has(iso) || !workingDays.includes(weekday);
    return { iso, label: iso.slice(5), disabled };
  });

  const prefNeighborhood = state.account?.passport?.preferences?.preferred_neighborhood;
  if (!state.draft.neighborhood && prefNeighborhood) {
    state.draft.neighborhood = prefNeighborhood;
  }

  return `
    <h3>${t('متى وأين تفضلين زيارتنا؟', 'When and where should we visit?')}</h3>
    <div class="time-chips" aria-label="${t('أيام قريبة مقترحة', 'Upcoming valid days')}">
      ${nextDays
        .map(
          (d) =>
            `<button type="button" class="time-chip ${state.draft.date === d.iso ? 'active' : ''}" ${d.disabled ? 'disabled' : ''} data-pick-date="${d.iso}">${d.label}${d.disabled ? ' ✕' : ''}</button>`,
        )
        .join('')}
    </div>
    <div class="form-grid">
      ${field(
        t('التاريخ المفضل', 'Preferred date'),
        'date',
        'date',
        state.draft.date,
        `required min="${today}"`,
      )}
      ${field(t('الوقت المفضل', 'Preferred time'), 'time', 'time', state.draft.time, 'required')}
    </div>
    <div id="available-slots-container" style="margin-top:10px">
      ${
        suggestedTimes.length
          ? `<div class="time-chips" aria-label="${t('أوقات مقترحة', 'Quick time options')}">
               ${suggestedTimes
                 .map(
                   (slot) =>
                     `<button type="button" class="time-chip ${state.draft.time === slot ? 'active' : ''}" data-pick-time="${slot}">${slot}</button>`,
                 )
                 .join('')}
             </div>`
          : ''
      }
    </div>
    <label class="field">
      ${t('الحي في المدينة المنورة (الخدمة متاحة لجميع أحياء المدينة)', 'Madinah neighborhood (all Madinah areas covered)')}
      ${
        s.areas?.length
          ? `<select name="neighborhood" required>
               <option value="">${t('اختاري الحي', 'Select neighborhood')}</option>
               ${s.areas
                 .map(
                   (a) =>
                     `<option value="${esc(a)}" ${state.draft.neighborhood === a ? 'selected' : ''}>${esc(a)}</option>`,
                 )
                 .join('')}
             </select>`
          : `<input name="neighborhood" value="${esc(state.draft.neighborhood)}" required maxlength="100" placeholder="${t('اكتبي اسم الحي في المدينة المنورة (مثال: العقيق، سلطانة، شوران، الدفاع)', 'Enter your Madinah neighborhood (e.g. Al Aqiq, Sultana)')}">`
      }
    </label>
    ${
      Number(s.delivery_fee || 0) > 0
        ? `<p class="muted" style="font-size:13.5px;margin-top:-6px;margin-bottom:10px">✦ ${t(`تُضاف رسوم توصيل منزلي رمزية (${money(s.delivery_fee)}) شاملة جميع أحياء المدينة المنورة.`, `Home delivery fee (${money(s.delivery_fee)}) applies across Al Madinah.`)}</p>`
        : ''
    }
    ${
      s.excluded_areas?.length
        ? `<div class="notice" style="background:var(--cream-bg);border-color:var(--rose-gold);font-size:13.5px;margin-top:6px">
             <strong>${t('تنويه نطاق التغطية:', 'Coverage Notice:')}</strong>
             ${t('نخدم جميع أحياء المدينة المنورة باستثناء:', 'All Madinah neighborhoods are covered except:')}
             <strong>${s.excluded_areas.map(esc).join('، ')}</strong>
           </div>`
        : ''
    }
  `;
}

function stepFourDetailsHtml() {
  const prefillName = state.draft.name || state.user?.name || '';
  const prefillPhone = state.draft.phone || state.user?.phone || '';
  const showWheelBtn = isWheelVisible();
  return `
    <h3>${t('بيانات التواصل', 'Your contact details')}</h3>
    <div class="form-grid">
      ${field(
        t('الاسم الكريم', 'Name'),
        'name',
        'text',
        prefillName,
        'required autocomplete="name" maxlength="100"',
      )}
      ${field(
        t('رقم الجوال السعودي', 'Saudi mobile number'),
        'phone',
        'tel',
        prefillPhone,
        'required inputmode="tel" autocomplete="tel" placeholder="05xxxxxxxx"',
      )}
    </div>
    <label class="field">
      ${t('ملاحظات اختيارية (يفضل تجنب التفاصيل الطبية الحساسة)', 'Optional notes')}
      <textarea name="notes" maxlength="1000" placeholder="${t('أي تفضيلات حول التوقيت أو التنسيق المنزلي...', 'Any helpful arrival or preference notes...')}">${esc(state.draft.notes)}</textarea>
    </label>

    <div class="card coupon-input-card" style="margin-top:16px;background:var(--cream-bg);border:1px dashed var(--rose-gold);padding:16px 20px;border-radius:var(--r-md)">
      <div class="row" style="margin-bottom:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <strong style="color:var(--plum);font-size:15px">✦ ${t('هل لديك كود خصم أو كود بطاقة إهداء؟', 'Have a promo or gift card code?')}</strong>
        ${
          showWheelBtn
            ? `<button type="button" class="btn light small" id="open-wheel-from-booking" style="font-weight:600;padding:5px 12px;font-size:13px">🎁 ${t('دوري عجلة المكافآت واربحي خصماً فورياً', 'Spin Rewards Wheel')}</button>`
            : ''
        }
      </div>
      <div class="row" style="gap:8px;align-items:center">
        <input type="text" id="coupon-code-input" value="${esc(state.draft.coupon_code || '')}" placeholder="${t('مثال: JB10 أو JGIFT-XXXX', 'e.g. JB10 or JGIFT-XXXX')}" style="flex:1;text-transform:uppercase;padding:8px 12px;border:1px solid var(--border-strong);border-radius:var(--r-sm);background:#fff">
        <button type="button" class="btn small" id="apply-coupon-btn" style="white-space:nowrap">${t('تطبيق الكود', 'Apply')}</button>
      </div>
      <div id="coupon-feedback" style="margin-top:8px;font-size:13.5px">
        ${state.draft.coupon ? `<span style="color:var(--sage-deep);font-weight:600">✓ ${t('تم تفعيل الكوبون:', 'Coupon active:')} ${esc(state.draft.coupon.code)} (${t('خصم', 'Save')} ${state.draft.coupon.discount_type === 'percent' ? state.draft.coupon.value + '%' : state.draft.coupon.value + ' ' + t('ريال', 'SAR')})</span>` : ''}
      </div>
    </div>
    ${
      !state.user
        ? `<div class="card booking-guest-loyalty-notice" style="background:var(--blush-tint);border:1.5px solid var(--rose-gold);padding:18px 20px;border-radius:var(--r-md);margin-top:14px">
             <div class="row" style="align-items:flex-start;gap:12px">
               <span style="color:var(--rose-gold);font-size:22px;line-height:1">✦</span>
               <div style="flex:1">
                 <strong style="color:var(--plum);display:block;margin-bottom:6px;font-size:15px">${t('تنبيه هام حول نقاط الولاء (بتلات J Petals)', 'Important Notice About J Petals')}</strong>
                 <p style="margin:0 0 12px;color:var(--ink-muted);font-size:14px;line-height:1.6">${t(
                   'عند إتمام الحجز كزائرة، لن يتم احتساب نقاط "بتلات J" في رصيدك لعدم وجود حساب مسجل مربوط برقمك. سجلي دخولك أو أنشئي حسابك الآن للاستفادة من المكافآت والخصومات.',
                   'Booking as a guest means loyalty Petals cannot be credited without an account. Sign in or create an account to earn Petals and redeem luxury rewards.',
                 )}</p>
                 <div class="row" style="gap:10px;flex-wrap:wrap">
                   <a class="btn small" href="${href('login')}" style="padding:6px 14px;font-size:13px">${t('تسجيل الدخول لحفظ البتلات', 'Sign in to earn Petals')}</a>
                   <a class="btn small light" href="${href('register')}" style="padding:6px 14px;font-size:13px">${t('إنشاء حساب جديد', 'Create account')}</a>
                 </div>
               </div>
             </div>
           </div>`
        : ''
    }
  `;
}

function stepFiveReviewHtml() {
  const s = selectedSummary();
  return `
    <h3>${t('مراجعة الطلب قبل التسجيل', 'Review your request')}</h3>
    <div class="card" style="margin-bottom:18px">
      <div class="row" style="margin-bottom:10px">
        <strong>${esc(state.draft.name)}</strong>
        <bdi class="muted">${esc(state.draft.phone)}</bdi>
      </div>
      <p class="muted" style="margin-bottom:6px">${t('الموعد المفضل:', 'Preferred time:')} ${esc(state.draft.date)} · ${esc(state.draft.time)} (Asia/Riyadh)</p>
      <p class="muted" style="margin-bottom:6px">${t('الحي:', 'Neighborhood:')} ${esc(state.draft.neighborhood)}</p>
      <p class="muted" style="margin-bottom:6px">${t('المختار:', 'Selection:')} ${s.items.map((x) => esc(nameOf(x))).join(' + ')}</p>
      ${s.addOns.length ? `<p class="muted" style="margin-bottom:6px">${t('الخدمات الإضافية:', 'Add-ons:')} ${s.addOns.map((a) => `${esc(t(a.ar, a.en))} (+${money(a.price)})`).join(' · ')}</p>` : ''}
      <p class="muted" style="margin-bottom:6px">${t('مدة الجلسة:', 'Duration:')} ${minutes(s.duration)}</p>
      ${s.discount > 0 ? `<p class="muted" style="margin-bottom:6px">${t('المجموع قبل الخصم:', 'Subtotal:')} ${money(s.subtotal)} · <span style="color:var(--sage-deep);font-weight:600">${t('الخصم:', 'Discount:')} -${money(s.discount)} (${esc(s.coupon.code)})</span></p>` : ''}
      <p style="margin-bottom:0"><strong>${t('إجمالي الحجز:', 'Booking total:')} ${money(s.total)}</strong></p>
      ${state.draft.notes ? `<p class="muted" style="margin-top:8px;margin-bottom:0">${t('ملاحظات:', 'Notes:')} ${esc(state.draft.notes)}</p>` : ''}
    </div>
    ${
      !state.user
        ? `<div class="notice" style="border-color:var(--rose-gold);background:var(--blush-tint);margin-bottom:14px">
             <strong>${t('تنويه الزائرة:', 'Guest Notice:')}</strong> ${t(
               'أنت بصدد إتمام الحجز كزائرة بدون حساب — لن تُحتسب نقاط بتلات J في رصيدك ما لم تسجلي دخولك.',
               'You are booking as a guest — loyalty Petals will not be credited.',
             )}
           </div>`
        : ''
    }
    <label class="check">
      <input type="checkbox" name="terms" required ${state.draft.terms ? 'checked' : ''}>
      <span>
        ${t('أوافق على', 'I agree to the')}
        <a class="text-link" href="${href('policies')}" target="_blank">${t('سياسة الحجز والإلغاء', 'booking & cancellation policies')}</a>
        ${t('و', 'and')}
        <a class="text-link" href="${href('privacy')}" target="_blank">${t('الخصوصية', 'privacy notice')}</a>.
        ${t('أفهم أن الطلب ينتظر تأكيد فريق J Beauty يدوياً (بانتظار التأكيد).', 'I understand this request awaits manual staff confirmation (Pending Confirmation).')}
      </span>
    </label>
    ${provisional()}
  `;
}

export function bookingSuccess() {
  const r = state.bookingResult;
  const b = r.booking || {};
  const s = state.catalog?.settings || {};
  const receiptDone = Boolean(state.bookingReceiptDone || b.receipt_uploaded);

  return `
    <main id="main" class="wrap">
      <div class="luxury-confirm-shell" data-reveal>
        <div class="luxury-confirm-header">
          <div class="luxury-confirm-crest">
            <img src="/assets/brand/official-logo.png" alt="J Beauty Spa" class="luxury-confirm-logo">
          </div>
          <span class="eyebrow" style="color:var(--rose-gold-deep)">✦ ${t('تم استلام حجزك بنجاح', 'RESERVATION RECEIVED')} ✦</span>
          <h1>${t('أهلاً بك في لحظة دلالك القادمة 🌸', 'Your Calm Sanctuary Moment Awaits 🌸')}</h1>
          <p class="muted">${t(
            'تم تسجيل طلبك بأمان لدى فريق J Beauty Spa وتم فتح واتساب لتأكيد موعدك مباشرة مع منسّقة الحجوزات.',
            'Your appointment is safely registered with J Beauty Spa and WhatsApp has been opened for instant concierge confirmation.',
          )}</p>
          <div class="luxury-ref-pill">
            <span>${t('رقم الحجز المرجعي:', 'Booking Reference:')}</span>
            <strong><bdi>${esc(b.reference)}</bdi></strong>
          </div>
        </div>

        <div class="luxury-confirm-grid">
          <div class="card luxury-confirm-card">
            <h3>${t('تفاصيل موعدك المسجل', 'Your Booking Summary')}</h3>
            <div class="summary-line"><span>${t('العميلة', 'Client')}</span><strong>${esc(b.name)}</strong></div>
            <div class="summary-line"><span>${t('الموعد', 'Schedule')}</span><strong><bdi>${esc(b.date)} · ${esc(b.time)}</bdi></strong></div>
            <div class="summary-line"><span>${t('الحي', 'Neighborhood')}</span><strong>${esc(b.neighborhood)}</strong></div>
            <div class="summary-line">
              <span>${t('الخدمات', 'Services')}</span>
              <strong>${(b.items || []).map((i) => esc(nameOf(i) || i.name_ar)).join(' + ')}</strong>
            </div>
            ${
              (b.add_ons || []).length
                ? `<div class="summary-line" style="color:var(--rose-gold-deep)">
                     <span>${t('الخدمات الإضافية', 'Add-ons')}</span>
                     <strong>${b.add_ons.map((a) => `${esc(a.name_ar)} (+${money(a.price)})`).join(' + ')}</strong>
                   </div>`
                : ''
            }
            ${
              Number(b.delivery_fee || 0) > 0
                ? `<div class="summary-line"><span>${t('رسوم التوصيل', 'Delivery')}</span><strong>${money(b.delivery_fee)}</strong></div>`
                : ''
            }
            ${
              b.discount_amount > 0
                ? `<div class="summary-line" style="color:var(--sage-deep)"><span>${t('الخصم', 'Discount')} (${esc(b.coupon_code)})</span><strong>-${money(b.discount_amount)}</strong></div>`
                : ''
            }
            <div class="summary-line summary-total">
              <span>${t('إجمالي الحجز', 'Total')}</span>
              <span>${money(b.total)}</span>
            </div>

            <div class="hero-actions" style="margin-top:20px;gap:10px;flex-wrap:wrap">
              ${
                r.whatsapp_url
                  ? `<a class="btn shimmer-btn" id="whatsapp-handoff-link" href="${esc(r.whatsapp_url)}" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;flex:1;justify-content:center">💬 ${t('متابعة التأكيد عبر واتساب', 'Continue on WhatsApp')}</a>`
                  : ''
              }
              <a class="btn light" href="/${state.lang}/track?ref=${esc(b.reference)}" style="justify-content:center">🔍 ${t('متابعة حالة الحجز', 'Track Booking')}</a>
            </div>
          </div>

          <div class="card luxury-confirm-card">
            <span class="eyebrow" style="color:var(--rose-gold-deep)">✦ ${t('توثيق الدفع والتحويل البنكي', 'PAYMENT PROOF UPLOAD')} ✦</span>
            <h3 style="margin-top:6px">${t('إرفاق إيصال الدفع', 'Upload Payment Receipt')}</h3>
            <p class="muted" style="font-size:14px">${t(
              'بعد إتمام التحويل البنكي لتأكيد موعدك، يمكنك رفع صورة الإيصال أو ملف PDF هنا ليصل مباشرة إلى قسم المالية وتوثيق الدفع فوراً.',
              'After completing your bank transfer, upload your receipt image or PDF here for instant finance verification in our portal.',
            )}</p>
            <div class="bank-mini-box">
              <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
                <span><strong>${t('البنك:', 'Bank:')}</strong> ${esc(s.bank_name || 'مصرف الراجحي')}</span>
                <span class="muted" style="font-size:12px">✦ ${t('تحويل بنكي فوري', 'Bank Transfer')}</span>
              </div>
              <div><strong>${t('المستفيد:', 'Account:')}</strong> ${esc(s.bank_account_holder || 'مؤسسة J Beauty Spa')}</div>
              <div class="row" style="justify-content:space-between;align-items:center;background:#fff;padding:8px 12px;border-radius:var(--r-sm);border:1px dashed var(--rose-gold);margin-top:4px;gap:8px">
                <div>
                  <span style="font-size:12px;display:block;color:var(--text-dark)">IBAN:</span>
                  <bdi dir="ltr" class="mono" style="font-weight:700;letter-spacing:0.04em;color:var(--plum)" id="booking-iban-text">${esc(s.bank_iban || 'SA0380000000000000000000')}</bdi>
                </div>
                <button type="button" class="btn small light" id="copy-iban-btn" style="padding:4px 10px;font-size:12px;white-space:nowrap">📋 ${t('نسخ الآيبان', 'Copy IBAN')}</button>
              </div>
            </div>
            ${
              receiptDone
                ? `<div class="success" style="margin-top:14px">
                     <strong>✓ ${t('تم استلام إيصال الدفع بنجاح!', 'Payment Receipt Uploaded!')}</strong>
                     <p style="margin:6px 0 0;font-size:13.5px">${t('وصل الإيصال لمنصة الإدارة وجاري مراجعته وتأكيد موعدك.', 'Your receipt is now attached to your booking for staff verification.')}</p>
                   </div>`
                : `
                  <form id="booking-receipt-upload-form" data-booking-ref="${esc(b.reference)}" style="margin-top:14px;display:grid;gap:10px">
                    <div id="receipt-upload-error" role="alert"></div>
                    <label class="field" style="margin:0">
                      ${t('اسم المحوّل (اختياري)', 'Sender Name (optional)')}
                      <input type="text" name="sender_name" value="${esc(b.name || '')}" maxlength="100">
                    </label>
                    <label class="field" style="margin:0">
                      ${t('رقم العملية المرجعي (اختياري)', 'Transfer Reference (optional)')}
                      <input type="text" name="transfer_ref" placeholder="${t('مثال: TRF-982341', 'e.g. TRF-982341')}" maxlength="80">
                    </label>
                    <div class="field" style="margin:0">
                      <label style="display:block;font-size:13.5px;font-weight:600;margin-bottom:6px">${t('صورة الإيصال أو ملف PDF (حتى 2 ميجابايت)', 'Receipt Image or PDF (max 2MB)')}</label>
                      <label class="receipt-dropzone" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 12px;border:1.5px dashed var(--rose-gold);border-radius:var(--r-md);background:var(--cream-bg);cursor:pointer;text-align:center;transition:all .2s ease;position:relative">
                        <span style="font-size:24px;margin-bottom:4px">🧾</span>
                        <strong id="receipt-file-label" style="font-size:13px;color:var(--plum)">${t('اضغطي هنا لاختيار صورة الإيصال أو ملف PDF', 'Click here to choose receipt image or PDF')}</strong>
                        <small class="muted" style="font-size:11.5px;margin-top:4px">${t('يدعم JPG, PNG, WEBP, PDF بحد أقصى 2MB', 'Supports JPG, PNG, WEBP, PDF up to 2MB')}</small>
                        <input type="file" id="booking-receipt-file-input" name="receipt_file" accept="image/png,image/jpeg,image/webp,application/pdf" required style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden">
                      </label>
                    </div>
                    <button type="submit" class="btn sage" style="width:100%">📤 ${t('إرسال إيصال الدفع للإدارة', 'Submit Payment Receipt')}</button>
                  </form>
                `
            }
          </div>
        </div>

        <div class="hero-actions" style="justify-content:center;margin-top:24px;gap:12px">
          <button id="new-booking" class="btn light" type="button">${t('حجز موعد إضافي', 'Book another visit')}</button>
          <a class="btn light" href="${href(state.user ? 'account' : 'home')}">${state.user ? t('الذهاب إلى جواز الجمال', 'Go to Beauty Passport') : t('العودة للرئيسية', 'Return home')}</a>
        </div>
      </div>
    </main>
  `;
}

export function booking() {
  if (state.bookingResult) return bookingSuccess();
  const steps = [
    t('الفئة', 'Category'),
    t('الخدمة', 'Ritual'),
    t('الموعد', 'Time'),
    t('بياناتك', 'Details'),
    t('المراجعة', 'Review'),
  ];

  return `
    <main id="main" class="wrap">
      ${head(
        t('طلب موعد منزلي', 'Request Your Moment'),
        t('خمس خطوات ميسرة، ثم مراجعة وتأكيد شخصي من فريق J Beauty.', 'Five calm steps, followed by personal confirmation from our team.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('طلب حجز', 'Booking'), '']],
      )}
      <div class="booking-layout">
        <div class="booking-main">
          <div class="progress five" aria-label="${t('مراحل الحجز', 'Booking steps')}">
            ${steps
              .map(
                (label, idx) =>
                  `<span class="${idx + 1 <= state.bookingStep ? 'current' : ''} ${idx + 1 === state.bookingStep ? 'active-step' : ''}"><b>${idx + 1}</b><em>${label}</em></span>`,
              )
              .join('')}
          </div>
          <form id="booking-form" novalidate>
            <div id="form-error" role="alert"></div>
            ${
              state.bookingStep === 1
                ? stepOneCategoryHtml()
                : state.bookingStep === 2
                  ? stepTwoServiceHtml()
                  : state.bookingStep === 3
                    ? stepThreeTimeHtml()
                    : state.bookingStep === 4
                      ? stepFourDetailsHtml()
                      : stepFiveReviewHtml()
            }
            <div class="form-actions ${state.bookingStep === 1 ? 'single-action' : ''}">
              ${
                state.bookingStep > 1
                  ? `<button type="button" class="btn light" id="back-step">${t('السابق', 'Back')}</button>`
                  : ''
              }
              <button class="btn form-next-btn" type="submit">
                ${
                  state.bookingStep === 5
                    ? t('تسجيل طلب الحجز', 'Submit appointment request')
                    : state.bookingStep > 1
                      ? t('متابعة', 'Continue')
                      : t('متابعة لاختيار الخدمة', 'Continue to rituals')
                }
              </button>
            </div>
          </form>
        </div>
        ${renderSummary()}
      </div>
    </main>
  `;
}

export function saveDraft() {
  const f = $('#booking-form');
  if (!f) return;
  for (const k of ['date', 'time', 'name', 'phone', 'neighborhood', 'notes']) {
    if (f.elements[k]) state.draft[k] = f.elements[k].value;
  }
  if (f.elements.terms) state.draft.terms = f.elements.terms.checked;
}

export function bindBooking(renderFn) {
  $('#summary-toggle')?.addEventListener('click', () => {
    state.summaryExpanded = !state.summaryExpanded;
    const body = $('#summary-body-content');
    const btn = $('#summary-toggle');
    if (body) body.classList.toggle('collapsed', !state.summaryExpanded);
    if (btn) btn.setAttribute('aria-expanded', String(state.summaryExpanded));
  });

  document.querySelectorAll('[data-pick-category]').forEach((btn) => {
    btn.onclick = () => {
      const cat = btn.dataset.pickCategory;
      state.bookingCategory = cat;
      state.bookingMode = cat === 'packages' ? 'packages' : 'services';
      if (cat === 'packages') {
        state.draft.service_ids = [];
      } else {
        state.draft.package_id = null;
      }
      state.bookingStep = 2;
      trackFunnel('booking_step_2');
      renderFn();
      window.scrollTo(0, 0);
    };
  });

  $('#repeat-last-booking')?.addEventListener('click', () => {
    const last = state.account?.passport?.last_booking;
    if (!last) return;
    if (last.package_id) {
      state.bookingCategory = 'packages';
      state.bookingMode = 'packages';
      state.draft.package_id = last.package_id;
      state.draft.service_ids = [];
    } else {
      state.bookingMode = 'services';
      state.draft.package_id = null;
      state.draft.service_ids = [...(last.service_ids || [])];
      const firstSvc = state.catalog.services.find((s) => s.id === state.draft.service_ids[0]);
      state.bookingCategory = firstSvc?.category || 'massage';
    }
    if (last.neighborhood) state.draft.neighborhood = last.neighborhood;
    state.bookingStep = 3;
    toast(t('تم نسخ تفاصيل آخر زيارة؛ اختاري الموعد المفضل.', 'Last visit loaded — choose your preferred time.'));
    renderFn();
  });

  document.querySelectorAll('[data-bookcat]').forEach((btn) => {
    btn.onclick = () => {
      const cat = btn.dataset.bookcat;
      state.bookingCategory = cat;
      state.bookingMode = cat === 'packages' ? 'packages' : 'services';
      if (cat === 'packages') {
        state.draft.service_ids = [];
      } else {
        state.draft.package_id = null;
      }
      history.replaceState({}, '', href('booking'));
      renderFn();
    };
  });

  // Incremental updates prevent losing focus on checkboxes/radios!
  document.querySelectorAll('[name="service"]').forEach((input) => {
    input.onchange = () => {
      const visibleChecked = [...document.querySelectorAll('[name="service"]:checked')].map((x) => x.value);
      const visibleIds = new Set([...document.querySelectorAll('[name="service"]')].map((x) => x.value));
      const keptHidden = state.draft.service_ids.filter((id) => !visibleIds.has(String(id)));
      state.draft.service_ids = [...new Set([...keptHidden, ...visibleChecked])];
      state.draft.package_id = null;
      updateSelectionSummaryDOM();
    };
  });

  document.querySelectorAll('[name="package"]').forEach((input) => {
    input.onchange = () => {
      state.draft.package_id = input.value;
      state.draft.service_ids = [];
      updateSelectionSummaryDOM();
    };
  });

  document.querySelectorAll('[data-addon-id]').forEach((input) => {
    input.onchange = () => {
      const aid = input.dataset.addonId;
      const cur = new Set(state.draft.add_ons || []);
      if (input.checked) cur.add(aid);
      else cur.delete(aid);
      state.draft.add_ons = Array.from(cur);
      updateSelectionSummaryDOM();
    };
  });

  $('#apply-coupon-btn')?.addEventListener('click', async () => {
    const code = String($('#coupon-code-input')?.value || '').trim().toUpperCase();
    const fb = $('#coupon-feedback');
    if (!code) {
      if (fb) fb.innerHTML = `<span style="color:var(--error-text)">${t('يرجى إدخال كود الكوبون.', 'Please enter a coupon code.')}</span>`;
      return;
    }
    const s = selectedSummary();
    const phoneVal = String(document.querySelector('#booking-form [name="phone"]')?.value || state.draft.phone || '').trim();
    try {
      const res = await api('/coupons/validate', { code, total: s.subtotal, phone: phoneVal });
      state.draft.coupon = res.coupon || {
        code: res.code,
        discount_type: res.discount_type,
        value: res.discount_value,
      };
      state.draft.coupon_code = res.code || (res.coupon && res.coupon.code) || code;
      const discountDisplay = res.discount_amount ? money(res.discount_amount) : (res.discount_type === 'percent' ? `${res.discount_value}%` : money(res.discount_value));
      if (fb) {
        fb.innerHTML = `<span style="color:var(--sage-deep);font-weight:600">✓ ${t('تم تفعيل الكوبون بنجاح: خصم', 'Coupon applied: Save')} ${discountDisplay} 🌸</span>`;
      }
      toast(t('تم تطبيق الخصم بنجاح 🌸', 'Coupon discount applied!'));
      updateSelectionSummaryDOM();
    } catch (err) {
      state.draft.coupon = null;
      state.draft.coupon_code = '';
      if (fb) fb.innerHTML = `<span style="color:var(--error-text)">${esc(err.message)}</span>`;
      updateSelectionSummaryDOM();
    }
  });

  $('#open-wheel-from-booking')?.addEventListener('click', () => {
    openRewardsWheelDialog();
  });

  async function loadAvailableSlotsForDate(dateStr, neighborhoodStr) {
    const container = $('#available-slots-container');
    if (!container || !dateStr) return;
    const s = selectedSummary();
    const dur = s.duration || 60;
    container.innerHTML = `<div style="font-size:13px;color:var(--text-dark);padding:6px 0">⏳ ${t('جاري احتساب المواعيد الشاغرة حسب مدة الجلسة (' + minutes(dur) + ')...', 'Calculating available slots for duration...')}</div>`;
    try {
      const q = new URLSearchParams({ date: dateStr, duration: String(dur), neighborhood: neighborhoodStr || '' });
      const res = await api(`/availability?${q.toString()}`);
      if (res.available_slots && res.available_slots.length > 0) {
        container.innerHTML = `
          <div style="margin-top:4px">
            <p style="font-size:13px;margin:0 0 6px;color:var(--text-dark)">
              <strong>✦ ${t('المواعيد المتاحة فعلياً لجلسة بمدة', 'Available Slots for')} <bdi>${minutes(dur)}</bdi>:</strong>
            </p>
            <div class="time-chips" aria-label="${t('المواعيد المتاحة', 'Available Slots')}">
              ${res.available_slots
                .map(
                  (slot) =>
                    `<button type="button" class="time-chip ${state.draft.time === slot ? 'active' : ''}" data-pick-time="${slot}">${slot}</button>`,
                )
                .join('')}
            </div>
          </div>
        `;
        container.querySelectorAll('[data-pick-time]').forEach((btn) => {
          btn.onclick = () => {
            saveDraft();
            state.draft.time = btn.dataset.pickTime;
            const timeInput = document.querySelector('#booking-form [name="time"]');
            if (timeInput) timeInput.value = btn.dataset.pickTime;
            container.querySelectorAll('[data-pick-time]').forEach((x) => x.classList.toggle('active', x === btn));
          };
        });
      } else {
        container.innerHTML = `
          <div class="notice" style="margin-top:8px;background:var(--cream-bg);font-size:13px">
            ✦ ${t('نعتذر، جميع المواعيد لهذا التاريخ مكتملة بالكامل لجلسة بمدة ' + minutes(dur) + '. يرجى اختيار تاريخ آخر.', 'All slots are fully booked for this duration on this date. Please choose another date.')}
          </div>
        `;
      }
    } catch {
      // Keep static chips on error
    }
  }

  document.querySelectorAll('[data-pick-date]').forEach((btn) => {
    btn.onclick = () => {
      saveDraft();
      state.draft.date = btn.dataset.pickDate;
      const dateInput = document.querySelector('#booking-form [name="date"]');
      if (dateInput) dateInput.value = btn.dataset.pickDate;
      document.querySelectorAll('[data-pick-date]').forEach((x) => x.classList.toggle('active', x === btn));
      loadAvailableSlotsForDate(state.draft.date, state.draft.neighborhood);
    };
  });

  const dateInputEl = document.querySelector('#booking-form [name="date"]');
  if (dateInputEl) {
    dateInputEl.addEventListener('change', () => {
      saveDraft();
      loadAvailableSlotsForDate(dateInputEl.value, state.draft.neighborhood);
    });
  }

  const neighborhoodInputEl = document.querySelector('#booking-form [name="neighborhood"]');
  if (neighborhoodInputEl) {
    neighborhoodInputEl.addEventListener('change', () => {
      saveDraft();
      loadAvailableSlotsForDate(state.draft.date, neighborhoodInputEl.value);
    });
  }

  if (state.bookingStep === 3 && state.draft.date) {
    loadAvailableSlotsForDate(state.draft.date, state.draft.neighborhood);
  }

  document.querySelectorAll('[data-pick-time]').forEach((btn) => {
    btn.onclick = () => {
      saveDraft();
      state.draft.time = btn.dataset.pickTime;
      const timeInput = document.querySelector('#booking-form [name="time"]');
      if (timeInput) timeInput.value = btn.dataset.pickTime;
      document.querySelectorAll('[data-pick-time]').forEach((x) => x.classList.toggle('active', x === btn));
    };
  });

  $('#back-step')?.addEventListener('click', () => {
    saveDraft();
    state.bookingStep = Math.max(1, state.bookingStep - 1);
    renderFn();
  });

  $('#booking-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveDraft();
    const errBox = $('#form-error');
    if (state.bookingStep === 1) {
      if (!state.bookingCategory) state.bookingCategory = 'massage';
      state.bookingStep = 2;
      trackFunnel('booking_step_2');
      renderFn();
      return;
    }
    if (state.bookingStep === 2 && !selectedSummary().items.length) {
      errBox.innerHTML = `<div class="error">${t('اختاري خدمة أو باقة.', 'Please choose a service or package.')}</div>`;
      return;
    }
    if (state.bookingStep === 3) {
      if (!state.draft.date || !state.draft.time || !state.draft.neighborhood.trim()) {
        errBox.innerHTML = `<div class="error">${t('يرجى تحديد التاريخ والوقت والحي.', 'Please choose your preferred date, time, and neighborhood.')}</div>`;
        return;
      }
      if (isNeighborhoodOutOfRange(state.draft.neighborhood)) {
        const s = state.catalog?.settings || {};
        const msg = t(
          s.out_of_range_message_ar || 'نعتذر، هذا الحي خارج نطاق التغطية حالياً في المدينة المنورة.',
          s.out_of_range_message_en || 'Sorry, this neighborhood is currently outside our service coverage.',
        );
        errBox.innerHTML = `<div class="error">${esc(msg)}</div>`;
        return;
      }
    }
    if (state.bookingStep === 4) {
      if (!state.draft.name.trim() || !state.draft.phone.trim()) {
        errBox.innerHTML = `<div class="error">${t('يرجى إدخال الاسم ورقم الجوال السعودي.', 'Please enter your name and Saudi mobile number.')}</div>`;
        return;
      }
    }
    if (state.bookingStep < 5) {
      state.bookingStep++;
      trackFunnel(`booking_step_${state.bookingStep}`);
      renderFn();
      window.scrollTo(0, 0);
      return;
    }

    if (!state.draft.terms) {
      errBox.innerHTML = `<div class="error">${t('يرجى الموافقة على سياسة الحجز والخصوصية.', 'Please accept the booking policies and privacy notice.')}</div>`;
      return;
    }

    const submitBtn = e.submitter;
    submitBtn.disabled = true;
    try {
      const res = await api('/bookings', state.draft);
      state.bookingResult = res;
      state.bookingReceiptDone = false;
      state.account = null;
      renderFn();
      window.scrollTo(0, 0);

      // Direct immediate WhatsApp handoff — zero popup blockers, zero extra clicks!
      if (res.whatsapp_url) {
        trackFunnel('whatsapp_handoff_click');
        try {
          window.location.href = res.whatsapp_url;
        } catch {
          window.open(res.whatsapp_url, '_blank');
        }
      }
    } catch (err) {
      errBox.innerHTML = `<div class="error">${esc(err.message)}</div>`;
      submitBtn.disabled = false;
    }
  });

  $('#booking-receipt-upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const ref = form.dataset.bookingRef;
    const fileInput = form.elements.receipt_file;
    const errEl = $('#receipt-upload-error');
    if (errEl) errEl.innerHTML = '';
    const file = fileInput?.files?.[0];
    if (!file) {
      if (errEl) errEl.innerHTML = `<div class="error">${t('يرجى اختيار ملف الإيصال أولاً.', 'Please select a receipt file.')}</div>`;
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      if (errEl) errEl.innerHTML = `<div class="error">${t('الحد الأقصى لحجم الإيصال هو 2 ميجابايت.', 'Maximum receipt size is 2MB.')}</div>`;
      return;
    }
    const submitBtn = e.submitter;
    submitBtn.disabled = true;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error(t('تعذر قراءة الملف', 'Failed to read file')));
        reader.readAsDataURL(file);
      });
      await api(`/bookings/${encodeURIComponent(ref)}/receipt`, {
        file_data: dataUrl,
        filename: file.name,
        mime_type: file.type,
        sender_name: form.elements.sender_name?.value || '',
        transfer_ref: form.elements.transfer_ref?.value || '',
        phone: state.bookingResult?.booking?.phone || state.draft?.phone || '',
      });
      state.bookingReceiptDone = true;
      toast(t('تم إرسال إيصال الدفع لمنصة الإدارة بنجاح ✓', 'Payment receipt uploaded successfully ✓'));
      renderFn();
    } catch (err) {
      if (errEl) errEl.innerHTML = `<div class="error">${esc(err.message)}</div>`;
      submitBtn.disabled = false;
    }
  });

  $('#whatsapp-handoff-link')?.addEventListener('click', () => {
    trackFunnel('whatsapp_handoff_click');
  });

  $('#booking-receipt-file-input')?.addEventListener('change', (e) => {
    const fn = e.target.files?.[0]?.name;
    const lbl = $('#receipt-file-label');
    if (lbl && fn) {
      lbl.textContent = `✓ تم اختيار: ${fn}`;
      lbl.style.color = 'var(--sage-deep)';
    }
  });

  $('#copy-iban-btn')?.addEventListener('click', async () => {
    const iban = $('#booking-iban-text')?.textContent || '';
    if (iban) {
      try {
        await navigator.clipboard.writeText(iban);
        toast(t('تم نسخ الآيبان بنجاح 📋', 'IBAN copied to clipboard 📋'));
      } catch {
        toast(iban);
      }
    }
  });

  $('#new-booking')?.addEventListener('click', () => {
    state.bookingReceiptDone = false;
    state.bookingResult = null;
    state.bookingStep = 1;
    state.bookingMode = 'services';
    state.bookingCategory = '';
    state.draft = {
      service_ids: [],
      package_id: null,
      add_ons: [],
      coupon: null,
      coupon_code: '',
      date: '',
      time: '',
      name: '',
      phone: '',
      neighborhood: '',
      notes: '',
      terms: false,
      idempotency_key: crypto.randomUUID(),
    };
    history.replaceState({}, '', href('booking'));
    renderFn();
    window.scrollTo(0, 0);
  });
}
