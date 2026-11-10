import {
  $,
  api,
  esc,
  isOwner,
  isStaff,
  minutes,
  money,
  nameOf,
  riyadhToday,
  state,
  t,
  toast,
} from './state.js';
import {
  field,
  head,
  simpleTable,
  statusBadge,
} from './components.js';
import { auth } from './account.js';

function statusLabel(s) {
  return (
    {
      pending_confirmation: t('بانتظار التأكيد', 'Pending confirmation'),
      confirmed: t('مؤكد', 'Confirmed'),
      in_progress: t('قيد التنفيذ', 'In progress'),
      completed: t('مكتمل', 'Completed'),
      cancelled: t('ملغي', 'Cancelled'),
      no_show: t('لم تحضر', 'No show'),
    }[s] || esc(s)
  );
}

function adminBookings(rows) {
  if (!rows.length) {
    return `<div class="empty muted">${t('لا توجد حجوزات مطابقة حالياً.', 'No matching bookings here yet.')}</div>`;
  }
  const sorted = [...rows].sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));

  return sorted
    .map((b) => {
      const cleanPhone = String(b.phone || '').replace(/\D/g, '').replace(/^0/, '966');
      const canWhatsapp = /^9665\d{8}$/.test(cleanPhone);
      const waMsg = t(
        `مرحباً ${b.name}، بخصوص طلبكِ ${b.reference} لدى J SPA، نود تنسيق تفاصيل موعدكِ.`,
        `Hello ${b.name}, regarding your J SPA request ${b.reference}, we would like to coordinate your appointment.`,
      );

      return `
      <details class="details">
        <summary>
          <div class="row">
            <span><strong><bdi>${esc(b.reference)}</bdi></strong> · ${esc(b.name)} · <bdi>${esc(b.date)} ${esc(b.time)}</bdi></span>
            <span>${money(b.total)} · ${statusBadge(b.status)}</span>
          </div>
        </summary>
        <div style="margin-top:12px">
          <p style="margin-bottom:6px"><bdi>${esc(b.phone)}</bdi> · ${esc(b.neighborhood)} · ${minutes(b.duration)}</p>
          <p class="muted" style="margin-bottom:6px">${(b.items || []).map((x) => esc(nameOf(x) || x.name)).join(' + ')}</p>
          ${b.notes ? `<p class="muted" style="margin-bottom:10px">${t('ملاحظات العميلة:', 'Customer notes:')} ${esc(b.notes)}</p>` : ''}
          ${
            canWhatsapp
              ? `<a class="btn sage small" style="margin-bottom:12px" href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}" target="_blank" rel="noopener">${t('محادثة العميلة عبر واتساب (إرسال يدوي)', 'WhatsApp Customer (Manual Send)')}</a>`
              : ''
          }
          <form data-admin-form="bookings/${esc(b.id)}">
            <div class="form-grid">
              <label class="field">
                ${t('حالة الخدمة', 'Service status')}
                <select name="status">
                  ${['pending_confirmation', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
                    .map((s) => `<option value="${s}" ${b.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`)
                    .join('')}
                </select>
              </label>
              ${field(t('التاريخ المتفق عليه', 'Agreed date'), 'date', 'date', b.date, 'required')}
              ${field(t('الوقت المتفق عليه (الرياض)', 'Agreed time (Riyadh)'), 'time', 'time', b.time, 'required')}
              ${field(t('المبلغ المدفوع الفعلي ر.س', 'Actual paid amount SAR'), 'paid_amount', 'number', b.paid_amount ?? '', 'min="0" step="0.01"')}
              <label class="field">
                ${t('طريقة الدفع', 'Payment method')}
                <select name="payment_method">
                  <option value="">${t('اختاري الطريقة', 'Select method')}</option>
                  ${[
                    ['cash', 'نقداً', 'Cash'],
                    ['card', 'بطاقة / جهاز خارجي', 'Card / external POS'],
                    ['bank_transfer', 'تحويل بنكي', 'Bank transfer'],
                    ['other', 'أخرى', 'Other'],
                  ]
                    .map(
                      ([v, ar, en]) =>
                        `<option value="${v}" ${b.payment_method === v ? 'selected' : ''}>${t(ar, en)}</option>`,
                    )
                    .join('')}
                </select>
              </label>
            </div>
            <label class="check">
              <input type="checkbox" name="payment_verified" ${b.payment_verified ? 'checked' : ''}>
              <span>${t('تحققت من استلام المبلغ الفعلي (لا تعتمدي على إفادة العميلة فقط).', 'I verified receipt of actual payment.')}</span>
            </label>
            <button class="btn small" type="submit">${t('حفظ التحديث', 'Save update')}</button>
          </form>
          ${
            isOwner()
              ? `<form data-admin-form="bookings/${esc(b.id)}" data-refund="true">
                   <h4 style="margin:0 0 10px">${t('تسجيل استرداد (بصلاحية المالكة)', 'Record Refund (Owner)')}</h4>
                   <div class="form-grid">
                     ${field(t('إجمالي المبلغ المسترد ر.س', 'Cumulative refunded amount SAR'), 'refund_amount', 'number', (b.refund_cents || 0) / 100, 'required min="0" step="0.01"')}
                     ${field(t('سبب الاسترداد', 'Refund reason'), 'reason', 'text', '', 'required')}
                   </div>
                   <button class="btn small light" type="submit">${t('حفظ الاسترداد وتسوية النقاط', 'Save refund & adjust points')}</button>
                 </form>`
              : ''
          }
        </div>
      </details>
    `;
    })
    .join('');
}

function calendarView(a) {
  const sched = isOwner() ? a.settings : a.schedule_config || {};
  const cap = Number(sched.capacity || 0);
  const buffer = Number(sched.travel_buffer || 30);
  const today = riyadhToday();
  const baseDate = state.adminCalendarDate || today;
  const allBookings = a.bookings || [];

  const stripDays = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(Date.parse(today + 'T12:00:00Z') + i * 86400000);
    const iso = dt.toISOString().slice(0, 10);
    const count = allBookings.filter((b) => b.date === iso && !['cancelled', 'no_show'].includes(b.status)).length;
    return { iso, count };
  });

  const dayBookings = allBookings
    .filter((b) => b.date === baseDate)
    .sort((x, y) => x.time.localeCompare(y.time));

  const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
  const conflicts = new Set();
  for (let i = 0; i < dayBookings.length; i++) {
    const bi = dayBookings[i];
    if (!['confirmed', 'in_progress'].includes(bi.status)) continue;
    const s1 = toMin(bi.time);
    const e1 = s1 + bi.duration + buffer;
    let concurrent = 1;
    for (let j = 0; j < dayBookings.length; j++) {
      if (i === j) continue;
      const bj = dayBookings[j];
      if (!['confirmed', 'in_progress'].includes(bj.status)) continue;
      const s2 = toMin(bj.time);
      const e2 = s2 + bj.duration + buffer;
      if (s2 < e1 && e2 > s1) concurrent++;
    }
    if (cap > 0 && concurrent > cap) conflicts.add(bi.id);
  }

  return `
    <h2>${t('تقويم المواعيد والسعة', 'Appointment Calendar & Capacity')}</h2>
    ${
      cap === 0
        ? `<div class="notice">${t('السعة الاستيعابية للموظفات غير مضبوطة (0). يجب إعداد السعة والأحياء قبل تأكيد أي حجز.', 'Staff capacity is currently 0 (unconfigured). Owner must configure capacity & areas before confirmations.')}</div>`
        : `<p class="muted">${t('أوقات العمل:', 'Operating hours:')} ${esc(sched.opening_time || '09:00')}–${esc(sched.closing_time || '22:00')} · ${t('السعة المتزامنة:', 'Capacity:')} ${cap} · ${t('فاصل التنقل:', 'Travel buffer:')} ${buffer} ${t('دقيقة', 'min')}</p>`
    }
    <div class="cal-strip">
      ${stripDays
        .map(
          (d) => `
        <button type="button" class="cal-day ${d.iso === baseDate ? 'active' : ''}" data-cal-day="${d.iso}">
          <strong>${d.iso.slice(5)}</strong>
          <small>${d.count} ${t('مواعيد', 'bookings')}</small>
        </button>
      `,
        )
        .join('')}
    </div>
    <label class="field" style="max-width:260px">
      ${t('أو اختاري أي تاريخ', 'Or select any date')}
      <input type="date" id="cal-date-input" value="${esc(baseDate)}">
    </label>
    <div class="cal-timeline" style="margin-bottom:24px">
      ${
        dayBookings.length
          ? dayBookings
              .map(
                (b) => `
            <div class="cal-slot ${conflicts.has(b.id) ? 'conflict' : ''}">
              <div>
                <strong><bdi>${esc(b.time)}</bdi></strong>
                <div class="muted" style="font-size:11px">${minutes(b.duration)} (+${buffer}m)</div>
              </div>
              <div class="row">
                <div>
                  <strong><bdi>${esc(b.reference)}</bdi></strong> · ${esc(b.name)} · ${esc(b.neighborhood)}
                  <div class="muted">${(b.items || []).map((i) => esc(nameOf(i))).join(' + ')}</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                  ${conflicts.has(b.id) ? `<span class="badge danger">${t('تعارض سعة', 'Capacity warning')}</span>` : ''}
                  ${statusBadge(b.status)}
                </div>
              </div>
            </div>
          `,
              )
              .join('')
          : `<div class="empty muted">${t('لا توجد مواعيد مسجلة في هذا اليوم.', 'No appointments scheduled for this date.')}</div>`
      }
    </div>
    <h3>${t('تعديل الحجوزات في هذا اليوم', 'Manage Selected Day Bookings')}</h3>
    ${adminBookings(dayBookings)}
  `;
}

function catalogEditor(item, type) {
  const isSvc = type === 'services';
  return `
    <details class="details">
      <summary>${item.id ? esc(nameOf(item)) : isSvc ? t('+ إضافة خدمة جديدة', '+ Add service') : t('+ إضافة باقة جديدة', '+ Add package')}</summary>
      <form data-admin-form="${type}">
        ${item.id ? `<input type="hidden" name="id" value="${esc(item.id)}">` : ''}
        <div class="form-grid">
          ${field(t('الاسم العربي', 'Arabic name'), 'name_ar', 'text', item.name_ar || '', 'required')}
          ${field(t('الاسم الإنجليزي', 'English name'), 'name_en', 'text', item.name_en || '', 'required')}
          ${field(t('السعر ر.س', 'Price SAR'), 'price', 'number', item.price ?? '', 'required min="0" step="0.01"')}
          ${
            isSvc
              ? `${field(t('المدة بالدقائق', 'Duration (min)'), 'duration', 'number', item.duration ?? '', 'required min="5"')}
                 <label class="field">
                   ${t('القسم', 'Category')}
                   <select name="category">
                     ${[
                       ['massage', 'المساج', 'Massage'],
                       ['nails', 'الأظافر', 'Nails'],
                       ['gel', 'الجل', 'Gel'],
                     ]
                       .map(([v, ar, en]) => `<option value="${v}" ${item.category === v ? 'selected' : ''}>${t(ar, en)}</option>`)
                       .join('')}
                   </select>
                 </label>
                 ${field(t('مسار أو رابط الصورة المعتمدة', 'Approved image URL/path'), 'image', 'text', item.image || '')}
                 <label class="field full">
                   ${t('الوصف العربي', 'Arabic description')}
                   <textarea name="description_ar" required>${esc(item.description_ar || '')}</textarea>
                 </label>
                 <label class="field full">
                   ${t('الوصف الإنجليزي', 'English description')}
                   <textarea name="description_en" required>${esc(item.description_en || '')}</textarea>
                 </label>
                 <label class="check full">
                   <input type="checkbox" name="credentials_required" ${item.credentials_required ? 'checked' : ''}>
                   <span>${t('تتطلب مؤهلات مهنية معتمدة', 'Requires approved professional credentials')}</span>
                 </label>
                 <label class="check full">
                   <input type="checkbox" name="credentials_approved" ${item.credentials_approved ? 'checked' : ''}>
                   <span>${t('راجعت المؤهلات والاحتياطات واعتمدت تقديم الخدمة', 'Credentials and precautions reviewed and approved')}</span>
                 </label>`
              : `<div class="full">
                   <label class="field">
                     ${t('الخدمات ضمن الباقة', 'Included services')}
                     <select name="service_ids" multiple size="6" required>
                       ${(state.admin.services || [])
                         .map(
                           (s) =>
                             `<option value="${esc(s.id)}" ${(item.service_ids || []).map(String).includes(String(s.id)) ? 'selected' : ''}>${esc(nameOf(s))} · ${money(s.price)}</option>`,
                         )
                         .join('')}
                     </select>
                   </label>
                 </div>`
          }
        </div>
        <label class="check">
          <input type="checkbox" name="active" ${item.active !== false && item.active !== 0 ? 'checked' : ''}>
          <span>${t('ظاهر في الموقع', 'Visible on website')}</span>
        </label>
        ${
          !isSvc && item.id
            ? `<label class="check">
                 <input type="checkbox" name="remove">
                 <span>${t('حذف هذه الباقة نهائياً', 'Remove package')}</span>
               </label>`
            : ''
        }
        <button class="btn small" type="submit">${t('حفظ', 'Save')}</button>
      </form>
    </details>
  `;
}

function settingsForm(s) {
  return `
    <h2>${t('إعدادات الموقع والتشغيل', 'Website & Operational Settings')}</h2>
    <form id="settings-form" class="card">
      <h3>${t('بيانات التواصل والروابط', 'Contact & Social Links')}</h3>
      <div class="form-grid">
        ${field(t('رقم واتساب الأعمال (9665xxxxxxxx)', 'Business WhatsApp (9665xxxxxxxx)'), 'business_phone', 'tel', s.business_phone || '')}
        ${field('Instagram URL', 'instagram', 'url', s.instagram || '')}
        ${field('TikTok URL', 'tiktok', 'url', s.tiktok || '')}
      </div>

      <h3>${t('الجدول والسعة وأحياء المدينة', 'Schedule, Capacity & Neighborhoods')}</h3>
      <div class="form-grid">
        ${field(t('الطاقة الاستيعابية المتزامنة (0 = غير معدة)', 'Simultaneous staff capacity'), 'capacity', 'number', s.capacity ?? 0, 'min="0" step="1" required')}
        ${field(t('بداية العمل', 'Opening time'), 'opening_time', 'time', s.opening_time || '09:00', 'required')}
        ${field(t('نهاية العمل', 'Closing time'), 'closing_time', 'time', s.closing_time || '22:00', 'required')}
        ${field(t('مدة التنقل بين المواعيد (دقائق)', 'Travel buffer (minutes)'), 'travel_buffer', 'number', s.travel_buffer ?? 30, 'required min="0"')}
        ${field(t('الحد الأدنى قبل الطلب (ساعات)', 'Lead time (hours)'), 'lead_hours', 'number', s.lead_hours ?? 12, 'required min="0"')}
        <label class="field">
          ${t('أيام العمل', 'Working days')}
          <select name="working_days" multiple size="7">
            ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
              .map(
                (en, i) =>
                  `<option value="${i}" ${(s.working_days || []).includes(i) ? 'selected' : ''}>${t(['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][i], en)}</option>`,
              )
              .join('')}
          </select>
        </label>
        <label class="field">
          ${t('أحياء الخدمة (حي في كل سطر)', 'Madinah neighborhoods (one per line)')}
          <textarea name="areas">${esc((s.areas || []).join('\n'))}</textarea>
        </label>
        <label class="field">
          ${t('التواريخ المغلقة (YYYY-MM-DD في كل سطر)', 'Blocked dates (one YYYY-MM-DD per line)')}
          <textarea name="blocked_dates">${esc((s.blocked_dates || []).join('\n'))}</textarea>
        </label>
      </div>

      <h3>${t('قواعد نادي بتلات J', 'J Petals Club Rules')}</h3>
      <div class="form-grid">
        ${field(t('النقاط لكل 1 ر.س مؤهل', 'Points per eligible SAR'), 'points_per_sar', 'number', s.points_per_sar ?? 1, 'min="0" step="0.01" required')}
        <label class="field">
          ${t('المكافآت: رمز | نقاط | قيمة ر.س', 'Rewards: id | points | value SAR (one per line)')}
          <textarea name="rewards">${esc((s.rewards || []).map((r) => `${r.id} | ${r.points} | ${r.value}`).join('\n'))}</textarea>
        </label>
      </div>

      <label class="check">
        <input type="checkbox" name="business_approved" ${s.business_approved ? 'checked' : ''}>
        <span>${t('اعتمدت الإدارة الأسعار والباقات ووصف الخدمات للإطلاق.', 'Management approved catalog prices, packages, and copy.')}</span>
      </label>

      <h3>${t('المحتوى النصي للموقع', 'Editable Website Pages')}</h3>
      ${['about', 'faq', 'policies', 'privacy', 'terms']
        .map(
          (k) => `
        <details class="details">
          <summary>${
            {
              about: t('عن J SPA', 'About'),
              faq: t('الأسئلة الشائعة', 'FAQ'),
              policies: t('سياسة الحجز', 'Booking policies'),
              privacy: t('الخصوصية', 'Privacy'),
              terms: t('الشروط', 'Terms'),
            }[k]
          }</summary>
          <div class="form-grid" style="margin-top:14px">
            ${['ar', 'en']
              .map(
                (l) => `
              <label class="field">
                ${l === 'ar' ? 'العربية' : 'English'}
                <textarea name="${k}_${l}" maxlength="15000" dir="${l === 'ar' ? 'rtl' : 'ltr'}">${esc(s[`${k}_${l}`] || '')}</textarea>
              </label>
            `,
              )
              .join('')}
          </div>
        </details>
      `,
        )
        .join('')}

      <button class="btn" type="submit">${t('حفظ جميع الإعدادات والمحتوى', 'Save Settings & Content')}</button>
    </form>
  `;
}

function adminContent() {
  const a = state.admin;
  const tab = state.adminTab;
  const bookings = a.bookings || [];

  if (tab === 'overview') {
    const analytics = a.analytics || {};
    const pendingList = bookings.filter((b) => b.status === 'pending_confirmation');
    return `
      <h2>${t('ملخص العمليات', 'Operations Overview')}</h2>
      <div class="stats">
        <div class="stat">${t('طلبات الحجز', 'Booking requests')}<b>${bookings.length}</b></div>
        <div class="stat">${t('بانتظار التأكيد', 'Pending')}<b>${pendingList.length}</b></div>
        <div class="stat">${t('مؤكدة', 'Confirmed')}<b>${bookings.filter((x) => x.status === 'confirmed').length}</b></div>
        <div class="stat">${t('مكتملة', 'Completed')}<b>${bookings.filter((x) => x.status === 'completed').length}</b></div>
      </div>
      ${
        isOwner()
          ? `<div class="stats" style="margin-top:-10px">
               <div class="stat">${t('الإيراد المتحقق', 'Verified revenue')}<b>${money(analytics.revenue || 0)}</b></div>
               <div class="stat">${t('مكتملة غير مدفوعة', 'Unpaid completed')}<b>${analytics.unpaid || 0}</b></div>
               <div class="stat">${t('عميلات عائدات', 'Returning guests')}<b>${analytics.returning_customers || 0}</b></div>
               <div class="stat">${t('بتلات صادرة / مستبدلة', 'Petals issued / redeemed')}<b>${analytics.points_issued || 0} / ${analytics.points_redeemed || 0}</b></div>
             </div>`
          : ''
      }
      <div class="notice">${t(
        'الطلبات المعلقة لا تُحتسب إيراداً. الإيراد الفعلي يعتمد فقط على الدفعات المتحقق منها بواسطة الفريق.',
        'Pending requests are never counted as revenue. Recorded revenue reflects verified payments only.',
      )}</div>
      <h3>${t('طلبات بانتظار المراجعة والتأكيد', 'Pending Confirmation Queue')}</h3>
      ${adminBookings(pendingList)}
    `;
  }

  if (tab === 'bookings') {
    const filterStatus = state.adminBookingFilter;
    const filtered =
      filterStatus === 'all' ? bookings : bookings.filter((b) => b.status === filterStatus);
    return `
      <h2>${t('إدارة الحجوزات', 'Booking Management')}</h2>
      <div class="filter">
        ${[
          ['pending_confirmation', 'بانتظار التأكيد', 'Pending'],
          ['confirmed', 'مؤكدة', 'Confirmed'],
          ['in_progress', 'قيد التنفيذ', 'In progress'],
          ['completed', 'مكتملة', 'Completed'],
          ['all', 'الكل', 'All'],
        ]
          .map(
            ([id, ar, en]) =>
              `<button type="button" data-admin-bfilter="${id}" class="${filterStatus === id ? 'active' : ''}">${t(ar, en)}</button>`,
          )
          .join('')}
      </div>
      ${adminBookings(filtered)}
    `;
  }

  if (tab === 'calendar') return calendarView(a);

  if (tab === 'customers') {
    const verifications = new Map((a.verifications || []).map((v) => [v.user_id, v]));
    return `
      <h2>${t('العميلات وتوثيق الحسابات', 'Customers & Phone Verification')}</h2>
      ${
        !isOwner()
          ? `<div class="notice">${t(
              'لحماية خصوصية العميلات، تظهر الأرقام مخفية للموظفات. يرجى مطابقة رقم المرسلة الفعلي من محادثة واتساب مع رمز التحقق.',
              'To enforce least-privilege privacy, customer numbers are masked for employees. Always read the actual WhatsApp sender number before verification.',
            )}</div>`
          : ''
      }
      ${
        (a.customers || [])
          .map((c) => {
            const displayPhone = c.phone || c.phone_masked || '****';
            const hasPending = verifications.has(c.id) || c.has_pending_verification;
            return `
          <details class="details">
            <summary>
              <div class="row">
                <span><strong>${esc(c.name)}</strong> · <bdi>${esc(displayPhone)}</bdi></span>
                <span>
                  ${hasPending ? `<span class="badge pending">${t('طلب توثيق نشط', 'Pending code')}</span> ` : ''}
                  <span class="badge ${c.verified ? '' : 'pending'}">${c.verified ? t('موثقة', 'Verified') : t('غير موثقة', 'Unverified')}</span>
                </span>
              </div>
            </summary>
            <form data-admin-form="verify">
              <input type="hidden" name="user_id" value="${esc(c.id)}">
              ${field(t('مرجع التحقق من رسالة العميلة', 'Verification reference from WhatsApp message'), 'reference', 'text', '', 'required')}
              ${field(t('رقم المرسلة الفعلي كما يظهر في واتساب', 'Actual WhatsApp sender number'), 'observed_phone', 'tel', '', 'required placeholder="05xxxxxxxx"')}
              <label class="check">
                <input type="checkbox" name="checked" required>
                <span>${t('تحققت من رقم المرسلة الفعلي ومطابقته للرمز.', 'I verified the actual WhatsApp sender number and one-time reference.')}</span>
              </label>
              <button class="btn small" type="submit">${t('اعتماد توثيق الحساب', 'Approve verification')}</button>
            </form>
            <form data-admin-form="recovery">
              <h4 style="margin:0 0 10px">${t('إنشاء رابط استعادة كلمة مرور', 'Staff-Assisted Password Recovery')}</h4>
              <input type="hidden" name="user_id" value="${esc(c.id)}">
              ${field(t('رقم واتساب الموثق للمرسلة', 'Verified WhatsApp sender number'), 'observed_phone', 'tel', '', 'required')}
              <label class="check">
                <input type="checkbox" name="checked" required>
                <span>${t('تحققت من هوية العميلة عبر المحادثة المعتمدة.', 'I verified customer identity through the established WhatsApp chat.')}</span>
              </label>
              <button class="btn small light" type="submit">${t('إنشاء رابط استعادة لمرة واحدة', 'Create single-use recovery link')}</button>
              <div class="admin-result" style="margin-top:12px"></div>
            </form>
          </details>
        `;
          })
          .join('') || `<div class="empty muted">${t('لا توجد حسابات عميلات بعد.', 'No customer accounts yet.')}</div>`
      }
    `;
  }

  if (tab === 'payments' && isOwner()) {
    const unpaid = bookings.filter((b) => b.status === 'completed' && !b.payment_verified);
    const fmtTs = (ts) => (ts ? ts.slice(0, 16).replace('T', ' ') : '—');
    return `
      <h2>${t('المدفوعات والإيراد الفعلي', 'Recorded Payments & Revenue')}</h2>
      <p class="muted">${t('تُظهر هذه القائمة فقط الدفعات التي تم التحقق منها من خلال تفاصيل الحجز. التواريخ الفارغة (—) تعني عدم توفر طابع زمني مسجل مسبقاً.', 'Displays staff-verified payments only. Blank verification timestamps indicate historical records without stored timestamps.')}</p>
      ${simpleTable(
        (a.payments || []).map((p) => ({
          reference: p.reference,
          customer_name: p.customer_name,
          service_date: p.service_date,
          booking_total: money(p.booking_total),
          paid_amount: money(p.paid_amount),
          refund_amount: money(p.refund_amount),
          net_amount: money(p.net_amount),
          payment_method: p.payment_method,
          payment_verified_at: fmtTs(p.payment_verified_at),
        })),
        [
          'reference',
          'customer_name',
          'service_date',
          'booking_total',
          'paid_amount',
          'refund_amount',
          'net_amount',
          'payment_method',
          'payment_verified_at',
        ],
      )}
      <h3 style="margin-top:26px">${t('حجوزات مكتملة بانتظار توثيق الدفع', 'Completed Bookings Pending Payment Verification')}</h3>
      ${adminBookings(unpaid)}
    `;
  }

  if (tab === 'rewards') {
    return `
      <h2>${t('طلبات المكافآت ونادي بتلات J', 'Rewards & J Petals Club')}</h2>
      ${
        (a.reward_requests || [])
          .map(
            (r) => `
        <details class="details">
          <summary>${esc(r.id)} · ${esc(r.status)} · ${r.points} ${t('بتلة', 'petals')} (${money(r.value)})</summary>
          <form data-admin-form="rewards/${esc(r.id)}">
            <label class="field">
              ${t('الحجز المؤهل', 'Eligible booking')}
              <select name="booking_id" required>
                <option value="">${t('اختاري الحجز', 'Choose booking')}</option>
                ${bookings
                  .filter((b) => b.user_id === r.user_id)
                  .map((b) => `<option value="${esc(b.id)}">${esc(b.reference)} · ${money(b.total)} · ${statusLabel(b.status)}</option>`)
                  .join('')}
              </select>
            </label>
            <label class="field">
              ${t('الإجراء', 'Action')}
              <select name="action">
                <option value="commit">${t('اعتماد وخصم البتلات', 'Commit & deduct petals')}</option>
                <option value="cancel">${t('إلغاء الطلب / رد البتلات', 'Cancel / restore petals')}</option>
              </select>
            </label>
            <button class="btn small" type="submit">${t('تنفيذ', 'Apply')}</button>
          </form>
        </details>
      `,
          )
          .join('') || `<div class="empty muted">${t('لا توجد طلبات مكافآت معلقة.', 'No pending reward requests.')}</div>`
      }
      ${
        isOwner()
          ? `<h3 style="margin-top:24px">${t('سجل حركات البتلات', 'Loyalty Ledger')}</h3>
             ${simpleTable(a.ledger || [], ['created_at', 'user_id', 'booking_id', 'points', 'reason'])}
             <details class="details">
               <summary>${t('تعديل نقاط يدوي (بصلاحية المالكة)', 'Owner Manual Point Adjustment')}</summary>
               <form data-admin-form="adjustment">
                 <label class="field">
                   ${t('العميلة', 'Customer')}
                   <select name="user_id">
                     ${(a.customers || []).map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(c.phone || '')})</option>`).join('')}
                   </select>
                 </label>
                 ${field(t('النقاط (موجب أو سالب)', 'Points (+/-)'), 'points', 'number', '', 'required step="1"')}
                 ${field(t('السبب المكتوب', 'Written reason'), 'reason', 'text', '', 'required minlength="5"')}
                 <button class="btn small" type="submit">${t('تسجيل التعديل', 'Record adjustment')}</button>
               </form>
             </details>`
          : ''
      }
    `;
  }

  if (tab === 'services' && isOwner()) {
    return `
      <h2>${t('إدارة الخدمات (13 خدمة)', 'Manage Services')}</h2>
      ${(a.services || []).map((s) => catalogEditor(s, 'services')).join('')}
      ${catalogEditor({}, 'services')}
    `;
  }

  if (tab === 'packages' && isOwner()) {
    return `
      <h2>${t('إدارة الباقات', 'Manage Packages')}</h2>
      ${(a.packages || []).map((p) => catalogEditor(p, 'packages')).join('')}
      ${catalogEditor({}, 'packages')}
    `;
  }

  if (tab === 'reviews' && isOwner()) {
    return `
      <h2>${t('مراجعة تقييمات العميلات', 'Review Moderation')}</h2>
      ${
        (a.reviews || [])
          .map(
            (r) => `
        <article class="card" style="margin-bottom:14px">
          <div class="stars">${'★'.repeat(r.rating)}</div>
          <p>${esc(r.body)}</p>
          <div class="row">
            <span class="muted">${esc(r.display_name)} · ${r.approved ? t('منشور', 'Published') : t('بانتظار الموافقة', 'Unpublished')}</span>
            <button class="btn small light" data-moderate="${esc(r.id)}" data-approved="${!r.approved}" type="button">
              ${r.approved ? t('إلغاء النشر', 'Unpublish') : t('اعتماد النشر', 'Approve publication')}
            </button>
          </div>
        </article>
      `,
          )
          .join('') || `<div class="empty muted">${t('لا توجد تقييمات للمراجعة بعد.', 'No reviews to moderate yet.')}</div>`
      }
    `;
  }

  if (tab === 'settings' && isOwner()) return settingsForm(a.settings || {});

  if (tab === 'staff' && isOwner()) {
    return `
      <h2>${t('إدارة الموظفات', 'Staff Management')}</h2>
      ${(a.staff || [])
        .map(
          (emp) => `
        <div class="card row" style="margin-bottom:12px">
          <span><strong>${esc(emp.name)}</strong> · <bdi>${esc(emp.phone)}</bdi> · ${emp.role === 'owner' ? t('المالكة', 'Owner') : emp.role === 'disabled_employee' ? t('معطّلة', 'Disabled') : t('موظفة', 'Employee')}</span>
          ${
            emp.role === 'owner'
              ? ''
              : `<form data-admin-form="staff/${esc(emp.id)}">
                   <input type="hidden" name="action" value="${emp.role === 'disabled_employee' ? 'enable' : 'disable'}">
                   <button class="btn small light" type="submit">${emp.role === 'disabled_employee' ? t('إعادة تفعيل', 'Enable') : t('تعطيل الوصول', 'Disable')}</button>
                 </form>`
          }
        </div>
      `,
        )
        .join('')}
      <form data-admin-form="staff" class="card" style="margin-top:20px">
        <h3>${t('إضافة حساب موظفة', 'Add Employee Account')}</h3>
        <div class="form-grid">
          ${field(t('الاسم', 'Name'), 'name', 'text', '', 'required')}
          ${field(t('الجوال السعودي', 'Saudi mobile'), 'phone', 'tel', '', 'required')}
          ${field(t('كلمة مرور أولية قوية (12+)', 'Strong initial password (12+)'), 'password', 'password', '', 'required minlength="12"')}
        </div>
        <input type="hidden" name="role" value="employee">
        <button class="btn small" type="submit">${t('إنشاء الحساب', 'Create employee account')}</button>
      </form>
    `;
  }

  if (tab === 'audit' && isOwner()) {
    const fmtDetail = (raw) => {
      if (!raw) return '—';
      try {
        const obj = JSON.parse(raw);
        return Object.entries(obj)
          .filter(([, v]) => v !== '' && v !== null && v !== undefined)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ') || '—';
      } catch {
        return raw;
      }
    };
    const rows = (a.audit || []).map((r) => ({
      ...r,
      created_at: r.created_at ? r.created_at.slice(0, 16).replace('T', ' ') : '—',
      detail: fmtDetail(r.detail),
    }));
    return `
      <h2>${t('سجل التدقيق', 'Audit Log')}</h2>
      ${simpleTable(rows, ['created_at', 'actor_name', 'action', 'target', 'detail'])}
    `;
  }

  return '';
}

export async function adminPage() {
  if (!state.user) return auth('login');
  if (!isStaff()) {
    return `<main id="main" class="wrap">${head(t('الدخول مخصص للفريق', 'Staff access only'))}<div class="empty">${t('هذا القسم مخصص للموظفات والإدارة فقط.', 'Your account does not have staff access.')}</div></main>`;
  }
  if (!state.admin) {
    state.admin = await api('/admin');
  }

  const pendingCount = (state.admin.bookings || []).filter((b) => b.status === 'pending_confirmation').length;
  const verifyCount = (state.admin.verifications || []).length;
  const tabs = [
    ['overview', 'نظرة عامة', 'Overview', ''],
    ['bookings', 'الحجوزات', 'Bookings', pendingCount || ''],
    ['calendar', 'التقويم والسعة', 'Calendar', ''],
    ['customers', 'العميلات والتوثيق', 'Customers & Verify', verifyCount || ''],
    ...(isOwner() ? [['payments', 'المدفوعات', 'Payments', '']] : []),
    ['rewards', 'المكافآت والبتلات', 'Rewards & Petals', ''],
    ...(isOwner()
      ? [
          ['services', 'الخدمات', 'Services', ''],
          ['packages', 'الباقات', 'Packages', ''],
          ['reviews', 'التقييمات', 'Reviews', ''],
          ['settings', 'الإعدادات والمحتوى', 'Settings', ''],
          ['staff', 'الفريق', 'Staff', ''],
          ['audit', 'سجل التدقيق', 'Audit log', ''],
        ]
      : []),
  ];

  if (!tabs.some(([id]) => id === state.adminTab)) {
    state.adminTab = 'overview';
  }

  return `
    <main id="main" class="wrap">
      ${head(
        t('لوحة العمليات والإدارة', 'Operations & Admin Workspace'),
        isOwner()
          ? t('صلاحية المالكة: تحكم كامل بالخدمات والأسعار والإيرادات والإعدادات.', 'Owner view: full operational, financial, and catalog control.')
          : t('صلاحية الموظفة: تأكيد الحجوزات، التوثيق عبر واتساب، وتسجيل الدفع.', 'Employee view: least-privilege operational access.'),
      )}
      <div class="admin-grid">
        <aside class="admin-nav" aria-label="${t('أقسام الإدارة', 'Admin sections')}">
          ${tabs
            .map(
              ([id, ar, en, count]) => `
            <button type="button" data-admin-tab="${id}" class="${state.adminTab === id ? 'active' : ''}">
              <span>${t(ar, en)}</span>
              ${count ? `<span class="nav-count">${count}</span>` : ''}
            </button>
          `,
            )
            .join('')}
          <button type="button" id="logout" style="color:var(--error-text);margin-top:8px">${t('تسجيل الخروج', 'Sign out')}</button>
        </aside>
        <div class="dashboard-content">
          <div id="admin-error" role="alert"></div>
          ${adminContent()}
        </div>
      </div>
    </main>
  `;
}

export function bindAdmin(renderFn) {
  document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
    btn.onclick = () => {
      state.adminTab = btn.dataset.adminTab;
      renderFn();
    };
  });

  document.querySelectorAll('[data-admin-bfilter]').forEach((btn) => {
    btn.onclick = () => {
      state.adminBookingFilter = btn.dataset.adminBfilter;
      renderFn();
    };
  });

  document.querySelectorAll('[data-cal-day]').forEach((btn) => {
    btn.onclick = () => {
      state.adminCalendarDate = btn.dataset.calDay;
      renderFn();
    };
  });

  $('#cal-date-input')?.addEventListener('change', (e) => {
    state.adminCalendarDate = e.target.value;
    renderFn();
  });

  document.querySelectorAll('[data-moderate]').forEach((btn) => {
    btn.onclick = async () => {
      try {
        await api('/admin/reviews/' + btn.dataset.moderate, {
          approved: btn.dataset.approved === 'true',
        });
        await refreshAdmin(renderFn);
      } catch (err) {
        toast(err.message);
      }
    };
  });

  document.querySelectorAll('[data-admin-form]').forEach((f) => {
    f.onsubmit = async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const route = f.dataset.adminForm;
      for (const k of ['checked', 'active', 'remove', 'payment_verified', 'credentials_required', 'credentials_approved']) {
        if (f.elements[k]) d[k] = f.elements[k].checked;
      }
      for (const k of ['price', 'duration', 'paid_amount', 'refund_amount', 'points']) {
        if (d[k] !== undefined) {
          if (d[k] === '') delete d[k];
          else d[k] = Number(d[k]);
        }
      }
      if (f.elements.service_ids) {
        d.service_ids = [...f.elements.service_ids.selectedOptions].map((x) => x.value);
      }
      if (route.startsWith('bookings/') && !f.dataset.refund) {
        const old = state.admin.bookings.find((x) => x.id === route.split('/')[1]);
        if (d.date === old?.date) delete d.date;
        if (d.time === old?.time) delete d.time;
        if (!d.payment_method) delete d.payment_method;
      }
      const btn = e.submitter;
      btn.disabled = true;
      try {
        const r = await api('/admin/' + route, d);
        if (route === 'recovery') {
          f.querySelector('.admin-result').innerHTML = `
            <div class="success">
              <p>${t('انسخي الرابط وأرسليه يدوياً للعميلة المتحقق منها.', 'Copy the link and manually send it to the verified customer.')}</p>
              <pre>${esc(r.reset_url ? new URL(r.reset_url, location.origin).href : r.token)}</pre>
            </div>
          `;
          btn.disabled = false;
        } else {
          await refreshAdmin(renderFn);
        }
      } catch (err) {
        toast(err.message);
        btn.disabled = false;
      }
    };
  });

  $('#settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const d = Object.fromEntries(new FormData(f));
    for (const k of ['capacity', 'travel_buffer', 'lead_hours', 'points_per_sar']) {
      d[k] = Number(d[k]);
    }
    d.working_days = [...f.elements.working_days.selectedOptions].map((x) => Number(x.value));
    for (const k of ['areas', 'blocked_dates']) {
      d[k] = d[k]
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    d.business_approved = f.elements.business_approved.checked;
    try {
      d.rewards = d.rewards
        .split('\n')
        .filter((s) => s.trim())
        .map((line) => {
          const [id, p, v] = line.split('|').map((s) => s.trim());
          if (!id || !Number.isFinite(Number(p)) || !Number.isFinite(Number(v))) {
            throw new Error(t('تنسيق المكافأة غير صحيح', 'Invalid reward format'));
          }
          return { id, points: Number(p), value: Number(v) };
        });
      await api('/admin/settings', { settings: d });
      await refreshAdmin(renderFn);
    } catch (err) {
      toast(err.message);
    }
  });
}

async function refreshAdmin(renderFn) {
  state.admin = null;
  state.catalog = await api('/catalog');
  toast(t('تم الحفظ', 'Saved'));
  await renderFn();
}
