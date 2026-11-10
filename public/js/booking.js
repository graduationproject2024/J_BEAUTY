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

export function selectedSummary() {
  const pkg = state.catalog.packages.find((p) => p.id === state.draft.package_id);
  const items = pkg
    ? (pkg.service_ids || [])
        .map((id) => state.catalog.services.find((s) => s.id === id))
        .filter(Boolean)
    : state.catalog.services.filter((s) => state.draft.service_ids.map(String).includes(String(s.id)));

  return {
    items,
    package: pkg || null,
    total: pkg ? pkg.price : items.reduce((sum, s) => sum + Number(s.price), 0),
    duration: pkg ? pkg.duration : items.reduce((sum, s) => sum + Number(s.duration), 0),
  };
}

function renderSummary() {
  const s = selectedSummary();
  const countLabel = s.package
    ? esc(nameOf(s.package))
    : `${s.items.length} ${t('خدمات مختارة', 'selected')}`;

  return `
    <aside class="summary">
      <button type="button" class="summary-toggle" id="summary-toggle" aria-expanded="${!state.summaryExpanded ? 'false' : 'true'}">
        <span>${t('ملخص لحظتكِ', 'Summary')} (${countLabel})</span>
        <strong>${money(s.total)}</strong>
      </button>
      <div class="summary-body ${state.summaryExpanded ? '' : 'collapsed'}">
        <span class="eyebrow" style="margin-bottom:8px">${t('لحظتكِ المختارة', 'YOUR CHOSEN MOMENT')}</span>
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
        <div class="summary-line">
          <span>${t('المدة التقديرية', 'Estimated duration')}</span>
          <span>${minutes(s.duration)}</span>
        </div>
        <div class="summary-line summary-total">
          <span>${t('الإجمالي التقديري', 'Estimated total')}</span>
          <span>${money(s.total)}</span>
        </div>
        <p class="muted" style="margin-top:12px;margin-bottom:0">${t(
          'الوقت المفضل ليس حجزاً مؤكداً. يتواصل فريقنا لتأكيد الموعد يدوياً.',
          'Preferred times are requests. All appointments are confirmed manually by our team.',
        )}</p>
      </div>
    </aside>
  `;
}

function stepOneHtml() {
  const mode = state.bookingMode === 'packages' || state.draft.package_id ? 'packages' : 'services';
  state.bookingMode = mode;
  const visibleServices = state.catalog.services.filter(
    (s) => state.bookingCategory === 'all' || s.category === state.bookingCategory,
  );

  return `
    <h3>${t('ما الذي تحتاجينه اليوم؟', 'What feels right today?')}</h3>
    <div class="tabs" role="tablist">
      <button type="button" data-booktype="services" role="tab" aria-selected="${mode === 'services'}" class="${mode === 'services' ? 'active' : ''}">
        ${t('الخدمات الفردية', 'Individual Services')}
      </button>
      <button type="button" data-booktype="packages" role="tab" aria-selected="${mode === 'packages'}" class="${mode === 'packages' ? 'active' : ''}">
        ${t('الباقات المتناغمة', 'Curated Packages')}
      </button>
    </div>

    ${
      mode === 'services'
        ? `
        <div class="filter" style="margin-bottom:16px">
          ${[
            ['all', 'الكل', 'All'],
            ['massage', 'المساج', 'Massage'],
            ['nails', 'الأظافر', 'Nails'],
            ['gel', 'الجل', 'Gel'],
          ]
            .map(
              ([id, ar, en]) =>
                `<button type="button" data-bookcat="${id}" class="${state.bookingCategory === id ? 'active' : ''}">${t(ar, en)}</button>`,
            )
            .join('')}
        </div>
        <div class="selection-list">
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
                  <small>${minutes(s.duration)}${s.credentials_required ? ' · ' + t('تتطلب مراجعة الاحتياطات', 'Precaution review') : ''}</small>
                </span>
                <span class="amount">${money(s.price)}</span>
              </label>
            `;
            })
            .join('')}
        </div>
      `
        : `
        <div class="selection-list">
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
        </div>
      `
    }
  `;
}

function stepTwoHtml() {
  const s = state.catalog.settings || {};
  const openTime = s.opening_time || '09:00';
  const closeTime = s.closing_time || '22:00';
  const suggestedTimes = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].filter(
    (slot) => slot >= openTime && slot <= closeTime,
  );

  return `
    <h3>${t('متى وأين تفضلين زيارتنا؟', 'When and where should we visit?')}</h3>
    <div class="notice">
      ${t(
        'المواعيد المختارة هنا أوقات مفضلة بانتظار تأكيد الموظفة وليست أوقاتاً مؤكدة آلياً. التوقيت المعتمد: الرياض (Asia/Riyadh).',
        'Dates and times below are preferences awaiting manual staff confirmation, not live guaranteed slots. Timezone: Asia/Riyadh.',
      )}
    </div>
    <div class="form-grid">
      ${field(
        t('التاريخ المفضل', 'Preferred date'),
        'date',
        'date',
        state.draft.date,
        `required min="${riyadhToday()}"`,
      )}
      ${field(t('الوقت المفضل', 'Preferred time'), 'time', 'time', state.draft.time, 'required')}
    </div>
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
    <label class="field">
      ${t('الحي في المدينة المنورة', 'Madinah neighborhood')}
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
          : `<input name="neighborhood" value="${esc(state.draft.neighborhood)}" required maxlength="100" placeholder="${t('مثال: حي العقيق / سلطانة', 'e.g. Al Aqiq / Sultana')}">`
      }
    </label>
  `;
}

function stepThreeHtml() {
  const prefillName = state.draft.name || state.user?.name || '';
  const prefillPhone = state.draft.phone || state.user?.phone || '';
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
        'required autocomplete="tel" placeholder="05xxxxxxxx"',
      )}
    </div>
    <label class="field">
      ${t('ملاحظات اختيارية (يفضل تجنب المعلومات الطبية الحساسة)', 'Optional notes')}
      <textarea name="notes" maxlength="1000" placeholder="${t('أي تفضيلات حول التوقيت أو التنسيق المنزلي...', 'Any helpful arrival or preference notes...')}">${esc(state.draft.notes)}</textarea>
    </label>
    ${
      !state.user
        ? `<div class="card" style="background:var(--cream);padding:16px 18px">
             <strong>${t('الحجز كزائرة متاح دائماً', 'Guest booking is always welcome')}</strong>
             <p class="muted" style="margin:4px 0 0">${t(
               'يمكنكِ إكمال الحجز مباشرة بدون حساب، أو إنشاء حساب لاحقاً لجمع البتلات ومتابعة المواعيد.',
               'Complete your request right away as a guest, or create an account later to collect petals.',
             )}</p>
           </div>`
        : ''
    }
  `;
}

function stepFourHtml() {
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
      <p style="margin-bottom:0"><strong>${t('الإجمالي التقديري:', 'Estimated total:')} ${money(s.total)}</strong></p>
      ${state.draft.notes ? `<p class="muted" style="margin-top:8px;margin-bottom:0">${t('ملاحظات:', 'Notes:')} ${esc(state.draft.notes)}</p>` : ''}
    </div>
    <label class="check">
      <input type="checkbox" name="terms" required ${state.draft.terms ? 'checked' : ''}>
      <span>
        ${t('أوافق على', 'I agree to the')}
        <a class="text-link" href="${href('policies')}" target="_blank">${t('سياسة الحجز', 'booking policies')}</a>
        ${t('و', 'and')}
        <a class="text-link" href="${href('privacy')}" target="_blank">${t('الخصوصية', 'privacy notice')}</a>.
        ${t('أفهم أن الطلب ينتظر تأكيد فريق J SPA يدوياً.', 'I understand this request awaits manual staff confirmation.')}
      </span>
    </label>
    ${provisional()}
  `;
}

export function bookingSuccess() {
  const r = state.bookingResult;
  return `
    <main id="main" class="wrap">
      ${head(t('تم حفظ طلب الحجز', 'Appointment Request Saved'))}
      <div class="content">
        <div class="success">
          <div class="row" style="margin-bottom:10px">
            <h2 style="margin:0;font-size:24px">${t('تم تسجيل طلبكِ، وسيتم تأكيد الموعد بعد مراجعته مع فريق J Spa.', 'Your request is saved. J SPA will review and personally confirm your appointment.')}</h2>
            <span class="badge pending">${t('بانتظار التأكيد', 'Pending confirmation')}</span>
          </div>
          <p style="margin-bottom:0">${t('رقم الطلب المرجعي:', 'Booking Reference:')} <strong><bdi>${esc(r.booking?.reference)}</bdi></strong></p>
        </div>

        <div class="card" style="margin-bottom:20px">
          <h3>${t('الخطوة التالية: إرسال الطلب عبر واتساب', 'Next Step: Send via WhatsApp')}</h3>
          <p class="muted">${t(
            'بالضغط على زر فتح واتساب ستُفتح محادثة تحتوي على تفاصيل طلبكِ جاهزة. عليكِ الضغط على زر الإرسال داخل واتساب بنفسكِ. فتح الرابط لا يعني وصول الرسالة أو تأكيد الموعد.',
            'Clicking Open WhatsApp opens your chat app with a prepared message. You must press Send yourself inside WhatsApp. Opening the link does not send the message or confirm your booking.',
          )}</p>
          <div class="hero-actions">
            ${
              r.whatsapp_url
                ? `<a class="btn sage" href="${esc(r.whatsapp_url)}" target="_blank" rel="noopener">${t('فتح واتساب', 'Open WhatsApp')}</a>`
                : `<div class="notice" style="margin:0;width:100%">${t(
                    'رقم واتساب التجاري غير مضاف بعد في إعدادات الموقع، لكن طلبكِ محفوظ بأمان في قاعدة البيانات ليراجعه الفريق.',
                    'The business WhatsApp number is not configured yet, but your request is safely saved for staff review.',
                  )}</div>`
            }
            <button class="btn light" id="copy-message" type="button">${t('نسخ نص الرسالة', 'Copy message')}</button>
          </div>
          <pre style="margin-top:18px">${esc(r.message)}</pre>
        </div>

        <div class="hero-actions">
          <button id="new-booking" class="btn light" type="button">${t('تقديم طلب حجز جديد', 'Start a new request')}</button>
          <a class="text-link" href="${href(state.user ? 'account' : 'home')}">${state.user ? t('الذهاب إلى حجوزاتي', 'Go to my bookings') : t('العودة للرئيسية', 'Return home')}</a>
        </div>
      </div>
    </main>
  `;
}

export function booking() {
  if (state.bookingResult) return bookingSuccess();
  const steps = [
    t('الخدمة', 'Ritual'),
    t('الموعد', 'Time'),
    t('بياناتكِ', 'Details'),
    t('المراجعة', 'Review'),
  ];

  return `
    <main id="main" class="wrap">
      ${head(
        t('طلب موعد منزلي', 'Request Your Moment'),
        t('أربع خطوات واضحة، ثم مراجعة وتأكيد شخصي من فريق J SPA.', 'Four clear steps, followed by personal confirmation from our team.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('طلب حجز', 'Booking'), '']],
      )}
      <div class="booking-layout">
        <div class="booking-main">
          <div class="progress" aria-label="${t('مراحل الحجز', 'Booking steps')}">
            ${steps
              .map(
                (label, idx) =>
                  `<span class="${idx + 1 <= state.bookingStep ? 'current' : ''}">${idx + 1} · ${label}</span>`,
              )
              .join('')}
          </div>
          <form id="booking-form" novalidate>
            <div id="form-error" role="alert"></div>
            ${
              state.bookingStep === 1
                ? stepOneHtml()
                : state.bookingStep === 2
                  ? stepTwoHtml()
                  : state.bookingStep === 3
                    ? stepThreeHtml()
                    : stepFourHtml()
            }
            <div class="form-actions">
              ${
                state.bookingStep > 1
                  ? `<button type="button" class="btn light" id="back-step">${t('السابق', 'Back')}</button>`
                  : '<span></span>'
              }
              <button class="btn" type="submit">
                ${state.bookingStep === 4 ? t('تسجيل طلب الحجز', 'Submit appointment request') : t('متابعة', 'Continue')}
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
    const body = document.querySelector('.summary-body');
    const btn = $('#summary-toggle');
    if (body) body.classList.toggle('collapsed', !state.summaryExpanded);
    if (btn) btn.setAttribute('aria-expanded', String(state.summaryExpanded));
  });

  document.querySelectorAll('[data-booktype]').forEach((btn) => {
    btn.onclick = () => {
      if (btn.dataset.booktype === 'services') {
        state.bookingMode = 'services';
        state.draft.package_id = null;
      } else {
        state.bookingMode = 'packages';
        state.draft.service_ids = [];
      }
      history.replaceState({}, '', href('booking'));
      renderFn();
    };
  });

  document.querySelectorAll('[data-bookcat]').forEach((btn) => {
    btn.onclick = () => {
      state.bookingCategory = btn.dataset.bookcat;
      renderFn();
    };
  });

  document.querySelectorAll('[name="service"]').forEach((input) => {
    input.onchange = () => {
      const visibleChecked = [...document.querySelectorAll('[name="service"]:checked')].map((x) => x.value);
      const visibleIds = new Set([...document.querySelectorAll('[name="service"]')].map((x) => x.value));
      const keptHidden = state.draft.service_ids.filter((id) => !visibleIds.has(String(id)));
      state.draft.service_ids = [...new Set([...keptHidden, ...visibleChecked])];
      state.draft.package_id = null;
      history.replaceState({}, '', href('booking'));
      renderFn();
    };
  });

  document.querySelectorAll('[name="package"]').forEach((input) => {
    input.onchange = () => {
      state.draft.package_id = input.value;
      state.draft.service_ids = [];
      history.replaceState({}, '', href('booking'));
      renderFn();
    };
  });

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
    if (state.bookingStep === 1 && !selectedSummary().items.length) {
      errBox.innerHTML = `<div class="error">${t('اختاري خدمة أو باقة.', 'Please choose a service or package.')}</div>`;
      return;
    }
    if (state.bookingStep === 2) {
      if (!state.draft.date || !state.draft.time || !state.draft.neighborhood.trim()) {
        errBox.innerHTML = `<div class="error">${t('يرجى تحديد التاريخ والوقت والحي.', 'Please choose your preferred date, time, and neighborhood.')}</div>`;
        return;
      }
    }
    if (state.bookingStep === 3) {
      if (!state.draft.name.trim() || !state.draft.phone.trim()) {
        errBox.innerHTML = `<div class="error">${t('يرجى إدخال الاسم ورقم الجوال السعودي.', 'Please enter your name and Saudi mobile number.')}</div>`;
        return;
      }
    }
    if (state.bookingStep < 4) {
      state.bookingStep++;
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
      state.bookingResult = await api('/bookings', state.draft);
      state.account = null;
      renderFn();
      window.scrollTo(0, 0);
    } catch (err) {
      errBox.innerHTML = `<div class="error">${esc(err.message)}</div>`;
      submitBtn.disabled = false;
    }
  });

  $('#copy-message')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.bookingResult?.message || '');
      toast(t('تم نسخ الرسالة', 'Copied'));
    } catch {
      toast(t('يمكنكِ تحديد النص ونسخه يدوياً.', 'Select and copy the message manually.'));
    }
  });

  $('#new-booking')?.addEventListener('click', () => {
    state.bookingResult = null;
    state.bookingStep = 1;
    state.bookingMode = 'services';
    state.bookingCategory = 'all';
    state.draft = {
      service_ids: [],
      package_id: null,
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

