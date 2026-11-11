import { $ops, esc, loadDashboard, num, opsState, t } from '../ops-state.js';

export function auditView(d) {
  const rows = d.audit || [];
  const meta = d.pagination?.audit || { page: 1, totalPages: 1, total: rows.length };

  return `
    <div class="ops-card">
      <div class="ops-row" style="margin-bottom:10px">
        <h2 style="margin:0">${t('سجل التدقيق الأمني والتشغيلي', 'Security & Operations Audit Log')}</h2>
        <div class="ops-chip-row">
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
              <th>${t('الوقت', 'Timestamp')}</th>
              <th>${t('الفاعلة', 'Actor')}</th>
              <th>${t('الحدث والهدف', 'Action & Target')}</th>
              <th>${t('التفاصيل', 'Detail')}</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `
                  <tr>
                    <td><bdi>${num(r.id)}</bdi></td>
                    <td><bdi>${esc(String(r.created_at || '').slice(0, 19).replace('T', ' '))}</bdi></td>
                    <td>${esc(r.actor_name || 'System')}</td>
                    <td><span class="badge">${esc(r.action)}</span><div class="muted"><bdi>${esc(r.target || '')}</bdi></div></td>
                    <td class="muted" style="max-width:340px;word-break:break-word">${esc(r.detail || '')}</td>
                  </tr>
                `,
              )
              .join('') || `<tr><td colspan="5" class="muted">${t('لا توجد سجلات.', 'No audit entries.')}</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="ops-mobile-cards">
        ${rows
          .map(
            (r) => `
              <div class="ops-mobile-card">
                <div class="ops-row"><span class="badge">${esc(r.action)}</span><small class="muted"><bdi>${esc(String(r.created_at || '').slice(0, 16))}</bdi></small></div>
                <div>${esc(r.actor_name || 'System')}</div>
                ${r.detail ? `<div class="muted" style="word-break:break-word">${esc(r.detail)}</div>` : ''}
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

export function bindAudit(renderFn) {
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

