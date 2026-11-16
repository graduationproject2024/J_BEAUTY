import { esc, makeI18n, monogramSvg, riyadhToday } from '/shared/format.js';

export { esc, monogramSvg, riyadhToday };

export const opsState = {
  lang: localStorage.getItem('jb_ops_lang') === 'en' ? 'en' : 'ar',
  user: null,
  csrf: '',
  mfa: { required: false, enabled: false, verified: false, setup_required: false, mode: 'optional' },
  customerOrigin: '',
  dashboard: null,
  tab: 'overview',
  bookingSearch: '',
  bookingStatus: '',
  bookingsPage: 1,
  ledgerPage: 1,
  auditPage: 1,
  calendarDate: riyadhToday(),
  calendarView: 'week',
  expandedBookingId: null,
  selectedStaffId: null,
  mfaSetupData: null,
  lastRecovery: null,
  drawerOpen: false,
};

export const $ops = (sel) => document.querySelector(sel);

const i18n = makeI18n(() => opsState.lang);
export const { t, nameOf, descOf, num, money, minutes } = i18n;

export function roleLabel(role) {
  const labels = {
    owner: t('المالكة', 'Owner'),
    ops_manager: t('مديرة العمليات', 'Ops Manager'),
    reception: t('الاستقبال والتنسيق', 'Reception'),
    finance: t('المالية', 'Finance'),
    practitioner: t('أخصائية الخدمة', 'Practitioner'),
    legacy_employee: t('موظفة (صلاحية مقيّدة)', 'Legacy Staff (Restricted)'),
    disabled_employee: t('حساب معطّل', 'Disabled'),
  };
  return labels[role] || role;
}

export function statusBadge(status) {
  const map = {
    pending_confirmation: [t('بانتظار التأكيد', 'Pending confirmation'), 'pending'],
    confirmed: [t('مؤكد', 'Confirmed'), 'confirmed'],
    in_progress: [t('قيد التنفيذ', 'In progress'), 'confirmed'],
    completed: [t('مكتمل', 'Completed'), 'completed'],
    cancelled: [t('ملغى', 'Cancelled'), 'cancelled'],
    no_show: [t('عدم حضور', 'No show'), 'cancelled'],
    pending: [t('قيد المراجعة', 'Pending'), 'pending'],
    approved: [t('معتمد', 'Approved'), 'confirmed'],
    rejected: [t('مرفوض', 'Rejected'), 'cancelled'],
    fulfilled: [t('مُطبّق', 'Fulfilled'), 'completed'],
    pending_approval: [t('بانتظار الموافقة', 'Pending approval'), 'pending'],
    pending_staff_payment: [t('بانتظار الدفع', 'Pending payment'), 'pending'],
    approved_ready: [t('جاهز للإهداء', 'Approved ready'), 'confirmed'],
    redeemed: [t('مستخدم', 'Redeemed'), 'completed'],
  };
  const [label, cls] = map[status] || [status || '-', ''];
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

export function can(capability) {
  const caps = opsState.user?.capabilities;
  if (!Array.isArray(caps)) return false;
  return caps.includes('*') || caps.includes(capability);
}

export function canAny(...list) {
  return list.some((c) => can(c));
}

export function opsToast(msg) {
  const el = $ops('#ops-toast');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.style.display = 'none';
  }, 2400);
}

export async function opsApi(path, body) {
  const res = await fetch('/api/ops' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers:
      body === undefined
        ? {}
        : { 'Content-Type': 'application/json', 'X-CSRF-Token': opsState.csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || t('تعذر تنفيذ العملية', 'Request failed'));
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function refreshOpsSession() {
  const r = await opsApi('/session');
  opsState.user = r.user;
  opsState.csrf = r.csrfToken;
  opsState.mfa = r.mfa || { required: false, enabled: false, verified: false, setup_required: false };
  opsState.customerOrigin = r.customerOrigin || '';
  return r;
}

export async function loadDashboard() {
  const params = new URLSearchParams({
    q: opsState.bookingSearch || '',
    status: opsState.bookingStatus || '',
    bookings_page: String(opsState.bookingsPage || 1),
    bookings_limit: '25',
    ledger_page: String(opsState.ledgerPage || 1),
    audit_page: String(opsState.auditPage || 1),
  });
  opsState.dashboard = await opsApi(`/dashboard?${params.toString()}`);
  return opsState.dashboard;
}

export const ALL_STAFF_CAPABILITIES = [
  ['bookings.read', 'عرض جميع الحجوزات', 'View all bookings'],
  ['bookings.read_assigned', 'عرض المواعيد المسندة', 'View assigned bookings'],
  ['bookings.confirm', 'تأكيد المواعيد', 'Confirm bookings'],
  ['bookings.assign', 'تعيين الأخصائيات', 'Assign practitioners'],
  ['bookings.update', 'تعديل الحجوزات الكامل', 'Full booking updates'],
  ['bookings.update_status_basic', 'تحديث الحالة الأساسي', 'Basic status updates'],
  ['bookings.update_assigned_status', 'تحديث المواعيد المسندة', 'Update assigned booking status'],
  ['calendar.read', 'عرض التقويم العام', 'View schedule calendar'],
  ['calendar.read_assigned', 'عرض تقويم الأخصائية', 'View assigned calendar'],
  ['calendar.manage', 'حظر التواريخ وإدارة السعة', 'Manage calendar & blocked dates'],
  ['customers.read_limited', 'عرض دليل العميلات المقيد', 'View masked customer directory'],
  ['customers.verify_identity', 'توثيق ملكية جوال العميلة', 'Verify customer phone ownership'],
  ['customers.recovery_token', 'إصدار روابط استعادة الحساب', 'Issue recovery reset links'],
  ['payments.read', 'الاطلاع على المدفوعات', 'Read payment records'],
  ['payments.verify', 'توثيق استلام المدفوعات', 'Verify booking payments'],
  ['gifts.verify_payment', 'توثيق مدفوعات الإهداءات', 'Verify gift payments'],
  ['refunds.request', 'رفع طلب استرداد مالي', 'Request customer refunds'],
  ['loyalty.read', 'الاطلاع على سجل بتلات J', 'Read loyalty ledger'],
  ['loyalty.redeem', 'اعتماد أو إلغاء مكافآت بتلات J', 'Commit/cancel reward requests'],
  ['reviews.moderate', 'مراجعة ونشر التقييمات', 'Moderate customer reviews'],
  ['occasions.read', 'عرض طلبات المناسبات', 'View occasion requests'],
  ['occasions.manage', 'اعتماد/إلغاء طلبات المناسبات والهدايا', 'Manage occasions & gifts'],
  ['reports.operational', 'التقارير التشغيلية', 'Operational metrics'],
  ['reports.financial', 'التقارير المالية', 'Financial metrics'],
];

export const ASSIGNABLE_ROLE_LIST = [
  ['ops_manager', 'مديرة العمليات', 'Operations Manager'],
  ['reception', 'الاستقبال والتنسيق', 'Reception Desk'],
  ['finance', 'المالية والمكافآت', 'Finance & Loyalty'],
  ['practitioner', 'أخصائية الخدمة', 'Service Practitioner'],
];
