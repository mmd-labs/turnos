import {
  DEFAULT_EMPLOYEE_PATTERNS,
  DEFAULT_EMPLOYEE_SHIFT_MODES,
  ROTATING_OFF_PATTERN
} from '../../../core/constants/domain.js';
import { getWeeksDiff } from '../../../core/date.js';

/**
 * Strategy Registry for shift modes (OCP - Open/Closed Principle).
 * New modes can be added without modifying the scheduler engine.
 * @type {Record<string, { mode: string, m: number, t: number, label: string, tagClass: string }>}
 */
export const SHIFT_MODE_STRATEGIES = {
  '5M0T': {
    mode: '5M0T',
    m: 5,
    t: 0,
    label: 'Solo Mañana (5M / 0T)',
    tagClass: 'emp-shifts-badge--morning',
  },
  '3M2T': {
    mode: '3M2T',
    m: 3,
    t: 2,
    label: '3 Mañanas + 2 Tardes',
    tagClass: 'emp-shifts-badge--3m2t',
  },
  '2M3T': {
    mode: '2M3T',
    m: 2,
    t: 3,
    label: '2 Mañanas + 3 Tardes',
    tagClass: 'emp-shifts-badge--2m3t',
  },
};

/**
 * Gets the shift configuration strategy for a given mode.
 * Falls back to 2M3T if not recognized.
 * @param {string} mode
 * @returns {{ mode: string, m: number, t: number, label: string, tagClass: string }}
 */
export function getShiftStrategy(mode) {
  return SHIFT_MODE_STRATEGIES[mode] || SHIFT_MODE_STRATEGIES['2M3T'];
}

/**
 * Calculates effective pattern week number (1..7) given base pattern and weeks offset.
 * Pure mod-7 algebra.
 * @param {number} basePattern (1..7)
 * @param {number} diffWeeks
 * @returns {number} (1..7)
 */
export function calculatePatternWeek(basePattern, diffWeeks) {
  return (((basePattern - 1 + diffWeeks) % 7) + 7) % 7 + 1;
}

/**
 * Reverses effective pattern week to calculate base pattern week given weeks offset.
 * @param {number} effectiveWeek (1..7)
 * @param {number} diffWeeks
 * @returns {number} (1..7)
 */
export function calculateBasePattern(effectiveWeek, diffWeeks) {
  return (((effectiveWeek - 1 - diffWeeks) % 7) + 7) % 7 + 1;
}

/**
 * Calculates effective shift mode for an employee given base mode, weeks offset, and employee index.
 * Emp 0 is key employee (fixed to 5M0T).
 * Other employees alternate 3M2T and 2M3T on odd week differences.
 * @param {number} empIndex
 * @param {string} baseMode
 * @param {number} diffWeeks
 * @returns {string}
 */
export function calculateEffectiveShiftMode(empIndex, baseMode, diffWeeks) {
  if (empIndex === 0) return '5M0T';

  let normalizedBase = baseMode || (empIndex % 2 === 1 ? '3M2T' : '2M3T');
  if (normalizedBase === '5M0T' && empIndex > 0) {
    normalizedBase = empIndex % 2 === 1 ? '3M2T' : '2M3T';
  }

  if (Math.abs(diffWeeks) % 2 === 0) {
    return normalizedBase;
  }
  return normalizedBase === '3M2T' ? '2M3T' : '3M2T';
}

/**
 * Pure calculation of effective pattern week for an employee.
 * @param {Object} params
 * @param {number} params.empIndex
 * @param {string} params.baseWeek
 * @param {string} params.targetWeek
 * @param {number[]} [params.savedPatterns]
 * @returns {number} (1..7)
 */
export function getEffectivePatternWeek({ empIndex, baseWeek, targetWeek, savedPatterns }) {
  const basePattern = (savedPatterns && savedPatterns[empIndex] !== undefined)
    ? savedPatterns[empIndex]
    : (DEFAULT_EMPLOYEE_PATTERNS[empIndex] ?? ((empIndex % 7) + 1));

  if (!baseWeek || !targetWeek) return basePattern;
  const diffWeeks = getWeeksDiff(baseWeek, targetWeek);
  return calculatePatternWeek(basePattern, diffWeeks);
}

/**
 * Pure calculation of effective pattern weeks for all employees.
 * @param {Object} params
 * @param {number} params.count
 * @param {string} params.baseWeek
 * @param {string} params.targetWeek
 * @param {number[]} [params.savedPatterns]
 * @returns {number[]}
 */
export function getEffectivePatternWeeks({ count, baseWeek, targetWeek, savedPatterns }) {
  const weeks = [];
  for (let i = 0; i < count; i++) {
    weeks.push(getEffectivePatternWeek({ empIndex: i, baseWeek, targetWeek, savedPatterns }));
  }
  return weeks;
}

/**
 * Pure calculation of effective shift targets for all employees.
 * @param {Object} params
 * @param {number} params.count
 * @param {string} params.baseWeek
 * @param {string} params.targetWeek
 * @param {string[]} [params.savedShiftModes]
 * @returns {Array<{ m: number, t: number, mode: string }>}
 */
export function getEffectiveShiftTargets({ count, baseWeek, targetWeek, savedShiftModes }) {
  const diffWeeks = (baseWeek && targetWeek) ? getWeeksDiff(baseWeek, targetWeek) : 0;
  const targets = [];

  for (let i = 0; i < count; i++) {
    const baseMode = (savedShiftModes && savedShiftModes[i]) || DEFAULT_EMPLOYEE_SHIFT_MODES[i];
    const mode = calculateEffectiveShiftMode(i, baseMode, diffWeeks);
    const strategy = getShiftStrategy(mode);
    targets.push({ m: strategy.m, t: strategy.t, mode });
  }

  return targets;
}
