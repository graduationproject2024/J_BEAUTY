/**
 * J BEAUTY — Madinah Neighborhood Travel & Buffer Engine
 * Zero paid APIs — Autonomous deterministic clustering for Al Madinah Al Munawwarah.
 */

export const MADINAH_SECTORS = {
  CENTRAL_NORTH: {
    id: 'central_north',
    name_ar: 'وسط وشمال المدينة',
    neighborhoods: [
      'سلطانة',
      'العقيق',
      'القبلتين',
      'بئر عثمان',
      'سيد الشهداء',
      'العيون',
      'النصر',
      'الفتح',
      'الأزهري',
      'الازهري',
      'الخالدية',
      'المصانع',
      'السيح',
      'البيداء',
      'الراية',
    ],
  },
  WEST: {
    id: 'west',
    name_ar: 'غرب المدينة',
    neighborhoods: [
      'العزيزية',
      'الدفاع',
      'الجامعة',
      'السلام',
      'الدعيثة',
      'الملك فهد',
      'التلال',
      'الجابرة',
      'وعيرة',
      'العاقول الغربي',
    ],
  },
  SOUTH: {
    id: 'south',
    name_ar: 'جنوب المدينة',
    neighborhoods: [
      'شوران',
      'قباء',
      'الرانوناء',
      'الهجرة',
      'الحديقة',
      'القصواء',
      'عروة',
      'جبل عير',
      'الجمعة',
      'العصبة',
      'الربوة',
    ],
  },
  EAST: {
    id: 'east',
    name_ar: 'شرق المدينة',
    neighborhoods: [
      'باقدو',
      'الحزام',
      'العريض',
      'المبعوث',
      'الخاتم',
      'الإسكان',
      'الاسكان',
      'الملك عبد العزيز',
      'الملك عبدالعزيز',
      'طريق المطار',
      'المطار',
      'المذينين',
      'الصادقية',
    ],
  },
};

// Travel time matrix in minutes between sectors in Al Madinah
const SECTOR_TRAVEL_MINUTES = {
  central_north: { central_north: 12, west: 20, south: 22, east: 20 },
  west: { central_north: 20, west: 12, south: 25, east: 35 },
  south: { central_north: 22, west: 25, south: 12, east: 25 },
  east: { central_north: 20, west: 35, south: 25, east: 12 },
};

export function normalizeNeighborhood(raw) {
  if (!raw) return '';
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/^حي\s+/, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');
}

export function getSectorForNeighborhood(neighborhood) {
  const norm = normalizeNeighborhood(neighborhood);
  if (!norm) return null;

  for (const [key, sector] of Object.entries(MADINAH_SECTORS)) {
    for (const n of sector.neighborhoods) {
      const nNorm = normalizeNeighborhood(n);
      if (norm === nNorm || norm.includes(nNorm) || nNorm.includes(norm)) {
        return sector.id;
      }
    }
  }
  return null;
}

/**
 * Calculates required operational travel + arrival prep buffer (in minutes).
 * @param {object} settings - Application settings
 * @param {string} fromNeighborhood - Origin neighborhood (or null for hub start)
 * @param {string} toNeighborhood - Destination neighborhood
 * @returns {number} Buffer in minutes (e.g. 25–50 min)
 */
export function calculateTravelBuffer(settings, fromNeighborhood, toNeighborhood) {
  const basePrepBuffer = 15; // 15 mins for setup & sanitization at destination home
  const defaultBuffer = Number(settings?.travel_buffer || 30);

  if (!fromNeighborhood || !toNeighborhood) {
    return Math.max(defaultBuffer, basePrepBuffer);
  }

  const normFrom = normalizeNeighborhood(fromNeighborhood);
  const normTo = normalizeNeighborhood(toNeighborhood);

  // Same neighborhood: ~10 min drive + 15 min setup = 25 min buffer
  if (normFrom === normTo) {
    return Math.max(25, defaultBuffer);
  }

  const secFrom = getSectorForNeighborhood(normFrom);
  const secTo = getSectorForNeighborhood(normTo);

  if (secFrom && secTo) {
    const transit = SECTOR_TRAVEL_MINUTES[secFrom]?.[secTo] || 25;
    return Math.max(transit + basePrepBuffer, defaultBuffer);
  }

  // Fallback when neighborhood is unmapped
  return Math.max(defaultBuffer + 10, 35);
}
