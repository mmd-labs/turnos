import { Scheduler } from '../../../scheduler.js';
import { Storage } from '../../../storage.js';
import { Toast } from '../../../toast.js';
import { Auditor } from '../../../auditor.js';
import { Exporter, ShareHelper } from '../../../exporter.js';
import { IndividualView } from '../../../individual.js';
import { getMonday, formatDate, formatDateLong, normalizeToMonday } from '../../../core/date.js';
import { navigationService } from '../../../core/infrastructure/navigation.service.js';

export class ScheduleController {
  /**
   * @param {Object} params
   * @param {import('./schedule-view.js').ScheduleView} params.scheduleView
   * @param {import('../../settings/presentation/settings.controller.js').SettingsController} params.settingsController
   */
  constructor({ scheduleView, settingsController }) {
    this.scheduleView = scheduleView;
    this.settingsController = settingsController;
  }

  init() {
    this.scheduleView.init();
    this._bindEvents();
  }

  /**
   * @param {string[][]} matrix
   * @param {string[]} employees
   * @param {string} weekStart
   */
  displaySchedule(matrix, employees, weekStart) {
    this.scheduleView.renderSchedule({
      matrix,
      employees,
      weekStart,
      onShiftChange: ({ empIdx, dayIndex, newShift }) => {
        this.handleShiftChange(matrix, employees, weekStart, empIdx, dayIndex, newShift);
      },
    });

    this.scheduleView.renderPDF(matrix, employees, weekStart);

    // Run Live Audit
    const weekDemand = Storage.loadDemandForWeek(weekStart) || this.settingsController.getDemandForWeek(weekStart);
    Auditor.run(matrix, employees, weekDemand, weekStart);

    // Multi-week navigation pills
    const genWeeks = Storage.loadGeneratedWeeks();
    if (genWeeks && genWeeks.length > 1) {
      this.settingsController.weekNavView.renderGeneratedWeeksNav(genWeeks, weekStart, (targetWeek) => {
        navigationService.navigateToWeek(targetWeek);
      });
    }
  }

  /**
   * @param {string[][]} matrix
   * @param {string[]} employees
   * @param {string} weekStart
   * @param {number} _empIdx
   * @param {number} _dayIndex
   * @param {string} _newShift
   */
  handleShiftChange(matrix, employees, weekStart, _empIdx, _dayIndex, _newShift) {
    Storage.saveSchedule(weekStart, matrix);
    this.displaySchedule(matrix, employees, weekStart);
    Toast.show('Turno actualizado y balance recalculado.', 'info', 2000);
  }

  generateSchedule() {
    const rawWeekStart = this.settingsController.weekNavView.getWeekStart();
    const normalized = normalizeToMonday(rawWeekStart);
    if (normalized && normalized !== rawWeekStart) {
      this.settingsController.weekNavView.setWeekStart(normalized);
    }
    if (!this.settingsController.weekNavView.getWeekStart()) {
      this.settingsController.weekNavView.setDefaultWeekStart();
    }
    const startWeek = this.settingsController.weekNavView.getWeekStart();
    this.settingsController.state.weekStart = startWeek;
    this.settingsController.saveState();

    const employees = this.settingsController.getEmployeeNames();
    const weeksCount = this.settingsController.weekNavView.getWeeksCount();
    Storage.saveWeeksCount(weeksCount);

    // Save active demand week before generating
    const activeDemandWeekStr = this.settingsController.getActiveDemandWeekStr();
    if (activeDemandWeekStr) {
      Storage.saveDemandForWeek(activeDemandWeekStr, this.settingsController.demandView.getDemandConfig());
    }

    if (!Storage.loadBaseWeek()) {
      Storage.saveBaseWeek(startWeek);
    }

    const generatedWeeks = [];
    /** @type {string[][]|null} */
    let firstWeekMatrix = null;
    const weekPlans = [];

    // Pass 1: Dry run (calculate and validate all weeks in memory)
    for (let w = 0; w < weeksCount; w++) {
      const monday = getMonday(startWeek);
      monday.setDate(monday.getDate() + (w * 7));
      const currentWeekStr = formatDate(monday);
      const patternWeeks = this.settingsController.getEffectivePatternWeeks(currentWeekStr);
      const shiftTargets = this.settingsController.getEffectiveShiftTargets(currentWeekStr);
      const weekDemand = this.settingsController.getDemandForWeek(currentWeekStr);

      const result = Scheduler.generate(employees, weekDemand, {
        patternWeeks,
        weekStart: currentWeekStr,
        shiftTargets,
      });

      if (!result.success) {
        Toast.show(`Error en semana ${w + 1} (${formatDateLong(currentWeekStr)}): ${result.error}`, 'error', 5000);
        return;
      }

      weekPlans.push({
        weekStr: currentWeekStr,
        matrix: result.matrix,
        demand: weekDemand,
      });
    }

    // Pass 2: Commit (save only after all weeks have succeeded)
    for (let w = 0; w < weekPlans.length; w++) {
      const plan = weekPlans[w];
      Storage.saveSchedule(plan.weekStr, plan.matrix);
      Storage.saveDemandForWeek(plan.weekStr, plan.demand);
      generatedWeeks.push(plan.weekStr);
      if (w === 0) {
        firstWeekMatrix = plan.matrix;
      }
    }

    Storage.saveGeneratedWeeks(generatedWeeks);

    if (firstWeekMatrix) {
      this.displaySchedule(firstWeekMatrix, employees, startWeek);
    }

    this.scheduleView.showSchedule();

    if (weeksCount > 1) {
      Toast.show(`¡Cuadrante de ${weeksCount} semanas generado con éxito! Usa las pestañas superiores para navegar.`, 'success', 4000);
    } else {
      Toast.show('¡Cuadrante semanal generado con éxito!', 'success');
    }
  }

  _bindEvents() {
    // Generate schedule
    const btnGenerate = document.getElementById('btn-generate');
    if (btnGenerate) {
      btnGenerate.addEventListener('click', () => this.generateSchedule());
    }

    // Edit (go back to config)
    const btnEdit = document.getElementById('btn-edit');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        const editedMatrix = this.scheduleView.getScheduleFromDOM();
        const names = this.settingsController.getEmployeeNames();
        const weekStart = this.settingsController.weekNavView.getWeekStart();
        Storage.saveSchedule(weekStart, editedMatrix);
        Storage.saveNames(names);
        this.scheduleView.showConfig();
      });
    }

    // Export PDF
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const names = this.settingsController.getEmployeeNames();
        const currentWeekStart = this.settingsController.weekNavView.getWeekStart();
        const weeksCount = this.settingsController.weekNavView.getWeeksCount();

        const generatedWeeks = Storage.loadGeneratedWeeks() || [];

        if (weeksCount > 1 && generatedWeeks.length > 1) {
          const weeksData = generatedWeeks.map(ws => {
            const matrix = (ws === currentWeekStart)
              ? this.scheduleView.getScheduleFromDOM()
              : (Storage.loadSchedule(ws) || []);
            return { matrix, employees: names, weekStart: ws };
          });
          this.scheduleView.renderMultiWeekPDF(weeksData);
        } else {
          const matrix = this.scheduleView.getScheduleFromDOM();
          this.scheduleView.renderMultiWeekPDF([{ matrix, employees: names, weekStart: currentWeekStart }]);
        }

        Exporter.exportToPDF(currentWeekStart);
      });
    }

    // Export CSV / Excel
    const btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => {
        const matrix = this.scheduleView.getScheduleFromDOM();
        const names = this.settingsController.getEmployeeNames();
        const weekStart = this.settingsController.weekNavView.getWeekStart();
        Exporter.exportToCSV(matrix, names, weekStart);
      });
    }

    // Share by WhatsApp
    const btnShare = document.getElementById('btn-share');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        const matrix = this.scheduleView.getScheduleFromDOM();
        const names = this.settingsController.getEmployeeNames();
        const weekStart = this.settingsController.weekNavView.getWeekStart();
        ShareHelper.share(matrix, names, weekStart);
      });
    }

    // Individual employee view
    const btnIndividual = document.getElementById('btn-individual');
    if (btnIndividual) {
      btnIndividual.addEventListener('click', () => {
        const matrix = this.scheduleView.getScheduleFromDOM();
        const names = this.settingsController.getEmployeeNames();
        const weekStart = this.settingsController.weekNavView.getWeekStart();
        IndividualView.open(matrix, names, weekStart);
      });
    }
  }
}
