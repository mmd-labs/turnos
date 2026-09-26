import { getNextMonday, formatDate, formatDateLong, getDayDates } from '../../../core/date.js';

export class WeekNavView {
  constructor() {
    /** @type {HTMLInputElement|null} */
    this.weekStartInput = null;
    /** @type {HTMLSelectElement|null} */
    this.weeksCountSelect = null;
    /** @type {HTMLElement|null} */
    this.generatedWeeksNav = null;
    /** @type {HTMLElement|null} */
    this.weekBadge = null;
  }

  init() {
    this.weekStartInput = /** @type {HTMLInputElement} */ (document.getElementById('week-start'));
    this.weeksCountSelect = /** @type {HTMLSelectElement} */ (document.getElementById('weeks-count'));
    this.generatedWeeksNav = document.getElementById('generated-weeks-nav');
    this.weekBadge = document.getElementById('schedule-week-badge');
  }

  /**
   * @returns {string}
   */
  getWeekStart() {
    return this.weekStartInput ? this.weekStartInput.value : '';
  }

  /**
   * @param {string} val
   */
  setWeekStart(val) {
    if (this.weekStartInput) {
      this.weekStartInput.value = val;
    }
  }

  setDefaultWeekStart() {
    if (this.weekStartInput) {
      const nextMonday = getNextMonday();
      this.weekStartInput.value = formatDate(nextMonday);
    }
  }

  /**
   * @returns {number}
   */
  getWeeksCount() {
    return parseInt(this.weeksCountSelect ? this.weeksCountSelect.value : '1') || 1;
  }

  /**
   * @param {number|string} val
   */
  setWeeksCount(val) {
    if (this.weeksCountSelect) {
      this.weeksCountSelect.value = String(val);
    }
  }

  /**
   * @param {string} weekStr
   */
  updateWeekBadge(weekStr) {
    if (this.weekBadge && weekStr) {
      this.weekBadge.textContent = `Semana del ${formatDateLong(weekStr)}`;
    }
  }

  /**
   * @param {string[]} weeks
   * @param {string} currentWeek
   * @param {(weekStr: string) => void} [onWeekSelect]
   */
  renderGeneratedWeeksNav(weeks, currentWeek, onWeekSelect) {
    if (!this.generatedWeeksNav) return;
    if (!weeks || weeks.length <= 1) {
      this.generatedWeeksNav.hidden = true;
      this.generatedWeeksNav.innerHTML = '';
      return;
    }
    this.generatedWeeksNav.hidden = false;
    this.generatedWeeksNav.innerHTML = weeks.map((w, idx) => {
      const dates = getDayDates(w);
      const startStr = `${dates[0].date.split('/')[0]}/${dates[0].date.split('/')[1]}`;
      const endStr = `${dates[6].date.split('/')[0]}/${dates[6].date.split('/')[1]}`;
      const isActive = (w === currentWeek);
      return `<button type="button" class="week-pill ${isActive ? 'active' : ''}" data-week="${w}">
        Semana ${idx + 1} (${startStr} - ${endStr})
      </button>`;
    }).join('');

    this.generatedWeeksNav.querySelectorAll('.week-pill').forEach(el => {
      el.addEventListener('click', () => {
        const btn = /** @type {HTMLButtonElement} */ (el);
        const week = btn.dataset.week || '';
        if (onWeekSelect) {
          onWeekSelect(week);
        }
      });
    });
  }
}

export const weekNavView = new WeekNavView();
