import { $, api, esc, href, page, refreshSession, state, t } from './js/state.js';
import { footer, head, header } from './js/components.js';
import { initScrollReveals, trackFunnel } from './js/motion.js';
import { atelierPage, bindAtelier } from './js/atelier.js';
import {
  bindExperiences,
  giftsPage,
  groupBookingPage,
  lookbookPage,
  studioPage,
} from './js/experiences.js';
import {
  bindPublicInteractions,
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

let lastBeaconRoute = '';
let loadedSharedCode = '';

function focusRouteHeading() {
  const h1 = document.querySelector('#main h1');
  if (h1) {
    h1.setAttribute('tabindex', '-1');
    h1.focus({ preventScroll: true });
  }
}

async function go(route) {
  history.pushState({}, '', href(route));
  state.filter = 'all';
  await render();
  window.scrollTo(0, 0);
  focusRouteHeading();
}

function updateMobileBar(cur) {
  const bar = $('#mobile-bar');
  const btn = $('#mobile-bar #mobile-book-btn');
  if (!bar || !btn) return;
  const isMobile = window.innerWidth <= 780;
  const hideOn = ['booking', 'admin', 'account', 'bookings', 'rewards', 'login', 'register', 'reset', 'atelier', 'group-booking', 'gifts'];
  const scrolledEnough = window.scrollY > 240;
  const show = isMobile && !hideOn.includes(cur) && scrolledEnough;
  bar.hidden = !show;
  document.body.classList.toggle('has-mobile-bar', show);
  if (show) {
    btn.href = href('booking');
    btn.textContent = t('احجزي موعدكِ الآن', 'Book your moment');
  }
}

function maybeTrackRoute(cur) {
  if (lastBeaconRoute === cur) return;
  lastBeaconRoute = cur;
  if (cur === 'home') trackFunnel('home_view');
  else if (cur.startsWith('services/')) trackFunnel('service_view');
  else if (cur === 'booking' && !state.bookingResult) trackFunnel('booking_start');
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
    else if (cur === 'studio') body = studioPage();
    else if (cur === 'lookbook') body = lookbookPage();
    else if (cur === 'group-booking') body = groupBookingPage();
    else if (cur === 'gifts') body = giftsPage();
    else if (cur === 'atelier') {
      const q = new URLSearchParams(location.search);
      const code = q.get('style');
      if (code && code !== loadedSharedCode) {
        loadedSharedCode = code;
        try {
          const shared = await api(`/atelier/styles/${encodeURIComponent(code)}`);
          if (shared?.style) {
            state.atelier = { ...state.atelier, ...shared.style, lastShareUrl: location.href };
          }
        } catch {}
      }
      body = atelierPage();
    } else if (cur === 'booking') {
      const q = new URLSearchParams(location.search);
      if (q.has('service') && state.bookingStep === 1) {
        const svcId = q.get('service');
        const svc = state.catalog.services.find((s) => s.id === svcId);
        state.bookingMode = 'services';
        state.bookingCategory = svc?.category || 'massage';
        state.bookingStep = 2;
        state.draft.service_ids = [svcId];
        state.draft.package_id = null;
      }
      if (q.has('package') && state.bookingStep === 1) {
        state.bookingMode = 'packages';
        state.bookingCategory = 'packages';
        state.bookingStep = 2;
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
  const titleMap = {
    home: t('سبا منزلي المدينة المنورة', 'Home Spa Madinah'),
    studio: t('استوديو الجمال J', 'J Ritual Studio'),
    atelier: t('أتيليه الأظافر', 'J Nail Atelier'),
    lookbook: t('معرض الإلهام', 'Beauty Lookbook'),
    'group-booking': t('جلسة معاً', 'Beauty Together'),
    gifts: t('أهدي لحظة عناية', 'Gift a Ritual'),
    account: t('جواز الجمال وحسابي', 'Beauty Passport & Account'),
  };
  document.title = 'J SPA | ' + (titleMap[cur] || cur.replaceAll('-', ' '));

  updateMobileBar(cur);
  initScrollReveals();
  maybeTrackRoute(cur);
  bind(cur);
}

function bind(cur) {
  document.querySelectorAll(`a[href^="/${state.lang}/"]`).forEach((a) => {
    a.addEventListener('click', async (e) => {
      if (a.target || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      const u = new URL(a.href);
      history.pushState({}, '', u.pathname + u.search);
      $('#nav')?.classList.remove('open');
      $('#menu')?.setAttribute('aria-expanded', 'false');
      await render();
      window.scrollTo(0, 0);
      focusRouteHeading();
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

  bindPublicInteractions(go);
  bindAtelier(go, render);
  bindExperiences(render);
  bindBooking(render);
  bindAccount(go, render);
  bindAdmin(render);
}

window.addEventListener('popstate', async () => {
  await render();
  focusRouteHeading();
});
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
