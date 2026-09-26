import {
  ROTATING_OFF_PATTERN,
  DEFAULT_EMPLOYEE_SHIFT_MODES,
} from '../../../core/constants/domain.js';
import { getWeeksDiff } from '../../../core/date.js';
import {
  getEffectivePatternWeek,
  calculateEffectiveShiftMode,
} from '../../scheduling/domain/patterns.js';
import { buildIndividualShareText } from '../../export/domain/share-text.js';
import { navigatorShareAdapter } from '../../export/infrastructure/navigator-share.adapter.js';
import { Toast } from '../../../toast.js';
import { individualViewPresentation } from './individual-view.js';
import { LocalSettingsRepository } from '../../settings/infrastructure/local-settings.repository.js';

export class IndividualController {
  /**
   * @param {Object} [params]
   * @param {import('./individual-view.js').IndividualViewPresentation} [params.view]
   * @param {import('../../settings/application/ports.js').SettingsRepository} [params.settingsRepo]
   */
  constructor({ view = individualViewPresentation, settingsRepo = new LocalSettingsRepository() } = {}) {
    this.view = view;
    this.settingsRepo = settingsRepo;
    /** @type {string[][]|null} */
    this.matrix = null;
    /** @type {string[]|null} */
    this.employees = null;
    /** @type {string} */
    this.weekStart = '';
  }

  init() {
    this.view.init();
    this._bindEvents();
  }

  _bindEvents() {
    if (this.view.closeBtn) {
      this.view.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.view.modal) {
      this.view.modal.addEventListener('click', (e) => {
        if (e.target === this.view.modal) this.close();
      });
    }
    if (this.view.select) {
      this.view.select.addEventListener('change', () => this.renderSelected());
    }
    if (this.view.copyBtn) {
      this.view.copyBtn.addEventListener('click', () => this.copySchedule());
    }
  }

  /**
   * @param {string[][]} matrix
   * @param {string[]} employees
   * @param {string} weekStart
   */
  open(matrix, employees, weekStart) {
    this.matrix = matrix;
    this.employees = employees;
    this.weekStart = weekStart;

    this.view.openModal(employees);
    this.renderSelected();
  }

  close() {
    this.view.closeModal();
  }

  renderSelected() {
    if (!this.matrix) return;
    const empIdx = this.view.getSelectedEmpIndex();
    this.view.renderSelectedCards({
      matrix: this.matrix,
      empIdx,
      weekStart: this.weekStart,
    });
  }

  async copySchedule() {
    if (!this.matrix || !this.employees) return;
    const empIdx = this.view.getSelectedEmpIndex();
    const empName = this.employees[empIdx] || `Empleado ${empIdx + 1}`;

    const baseWeek = this.settingsRepo.loadBaseWeek() || this.weekStart;
    const savedPatterns = this.settingsRepo.loadPatterns();
    const pWeek = getEffectivePatternWeek({
      empIndex: empIdx,
      baseWeek,
      targetWeek: this.weekStart,
      savedPatterns,
    });
    const pItem = ROTATING_OFF_PATTERN[pWeek - 1] || ROTATING_OFF_PATTERN[0];

    const savedShiftModes = this.settingsRepo.loadShiftModes();
    const baseMode = (savedShiftModes && savedShiftModes[empIdx]) || DEFAULT_EMPLOYEE_SHIFT_MODES[empIdx] || '3M2T';
    const diffWeeks = (baseWeek && this.weekStart) ? getWeeksDiff(baseWeek, this.weekStart) : 0;
    const shiftMode = calculateEffectiveShiftMode(empIdx, baseMode, diffWeeks);

    const shiftModeLabel = (empIdx === 0)
      ? 'Solo Mañanas (5M)'
      : (shiftMode === '3M2T' ? '3 Mañanas + 2 Tardes' : '2 Mañanas + 3 Tardes');

    const text = buildIndividualShareText({
      matrix: this.matrix,
      employees: this.employees,
      weekStart: this.weekStart,
      empIndex: empIdx,
      patternWeek: pWeek,
      patternLabel: pItem.label,
      shiftModeLabel,
    });

    await navigatorShareAdapter.shareOrCopy({
      title: `Horario Semanal - ${empName}`,
      text,
      onShareSuccess: () => Toast.show(`Horario de ${empName} compartido con éxito.`, 'success'),
      onCopySuccess: () => Toast.show(`Horario de ${empName} copiado para WhatsApp.`, 'success'),
      onError: () => Toast.show('No se pudo copiar automáticamente.', 'error'),
    });
  }
}

export const individualController = new IndividualController();
