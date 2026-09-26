import {
  DEFAULT_EMPLOYEES,
  DEFAULT_EMPLOYEE_NAMES,
  DEFAULT_EMPLOYEE_PATTERNS,
  DEFAULT_EMPLOYEE_SHIFT_MODES,
  MIN_EMPLOYEES,
} from '../../../core/constants/domain.js';
import {
  getMonday,
  normalizeToMonday,
  formatDate,
  formatDateLong,
  getDayDates,
  getWeeksDiff,
} from '../../../core/date.js';
import { clampDemandValue } from '../../scheduling/domain/rules/demand.js';
import {
  getEffectivePatternWeek,
  getEffectivePatternWeeks,
  getEffectiveShiftTargets,
  calculateEffectiveShiftMode,
  calculateBasePattern,
} from '../../scheduling/domain/patterns.js';
import { Toast } from '../../../toast.js';
import { Storage } from '../../../storage.js';
import { navigationService } from '../../../core/infrastructure/navigation.service.js';

export class SettingsController {
  /**
   * @param {Object} params
   * @param {import('./employee-names-view.js').EmployeeNamesView} params.employeeNamesView
   * @param {import('./demand-view.js').DemandView} params.demandView
   * @param {import('./week-nav-view.js').WeekNavView} params.weekNavView
   * @param {import('../../scheduling/presentation/schedule-view.js').ScheduleView} params.scheduleView
   * @param {(matrix: string[][], employees: string[], weekStart: string) => void} [params.onDisplaySchedule]
   */
  constructor({
    employeeNamesView,
    demandView,
    weekNavView,
    scheduleView,
    onDisplaySchedule = undefined,
  }) {
    this.employeeNamesView = employeeNamesView;
    this.demandView = demandView;
    this.weekNavView = weekNavView;
    this.scheduleView = scheduleView;
    this.onDisplaySchedule = onDisplaySchedule;

    this.state = {
      /** @type {string[]} */
      employeeNames: [],
      /** @type {string} */
      weekStart: '',
    };
  }

  init() {
    this.employeeNamesView.init();
    this.demandView.init();
    this.weekNavView.init();
    this._bindEvents();

    navigationService.onNavigate((weekStr) => this.navigateToWeek(weekStr));
  }

  loadSavedState() {
    const names = Storage.loadNames();
    const isOldGeneric = Array.isArray(names) && names.every((n, i) => n === `Empleado ${i + 1}`);
    if (Array.isArray(names) && names.length > 0 && !isOldGeneric) {
      this.state.employeeNames = names;
    } else {
      this.state.employeeNames = [...DEFAULT_EMPLOYEE_NAMES];
      Storage.saveNames(this.state.employeeNames);
    }
    const config = Storage.loadConfig();
    if (config) {
      this.state.weekStart = config.weekStart;
    }
  }

  enterApp() {
    this.scheduleView.showConfig();
    this.loadSavedState();
    this.weekNavView.setDefaultWeekStart();
    if (this.state.weekStart) {
      this.weekNavView.setWeekStart(this.state.weekStart);
    }

    const currentWeekStart = this.weekNavView.getWeekStart();
    const baseWeek = Storage.loadBaseWeek() || currentWeekStart;
    const savedPatterns = Storage.loadPatterns();
    const savedShiftModes = Storage.loadConfig()?.shiftModes;

    this.employeeNamesView.render({
      count: this.state.employeeNames.length || DEFAULT_EMPLOYEES,
      savedNames: this.state.employeeNames,
      weekStart: currentWeekStart,
      baseWeek,
      savedPatterns,
      savedShiftModes,
      onPatternChange: ({ empIndex, patternWeek, label }) => {
        this.setEmployeePatternForWeek(empIndex, patternWeek, currentWeekStart);
        const empName = this.getEmployeeNames()[empIndex] || `Empleado ${empIndex + 1}`;
        Toast.show(`Patrón de ${empName}: Semana ${patternWeek} (${label})`, 'info', 2500);
      },
    });

    const config = Storage.loadConfig();
    if (config) {
      this.demandView.loadDemandConfig(config.demand);
      const employeeCountInput = /** @type {HTMLInputElement|null} */ (document.getElementById('employee-count'));
      if (config.employeeCount && employeeCountInput) {
        employeeCountInput.value = String(config.employeeCount);
        if (!this.state.employeeNames.length) {
          this.employeeNamesView.render({
            count: config.employeeCount,
            savedNames: null,
            weekStart: currentWeekStart,
            baseWeek,
            savedPatterns,
            savedShiftModes,
          });
        }
      }
    }

    const savedWeeksCount = Storage.loadWeeksCount();
    if (savedWeeksCount) {
      this.weekNavView.setWeeksCount(savedWeeksCount);
    }

    this.weekNavView.updateWeekBadge(this.weekNavView.getWeekStart());
    this.renderDemandWeeksNav();
  }

  saveState() {
    const names = this.getEmployeeNames();
    this.state.employeeNames = names;
    Storage.saveNames(names);

    const demand = this.demandView.getDemandConfig();
    const employeeCountInput = /** @type {HTMLInputElement|null} */ (document.getElementById('employee-count'));
    const employeeCount = parseInt(employeeCountInput?.value || String(DEFAULT_EMPLOYEES));
    const weekStart = this.weekNavView.getWeekStart();

    const config = {
      weekStart,
      employeeCount,
      demand,
    };
    this.state.weekStart = weekStart;
    Storage.saveConfig(config);

    const activeDemandWeekStr = this.getActiveDemandWeekStr();
    if (activeDemandWeekStr) {
      Storage.saveDemandForWeek(activeDemandWeekStr, demand);
    }
  }

  /**
   * @returns {string[]}
   */
  getEmployeeNames() {
    return this.employeeNamesView.getEmployeeNames();
  }

  /**
   * @returns {string}
   */
  getActiveDemandWeekStr() {
    return this.demandView.getActiveDemandWeekStr(this.weekNavView.getWeekStart());
  }

  /**
   * @param {string} weekStr
   * @returns {import('../../scheduling/domain/entities.js').WeeklyDemand}
   */
  getDemandForWeek(weekStr) {
    if (!weekStr) return this.demandView.getDemandConfig();
    if (this.demandView.activeDemandWeekStr === weekStr) {
      return this.demandView.getDemandConfig();
    }
    const saved = Storage.loadDemandForWeek(weekStr);
    if (saved) return saved;
    const baseDemand = Storage.loadDemand();
    if (baseDemand) return baseDemand;
    return this.demandView.getDemandConfig();
  }

  /**
   * @param {string} weekStartStr
   * @returns {number[]}
   */
  getEffectivePatternWeeks(weekStartStr) {
    const employeeCountInput = /** @type {HTMLInputElement|null} */ (document.getElementById('employee-count'));
    const count = parseInt(employeeCountInput ? employeeCountInput.value : String(DEFAULT_EMPLOYEES)) || DEFAULT_EMPLOYEES;
    const baseWeek = Storage.loadBaseWeek() || this.weekNavView.getWeekStart();
    const savedPatterns = Storage.loadPatterns();
    return getEffectivePatternWeeks({ count, baseWeek, targetWeek: weekStartStr, savedPatterns });
  }

  /**
   * @param {number} empIndex
   * @param {string} weekStartStr
   * @returns {number}
   */
  getEffectivePatternWeek(empIndex, weekStartStr) {
    const baseWeek = Storage.loadBaseWeek() || this.weekNavView.getWeekStart();
    const savedPatterns = Storage.loadPatterns();
    return getEffectivePatternWeek({ empIndex, baseWeek, targetWeek: weekStartStr, savedPatterns });
  }

  /**
   * @param {number} empIndex
   * @param {string} weekStartStr
   * @returns {string}
   */
  getEffectiveShiftMode(empIndex, weekStartStr) {
    const baseWeek = Storage.loadBaseWeek() || this.weekNavView.getWeekStart();
    const savedShiftModes = Storage.loadConfig()?.shiftModes;
    const baseMode = (savedShiftModes && savedShiftModes[empIndex]) || DEFAULT_EMPLOYEE_SHIFT_MODES[empIndex];
    const diffWeeks = (baseWeek && weekStartStr) ? getWeeksDiff(baseWeek, weekStartStr) : 0;
    return calculateEffectiveShiftMode(empIndex, baseMode, diffWeeks);
  }

  /**
   * @param {string} weekStartStr
   * @returns {Record<number, { morning: number, afternoon: number }>}
   */
  getEffectiveShiftTargets(weekStartStr) {
    const employeeCountInput = /** @type {HTMLInputElement|null} */ (document.getElementById('employee-count'));
    const count = parseInt(employeeCountInput ? employeeCountInput.value : String(DEFAULT_EMPLOYEES)) || DEFAULT_EMPLOYEES;
    const baseWeek = Storage.loadBaseWeek() || this.weekNavView.getWeekStart();
    const savedShiftModes = Storage.loadConfig()?.shiftModes;
    return getEffectiveShiftTargets({ count, baseWeek, targetWeek: weekStartStr, savedShiftModes });
  }

  /**
   * @param {number} empIndex
   * @param {number} effectiveWeek
   * @param {string} weekStartStr
   */
  setEmployeePatternForWeek(empIndex, effectiveWeek, weekStartStr) {
    const baseWeek = Storage.loadBaseWeek() || weekStartStr || this.weekNavView.getWeekStart();
    if (!Storage.loadBaseWeek() && baseWeek) {
      Storage.saveBaseWeek(baseWeek);
    }
    const currentPatterns = Storage.loadPatterns() || [...DEFAULT_EMPLOYEE_PATTERNS];
    while (currentPatterns.length <= empIndex) {
      currentPatterns.push(((currentPatterns.length % 7) + 1));
    }
    const diffWeeks = getWeeksDiff(baseWeek, weekStartStr);
    const newBasePattern = calculateBasePattern(effectiveWeek, diffWeeks);
    currentPatterns[empIndex] = newBasePattern;
    Storage.savePatterns(currentPatterns);
  }

  renderDemandWeeksNav() {
    const weeksCount = this.weekNavView.getWeeksCount();
    const startWeek = this.weekNavView.getWeekStart();

    this.demandView.renderDemandWeeksNav({
      weeksCount,
      startWeek,
      onSelectWeek: ({ targetIndex, targetWeek }) => {
        // 1. Guardar demanda de la semana actual antes de cambiar
        if (this.demandView.activeDemandWeekStr) {
          Storage.saveDemandForWeek(this.demandView.activeDemandWeekStr, this.demandView.getDemandConfig());
        }

        // 2. Cambiar a la nueva semana y actualizar pills
        this.demandView.updateActivePill(targetIndex, targetWeek);

        // 3. Cargar demanda de la semana seleccionada
        const targetDemand = Storage.loadDemandForWeek(targetWeek) || this.demandView.getDemandConfig();
        this.demandView.loadDemandConfig(targetDemand);
      },
    });
  }

  updatePatternSelects() {
    const weekStart = this.weekNavView.getWeekStart();
    const baseWeek = Storage.loadBaseWeek() || weekStart;
    const savedPatterns = Storage.loadPatterns();
    const savedShiftModes = Storage.loadConfig()?.shiftModes;

    this.employeeNamesView.updatePatternSelects({ weekStart, baseWeek, savedPatterns });
    this.employeeNamesView.updateShiftBadges({ weekStart, baseWeek, savedShiftModes });
  }

  /**
   * @param {string} weekStr
   */
  navigateToWeek(weekStr) {
    const normalized = normalizeToMonday(weekStr);
    if (!normalized) return;
    this.weekNavView.setWeekStart(normalized);
    this.state.weekStart = normalized;
    this.saveState();
    this.weekNavView.updateWeekBadge(normalized);
    this.updatePatternSelects();

    const saved = Storage.loadSchedule(normalized);
    const names = this.getEmployeeNames();

    if (saved && saved.length === names.length) {
      this.scheduleView.showSchedule();
      if (this.onDisplaySchedule) {
        this.onDisplaySchedule(saved, names, normalized);
      }
      Toast.show(`Semana del ${formatDateLong(normalized)}`, 'info', 2000);
    } else {
      if (this.scheduleView.isScheduleVisible()) {
        this.scheduleView.showConfig();
        Toast.show(`Semana del ${formatDateLong(normalized)} lista para configurar`, 'info', 2500);
      }
    }

    const generatedWeeks = Storage.loadGeneratedWeeks();
    this.weekNavView.renderGeneratedWeeksNav(generatedWeeks, normalized, (targetWeek) => {
      navigationService.navigateToWeek(targetWeek);
    });
  }

  /**
   * @param {number} deltaDays
   */
  navigateWeek(deltaDays) {
    const currentVal = this.weekNavView.getWeekStart();
    let base = getMonday(currentVal || new Date());
    base.setDate(base.getDate() + deltaDays);
    const newWeekStr = formatDate(base);
    this.navigateToWeek(newWeekStr);
  }

  _bindEvents() {
    const employeeCountInput = /** @type {HTMLInputElement|null} */ (document.getElementById('employee-count'));
    const employeeNamesContainer = document.getElementById('employee-names');

    // Employee count change
    if (employeeCountInput) {
      employeeCountInput.addEventListener('change', () => {
        let count = parseInt(employeeCountInput.value);
        if (count < MIN_EMPLOYEES) count = MIN_EMPLOYEES;
        employeeCountInput.value = String(count);

        const currentWeekStart = this.weekNavView.getWeekStart();
        const baseWeek = Storage.loadBaseWeek() || currentWeekStart;
        const savedPatterns = Storage.loadPatterns();
        const savedShiftModes = Storage.loadConfig()?.shiftModes;

        this.employeeNamesView.render({
          count,
          savedNames: this.getEmployeeNames(),
          weekStart: currentWeekStart,
          baseWeek,
          savedPatterns,
          savedShiftModes,
          onPatternChange: ({ empIndex, patternWeek, label }) => {
            this.setEmployeePatternForWeek(empIndex, patternWeek, currentWeekStart);
            const empName = this.getEmployeeNames()[empIndex] || `Empleado ${empIndex + 1}`;
            Toast.show(`Patrón de ${empName}: Semana ${patternWeek} (${label})`, 'info', 2500);
          },
        });
      });
    }

    // Save config on any change to employee names
    if (employeeNamesContainer) {
      employeeNamesContainer.addEventListener('input', () => this.saveState());
    }

    // Demand inputs change with clamping & auto-save
    document.querySelectorAll('.demand-input').forEach(el => {
      const input = /** @type {HTMLInputElement} */ (el);
      input.addEventListener('change', () => {
        const day = parseInt(input.dataset.day || '0');
        let val = parseInt(input.value) || 0;
        const clamped = clampDemandValue(day, val);
        if (clamped !== val) {
          input.value = String(clamped);
          if (day >= 4) {
            Toast.show('Viernes, sábados y domingos siempre deben tener al menos 3 empleados por cada turno.', 'warning', 3500);
          } else {
            Toast.show('El personal mínimo por turno es de 2 empleados.', 'warning', 3500);
          }
        }
        const activeWeekStr = this.getActiveDemandWeekStr();
        if (activeWeekStr) {
          Storage.saveDemandForWeek(activeWeekStr, this.demandView.getDemandConfig());
        }
        this.saveState();
      });
    });

    // Week start change
    const weekStartInput = this.weekNavView.weekStartInput;
    if (weekStartInput) {
      weekStartInput.addEventListener('change', () => {
        const current = weekStartInput.value;
        const normalized = normalizeToMonday(current);
        if (normalized && normalized !== current) {
          weekStartInput.value = normalized;
          Toast.show(`Ajustado al lunes de esa semana (${getDayDates(normalized)[0].date}).`, 'info', 2500);
        }
        this.state.weekStart = weekStartInput.value;
        this.saveState();
        this.weekNavView.updateWeekBadge(weekStartInput.value);
        this.updatePatternSelects();
        this.renderDemandWeeksNav();
      });
    }

    // Weeks count change
    const weeksCountSelect = this.weekNavView.weeksCountSelect;
    if (weeksCountSelect) {
      weeksCountSelect.addEventListener('change', () => {
        Storage.saveWeeksCount(weeksCountSelect.value);
        this.renderDemandWeeksNav();
      });
    }

    // Copy demand button
    const btnCopyDemand = document.getElementById('btn-copy-demand');
    if (btnCopyDemand) {
      btnCopyDemand.addEventListener('click', () => {
        const currentDemand = this.demandView.getDemandConfig();
        const wc = this.weekNavView.getWeeksCount();
        const startWeek = this.weekNavView.getWeekStart();
        if (!startWeek) return;

        for (let w = 0; w < wc; w++) {
          const monday = getMonday(startWeek);
          monday.setDate(monday.getDate() + (w * 7));
          const weekStr = formatDate(monday);
          Storage.saveDemandForWeek(weekStr, JSON.parse(JSON.stringify(currentDemand)));
        }
        Storage.saveDemand(currentDemand);
        Toast.show(`Demanda de la Semana ${this.demandView.activeDemandWeekIndex + 1} copiada a las ${wc} semanas.`, 'success', 3500);
      });
    }

    // Week navigation buttons
    const btnPrevWeek = document.getElementById('btn-prev-week');
    const btnNextWeek = document.getElementById('btn-next-week');
    const btnSchedPrev = document.getElementById('btn-sched-prev');
    const btnSchedNext = document.getElementById('btn-sched-next');

    if (btnPrevWeek) btnPrevWeek.addEventListener('click', () => this.navigateWeek(-7));
    if (btnNextWeek) btnNextWeek.addEventListener('click', () => this.navigateWeek(7));
    if (btnSchedPrev) btnSchedPrev.addEventListener('click', () => this.navigateWeek(-7));
    if (btnSchedNext) btnSchedNext.addEventListener('click', () => this.navigateWeek(7));
  }
}
