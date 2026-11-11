import { can, canAny, esc, loadDashboard, money, num, opsState, statusBadge, t } from '../ops-state.js';

export function overviewView(d) {
  const ov = d.overview || {};
  const an = d.analytics || {};
  const isPractitionerOnly = can('bookings.read_assigned') && !can('bookings.read');

  const kpis = [
    can('bookings.read') && { tab: 'bookings', status: 'pending_confirmation', label: t('حجوزات بانتظار التأكيد', 'Pending Bookings'), val: ov.pending_bookings || 0, cls: ov.pending_bookings ? 'is-alert' : '' },
    { tab: 'calendar', label: t('جلسات اليوم المؤكدة', 'Today Confirmed'), val: ov.today_confirmed || 0, cls: 'is-good' },
    { tab: 'bookings', status: 'confirmed', label: t('مواعيد قادمة', 'Upcoming Visits'), val: ov.upcoming_confirmed || 0, cls: '' },
    { tab: 'bookings', status: 'completed', label: t('زيارات مكتملة', 'Completed Visits'), val: ov.completed_visits || 0, cls: '' },
    canAny('payments.read', 'payments.verify') && { tab: 'payments', label: t('مكتملة بدون توثيق دفع', 'Unpaid Completed'), val: ov.unpaid_completed || 0, cls: ov.unpaid_completed ? 'is-alert' : '' },
    canAny('refunds.request', 'refunds.approve') && { tab: 'payments', label: t('طلبات استرداد معلقة', 'Pending Refunds'), val: ov.pending_refunds || 0, cls: ov.pending_refunds ? 'is-alert' : '' },
    can('loyalty.read') && { tab: 'petals', label: t('مكافآت بتلات J المعلقة', 'Pending Petals Rewards'), val: ov.pending_rewards || 0, cls: '' },
    canAny('occasions.read', 'occasions.manage') && { tab: 'occasions', label: t('طلبات مناسبات معلقة', 'Pending Occasions'), val: ov.pending_occasions || 0, cls: '' },
  ].filter(Boolean);

  const urgentBookings = (d.bookings || [])
    .filter((b) => (isPractitionerOnly ? b.date === ov.today : b.status === 'pending_confirmation'))
    .slice(0, 6);

  return `
    <div class="ops-kpi-grid">
      ${kpis
        .map(
          (k) => `
            <button type="button" class="ops-kpi ${k.cls}" data-nav-jump="${esc(k.tab)}" ${k.status ? `data-nav-status="${esc(k.status)}"` : ''}>
              <small>${k.label}</small>
              <strong><bdi>${num(k.val)}</bdi></strong>
            </button>
          `,
        )
        .join('')}
    </div>

    ${
      can('reports.financial') || typeof an.revenue === 'number'
        ? `
          <div class="ops-card">
            <div class="ops-row" style="margin-bottom:8px">
              <h2 style="margin:0">${t('الملخص المالي ونقاط بتلات J', 'Financial & Petals Summary')}</h2>
              <span class="muted"><bdi>${esc(ov.today || '')}</bdi></span>
            </div>
            <div class="ops-kpi-grid" style="margin-bottom:0">
              <div class="ops-kpi is-good"><small>${t('صافي المدفوعات الموثقة', 'Verified Net Revenue')}</small><strong><bdi>${money(an.revenue || 0)}</bdi></strong></div>
              ${an.points_issued !== null && an.points_issued !== undefined ? `<div class="ops-kpi"><small>${t('نقاط بتلات J المصروفة', 'Petals Issued')}</small><strong><bdi>${num(an.points_issued)}</bdi></strong></div>` : ''}
              ${an.points_redeemed !== null && an.points_redeemed !== undefined ? `<div class="ops-kpi"><small>${t('نقاط مستبدلة', 'Petals Redeemed')}</small><strong><bdi>${num(an.points_redeemed)}</bdi></strong></div>` : ''}
              <div class="ops-kpi"><small>${t('إجمالي الحجوزات', 'Total Bookings')}</small><strong><bdi>${num(an.total || 0)}</bdi></strong></div>
            </div>
          </div>
        `
        : ''
    }

    <div class="ops-card">
      <div class="ops-row" style="margin-bottom:10px">
        <h2 style="margin:0">${isPractitionerOnly ? t('مواعيدي المسندة اليوم', 'My Assigned Visits Today') : t('طلبات عاجلة بانتظار الإجراء', 'Urgent Action Queue')}</h2>
        <button type="button" class="btn small light" data-nav-jump="bookings">${t('عرض جدول الحجوزات', 'View All Bookings')}</button>
      </div>
      ${
        urgentBookings.length
          ? `
            <div class="ops-table-wrap">
              <table class="ops-table">
                <thead>
                  <tr>
                    <th>${t('المرجع', 'Reference')}</th>
                    <th>${t('العميلة والحي', 'Client & Neighborhood')}</th>
                    <th>${t('التاريخ والوقت', 'Date & Time')}</th>
                    <th>${t('الحالة', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${urgentBookings
                    .map(
                      (b) => `
                        <tr>
                          <td><strong><bdi>${esc(b.reference)}</bdi></strong></td>
                          <td>${esc(b.name)}<div class="muted">${esc(b.neighborhood)}</div></td>
                          <td><bdi>${esc(b.date)} · ${esc(b.time)}</bdi></td>
                          <td>${statusBadge(b.status)}</td>
                        </tr>
                      `,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
            <div class="ops-mobile-cards">
              ${urgentBookings
                .map(
                  (b) => `
                    <div class="ops-mobile-card">
                      <div class="ops-row"><strong><bdi>${esc(b.reference)}</bdi></strong>${statusBadge(b.status)}</div>
                      <div>${esc(b.name)} · <span class="muted">${esc(b.neighborhood)}</span></div>
                      <div class="muted"><bdi>${esc(b.date)} · ${esc(b.time)}</bdi></div>
                    </div>
                  `,
                )
                .join('')}
            </div>
          `
          : `<p class="muted" style="margin:0">${t('لا توجد مواعيد معلقة حالياً.', 'No urgent items in the queue.')}</p>`
      }
    </div>
  `;
}

export function bindOverview(renderFn) {
  document.querySelectorAll('[data-nav-jump]').forEach((btn) => {
    btn.onclick = async () => {
      opsState.tab = btn.dataset.navJump;
      if (btn.dataset.navStatus) opsState.bookingStatus = btn.dataset.navStatus;
      try {
        await loadDashboard();
      } catch {}
      renderFn();
    };
  });
}
