import { Scheduler } from '../domain/scheduler.js';
import {
  getEffectivePatternWeeks,
  getEffectiveShiftTargets
} from '../domain/patterns.js';
import {
  getMonday,
  formatDate
} from '../../../core/date.js';

/**
 * Use Case: Generates multi-week schedules with two-phase commit (dry-run & commit).
 * Pure application logic without DOM or direct UI dependencies.
 */
export class GenerateSchedulesUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('./ports.js').ScheduleRepository} dependencies.scheduleRepo
   * @param {import('./ports.js').DemandRepository} dependencies.demandRepo
   * @param {import('./ports.js').SettingsRepository} dependencies.settingsRepo
   * @param {Object} [dependencies.scheduler]
   */
  constructor({ scheduleRepo, demandRepo, settingsRepo, scheduler = Scheduler }) {
    this.scheduleRepo = scheduleRepo;
    this.demandRepo = demandRepo;
    this.settingsRepo = settingsRepo;
    this.scheduler = scheduler;
  }

  /**
   * Executes schedule generation across N weeks.
   *
   * @param {Object} params
   * @param {string} params.startWeek - Monday of the first week (YYYY-MM-DD)
   * @param {number} params.weeksCount - Number of weeks to generate (>= 1)
   * @param {string[]} params.employees - List of employee names
   * @param {(weekStr: string) => import('../domain/entities.js').Demand} params.getDemandForWeek
   * @returns {import('../domain/entities.js').Result<{ weeks: string[], firstWeekMatrix: import('../domain/entities.js').WeekMatrix, weekPlans: import('../domain/entities.js').WeekPlan[] }>}
   */
  execute({ startWeek, weeksCount, employees, getDemandForWeek }) {
    if (!startWeek) {
      return { success: false, error: 'Debe especificar la semana de inicio.' };
    }
    if (!employees || employees.length === 0) {
      return { success: false, error: 'Debe especificar al menos un empleado.' };
    }

    const count = employees.length;
    const baseWeek = this.settingsRepo.loadBaseWeek() || startWeek;
    const savedPatterns = this.settingsRepo.loadPatterns() || undefined;
    const savedShiftModes = this.settingsRepo.loadShiftModes() || undefined;

    const weekPlans = [];

    // PASS 1: Dry run (calculate and validate all weeks in memory)
    for (let w = 0; w < weeksCount; w++) {
      const monday = getMonday(startWeek);
      if (!monday) {
        return { success: false, error: `Fecha de inicio inválida: ${startWeek}` };
      }
      monday.setDate(monday.getDate() + (w * 7));
      const currentWeekStr = formatDate(monday);

      const patternWeeks = getEffectivePatternWeeks({
        count,
        baseWeek,
        targetWeek: currentWeekStr,
        savedPatterns
      });

      const shiftTargets = getEffectiveShiftTargets({
        count,
        baseWeek,
        targetWeek: currentWeekStr,
        savedShiftModes
      });

      const weekDemand = getDemandForWeek(currentWeekStr);
      if (!weekDemand) {
        return {
          success: false,
          error: `No se encontró demanda para la semana ${w + 1} (${currentWeekStr}).`,
          failedWeekIndex: w
        };
      }

      const result = this.scheduler.generate(employees, weekDemand, {
        patternWeeks,
        shiftTargets
      });

      if (!result.success) {
        return {
          success: false,
          error: `Error en semana ${w + 1} (${currentWeekStr}): ${result.error}`,
          failedWeekIndex: w
        };
      }

      weekPlans.push({
        weekStr: currentWeekStr,
        matrix: result.matrix,
        demand: weekDemand
      });
    }

    // PASS 2: Commit (persist only after all weeks succeeded)
    const generatedWeeks = [];
    for (const plan of weekPlans) {
      this.scheduleRepo.save(plan.weekStr, plan.matrix);
      this.demandRepo.saveDemandForWeek(plan.weekStr, plan.demand);
      generatedWeeks.push(plan.weekStr);
    }

    this.scheduleRepo.saveGeneratedWeeks(generatedWeeks);
    if (!this.settingsRepo.loadBaseWeek()) {
      this.settingsRepo.saveBaseWeek(startWeek);
    }
    this.settingsRepo.saveWeeksCount(weeksCount);

    return {
      success: true,
      data: {
        weeks: generatedWeeks,
        firstWeekMatrix: weekPlans[0].matrix,
        weekPlans
      }
    };
  }
}
