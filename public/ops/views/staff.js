import {
  $ops,
  ALL_STAFF_CAPABILITIES,
  ASSIGNABLE_ROLE_LIST,
  esc,
  loadDashboard,
  num,
  opsApi,
  opsState,
  opsToast,
  roleLabel,
  t,
} from '../ops-state.js';

export function staffView(d) {
  const list = d.staff || [];
  const commissions = d.commissions || [];
  const legacyPending = list.filter((u) => u.role === 'legacy_employee');
  const selected = list.find((u) => u.id === opsState.selectedStaffId && u.role !== 'owner');

  const firstComm = commissions[0] || { threshold: 50, commission_rate_pct: 5, month: '' };
  const totalMonthVisits = commissions.reduce((sum, c) => sum + Number(c.visits_count || 0), 0);
  const totalUniqueClients = commissions.reduce((sum, c) => sum + Number(c.unique_clients || 0), 0);
  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  return `
    <div class="ops-card">
      <div class="ops-row" style="margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div>
          <h2 style="margin:0 0 4px">${t(`عداد الأخصائيات والزيارات والعمولات (الهدف ${num(firstComm.threshold)} زيارة · عمولة ${num(firstComm.commission_rate_pct)}%)`, `Practitioner Visit, Client & Commission Counter (${num(firstComm.threshold)} visits · ${num(firstComm.commission_rate_pct)}%)`)}</h2>
          <p class="muted" style="margin:0;font-size:13.5px">${t('يتم تحديث عداد الزيارات وعدد العميلات تلقائياً فور تعيين الأخصائية وإكمال الجلسة في تبويب الحجوزات.', 'Visit and client counters update automatically whenever a booking is assigned to a specialist and marked completed.')}</p>
        </div>
        <span class="badge">${t('شهر التقرير:', 'Month:')} <bdi>${esc(firstComm.month || '')}</bdi></span>
      </div>

      <div class="form-grid" style="margin-bottom:16px">
        <div class="ops-card" style="margin:0;background:var(--ivory);text-align:center;padding:14px">
          <div class="muted" style="font-size:13px">${t('إجمالي زيارات الشهر المكتملة', 'Completed Visits (Month)')}</div>
          <strong style="font-size:26px;color:var(--plum)">${num(totalMonthVisits)}</strong>
        </div>
        <div class="ops-card" style="margin:0;background:var(--ivory);text-align:center;padding:14px">
          <div class="muted" style="font-size:13px">${t('إجمالي العميلات المخدومات', 'Unique Clients Served')}</div>
          <strong style="font-size:26px;color:var(--plum)">${num(totalUniqueClients)}</strong>
        </div>
        <div class="ops-card" style="margin:0;background:var(--ivory);text-align:center;padding:14px">
          <div class="muted" style="font-size:13px">${t('إجمالي العمولات المستحقة', 'Total Commission Due')}</div>
          <strong style="font-size:26px;color:var(--sage-deep)">${num(totalCommissions)} ر.س</strong>
        </div>
      </div>

      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>${t('الأخصائية', 'Specialist')}</th>
              <th>${t('زيارات الشهر (مكتملة)', 'Month Visits')}</th>
              <th>${t('عدد العميلات', 'Unique Clients')}</th>
              <th>${t('إيرادات الشهر', 'Month Revenue')}</th>
              <th>${t('التقدم نحو الهدف', 'Target Progress')}</th>
              <th>${t('زيارات فوق الهدف', 'Excess Visits')}</th>
              <th>${t('العمولة المستحقة', 'Earned Commission')}</th>
              <th>${t('الإجمالي التراكمي', 'All-Time')}</th>
            </tr>
          </thead>
          <tbody>
            ${commissions.map((c) => `
              <tr>
                <td>
                  <strong>${esc(c.name)}</strong>
                  <div class="muted" style="font-size:12px">${esc(roleLabel(c.role || 'practitioner'))}</div>
                </td>
                <td><span class="badge ${c.visits_count >= c.threshold ? 'mfa-ok' : ''}" style="font-size:14px">${num(c.visits_count)} ${t('زيارة', 'visits')}</span></td>
                <td><strong>${num(c.unique_clients || 0)}</strong> ${t('عميلة', 'clients')}</td>
                <td><strong>${num(c.month_revenue || 0)} ر.س</strong></td>
                <td style="min-width:130px">
                  <div style="font-size:12px;margin-bottom:4px"><bdi>${num(c.visits_count)} / ${num(c.threshold)}</bdi> (${num(c.progress_pct || 0)}%)</div>
                  <div style="height:8px;background:#E8DFDA;border-radius:99px;overflow:hidden">
                    <div style="height:100%;width:${num(c.progress_pct || 0)}%;background:linear-gradient(90deg,var(--rose-gold),var(--sage-green));border-radius:99px"></div>
                  </div>
                </td>
                <td><strong>${num(c.excess_visits)}</strong></td>
                <td><strong style="color:var(--sage-ink);font-size:15px">${num(c.commission_amount)} ر.س</strong> <small class="muted">(${num(c.commission_rate_pct ?? 5)}%)</small></td>
                <td><small class="muted">${num(c.all_time_visits || 0)} ${t('زيارة', 'visits')} · ${num(c.all_time_unique_clients || 0)} ${t('عميلة', 'clients')}</small></td>
              </tr>
            `).join('') || `<tr><td colspan="8" class="muted">${t('لا توجد أخصائيات مسجلات بعد. أضيفي أخصائية من النموذج أدناه.', 'No practitioners assigned yet.')}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    ${
      legacyPending.length
        ? `<div class="alert warn">
             <strong>${t('تنبيه حوكمة الصلاحيات:', 'Role Migration Notice:')}</strong>
             ${t(
               `يوجد ${num(legacyPending.length)} حساباً بصلاحية مقيّدة (legacy_employee). يرجى ترقية كل موظفة إلى دورها الفعلي (استقبال، مالية، مديرة عمليات، أخصائية).`,
               `${num(legacyPending.length)} legacy staff account(s) hold minimal legacy_employee permissions pending Owner role review.`,
             )}
           </div>`
        : ''
    }

    <div class="ops-card">
      <h2>${t('إضافة حساب موظفة / أخصائية جديدة', 'Create Staff Account')}</h2>
      <form id="ops-create-staff-form" class="form-grid" style="align-items:end">
        <label class="field">${t('الاسم الكامل', 'Full Name')}<input type="text" name="name" required></label>
        <label class="field">${t('رقم الجوال السعودي', 'Saudi Mobile')}<input type="tel" name="phone" required placeholder="05xxxxxxxx"></label>
        <label class="field">${t('كلمة المرور المبدئية (12+ خانة)', 'Initial Password (12+ chars)')}<input type="password" name="password" minlength="12" required></label>
        <label class="field">${t('الدور التشغيلي', 'Operational Role')}
          <select name="role" required>
            ${ASSIGNABLE_ROLE_LIST.map(([id, ar, en]) => `<option value="${id}">${t(ar, en)}</option>`).join('')}
          </select>
        </label>
        <button type="submit" class="btn">${t('إنشاء الحساب', 'Create Staff User')}</button>
      </form>
    </div>

    <div class="ops-card">
      <h2>${t('الفريق، الأدوار، والمصادقة الثنائية', 'Team Directory, Roles & MFA')}</h2>
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>${t('العضوة والجوال', 'Staff Member')}</th>
              <th>${t('الدور الوظيفي', 'Role')}</th>
              <th>${t('التحقق الثنائي', 'MFA')}</th>
              <th>${t('الإدارة والتحكم', 'Controls')}</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (u) => `
                  <tr>
                    <td><strong>${esc(u.name)}</strong><div class="muted"><bdi>${esc(u.phone)}</bdi></div></td>
                    <td><span class="badge role-${esc(u.role)}">${esc(roleLabel(u.role))}</span></td>
                    <td>${u.mfa_enabled ? `<span class="badge mfa-ok">${t('مفعّلة', 'Enrolled')}</span>` : `<span class="badge pending">${t('غير مربوطة', 'Not Enrolled')}</span>`}</td>
                    <td>
                      ${
                        u.role === 'owner'
                          ? `<span class="muted">${t('حساب المالكة الرئيسي', 'Primary Owner')}</span>`
                          : `<div class="ops-chip-row">
                               <button type="button" class="btn small light" data-staff-edit="${esc(u.id)}">${t('الدور والصلاحيات', 'Role & Caps')}</button>
                               ${
                                 u.role === 'disabled_employee'
                                   ? `<button type="button" class="btn small sage" data-staff-enable="${esc(u.id)}">${t('تفعيل', 'Enable')}</button>`
                                   : `<button type="button" class="btn small danger" data-staff-disable="${esc(u.id)}">${t('تعطيل وطرد الجلسات', 'Disable & Revoke')}</button>`
                               }
                               ${u.mfa_enabled ? `<button type="button" class="btn small light" data-staff-reset-mfa="${esc(u.id)}">${t('إعادة ضبط MFA', 'Reset MFA')}</button>` : ''}
                             </div>`
                      }
                    </td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="ops-mobile-cards">
        ${list
          .map(
            (u) => `
              <div class="ops-mobile-card">
                <div class="ops-row"><strong>${esc(u.name)}</strong><span class="badge role-${esc(u.role)}">${esc(roleLabel(u.role))}</span></div>
                <div class="muted"><bdi>${esc(u.phone)}</bdi> · ${u.mfa_enabled ? t('MFA مفعّلة', 'MFA Enrolled') : t('MFA غير مفعّلة', 'No MFA')}</div>
                ${
                  u.role !== 'owner'
                    ? `<div class="ops-chip-row">
                         <button type="button" class="btn small light" data-staff-edit="${esc(u.id)}">${t('الصلاحيات', 'Permissions')}</button>
                         ${
                           u.role === 'disabled_employee'
                             ? `<button type="button" class="btn small sage" data-staff-enable="${esc(u.id)}">${t('تفعيل', 'Enable')}</button>`
                             : `<button type="button" class="btn small danger" data-staff-disable="${esc(u.id)}">${t('تعطيل', 'Disable')}</button>`
                         }
                       </div>`
                    : ''
                }
              </div>
            `,
          )
          .join('')}
      </div>
    </div>

    ${
      selected
        ? `
          <div class="ops-card" style="border-color:var(--plum)">
            <div class="ops-row" style="margin-bottom:10px">
              <h2 style="margin:0">${t('تخصيص الدور والصلاحيات لـ', 'Customize Role & Overrides:')} ${esc(selected.name)}</h2>
              <button type="button" class="btn small light" id="ops-close-staff-edit">${t('إغلاق', 'Close')}</button>
            </div>
            <p class="muted">${t('تُبطل جميع جلسات الموظفة النشطة فوراً عند حفظ أي تغيير في الدور أو الصلاحيات.', 'Active sessions are wiped immediately upon saving any role or capability change.')}</p>
            <form id="ops-staff-edit-form" data-staff-id="${esc(selected.id)}">
              <label class="field">
                ${t('الدور الأساسي', 'Base Role')}
                <select name="role" required>
                  ${ASSIGNABLE_ROLE_LIST.map(([id, ar, en]) => `<option value="${id}" ${selected.role === id ? 'selected' : ''}>${t(ar, en)}</option>`).join('')}
                </select>
              </label>
              <div style="margin-top:10px">
                <strong>${t('استثناءات منح صلاحية إضافية (Grant Overrides — لا تشمل صلاحيات المالكة السيادية)', 'Explicit Additional Grants (excludes Owner-only caps)')}</strong>
                <div class="ops-cap-grid">
                  ${ALL_STAFF_CAPABILITIES.map(([cap, ar, en]) => {
                    const granted = (selected.permission_overrides?.grant || []).includes(cap);
                    return `<label class="ops-check"><input type="checkbox" data-cap-grant="${esc(cap)}" ${granted ? 'checked' : ''}><span>${t(ar, en)} <small class="muted">(${esc(cap)})</small></span></label>`;
                  }).join('')}
                </div>
              </div>
              <div style="margin-top:10px">
                <strong>${t('استثناءات سحب صلاحية محددة (Revoke Overrides)', 'Explicit Revocations')}</strong>
                <div class="ops-cap-grid">
                  ${ALL_STAFF_CAPABILITIES.map(([cap, ar, en]) => {
                    const revoked = (selected.permission_overrides?.revoke || []).includes(cap);
                    return `<label class="ops-check"><input type="checkbox" data-cap-revoke="${esc(cap)}" ${revoked ? 'checked' : ''}><span>${esc(cap)} (${t(ar, en)})</span></label>`;
                  }).join('')}
                </div>
              </div>
              <button type="submit" class="btn" style="margin-top:12px">${t('حفظ وتطبيق الصلاحيات فوراً', 'Save & Apply Least Privilege')}</button>
            </form>
          </div>
        `
        : ''
    }
  `;
}

export function bindStaff(renderFn) {
  $ops('#ops-create-staff-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    e.submitter.disabled = true;
    try {
      await opsApi('/staff', d);
      await loadDashboard();
      opsToast(t('تم إنشاء حساب الموظفة بنجاح', 'Staff account created'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
      e.submitter.disabled = false;
    }
  });

  document.querySelectorAll('[data-staff-edit]').forEach((btn) => {
    btn.onclick = () => {
      opsState.selectedStaffId = btn.dataset.staffEdit;
      renderFn();
    };
  });

  $ops('#ops-close-staff-edit')?.addEventListener('click', () => {
    opsState.selectedStaffId = null;
    renderFn();
  });

  $ops('#ops-staff-edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const id = form.dataset.staffId;
    const role = new FormData(form).get('role');
    const grant = [...form.querySelectorAll('[data-cap-grant]:checked')].map((x) => x.dataset.capGrant);
    const revoke = [...form.querySelectorAll('[data-cap-revoke]:checked')].map((x) => x.dataset.capRevoke);
    e.submitter.disabled = true;
    try {
      await opsApi(`/staff/${id}`, { role, permissions: { grant, revoke } });
      opsState.selectedStaffId = null;
      await loadDashboard();
      opsToast(t('تم تحديث الدور والصلاحيات وإبطال الجلسات السابقة', 'Permissions updated and sessions revoked'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
      e.submitter.disabled = false;
    }
  });

  document.querySelectorAll('[data-staff-disable]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/staff/${btn.dataset.staffDisable}`, { action: 'disable' });
        await loadDashboard();
        opsToast(t('تم تعطيل الحساب وإبطال جلساته فوراً', 'Staff account disabled and sessions invalidated'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('[data-staff-enable]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/staff/${btn.dataset.staffEnable}`, { action: 'enable', role: 'reception' });
        await loadDashboard();
        opsToast(t('تم إعادة تفعيل الحساب بدور مبدئي (الاستقبال)', 'Staff account re-enabled as reception'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('[data-staff-reset-mfa]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/staff/${btn.dataset.staffResetMfa}`, { action: 'reset_mfa' });
        await loadDashboard();
        opsToast(t('تمت إعادة ضبط المصادقة الثنائية', 'Staff MFA reset'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });
}

