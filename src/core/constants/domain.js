export const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const MIN_EMPLOYEES = 8;
export const DEFAULT_EMPLOYEES = 8;
export const DAYS_OFF_PER_EMPLOYEE = 2;

export const DEFAULT_EMPLOYEE_NAMES = [
  'Mar', 'Clary', 'Estrella', 'Lidia', 'Melody', 'Ashley', 'Idaira', 'Scarleth',
];

export const ROTATING_OFF_PATTERN = [
  { week: 1, days: [0, 1], label: 'Lun - Mar' },
  { week: 2, days: [1, 2], label: 'Mar - Mié' },
  { week: 3, days: [2, 3], label: 'Mié - Jue' },
  { week: 4, days: [3, 4], label: 'Jue - Vie' },
  { week: 5, days: [4, 5], label: 'Vie - Sáb' },
  { week: 6, days: [5, 6], label: 'Sáb - Dom' },
  { week: 7, days: [6, 0], label: 'Dom - Lun' },
];

export const DEFAULT_EMPLOYEE_PATTERNS = [6, 1, 2, 3, 4, 5, 3, 7];

export const DEFAULT_EMPLOYEE_SHIFT_MODES = [
  '5M0T', '3M2T', '2M3T', '2M3T', '2M3T', '2M3T', '3M2T', '2M3T',
];

export const CONSECUTIVE_PAIRS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0],
];
