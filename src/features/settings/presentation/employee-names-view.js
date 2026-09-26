import {
  DEFAULT_EMPLOYEE_NAMES,
  DEFAULT_EMPLOYEE_PATTERNS,
  DEFAULT_EMPLOYEE_SHIFT_MODES,
  ROTATING_OFF_PATTERN,
} from '../../../core/constants/domain.js';
import { escapeHtml } from '../../../core/html.js';
import { getWeeksDiff } from '../../../core/date.js';
import {
  getEffectivePatternWeek,
  calculateEffectiveShiftMode,
  calculateBasePattern,
} from '../../scheduling/domain/patterns.js';

export class EmployeeNamesView {
  constructor() {
    /** @type {HTMLElement|null} */
    this.container = null;
  }

  init() {
    this.container = document.getElementById('employee-names');
  }

  /**
   * @param {Object} params
   * @param {number} params.count
   * @param {string[]|null} [params.savedNames]
   * @param {string} [params.weekStart]
   * @param {string} [params.baseWeek]
   * @param {number[]|null} [params.savedPatterns]
   * @param {string[]|null} [params.savedShiftModes]
   * @param {(change: { empIndex: number, patternWeek: number, label: string }) => void} [params.onPatternChange]
   */
  render({
    count,
    savedNames = null,
    weekStart = '',
    baseWeek = '',
    savedPatterns = null,
    savedShiftModes = null,
    onPatternChange = undefined,
  }) {
    if (!this.container) return;
    this.container.innerHTML = '';

    const effectiveBaseWeek = baseWeek || weekStart;
    const diffWeeks = (effectiveBaseWeek && weekStart) ? getWeeksDiff(effectiveBaseWeek, weekStart) : 0;

    for (let i = 0; i < count; i++) {
      const defaultName = DEFAULT_EMPLOYEE_NAMES[i] || `Empleado ${i + 1}`;
      let currentName = defaultName;
      if (savedNames && savedNames[i] && savedNames[i] !== `Empleado ${i + 1}`) {
        currentName = savedNames[i];
      }

      const effectiveWeek = getEffectivePatternWeek({
        empIndex: i,
        baseWeek: effectiveBaseWeek,
        targetWeek: weekStart,
        savedPatterns,
      });

      const baseMode = (savedShiftModes && savedShiftModes[i]) || DEFAULT_EMPLOYEE_SHIFT_MODES[i] || '3M2T';
      const effectiveShiftMode = calculateEffectiveShiftMode(i, baseMode, diffWeeks);

      const shiftLabel = (i === 0)
        ? 'Solo Mañana (5M / 0T)'
        : (effectiveShiftMode === '3M2T' ? '3 Mañanas + 2 Tardes' : '2 Mañanas + 3 Tardes');
      const shiftTagClass = (i === 0)
        ? 'emp-shifts-badge--morning'
        : (effectiveShiftMode === '3M2T' ? 'emp-shifts-badge--3m2t' : 'emp-shifts-badge--2m3t');

      const patternOptions = ROTATING_OFF_PATTERN.map(p =>
        `<option value="${p.week}" ${p.week === effectiveWeek ? 'selected' : ''}>Semana ${p.week}: ${p.label}</option>`
      ).join('');

      const div = document.createElement('div');
      div.className = 'form-group employee-card';
      const keyNotice = (i === 0) ? '<span class="emp-key-tag">Clave · Solo Mañana</span>' : '';
      div.innerHTML = `
        <div class="emp-card-header">
          <label for="emp-name-${i}">Empleado ${i + 1}</label>
          ${keyNotice}
        </div>
        <input type="text" id="emp-name-${i}" class="emp-name-input" data-index="${i}"
               value="${escapeHtml(currentName)}"
               placeholder="${escapeHtml(defaultName)}">
        <div class="emp-pattern-group">
          <label for="emp-pattern-${i}" class="emp-pattern-label">Patrón rotativo:</label>
          <select id="emp-pattern-${i}" class="emp-pattern-select" data-index="${i}">
            ${patternOptions}
          </select>
        </div>
        <div class="emp-shift-group">
          <span class="emp-shift-label">Turnos semanales:</span>
          <span class="emp-shifts-badge ${shiftTagClass}">${escapeHtml(shiftLabel)}</span>
        </div>
      `;
      this.container.appendChild(div);
    }

    // Attach change listener to pattern selects
    this.container.querySelectorAll('.emp-pattern-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const target = /** @type {HTMLSelectElement} */ (e.target);
        const idx = parseInt(target.dataset.index || '0');
        const val = parseInt(target.value);
        const label = ROTATING_OFF_PATTERN[val - 1]?.label || '';
        if (onPatternChange) {
          onPatternChange({ empIndex: idx, patternWeek: val, label });
        }
      });
    });
  }

  /**
   * @returns {string[]}
   */
  getEmployeeNames() {
    if (!this.container) return [];
    const inputs = /** @type {NodeListOf<HTMLInputElement>} */ (this.container.querySelectorAll('.emp-name-input'));
    return Array.from(inputs).map(input => {
      const idx = parseInt(input.dataset.index || '0');
      const defaultName = DEFAULT_EMPLOYEE_NAMES[idx] || `Empleado ${idx + 1}`;
      return input.value.trim() || defaultName;
    });
  }

  /**
   * @param {Object} params
   * @param {string} params.weekStart
   * @param {string} [params.baseWeek]
   * @param {string[]|null} [params.savedShiftModes]
   */
  updateShiftBadges({ weekStart, baseWeek = '', savedShiftModes = null }) {
    if (!this.container) return;
    const cards = this.container.querySelectorAll('.employee-card');
    const effectiveBaseWeek = baseWeek || weekStart;
    const diffWeeks = (effectiveBaseWeek && weekStart) ? getWeeksDiff(effectiveBaseWeek, weekStart) : 0;

    cards.forEach((card, i) => {
      const badge = card.querySelector('.emp-shifts-badge');
      if (badge) {
        const baseMode = (savedShiftModes && savedShiftModes[i]) || DEFAULT_EMPLOYEE_SHIFT_MODES[i] || '3M2T';
        const effectiveShiftMode = calculateEffectiveShiftMode(i, baseMode, diffWeeks);
        const shiftLabel = (i === 0)
          ? 'Solo Mañana (5M / 0T)'
          : (effectiveShiftMode === '3M2T' ? '3 Mañanas + 2 Tardes' : '2 Mañanas + 3 Tardes');
        const shiftTagClass = (i === 0)
          ? 'emp-shifts-badge--morning'
          : (effectiveShiftMode === '3M2T' ? 'emp-shifts-badge--3m2t' : 'emp-shifts-badge--2m3t');
        badge.className = `emp-shifts-badge ${shiftTagClass}`;
        badge.textContent = shiftLabel;
      }
    });
  }

  /**
   * @param {Object} params
   * @param {string} params.weekStart
   * @param {string} [params.baseWeek]
   * @param {number[]|null} [params.savedPatterns]
   */
  updatePatternSelects({ weekStart, baseWeek = '', savedPatterns = null }) {
    if (!this.container) return;
    const selects = /** @type {NodeListOf<HTMLSelectElement>} */ (this.container.querySelectorAll('.emp-pattern-select'));
    const effectiveBaseWeek = baseWeek || weekStart;

    selects.forEach(sel => {
      const idx = parseInt(sel.dataset.index || '0');
      const eff = getEffectivePatternWeek({
        empIndex: idx,
        baseWeek: effectiveBaseWeek,
        targetWeek: weekStart,
        savedPatterns,
      });
      sel.value = String(eff);
    });
  }
}

export const employeeNamesView = new EmployeeNamesView();
