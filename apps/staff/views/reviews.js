import { esc, loadDashboard, num, opsApi, opsToast, statusBadge, t } from '../ops-state.js';

export function reviewsView(d) {
  const reviews = d.reviews || [];
  return `
    <div class="ops-card">
      <h2>${t('مراجعة ونشر تقييمات العميلات', 'Customer Review Moderation')}</h2>
      ${
        reviews.length
          ? reviews
              .map(
                (r) => `
                  <div class="ops-card" style="background:var(--ivory);margin-bottom:12px">
                    <div class="ops-row" style="margin-bottom:8px">
                      <div>
                        <strong>${esc(r.display_name || 'عميلة J Beauty')}</strong>
                        <span class="badge">${num(r.rating)} ★</span>
                      </div>
                      ${statusBadge(r.approved ? 'approved' : r.moderation_status || 'pending')}
                    </div>
                    <p style="margin-bottom:10px">${esc(r.body)}</p>
                    <form class="ops-row" data-review-form="${esc(r.id)}">
                      <input type="text" name="moderation_note" value="${esc(r.moderation_note || '')}" placeholder="${t('ملاحظة طلب التعديل (اختياري)', 'Edit note if needed')}" style="flex:1;min-width:180px;min-height:36px;padding:6px 10px;border:1px solid var(--border-strong);border-radius:var(--r-sm)">
                      <div class="ops-chip-row">
                        <button type="button" class="btn small sage" data-rev-act="approve" data-rev-id="${esc(r.id)}">${t('نشر التقييم', 'Approve')}</button>
                        <button type="button" class="btn small light" data-rev-act="needs_edit" data-rev-id="${esc(r.id)}">${t('طلب تعديل', 'Needs Edit')}</button>
                        ${r.approved ? `<button type="button" class="btn small light" data-rev-act="unpublish" data-rev-id="${esc(r.id)}">${t('إخفاء', 'Unpublish')}</button>` : ''}
                      </div>
                    </form>
                  </div>
                `,
              )
              .join('')
          : `<p class="muted" style="margin:0">${t('لا توجد تقييمات للمراجعة.', 'No customer reviews awaiting moderation.')}</p>`
      }
    </div>
  `;
}

export function bindReviews(renderFn) {
  document.querySelectorAll('[data-rev-act]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.revId;
      const act = btn.dataset.revAct;
      const form = btn.closest('[data-review-form]');
      const note = form?.querySelector('[name="moderation_note"]')?.value || '';
      btn.disabled = true;
      try {
        if (act === 'approve') {
          await opsApi(`/reviews/${id}`, { approved: true });
        } else if (act === 'needs_edit') {
          await opsApi(`/reviews/${id}`, { approved: false, moderation_status: 'needs_edit', moderation_note: note });
        } else {
          await opsApi(`/reviews/${id}`, { approved: false, moderation_status: 'pending' });
        }
        await loadDashboard();
        opsToast(t('تم تحديث حالة التقييم', 'Review moderation updated'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });
}

