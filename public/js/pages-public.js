import { descOf, esc, href, minutes, money, nameOf, state, t } from './state.js';
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

export function home() {
  const s = state.catalog.services || [];
  const categories = [
    {
      id: 'massage',
      title: t('خدمات المساج', 'Massage Therapy'),
      sub: t(
        'تدليك استرخائي وعلاجي وبالأحجار الساخنة والتصريف اللمفاوي في هدوء منزلكِ.',
        'Relaxation, therapeutic, heated basalt stone, and gentle lymphatic care at home.',
      ),
      img: '/assets/images/services/hot-stone.webp',
      count: s.filter((x) => x.category === 'massage').length,
      from: Math.min(...s.filter((x) => x.category === 'massage').map((x) => x.price), 195),
    },
    {
      id: 'nails',
      title: t('العناية بالأظافر', 'Nail Care'),
      sub: t(
        'منيكير وبديكير كلاسيك، عناية بالأقدام، ورسم الأطراف الفرنسية بأدوات معقمة.',
        'Classic manicure & pedicure, restorative foot soaks, and crisp French tips.',
      ),
      img: '/assets/images/services/classic.webp',
      count: s.filter((x) => x.category === 'nails').length,
      from: Math.min(...s.filter((x) => x.category === 'nails').map((x) => x.price), 70),
    },
    {
      id: 'gel',
      title: t('خدمات الجل', 'Gel Services'),
      sub: t(
        'طلاء جل ثابت، فرنش جل، أطراف ملونة، وإزالة لطيفة تحافظ على صحة أظافركِ.',
        'Long-wear glossy gel polish, French gel, colored micro-tips, and gentle removal.',
      ),
      img: '/assets/images/services/french-gel.webp',
      count: s.filter((x) => x.category === 'gel').length,
      from: Math.min(...s.filter((x) => x.category === 'gel').map((x) => x.price), 50),
    },
  ];

  return `
    <main id="main">
      <div class="wrap">
        <section class="hero">
          <div class="hero-copy">
            <span class="eyebrow">${t('للسيدات فقط · المدينة المنورة', 'EXCLUSIVELY FOR WOMEN · MADINAH')}</span>
            <h1>${t('لحظتكِ الخاصة…<br>في راحة بيتكِ', 'Your Moment of Beauty,<br>At Home.')}</h1>
            <p class="hero-lead">${t(
              'طقوس عناية منزلية هادئة من المساج إلى العناية بالأظافر والجل — تأتيكِ أينما كنتِ في المدينة المنورة بتفاصيل مرتبة وتأكيد شخصي.',
              'Quiet-luxury spa and nail rituals brought directly to your home in Al Madinah, with personal confirmation and calm attention to every detail.',
            )}</p>
            <div class="hero-actions">
              <a class="btn" href="${href('booking')}">${t('احجزي موعدكِ', 'Book your moment')}</a>
              <a class="text-link" href="${href('services')}">${t('اكتشفي خدماتنا (13)', 'Explore our rituals (13)')}</a>
            </div>
            <div class="hero-trust">
              <span>✓ ${t('خدمة منزلية للسيدات فقط', 'Women-only home visits')}</span>
              <span>✓ ${t('تأكيد يدوي شخصي عبر الفريق', 'Personal team confirmation')}</span>
              <span>✓ ${t('برنامج بتلات J بعد الدفع المؤكد', 'J Petals loyalty rewards')}</span>
            </div>
          </div>
          <div class="hero-visual">
            <div class="hero-arch">
              <img src="/assets/images/hero-sanctuary.webp" alt="${t('صينية سبا فاخرة من الرخام مع مناشف قطنية وزيت نباتي وأحجار ساخنة ووردة', 'Quiet luxury travertine home spa tray with ivory towels, botanical oil, basalt stones, and tea rose')}">
            </div>
            <div class="hero-seal">
              <strong>J SPA · ${t('المدينة المنورة', 'MADINAH')}</strong>
              <span>${t('عناية نسائية منزلية هادئة، بتأكيد شخصي لموعدكِ.', 'Quiet women’s home care, personally confirmed.')}</span>
            </div>
          </div>
        </section>

        <section class="benefits" aria-label="${t('مزايا التجربة', 'Experience pillars')}">
          <div class="benefit-item">
            <div class="benefit-icon">${icon('home')}</div>
            <div>
              <strong>${t('في خصوصية منزلكِ', 'In Your Own Sanctuary')}</strong>
              <span>${t('نصل إليكِ بكامل المستلزمات النظيفة والمعقمة دون عناء التنقل.', 'We bring sanitized essentials and calm setup right to your door.')}</span>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-icon">${icon('spark')}</div>
            <div>
              <strong>${t('تأكيد شخصي ومرن', 'Personal Confirmation')}</strong>
              <span>${t('يراجع فريقنا الوقت والحي والطاقة الاستيعابية ويتواصل معكِ عبر واتساب.', 'Every request is personally checked and confirmed by our team via WhatsApp.')}</span>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-icon">${icon('shield')}</div>
            <div>
              <strong>${t('نقاط بتلات شفافة', 'Honest Petals Rewards')}</strong>
              <span>${t('تُحتسب البتلات تلقائياً بعد اكتمال الزيارة وتوثيق الدفع والحساب.', 'Points are credited automatically only after completed, verified-paid visits.')}</span>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div>
              <span class="eyebrow">${t('قائمة الطقوس', 'CURATED CATEGORIES')}</span>
              <h2>${t('ثلاثة عوالم للعناية بكِ', 'Three worlds of calm care')}</h2>
            </div>
            <a class="text-link" href="${href('services')}">${t('عرض جميع الخدمات (13)', 'View all 13 rituals')}</a>
          </div>
          <div class="category-grid">
            ${categories
              .map(
                (c) => `
              <a class="category-card" href="${href('services')}?cat=${c.id}">
                <div class="category-media">
                  <img src="${c.img}" alt="${esc(c.title)}" loading="lazy">
                  <span class="category-pill">${c.count} ${t('خدمات', 'services')}</span>
                </div>
                <div class="category-body">
                  <h3>${c.title}</h3>
                  <p>${c.sub}</p>
                  <div class="category-foot">
                    <span>${t('تبدأ من', 'From')} ${money(c.from)}</span>
                    <span>${t('تصفحي القسم ←', 'Explore →')}</span>
                  </div>
                </div>
              </a>
            `,
              )
              .join('')}
          </div>
        </section>

        <section class="section" style="padding-top:12px">
          <div class="section-head">
            <div>
              <span class="eyebrow">${t('باقات متكاملة', 'THOUGHTFULLY PAIRED')}</span>
              <h2>${t('باقات تجمع ما تحبين', 'Curated Gift Collections')}</h2>
            </div>
            <a class="text-link" href="${href('packages')}">${t('جميع الباقات', 'All packages')}</a>
          </div>
          ${provisional()}
          <div class="packages-grid">
            ${(state.catalog.packages || []).map(packageCard).join('')}
          </div>
        </section>

        <section class="section" style="padding-top:12px">
          <div class="section-head">
            <div>
              <span class="eyebrow">${t('خطوات واضحة', 'HOW IT WORKS')}</span>
              <h2>${t('من اختياركِ… إلى باب منزلكِ', 'From selection to your doorstep')}</h2>
            </div>
          </div>
          <div class="steps">
            ${[
              [
                '01',
                t('اختاري طقسكِ أو باقتكِ', 'Choose your ritual'),
                t('حددي خدمة واحدة أو عدة خدمات أو إحدى الباقات المتناغمة.', 'Pick one or multiple treatments, or one of our paired packages.'),
              ],
              [
                '02',
                t('أرسلي طلبكِ عبر واتساب', 'Send via WhatsApp'),
                t('يُحفظ طلبكِ لدينا وتُفتح رسالة واتساب جاهزة لتضغطي إرسال بنفسكِ.', 'Your request is saved and WhatsApp opens with a prepared Arabic message for you to send.'),
              ],
              [
                '03',
                t('نؤكد الموعد شخصياً', 'Personal confirmation'),
                t('تراجع الموظفة الوقت والحي والسعة ثم تؤكد الموعد معكِ يدوياً.', 'Staff checks neighborhood capacity and manually confirms your final appointment.'),
              ],
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

        <section class="loyalty-band">
          <div>
            <span class="eyebrow">J PETALS CLUB</span>
            <h2>${t('نادي بتلات J… كل زيارة تزهر مكافأة', 'J Petals Club. Care that blooms.')}</h2>
            <p>${t(
              'مع كل زيارة مكتملة ومدفوعة بتحقق الموظفة، تضاف البتلات تلقائياً إلى حسابكِ الموثق لتستبدليها بخصومات على حجوزاتكِ القادمة.',
              'Collect petals on every completed, staff-verified paid visit in your verified account and redeem beauty rewards on upcoming bookings.',
            )}</p>
            <div class="hero-actions" style="margin-top:24px">
              <a class="btn rose" href="${href('petals')}">${t('استكشفي نادي بتلات J', 'Discover J Petals Club')}</a>
              <a class="text-link" href="${href('register')}">${t('أنشئي حسابكِ', 'Create an account')}</a>
            </div>
          </div>
          <div class="loyalty-card">
            <span class="eyebrow" style="margin-bottom:6px">${t('مثال توضيحي للبرنامج', 'PROGRAM PREVIEW')}</span>
            <div class="petal-arc-wrap">
              ${petalBloomSVG(5, 8)}
              <div class="loyalty-balance-num">${t('١ ر.س = ١ بتلة', '1 SAR = 1 Petal')}</div>
              <p class="muted" style="color:#D8C8CE">${t('200 بتلة = خصم 10 ر.س · 500 بتلة = خصم 30 ر.س', '200 petals = 10 SAR · 500 petals = 30 SAR')}</p>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div>
              <span class="eyebrow">${t('كلمات صادقة', 'GENUINE VOICES')}</span>
              <h2>${t('تجارب العميلات', 'Customer Reviews')}</h2>
            </div>
            <a class="text-link" href="${href('reviews')}">${t('صفحة التقييمات', 'All reviews')}</a>
          </div>
          ${reviewsContent(state.catalog.reviews)}
        </section>

        <section class="cta-band">
          <span class="eyebrow">${t('جاهزة للحظتكِ؟', 'TAKE A BREATH')}</span>
          <h2>${t('لحظتكِ الهادئة تبدأ بخطوة بسيطة', 'Your quiet moment starts here.')}</h2>
          <p>${t('اختاري خدمتكِ الآن، واتركي الباقي لتنسيق فريق J SPA في المدينة المنورة.', 'Select your treatment and let our Madinah team coordinate the rest.')}</p>
          <a class="btn" href="${href('booking')}">${t('ابدئي طلب الحجز الآن', 'Request your appointment')}</a>
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
        [[t('الرئيسية', 'home'), 'home'], [t('الخدمات', 'Services'), '']],
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
          <span class="eyebrow">${minutes(s.duration)} · ${money(s.price)}</span>
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
        ${reviewsContent(state.catalog.reviews)}
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
