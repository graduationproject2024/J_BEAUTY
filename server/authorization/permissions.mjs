import { fail } from '../validation.mjs';

export const CAPABILITIES = [
  'bookings.read',
  'bookings.read_assigned',
  'bookings.confirm',
  'bookings.assign',
  'bookings.update',
  'bookings.update_status_basic',
  'bookings.update_assigned_status',
  'calendar.read',
  'calendar.read_assigned',
  'calendar.manage',
  'customers.read_limited',
  'customers.verify_identity',
  'customers.recovery_token',
  'payments.read',
  'payments.verify',
  'gifts.verify_payment',
  'refunds.request',
  'refunds.approve',
  'loyalty.read',
  'loyalty.redeem',
  'loyalty.adjust',
  'reviews.moderate',
  'occasions.read',
  'occasions.manage',
  'services.manage',
  'packages.manage',
  'settings.manage',
  'staff.manage',
  'audit.read',
  'reports.operational',
  'reports.financial',
];

export const ASSIGNABLE_STAFF_ROLES = [
  'ops_manager',
  'reception',
  'finance',
  'practitioner',
];

export const STAFF_ROLES = [
  'owner',
  ...ASSIGNABLE_STAFF_ROLES,
  'legacy_employee',
];

export const OWNER_ONLY_CAPABILITIES = new Set([
  'refunds.approve',
  'loyalty.adjust',
  'services.manage',
  'packages.manage',
  'settings.manage',
  'staff.manage',
  'audit.read',
]);

// Default-deny capability assignments per role.
// Notice legacy_employee intentionally preserves ONLY safe daily viewing/status workflow without sensitive finance, identity verification, recovery, or moderation access.
export const ROLE_CAPABILITIES = {
  owner: ['*'],
  ops_manager: [
    'bookings.read',
    'bookings.confirm',
    'bookings.assign',
    'bookings.update',
    'calendar.read',
    'calendar.manage',
    'customers.read_limited',
    'customers.verify_identity',
    'customers.recovery_token',
    'occasions.read',
    'occasions.manage',
    'reviews.moderate',
    'reports.operational',
  ],
  reception: [
    'bookings.read',
    'bookings.confirm',
    'bookings.update',
    'calendar.read',
    'customers.read_limited',
    'customers.verify_identity',
    'customers.recovery_token',
    'occasions.read',
    'occasions.manage',
  ],
  finance: [
    'bookings.read',
    'payments.read',
    'payments.verify',
    'gifts.verify_payment',
    'refunds.request',
    'loyalty.read',
    'loyalty.redeem',
    'reports.financial',
  ],
  practitioner: [
    'bookings.read_assigned',
    'bookings.update_assigned_status',
    'calendar.read_assigned',
  ],
  legacy_employee: [
    'bookings.read',
    'bookings.confirm',
    'bookings.update_status_basic',
    'calendar.read',
    'customers.read_limited',
    'occasions.read',
  ],
};

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function resolveUserCapabilities(user) {
  if (!user || !isStaffRole(user.role)) return new Set();
  if (user.role === 'owner') return new Set(CAPABILITIES);

  const base = new Set(ROLE_CAPABILITIES[user.role] || []);
  let overrides = null;
  if (user.permissions_json) {
    try {
      overrides = typeof user.permissions_json === 'string'
        ? JSON.parse(user.permissions_json)
        : user.permissions_json;
    } catch {
      overrides = null;
    }
  }
  if (overrides && Array.isArray(overrides.grant)) {
    for (const c of overrides.grant) {
      if (CAPABILITIES.includes(c) && !OWNER_ONLY_CAPABILITIES.has(c)) {
        base.add(c);
      }
    }
  }
  if (overrides && Array.isArray(overrides.revoke)) {
    for (const c of overrides.revoke) {
      base.delete(c);
    }
  }
  return base;
}

export function hasCapability(user, capability) {
  if (!user || !isStaffRole(user.role)) return false;
  if (user.role === 'owner') return true;
  if (OWNER_ONLY_CAPABILITIES.has(capability)) return false;
  return resolveUserCapabilities(user).has(capability);
}

export function hasAnyCapability(user, capabilities) {
  return capabilities.some((c) => hasCapability(user, c));
}

export function requireCapability(user, capability) {
  if (!user) fail('Please sign in', 401);
  if (!isStaffRole(user.role)) fail('Operations access required', 403);
  if (!hasCapability(user, capability)) {
    fail(`Missing required permission: ${capability}`, 403);
  }
}

