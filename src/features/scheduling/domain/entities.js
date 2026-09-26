/**
 * @typedef {'M' | 'T' | 'L' | 'V' | 'B'} ShiftType
 */

/**
 * @typedef {ShiftType[][]} WeekMatrix
 * matrix[employeeIndex][dayIndex] = 'M' | 'T' | 'L' | 'V' | 'B'
 */

/**
 * @typedef {Object} Demand
 * @property {number[]} morning - 7 days (0 = Lunes, ..., 6 = Domingo)
 * @property {number[]} afternoon - 7 days (0 = Lunes, ..., 6 = Domingo)
 */

/**
 * @typedef {Object} ShiftTarget
 * @property {number} m - Target morning shifts count
 * @property {number} t - Target afternoon shifts count
 * @property {string} mode - e.g. '5M0T', '3M2T', '2M3T'
 */

/**
 * @typedef {Object} WeekPlan
 * @property {string} weekStr - ISO date string of Monday (YYYY-MM-DD)
 * @property {WeekMatrix} matrix
 * @property {Demand} demand
 */

/**
 * @template T
 * @typedef {Object} Result
 * @property {boolean} success
 * @property {T} [data]
 * @property {WeekMatrix} [matrix]
 * @property {string} [error]
 * @property {number} [failedWeekIndex]
 */

export {};
