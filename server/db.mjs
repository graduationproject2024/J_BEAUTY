import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const uid = () => randomUUID();
export const now = () => new Date().toISOString();

export const DEFAULT_SETTINGS = {
  business_phone: '',
  instagram: '',
  tiktok: '',
  areas: [],
  capacity: 0,
  working_days: [0, 1, 2, 3, 4, 5, 6],
  opening_time: '09:00',
  closing_time: '22:00',
  blocked_dates: [],
  travel_buffer: 30,
  lead_hours: 12,
  points_per_sar: 1,
  rewards: [
    { id: 'petal-200', points: 200, value: 10 },
    { id: 'petal-500', points: 500, value: 30 },
  ],
  business_approved: false,
  about_ar: '',
  about_en: '',
  policies_ar: '',
  policies_en: '',
  privacy_ar: '',
  privacy_en: '',
  terms_ar: '',
  terms_en: '',
  faq_ar: '',
  faq_en: '',
};

const OLD_GENERIC_AR =
  'لحظة عناية هادئة في راحة منزلكِ. يناقش الفريق التفاصيل والاحتياطات معكِ قبل تأكيد الموعد.';

export const SEED_SERVICES = [
  {
    id: 'relaxation',
    name_ar: 'مساج استرخائي',
    name_en: 'Relaxation Massage',
    duration: 60,
    price: 195,
    category: 'massage',
    image: '/assets/images/services/relaxation.webp',
    description_ar:
      'جلسة تدليك هادئة بضغط لطيف إلى متوسط باستخدام زيوت نباتية دافئة لتخفيف التوتر اليومي واستعادة صفاء الذهن في هدوء منزلكِ.',
    description_en:
      'A soothing full-body massage with light-to-medium pressure and warm botanical oils to release everyday tension and restore calm at home.',
    inclusions_ar: [
      'جلسة 60 دقيقة بتقنيات انسيابية مريحة',
      'زيوت عطرية نباتية مختارة حسب راحتكِ',
      'تهيئة أجواء هادئة بمستلزمات نظيفة ومعقمة',
    ],
    inclusions_en: [
      '60-minute rhythmic Swedish-inspired relaxation session',
      'Warm botanical massage oil tailored to your preference',
      'Freshly laundered linens and serene home setup',
    ],
    precautions_ar: 'لا يعد بديلاً عن الرعاية الطبية. يُرجى إبلاغ المختصة بأي حساسية جلدية أو حمل قبل الموعد.',
    precautions_en: 'Not a substitute for medical care. Please share any skin sensitivities or pregnancy prior to your session.',
    credentials_required: false,
  },
  {
    id: 'therapeutic',
    name_ar: 'مساج علاجي',
    name_en: 'Therapeutic Massage',
    duration: 60,
    price: 225,
    category: 'massage',
    image: '/assets/images/services/therapeutic.webp',
    description_ar:
      'تدليك مركز يستهدف مواضع الشد العضلي في الكتفين والرقبة والظهر بضغط مدروس يخفف الإجهاد الحركي ويعزز الشعور بالمرونة.',
    description_en:
      'Targeted bodywork focusing on tight muscle groups across the neck, shoulders, and back using measured pressure to ease muscular strain.',
    inclusions_ar: [
      'تقييم مبدئي سريع لمناطق الشد العضلي',
      'تركيز متدرج على الأنسجة العميقة حسب التحمل',
      'كمادات دافئة وبلسم عشبي مهدئ',
    ],
    inclusions_en: [
      'Brief pre-session check-in on areas of tension',
      'Graduated deep-tissue techniques matched to comfort',
      'Warm linen compress and soothing herbal balm',
    ],
    precautions_ar:
      'تتطلب هذه الخدمة اعتماد المؤهلات المهنية والاحتياطات من الإدارة قبل تأكيد الحجز. غير مخصصة للحالات الطبية الحادة.',
    precautions_en:
      'Requires business credential approval and precaution review prior to confirmation. Not intended for acute medical conditions.',
    credentials_required: true,
  },
  {
    id: 'hot-stone',
    name_ar: 'مساج الأحجار الساخنة',
    name_en: 'Hot Stone Massage',
    duration: 60,
    price: 265,
    category: 'massage',
    image: '/assets/images/services/hot-stone.webp',
    description_ar:
      'تجربة استرخاء دافئة تعتمد على أحجار البازلت الملساء المسخّنة بعناية لتتغلغل حرارتها اللطيفة في العضلات وتمنحكِ سكينة عميقة.',
    description_en:
      'A deeply comforting treatment pairing smoothly polished heated basalt stones with slow massage strokes to melt away stiffness.',
    inclusions_ar: [
      'تسخين مضبوط لأحجار البازلت الطبيعية الملساء',
      'تدليك انسيابي بالزيت الدافئ والأحجار',
      'عناية دقيقة باختبار حرارة الأحجار لراحتكِ',
    ],
    inclusions_en: [
      'Temperature-controlled smooth natural basalt stones',
      'Fluid stone-and-oil massage strokes',
      'Continuous comfort and warmth checks throughout',
    ],
    precautions_ar: 'غير مناسبة للبشرة شديدة الحساسية للحرارة أو حالات ارتفاع الحرارة أو الحمل المبكر.',
    precautions_en: 'Not advised for heat-sensitive skin, fever, or early pregnancy; inform our team of sensitivities.',
    credentials_required: false,
  },
  {
    id: 'lymphatic',
    name_ar: 'مساج التصريف اللمفاوي',
    name_en: 'Lymphatic Drainage Massage',
    duration: 60,
    price: 255,
    category: 'massage',
    image: '/assets/images/services/lymphatic.webp',
    description_ar:
      'تقنية تدليك إيقاعية شديدة اللطف تعتمد على حركات سطحية مدروسة تمنح الجسم إحساساً بالخفة والانتعاش والراحة.',
    description_en:
      'An ultra-gentle, rhythmic surface technique using light directional strokes designed to leave the body feeling refreshed and light.',
    inclusions_ar: [
      'حركات يدوية لطيفة ومتسلسلة بإيقاع هادئ',
      'تركيز متوازن على راحة الساقين والذراعين والرقبة',
      'مراجعة الاحتياطات المسبقة مع الفريق قبل التأكيد',
    ],
    inclusions_en: [
      'Feather-light directional hand sequences',
      'Balanced comfort care across limbs and upper body',
      'Pre-booking precaution verification with our team',
    ],
    precautions_ar:
      'تتطلب اعتماد المؤهلات والاحتياطات المهنية من الإدارة قبل التقديم. يُرجى استشارة الطبيب للحالات الصحية الخاصة.',
    precautions_en:
      'Requires business credential and precaution approval prior to delivery. Consult a physician for medical post-op or vascular conditions.',
    credentials_required: true,
  },
  {
    id: 'classic',
    name_ar: 'منيكير وبديكير كلاسيك',
    name_en: 'Classic Manicure & Pedicure',
    duration: 75,
    price: 185,
    category: 'nails',
    image: '/assets/images/services/classic.webp',
    description_ar:
      'عناية شاملة لليدين والقدمين تشمل التنظيف الدقيق، تنسيق الأظافر، ترطيب البشرة، وطلاء كلاسيكي أنيق بأدوات معقمة فردياً.',
    description_en:
      'Complete hand and foot grooming with gentle soaking, cuticle refinement, nail shaping, soothing moisturizer, and classic polish.',
    inclusions_ar: [
      'نقع دافئ وتقشير لطيف لليدين والقدمين',
      'ترتيب الأظافر والعناية بالجلد المحيط',
      'أدوات عناية معقمة ومغلفة لكل عميلة',
    ],
    inclusions_en: [
      'Warm botanical soak and gentle exfoliation for hands and feet',
      'Precision shaping, cuticle care, and hydrating massage',
      'Individually sanitized manicure & pedicure instruments',
    ],
    precautions_ar: 'يُرجى إبلاغنا مسبقاً بأي التهابات جلدية أو حساسية في الأظافر.',
    precautions_en: 'Please let us know ahead of time if you have nail sensitivities or irritated skin.',
    credentials_required: false,
  },
  {
    id: 'pedicure',
    name_ar: 'بديكير',
    name_en: 'Pedicure',
    duration: 45,
    price: 125,
    category: 'nails',
    image: '/assets/images/services/pedicure.webp',
    description_ar:
      'جلسة متخصصة لتدليل القدمين تبدأ بحمام مائي دافئ وإزالة الجلد الجاف وترطيب عميق مع ترتيب الأظافر بلمسة نظيفة وناعمة.',
    description_en:
      'Dedicated foot care beginning with a warm rose-petal soak, gentle smoothing of dry areas, nail shaping, and deep moisturizing.',
    inclusions_ar: [
      'حمام دافئ للقدمين مع أملاح مهدئة',
      'تنعيم الكعبين وترتيب أظافر القدمين',
      'تدليك مرطب ومريح للقدمين',
    ],
    inclusions_en: [
      'Warm soothing foot bath with gentle mineral soak',
      'Heel smoothing and clean nail shaping',
      'Nourishing cream application with brief foot massage',
    ],
    precautions_ar: 'نستخدم حوضاً ومناشف وأدوات نظيفة مخصصة للخدمة المنزلية.',
    precautions_en: 'Delivered with sanitized portable foot-care essentials and fresh linens.',
    credentials_required: false,
  },
  {
    id: 'french-tip',
    name_ar: 'منيكير فرنش تيب',
    name_en: 'French Tip Manicure',
    duration: 60,
    price: 155,
    category: 'nails',
    image: '/assets/images/services/french-tip.webp',
    description_ar:
      'إطلالة كلاسيكية ناعمة تجمع بين عناية المنيكير الكاملة ورسم أطراف فرنسية دقيقة بلون عاجي نقي فوق قاعدة وردية شفافة.',
    description_en:
      'Timeless elegance pairing complete cuticle and nail care with crisp ivory French tips over a sheer blush-pink base.',
    inclusions_ar: [
      'تحضير الأظافر وترطيب اليدين الكامل',
      'طبقة أساس وردية شفافة ورسم طرف فرنسي متقن',
      'طبقة حماية لامعة لثبات أجمل',
    ],
    inclusions_en: [
      'Full manicure preparation and hand hydration',
      'Sheer blush base with precision ivory French tips',
      'High-shine protective top coat finish',
    ],
    precautions_ar: 'يتطلب وقت جفاف قصير بعد الطلاء الكلاسيكي.',
    precautions_en: 'Allow brief drying time after traditional polish application.',
    credentials_required: false,
  },
  {
    id: 'french-polish',
    name_ar: 'طلاء أظافر فرنسي',
    name_en: 'French Polish',
    duration: 25,
    price: 70,
    category: 'nails',
    image: '/assets/images/services/french-polish.webp',
    description_ar:
      'خدمة سريعة لتنسيق وتلوين الأظافر بالنمط الفرنسي الأنيق لمن ترغب بتجديد إطلالتها بلمسة ناعمة ومرتبة.',
    description_en:
      'A crisp express French polish refresh with light nail shaping and neat ivory tips for an effortlessly polished finish.',
    inclusions_ar: [
      'برد وتنسيق سريع لشكل الأظافر',
      'تطبيق الطلاء الفرنسي الكلاسيكي',
      'زيت مغذٍ لمحيط الظفر',
    ],
    inclusions_en: [
      'Quick nail shaping and surface buffing',
      'Clean French polish base and tip application',
      'Nourishing botanical cuticle oil drop',
    ],
    precautions_ar: 'خدمة تلوين وتنسيق سريعة لا تشمل نقعاً أو إزالة جل سابق.',
    precautions_en: 'Express polish service; does not include full soak or prior gel removal.',
    credentials_required: false,
  },
  {
    id: 'gel-polish',
    name_ar: 'طلاء جل',
    name_en: 'Gel Polish',
    duration: 45,
    price: 115,
    category: 'gel',
    image: '/assets/images/services/gel-polish.webp',
    description_ar:
      'لون غني ولمعان ثابت يدوم طويلاً مع تثبيت بمصباح UV/LED احترافي وتجهيز نظيف لسطح الظفر.',
    description_en:
      'Rich, glossy color cured under a compact UV/LED lamp for durable chip-resistant wear and effortless everyday shine.',
    inclusions_ar: [
      'تحضير الأظافر وتنظيف الزوائد الجلدية بلطف',
      'طبقات جل عالية الثبات مع التثبيت الضوئي',
      'تشكيلة مختارة من الدرجات الوردية والحيادية',
    ],
    inclusions_en: [
      'Gentle nail plate prep and neat cuticle tidying',
      'Long-wear gel color coats cured under UV/LED light',
      'Curated dusty-rose, neutral, and signature shades',
    ],
    precautions_ar: 'تتطلب الإزالة الآمنة لاحقاً خدمة إزالة جل متخصصة لتجنب إضعاف الظفر.',
    precautions_en: 'For nail health, remove later with gentle soak-off care rather than peeling.',
    credentials_required: false,
  },
  {
    id: 'french-gel',
    name_ar: 'جل فرنسي',
    name_en: 'French Gel',
    duration: 55,
    price: 145,
    category: 'gel',
    image: '/assets/images/services/french-gel.webp',
    description_ar:
      'أناقة الطراز الفرنسي بلمعان الجل المتين؛ قاعدة وردية ناعمة وأطراف ناصعة متوازنة تدوم بجمالها أياماً طويلة.',
    description_en:
      'The signature French manicure elevated in glossy, long-lasting gel with a soft blush tint and clean ivory tips.',
    inclusions_ar: [
      'تجهيز الظفر والعناية بمحيطه',
      'رسم خطوط فرنسية دقيقة بالجل وتثبيتها',
      'طبقة ختامية زجاجية اللمعان وزيت ترطيب',
    ],
    inclusions_en: [
      'Detailed cuticle preparation and nail shaping',
      'Hand-painted gel French smile lines cured evenly',
      'Glass-shine top coat and sweet-almond cuticle oil',
    ],
    precautions_ar: 'في حال وجود جل سابق على الأظافر، يُنصح بإضافة خدمة إزالة الجل.',
    precautions_en: 'If wearing existing gel, consider adding Gel Removal to your appointment.',
    credentials_required: false,
  },
  {
    id: 'colored-french',
    name_ar: 'جل فرنسي بأطراف ملونة',
    name_en: 'Colored French Gel',
    duration: 60,
    price: 155,
    category: 'gel',
    image: '/assets/images/services/colored-french.webp',
    description_ar:
      'لمسة عصرية على الفرنش الكلاسيكي بأطراف ملونة دقيقة بدرجات الورد الباستيل أو المريمية أو الألوان الموسمية حسب ذوقكِ.',
    description_en:
      'A modern twist on the classic French tip featuring delicate micro-tips in dusty rose, sage, or your favorite tonal palette.',
    inclusions_ar: [
      'تحضير شامل للظفر واختيار الدرجة المناسبة',
      'رسم أطراف ملونة دقيقة بتناسق عالٍ',
      'لمعان جل ثابت ومقاوم للتقشر',
    ],
    inclusions_en: [
      'Complete nail prep and custom tip color selection',
      'Precision micro-French colored tip artistry',
      'Cured gloss seal and hydrating finish',
    ],
    precautions_ar: 'تأكدي من اختيار إزالة الجل إذا كانت أظافركِ تحتوي على جل حالي.',
    precautions_en: 'Please add Gel Removal if removing previous gel at the same visit.',
    credentials_required: false,
  },
  {
    id: 'gel-removal',
    name_ar: 'إزالة الجل',
    name_en: 'Gel Removal',
    duration: 25,
    price: 50,
    category: 'gel',
    image: '/assets/images/services/gel-removal.webp',
    description_ar:
      'إزالة آمنة ولطيفة لطلاء الجل السابق باستخدام مزيل مخصص وتنعيم خفيف مع زيت مغذٍ يحافظ على صحة الظفر الطبيعي.',
    description_en:
      'Careful, non-damaging soak-off gel removal followed by gentle buffing and botanical cuticle oil to leave natural nails nourished.',
    inclusions_ar: [
      'فك وإزالة الجل بلطف دون كشط قاسٍ',
      'تلميع خفيف وترتيب طول الأظافر',
      'ترطيب وتغذية بالزيوت النباتية',
    ],
    inclusions_en: [
      'Gentle wrap-and-soak gel removal without harsh scraping',
      'Light surface buffing and neat shaping',
      'Restorative botanical cuticle oil treatment',
    ],
    precautions_ar: 'مخصصة لإزالة طلاء الجل الناعم (Soak-Off Gel) وليس الأكريليك الصلب.',
    precautions_en: 'Designed for soak-off soft gel polish; please note hard acrylic extensions separately.',
    credentials_required: false,
  },
  {
    id: 'gel-reapplication',
    name_ar: 'إعادة تطبيق الجل',
    name_en: 'Gel Reapplication',
    duration: 75,
    price: 150,
    category: 'gel',
    image: '/assets/images/services/gel-reapplication.webp',
    description_ar:
      'تجديد متكامل يجمع بين الإزالة اللطيفة للجل السابق، تهيئة الظفر الطبيعي، وتطبيق طبقة جل جديدة بلونكِ المفضل.',
    description_en:
      'A seamless refresh combining gentle removal of existing gel, natural nail care, and a fresh cured coat in your chosen shade.',
    inclusions_ar: [
      'إزالة لطيفة للجل القديم والعناية بالظفر',
      'تنسيق الشكل وتنظيف محيط الظفر',
      'تطبيق جل جديد بالكامل وتغذية اليدين',
    ],
    inclusions_en: [
      'Gentle soak-off removal of previous gel polish',
      'Cuticle tidying and fresh nail shaping',
      'Full base, color, and glossy top-coat gel reapplication',
    ],
    precautions_ar: 'مثالية للمحافظة على مظهر متجدد دون الإضرار بصفيحة الظفر.',
    precautions_en: 'Ideal for keeping your gel finish fresh while protecting natural nail integrity.',
    credentials_required: false,
  },
];

export const SEED_PACKAGES = [
  {
    id: 'nail-glow',
    name_ar: 'باقة إشراقة J',
    name_en: 'J Nail Glow',
    service_ids: ['pedicure', 'french-gel'],
    price: 239,
    tagline_ar: 'عناية هادئة لليدين والقدمين بلمسة فرنسية لامعة.',
    tagline_en: 'A polished ritual combining soothing foot care and luminous French gel.',
  },
  {
    id: 'serenity',
    name_ar: 'باقة لحظة هدوء',
    name_en: 'J Serenity',
    service_ids: ['relaxation', 'classic'],
    price: 339,
    tagline_ar: 'توازن مثالي بين استرخاء الجسد وأناقة الأظافر الكلاسيكية.',
    tagline_en: 'A calm pairing of full-body relaxation massage and classic mani-pedi care.',
  },
  {
    id: 'rose-ritual',
    name_ar: 'باقة طقوس الورد',
    name_en: 'J Rose Ritual',
    service_ids: ['hot-stone', 'french-tip'],
    price: 379,
    tagline_ar: 'دفء الأحجار البركانية مع نعومة الأطراف الفرنسية الكلاسيكية.',
    tagline_en: 'Warm basalt stone therapy paired with timeless French-tip grooming.',
  },
  {
    id: 'signature',
    name_ar: 'باقة J المميزة',
    name_en: 'J Signature',
    service_ids: ['therapeutic', 'classic', 'gel-polish'],
    price: 469,
    tagline_ar: 'تجربة J SPA المتكاملة من العناية العميقة إلى اللمسة النهائية.',
    tagline_en: 'Our complete signature home experience from targeted relief to glossy gel.',
  },
];

export function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',verified INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS config(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS services(id TEXT PRIMARY KEY,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS packages(id TEXT PRIMARY KEY,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,reference TEXT UNIQUE NOT NULL,user_id TEXT,scope TEXT NOT NULL,idempotency TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(scope,idempotency));
    CREATE TABLE IF NOT EXISTS verification(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,reference_hash TEXT NOT NULL,expires INTEGER NOT NULL,used INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS recovery(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,token_hash TEXT UNIQUE NOT NULL,expires INTEGER NOT NULL,used INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS ledger(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,booking_id TEXT,points INTEGER NOT NULL,event_key TEXT UNIQUE NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reward_requests(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,booking_id TEXT UNIQUE NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT,action TEXT NOT NULL,target TEXT,detail TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS passport_favorites(user_id TEXT NOT NULL,service_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(user_id,service_id));
    CREATE TABLE IF NOT EXISTS nail_styles(id TEXT PRIMARY KEY,user_id TEXT,share_code TEXT UNIQUE,data TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS passport_prefs(user_id TEXT PRIMARY KEY,data TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS group_requests(id TEXT PRIMARY KEY,reference TEXT UNIQUE NOT NULL,user_id TEXT,data TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS gift_requests(id TEXT PRIMARY KEY,reference TEXT UNIQUE NOT NULL,user_id TEXT,data TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS funnel_events(day TEXT NOT NULL,event TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,event));
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit(created_at);
    CREATE INDEX IF NOT EXISTS idx_nail_styles_user ON nail_styles(user_id);
    CREATE INDEX IF NOT EXISTS idx_group_requests_user ON group_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_gift_requests_user ON gift_requests(user_id);
  `);

  const all = (q, ...args) => db.prepare(q).all(...args);
  const get = (q, ...args) => db.prepare(q).get(...args);
  const run = (q, ...args) => db.prepare(q).run(...args);
  const tx = (fn) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };

  if (!get('SELECT id FROM config')) {
    run('INSERT INTO config VALUES(1,?)', JSON.stringify(DEFAULT_SETTINGS));
  }

  const hasServices = get('SELECT id FROM services LIMIT 1');
  if (!hasServices) {
    for (const s of SEED_SERVICES) {
      run(
        'INSERT INTO services VALUES(?,?)',
        s.id,
        JSON.stringify({
          id: s.id,
          name_ar: s.name_ar,
          name_en: s.name_en,
          duration: s.duration,
          price_cents: s.price * 100,
          category: s.category,
          active: true,
          description_ar: s.description_ar,
          description_en: s.description_en,
          inclusions_ar: s.inclusions_ar,
          inclusions_en: s.inclusions_en,
          precautions_ar: s.precautions_ar,
          precautions_en: s.precautions_en,
          image: s.image,
          credentials_required: s.credentials_required,
          credentials_approved: false,
        }),
      );
    }
  } else {
    // Non-destructive upgrade for existing databases still carrying the initial generic copy or blank images
    for (const seed of SEED_SERVICES) {
      const row = get('SELECT data FROM services WHERE id=?', seed.id);
      if (!row) continue;
      const existing = JSON.parse(row.data);
      let changed = false;
      if (existing.description_ar === OLD_GENERIC_AR) {
        existing.description_ar = seed.description_ar;
        existing.description_en = seed.description_en;
        changed = true;
      }
      if (!existing.inclusions_ar) {
        existing.inclusions_ar = seed.inclusions_ar;
        existing.inclusions_en = seed.inclusions_en;
        changed = true;
      }
      if (!existing.precautions_ar) {
        existing.precautions_ar = seed.precautions_ar;
        existing.precautions_en = seed.precautions_en;
        changed = true;
      }
      if (!existing.image) {
        existing.image = seed.image;
        changed = true;
      }
      if (changed) {
        run('UPDATE services SET data=? WHERE id=?', JSON.stringify(existing), seed.id);
      }
    }
  }

  const hasPackages = get('SELECT id FROM packages LIMIT 1');
  if (!hasPackages) {
    for (const p of SEED_PACKAGES) {
      run(
        'INSERT INTO packages VALUES(?,?)',
        p.id,
        JSON.stringify({
          id: p.id,
          name_ar: p.name_ar,
          name_en: p.name_en,
          service_ids: p.service_ids,
          price_cents: p.price * 100,
          tagline_ar: p.tagline_ar,
          tagline_en: p.tagline_en,
          active: true,
        }),
      );
    }
  } else {
    for (const seed of SEED_PACKAGES) {
      const row = get('SELECT data FROM packages WHERE id=?', seed.id);
      if (!row) continue;
      const existing = JSON.parse(row.data);
      if (!existing.tagline_ar) {
        existing.tagline_ar = seed.tagline_ar;
        existing.tagline_en = seed.tagline_en;
        run('UPDATE packages SET data=? WHERE id=?', JSON.stringify(existing), seed.id);
      }
    }
  }

  return { raw: db, all, get, run, tx, close: () => db.close() };
}

export function createHelpers(db) {
  const settings = () => ({
    ...DEFAULT_SETTINGS,
    ...JSON.parse(db.get('SELECT data FROM config WHERE id=1').data),
  });

  const services = () =>
    db.all('SELECT data FROM services').map((row) => {
      const s = JSON.parse(row.data);
      return { ...s, price: s.price_cents / 100 };
    });

  const packages = () => {
    const allServices = services();
    return db.all('SELECT data FROM packages').map((row) => {
      const p = JSON.parse(row.data);
      const included = allServices.filter((s) => p.service_ids.includes(s.id));
      return {
        ...p,
        price: p.price_cents / 100,
        original_total: included.reduce((sum, s) => sum + s.price, 0),
        duration: included.reduce((sum, s) => sum + s.duration, 0),
      };
    });
  };

  const bookings = () =>
    db.all('SELECT * FROM bookings').map((row) => ({
      ...JSON.parse(row.data),
      id: row.id,
      reference: row.reference,
      user_id: row.user_id,
    }));

  const saveBooking = (b) => {
    db.run('UPDATE bookings SET data=? WHERE id=?', JSON.stringify(b), b.id);
  };

  const balance = (userId) =>
    db.get('SELECT COALESCE(SUM(points),0) AS n FROM ledger WHERE user_id=?', userId).n;

  const audit = (actorUser, action, target, detail = '') => {
    db.run(
      'INSERT INTO audit(actor,action,target,detail,created_at) VALUES(?,?,?,?,?)',
      actorUser?.id || null,
      action,
      target,
      detail,
      now(),
    );
  };

  const recordLedger = (userId, bookingId, points, eventKey, reason) => {
    db.run(
      'INSERT INTO ledger VALUES(?,?,?,?,?,?,?)',
      uid(),
      userId,
      bookingId,
      points,
      eventKey,
      reason,
      now(),
    );
  };

  return {
    settings,
    services,
    packages,
    bookings,
    saveBooking,
    balance,
    audit,
    recordLedger,
  };
}

