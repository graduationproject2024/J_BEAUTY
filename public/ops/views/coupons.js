import { $ops, can, esc, loadDashboard, num, opsApi, opsState, opsToast, t } from '../ops-state.js';

export function couponsView(d) {
  const coupons = d.coupons || [];
  const canManage = can('settings.manage') || can('services.manage');

  return `
    ${
      canManage
        ? `
          <div class="ops-card">
            <h2>${t('إضافة كوبون خصم جديد', 'Create Discount Coupon')}</h2>
            <form id="ops-create-coupon-form" class="form-grid" style="align-items:end">
              <label class="field">
                ${t('رمز الكوبون (إنجليزي بدون مسافات)', 'Coupon Code')}
                <input type="text" name="code" required placeholder="JBEAUTY10" style="text-transform:uppercase" maxlength="25">
              </label>
              <label class="field">
                ${t('نوع الخصم', 'Discount Type')}
                <select name="discount_type" required>
                  <option value="percent">${t('نسبة مئوية (%)', 'Percentage (%)')}</option>
                  <option value="fixed">${t('مبلغ ثابت (ر.س)', 'Fixed Amount (SAR)')}</option>
                </select>
              </label>
              <label class="field">
                ${t('قيمة الخصم', 'Discount Value')}
                <input type="number" name="discount_value" min="1" max="1000" required placeholder="10">
              </label>
              <label class="field">
                ${t('الحد الأدنى للطلب (ر.س)', 'Min Spend (SAR)')}
                <input type="number" name="min_spend" min="0" value="0" placeholder="100">
              </label>
              <label class="field">
                ${t('تاريخ البدء', 'Valid From')}
                <input type="date" name="valid_from">
              </label>
              <label class="field">
                ${t('تاريخ الانتهاء', 'Valid Until')}
                <input type="date" name="valid_until">
              </label>
              <label class="field">
                ${t('الحد الأقصى للاستخدام (0 = غير محدود)', 'Max Uses')}
                <input type="number" name="max_uses" min="0" value="1000">
              </label>
              <button type="submit" class="btn sage">${t('حفظ وتفعيل الكوبون', 'Save Coupon')}</button>
            </form>
          </div>
        `
        : ''
    }

    <div class="ops-card">
      <div class="row" style="margin-bottom:12px">
        <h2>${t('كوبونات الخصم النشطة والسابقة', 'Active & Expired Coupons')} (${num(coupons.length)})</h2>
      </div>
      ${
        !coupons.length
          ? `<p class="muted">${t('لا توجد كوبونات مسجلة حتى الآن.', 'No coupons found.')}</p>`
          : `
            <div class="ops-table-wrap">
              <table class="ops-table">
                <thead>
                  <tr>
                    <th>${t('كود الكوبون', 'Code')}</th>
                    <th>${t('الخصم', 'Discount')}</th>
                    <th>${t('الحد الأدنى', 'Min Spend')}</th>
                    <th>${t('الصلاحية', 'Validity')}</th>
                    <th>${t('الاستخدام', 'Usage')}</th>
                    <th>${t('الحالة', 'Status')}</th>
                    ${canManage ? `<th>${t('إدارة', 'Actions')}</th>` : ''}
                  </tr>
                </thead>
                <tbody>
                  ${coupons
                    .map(
                      (c) => `
                        <tr>
                          <td><strong class="mono" style="font-size:15px;letter-spacing:1px">${esc(c.code)}</strong></td>
                          <td>
                            ${
                              c.discount_type === 'percent'
                                ? `<span class="badge sage">${num(c.discount_value)}%</span>`
                                : `<span class="badge" style="background:var(--rose-gold-light);color:var(--plum)">${num(c.discount_value)} ر.س</span>`
                            }
                          </td>
                          <td>${c.min_spend ? `${num(c.min_spend)} ر.س` : t('بدون حد', 'None')}</td>
                          <td>
                            <small class="muted">
                              ${c.valid_from ? esc(c.valid_from) : t('الآن', 'Now')}
                              →
                              ${c.valid_until ? esc(c.valid_until) : t('مفتوح', 'Never')}
                            </small>
                          </td>
                          <td>
                            ${num(c.used_count || 0)}
                            ${c.max_uses > 0 ? ` / ${num(c.max_uses)}` : ` (${t('مفتوح', 'Unlimited')})`}
                          </td>
                          <td>
                            ${
                              c.active
                                ? `<span class="badge mfa-ok">${t('مفعّل', 'Active')}</span>`
                                : `<span class="badge pending">${t('معطّل', 'Disabled')}</span>`
                            }
                          </td>
                          ${
                            canManage
                              ? `
                                <td>
                                  <div class="ops-chip-row">
                                    <button type="button" class="btn small ${c.active ? 'light' : 'sage'}" data-coupon-toggle="${esc(c.id)}" data-coupon-active="${c.active ? '0' : '1'}">
                                      ${c.active ? t('تعطيل', 'Disable') : t('تفعيل', 'Enable')}
                                    </button>
                                    <button type="button" class="btn small danger" data-coupon-delete="${esc(c.id)}">
                                      ${t('حذف', 'Delete')}
                                    </button>
                                  </div>
                                </td>
                              `
                              : ''
                          }
                        </tr>
                      `,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
      }
    </div>
  `;
}

export function bindCoupons(rerender) {
  const form = $ops('#ops-create-coupon-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = {
        code: fd.get('code'),
        discount_type: fd.get('discount_type'),
        discount_value: Number(fd.get('discount_value')),
        min_spend: Number(fd.get('min_spend') || 0),
        valid_from: fd.get('valid_from') || null,
        valid_until: fd.get('valid_until') || null,
        max_uses: Number(fd.get('max_uses') || 0),
        active: true,
      };
      try {
        await opsApi('/api/ops/coupons', data);
        opsToast(t('تم إنشاء كود الخصم بنجاح', 'Coupon created successfully'));
        form.reset();
        await loadDashboard();
        rerender();
      } catch (err) {
        opsToast(err.message, 'error');
      }
    });
  }

  $ops('button[data-coupon-toggle]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.couponToggle;
      const active = btn.dataset.couponActive === '1';
      try {
        await opsApi(`/api/ops/coupons/${id}`, { active });
        opsToast(active ? t('تم تفعيل الكوبون', 'Coupon enabled') : t('تم تعطيل الكوبون', 'Coupon disabled'));
        await loadDashboard();
        rerender();
      } catch (err) {
        opsToast(err.message, 'error');
      }
    });
  });

  $ops('button[data-coupon-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('هل أنت متأكدة من حذف هذا الكوبون نهائياً؟', 'Delete this coupon permanently?'))) return;
      const id = btn.dataset.couponDelete;
      try {
        await opsApi(`/api/ops/coupons/${id}`, { action: 'delete' });
        opsToast(t('تم حذف الكوبون', 'Coupon deleted'));
        await loadDashboard();
        rerender();
      } catch (err) {
        opsToast(err.message, 'error');
      }
    });
  });
}
