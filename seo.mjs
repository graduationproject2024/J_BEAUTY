const titles = {
  '': ['سبا نسائي منزلي في المدينة المنورة', 'Women’s home spa in Madinah'],
  services: ['خدمات المساج والعناية بالأظافر', 'Massage and nail care'],
  packages: ['باقات السبا المنزلي', 'Home spa packages'],
  petals: ['نادي بتلات J', 'J Petals Club'],
  about: ['عن J SPA', 'About J SPA'],
  contact: ['تواصلي معنا', 'Contact'],
  faq: ['الأسئلة الشائعة', 'Frequently asked questions'],
  reviews: ['تجارب العميلات', 'Customer reviews'],
};
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function publicOrigin() {
  try {
    const url = new URL(process.env.PUBLIC_ORIGIN);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
  } catch {}
  return '';
}
export function publicRoutes(services) {
  return [...Object.keys(titles), ...services.filter(service => service.active).map(service => `services/${service.id}`)];
}
export function pageMetadata(html, pathname, services) {
  const lang = pathname.split('/')[1] === 'en' ? 'en' : 'ar';
  const route = pathname.split('/').slice(2).join('/').replace(/\/$/, '');
  const service = services.find(item => item.active && route === `services/${item.id}`);
  const title = service?.[`name_${lang}`] ?? (Object.hasOwn(titles, route) ? titles[route][lang === 'ar' ? 0 : 1] : titles[''][lang === 'ar' ? 0 : 1]);
  const description = service?.[`description_${lang}`] ?? (lang === 'ar'
    ? 'مساج وعناية بالأظافر وخدمات الجل للسيدات في المنزل بالمدينة المنورة. اطلبي موعدكِ ليؤكده الفريق.'
    : 'At-home massage, nail care and gel services for women in Madinah. Request a visit for personal confirmation.');
  const base = publicOrigin();
  const indexable = Object.hasOwn(titles, route) || service;
  const links = base && indexable ? `<link rel="canonical" href="${escape(`${base}/${lang}/${route}`)}"><link rel="alternate" hreflang="ar-SA" href="${escape(`${base}/ar/${route}`)}"><link rel="alternate" hreflang="en-SA" href="${escape(`${base}/en/${route}`)}">` : '';
  const organization = {'@context':'https://schema.org','@type':'Organization',name:'J SPA',areaServed:{'@type':'City',name:'Madinah'},...(base ? {url:`${base}/ar/`} : {})};
  const structured = route === '' ? `<script type="application/ld+json">${JSON.stringify(organization).replaceAll('<','\\u003c')}</script>` : '';
  return html.replace('<html lang="ar" dir="rtl">', `<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">`)
    .replace(/<title>[^<]*<\/title>/, () => `<title>J SPA | ${escape(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${escape(description)}">`)
    .replace('</head>', () => `${links}${structured}${indexable ? '' : '<meta name="robots" content="noindex">'}</head>`);
}
