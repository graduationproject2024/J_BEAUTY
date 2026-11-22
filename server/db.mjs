import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyMigrations } from './database/migrations.mjs';
import { hashPassword } from './auth.mjs';
import { phone } from './validation.mjs';

const require = createRequire(import.meta.url);
let DatabaseSync;
try {
  const sqlite = require('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch {
  // Detected on older Node versions
}

export const uid = () => randomUUID();
export const now = () => new Date().toISOString();

export const DEFAULT_SETTINGS = {
  business_phone: '966533718324',
  instagram: 'https://www.instagram.com/j.beautyspa?vrfl=dzIzeGhieXNzY2hh',
  tiktok: 'https://www.tiktok.com/@j_beautyspa?_r=1&_t=ZS-9BGSeUNcuyj',
  snapchat: 'https://snapchat.com/add/j.beautyspa',
  whatsapp: 'https://wa.me/966533718324',
  announcement_text_ar: 'سبا نسائي منزلي فاخر في المدينة المنورة ✦ مواعيد بتأكيد شخصي من فريقنا ✦ خصم 20% على باقات العناية المتكاملة ✦ احجزي جلستك في راحة بيتك',
  announcement_text_en: 'Luxury Women’s Home Spa in Al Madinah ✦ Personally Confirmed Appointments ✦ 20% Off Curated Packages ✦ Book Your Home Sanctuary',
  announcement_active: true,
  announcement_link: '/booking',
  areas: [],
  excluded_areas: [],
  out_of_range_message_ar: 'نعتذر عزيزتي، هذا الحي خارج نطاق التغطية حالياً في المدينة المنورة. يمكنك التواصل معنا عبر واتساب للتنسيق الخاص.',
  out_of_range_message_en: 'Sorry, this neighborhood is currently outside our standard Madinah coverage area. Please contact us on WhatsApp for special arrangements.',
  delivery_fee: 0,
  wheel_enabled: true,
  wheel_cooldown_days: 14,
  wheel_first_visit_only: false,
  wheel_prizes: [
    { id: 'jb5', title_ar: 'خصم 5%', title_en: '5% OFF', desc_ar: 'خصم 5% ترحيبي على جلستك القادمة', desc_en: '5% welcome discount on your next visit', code: 'JB5', discount_type: 'percent', value: 5, color: '#D9B7C0', textColor: '#3E2932' },
    { id: 'jb7', title_ar: 'خصم 7%', title_en: '7% OFF', desc_ar: 'خصم 7% لطيف على خدمات السبا والأظافر', desc_en: '7% off spa & nail rituals', code: 'JB7', discount_type: 'percent', value: 7, color: '#D4AF7C', textColor: '#FFFFFF' },
    { id: 'jbsar10', title_ar: 'خصم 10 ريال', title_en: '10 SAR OFF', desc_ar: 'خصم 10 ريال فوري على حجزك', desc_en: '10 SAR instant savings on your booking', code: 'JBSAR10', discount_type: 'fixed', value: 10, color: '#A7B79F', textColor: '#FFFFFF' },
    { id: 'jb10', title_ar: 'خصم 10%', title_en: '10% OFF', desc_ar: 'الجائزة الكبرى: خصم 10% على الباقات والخدمات', desc_en: 'Grand Prize: 10% off rituals & packages', code: 'JB10', discount_type: 'percent', value: 10, color: '#C9AEB6', textColor: '#3E2932' },
    { id: 'jbsar15', title_ar: 'خصم 15 ريال', title_en: '15 SAR OFF', desc_ar: 'خصم 15 ريال فوري للطلبات فوق 180 ريال', desc_en: '15 SAR off bookings over 180 SAR', code: 'JBSAR15', discount_type: 'fixed', value: 15, color: '#EDE6E1', textColor: '#3E2932' },
    { id: 'jbpetals20', title_ar: '20 بتلة هدية', title_en: '20 Bonus Petals', desc_ar: 'قسيمة تعادل 20 بتلة خصم فوري', desc_en: 'Instant voucher worth 20 Petals', code: 'JBPETALS20', discount_type: 'fixed', value: 10, color: '#D4AF7C', textColor: '#FFFFFF' },
  ],
  commission_threshold: 50,
  commission_rate: 5,
  bank_name: 'مصرف الراجحي',
  bank_account_holder: 'مؤسسة J Beauty Spa',
  bank_iban: 'SA0380000000000000000000',
  capacity: 0,
  working_days: [0, 1, 2, 3, 4, 5, 6],
  opening_time: '09:00',
  closing_time: '22:00',
  blocked_dates: [],
  travel_buffer: 30,
  lead_hours: 12,
  points_per_sar: 1,
  rewards: [
    {
      id: 'petal-200',
      points: 200,
      value: 10,
      name_ar: 'قسيمة خصم ترحيبية (10 ر.س)',
      name_en: 'Welcome Petals Voucher (10 SAR)',
      description_ar: 'تُخصم مباشرة من قيمة جلستك القادمة عند تأكيد الموعد.',
      description_en: 'Deducted directly from your next eligible appointment.',
    },
    {
      id: 'petal-500',
      points: 500,
      value: 30,
      name_ar: 'مكافأة الدلال الفضي (30 ر.س)',
      name_en: 'Silver Indulgence Reward (30 SAR)',
      description_ar: 'خصم مالي يمنحك ترقية أو إضافة خدمة عناية خاصة لموعدك.',
      description_en: 'Special savings to upgrade or add ritual treatments to your visit.',
    },
    {
      id: 'petal-800',
      points: 800,
      value: 60,
      name_ar: 'مكافأة الدلال الذهبي (60 ر.س)',
      name_en: 'Golden Blossom Privilege (60 SAR)',
      description_ar: 'خصم استثنائي تقديراً لولائك وثقتك الدائمة بخدمات J Beauty Spa.',
      description_en: 'Our premier privilege discount honoring your lasting loyalty.',
    },
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

export const BOOKING_ADD_ONS = [
  { id: 'mask-hands', name_ar: 'ماسك ترطيب عميق لليدين', name_en: 'Deep Hydrating Hand Mask', price: 35, duration: 15 },
  { id: 'mask-feet', name_ar: 'ماسك ترطيب وتنعيم القدمين', name_en: 'Soothing Foot Moisture Mask', price: 40, duration: 15 },
  { id: 'extend-massage', name_ar: 'تمديد وقت المساج 15 دقيقة', name_en: '15-Min Massage Extension', price: 50, duration: 15 },
  { id: 'scalp-oils', name_ar: 'مساج فروة الرأس والزيوت العطرية', name_en: 'Aromatherapy Scalp Massage', price: 45, duration: 15 },
  { id: 'heel-peel', name_ar: 'تقشير كعب القدم المركز وتنعيم الحرير', name_en: 'Silk Heel Smoothing Peel', price: 35, duration: 15 },
];

export const DEFAULT_COUPONS = [
  { id: 'coupon-jb5', code: 'JB5', discount_type: 'percent', discount_value: 5, min_spend: 100, valid_from: '2026-01-01', valid_until: '2027-12-31', max_uses: 1000, used_count: 0, active: 1 },
  { id: 'coupon-jb7', code: 'JB7', discount_type: 'percent', discount_value: 7, min_spend: 120, valid_from: '2026-01-01', valid_until: '2027-12-31', max_uses: 1000, used_count: 0, active: 1 },
  { id: 'coupon-jb10', code: 'JB10', discount_type: 'percent', discount_value: 10, min_spend: 180, valid_from: '2026-01-01', valid_until: '2027-12-31', max_uses: 500, used_count: 0, active: 1 },
  { id: 'coupon-jbsar10', code: 'JBSAR10', discount_type: 'fixed', discount_value: 10, min_spend: 100, valid_from: '2026-01-01', valid_until: '2027-12-31', max_uses: 1000, used_count: 0, active: 1 },
  { id: 'coupon-jbsar15', code: 'JBSAR15', discount_type: 'fixed', discount_value: 15, min_spend: 180, valid_from: '2026-01-01', valid_until: '2027-12-31', max_uses: 500, used_count: 0, active: 1 },
  { id: 'coupon-jbpetals20', code: 'JBPETALS20', discount_type: 'fixed', discount_value: 10, min_spend: 100, valid_from: '2026-01-01', valid_until: '2027-12-31', max_uses: 1000, used_count: 0, active: 1 },
  {
    id: 'coupon-wheel10',
    code: 'SPAWHEEL10',
    discount_type: 'percent',
    discount_value: 10,
    min_spend: 100,
    valid_from: '2026-01-01',
    valid_until: '2027-12-31',
    max_uses: 1000,
    used_count: 0,
    active: 1,
  },
  {
    id: 'coupon-luxury15',
    code: 'LUXURY15',
    discount_type: 'percent',
    discount_value: 15,
    min_spend: 200,
    valid_from: '2026-01-01',
    valid_until: '2027-12-31',
    max_uses: 500,
    used_count: 0,
    active: 1,
  },
  {
    id: 'coupon-petal20',
    code: 'PETAL20',
    discount_type: 'fixed',
    discount_value: 20,
    min_spend: 150,
    valid_from: '2026-01-01',
    valid_until: '2027-12-31',
    max_uses: 500,
    used_count: 0,
    active: 1,
  },
  {
    id: 'coupon-freemask',
    code: 'FREEMASK',
    discount_type: 'fixed',
    discount_value: 35,
    min_spend: 150,
    valid_from: '2026-01-01',
    valid_until: '2027-12-31',
    max_uses: 500,
    used_count: 0,
    active: 1,
  },
  {
    id: 'coupon-petals50',
    code: 'PETALS50',
    discount_type: 'fixed',
    discount_value: 25,
    min_spend: 150,
    valid_from: '2026-01-01',
    valid_until: '2027-12-31',
    max_uses: 1000,
    used_count: 0,
    active: 1,
  },
  {
    id: 'coupon-welcome10',
    code: 'WELCOME10',
    discount_type: 'percent',
    discount_value: 10,
    min_spend: 100,
    valid_from: '2026-01-01',
    valid_until: '2027-12-31',
    max_uses: 1000,
    used_count: 0,
    active: 1,
  },
];

const OLD_GENERIC_AR =
  'لحظة عناية هادئة في راحة منزلك. يناقش الفريق التفاصيل والاحتياطات معك قبل تأكيد الموعد.';

export const DEFAULT_SHADES = [
  { id: 'shade-blush', name_ar: 'وردي بتلات ناعم', name_en: 'Soft Blush Petal', hex: '#F3DCE1', finish: 'gloss', sort_order: 1 },
  { id: 'shade-rosegold', name_ar: 'روز جولد ميتاليك', name_en: 'Metallic Rose Gold', hex: '#D4AF7C', finish: 'pearl', sort_order: 2 },
  { id: 'shade-cherry', name_ar: 'كرزي ملكي دافئ', name_en: 'Royal Deep Cherry', hex: '#5E1E2C', finish: 'gloss', sort_order: 3 },
  { id: 'shade-mauve', name_ar: 'موف ناعم كلاسيكي', name_en: 'Classic Mauve Pink', hex: '#C9AEB6', finish: 'gloss', sort_order: 4 },
  { id: 'shade-pearl', name_ar: 'عاجي لؤلؤي فاخر', name_en: 'Luminous Pearl Ivory', hex: '#F8F3ED', finish: 'pearl', sort_order: 5 },
  { id: 'shade-sage', name_ar: 'ميرمية هادئ', name_en: 'Calm Sage Green', hex: '#A7B79F', finish: 'gloss', sort_order: 6 },
  { id: 'shade-dustypink', name_ar: 'وردي مغبر فاخر', name_en: 'Dusty Pink Luxury', hex: '#D9B7C0', finish: 'gloss', sort_order: 7 },
  { id: 'shade-coral', name_ar: 'مرجاني هادئ', name_en: 'Subtle Coral Glow', hex: '#E08E79', finish: 'gloss', sort_order: 8 },
  { id: 'shade-frenchwhite', name_ar: 'أبيض فرنسي ناصع', name_en: 'Pure French White', hex: '#FFFFFF', finish: 'gloss', sort_order: 9 },
];

export const SEED_SERVICES = [
  {
    id: 'relaxation',
    name_ar: 'مساج الاسترخاء',
    name_en: 'Relaxation Massage',
    duration: 60,
    price: 180,
    category: 'massage',
    image: '/assets/images/services/relaxation.webp',
    description_ar:
      'جلسة تدليك هادئة بضغط لطيف إلى متوسط باستخدام زيوت نباتية دافئة لتخفيف التوتر واستعادة صفاء الذهن في هدوء منزلك.',
    description_en:
      'A soothing full-body massage with light-to-medium pressure and warm botanical oils to release everyday tension and restore calm at home.',
    inclusions_ar: [
      'جلسة 60 دقيقة بتقنيات انسيابية مريحة',
      'زيوت عطرية نباتية مختارة حسب راحتك',
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
    name_ar: 'مساج علاجي عميق',
    name_en: 'Therapeutic Massage',
    duration: 60,
    price: 220,
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
    price: 230,
    category: 'massage',
    image: '/assets/images/services/hot-stone.webp',
    description_ar:
      'تجربة استرخاء دافئة تعتمد على أحجار البازلت الملساء المسخنة بعناية لتتغلغل حرارتها اللطيفة في العضلات وتمنحك سكينة عميقة.',
    description_en:
      'A deeply comforting treatment pairing smoothly polished heated basalt stones with slow massage strokes to melt away stiffness.',
    inclusions_ar: [
      'تسخين مضبوط لأحجار البازلت الطبيعية الملساء',
      'تدليك انسيابي بالزيت الدافئ والأحجار',
      'عناية دقيقة باختبار حرارة الأحجار لراحتك',
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
    price: 199,
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
    id: 'foot',
    name_ar: 'مساج القدمين',
    name_en: 'Reflexology Foot Massage',
    duration: 30,
    price: 70,
    category: 'massage',
    image: '/assets/images/services/pedicure.webp',
    description_ar:
      'تدليك مركز لنقاط الضغط الانعكاسية في باطن القدمين والساقين لتخفيف ثقل المشي اليومي وتنشيط الدورة الدموية.',
    description_en:
      'Focused pressure-point reflexology massage across the feet and calves to relieve daily fatigue and promote circulation.',
    inclusions_ar: [
      'كمادات دافئة لتليين العضلات',
      'تدليك انعكاسي احترافي للقدمين والساقين',
      'مرطب نباتي مغذٍ للبشرة الجافة',
    ],
    inclusions_en: [
      'Warm soothing compress for muscles',
      'Targeted foot and calf reflexology',
      'Hydrating botanical balm application',
    ],
    precautions_ar: 'يرجى إبلاغ المختصة بوجود أي كسور أو دوالي حادة.',
    precautions_en: 'Please inform staff of any recent fractures or acute vascular concerns.',
    credentials_required: false,
  },
  {
    id: 'head',
    name_ar: 'مساج الرأس وفروة الرأس',
    name_en: 'Head & Scalp Massage',
    duration: 30,
    price: 65,
    category: 'massage',
    image: '/assets/images/services/relaxation.webp',
    description_ar:
      'تدليك استرخائي لفروة الرأس والصدغين والرقبة يعزز تدفق الدورة الدموية ويزيل الصداع والإجهاد الذهني المتراكم.',
    description_en:
      'A deeply restorative scalp, temple, and nape massage to dissolve mental fatigue and encourage blissful stillness.',
    inclusions_ar: [
      'حركات دائرية هادئة على منابت الشعر ومسارات الاسترخاء',
      'تدليك مهدئ للصدغين ومؤخرة الرأس',
      'خيار إضافة قطرات الزيت العطري المنعش',
    ],
    inclusions_en: [
      'Gentle circular rhythmic scalp motions',
      'Soothing temple and occipital pressure points',
      'Optional aromatic essential oil drops',
    ],
    precautions_ar: 'لا ينصح به لمن تعاني من جروح أو التهابات نشطة في فروة الرأس.',
    precautions_en: 'Not recommended over active scalp irritations or open wounds.',
    credentials_required: false,
  },
  {
    id: 'neck-shoulder',
    name_ar: 'مساج الرقبة والأكتاف',
    name_en: 'Neck & Shoulder Massage',
    duration: 30,
    price: 70,
    category: 'massage',
    image: '/assets/images/services/therapeutic.webp',
    description_ar:
      'جلسة مركزة ومكثفة لفك عقد الشد العضلي الناتجة عن الجلوس المكتبي أو استخدام الهاتف والأجهزة الذكية.',
    description_en:
      'Targeted intensive relief for cervical and trapezius stiffness caused by screen time and daily posture.',
    inclusions_ar: [
      'فك تشنجات عضلات الترابيزيوس وأعلى الظهر',
      'حركات إطالة خفيفة لمدى حركة الرقبة',
      'استخدام بلسم دافئ مريح للأنسجة',
    ],
    inclusions_en: [
      'Targeted trapezius and shoulder blade knot release',
      'Gentle passive cervical stretching',
      'Warm soothing balm application',
    ],
    precautions_ar: 'يُرجى إبلاغ المختصة بأي انزلاق غضروفي أو آلام حادة.',
    precautions_en: 'Please notify us of any herniated discs or acute neurological pain.',
    credentials_required: false,
  },
  {
    id: 'back',
    name_ar: 'مساج الظهر المركز',
    name_en: 'Focused Back Massage',
    duration: 30,
    price: 99,
    category: 'massage',
    image: '/assets/images/services/therapeutic.webp',
    description_ar:
      'عناية مستهدفة لكامل مساحة الظهر من الفقرات القطنية إلى أعلى الكتفين لإزالة التصلب وإعادة الحيوية للجسم.',
    description_en:
      'Dedicated back therapy from the lumbar spine to upper shoulders to dissolve chronic tension and restore mobility.',
    inclusions_ar: [
      'ضغط متوسط إلى عميق حسب درجة التحمل',
      'تركيز خاص على أسفل الظهر وجانبي العمود الفقري',
      'زيت تدليك دافئ مهدئ للأعصاب',
    ],
    inclusions_en: [
      'Customized medium-to-firm back pressure',
      'Lumbar and paraspinal muscle soothing strokes',
      'Warm calming botanical oil',
    ],
    precautions_ar: 'غير مناسب للحوامل في الأشهر الأولى دون استشارة طبية.',
    precautions_en: 'Consult a physician during early pregnancy prior to deep back pressure.',
    credentials_required: false,
  },
  {
    id: 'classic',
    name_ar: 'بدكير ومناكير كلاسيك',
    name_en: 'Classic Manicure & Pedicure',
    duration: 60,
    price: 159,
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
    name_ar: 'بدكير كلاسيك',
    name_en: 'Classic Pedicure',
    duration: 45,
    price: 99,
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
    id: 'manicure',
    name_ar: 'مناكير كلاسيك',
    name_en: 'Classic Manicure',
    duration: 35,
    price: 80,
    category: 'nails',
    image: '/assets/images/services/classic.webp',
    description_ar:
      'عناية مخصصة لليدين تشمل تهيئة الأظافر، إزالة الزوائد الجلدية بلطف، ترطيب حريري، وتطبيق لون طلاء كلاسيكي.',
    description_en:
      'Dedicated hand grooming including warm nail prep, gentle cuticle care, silky hydration, and classic nail polish.',
    inclusions_ar: [
      'نقع دافئ لليدين وتنعيم الجلد المحيط بالظفر',
      'برد وتنسيق طول وشكل الأظافر بتناسق',
      'تدليك خفيف لليدين بطبقة مرطبة',
    ],
    inclusions_en: [
      'Warm botanical hand soak and gentle cuticle softening',
      'Precision nail filing and shaping',
      'Light hand massage with velvety moisturizer',
    ],
    precautions_ar: 'يرجى إعطاء وقت جفاف كافٍ بعد الجلسة.',
    precautions_en: 'Allow adequate natural drying time following lacquer application.',
    credentials_required: false,
  },
  {
    id: 'french-tip',
    name_ar: 'فرنش أطراف الأظافر',
    name_en: 'French Polish Tips',
    duration: 20,
    price: 39,
    category: 'nails',
    image: '/assets/images/services/french-tip.webp',
    description_ar:
      'إضافة لمسة الفرنش الكلاسيكية الناعمة على أطراف أظافر اليدين بلون عاجي ناصع أو وردي رقيق.',
    description_en:
      'Delicate micro-French tip application with crisp ivory or sheer pink tips over natural or manicured nails.',
    inclusions_ar: [
      'رسم خط ابتسامة دقيق متناسق لكل ظفر',
      'طبقة حماية نهائية فائقة اللمعان',
      'تثبيت سريع',
    ],
    inclusions_en: [
      'Precision free-edge smile lines',
      'High-gloss protective top coat',
      'Quick-setting drops',
    ],
    precautions_ar: 'خدمة إضافة تصميم لأطراف الأظافر وتتطلب أظافر مهيأة مسبقاً.',
    precautions_en: 'Nail art add-on service; requires clean prepped nail plates.',
    credentials_required: false,
  },
  {
    id: 'french-hands-feet',
    name_ar: 'فرنش يدين وقدمين',
    name_en: 'French Hands & Feet',
    duration: 30,
    price: 65,
    category: 'nails',
    image: '/assets/images/services/french-tip.webp',
    description_ar:
      'تنسيق فرنش متكامل وأنيق لأطراف أظافر اليدين والقدمين معاً لإطلالة أنثوية موحدة وفائقة الرقي.',
    description_en:
      'Harmonious French polish styling for both hands and feet for a timeless and elegant matching aesthetic.',
    inclusions_ar: [
      'رسم فرنش كلاسيكي متناسق لأظافر اليدين',
      'رسم فرنش متقن لأظافر القدمين',
      'طبقة حماية لامعة تدوم طويلاً',
    ],
    inclusions_en: [
      'Matching French tips for hand nails',
      'Neat French tips for toenails',
      'Durable high-gloss clear coat seal',
    ],
    precautions_ar: 'تتطلب وقتاً قصيراً لتجفيف الطلاء.',
    precautions_en: 'Requires a brief resting time for optimal polish curing.',
    credentials_required: false,
  },
  {
    id: 'polish-color',
    name_ar: 'لون مناكير كلاسيك',
    name_en: 'Classic Polish Color',
    duration: 15,
    price: 20,
    category: 'nails',
    image: '/assets/images/services/french-polish.webp',
    description_ar:
      'تلوين سريع للأظافر بلونك المفضل من مجموعتنا الفاخرة لتجديد الإطلالة بأسرع وقت.',
    description_en:
      'Quick polish change in your chosen shade from our curated salon palette to refresh your hands instantly.',
    inclusions_ar: [
      'طبقة أساس لحماية الظفر الطبيعي',
      'طبقتان من اللون المختار لعمق وغنى اللمعة',
      'طبقة توب كوت واقية سريعة الجفاف',
    ],
    inclusions_en: [
      'Protective clear base coat',
      'Two rich lacquer color coats',
      'Fast-dry high-shine seal',
    ],
    precautions_ar: 'خدمة طلاء سريع لا تشمل إزالة طلاء سابق أو جل.',
    precautions_en: 'Express polish application; excludes soak or gel removal.',
    credentials_required: false,
  },
  {
    id: 'gel-polish',
    name_ar: 'طلاء جل',
    name_en: 'Gel Polish',
    duration: 45,
    price: 110,
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
    name_ar: 'فرنش جل',
    name_en: 'French Gel',
    duration: 50,
    price: 130,
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
    id: 'gel-removal',
    name_ar: 'إزالة طلاء الجل',
    name_en: 'Gel Removal',
    duration: 30,
    price: 60,
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
];

export const SEED_PACKAGES = [
  {
    id: 'luxury-experience',
    name_ar: 'باقة التجربة الفاخرة',
    name_en: 'The Luxury Experience',
    service_ids: ['hot-stone', 'classic'],
    price: 349,
    tagline_ar: 'مساج الأحجار الساخنة 60 دقيقة + بدكير ومناكير كلاسيك (توفير 40 ر.س).',
    tagline_en: 'Hot stone therapy (60m) paired with classic manicure & pedicure (save 40 SAR).',
  },
  {
    id: 'integrated-care',
    name_ar: 'باقة العناية المتكاملة',
    name_en: 'Complete Care Package',
    service_ids: ['classic', 'french-tip', 'neck-shoulder'],
    price: 239,
    tagline_ar: 'بدكير ومناكير كلاسيك + فرنش أطراف الأظافر + مساج رقبة وأكتاف 30 دقيقة.',
    tagline_en: 'Classic mani-pedi + French tips + 30m neck & shoulder tension relief.',
  },
  {
    id: 'relaxation-pamper',
    name_ar: 'باقة الاسترخاء والدلال',
    name_en: 'Relaxation & Pampering',
    service_ids: ['therapeutic', 'classic'],
    price: 339,
    tagline_ar: 'مساج علاجي عميق 60 دقيقة + بدكير ومناكير كلاسيك في هدوء منزلك.',
    tagline_en: 'Deep tissue therapy (60m) combined with complete classic mani-pedi care.',
  },
  {
    id: 'nail-care',
    name_ar: 'باقة العناية بالأظافر',
    name_en: 'Signature Nail Care',
    service_ids: ['classic', 'french-gel'],
    price: 259,
    tagline_ar: 'بدكير ومناكير كلاسيك متكامل + فرنش جل زجاجي اللمعان وفائق الثبات.',
    tagline_en: 'Full classic manicure and pedicure elevated with chip-free French gel.',
  },
];

export function openDatabase(dbPath) {
  if (!DatabaseSync) {
    throw new Error(
      `Node.js 22.5.0 or higher is required for built-in SQLite (current version: ${process.version}). Please configure Node 22.x or 24.x in your hosting environment settings.`
    );
  }

  let resolvedPath = dbPath;
  if (dbPath !== ':memory:') {
    try {
      resolvedPath = path.resolve(dbPath);
      mkdirSync(path.dirname(resolvedPath), { recursive: true });
    } catch {
      resolvedPath = path.join(os.tmpdir(), 'jspa.sqlite');
      try {
        mkdirSync(path.dirname(resolvedPath), { recursive: true });
      } catch {
        resolvedPath = ':memory:';
      }
    }
  }

  let db;
  try {
    db = new DatabaseSync(resolvedPath);
    db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  } catch {
    try {
      db = new DatabaseSync(resolvedPath);
      db.exec('PRAGMA journal_mode=MEMORY; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    } catch {
      db = new DatabaseSync(':memory:');
      db.exec('PRAGMA foreign_keys=ON;');
    }
  }
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
    CREATE TABLE IF NOT EXISTS coupons(id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, discount_type TEXT NOT NULL DEFAULT 'percent', discount_value REAL NOT NULL, min_spend REAL DEFAULT 0, valid_from TEXT, valid_until TEXT, max_uses INTEGER DEFAULT 0, used_count INTEGER DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS nail_shades(id TEXT PRIMARY KEY, name_ar TEXT NOT NULL, name_en TEXT NOT NULL, hex TEXT NOT NULL, finish TEXT DEFAULT 'gloss', active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS staff_commissions(id TEXT PRIMARY KEY, staff_id TEXT NOT NULL, month TEXT NOT NULL, visits_count INTEGER DEFAULT 0, threshold INTEGER DEFAULT 50, commission_rate REAL DEFAULT 0.05, commission_amount REAL DEFAULT 0, updated_at TEXT NOT NULL, UNIQUE(staff_id, month));
    CREATE TABLE IF NOT EXISTS referrals(id TEXT PRIMARY KEY, referrer_id TEXT NOT NULL, code TEXT UNIQUE NOT NULL, invitee_id TEXT, booking_id TEXT, status TEXT NOT NULL DEFAULT 'pending', bonus_petals INTEGER DEFAULT 50, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS coupon_redemptions(id TEXT PRIMARY KEY, coupon_id TEXT NOT NULL, coupon_code TEXT NOT NULL, user_id TEXT, phone TEXT NOT NULL, booking_id TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS payment_receipts(id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, reference TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, data_url TEXT NOT NULL, sender_name TEXT, transfer_ref TEXT, uploaded_by TEXT, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_payment_receipts_booking ON payment_receipts(booking_id);
    CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_phone ON coupon_redemptions(phone, coupon_code);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit(created_at);
    CREATE INDEX IF NOT EXISTS idx_nail_styles_user ON nail_styles(user_id);
    CREATE INDEX IF NOT EXISTS idx_group_requests_user ON group_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_gift_requests_user ON gift_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
  `);

  applyMigrations(db);

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

  for (const c of DEFAULT_COUPONS) {
    run(
      'INSERT OR IGNORE INTO coupons(id, code, discount_type, discount_value, min_spend, valid_from, valid_until, max_uses, used_count, active, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      c.id,
      c.code,
      c.discount_type,
      c.discount_value,
      c.min_spend,
      c.valid_from,
      c.valid_until,
      c.max_uses,
      c.used_count,
      c.active,
      now(),
    );
  }

  const hasShades = get('SELECT id FROM nail_shades LIMIT 1');
  if (!hasShades) {
    for (const s of DEFAULT_SHADES) {
      run(
        'INSERT OR IGNORE INTO nail_shades(id, name_ar, name_en, hex, finish, active, sort_order, created_at) VALUES(?,?,?,?,?,?,?,?)',
        s.id,
        s.name_ar,
        s.name_en,
        s.hex,
        s.finish,
        1,
        s.sort_order,
        now(),
      );
    }
  }

  for (const s of SEED_SERVICES) {
    const row = get('SELECT data FROM services WHERE id=?', s.id);
    if (!row) {
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
    } else {
      const existing = JSON.parse(row.data);
      let changed = false;
      if (existing.price_cents !== s.price * 100) {
        existing.price_cents = s.price * 100;
        changed = true;
      }
      if (existing.name_ar !== s.name_ar) {
        existing.name_ar = s.name_ar;
        changed = true;
      }
      if (existing.duration !== s.duration) {
        existing.duration = s.duration;
        changed = true;
      }
      if (existing.description_ar === OLD_GENERIC_AR) {
        existing.description_ar = s.description_ar;
        existing.description_en = s.description_en;
        changed = true;
      }
      if (!existing.inclusions_ar) {
        existing.inclusions_ar = s.inclusions_ar;
        existing.inclusions_en = s.inclusions_en;
        changed = true;
      }
      if (!existing.precautions_ar) {
        existing.precautions_ar = s.precautions_ar;
        existing.precautions_en = s.precautions_en;
        changed = true;
      }
      if (changed) {
        run('UPDATE services SET data=? WHERE id=?', JSON.stringify(existing), s.id);
      }
    }
  }

  for (const p of SEED_PACKAGES) {
    const row = get('SELECT data FROM packages WHERE id=?', p.id);
    if (!row) {
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
    } else {
      const existing = JSON.parse(row.data);
      let changed = false;
      if (existing.price_cents !== p.price * 100) {
        existing.price_cents = p.price * 100;
        changed = true;
      }
      if (existing.name_ar !== p.name_ar) {
        existing.name_ar = p.name_ar;
        changed = true;
      }
      if (JSON.stringify(existing.service_ids) !== JSON.stringify(p.service_ids)) {
        existing.service_ids = p.service_ids;
        changed = true;
      }
      if (existing.tagline_ar !== p.tagline_ar) {
        existing.tagline_ar = p.tagline_ar;
        existing.tagline_en = p.tagline_en;
        changed = true;
      }
      if (changed) {
        run('UPDATE packages SET data=? WHERE id=?', JSON.stringify(existing), p.id);
      }
    }
  }

  const hasOwner = get("SELECT id FROM users WHERE role='owner' LIMIT 1");
  if (!hasOwner) {
    try {
      const defaultOwnerPhone = process.env.OWNER_PHONE ? phone(process.env.OWNER_PHONE) : '966500000001';
      const defaultOwnerName = process.env.OWNER_NAME || 'إدارة J Beauty';
      const defaultOwnerPassword = process.env.OWNER_PASSWORD || 'JBeauty@Admin2026!';
      run(
        'INSERT OR IGNORE INTO users(id,name,phone,password,role,verified,created_at) VALUES(?,?,?,?,?,?,?)',
        uid(),
        defaultOwnerName,
        defaultOwnerPhone,
        hashPassword(defaultOwnerPassword),
        'owner',
        1,
        now(),
      );
    } catch (err) {
      console.warn('Initial owner bootstrap skipped:', err.message);
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
    db.all('SELECT * FROM bookings').map((row) => {
      const parsed = JSON.parse(row.data);
      return {
        ...parsed,
        id: row.id,
        reference: row.reference,
        user_id: row.user_id,
        assigned_staff_id: row.assigned_staff_id ?? parsed.assigned_staff_id ?? null,
      };
    });

  const saveBooking = (b) => {
    db.run(
      'UPDATE bookings SET data=?, assigned_staff_id=? WHERE id=?',
      JSON.stringify(b),
      b.assigned_staff_id || null,
      b.id,
    );
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
    nailShades: () => db.all('SELECT * FROM nail_shades ORDER BY sort_order ASC, created_at DESC'),
  };
}

