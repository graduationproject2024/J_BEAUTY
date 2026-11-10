import { $, api, descOf, esc, href, minutes, money, nameOf, state, t, toast } from './state.js';
import {
  head,
  icon,
  packageCard,
  petalBloomSVG,
  provisional,
  reviewsContent,
  serviceArt,
  serviceCard,
} from './components.js';
import { atelierMiniWidget } from './atelier.js';

const MOODS = [
  {
    id: 'unwind',
    ar: 'عايزة أسترخي',
    en: 'Unwind & Release',
    sub_ar: 'مساج استرخائي أو بالأحجار الساخنة يهدّئ يومكِ.',
    sub_en: 'Soothing or hot-stone massage to ease tension.',
    ids: ['relaxation', 'hot-stone'],
  },
  {
    id: 'pamper',
    ar: 'عايزة أدلع نفسي',
    en: 'Pamper Myself',
    sub_ar: 'توازن بين تدليك مريح وعناية كلاسيكية لليدين والقدمين.',
    sub_en: 'Combined body relaxation and classic mani-pedi care.',
    ids: ['classic', 'pedicure'],
  },
  {
    id: 'nails',
    ar: 'عايزة أظافر جديدة',
    en: 'Fresh Nails',
    sub_ar: 'طلاء جل، فرنش كلاسيك، أو أطراف ملونة بتصميمكِ.',
    sub_en: 'Glossy gel polish, classic French, or custom tips.',
    ids: ['gel-polish', 'french-gel'],
  },
  {
    id: 'occasion',
    ar: 'بجهز لمناسبة',
    en: 'Special Occasion',
    sub_ar: 'أطراف فرنش جل مع عناية كاملة لليوم المنتظر.',
    sub_en: 'French tip artistry paired with glowing hand and foot prep.',
    ids: ['french-tip', 'colored-french'],
  },
];

function moodPreviewHtml() {
  const m = MOODS.find((x) => x.id === state.homeMood) || MOODS[0];
  const matched = state.catalog.services.filter((s) => m.ids.includes(s.id));
  return `
    <div class="mood-result" id="mood-result">
      <div class="mood-result-grid">
        ${matched
          .map(
            (s) => `
          <div class="mood-match-card">
            <div>
              <strong>${esc(nameOf(s))}</strong>
              <span class="muted">${minutes(s.duration)} · ${money(s.price)}</span>
            </div>
            <a class="btn small" href="${href('booking')}?service=${esc(s.id)}">${t('اختاريها', 'Select')}</a>
          </div>
        `,
          )
          .join('')}
      </div>
      <div class="row" style="margin-top:14px">
        <span class="muted">${esc(t(m.sub_ar, m.sub_en))}</span>
        <a class="text-link" href="${href('studio')}">${t('جربي استوديو الترشيح الكامل ←', 'Try full J Ritual Studio →')}</a>
      </div>
    </div>
  `;
}

export function home() {
  const s = state.catalog.services || [];
  const featuredIds = ['relaxation', 'hot-stone', 'classic', 'french-gel'];
  const featured = featuredIds.map((id) => s.find((x) => x.id === id)).filter(Boolean);

  return `
    <main id="main">
      <div class="wrap">
        <!-- 1. Premium Cinematic Hero -->
        <section class="hero">
          <div class="hero-copy">
            <span class="eyebrow">${t('للسيدات فقط · المدينة المنورة', 'WOMEN’S HOME SPA · AL MADINAH')}</span>
            <h1>${t('جمالكِ. طقوسكِ.<br>لحظتكِ الخاصة في بيتكِ.', 'Your Beauty.<br>Your Ritual. Your Moment.')}</h1>
            <p class="hero-lead">${t(
              'عناية منزلية نسائية فاخرة من المساج إلى أتيليه الأظافر والجل — تصل إلى منزلكِ في المدينة المنورة بتفاصيل هادئة وتأكيد شخصي.',
              'Quiet-luxury massage, nail artistry, and botanical home spa rituals delivered across Madinah with personal team confirmation.',
            )}</p>
            <div class="hero-actions">
              <a class="btn" href="${href('booking')}">${t('احجزي موعدكِ', 'Book your moment')}</a>
              <a class="text-link" href="${href('services')}">${t('اكتشفي خدماتنا (13)', 'Explore all rituals')}</a>
            </div>
            <div class="hero-trust">
              <span>✓ ${t('للسيدات فقط', 'Women only')}</span>
              <span>✓ ${t('تأكيد يدوي شخصي', 'Personal team confirmation')}</span>
              <span>✓ ${t('أتيليه أظافر تفاعلي', 'Interactive Nail Atelier')}</span>
            </div>
          </div>
          <div class="hero-visual">
            <div class="hero-arch">
              <img src="/assets/images/hero-sanctuary.webp" alt="${t('صينية سبا فاخرة من الرخام مع مناشف قطنية وزيت نباتي وأحجار ساخنة ووردة', 'Quiet luxury travertine home spa tray with ivory towels, botanical oil, basalt stones, and tea rose')}">
            </div>
            <div class="hero-seal">
              <strong>J SPA · ${t('المدينة المنورة', 'MADINAH')}</strong>
              <span>${t('لحظتكِ الخاصة… في راحة بيتكِ', 'Your Moment of Beauty, At Home.')}</span>
            </div>
          </div>
        </section>

        <!-- 2. Choose Your Mood -->
        <section class="section-tight mood-band" data-reveal>
          <div class="section-head" style="margin-bottom:20px">
            <div>
              <span class="eyebrow">${t('اكتشاف شخصي سريع', 'DISCOVERY BY MOOD')}</span>
              <h2>${t('إيه نوع العناية اللي محتاجاها النهارده؟', 'What kind of care are you craving today?')}</h2>
            </div>
            <a class="text-link" href="${href('studio')}">${t('استوديو J للاختيار', 'Open J Ritual Studio')}</a>
          </div>
          <div class="mood-grid">
            ${MOODS.map(
              (m) => `
              <button type="button" class="mood-btn ${state.homeMood === m.id ? 'active' : ''}" data-mood-pick="${m.id}">
                <strong>${t(m.ar, m.en)}</strong>
                <span>${t(m.sub_ar, m.sub_en)}</span>
              </button>
            `,
            ).join('')}
          </div>
          ${moodPreviewHtml()}
        </section>

        <!-- 3. Featured Rituals -->
        <section class="section">
          <div class="section-head">
            <div>
              <span class="eyebrow">${t('مختارات J SPA', 'FEATURED RITUALS')}</span>
              <h2>${t('جلسات منتقاة لراحتكِ', 'Curated moments of care')}</h2>
            </div>
            <a class="text-link" href="${href('services')}">${t('تصفحي كل الخدمات (13) ←', 'Browse all 13 services →')}</a>
          </div>
          ${provisional()}
          <div class="grid four-cols">
            ${featured.map(serviceCard).join('')}
          </div>
        </section>

        <!-- 4. The J SPA Experience -->
        <section class="section" style="padding-top:12px" data-reveal>
          <div class="section-head">
            <div>
              <span class="eyebrow">${t('كيف تتم الزيارة المنزلية؟', 'THE J SPA EXPERIENCE')}</span>
              <h2>${t('من اختياركِ… حتى باب بيتكِ', 'From request to serene home ritual')}</h2>
            </div>
            <a class="text-link" href="${href('group-booking')}">${t('حجز جماعي (Beauty Together)', 'Beauty Together group visits')}</a>
          </div>
          <div class="steps four">
            ${[
              ['01', t('تقديم الطلب', 'Request Online'), t('اختاري فئة الخدمة والوقت المفضل في المدينة المنورة.', 'Pick your category, rituals, and preferred Madinah time.')],
              ['02', t('تأكيد الفريق', 'Staff Confirmation'), t('تتواصل الموظفة عبر واتساب لمراجعة السعة وتأكيد الموعد.', 'Our team checks staff capacity and confirms manually on WhatsApp.')],
              ['03', t('تحضير معقم ومرتب', 'Home Preparation'), t('نصل بمستلزمات نظيفة ومناشف مرتبة وتجهيز هادئ.', 'Sanitized instruments and fresh linens arrive neatly prepared.')],
              ['04', t('لحظتكِ الهادئة', 'The Ritual Experience'), t('تستمتعين بجلستكِ في خصوصية منزلكِ ثم تُحتسب البتلات.', 'Unwind in total privacy; points accrue once completed & paid.')],
            ]
              .map(
                ([num, title, copy]) => `
              <div class="step-card">
                <span class="step-num">${num}</span>
                <h3>${title}</h3>
                <p class="muted">${copy}</p>
              </div>
            `,
              )
              .join('')}
          </div>
        </section>

        <!-- 5. Nail Atelier Preview -->
        <section class="section-tight" data-reveal>
          ${atelierMiniWidget()}
        </section>

        <!-- 6. J Petals Club -->
        <section class="loyalty-band" data-reveal style="margin-block:48px">
          <div>
            <span class="eyebrow">J PETALS CLUB</span>
            <h2>${t('نادي بتلات J… كل زيارة تزهر مكافأة', 'J Petals Club. Care that blooms.')}</h2>
            <p>${t(
              'تُمنح البتلات حصرياً وفق القواعد المعتمدة بعد اكتمال الخدمة والتحقق من الدفع وتوثيق ملكية حسابكِ. لا تُضاف نقاط قبل الدفع الفعلي.',
              'Petals are issued exclusively after completed service, staff-verified payment receipt, and verified phone ownership.',
            )}</p>
            <div class="hero-actions" style="margin-top:24px">
              <a class="btn rose" href="${href('petals')}">${t('استكشفي نادي بتلات J', 'Discover J Petals Club')}</a>
              <a class="text-link" href="${href('gifts')}">${t('أهدي تجربة سبا', 'Gift a Ritual')}</a>
            </div>
          </div>
          <div class="loyalty-card">
            <span class="eyebrow" style="margin-bottom:4px">${t('مثال توضيحي للبرنامج', 'PROGRAM PREVIEW')}</span>
            <div class="petal-arc-wrap">
              ${petalBloomSVG(5, 8)}
              <div class="loyalty-balance-num">${t('١ ر.س = ١ بتلة', '1 SAR = 1 Petal')}</div>
              <p class="muted" style="color:#D8C8CE">${t('200 بتلة = خصم 10 ر.س · 500 بتلة = خصم 30 ر.س', '200 petals = 10 SAR · 500 petals = 30 SAR')}</p>
            </div>
          </div>
        </section>

        <!-- 7. Genuine Beauty Stories / Verified Care Standards -->
        <section class="section">
          <div class="section-head">
            <div>
              <span class="eyebrow">${t('الشفافية والثقة', 'GENUINE BEAUTY STORIES')}</span>
              <h2>${state.catalog.reviews?.length ? t('كلمات من تجارب حقيقية', 'Verified Customer Stories') : t('معايير عناية تُشعركِ بالطمأنينة', 'Standards built on honesty')}</h2>
            </div>
            <a class="text-link" href="${href('reviews')}">${t('صفحة التقييمات', 'Reviews page')}</a>
          </div>
          ${reviewsContent(state.catalog.reviews, true)}
        </section>

        <!-- 8. Final Booking CTA -->
        <section class="cta-band" data-reveal>
          <span class="eyebrow">${t('جاهزة للحظتكِ؟', 'YOUR MOMENT AWAITS')}</span>
          <h2>${t('احجزي طقسكِ المنزلي اليوم', 'Reserve your calm moment at home')}</h2>
          <p>${t('ابدئي باختيار فئة الخدمة، أو صممي إطلالة أظافركِ، أو دعي استوديو J يقترح عليكِ الأنسب.', 'Start your appointment request, explore J Nail Atelier, or get tailored studio suggestions.')}</p>
          <div class="hero-actions" style="justify-content:center">
            <a class="btn" href="${href('booking')}">${t('ابدئي طلب الحجز الآن', 'Request your appointment')}</a>
            <a class="btn light" href="${href('lookbook')}">${t('تصفحي معرض الإطلالات', 'Browse Lookbook')}</a>
          </div>
        </section>
      </div>
    </main>
  `;
}

export function services() {
  const q = new URLSearchParams(location.search);
  const catParam = q.get('cat');
  if (catParam && ['all', 'massage', 'nails', 'gel'].includes(catParam)) {
    state.filter = catParam;
  }
  const all = state.catalog.services || [];
  const counts = {
    all: all.length,
    massage: all.filter((s) => s.category === 'massage').length,
    nails: all.filter((s) => s.category === 'nails').length,
    gel: all.filter((s) => s.category === 'gel').length,
  };
  const visible = all.filter((s) => state.filter === 'all' || s.category === state.filter);

  return `
    <main id="main" class="wrap">
      ${head(
        t('خدماتنا المنزلية', 'Home Spa & Nail Rituals'),
        t('13 خدمة مصممة لعناية مريحة ومتكاملة للسيدات في المدينة المنورة.', '13 women-only treatments crafted for comfort and calm care at home in Madinah.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('الخدمات', 'Services'), '']],
      )}
      ${provisional()}
      <div class="filter" role="tablist" aria-label="${t('تصنيف الخدمات', 'Service categories')}">
        ${[
          ['all', 'جميع الخدمات', 'All rituals'],
          ['massage', 'المساج', 'Massage'],
          ['nails', 'العناية بالأظافر', 'Nail care'],
          ['gel', 'خدمات الجل', 'Gel services'],
        ]
          .map(
            ([id, ar, en]) =>
              `<button type="button" class="${state.filter === id ? 'active' : ''}" data-filter="${id}">${t(ar, en)} (${counts[id]})</button>`,
          )
          .join('')}
      </div>
      <div class="grid section-tight" style="padding-top:0">
        ${visible.map(serviceCard).join('')}
      </div>
    </main>
  `;
}

export function detail(id) {
  const s = (state.catalog.services || []).find((x) => x.id === id);
  if (!s) return notFound();
  const inclusions = s[`inclusions_${state.lang}`] || [];
  const precautions = s[`precautions_${state.lang}`] || '';
  const related = (state.catalog.services || [])
    .filter((x) => x.category === s.category && x.id !== s.id)
    .slice(0, 3);
  const isFav = state.favorites.includes(s.id);

  return `
    <main id="main" class="wrap">
      ${head(
        esc(nameOf(s)),
        '',
        [
          [t('الرئيسية', 'Home'), 'home'],
          [t('الخدمات', 'Services'), 'services'],
          [nameOf(s), ''],
        ],
      )}
      <div class="split section-tight" style="padding-top:0">
        ${serviceArt(s, 'detail-art')}
        <div>
          <div class="row" style="margin-bottom:10px">
            <span class="eyebrow" style="margin:0">${minutes(s.duration)} · ${money(s.price)}</span>
            <button type="button" class="btn small light" data-fav-toggle="${esc(s.id)}" aria-pressed="${isFav}">
              ${icon('heart')} ${isFav ? t('محفوظة بالمفضلة', 'Saved') : t('أضيفي للمفضلة', 'Save favorite')}
            </button>
          </div>
          <p style="font-size:16.5px;margin-bottom:22px">${esc(descOf(s))}</p>
          ${
            inclusions.length
              ? `<h3>${t('ما الذي تشمله الزيارة؟', 'What this visit includes')}</h3>
                 <ul class="inclusion-list">
                   ${inclusions.map((item) => `<li>${esc(item)}</li>`).join('')}
                 </ul>`
              : ''
          }
          ${
            precautions || s.credentials_required
              ? `<div class="notice">
                   <strong>${t('تنبيهات واحتياطات الجلسة', 'Precautions & Scope')}</strong><br>
                   ${esc(
                     precautions ||
                       t(
                         'تتطلب هذه الخدمة اعتماد المؤهلات والاحتياطات المهنية من الإدارة قبل التقديم، ولا تُعد بديلاً عن الاستشارة الطبية.',
                         'Professional credentials and precautions require business approval before delivery. Not a substitute for medical advice.',
                       ),
                   )}
                 </div>`
              : ''
          }
          ${provisional()}
          <div class="hero-actions" style="margin-top:20px">
            <a class="btn" href="${href('booking')}?service=${esc(s.id)}">${t('اطلبي هذه الخدمة', 'Request this ritual')}</a>
            <a class="btn light" href="${href('services')}">${t('عودة للخدمات', 'All rituals')}</a>
          </div>
          <p class="muted" style="margin-top:14px">${t('الأسعار والمواعيد المفضلة تخضع للتأكيد اليدوي من فريق J SPA.', 'Prices and preferred times are subject to manual team confirmation.')}</p>
        </div>
      </div>
      <section class="section">
        <div class="section-head">
          <h2>${t('خدمات مقاربة قد تعجبكِ', 'Related rituals')}</h2>
        </div>
        <div class="grid">${related.map(serviceCard).join('')}</div>
      </section>
    </main>
  `;
}

export function packagesPage() {
  return `
    <main id="main" class="wrap">
      ${head(
        t('باقات السبا المنزلي', 'Curated Home Spa Packages'),
        t('مجموعات مختارة بعناية تجمع خدماتنا المحبوبة بقيمة أوفر.', 'Thoughtfully paired home rituals offering combined comfort and savings.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('الباقات', 'Packages'), '']],
      )}
      ${provisional()}
      <div class="packages-grid section-tight" style="padding-top:0">
        ${(state.catalog.packages || []).map(packageCard).join('')}
      </div>
    </main>
  `;
}

export function reviewsPage() {
  return `
    <main id="main" class="wrap">
      ${head(
        t('تجارب وآراء العميلات', 'Verified Customer Reviews'),
        t('كل تقييم منشور مرتبط بزيارة مكتملة وموثقة وتمت مراجعته قبل النشر.', 'Every published review is connected to a genuinely completed booking and moderated before publication.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('الآراء', 'Reviews'), '']],
      )}
      <section class="section-tight" style="padding-top:0">
        ${reviewsContent(state.catalog.reviews, false)}
      </section>
    </main>
  `;
}

export function contentPage(p) {
  const pages = {
    about: [
      t('عن J SPA — لحظتكِ في راحة بيتكِ', 'About J SPA — Care that feels like you'),
      t(
        'J SPA منصة سبا نسائي منزلي في المدينة المنورة، صُممت لتمنح كل سيدة مساحة من السكينة والعناية الراقية دون الحاجة للخروج من منزلها.',
        'J SPA is a women’s home spa platform serving Al Madinah Al Munawwarah, designed to bring serene wellness and nail rituals into the privacy of your own home.',
      ),
      t(
        'نلتزم بالتواصل الشخصي والوضوح الكامل: كل حجز يتم تنسيقه ومراجعته يدوياً مع فريقنا لضمان توفر المختصة والالتزام بمستلزمات النظافة والاحتياطات المعتمدة.',
        'We believe in personal clarity: every request is thoughtfully reviewed and manually confirmed by our team to ensure practitioner readiness, sanitized tools, and calm scheduling.',
      ),
    ],
    policies: [
      t('سياسة الحجز والمواعيد', 'Booking Policies'),
      t(
        'إرسال نموذج الحجز على الموقع يسجل طلباً بانتظار التأكيد (Pending Confirmation) ولا يُنشئ موعداً مؤكداً بشكل آلي. يتواصل الفريق عبر واتساب للتحقق من الحي والطاقة الاستيعابية وتأكيد الوقت النهائي.',
        'Submitting the website booking form creates a pending appointment request and never automatically confirms a slot. Our team reviews your neighborhood, schedule, and capacity before confirming personally.',
      ),
      t(
        'الأسعار والباقات والمدد المعلنة حالياً تقديرية حتى اعتماد الإدارة النهائي. لتعديل أو إلغاء موعد قائم، يرجى التواصل مع الفريق قبل وقت كافٍ عبر واتساب.',
        'Listed prices, packages, and durations are provisional pending final business approval. To reschedule or cancel, please contact our team in advance through WhatsApp.',
      ),
    ],
    privacy: [
      t('سياسة الخصوصية وحماية البيانات', 'Privacy Policy'),
      t(
        'نجمع فقط المعلومات الضرورية لتنسيق الزيارات المنزلية وإدارة حسابكِ وبرنامج بتلات J (الاسم، رقم الجوال السعودي، الحي، وملاحظاتكِ الاختيارية). لا تُنشر أرقام الجوال أو العناوين أو تفاصيل الحجز للعامة مطلقاً.',
        'We collect only the details needed to coordinate home services and manage your account and J Petals Club (name, Saudi mobile number, neighborhood, and optional notes). Phone numbers, addresses, and booking details are never shown publicly.',
      ),
      t(
        'تُحفظ كلمات المرور بصيغة مشفّرة أحادية الاتجاه (Argon2id) ولا يملك أي موظف صلاحية قراءتها. عند اختياركِ الانتقال إلى واتساب لإرسال رسالة الطلب أو التوثيق، تخضع المحادثة لسياسات واتساب.',
        'Passwords are stored using strong one-way Argon2id derivation and cannot be read by staff. When you choose to open WhatsApp to send a request or verification reference, WhatsApp’s own terms apply.',
      ),
      t(
        'ملاحظة إطلاق مهمة: هذه مسودة تتطلب اعتماد إدارة J SPA النهائي لتحديد هوية المتحكم بالبيانات، جهة تواصل الخصوصية، موقع الاستضافة، ومدد الاحتفاظ والحذف وفق نظام حماية البيانات الشخصية السعودي (PDPL).',
        'Pre-launch legal notice: this draft requires business approval identifying the legal data controller, privacy contact, hosting jurisdiction, and retention schedule under Saudi PDPL.',
      ),
    ],
    terms: [
      t('الشروط والأحكام', 'Terms & Conditions'),
      t(
        'الخدمات المنزلية مخصصة للسيدات فقط ضمن أحياء المدينة المنورة المعتمدة. تسجيل الطلب يعني طلب تنسيق موعد ولا يُلزم بتأكيد فوري.',
        'Home spa services are exclusively for women within approved Madinah neighborhoods. Submitting a request does not guarantee automatic slot confirmation.',
      ),
      t(
        'نقاط نادي بتلات J تُمنح حصرياً بعد اكتمال الخدمة والتحقق من الدفع وتوثيق ملكية رقم الجوال، وتُطبق المكافآت مرة واحدة على الحجوزات المؤهلة ولا تُستبدل نقداً. تخضع الاستردادات لتعديل النقاط المقابل.',
        'J Petals Club points are issued strictly after completed service, verified payment, and verified phone ownership. Rewards are single-use discounts with no cash value and are adjusted upon refunds.',
      ),
      t(
        'تخضع جميع البنود والاحتياطات المهنية وشروط الإلغاء النهائية لاعتماد الإدارة قبل التشغيل الرسمي.',
        'Final operating terms, cancellation rules, and service precautions remain provisional pending business approval.',
      ),
    ],
  };

  const d = [...pages[p]];
  if (state.catalog.settings?.[p + '_' + state.lang]) {
    d.splice(1, d.length - 1, state.catalog.settings[p + '_' + state.lang]);
  }
  return `
    <main id="main" class="wrap">
      ${head(d[0], '', [[t('الرئيسية', 'Home'), 'home'], [d[0], '']])}
      <div class="content card">
        ${d
          .slice(1)
          .map((paragraph) => `<p style="white-space:pre-line">${esc(paragraph)}</p>`)
          .join('')}
        <div style="margin-top:24px">
          <a class="text-link" href="${href('contact')}">${t('تواصلي مع فريقنا ←', 'Contact our team →')}</a>
        </div>
      </div>
    </main>
  `;
}

export function contact() {
  const s = state.catalog.settings || {};
  const waDigits = String(s.business_phone || '').replace(/\D/g, '');
  return `
    <main id="main" class="wrap">
      ${head(
        t('تواصلي معنا', 'Contact J SPA'),
        t('نخدم عميلاتنا في منازلهن بالمدينة المنورة.', 'Serving women across approved neighborhoods in Al Madinah.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('تواصلي معنا', 'Contact'), '']],
      )}
      <div class="split content">
        <div class="card">
          <h3>${t('الخدمة المنزلية — المدينة المنورة', 'Home Service — Al Madinah')}</h3>
          <p class="muted">${t(
            'J SPA خدمة منزلية متنقلة للسيدات فقط، ولا يوجد مقر استقبال مفتوح للزيارات.',
            'J SPA operates exclusively via at-home appointments for women. There is no walk-in storefront.',
          )}</p>
          ${
            waDigits
              ? `<a class="btn sage" href="https://wa.me/${esc(waDigits)}" target="_blank" rel="noopener">${t('تواصلي عبر واتساب', 'Chat on WhatsApp')}</a>`
              : `<div class="notice">${t(
                  'لم تضف الإدارة رقم واتساب بعد في الإعدادات. يمكنكِ إرسال طلب حجز وسيظهر للفريق في لوحة الإدارة.',
                  'The business WhatsApp number is not yet configured. You can still submit an appointment request directly.',
                )}</div>`
          }
          <div style="margin-top:14px">
            <a class="btn light" href="${href('booking')}">${t('تقديم طلب حجز', 'Submit a booking request')}</a>
          </div>
        </div>
        <div class="card">
          <h3>${t('أحياء الخدمة المعتمدة', 'Configured Service Areas')}</h3>
          <p class="muted">${
            s.areas?.length
              ? s.areas.map(esc).join(' · ')
              : t('ستظهر قائمة الأحياء المعتمدة فور إعدادها من الإدارة.', 'Approved Madinah neighborhoods will appear here once configured by management.')
          }</p>
          <h3 style="margin-top:22px">${t('أوقات العمل المبدئية', 'Operating Hours')}</h3>
          <p class="muted">${esc(s.opening_time || '09:00')} – ${esc(s.closing_time || '22:00')} (${t('توقيت الرياض', 'Asia/Riyadh')})</p>
        </div>
      </div>
    </main>
  `;
}

export function faq() {
  if (state.catalog.settings?.['faq_' + state.lang]) {
    return `
      <main id="main" class="wrap">
        ${head(t('الأسئلة الشائعة', 'Frequently Asked Questions'))}
        <div class="content card" style="white-space:pre-line">${esc(state.catalog.settings['faq_' + state.lang])}</div>
      </main>
    `;
  }
  const items = [
    [
      t('هل يتم تأكيد الحجز مباشرة بعد إرسال النموذج؟', 'Is my booking confirmed immediately after submitting?'),
      t('لا. يُحفظ الطلب بحالة "بانتظار التأكيد"، ثم يراجع الفريق الوقت والحي والطاقة الاستيعابية ويؤكد الموعد معكِ شخصياً.', 'No. Your request is saved as pending confirmation, and our team personally verifies availability before confirming.'),
    ],
    [
      t('هل أحتاج إنشاء حساب قبل الحجز؟', 'Do I need an account to book?'),
      t('يمكنكِ الحجز كزائرة بسهولة. أما إنشاء حساب وتوثيقه فيتيح لكِ متابعة حجوزاتكِ وجمع بتلات نادي J.', 'Guest booking is always welcome. Creating and verifying an account lets you track your bookings and collect J Petals rewards.'),
    ],
    [
      t('كيف يعمل زر واتساب بعد تسجيل الطلب؟', 'Does WhatsApp send my booking message automatically?'),
      t('يفتح التطبيق رابط واتساب عادي مع رسالة عربية جاهزة؛ يجب عليكِ الضغط على إرسال داخل واتساب بنفسكِ. لا نستخدم أي إرسال تلقائي.', 'No. It opens a standard WhatsApp link with a prepared message; you must press Send manually inside WhatsApp.'),
    ],
    [
      t('متى تضاف نقاط نادي بتلات J إلى رصيدي؟', 'When are J Petals Club points added?'),
      t('بعد اكتمال الخدمة والتحقق من استلام الدفع من الموظفة وتوثيق ملكية رقم جوالكِ. تأكيد الموعد وحده لا يضيف نقاطاً.', 'Only after your service is completed, staff verifies payment receipt, and your account phone ownership is verified.'),
    ],
    [
      t('كيف أستعيد كلمة المرور إذا نسيتها؟', 'How do I recover a forgotten password?'),
      t('تواصلي مع الفريق عبر رقم واتساب المرتبط بحسابكِ. بعد التحقق من هويتكِ يرسل لكِ الفريق رابط استعادة مؤقتاً يُستخدم مرة واحدة.', 'Contact our team from the WhatsApp number linked to your account. After verification, staff can issue a short-lived, single-use recovery link.'),
    ],
  ];
  return `
    <main id="main" class="wrap">
      ${head(t('الأسئلة الشائعة', 'Frequently Asked Questions'), '', [[t('الرئيسية', 'Home'), 'home'], [t('الأسئلة الشائعة', 'FAQ'), '']])}
      <div class="content">
        ${items
          .map(
            ([q, a]) => `
          <details class="details">
            <summary>${q}</summary>
            <p class="muted" style="margin-top:12px;margin-bottom:0">${a}</p>
          </details>
        `,
          )
          .join('')}
      </div>
    </main>
  `;
}

export function recovery() {
  return `
    <main id="main" class="wrap">
      ${head(t('استعادة الحساب بمساعدة الفريق', 'Staff-Assisted Account Recovery'))}
      <div class="content card">
        <p>${t(
          'للحفاظ على خصوصية حسابكِ بدون خدمات رسائل مدفوعة، تواصلي مع فريق J SPA من نفس محادثة واتساب المسجلة لدينا. بعد التحقق من رقمكِ ينشئ الفريق لكِ رابط استعادة قصير الصلاحية للاستخدام مرة واحدة.',
          'To keep recovery secure without paid SMS services, contact J SPA from the WhatsApp number linked to your account. Once verified, staff can generate a short-lived single-use reset link.',
        )}</p>
        <p class="muted">${t('لا تشاركي كلمة مروركِ السابقة مع أي شخص أبداً.', 'Never share your current password with anyone.')}</p>
        <div class="hero-actions" style="margin-top:20px">
          <a class="btn" href="${href('contact')}">${t('تواصلي مع الفريق', 'Contact the team')}</a>
          <a class="btn light" href="${href('reset')}">${t('لديّ رمز استعادة بالفعل', 'I already have a reset token')}</a>
        </div>
      </div>
    </main>
  `;
}

export function notFound() {
  return `
    <main id="main" class="wrap">
      ${head(t('هذه الصفحة غير موجودة', 'This page isn’t here'))}
      <div class="empty">
        <p class="muted">${t('تأكدي من الرابط أو عودي إلى الصفحة الرئيسية لاكتشاف خدماتنا.', 'Please check the link or return home to explore our rituals.')}</p>
        <a class="btn" href="${href('home')}">${t('العودة للرئيسية', 'Back home')}</a>
      </div>
    </main>
  `;
}

export function bindPublicInteractions(goFn) {
  document.querySelectorAll('[data-mood-pick]').forEach((btn) => {
    btn.onclick = () => {
      state.homeMood = btn.dataset.moodPick;
      document.querySelectorAll('[data-mood-pick]').forEach((x) => x.classList.toggle('active', x === btn));
      const box = $('#mood-result');
      if (box) box.outerHTML = moodPreviewHtml();
    };
  });

  document.querySelectorAll('[data-fav-toggle]').forEach((btn) => {
    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!state.user) {
        toast(t('سجلي الدخول لحفظ خدماتكِ المفضلة في جواز الجمال', 'Sign in to save favorites to your Beauty Passport'));
        goFn('login');
        return;
      }
      const id = btn.dataset.favToggle;
      const isFav = state.favorites.includes(id);
      try {
        const res = await api('/passport/favorites', {
          service_id: id,
          action: isFav ? 'remove' : 'add',
        });
        state.favorites = res.favorites;
        state.account = null;
        const nowFav = state.favorites.includes(id);
        btn.classList.toggle('active', nowFav);
        btn.setAttribute('aria-pressed', String(nowFav));
        toast(nowFav ? t('أُضيفت إلى المفضلة', 'Saved to favorites') : t('أُزيلت من المفضلة', 'Removed from favorites'));
      } catch (err) {
        toast(err.message);
      }
    };
  });
}
