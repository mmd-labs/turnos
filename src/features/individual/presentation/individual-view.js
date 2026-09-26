import { getDayDates } from '../../../core/date.js';
import { escapeHtml } from '../../../core/html.js';

export class IndividualViewPresentation {
  constructor() {
    /** @type {HTMLElement|null} */
    this.modal = null;
    /** @type {HTMLSelectElement|null} */
    this.select = null;
    /** @type {HTMLElement|null} */
    this.cardsContainer = null;
    /** @type {HTMLElement|null} */
    this.closeBtn = null;
    /** @type {HTMLElement|null} */
    this.copyBtn = null;
  }

  init() {
    this.modal = document.getElementById('individual-modal');
    this.select = /** @type {HTMLSelectElement} */ (document.getElementById('individual-emp-select'));
    this.cardsContainer = document.getElementById('individual-schedule-cards');
    this.closeBtn = document.getElementById('modal-close');
    this.copyBtn = document.getElementById('btn-copy-individual');
  }

  /**
   * @param {string[]} employees
   */
  openModal(employees) {
    if (!this.select) return;
    this.select.innerHTML = '';
    employees.forEach((name, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = name;
      this.select?.appendChild(opt);
    });

    if (this.modal) this.modal.hidden = false;
  }

  closeModal() {
    if (this.modal) this.modal.hidden = true;
  }

  /**
   * @returns {number}
   */
  getSelectedEmpIndex() {
    return parseInt(this.select?.value || '0') || 0;
  }

  /**
   * @param {Object} params
   * @param {string[][]} params.matrix
   * @param {number} params.empIdx
   * @param {string} params.weekStart
   */
  renderSelectedCards({ matrix, empIdx, weekStart }) {
    if (!this.cardsContainer) return;
    const dayDates = getDayDates(weekStart);
    const shiftLabels = { M: 'Mañana', T: 'Tarde', L: 'Libre' };
    const shiftClasses = { M: 'morning', T: 'afternoon', L: 'free' };

    this.cardsContainer.innerHTML = '';
    dayDates.forEach((d, dayIdx) => {
      const shiftKey = (matrix && matrix[empIdx]) ? matrix[empIdx][dayIdx] : 'L';
      const card = document.createElement('div');
      card.className = 'indiv-day-card';
      const cssClass = shiftClasses[/** @type {'M'|'T'|'L'} */ (shiftKey)] || 'free';
      const label = shiftLabels[/** @type {'M'|'T'|'L'} */ (shiftKey)] || 'Libre';

      card.innerHTML = `
        <div class="indiv-day-name">${escapeHtml(d.name)}</div>
        <div class="indiv-day-date">${escapeHtml(d.date)}</div>
        <span class="indiv-shift-badge indiv-shift-badge--${cssClass}">
          ${escapeHtml(label)}
        </span>
      `;
      this.cardsContainer?.appendChild(card);
    });
  }
}

export const individualViewPresentation = new IndividualViewPresentation();
