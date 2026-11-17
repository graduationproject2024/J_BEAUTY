import { $ops, can, esc, loadDashboard, minutes, money, nameOf, opsApi, opsToast, t } from '../ops-state.js';

export function catalogView(d) {
  const services = d.services || [];
  const packages = d.packages || [];
  const canServices = can('services.manage');
  const canPackages = can('packages.manage');

  return `
    ${
      canServices
        ? `
          <div class="ops-card">
            <h2>${t('إدارة الخدمات والأسعار', 'Services Catalog Management')}</h2>
            <form id="ops-service-form" style="margin-bottom:16px;padding:14px;background:var(--ivory);border-radius:var(--r-sm);border:1px solid var(--border)">
              <input type="hidden" name="id" id="svc-edit-id" value="">
              <div class="form-grid">
                <label class="field">${t('الاسم بالعربية', 'Name AR')}<input type="text" name="name_ar" required></label>
                <label class="field">${t('الاسم بالإنجليزية', 'Name EN')}<input type="text" name="name_en" required></label>
                <label class="field">${t('الفئة', 'Category')}
                  <select name="category" required>
                    <option value="massage">${t('المساج', 'Massage')}</option>
                    <option value="nails">${t('الأظافر', 'Nails')}</option>
                    <option value="gel">${t('الجل', 'Gel')}</option>
                  </select>
                </label>
                <label class="field">${t('السعر (ر.س)', 'Price (SAR)')}<input type="number" step="0.01" min="1" name="price" required></label>
                <label class="field">${t('المدة (دقيقة)', 'Duration (min)')}<input type="number" min="5" max="480" name="duration" required></label>
                <label class="field">${t('رابط الصورة', 'Image URL')}<input type="text" name="image" placeholder="/assets/images/services/...webp"></label>
              </div>
              <div class="form-grid">
                <label class="field">${t('الوصف بالعربية', 'Description AR')}<textarea name="description_ar" required></textarea></label>
                <label class="field">${t('الوصف بالإنجليزية', 'Description EN')}<textarea name="description_en" required></textarea></label>
              </div>
              <div class="ops-row">
                <div class="ops-chip-row">
                  <label class="ops-check"><input type="checkbox" name="active" checked><span>${t('نشطة بالموقع', 'Active')}</span></label>
                  <label class="ops-check"><input type="checkbox" name="credentials_approved"><span>${t('اعتماد المؤهل', 'Credentials Approved')}</span></label>
                </div>
                <div class="ops-chip-row">
                  <button type="button" class="btn small light" id="svc-reset-btn">${t('جديد / مسح', 'Clear')}</button>
                  <button type="submit" class="btn small">${t('حفظ الخدمة', 'Save Service')}</button>
                </div>
              </div>
            </form>

            <div class="ops-table-wrap">
              <table class="ops-table">
                <thead>
                  <tr><th>${t('الخدمة', 'Service')}</th><th>${t('الفئة والمدة', 'Category & Duration')}</th><th>${t('السعر والحالة', 'Price & Status')}</th><th>${t('تعديل', 'Edit')}</th></tr>
                </thead>
                <tbody>
                  ${services
                    .map(
                      (s) => `
                        <tr>
                          <td><strong>${esc(nameOf(s))}</strong><div class="muted">${esc(s.id)}</div></td>
                          <td>${esc(s.category)} · <bdi>${minutes(s.duration)}</bdi></td>
                          <td><bdi>${money(s.price)}</bdi> · <span class="badge ${s.active ? 'confirmed' : 'cancelled'}">${s.active ? t('نشطة', 'Active') : t('متوقفة', 'Inactive')}</span></td>
                          <td><button type="button" class="btn small light" data-edit-svc="${esc(s.id)}">${t('تعديل', 'Edit')}</button></td>
                        </tr>
                      `,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>
        `
        : ''
    }

    ${
      canPackages
        ? `
          <div class="ops-card">
            <h2>${t('إدارة الباقات المتناغمة', 'Curated Packages Management')}</h2>
            <form id="ops-package-form" style="margin-bottom:16px;padding:14px;background:var(--ivory);border-radius:var(--r-sm);border:1px solid var(--border)">
              <input type="hidden" name="id" id="pkg-edit-id" value="">
              <div class="form-grid">
                <label class="field">${t('اسم الباقة (عربي)', 'Package Name AR')}<input type="text" name="name_ar" required></label>
                <label class="field">${t('اسم الباقة (إنجليزي)', 'Package Name EN')}<input type="text" name="name_en" required></label>
                <label class="field">${t('سعر الباقة (ر.س)', 'Price (SAR)')}<input type="number" step="0.01" min="1" name="price" required></label>
              </div>
              <div class="field">
                <span>${t('الخدمات المشمولة في الباقة', 'Included Services')}</span>
                <div class="ops-cap-grid">
                  ${services
                    .map(
                      (s) => `
                        <label class="ops-check">
                          <input type="checkbox" data-pkg-svc="${esc(s.id)}">
                          <span>${esc(nameOf(s))}</span>
                        </label>
                      `,
                    )
                    .join('')}
                </div>
              </div>
              <div class="ops-row">
                <div class="ops-chip-row">
                  <label class="ops-check"><input type="checkbox" name="active" checked><span>${t('باقة متاحة للحجز', 'Active Package')}</span></label>
                </div>
                <div class="ops-chip-row">
                  <button type="button" class="btn small light" id="pkg-reset-btn">${t('جديد / مسح', 'Clear')}</button>
                  <button type="submit" class="btn small">${t('حفظ الباقة', 'Save Package')}</button>
                </div>
              </div>
            </form>

            ${packages
              .map(
                (p) => `
                  <div class="ops-mobile-card" style="margin-bottom:8px">
                    <div class="ops-row">
                      <strong>${esc(nameOf(p))}</strong>
                      <div class="ops-chip-row">
                        <span><bdi>${money(p.price)}</bdi></span>
                        <button type="button" class="btn small light" data-edit-pkg="${esc(p.id)}">${t('تعديل', 'Edit')}</button>
                        <button type="button" class="btn small light" data-remove-pkg="${esc(p.id)}">${t('حذف', 'Remove')}</button>
                      </div>
                    </div>
                  </div>
                `,
              )
              .join('')}
          </div>
        `
        : ''
    }

    ${
      can('services.manage') || can('settings.manage')
        ? `
          <div class="ops-card">
            <h2>${t('إدارة ألوان استوديو الأظافر (Nail Atelier)', 'Nail Atelier Shades Management')}</h2>
            <p class="muted">${t('التحكم في لوحة الألوان المتاحة للعميلات في محاكي الأظافر ثلاثي الأبعاد.', 'Manage color swatches available in the 3D nail atelier simulator.')}</p>
            <form id="ops-shade-form" style="margin-bottom:16px;padding:14px;background:var(--ivory);border-radius:var(--r-sm);border:1px solid var(--border)">
              <div class="form-grid">
                <label class="field">${t('اسم اللون (عربي)', 'Color Name AR')}<input type="text" name="name_ar" placeholder="مثال: لافندر ملكي" required></label>
                <label class="field">${t('اسم اللون (إنجليزي)', 'Color Name EN')}<input type="text" name="name_en" placeholder="e.g. Royal Lavender" required></label>
                <label class="field">${t('رمز اللون (Hex)', 'Hex Color')}<input type="text" name="hex" placeholder="#E6E6FA" required></label>
                <label class="field">${t('اللمسة النهائية', 'Finish')}
                  <select name="finish">
                    <option value="gloss">${t('لامع (Glossy)', 'Glossy')}</option>
                    <option value="matte">${t('مات مخملي (Matte)', 'Velvet Matte')}</option>
                    <option value="pearl">${t('لؤلؤي (Pearlescent)', 'Pearlescent')}</option>
                    <option value="shimmer">${t('بريق ناعم (Shimmer)', 'Fine Shimmer')}</option>
                  </select>
                </label>
              </div>
              <div class="ops-row">
                <label class="ops-check"><input type="checkbox" name="active" checked><span>${t('مفعل في استوديو الأظافر', 'Active')}</span></label>
                <button type="submit" class="btn small">${t('إضافة لون جديد', 'Add New Shade')}</button>
              </div>
            </form>

            <div class="ops-table-wrap">
              <table class="ops-table">
                <thead>
                  <tr><th>${t('اللون', 'Swatch')}</th><th>${t('الاسم', 'Name')}</th><th>${t('الرمز', 'Hex')}</th><th>${t('اللمسة', 'Finish')}</th><th>${t('الحالة', 'Status')}</th><th>${t('إجراء', 'Action')}</th></tr>
                </thead>
                <tbody>
                  ${(d.atelier_colors || []).map(c => `
                    <tr>
                      <td><span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${esc(c.hex)};border:1.5px solid rgba(0,0,0,0.15);box-shadow:0 2px 5px rgba(0,0,0,0.1)"></span></td>
                      <td><strong>${esc(c.name_ar)}</strong><div class="muted">${esc(c.name_en)}</div></td>
                      <td><code>${esc(c.hex)}</code></td>
                      <td>${esc(c.finish || 'gloss')}</td>
                      <td><span class="badge ${c.active ? 'confirmed' : 'cancelled'}">${c.active ? t('نشط', 'Active') : t('معطل', 'Disabled')}</span></td>
                      <td>
                        <button type="button" class="btn small light" data-toggle-shade="${esc(c.id)}" data-active="${c.active ? '0' : '1'}">${c.active ? t('تعطيل', 'Disable') : t('تفعيل', 'Enable')}</button>
                        <button type="button" class="btn small light" style="color:var(--burgundy-deep,#8B1E3F)" data-delete-shade="${esc(c.id)}">${t('حذف', 'Delete')}</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `
        : ''
    }
  `;
}

export function bindCatalog(d, renderFn) {
  const svcForm = $ops('#ops-service-form');
  document.querySelectorAll('[data-edit-svc]').forEach((btn) => {
    btn.onclick = () => {
      const s = (d.services || []).find((x) => x.id === btn.dataset.editSvc);
      if (!s || !svcForm) return;
      svcForm.elements.id.value = s.id;
      svcForm.elements.name_ar.value = s.name_ar || '';
      svcForm.elements.name_en.value = s.name_en || '';
      svcForm.elements.description_ar.value = s.description_ar || '';
      svcForm.elements.description_en.value = s.description_en || '';
      svcForm.elements.category.value = s.category || 'massage';
      svcForm.elements.price.value = s.price || '';
      svcForm.elements.duration.value = s.duration || '';
      svcForm.elements.image.value = s.image || '';
      svcForm.elements.active.checked = !!s.active;
      svcForm.elements.credentials_approved.checked = !!s.credentials_approved;
      svcForm.scrollIntoView({ behavior: 'smooth' });
    };
  });

  $ops('#svc-reset-btn')?.addEventListener('click', () => {
    svcForm?.reset();
    if (svcForm) svcForm.elements.id.value = '';
  });

  svcForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const fd = new FormData(f);
    const payload = {
      id: fd.get('id') || undefined,
      name_ar: fd.get('name_ar'),
      name_en: fd.get('name_en'),
      description_ar: fd.get('description_ar'),
      description_en: fd.get('description_en'),
      category: fd.get('category'),
      price: Number(fd.get('price')),
      duration: Number(fd.get('duration')),
      image: fd.get('image'),
      active: f.elements.active.checked,
      credentials_approved: f.elements.credentials_approved.checked,
    };
    e.submitter.disabled = true;
    try {
      await opsApi('/services', payload);
      await loadDashboard();
      opsToast(t('تم حفظ الخدمة', 'Service saved'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
      e.submitter.disabled = false;
    }
  });

  $ops('#ops-package-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const fd = new FormData(f);
    const service_ids = [...f.querySelectorAll('[data-pkg-svc]:checked')].map((x) => x.dataset.pkgSvc);
    e.submitter.disabled = true;
    try {
      await opsApi('/packages', {
        id: fd.get('id') || undefined,
        name_ar: fd.get('name_ar'),
        name_en: fd.get('name_en'),
        price: Number(fd.get('price')),
        service_ids,
        active: f.elements.active.checked,
      });
      await loadDashboard();
      opsToast(t('تم حفظ الباقة', 'Package saved'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
      e.submitter.disabled = false;
    }
  });

  const pkgForm = $ops('#ops-package-form');
  $ops('#pkg-reset-btn')?.addEventListener('click', () => {
    pkgForm?.reset();
    if (pkgForm) {
      pkgForm.elements.id.value = '';
      pkgForm.querySelectorAll('[data-pkg-svc]').forEach((cb) => (cb.checked = false));
    }
  });

  document.querySelectorAll('[data-edit-pkg]').forEach((btn) => {
    btn.onclick = () => {
      const p = (d.packages || []).find((x) => x.id === btn.dataset.editPkg);
      if (!p || !pkgForm) return;
      pkgForm.elements.id.value = p.id;
      pkgForm.elements.name_ar.value = p.name_ar || '';
      pkgForm.elements.name_en.value = p.name_en || '';
      pkgForm.elements.price.value = p.price || '';
      pkgForm.elements.active.checked = p.active !== false;
      const svcSet = new Set(p.service_ids || []);
      pkgForm.querySelectorAll('[data-pkg-svc]').forEach((cb) => {
        cb.checked = svcSet.has(cb.dataset.pkgSvc);
      });
      pkgForm.scrollIntoView({ behavior: 'smooth' });
    };
  });

  document.querySelectorAll('[data-remove-pkg]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi('/packages', { id: btn.dataset.removePkg, remove: true });
        await loadDashboard();
        opsToast(t('تم حذف الباقة', 'Package removed'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });

  $ops('#ops-shade-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const fd = new FormData(f);
    e.submitter.disabled = true;
    try {
      await opsApi('/atelier/colors', {
        name_ar: fd.get('name_ar'),
        name_en: fd.get('name_en'),
        hex: fd.get('hex'),
        finish: fd.get('finish'),
        active: f.elements.active.checked,
      });
      await loadDashboard();
      opsToast(t('تمت إضافة اللون بنجاح', 'Color added successfully'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
      e.submitter.disabled = false;
    }
  });

  document.querySelectorAll('[data-toggle-shade]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/atelier/colors/${btn.dataset.toggleShade}`, {
          active: btn.dataset.active === '1',
        });
        await loadDashboard();
        opsToast(t('تم تحديث حالة اللون', 'Color status updated'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('[data-delete-shade]').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm(t('هل أنت متأكدة من حذف هذا اللون؟', 'Are you sure you want to delete this shade?'))) return;
      btn.disabled = true;
      try {
        await opsApi(`/atelier/colors/${btn.dataset.deleteShade}`, {
          action: 'delete',
        });
        await loadDashboard();
        opsToast(t('تم حذف اللون', 'Color deleted'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });
}

