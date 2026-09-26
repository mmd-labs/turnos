import { Toast } from '../../../toast.js';
import { Auditor } from '../../../auditor.js';
import { Exporter, ShareHelper } from '../../../exporter.js';
import { individualController } from '../../individual/presentation/individual.controller.js';
import { normalizeToMonday } from '../../../core/date.js';
import { navigationService } from '../../../core/infrastructure/navigation.service.js';
import { LocalScheduleRepository } from '../infrastructure/local-schedule.repository.js';
import { LocalSettingsRepository } from '../../settings/infrastructure/local-settings.repository.js';
import { GenerateSchedulesUseCase } from '../application/generate-schedules.usecase.js';

export class ScheduleController {
  /**
   * @param {Object} params
   * @param {import('./schedule-view.js').ScheduleView} params.scheduleView
   * @param {import('../../settings/presentation/settings.controller.js').SettingsController} params.settingsController
   * @param {import('../application/generate-schedules.usecase.js').GenerateSchedulesUseCase} [params.generateSchedulesUseCase]
   * @param {import('../application/ports.js').ScheduleRepository} [params.scheduleRepo]
   * @param {import('../../settings/application/ports.js').SettingsRepository} [params.settingsRepo]
   * @param {import('../../individual/presentation/individual.controller.js').IndividualController} [params.individualCtrl]
   */
  constructor({
    scheduleView,
    settingsController,
    scheduleRepo = new LocalScheduleRepository(),
    settingsRepo = new LocalSettingsRepository(),
    generateSchedulesUseCase = new GenerateSchedulesUseCase({
      scheduleRepo,
      demandRepo: settingsRepo,
      settingsRepo,
    }),
    individualCtrl = individualController,
  }) {
    this.scheduleView = scheduleView;
    this.settingsController = settingsController;
    this.scheduleRepo = scheduleRepo;
    this.settingsRepo = settingsRepo;
    this.generateSchedulesUseCase = generateSchedulesUseCase;
    this.individualController = individualCtrl;
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
    const weekDemand = this.settingsRepo.loadDemandForWeek(weekStart) || this.settingsController.getDemandForWeek(weekStart);
    Auditor.run(matrix, employees, weekDemand, weekStart);

    // Multi-week navigation pills
    const genWeeks = this.scheduleRepo.loadGeneratedWeeks();
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
    this.scheduleRepo.save(weekStart, matrix);
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

    // Save active demand week before generating
    const activeDemandWeekStr = this.settingsController.getActiveDemandWeekStr();
    if (activeDemandWeekStr) {
      this.settingsRepo.saveDemandForWeek(activeDemandWeekStr, this.settingsController.demandView.getDemandConfig());
    }

    // Delegate multi-week two-phase generation to Use Case
    const result = this.generateSchedulesUseCase.execute({
      startWeek,
      weeksCount,
      employees,
      getDemandForWeek: (wStr) => this.settingsController.getDemandForWeek(wStr),
    });

    if (!result.success) {
      Toast.show(result.error || 'Error al generar cuadrante.', 'error', 5000);
      return;
    }

    const firstWeekMatrix = result.data?.firstWeekMatrix;
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
        this.scheduleRepo.save(weekStart, editedMatrix);
        this.settingsRepo.saveNames(names);
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

        const generatedWeeks = this.scheduleRepo.loadGeneratedWeeks() || [];

        if (weeksCount > 1 && generatedWeeks.length > 1) {
          const weeksData = generatedWeeks.map(ws => {
            const matrix = (ws === currentWeekStart)
              ? this.scheduleView.getScheduleFromDOM()
              : (this.scheduleRepo.load(ws) || []);
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
        this.individualController.open(matrix, names, weekStart);
      });
    }
  }
}
