import { URL } from 'node:url';

export function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

export function text(value, max = 300) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    fail('Invalid text');
  }
  return value.trim();
}

export function optionalText(value, max = 300) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.length > max) fail('Invalid text');
  return value.trim();
}

export function phone(value) {
  const cleaned = String(value || '').replace(/[\s+-]/g, '').replace(/^00/, '');
  const normalized = cleaned.startsWith('05') ? '966' + cleaned.slice(1) : cleaned;
  if (!/^9665\d{8}$/.test(normalized)) {
    fail('Enter a valid Saudi mobile number');
  }
  return normalized;
}

export function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 6) return '****';
  return `${digits.slice(0, 4)}****${digits.slice(-2)}`;
}

export function money(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000) {
    fail('Invalid amount');
  }
  return Math.round(value * 100);
}

export function safeImageUrl(value) {
  if (!value) return '';
  if (typeof value !== 'string' || value.length > 500) fail('Invalid image URL');
  if (!/^(\/[^/\\]|https:\/\/)/.test(value) || value.includes('..')) {
    fail('Invalid image URL');
  }
  return value;
}

export function safeSocialUrl(value, kind) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    const allowed =
      kind === 'instagram'
        ? ['instagram.com', 'www.instagram.com']
        : ['tiktok.com', 'www.tiktok.com'];
    if (parsed.protocol !== 'https:' || !allowed.includes(parsed.hostname)) {
      fail('Use the official social profile URL');
    }
    return parsed.toString();
  } catch {
    fail('Invalid social URL');
  }
}

export function whatsappUrl(settings, message) {
  if (!settings.business_phone) return null;
  return `https://wa.me/${phone(settings.business_phone)}?text=${encodeURIComponent(message)}`;
}

