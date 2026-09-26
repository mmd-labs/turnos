import { DAYS, DAYS_FULL } from './constants/domain.js';

/**
 * Gets the Monday of the week for a given Date or ISO date string (YYYY-MM-DD).
 * @param {Date|string|null|undefined} dateOrStr
 * @returns {Date|null}
 */
export function getMonday(dateOrStr) {
  if (!dateOrStr) return null;
  let d;
  if (typeof dateOrStr === 'string') {
    const parts = dateOrStr.split('-');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dateOrStr);
    }
  } else {
    d = new Date(dateOrStr);
  }

  if (isNaN(d.getTime())) return null;

  const day = d.getDay();
  // 0 is Sunday (-6 days to previous Monday), 1 is Monday (0), 2 is Tuesday (-1), etc.
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Normalizes any date string to the Monday of that week in YYYY-MM-DD format.
 * @param {string} dateStr
 * @returns {string}
 */
export function normalizeToMonday(dateStr) {
  if (!dateStr) return '';
  const monday = getMonday(dateStr);
  return monday ? formatDate(monday) : '';
}

/**
 * Formats a date string to a human-readable Spanish representation.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDateLong(dateStr) {
  const monday = getMonday(dateStr);
  if (!monday) return '';
  return monday.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Calculates the difference in weeks between two date strings (date2 - date1).
 * @param {string} dateStr1
 * @param {string} dateStr2
 * @returns {number}
 */
export function getWeeksDiff(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return 0;
  const m1 = getMonday(dateStr1);
  const m2 = getMonday(dateStr2);
  if (!m1 || !m2) return 0;
  const utc1 = Date.UTC(m1.getFullYear(), m1.getMonth(), m1.getDate());
  const utc2 = Date.UTC(m2.getFullYear(), m2.getMonth(), m2.getDate());
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((utc2 - utc1) / msPerWeek);
}

/**
 * Returns an array with metadata for all 7 days of the week starting at weekStartStr.
 * @param {string} [weekStartStr]
 * @returns {Array<{ name: string, short: string, date: string, fullDate: string }>}
 */
export function getDayDates(weekStartStr) {
  const base = weekStartStr ? getMonday(weekStartStr) : getMonday(new Date());
  if (!base) return [];
  const dates = [];
  for (let d = 0; d < 7; d++) {
    const cur = new Date(base);
    cur.setDate(base.getDate() + d);
    const dayNum = String(cur.getDate()).padStart(2, '0');
    const monthNum = String(cur.getMonth() + 1).padStart(2, '0');
    dates.push({
      name: DAYS_FULL[d],
      short: DAYS[d],
      date: `${dayNum}/${monthNum}`,
      fullDate: `${dayNum}/${monthNum}/${cur.getFullYear()}`,
    });
  }
  return dates;
}

/**
 * Calculates the next Monday from a given date.
 * @param {Date} [fromDate=new Date()]
 * @returns {Date}
 */
export function getNextMonday(fromDate = new Date()) {
  const dayOfWeek = fromDate.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
  const nextMonday = new Date(fromDate);
  nextMonday.setDate(fromDate.getDate() + daysUntilMonday);
  return nextMonday;
}
