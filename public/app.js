import { $, api, esc, href, page, refreshSession, state, t } from './js/state.js';
import { footer, head, header } from './js/components.js';
import {
  contact,
  contentPage,
  detail,
  faq,
  home,
  notFound,
  packagesPage,
  recovery,
  reviewsPage,
  services,
} from './js/pages-public.js';
import { bindBooking, booking } from './js/booking.js';
import { accountPage, auth, bindAccount, petalsPage } from './js/account.js';
import { adminPage, bindAdmin } from './js/admin.js';

function go(route) {
  history.pushState({}, '', href(route));
  state.filter = 'all';
  render();
  window.scrollTo(0, 0);
}

function updateMobileBar(cur) {
  const bar = $('#mobile-bar');
  const btn = $('#mobile-bar #mobile-book-btn');
  if (!bar || !btn) return;
  const isMobile = window.innerWidth <= 780;
  const hideOn = ['booking', 'admin', 'account', 'bookings', 'rewards', 'login', 'register', 'reset'];
  const scrolledEnough = window.scrollY > 240;
  const show = isMobile && !hideOn.includes(cur) && scrolledEnough;
  bar.hidden = !show;
  document.body.classList.toggle('has-mobile-bar', show);
  if (show) {
    btn.href = href('booking');
    btn.textContent = t('احجزي موعدكِ الآن', 'Book your moment');
  }
}

export async function render() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  const cur = page();
  let body;

  try {
    if (cur === 'home') body = home();
    else if (cur === 'services') body = services();
    else if (cur.startsWith('services/')) body = detail(cur.split('/')[1]);
    else if (cur === 'packages') body = packagesPage();
    else if (cur === 'booking') {
      const q = new URLSearchParams(location.search);
      if (q.has('service') && state.bookingStep === 1) {
        state.bookingMode = 'services';
        state.draft.service_ids = [q.get('service')];
        state.draft.package_id = null;
      }
      if (q.has('package') && state.bookingStep === 1) {
        state.bookingMode = 'packages';
        state.draft.package_id = q.get('package');
        state.draft.service_ids = [];
      }
      body = booking();
    } else if (['login', 'register', 'reset'].includes(cur)) body = auth(cur);
    else if (['account', 'bookings', 'rewards'].includes(cur)) body = await accountPage(cur);
    else if (cur === 'petals') body = petalsPage();
    else if (cur === 'reviews') body = reviewsPage();
    else if (['about', 'privacy', 'terms', 'policies'].includes(cur)) body = contentPage(cur);
    else if (cur === 'contact') body = contact();
    else if (cur === 'faq') body = faq();
    else if (cur === 'recovery') body = recovery();
    else if (cur === 'admin') body = await adminPage();
    else body = notFound();
  } catch (err) {
    body = `<main id="main" class="wrap">${head(t('تعذر تحميل الصفحة', 'Unable to load page'))}<div class="error">${esc(err.message)}</div><button class="btn" id="retry" type="button">${t('إعادة المحاولة', 'Try again')}</button></main>`;
  }

  $('#app').innerHTML = header() + body + footer();
  document.title =
    'J SPA | ' +
    (cur === 'home'
      ? t('سبا منزلي المدينة المنورة', 'Home Spa Madinah')
      : cur.replaceAll('-', ' '));

  updateMobileBar(cur);
  bind(cur);
}

function bind(cur) {
  document.querySelectorAll(`a[href^="/${state.lang}/"]`).forEach((a) => {
    a.addEventListener('click', (e) => {
      if (a.target || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      const u = new URL(a.href);
      history.pushState({}, '', u.pathname + u.search);
      $('#nav')?.classList.remove('open');
      render();
      window.scrollTo(0, 0);
    });
  });

  $('#mobile-book-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    go('booking');
  });

  $('#menu')?.addEventListener('click', () => {
    const nav = $('#nav');
    const open = nav.classList.toggle('open');
    $('#menu').setAttribute('aria-expanded', String(open));
    const bar = $('#mobile-bar');
    if (bar && open) bar.hidden = true;
    else updateMobileBar(cur);
  });

  $('#language').onclick = () => {
    state.lang = state.lang === 'ar' ? 'en' : 'ar';
    history.replaceState({}, '', href(page()) + location.search);
    render();
  };

  $('#retry')?.addEventListener('click', render);

  document.querySelectorAll('[data-filter]').forEach((b) => {
    b.onclick = () => {
      state.filter = b.dataset.filter;
      const u = new URL(location.href);
      if (state.filter === 'all') u.searchParams.delete('cat');
      else u.searchParams.set('cat', state.filter);
      history.replaceState({}, '', u.pathname + u.search);
      render();
    };
  });

  bindBooking(render);
  bindAccount(go, render);
  bindAdmin(render);
}

window.addEventListener('popstate', render);
window.addEventListener('resize', () => updateMobileBar(page()));
window.addEventListener('scroll', () => updateMobileBar(page()), { passive: true });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#nav')?.classList.contains('open')) {
    $('#nav').classList.remove('open');
    $('#menu')?.setAttribute('aria-expanded', 'false');
    $('#menu')?.focus();
    updateMobileBar(page());
  }
});

(async () => {
  try {
    await refreshSession();
    state.catalog = await api('/catalog');
    await render();
  } catch (err) {
    $('#app').innerHTML = `<main class="wrap">${head('J SPA')}<div class="error">${esc(err.message)}</div><p>${t('تعذر الاتصال بالخادم. أعيدي تحميل الصفحة.', 'Unable to connect to the server. Please reload.')}</p></main>`;
  }
})();
