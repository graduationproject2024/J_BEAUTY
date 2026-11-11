import { $ops, can, esc, loadDashboard, opsApi, opsState, opsToast, riyadhToday, statusBadge, t } from '../ops-state.js';

export function calendarView(d) {
  const bookings = (d.bookings || []).filter((b) => !['cancelled', 'no_show'].includes(b.status));
  const cfg = d.schedule_config || {};
  const blocked = new Set(cfg.blocked_dates || []);
  const startDate = opsState.calendarDate || riyadhToday();
  const defaultBlockDate = new Date(Date.parse(`${riyadhToday()}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const count = opsState.calendarView === 'day' ? 1 : 7;

  const days = Array.from({ length: count }, (_, idx) => {
    const dt = new Date(Date.parse(`${startDate}T12:00:00Z`) + idx * 86400000);
    const iso = dt.toISOString().slice(0, 10);
    const dayBookings = bookings
      .filter((b) => b.date === iso)
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
    return { iso, isBlocked: blocked.has(iso), bookings: dayBookings };
  });

  return `
    <div class="ops-card">
      <div class="ops-row" style="margin-bottom:14px">
        <div class="ops-chip-row">
          <button type="button" class="btn small ${opsState.calendarView === 'day' ? '' : 'light'}" data-cal-mode="day">${t('عرض يومي', 'Day View')}</button>
          <button type="button" class="btn small ${opsState.calendarView === 'week' ? '' : 'light'}" data-cal-mode="week">${t('عرض أسبوعي (7 أيام)', 'Week View (7d)')}</button>
        </div>
        <label class="field" style="margin:0;display:flex;flex-direction:row;align-items:center;gap:8px">
          <span>${t('بدءاً من:', 'Start date:')}</span>
          <input type="date" dir="ltr" lang="en" id="ops-cal-start" value="${esc(startDate)}" style="width:auto">
        </label>
      </div>

      ${
        can('calendar.manage')
          ? `
            <div class="ops-row" style="margin-bottom:14px;padding:10px 12px;background:var(--ivory);border-radius:var(--r-sm);border:1px solid var(--border)">
              <form id="ops-block-date-form" class="ops-chip-row" style="align-items:center">
                <input type="date" dir="ltr" lang="en" name="date" value="${esc(defaultBlockDate)}" min="${riyadhToday()}" required aria-label="${t('تاريخ لحظر الحجز', 'Date to block')}" style="min-height:36px;padding:4px 8px;border:1px solid var(--border-strong);border-radius:var(--r-sm)">
                <button type="submit" class="btn small light">${t('حظر تاريخ من الحجز', 'Block Date')}</button>
              </form>
              <div class="ops-chip-row">
                ${(cfg.blocked_dates || [])
                  .map(
                    (dt) => `
                      <span class="badge cancelled">
                        <bdi>${esc(dt)}</bdi>
                        <button type="button" data-unblock-date="${esc(dt)}" aria-label="${t('إلغاء الحظر', 'Unblock')}">✕</button>
                      </span>
                    `,
                  )
                  .join('') || `<span class="muted">${t('لا توجد تواريخ محظورة', 'No blocked dates')}</span>`}
              </div>
            </div>
          `
          : ''
      }

      <div class="ops-cal-grid">
        ${days
          .map(
            (day) => `
              <div class="ops-cal-day ${day.isBlocked ? 'is-blocked' : ''}">
                <div class="ops-row">
                  <strong><bdi>${esc(day.iso)}</bdi></strong>
                  ${day.isBlocked ? `<span class="badge cancelled">${t('مغلق / محظور', 'Blocked')}</span>` : `<span class="badge">${day.bookings.length}</span>`}
                </div>
                ${
                  day.bookings.length
                    ? day.bookings
                        .map(
                          (b) => `
                            <div class="ops-cal-slot">
                              <div class="ops-row">
                                <strong><bdi>${esc(b.time)}</bdi></strong>
                                ${statusBadge(b.status)}
                              </div>
                              <div>${esc(b.name)} · <span class="muted">${esc(b.neighborhood)}</span></div>
                              <div class="muted">${b.assigned_staff_name ? esc(b.assigned_staff_name) : t('غير معينة', 'Unassigned')} · <bdi>${esc(b.reference)}</bdi></div>
                            </div>
                          `,
                        )
                        .join('')
                    : `<p class="muted" style="margin:10px 0 0">${t('لا توجد جلسات مجدولة', 'No scheduled visits')}</p>`
                }
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

export function bindCalendar(renderFn) {
  document.querySelectorAll('[data-cal-mode]').forEach((btn) => {
    btn.onclick = () => {
      opsState.calendarView = btn.dataset.calMode;
      renderFn();
    };
  });

  $ops('#ops-cal-start')?.addEventListener('change', (e) => {
    opsState.calendarDate = e.target.value || riyadhToday();
    renderFn();
  });

  $ops('#ops-block-date-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = new FormData(e.target).get('date');
    try {
      await opsApi('/calendar/block', { date, action: 'block' });
      await loadDashboard();
      opsToast(t('تم حظر التاريخ', 'Date blocked'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
    }
  });

  document.querySelectorAll('[data-unblock-date]').forEach((btn) => {
    btn.onclick = async () => {
      try {
        await opsApi('/calendar/block', { date: btn.dataset.unblockDate, action: 'unblock' });
        await loadDashboard();
        opsToast(t('تم رفع الحظر عن التاريخ', 'Date unblocked'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
      }
    };
  });
}
