import { ROTATING_OFF_PATTERN } from '../../../core/constants/domain.js';
import { getDayDates } from '../../../core/date.js';
import {
  getEffectivePatternWeek,
  calculateEffectiveShiftMode,
  getShiftStrategy
} from '../../scheduling/domain/patterns.js';

/**
 * Pure function: Audits a schedule matrix against demand, rest rules, and ergonomics.
 * Produces an AuditReport DTO without any DOM access.
 *
 * @param {Array<Array<'M'|'T'|'L'>>} matrix
 * @param {string[]} employees
 * @param {import('../../scheduling/domain/entities.js').Demand} demand
 * @param {Object} context
 * @param {string} [context.weekStart]
 * @param {Array<{ name: string, short: string, date: string, fullDate: string }>} [context.dayDates]
 * @param {(empIndex: number) => number} [context.getPatternWeek]
 * @param {(empIndex: number) => string} [context.getShiftMode]
 * @param {string} [context.baseWeek]
 * @param {number[]} [context.savedPatterns]
 * @param {string[]} [context.savedShiftModes]
 * @returns {import('./audit-report.entity.js').AuditReport | null}
 */
export function auditSchedule(matrix, employees, demand, context = {}) {
  if (!matrix || !employees || !demand) return null;

  const n = employees.length;
  const dayDates = context.dayDates || getDayDates(context.weekStart);

  let totalDemandMismatches = 0;
  let totalOffdayMismatches = 0;
  let totalConsecutiveMismatches = 0;
  let totalFatigueIssues = 0;
  let totalMorningIssues = 0;

  // 1. Demand coverage check
  const demandDays = [];
  for (let d = 0; d < 7; d++) {
    let countM = 0;
    let countT = 0;
    for (let e = 0; e < n; e++) {
      if (matrix[e] && matrix[e][d] === 'M') countM++;
      else if (matrix[e] && matrix[e][d] === 'T') countT++;
    }
    const reqM = (demand.morning && demand.morning[d]) || 0;
    const reqT = (demand.afternoon && demand.afternoon[d]) || 0;

    const mOk = countM === reqM;
    const tOk = countT === reqT;
    const minStaffOk = countM >= 2 && countT >= 2;
    const weekendStaffOk = (d < 4) || (countM >= 3 && countT >= 3);
    const ok = mOk && tOk && minStaffOk && weekendStaffOk;

    if (!ok) totalDemandMismatches++;

    let staffNotice = '';
    if (!minStaffOk) staffNotice = ' ⚠️ <2 personal';
    else if (!weekendStaffOk) staffNotice = ' ⚠️ Fin de semana <3';

    const shortName = dayDates[d] ? dayDates[d].short : `Día ${d + 1}`;
    const fullName = dayDates[d] ? dayDates[d].name : `Día ${d + 1}`;

    demandDays.push({
      dayIndex: d,
      short: shortName,
      name: fullName,
      countM,
      reqM,
      countT,
      reqT,
      mOk,
      tOk,
      minStaffOk,
      weekendStaffOk,
      ok,
      text: `${shortName}: M ${countM}/${reqM} · T ${countT}/${reqT}${staffNotice}`,
      title: `${fullName}: Mañana ${countM} asignados de ${reqM} requeridos; Tarde ${countT} asignados de ${reqT} requeridos`,
      staffNotice
    });
  }

  // 2. Offdays & Morning Rules check
  const empStats = [];
  for (let e = 0; e < n; e++) {
    let countL = 0;
    let countM = 0;
    let countT = 0;
    const offDays = [];
    for (let d = 0; d < 7; d++) {
      const s = matrix[e] ? matrix[e][d] : 'L';
      if (s === 'L') {
        countL++;
        offDays.push(d);
      } else if (s === 'M') countM++;
      else if (s === 'T') countT++;
    }
    const isKey = (e === 0);
    const is2Off = countL === 2;
    const isConsecutive = is2Off && ((offDays[1] - offDays[0] === 1) || (offDays[0] === 0 && offDays[1] === 6));

    let pWeek;
    if (typeof context.getPatternWeek === 'function') {
      pWeek = context.getPatternWeek(e);
    } else {
      pWeek = getEffectivePatternWeek({
        empIndex: e,
        baseWeek: context.baseWeek || context.weekStart,
        targetWeek: context.weekStart,
        savedPatterns: context.savedPatterns
      });
    }

    const pItem = ROTATING_OFF_PATTERN[pWeek - 1] || ROTATING_OFF_PATTERN[0];
    const matchesPattern = is2Off && isConsecutive && (offDays[0] === pItem.days[0] && offDays[1] === pItem.days[1]);

    let shiftMode;
    if (typeof context.getShiftMode === 'function') {
      shiftMode = context.getShiftMode(e);
    } else {
      const baseMode = (context.savedShiftModes && context.savedShiftModes[e]) || (e === 0 ? '5M0T' : (e % 2 === 1 ? '3M2T' : '2M3T'));
      shiftMode = calculateEffectiveShiftMode(e, baseMode, 0);
    }

    const strategy = getShiftStrategy(shiftMode);
    const targetM = (e === 0 || shiftMode === '5M0T') ? 5 : strategy.m;
    const targetT = (e === 0 || shiftMode === '5M0T') ? 0 : strategy.t;
    const matchesShiftTarget = (countM === targetM && countT === targetT);

    if (!is2Off) totalOffdayMismatches++;
    if (is2Off && !isConsecutive) totalConsecutiveMismatches++;
    if (isKey && countT > 0) totalMorningIssues++;
    if (countM === 0) totalMorningIssues++;

    let statusClass = (is2Off && isConsecutive && matchesPattern)
      ? 'ok'
      : (!is2Off ? (countL < 2 ? 'err' : 'warn') : 'warn');

    let consecNotice = '';
    if (is2Off && !isConsecutive) {
      consecNotice = ' ⚠️ No seguidos';
    } else if (is2Off && !matchesPattern) {
      consecNotice = ' ℹ️ Modificado';
    }

    empStats.push({
      name: employees[e],
      m: countM,
      t: countT,
      l: countL,
      hours: (countM + countT) * 8,
      isKey,
      isConsecutive,
      pWeek,
      pLabel: pItem.label,
      matchesPattern,
      shiftMode,
      targetM,
      targetT,
      matchesShiftTarget,
      statusClass,
      tagText: `${employees[e]}: ${countL}/2 Libres [Sem.${pWeek}]${consecNotice}`,
      consecNotice
    });
  }

  // 3. Ergonomics check (T -> M transitions)
  const fatigueList = [];
  for (let e = 0; e < n; e++) {
    for (let d = 0; d < 6; d++) {
      if (matrix[e] && matrix[e][d] === 'T' && matrix[e][d + 1] === 'M') {
        const d1Short = dayDates[d] ? dayDates[d].short : `Día ${d + 1}`;
        const d2Short = dayDates[d + 1] ? dayDates[d + 1].short : `Día ${d + 2}`;
        fatigueList.push(`${employees[e]}: ${d1Short} T → ${d2Short} M`);
        totalFatigueIssues++;
      }
    }
  }

  // 4. Global Badge calculation
  let globalBadgeClass;
  let globalBadgeText;

  if (totalDemandMismatches === 0 && totalOffdayMismatches === 0 && totalConsecutiveMismatches === 0 && totalFatigueIssues === 0 && totalMorningIssues === 0) {
    globalBadgeClass = 'badge--success';
    globalBadgeText = 'Balance Óptimo ✅';
  } else if (totalDemandMismatches > 0 || totalOffdayMismatches > 0 || totalConsecutiveMismatches > 0 || totalMorningIssues > 0) {
    globalBadgeClass = 'badge--danger';
    const issues = [];
    if (totalDemandMismatches > 0) issues.push('Demanda');
    if (totalOffdayMismatches > 0) issues.push('Días libres');
    if (totalConsecutiveMismatches > 0) issues.push('Libres no seguidos');
    if (totalMorningIssues > 0) issues.push('Regla de mañanas');
    globalBadgeText = `Ajuste requerido: ${issues.join(' · ')} ⚠️`;
  } else {
    globalBadgeClass = 'badge--warning';
    globalBadgeText = `${totalFatigueIssues} aviso(s) ergonómico(s) T → M ⚠️`;
  }

  return {
    demandDays,
    empStats,
    fatigueList,
    totalDemandMismatches,
    totalOffdayMismatches,
    totalConsecutiveMismatches,
    totalFatigueIssues,
    totalMorningIssues,
    globalBadgeClass,
    globalBadgeText
  };
}
