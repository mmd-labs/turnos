import { auditSchedule } from './features/audit/domain/audit-schedule.js';
import { renderAuditView } from './features/audit/presentation/audit-view.js';
import { getDayDates } from './core/date.js';
import { getEffectivePatternWeek, calculateEffectiveShiftMode } from './features/scheduling/domain/patterns.js';
import { Storage } from './storage.js';
import { DEFAULT_EMPLOYEE_SHIFT_MODES } from './core/constants/domain.js';

/**
 * Auditor Coordinator.
 * Bridges computation and presentation without importing Renderer (cycle broken).
 */
export const Auditor = {
  run(matrix, employees, demand, weekStart) {
    if (!matrix || !employees || !demand) return;

    const baseWeek = Storage.loadBaseWeek() || weekStart;
    const savedPatterns = Storage.loadPatterns();
    const config = Storage.loadConfig();
    const savedShiftModes = config?.shiftModes;

    const dayDates = getDayDates(weekStart);

    const report = auditSchedule(matrix, employees, demand, {
      weekStart,
      dayDates,
      getPatternWeek: (e) => getEffectivePatternWeek({
        empIndex: e,
        baseWeek,
        targetWeek: weekStart,
        savedPatterns
      }),
      getShiftMode: (e) => {
        const baseMode = (savedShiftModes && savedShiftModes[e]) || DEFAULT_EMPLOYEE_SHIFT_MODES[e];
        return calculateEffectiveShiftMode(e, baseMode, 0);
      }
    });

    if (report) {
      renderAuditView(report);
    }
  }
};
