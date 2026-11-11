import { can, esc, loadDashboard, minutes, money, opsApi, opsState, opsToast, statusBadge, t } from '../ops-state.js';

export function occasionsView(d) {
  const groups = d.group_requests || [];
  const gifts = d.gift_requests || [];
  const canManageOcc = can('occasions.manage');
  const canVerifyGifts = can('gifts.verify_payment');

  return `
    <div class="ops-card">
      <h2>${t('طلبات تنسيق جلسات المناسبات', 'Occasion Group Requests')}</h2>
      ${
        groups.length
          ? groups
              .map(
                (g) => `
                  <div class="ops-card" style="background:var(--ivory);margin-bottom:12px">
                    <div class="ops-row" style="margin-bottom:6px">
                      <div>
                        <strong><bdi>${esc(g.reference)}</bdi></strong> · ${esc(g.organizer_name)}
                        <span class="muted"><bdi>${esc(g.organizer_phone)}</bdi></span>
                      </div>
                      ${statusBadge(g.status)}
                    </div>
                    <div class="muted"><bdi>${esc(g.date)} · ${esc(g.time)}</bdi> · ${esc(g.neighborhood)} · <bdi>${money(g.estimated_total)}</bdi> · <bdi>${minutes(g.estimated_duration)}</bdi></div>
                    <div style="margin:8px 0;font-size:13px">
                      ${(g.participants || [])
                        .map((p) => `<div>• <strong>${esc(p.label)}</strong>: ${(p.items || []).map((i) => esc(i[`name_${opsState.lang}`] || i.name_ar)).join(' + ')}</div>`)
                        .join('')}
                    </div>
                    ${
                      canManageOcc && g.status === 'pending_approval'
                        ? `<div class="ops-chip-row">
                             <button type="button" class="btn small sage" data-occ-act="approved" data-occ-id="${esc(g.id)}">${t('اعتماد التنسيق', 'Approve')}</button>
                             <button type="button" class="btn small light" data-occ-act="cancelled" data-occ-id="${esc(g.id)}">${t('إلغاء الطلب', 'Cancel')}</button>
                           </div>`
                        : ''
                    }
                  </div>
                `,
              )
              .join('')
          : `<p class="muted" style="margin:0">${t('لا توجد طلبات مناسبات.', 'No occasion requests yet.')}</p>`
      }
    </div>

    ${
      canVerifyGifts || canManageOcc
        ? `
          <div class="ops-card">
            <h2>${t('طلبات بطاقات الإهداء', 'Gift Requests')}</h2>
            ${
              gifts.length
                ? gifts
                    .map(
                      (gf) => `
                        <div class="ops-card" style="background:var(--ivory);margin-bottom:10px">
                          <div class="ops-row">
                            <div><strong><bdi>${esc(gf.reference)}</bdi></strong> · ${esc(gf.sender_name)} → ${esc(gf.recipient_name)}</div>
                            ${statusBadge(gf.status)}
                          </div>
                          <div class="muted"><bdi>${money(gf.value)}</bdi> · ${gf.payment_verified ? t('مدفوع وموثق', 'Payment verified') : t('بانتظار توثيق الدفع', 'Payment pending')}</div>
                          <div class="ops-chip-row" style="margin-top:8px">
                            ${
                              canVerifyGifts && !gf.payment_verified && gf.status !== 'cancelled'
                                ? `<button type="button" class="btn small sage" data-gift-verify="${esc(gf.id)}">${t('توثيق الدفع وتفعيل الجاهزية', 'Verify Payment & Mark Ready')}</button>`
                                : ''
                            }
                            ${
                              canVerifyGifts && gf.payment_verified && gf.status === 'approved_ready'
                                ? `<button type="button" class="btn small" data-gift-status="redeemed" data-gift-id="${esc(gf.id)}">${t('تحديد كمُستخدم', 'Mark Redeemed')}</button>`
                                : ''
                            }
                            ${
                              canManageOcc && !['redeemed', 'cancelled'].includes(gf.status)
                                ? `<button type="button" class="btn small light" data-gift-status="cancelled" data-gift-id="${esc(gf.id)}">${t('إلغاء', 'Cancel')}</button>`
                                : ''
                            }
                          </div>
                        </div>
                      `,
                    )
                    .join('')
                : `<p class="muted" style="margin:0">${t('لا توجد طلبات إهداء.', 'No gift requests yet.')}</p>`
            }
          </div>
        `
        : ''
    }
  `;
}

export function bindOccasions(renderFn) {
  document.querySelectorAll('[data-occ-act]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/group-requests/${btn.dataset.occId}`, { status: btn.dataset.occAct });
        await loadDashboard();
        opsToast(t('تم تحديث طلب المناسبة', 'Occasion request updated'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('[data-gift-verify]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/gift-requests/${btn.dataset.giftVerify}`, { payment_verified: true, status: 'approved_ready' });
        await loadDashboard();
        opsToast(t('تم توثيق الدفع وتفعيل بطاقة الإهداء', 'Gift payment verified and activated'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('[data-gift-status]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/gift-requests/${btn.dataset.giftId}`, { status: btn.dataset.giftStatus });
        await loadDashboard();
        opsToast(t('تم تحديث حالة الإهداء', 'Gift status updated'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });
}

