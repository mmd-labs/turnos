/**
 * Presentation Facade / Compatibility Shim for Renderer.
 * Delegates to specialized view components:
 * - ScheduleView
 * - EmployeeNamesView
 * - DemandView
 * - WeekNavView
 */

import {
  DEFAULT_EMPLOYEES,
  DEFAULT_EMPLOYEE_PATTERNS,
  DEFAULT_EMPLOYEE_SHIFT_MODES,
  ROTATING_OFF_PATTERN,
} from './core/constants/domain.js';
import { Storage } from './storage.js';
import { Toast } from './toast.js';
import { Auditor } from './auditor.js';
import {
  getMonday,
  normalizeToMonday,
  formatDate,
  formatDateLong,
  getWeeksDiff,
  getDayDates,
  getNextMonday,
} from './core/date.js';
import { escapeHtml } from './core/html.js';
import { clampDemandValue } from './features/scheduling/domain/rules/demand.js';
import {
  getEffectivePatternWeek,
  getEffectivePatternWeeks,
  getEffectiveShiftTargets,
  calculateEffectiveShiftMode,
  calculateBasePattern,
} from './features/scheduling/domain/patterns.js';
import { navigationService } from './core/infrastructure/navigation.service.js';
import { scheduleView } from './features/scheduling/presentation/schedule-view.js';
import { employeeNamesView } from './features/settings/presentation/employee-names-view.js';
import { demandView } from './features/settings/presentation/demand-view.js';
import { weekNavView } from './features/settings/presentation/week-nav-view.js';

export const Renderer = {
  get configPanel() { return scheduleView.configPanel; },
  set configPanel(val) { scheduleView.configPanel = val; },

  get schedulePanel() { return scheduleView.schedulePanel; },
  set schedulePanel(val) { scheduleView.schedulePanel = val; },

  get weekStartInput() { return weekNavView.weekStartInput; },
  set weekStartInput(val) { weekNavView.weekStartInput = val; },

  get employeeCountInput() {
    return /** @type {HTMLInputElement|null} */ (document.getElementById('employee-count'));
  },

  get employeeNamesContainer() { return employeeNamesView.container; },
  set employeeNamesContainer(val) { employeeNamesView.container = val; },

  get scheduleBody() { return scheduleView.scheduleBody; },
  set scheduleBody(val) { scheduleView.scheduleBody = val; },

  get pdfContainer() { return scheduleView.pdfContainer; },
  set pdfContainer(val) { scheduleView.pdfContainer = val; },

  get currentMatrix() { return scheduleView.currentMatrix; },
  set currentMatrix(val) { scheduleView.currentMatrix = val; },

  get currentEmployees() { return scheduleView.currentEmployees; },
  set currentEmployees(val) { scheduleView.currentEmployees = val; },

  get currentWeekStart() { return scheduleView.currentWeekStart; },
  set currentWeekStart(val) { scheduleView.currentWeekStart = val; },

  get activeDemandWeekIndex() { return demandView.activeDemandWeekIndex; },
  set activeDemandWeekIndex(val) { demandView.activeDemandWeekIndex = val; },

  get activeDemandWeekStr() { return demandView.activeDemandWeekStr; },
  set activeDemandWeekStr(val) { demandView.activeDemandWeekStr = val; },

  init() {
    scheduleView.init();
    employeeNamesView.init();
    demandView.init();
    weekNavView.init();
  },

  showConfig() {
    scheduleView.showConfig();
  },

  showSchedule() {
    scheduleView.showSchedule();
  },

  setDefaultWeekStart() {
    weekNavView.setDefaultWeekStart();
  },

  _getWeeksDiff(dateStr1, dateStr2) {
    return getWeeksDiff(dateStr1, dateStr2);
  },

  getEffectivePatternWeek(empIndex, weekStartStr) {
    const baseWeek = Storage.loadBaseWeek() || (this.weekStartInput ? this.weekStartInput.value : '');
    const savedPatterns = Storage.loadPatterns();
    return getEffectivePatternWeek({ empIndex, baseWeek, targetWeek: weekStartStr, savedPatterns });
  },

  getEffectivePatternWeeks(weekStartStr) {
    const count = parseInt(this.employeeCountInput ? this.employeeCountInput.value : String(DEFAULT_EMPLOYEES)) || DEFAULT_EMPLOYEES;
    const baseWeek = Storage.loadBaseWeek() || (this.weekStartInput ? this.weekStartInput.value : '');
    const savedPatterns = Storage.loadPatterns();
    return getEffectivePatternWeeks({ count, baseWeek, targetWeek: weekStartStr, savedPatterns });
  },

  setEmployeePatternForWeek(empIndex, effectiveWeek, weekStartStr) {
    const baseWeek = Storage.loadBaseWeek() || weekStartStr || (this.weekStartInput ? this.weekStartInput.value : '');
    if (!Storage.loadBaseWeek() && baseWeek) {
      Storage.saveBaseWeek(baseWeek);
    }
    const currentPatterns = Storage.loadPatterns() || [...DEFAULT_EMPLOYEE_PATTERNS];
    while (currentPatterns.length <= empIndex) {
      currentPatterns.push(((currentPatterns.length % 7) + 1));
    }
    const diffWeeks = this._getWeeksDiff(baseWeek, weekStartStr);
    const newBasePattern = calculateBasePattern(effectiveWeek, diffWeeks);
    currentPatterns[empIndex] = newBasePattern;
    Storage.savePatterns(currentPatterns);
  },

  getEffectiveShiftMode(empIndex, weekStartStr) {
    const baseWeek = Storage.loadBaseWeek() || (this.weekStartInput ? this.weekStartInput.value : '');
    const savedShiftModes = Storage.loadConfig()?.shiftModes;
    const baseMode = (savedShiftModes && savedShiftModes[empIndex]) || DEFAULT_EMPLOYEE_SHIFT_MODES[empIndex];
    const diffWeeks = (baseWeek && weekStartStr) ? this._getWeeksDiff(baseWeek, weekStartStr) : 0;
    return calculateEffectiveShiftMode(empIndex, baseMode, diffWeeks);
  },

  getEffectiveShiftTargets(weekStartStr) {
    const count = parseInt(this.employeeCountInput ? this.employeeCountInput.value : String(DEFAULT_EMPLOYEES)) || DEFAULT_EMPLOYEES;
    const baseWeek = Storage.loadBaseWeek() || (this.weekStartInput ? this.weekStartInput.value : '');
    const savedShiftModes = Storage.loadConfig()?.shiftModes;
    return getEffectiveShiftTargets({ count, baseWeek, targetWeek: weekStartStr, savedShiftModes });
  },

  renderGeneratedWeeksNav(weeks, currentWeek) {
    weekNavView.renderGeneratedWeeksNav(weeks, currentWeek, (targetWeek) => {
      navigationService.navigateToWeek(targetWeek);
    });
  },

  updateShiftBadges() {
    const weekStart = this.weekStartInput ? this.weekStartInput.value : '';
    const baseWeek = Storage.loadBaseWeek() || weekStart;
    const savedShiftModes = Storage.loadConfig()?.shiftModes;
    employeeNamesView.updateShiftBadges({ weekStart, baseWeek, savedShiftModes });
  },

  updatePatternSelects() {
    const weekStart = this.weekStartInput ? this.weekStartInput.value : '';
    const baseWeek = Storage.loadBaseWeek() || weekStart;
    const savedPatterns = Storage.loadPatterns();
    employeeNamesView.updatePatternSelects({ weekStart, baseWeek, savedPatterns });
    this.updateShiftBadges();
  },

  renderEmployeeNames(count, savedNames) {
    const weekStart = this.weekStartInput ? this.weekStartInput.value : '';
    const baseWeek = Storage.loadBaseWeek() || weekStart;
    const savedPatterns = Storage.loadPatterns();
    const savedShiftModes = Storage.loadConfig()?.shiftModes;

    employeeNamesView.render({
      count,
      savedNames,
      weekStart,
      baseWeek,
      savedPatterns,
      savedShiftModes,
      onPatternChange: ({ empIndex, patternWeek, label }) => {
        this.setEmployeePatternForWeek(empIndex, patternWeek, weekStart);
        const empName = this.getEmployeeNames()[empIndex] || `Empleado ${empIndex + 1}`;
        Toast.show(`Patrón de ${empName}: Semana ${patternWeek} (${label})`, 'info', 2500);
      },
    });
  },

  getEmployeeNames() {
    return employeeNamesView.getEmployeeNames();
  },

  loadDemandConfig(demand) {
    demandView.loadDemandConfig(demand);
  },

  getDemandConfig() {
    return demandView.getDemandConfig();
  },

  getActiveDemandWeekStr() {
    return demandView.getActiveDemandWeekStr(this.weekStartInput ? this.weekStartInput.value : '');
  },

  getDemandForWeek(weekStr) {
    if (!weekStr) return this.getDemandConfig();
    if (this.activeDemandWeekStr === weekStr) {
      return this.getDemandConfig();
    }
    const saved = Storage.loadDemandForWeek(weekStr);
    if (saved) return saved;
    const baseDemand = Storage.loadDemand();
    if (baseDemand) return baseDemand;
    return this.getDemandConfig();
  },

  renderDemandWeeksNav() {
    const weeksCountSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('weeks-count'));
    const weeksCount = parseInt(weeksCountSelect ? weeksCountSelect.value : '1') || 1;
    const startWeek = this.weekStartInput ? this.weekStartInput.value : '';

    demandView.renderDemandWeeksNav({
      weeksCount,
      startWeek,
      onSelectWeek: ({ targetIndex, targetWeek }) => {
        if (this.activeDemandWeekStr) {
          Storage.saveDemandForWeek(this.activeDemandWeekStr, this.getDemandConfig());
        }
        demandView.updateActivePill(targetIndex, targetWeek);
        const targetDemand = Storage.loadDemandForWeek(targetWeek) || this.getDemandConfig();
        this.loadDemandConfig(targetDemand);
      },
    });
  },

  renderSchedule(matrix, employees, weekStart) {
    const weekStartFinal = weekStart || (this.weekStartInput ? this.weekStartInput.value : '');
    scheduleView.renderSchedule({
      matrix,
      employees,
      weekStart: weekStartFinal,
      onShiftChange: () => {
        Storage.saveSchedule(weekStartFinal, matrix);
        this.renderSchedule(matrix, employees, weekStartFinal);
        this.renderPDF(matrix, employees, weekStartFinal);
        Toast.show('Turno actualizado y balance recalculado.', 'info', 2000);
      },
    });

    // Update Live Audit
    const weekDemand = Storage.loadDemandForWeek(weekStartFinal) || this.getDemandForWeek(weekStartFinal);
    Auditor.run(matrix, employees, weekDemand, weekStartFinal);

    // Update multi-week nav pills
    const genWeeks = Storage.loadGeneratedWeeks();
    if (genWeeks && genWeeks.length > 1) {
      this.renderGeneratedWeeksNav(genWeeks, weekStartFinal);
    }
  },

  getScheduleFromDOM() {
    return scheduleView.getScheduleFromDOM();
  },

  renderSingleWeekHTML(matrix, employees, weekStart) {
    const start = weekStart || (this.weekStartInput ? this.weekStartInput.value : '');
    return scheduleView.renderSingleWeekHTML(matrix, employees, start);
  },

  renderMultiWeekPDF(weeksData) {
    scheduleView.renderMultiWeekPDF(weeksData);
  },

  renderPDF(matrix, employees, weekStart) {
    scheduleView.renderPDF(matrix, employees, weekStart);
  },

  getMonday(dateOrStr) {
    return getMonday(dateOrStr);
  },

  normalizeToMonday(dateStr) {
    return normalizeToMonday(dateStr);
  },

  _getDayDates(weekStartStr) {
    return getDayDates(weekStartStr);
  },

  _escapeHtml(str) {
    return escapeHtml(str);
  },

  _formatDate(date) {
    return formatDate(date);
  },

  _formatDateLong(dateStr) {
    return formatDateLong(dateStr);
  },
};
