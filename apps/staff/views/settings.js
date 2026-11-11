import { $ops, esc, loadDashboard, opsApi, opsToast, t } from '../ops-state.js';

export function settingsView(d) {
  const s = d.settings || {};
  const workingSet = new Set(s.working_days || [0, 1, 2, 3, 4, 5, 6]);
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
      <h2>${t('إعدادات المنصة والجدولة والسياسات (المالكة)', 'Platform, Schedule & Policy Settings (Owner)')}</h2>
      <form id="ops-settings-form">
        <div class="form-grid">
          <label class="field">${t('واتساب استقبال الطلبات', 'Business WhatsApp Phone')}<input type="tel" name="business_phone" value="${esc(s.business_phone || '')}" placeholder="05xxxxxxxx"></label>
          <label class="field">${t('Instagram URL', 'Instagram URL')}<input type="url" name="instagram" value="${esc(s.instagram || '')}"></label>
          <label class="field">${t('TikTok URL', 'TikTok URL')}<input type="url" name="tiktok" value="${esc(s.tiktok || '')}"></label>
          <label class="field">${t('الطاقة التزامنية القصوى (Capacity)', 'Concurrent Capacity')}<input type="number" min="0" max="1000" name="capacity" value="${esc(s.capacity ?? 0)}" required></label>
          <label class="field">${t('فاصل التنقل بين المواعيد (دقيقة)', 'Travel Buffer (min)')}<input type="number" min="0" max="1000" name="travel_buffer" value="${esc(s.travel_buffer ?? 30)}" required></label>
          <label class="field">${t('الحد الأدنى للمهلة المسبقة (ساعة)', 'Minimum Lead Hours')}<input type="number" min="0" max="1000" name="lead_hours" value="${esc(s.lead_hours ?? 12)}" required></label>
          <label class="field">${t('بداية الدوام (HH:MM)', 'Opening Time')}<input type="time" name="opening_time" value="${esc(s.opening_time || '09:00')}" required></label>
          <label class="field">${t('نهاية الدوام (HH:MM)', 'Closing Time')}<input type="time" name="closing_time" value="${esc(s.closing_time || '22:00')}" required></label>
          <label class="field">${t('معدل بتلات J لكل ر.س', 'Petals per SAR')}<input type="number" step="0.1" min="0" max="100" name="points_per_sar" value="${esc(s.points_per_sar ?? 1)}" required></label>
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

        <label class="field">
          ${t('أحياء الخدمة في المدينة المنورة (سطر لكل حي)', 'Covered Madinah Neighborhoods (one per line)')}
          <textarea name="areas_text">${esc((s.areas || []).join('\n'))}</textarea>
        </label>

        <div class="form-grid">
          <label class="field">${t('من نحن (عربي)', 'About AR')}<textarea name="about_ar">${esc(s.about_ar || '')}</textarea></label>
          <label class="field">${t('من نحن (إنجليزي)', 'About EN')}<textarea name="about_en">${esc(s.about_en || '')}</textarea></label>
          <label class="field">${t('سياسة الحجز (عربي)', 'Policies AR')}<textarea name="policies_ar">${esc(s.policies_ar || '')}</textarea></label>
          <label class="field">${t('سياسة الحجز (إنجليزي)', 'Policies EN')}<textarea name="policies_en">${esc(s.policies_en || '')}</textarea></label>
        </div>

        <label class="ops-check" style="margin-bottom:14px">
          <input type="checkbox" name="business_approved" ${s.business_approved ? 'checked' : ''}>
          <span>${t('اعتماد الأسعار والمعلومات التجارية (تشغيل تجاري مباشر بدون وسم تجريبي)', 'Approve official pricing & launch readiness (removes provisional notice)')}</span>
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

    const payload = {
      settings: {
        business_phone: fd.get('business_phone') || '',
        instagram: fd.get('instagram') || '',
        tiktok: fd.get('tiktok') || '',
        capacity: Number(fd.get('capacity')),
        travel_buffer: Number(fd.get('travel_buffer')),
        lead_hours: Number(fd.get('lead_hours')),
        opening_time: fd.get('opening_time'),
        closing_time: fd.get('closing_time'),
        points_per_sar: Number(fd.get('points_per_sar')),
        working_days,
        areas,
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
      opsToast(t('تم حفظ إعدادات المنصة', 'Settings updated'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
      e.submitter.disabled = false;
    }
  });
}

