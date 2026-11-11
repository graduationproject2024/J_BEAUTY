import {
  $ops,
  can,
  canAny,
  esc,
  loadDashboard,
  monogramSvg,
  num,
  opsApi,
  opsState,
  refreshOpsSession,
  roleLabel,
  t,
} from './ops-state.js';
import { bindOpsAuth, opsLoginView } from './views/auth.js';
import { bindOpsMfa, opsMfaView } from './views/mfa.js';
import { bindOverview, overviewView } from './views/overview.js';
import { bindBookings, bookingsView } from './views/bookings.js';
import { bindCalendar, calendarView } from './views/calendar.js';
import { bindCustomers, customersView } from './views/customers.js';
import { bindPayments, paymentsView } from './views/payments.js';
import { bindPetals, petalsView } from './views/petals.js';
import { bindReviews, reviewsView } from './views/reviews.js';
import { bindOccasions, occasionsView } from './views/occasions.js';
import { bindCatalog, catalogView } from './views/catalog.js';
import { bindStaff, staffView } from './views/staff.js';
import { auditView, bindAudit } from './views/audit.js';
import { bindSettings, settingsView } from './views/settings.js';

function navItems(d) {
  const ov = d?.overview || {};
  return [
    { id: 'overview', ar: 'نظرة عامة', en: 'Overview', show: true, badge: 0 },
    { id: 'bookings', ar: 'إدارة الحجوزات', en: 'Bookings', show: canAny('bookings.read', 'bookings.read_assigned'), badge: ov.pending_bookings || 0 },
    { id: 'calendar', ar: 'التقويم والسعة', en: 'Calendar', show: canAny('calendar.read', 'calendar.read_assigned'), badge: 0 },
    { id: 'customers', ar: 'العميلات والتوثيق', en: 'Customers', show: canAny('customers.read_limited', 'customers.verify_identity'), badge: (d?.verifications || []).length },
    { id: 'payments', ar: 'المدفوعات والاسترداد', en: 'Payments & Refunds', show: canAny('payments.read', 'payments.verify', 'refunds.request', 'refunds.approve'), badge: ov.pending_refunds || 0 },
    { id: 'petals', ar: 'بتلات J والمكافآت', en: 'J Petals', show: canAny('loyalty.read', 'loyalty.redeem', 'loyalty.adjust'), badge: ov.pending_rewards || 0 },
    { id: 'reviews', ar: 'تقييمات العميلات', en: 'Reviews', show: can('reviews.moderate'), badge: (d?.reviews || []).filter((r) => !r.approved).length },
    { id: 'occasions', ar: 'المناسبات والهدايا', en: 'Occasions & Gifts', show: canAny('occasions.read', 'occasions.manage', 'gifts.verify_payment'), badge: ov.pending_occasions || 0 },
    { id: 'catalog', ar: 'الخدمات والباقات', en: 'Catalog', show: canAny('services.manage', 'packages.manage'), badge: 0 },
    { id: 'staff', ar: 'الفريق والصلاحيات', en: 'Team & Roles', show: can('staff.manage'), badge: 0 },
    { id: 'audit', ar: 'سجل التدقيق', en: 'Audit Log', show: can('audit.read'), badge: 0 },
    { id: 'settings', ar: 'إعدادات المنصة', en: 'Settings', show: can('settings.manage'), badge: 0 },
  ].filter((x) => x.show);
}

function renderActiveTab(tab, d) {
  if (tab === 'overview') return overviewView(d);
  if (tab === 'bookings') return bookingsView(d);
  if (tab === 'calendar') return calendarView(d);
  if (tab === 'customers') return customersView(d);
  if (tab === 'payments') return paymentsView(d);
  if (tab === 'petals') return petalsView(d);
  if (tab === 'reviews') return reviewsView(d);
  if (tab === 'occasions') return occasionsView(d);
  if (tab === 'catalog') return catalogView(d);
  if (tab === 'staff') return staffView(d);
  if (tab === 'audit') return auditView(d);
  if (tab === 'settings') return settingsView(d);
  return overviewView(d);
}

function render() {
  document.documentElement.lang = opsState.lang;
  document.documentElement.dir = opsState.lang === 'ar' ? 'rtl' : 'ltr';
  const root = $ops('#ops-app');
  if (!root) return;

  if (!opsState.user) {
    root.innerHTML = opsLoginView();
    document.title = 'J Beauty Operations | Sign In';
    bindSharedChrome();
    bindOpsAuth(render);
    return;
  }

  if ((opsState.mfa?.required && !opsState.mfa?.verified) || opsState.mfaSetupData) {
    root.innerHTML = opsMfaView();
    document.title = 'J Beauty Operations | Two-Factor Security';
    bindSharedChrome();
    bindOpsMfa(render);
    return;
  }

  const d = opsState.dashboard || {};
  const items = navItems(d);
  if (!items.some((x) => x.id === opsState.tab)) {
    opsState.tab = items[0]?.id || 'overview';
  }
  const activeNav = items.find((x) => x.id === opsState.tab) || items[0];

  root.innerHTML = `
    <div class="ops-shell">
      <div class="ops-backdrop ${opsState.drawerOpen ? 'open' : ''}" id="ops-backdrop"></div>
      <aside class="ops-sidebar ${opsState.drawerOpen ? 'open' : ''}" id="ops-sidebar" aria-label="${t('قائمة العمليات', 'Operations Navigation')}">
        <div class="ops-sidebar-brand">
          <div class="brand-pair">
            ${monogramSvg()}
            <div>
              <strong>J Beauty Ops</strong>
              <small>${t('بوابة العمليات', 'Operations Portal')}</small>
            </div>
          </div>
          <button type="button" class="ops-sidebar-close" id="ops-sidebar-close" aria-label="${t('إغلاق القائمة', 'Close menu')}">✕</button>
        </div>

        <nav class="ops-nav">
          ${items
            .map(
              (item) => `
                <button type="button" class="ops-nav-btn ${opsState.tab === item.id ? 'active' : ''}" data-ops-tab="${item.id}">
                  <span>${t(item.ar, item.en)}</span>
                  ${item.badge > 0 ? `<span class="ops-nav-badge"><bdi>${num(item.badge)}</bdi></span>` : ''}
                </button>
              `,
            )
            .join('')}
        </nav>

        <div class="ops-sidebar-foot">
          ${
            !opsState.mfa?.enabled
              ? `<button type="button" class="btn small light" id="ops-opt-mfa" style="width:100%">${t('تفعيل المصادقة الثنائية (MFA)', 'Enroll 2FA')}</button>`
              : ''
          }
          <button type="button" class="btn small danger" id="ops-logout-btn" style="width:100%">${t('تسجيل الخروج', 'Sign Out')}</button>
        </div>
      </aside>

      <div class="ops-workspace">
        <header class="ops-topbar">
          <div class="ops-topbar-start">
            <button type="button" class="ops-menu-btn" id="ops-menu-btn" aria-label="${t('فتح القائمة', 'Open navigation')}" aria-expanded="${opsState.drawerOpen}">☰</button>
            <h1 class="ops-topbar-title">${t(activeNav.ar, activeNav.en)}</h1>
          </div>
          <div class="ops-topbar-end">
            <button type="button" class="btn small light" id="ops-refresh-btn" title="${t('تحديث البيانات', 'Refresh data')}">↻ <span class="hide-sm">${t('تحديث', 'Refresh')}</span></button>
            <span class="badge hide-sm">${esc(opsState.user.name)} · ${esc(roleLabel(opsState.user.role))}</span>
            ${opsState.mfa?.enabled ? `<span class="badge mfa-ok hide-sm">MFA ✓</span>` : ''}
            ${
              opsState.customerOrigin
                ? `<a class="btn small light hide-sm" href="${esc(opsState.customerOrigin)}/ar/" target="_blank" rel="noopener noreferrer">${t('موقع العميلات ↗', 'Customer Site ↗')}</a>`
                : ''
            }
            <button type="button" class="btn small light" id="ops-lang-toggle">${t('EN', 'عربي')}</button>
          </div>
        </header>

        <main id="ops-main" class="ops-main">
          ${renderActiveTab(opsState.tab, d)}
        </main>
      </div>
    </div>
  `;

  document.title = `J Beauty Ops | ${t(activeNav.ar, activeNav.en)}`;
  bindSharedChrome();
  bindWorkspaceChrome(d);
}

function bindSharedChrome() {
  $ops('#ops-lang-toggle')?.addEventListener('click', () => {
    opsState.lang = opsState.lang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('jb_ops_lang', opsState.lang);
    render();
  });
}

function bindWorkspaceChrome(d) {
  const closeDrawer = () => {
    opsState.drawerOpen = false;
    $ops('#ops-sidebar')?.classList.remove('open');
    $ops('#ops-backdrop')?.classList.remove('open');
  };

  $ops('#ops-menu-btn')?.addEventListener('click', () => {
    opsState.drawerOpen = !opsState.drawerOpen;
    $ops('#ops-sidebar')?.classList.toggle('open', opsState.drawerOpen);
    $ops('#ops-backdrop')?.classList.toggle('open', opsState.drawerOpen);
  });
  $ops('#ops-sidebar-close')?.addEventListener('click', closeDrawer);
  $ops('#ops-backdrop')?.addEventListener('click', closeDrawer);

  $ops('#ops-refresh-btn')?.addEventListener('click', async () => {
    await loadDashboard();
    render();
  });

  document.querySelectorAll('[data-ops-tab]').forEach((btn) => {
    btn.onclick = async () => {
      opsState.tab = btn.dataset.opsTab;
      opsState.drawerOpen = false;
      try {
        await loadDashboard();
      } catch {}
      render();
    };
  });

  $ops('#ops-opt-mfa')?.addEventListener('click', async () => {
    opsState.mfaSetupData = await opsApi('/mfa/setup', {});
    render();
  });

  $ops('#ops-logout-btn')?.addEventListener('click', async () => {
    await opsApi('/logout', {});
    opsState.user = null;
    opsState.dashboard = null;
    opsState.mfaSetupData = null;
    await refreshOpsSession();
    render();
  });

  if (opsState.tab === 'overview') bindOverview(render);
  else if (opsState.tab === 'bookings') bindBookings(render);
  else if (opsState.tab === 'calendar') bindCalendar(render);
  else if (opsState.tab === 'customers') bindCustomers(render);
  else if (opsState.tab === 'payments') bindPayments(render);
  else if (opsState.tab === 'petals') bindPetals(render);
  else if (opsState.tab === 'reviews') bindReviews(render);
  else if (opsState.tab === 'occasions') bindOccasions(render);
  else if (opsState.tab === 'catalog') bindCatalog(d, render);
  else if (opsState.tab === 'staff') bindStaff(render);
  else if (opsState.tab === 'audit') bindAudit(render);
  else if (opsState.tab === 'settings') bindSettings(render);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && opsState.drawerOpen) {
    opsState.drawerOpen = false;
    render();
  }
});

(async () => {
  try {
    await refreshOpsSession();
    if (opsState.user && (!opsState.mfa?.required || opsState.mfa?.verified)) {
      await loadDashboard();
    }
    render();
  } catch (err) {
    $ops('#ops-app').innerHTML = `<main class="ops-auth-wrap"><div class="ops-auth-card"><div class="alert error">${esc(err.message)}</div></div></main>`;
  }
})();
