import { $ops, esc, loadDashboard, num, opsState, t } from '../ops-state.js';

const ACTION_META = {
  'booking.request': ['حجز منزلي جديد', 'New Booking', 'sage'],
  'booking.update': ['تحديث حالة / بيانات حجز', 'Booking Updated', ''],
  'booking.receipt_upload': ['رفع إيصال دفع بنكي', 'Payment Receipt Uploaded', 'mfa-ok'],
  'settings.update': ['تحديث إعدادات المنصة', 'Platform Settings Saved', ''],
  'coupon.save': ['إضافة / تعديل كوبون', 'Coupon Saved', 'sage'],
  'coupon.toggle': ['تفعيل / تعطيل كوبون', 'Coupon Toggled', 'pending'],
  'coupon.delete': ['حذف كوبون خصم', 'Coupon Deleted', 'danger'],
  'ops.login': ['تسجيل دخول للإدارة', 'Staff Login', 'mfa-ok'],
  'ops.logout': ['تسجيل خروج من الإدارة', 'Staff Logout', ''],
  'staff.mfa_setup_initiated': ['بدء تفعيل التحقق الثنائي', 'MFA Setup Started', 'pending'],
  'staff.mfa_verified': ['تفعيل التحقق الثنائي بنجاح', 'MFA Verified', 'mfa-ok'],
  'staff.mfa_failed': ['فشل رمز التحقق الثنائي', 'MFA Failed', 'danger'],
  'staff.create': ['إضافة موظفة جديدة', 'Staff Added', 'sage'],
  'staff.disable': ['تعطيل حساب موظفة', 'Staff Disabled', 'danger'],
  'staff.enable': ['إعادة تفعيل موظفة', 'Staff Enabled', 'sage'],
  'staff.permissions_update': ['تعديل صلاحيات موظفة', 'Permissions Updated', 'pending'],
  'gift.request': ['إصدار بطاقة إهداء جديدة', 'Gift Card Issued', 'sage'],
  'gift.update': ['تحديث حالة بطاقة إهداء', 'Gift Card Updated', ''],
  'group.request': ['طلب تنسيق مناسبة', 'Occasion Request', 'sage'],
  'group.update': ['تحديث طلب مناسبة', 'Occasion Updated', ''],
  'account.register': ['تسجيل عميلة جديدة', 'Customer Registered', 'sage'],
  'account.verify': ['توثيق حساب عميلة', 'Customer Verified', 'mfa-ok'],
  'account.password_reset': ['إعادة تعيين كلمة مرور', 'Password Reset', 'pending'],
  'service.save': ['تعديل / إضافة خدمة', 'Service Saved', ''],
  'package.save': ['تعديل / إضافة باقة', 'Package Saved', ''],
  'review.moderate': ['مراجعة تقييم عميلة', 'Review Moderated', ''],
  'refund.request': ['طلب استرداد مالي', 'Refund Requested', 'pending'],
  'refund.approve': ['اعتماد استرداد مالي', 'Refund Approved', 'danger'],
  'refund.reject': ['رفض طلب استرداد', 'Refund Rejected', ''],
  'loyalty.adjust': ['تعديل رصيد بتلات', 'Petals Adjusted', 'pending'],
  'atelier_color.create': ['إضافة لون مناكير جديد', 'Nail Shade Added', 'sage'],
  'atelier_color.delete': ['حذف لون مناكير', 'Nail Shade Deleted', 'danger'],
  'calendar.block_update': ['تعديل أيام الإغلاق', 'Calendar Updated', ''],
};

const STATUS_AR = {
  pending_confirmation: 'بانتظار التأكيد',
  confirmed: 'مؤكد',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  no_show: 'لم تحضر',
  approved_ready: 'جاهز للاستخدام',
  redeemed: 'تم الاستخدام',
};

function formatHumanDetail(rawDetail) {
  if (!rawDetail) return `<span class="muted">—</span>`;
  let obj = null;
  try {
    obj = JSON.parse(rawDetail);
  } catch {
    return `<span>${esc(rawDetail)}</span>`;
  }
  if (!obj || typeof obj !== 'object') return `<span>${esc(String(rawDetail))}</span>`;

  const pills = [];
  if (obj.reference) pills.push(`${t('المرجع', 'Ref')}: <strong>${esc(obj.reference)}</strong>`);
  if (obj.status) pills.push(`${t('الحالة', 'Status')}: <strong>${esc(STATUS_AR[obj.status] || obj.status)}</strong>`);
  if (obj.code || obj.gift_code) pills.push(`${t('الكود', 'Code')}: <strong class="mono">${esc(obj.code || obj.gift_code)}</strong>`);
  if (obj.total !== undefined) pills.push(`${t('الإجمالي', 'Total')}: <strong>${num(obj.total)} ر.س</strong>`);
  if (obj.paid_amount !== undefined && Number(obj.paid_amount) > 0) pills.push(`${t('المدفوع', 'Paid')}: <strong>${num(obj.paid_amount)} ر.س</strong>`);
  if (obj.refund_amount !== undefined && Number(obj.refund_amount) > 0) pills.push(`${t('المسترد', 'Refund')}: <strong>${num(obj.refund_amount)} ر.س</strong>`);
  if (obj.value !== undefined) pills.push(`${t('القيمة', 'Value')}: <strong>${num(obj.value)}</strong>`);
  if (obj.discount_value !== undefined) pills.push(`${t('الخصم', 'Discount')}: <strong>${num(obj.discount_value)}${obj.discount_type === 'percent' ? '%' : ' ر.س'}</strong>`);
  if (obj.points !== undefined) pills.push(`${t('البتلات', 'Petals')}: <strong>${num(obj.points)}</strong>`);
  if (obj.filename) pills.push(`${t('ملف الإيصال', 'Receipt')}: <strong>${esc(obj.filename)}</strong>`);
  if (obj.transfer_ref) pills.push(`${t('مرجع التحويل', 'Transfer Ref')}: <strong>${esc(obj.transfer_ref)}</strong>`);
  if (obj.recipient) pills.push(`${t('المُهدى إليها', 'Recipient')}: <strong>${esc(obj.recipient)}</strong>`);
  if (obj.role) pills.push(`${t('الدور', 'Role')}: <strong>${esc(obj.role)}</strong>`);
  if (obj.verified !== undefined) pills.push(`${t('التوثيق', 'Verified')}: <strong>${obj.verified ? t('موثّق', 'Yes') : t('غير موثّق', 'No')}</strong>`);
  if (obj.active !== undefined) pills.push(`${t('التفعيل', 'Active')}: <strong>${obj.active ? t('مفعّل', 'Active') : t('معطّل', 'Disabled')}</strong>`);
  if (obj.reason) pills.push(`${t('السبب', 'Reason')}: ${esc(obj.reason)}`);

  if (!pills.length) return `<span class="muted">${t('عملية نظام مكتملة', 'Completed')}</span>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px">${pills.map((p) => `<span style="background:var(--ivory);border:1px solid var(--border);padding:3px 9px;border-radius:999px;font-size:12.5px;color:var(--plum)">${p}</span>`).join('')}</div>`;
}

export function auditView(d) {
  const rows = d.audit || [];
  const meta = d.pagination?.audit || { page: 1, totalPages: 1, total: rows.length };
  const filterQ = String(opsState.auditFilter || '').trim().toLowerCase();
  const visibleRows = filterQ
    ? rows.filter((r) => {
        const metaInfo = ACTION_META[r.action] || [r.action, r.action];
        const haystack = `${r.actor_name} ${r.action} ${metaInfo[0]} ${metaInfo[1]} ${r.target_label || r.target} ${r.detail || ''}`.toLowerCase();
        return haystack.includes(filterQ);
      })
    : rows;

  return `
    <div class="ops-card">
      <div class="ops-row" style="margin-bottom:14px;flex-wrap:wrap;gap:12px">
        <div>
          <h2 style="margin:0 0 4px">${t('سجل النشاط والتدقيق الإداري', 'Human-Readable Operations & Security Audit Log')}</h2>
          <p class="muted" style="margin:0;font-size:13.5px">${t('متابعة فورية وواضحة لكل حركة تمت على الحجوزات، المدفوعات، الإيصالات، الكوبونات، والإعدادات.', 'Clear audit trail of every booking, payment receipt, coupon, staff, and security action.')}</p>
        </div>
        <div class="ops-chip-row">
          <input type="search" id="audit-quick-search" value="${esc(opsState.auditFilter || '')}" placeholder="${t('بحث بالحدث أو الموظفة أو رقم الحجز...', 'Search event, staff, ref...')}" style="min-width:220px;padding:7px 12px;border:1px solid var(--border);border-radius:8px">
          <button type="button" class="btn small light" id="audit-prev" ${meta.page <= 1 ? 'disabled' : ''}>${t('السابق', 'Previous')}</button>
          <span class="muted"><bdi>${num(meta.page)} / ${num(meta.totalPages)}</bdi> (${num(meta.total)})</span>
          <button type="button" class="btn small light" id="audit-next" ${meta.page >= meta.totalPages ? 'disabled' : ''}>${t('التالي', 'Next')}</button>
        </div>
      </div>

      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${t('التاريخ والوقت', 'Date & Time')}</th>
              <th>${t('من قام بالإجراء', 'Performed By')}</th>
              <th>${t('نوع الحدث', 'Event Type')}</th>
              <th>${t('الهدف / السجل', 'Record / Target')}</th>
              <th>${t('ملخص التغييرات', 'Readable Details')}</th>
            </tr>
          </thead>
          <tbody>
            ${
              visibleRows
                .map((r) => {
                  const [arLabel, enLabel, badgeCls] = ACTION_META[r.action] || [r.action, r.action, ''];
                  const cleanActor = r.actor_name === 'System' ? t('النظام / عميلة', 'System / Client') : r.actor_name;
                  const targetDisplay = r.target_label && r.target_label !== r.target ? r.target_label : (r.target && r.target.length > 24 ? `#${r.target.slice(0, 8)}` : r.target || '—');
                  return `
                    <tr>
                      <td><bdi>${num(r.id)}</bdi></td>
                      <td><bdi style="white-space:nowrap">${esc(String(r.created_at || '').slice(0, 16).replace('T', ' · '))}</bdi></td>
                      <td><strong>${esc(cleanActor)}</strong></td>
                      <td><span class="badge ${badgeCls}">${esc(t(arLabel, enLabel))}</span></td>
                      <td><strong>${esc(targetDisplay)}</strong></td>
                      <td style="max-width:380px">${formatHumanDetail(r.detail)}</td>
                    </tr>
                  `;
                })
                .join('') || `<tr><td colspan="6" class="muted">${t('لا توجد سجلات مطابقة.', 'No matching audit entries.')}</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="ops-mobile-cards">
        ${visibleRows
          .map((r) => {
            const [arLabel, enLabel, badgeCls] = ACTION_META[r.action] || [r.action, r.action, ''];
            const cleanActor = r.actor_name === 'System' ? t('النظام / عميلة', 'System / Client') : r.actor_name;
            const targetDisplay = r.target_label || r.target || '—';
            return `
              <div class="ops-mobile-card">
                <div class="ops-row">
                  <span class="badge ${badgeCls}">${esc(t(arLabel, enLabel))}</span>
                  <small class="muted"><bdi>${esc(String(r.created_at || '').slice(0, 16).replace('T', ' '))}</bdi></small>
                </div>
                <div style="margin:6px 0"><strong>${esc(cleanActor)}</strong> · <span class="muted">${esc(targetDisplay)}</span></div>
                <div>${formatHumanDetail(r.detail)}</div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

export function bindAudit(renderFn) {
  $ops('#audit-quick-search')?.addEventListener('input', (e) => {
    opsState.auditFilter = e.target.value;
    renderFn();
  });

  $ops('#audit-prev')?.addEventListener('click', async () => {
    opsState.auditPage = Math.max(1, opsState.auditPage - 1);
    await loadDashboard();
    renderFn();
  });

  $ops('#audit-next')?.addEventListener('click', async () => {
    opsState.auditPage += 1;
    await loadDashboard();
    renderFn();
  });
}
