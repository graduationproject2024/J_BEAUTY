import { $ops, esc, loadDashboard, opsApi, opsToast, t } from '../ops-state.js';

export function settingsView(d) {
  const s = d.settings || {};
  const workingSet = new Set(s.working_days || [0, 1, 2, 3, 4, 5, 6]);
  const wheelPrizes = Array.isArray(s.wheel_prizes) && s.wheel_prizes.length
    ? s.wheel_prizes
    : [
        { id: 'jb5', title_ar: 'خصم 5%', title_en: '5% OFF', code: 'JB5', discount_type: 'percent', value: 5 },
        { id: 'jb7', title_ar: 'خصم 7%', title_en: '7% OFF', code: 'JB7', discount_type: 'percent', value: 7 },
        { id: 'jbsar10', title_ar: 'خصم 10 ريال', title_en: '10 SAR OFF', code: 'JBSAR10', discount_type: 'fixed', value: 10 },
        { id: 'jb10', title_ar: 'خصم 10%', title_en: '10% OFF', code: 'JB10', discount_type: 'percent', value: 10 },
        { id: 'jbsar15', title_ar: 'خصم 15 ريال', title_en: '15 SAR OFF', code: 'JBSAR15', discount_type: 'fixed', value: 15 },
        { id: 'jbpetals20', title_ar: '20 بتلة هدية', title_en: '20 Bonus Petals', code: 'JBPETALS20', discount_type: 'fixed', value: 10 },
      ];
  const dayNames = [
    [0, 'الأحد', 'Sun'],
    [1, 'الإثنين', 'Mon'],
    [2, 'الثلاثاء', 'Tue'],
    [3, 'الأربعاء', 'Wed'],
    [4, 'الخميس', 'Thu'],
    [5, 'الجمعة', 'Fri'],
    [6, 'السبت', 'Sat'],
  ];

  return `
    <div class="ops-card">
      <h2>${t('إعدادات المنصة والجدولة والتغطية وعجلة المكافآت', 'Platform, Coverage, Rewards Wheel & Policy Settings')}</h2>
      <form id="ops-settings-form">
        <div class="form-grid">
          <label class="field">${t('واتساب استقبال الطلبات', 'Business WhatsApp Phone')}<input type="tel" name="business_phone" value="${esc(s.business_phone || '')}" placeholder="05xxxxxxxx"></label>
          <label class="field">${t('Instagram URL', 'Instagram URL')}<input type="url" name="instagram" value="${esc(s.instagram || '')}"></label>
          <label class="field">${t('TikTok URL', 'TikTok URL')}<input type="url" name="tiktok" value="${esc(s.tiktok || '')}"></label>
          <label class="field">${t('Snapchat URL', 'Snapchat URL')}<input type="url" name="snapchat" value="${esc(s.snapchat || '')}"></label>
          <label class="field">${t('الطاقة التزامنية القصوى (Capacity)', 'Concurrent Capacity')}<input type="number" min="0" max="1000" name="capacity" value="${esc(s.capacity ?? 0)}" required></label>
          <label class="field">${t('فاصل التنقل بين المواعيد (دقيقة)', 'Travel Buffer (min)')}<input type="number" min="0" max="1000" name="travel_buffer" value="${esc(s.travel_buffer ?? 30)}" required></label>
          <label class="field">${t('الحد الأدنى للمهلة المسبقة (ساعة)', 'Minimum Lead Hours')}<input type="number" min="0" max="1000" name="lead_hours" value="${esc(s.lead_hours ?? 12)}" required></label>
          <label class="field">${t('بداية الدوام (HH:MM)', 'Opening Time')}<input type="time" name="opening_time" value="${esc(s.opening_time || '09:00')}" required></label>
          <label class="field">${t('نهاية الدوام (HH:MM)', 'Closing Time')}<input type="time" name="closing_time" value="${esc(s.closing_time || '22:00')}" required></label>
          <label class="field">${t('معدل بتلات J لكل ر.س', 'Petals per SAR')}<input type="number" step="0.1" min="0" max="100" name="points_per_sar" value="${esc(s.points_per_sar ?? 1)}" required></label>
        </div>

        <!-- Coverage & Excluded Areas -->
        <div class="ops-card" style="margin:16px 0;background:var(--ivory);border:1px solid var(--border)">
          <h3>📍 ${t('نطاق التغطية بالمدينة المنورة والأحياء خارج النطاق', 'Al Madinah Coverage & Excluded Areas')}</h3>
          <p class="muted" style="font-size:13.5px;margin-top:0">${t('الخدمة متاحة لجميع أحياء المدينة المنورة برسوم التوصيل. حدّدي هنا فقط الأحياء التي لا نغطيها حالياً والرسالة التي تظهر للعميلة.', 'All Al Madinah neighborhoods are covered by default. List only excluded neighborhoods and customize the out-of-range message.')}</p>
          <div class="form-grid">
            <label class="field">
              ${t('الأحياء خارج النطاق (سطر لكل حي)', 'Excluded / Out-of-Range Areas (one per line)')}
              <textarea name="excluded_areas_text" placeholder="${t('مثال:\nالعاقول\nالمندسة\nأبيار الماشي', 'e.g.\nAl Aqoul\nAl Mandassah')}">${esc((s.excluded_areas || []).join('\n'))}</textarea>
            </label>
            <label class="field">
              ${t('رسوم التوصيل المنزلي (ر.س — 0 = مجاني)', 'Home Delivery Fee (SAR, 0 = Free)')}
              <input type="number" min="0" max="500" name="delivery_fee" value="${esc(s.delivery_fee ?? 0)}">
            </label>
          </div>
          <div class="form-grid">
            <label class="field">
              ${t('رسالة "خارج النطاق" للعميلات (عربي)', 'Out-of-Range Message (AR)')}
              <textarea name="out_of_range_message_ar">${esc(s.out_of_range_message_ar || 'نعتذر عزيزتي، هذا الحي خارج نطاق التغطية حالياً في المدينة المنورة. يمكنك التواصل معنا عبر واتساب للتنسيق الخاص.')}</textarea>
            </label>
            <label class="field">
              ${t('رسالة "خارج النطاق" للعميلات (إنجليزي)', 'Out-of-Range Message (EN)')}
              <textarea name="out_of_range_message_en">${esc(s.out_of_range_message_en || 'Sorry, this neighborhood is currently outside our standard Madinah coverage area.')}</textarea>
            </label>
          </div>
          <label class="field">
            ${t('قائمة أحياء مقيدة (اختياري — اتركيه فارغاً لتغطية كل المدينة المنورة)', 'Optional Restrictive Allowlist (leave blank for all Madinah)')}
            <textarea name="areas_text">${esc((s.areas || []).join('\n'))}</textarea>
          </label>
        </div>

        <!-- Wheel of Rewards Control Center -->
        <div class="ops-card" style="margin:16px 0;background:var(--ivory);border:1.5px solid var(--rose-gold)">
          <h3>🎁 ${t('التحكم الكامل بعجلة المكافآت (إظهار / إخفاء / تعديل الجوائز)', 'Wheel of Rewards Control Center')}</h3>
          <div class="form-grid" style="align-items:center">
            <label class="ops-check">
              <input type="checkbox" name="wheel_enabled" ${s.wheel_enabled !== false ? 'checked' : ''}>
              <span><strong>${t('تفعيل وإظهار عجلة المكافآت في الموقع والحجز', 'Show / Enable Rewards Wheel across Site & Booking')}</strong></span>
            </label>
            <label class="ops-check">
              <input type="checkbox" name="wheel_first_visit_only" ${s.wheel_first_visit_only ? 'checked' : ''}>
              <span>${t('إظهار العجلة في الزيارة الأولى فقط', 'First visit only')}</span>
            </label>
            <label class="field">
              ${t('فترة التكرار الدورية (كل كم يوم تظهر مجدداً)', 'Periodic Cooldown (Days)')}
              <input type="number" min="1" max="365" name="wheel_cooldown_days" value="${esc(s.wheel_cooldown_days ?? 14)}">
            </label>
          </div>
          <div style="margin-top:12px">
            <strong style="display:block;margin-bottom:8px">${t('تعديل جوائز وخصومات العجلة (يتم مزامنة الأكواد تلقائياً مع جدول الكوبونات):', 'Edit Wheel Slices (codes auto-sync with Coupons):')}</strong>
            <div style="display:grid;gap:8px" id="ops-wheel-prizes-list">
              ${wheelPrizes
                .map(
                  (p, idx) => `
                    <div class="form-grid" data-wheel-row="${idx}" style="background:#fff;padding:10px;border-radius:10px;border:1px solid var(--border);align-items:end">
                      <label class="field" style="margin:0"><small>${t('النص بالعربي', 'Label AR')}</small><input type="text" data-wp="title_ar" value="${esc(p.title_ar || '')}" required></label>
                      <label class="field" style="margin:0"><small>${t('النص بالإنجليزي', 'Label EN')}</small><input type="text" data-wp="title_en" value="${esc(p.title_en || '')}" required></label>
                      <label class="field" style="margin:0"><small>${t('كود الخصم', 'Code')}</small><input type="text" data-wp="code" value="${esc(p.code || '')}" style="text-transform:uppercase" required></label>
                      <label class="field" style="margin:0"><small>${t('النوع', 'Type')}</small>
                        <select data-wp="discount_type">
                          <option value="percent" ${p.discount_type === 'percent' ? 'selected' : ''}>${t('نسبة %', 'Percent %')}</option>
                          <option value="fixed" ${p.discount_type === 'fixed' ? 'selected' : ''}>${t('مبلغ ر.س', 'Fixed SAR')}</option>
                        </select>
                      </label>
                      <label class="field" style="margin:0"><small>${t('القيمة', 'Value')}</small><input type="number" min="1" max="250" data-wp="value" value="${esc(p.value || 5)}" required></label>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>
        </div>

        <!-- Bank, Invoice & Commission Settings -->
        <div class="ops-card" style="margin:16px 0;background:var(--ivory);border:1px solid var(--border)">
          <h3>🏦 ${t('بيانات التحويل البنكي والفواتير وعمولة الأخصائيات', 'Bank Details, Invoices & Staff Commission Rules')}</h3>
          <div class="form-grid">
            <label class="field">${t('اسم البنك', 'Bank Name')}<input type="text" name="bank_name" value="${esc(s.bank_name || 'مصرف الراجحي')}"></label>
            <label class="field">${t('اسم المستفيد', 'Account Holder')}<input type="text" name="bank_account_holder" value="${esc(s.bank_account_holder || 'مؤسسة J Beauty Spa')}"></label>
            <label class="field">${t('رقم الآيبان (IBAN)', 'IBAN')}<input type="text" dir="ltr" name="bank_iban" value="${esc(s.bank_iban || 'SA0380000000000000000000')}"></label>
            <label class="field">${t('هدف الزيارات الشهري للعمولة', 'Monthly Visits Threshold')}<input type="number" min="1" max="1000" name="commission_threshold" value="${esc(s.commission_threshold ?? 50)}"></label>
            <label class="field">${t('نسبة العمولة بعد الهدف (%)', 'Commission Rate (%)')}<input type="number" min="0" max="50" step="0.5" name="commission_rate" value="${esc(s.commission_rate ?? 5)}"></label>
          </div>
        </div>

        <div class="ops-card" style="margin:16px 0;background:var(--ivory);border:1px solid var(--border)">
          <h3>${t('شريط الإعلانات والعروض المتحرك أعلى الموقع', 'Announcement & Offers Ticker')}</h3>
          <label class="ops-check" style="margin-bottom:12px">
            <input type="checkbox" name="announcement_active" ${s.announcement_active !== false ? 'checked' : ''}>
            <span>${t('تفعيل شريط الإعلانات أعلى الموقع', 'Enable Announcement Ticker')}</span>
          </label>
          <div class="form-grid">
            <label class="field">${t('نص الإعلان (عربي)', 'Announcement Text (AR)')}<input type="text" name="announcement_text_ar" value="${esc(s.announcement_text_ar || '')}" placeholder="سبا نسائي منزلي..."></label>
            <label class="field">${t('نص الإعلان (إنجليزي)', 'Announcement Text (EN)')}<input type="text" name="announcement_text_en" value="${esc(s.announcement_text_en || '')}" placeholder="Luxury Women’s Home Spa..."></label>
            <label class="field">${t('رابط الإعلان (اختياري)', 'Announcement Link (Optional)')}<input type="text" name="announcement_link" value="${esc(s.announcement_link || '')}" placeholder="/booking أو /packages"></label>
          </div>
        </div>

        <div class="field">
          <span>${t('أيام العمل المعتمدة', 'Working Days')}</span>
          <div class="ops-chip-row">
            ${dayNames
              .map(
                ([numDay, ar, en]) =>
                  `<label class="ops-check"><input type="checkbox" data-workday="${numDay}" ${workingSet.has(numDay) ? 'checked' : ''}><span>${t(ar, en)}</span></label>`,
              )
              .join('')}
          </div>
        </div>

        <div class="form-grid">
          <label class="field">${t('من نحن (عربي)', 'About AR')}<textarea name="about_ar">${esc(s.about_ar || '')}</textarea></label>
          <label class="field">${t('من نحن (إنجليزي)', 'About EN')}<textarea name="about_en">${esc(s.about_en || '')}</textarea></label>
          <label class="field">${t('سياسة الحجز (عربي)', 'Policies AR')}<textarea name="policies_ar">${esc(s.policies_ar || '')}</textarea></label>
          <label class="field">${t('سياسة الحجز (إنجليزي)', 'Policies EN')}<textarea name="policies_en">${esc(s.policies_en || '')}</textarea></label>
        </div>

        <label class="ops-check" style="margin-bottom:14px">
          <input type="checkbox" name="business_approved" ${s.business_approved ? 'checked' : ''}>
          <span>${t('اعتماد الأسعار والمعلومات التجارية (تشغيل تجاري مباشر)', 'Approve official pricing & launch readiness')}</span>
        </label>

        <button type="submit" class="btn">${t('حفظ جميع الإعدادات', 'Save Platform Settings')}</button>
      </form>
    </div>
  `;
}

export function bindSettings(renderFn) {
  $ops('#ops-settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const fd = new FormData(f);
    const working_days = [...f.querySelectorAll('[data-workday]:checked')].map((x) => Number(x.dataset.workday));
    const areas = String(fd.get('areas_text') || '')
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean);
    const excluded_areas = String(fd.get('excluded_areas_text') || '')
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean);

    const wheel_prizes = [...f.querySelectorAll('[data-wheel-row]')].map((row, idx) => ({
      id: `wheel-${idx + 1}`,
      title_ar: row.querySelector('[data-wp="title_ar"]')?.value.trim() || '',
      title_en: row.querySelector('[data-wp="title_en"]')?.value.trim() || '',
      code: (row.querySelector('[data-wp="code"]')?.value || '').trim().toUpperCase(),
      discount_type: row.querySelector('[data-wp="discount_type"]')?.value || 'percent',
      value: Number(row.querySelector('[data-wp="value"]')?.value || 5),
    }));

    const payload = {
      settings: {
        business_phone: fd.get('business_phone') || '',
        instagram: fd.get('instagram') || '',
        tiktok: fd.get('tiktok') || '',
        snapchat: fd.get('snapchat') || '',
        announcement_active: f.elements.announcement_active.checked,
        announcement_text_ar: fd.get('announcement_text_ar') || '',
        announcement_text_en: fd.get('announcement_text_en') || '',
        announcement_link: fd.get('announcement_link') || '',
        capacity: Number(fd.get('capacity')),
        travel_buffer: Number(fd.get('travel_buffer')),
        lead_hours: Number(fd.get('lead_hours')),
        opening_time: fd.get('opening_time'),
        closing_time: fd.get('closing_time'),
        points_per_sar: Number(fd.get('points_per_sar')),
        working_days,
        areas,
        excluded_areas,
        out_of_range_message_ar: fd.get('out_of_range_message_ar') || '',
        out_of_range_message_en: fd.get('out_of_range_message_en') || '',
        delivery_fee: Number(fd.get('delivery_fee') || 0),
        wheel_enabled: f.elements.wheel_enabled.checked,
        wheel_first_visit_only: f.elements.wheel_first_visit_only.checked,
        wheel_cooldown_days: Number(fd.get('wheel_cooldown_days') || 14),
        wheel_prizes,
        commission_threshold: Number(fd.get('commission_threshold') || 50),
        commission_rate: Number(fd.get('commission_rate') || 5),
        bank_name: fd.get('bank_name') || '',
        bank_account_holder: fd.get('bank_account_holder') || '',
        bank_iban: fd.get('bank_iban') || '',
        about_ar: fd.get('about_ar') || '',
        about_en: fd.get('about_en') || '',
        policies_ar: fd.get('policies_ar') || '',
        policies_en: fd.get('policies_en') || '',
        business_approved: f.elements.business_approved.checked,
      },
    };
    e.submitter.disabled = true;
    try {
      await opsApi('/settings', payload);
      await loadDashboard();
      opsToast(t('تم حفظ جميع إعدادات المنصة وعجلة المكافآت ✓', 'Settings & Wheel updated ✓'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
      e.submitter.disabled = false;
    }
  });
}
