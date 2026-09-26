import { getMonday, getDayDates, formatDate } from '../../../core/date.js';
import { clampDemandValue } from '../../scheduling/domain/rules/demand.js';

/**
 * @typedef {import('../../scheduling/domain/entities.js').WeeklyDemand} WeeklyDemand
 */

export class DemandView {
  constructor() {
    /** @type {HTMLElement|null} */
    this.demandWeeksNav = null;
    /** @type {HTMLElement|null} */
    this.demandActions = null;
    /** @type {HTMLElement|null} */
    this.demandIndicator = null;
    /** @type {number} */
    this.activeDemandWeekIndex = 0;
    /** @type {string|null} */
    this.activeDemandWeekStr = null;
  }

  init() {
    this.demandWeeksNav = document.getElementById('demand-weeks-nav');
    this.demandActions = document.getElementById('demand-actions');
    this.demandIndicator = document.getElementById('demand-active-indicator');
  }

  /**
   * @param {WeeklyDemand|null} demand
   */
  loadDemandConfig(demand) {
    if (!demand) return;
    document.querySelectorAll('.demand-input').forEach(el => {
      const input = /** @type {HTMLInputElement} */ (el);
      const shift = input.dataset.shift;
      const day = parseInt(input.dataset.day || '0');
      if (shift && demand[shift] && demand[shift][day] !== undefined) {
        const val = demand[shift][day];
        input.value = String(clampDemandValue(day, val));
      }
    });
  }

  /**
   * @returns {WeeklyDemand}
   */
  getDemandConfig() {
    /** @type {WeeklyDemand} */
    const demand = { morning: [], afternoon: [] };
    document.querySelectorAll('.demand-input').forEach(el => {
      const input = /** @type {HTMLInputElement} */ (el);
      const shift = input.dataset.shift;
      const day = parseInt(input.dataset.day || '0');
      if (shift && (shift === 'morning' || shift === 'afternoon')) {
        demand[shift][day] = parseInt(input.value) || 0;
      }
    });
    return demand;
  }

  /**
   * @param {string} startWeek
   * @returns {string}
   */
  getActiveDemandWeekStr(startWeek) {
    if (!startWeek) return '';
    const monday = getMonday(startWeek);
    if (!monday) return startWeek;
    monday.setDate(monday.getDate() + (this.activeDemandWeekIndex * 7));
    return formatDate(monday);
  }

  /**
   * @param {Object} params
   * @param {number} params.weeksCount
   * @param {string} params.startWeek
   * @param {(change: { targetIndex: number, targetWeek: string }) => void} [params.onSelectWeek]
   */
  renderDemandWeeksNav({ weeksCount, startWeek, onSelectWeek }) {
    if (!this.demandWeeksNav || !startWeek) return;

    if (weeksCount <= 1) {
      this.demandWeeksNav.hidden = true;
      this.demandWeeksNav.innerHTML = '';
      if (this.demandActions) this.demandActions.hidden = true;
      if (this.demandIndicator) this.demandIndicator.hidden = true;
      this.activeDemandWeekIndex = 0;
      this.activeDemandWeekStr = startWeek;
      return;
    }

    this.demandWeeksNav.hidden = false;
    if (this.demandActions) this.demandActions.hidden = false;
    if (this.demandIndicator) this.demandIndicator.hidden = false;

    if (this.activeDemandWeekIndex >= weeksCount || this.activeDemandWeekIndex < 0) {
      this.activeDemandWeekIndex = 0;
    }

    const pillsHtml = [];
    for (let w = 0; w < weeksCount; w++) {
      const monday = getMonday(startWeek);
      monday.setDate(monday.getDate() + (w * 7));
      const weekStr = formatDate(monday);
      const dates = getDayDates(weekStr);
      const startStr = `${dates[0].date.split('/')[0]}/${dates[0].date.split('/')[1]}`;
      const endStr = `${dates[6].date.split('/')[0]}/${dates[6].date.split('/')[1]}`;
      const isActive = (w === this.activeDemandWeekIndex);
      pillsHtml.push(`
        <button type="button" class="week-pill ${isActive ? 'active' : ''}" data-index="${w}" data-week="${weekStr}">
          Semana ${w + 1} (${startStr} - ${endStr})
        </button>
      `);
    }
    this.demandWeeksNav.innerHTML = pillsHtml.join('');

    const activeMonday = getMonday(startWeek);
    activeMonday.setDate(activeMonday.getDate() + (this.activeDemandWeekIndex * 7));
    this.activeDemandWeekStr = formatDate(activeMonday);
    const activeDates = getDayDates(this.activeDemandWeekStr);
    if (this.demandIndicator) {
      this.demandIndicator.textContent = `Demanda para: Semana ${this.activeDemandWeekIndex + 1} (${activeDates[0].date} - ${activeDates[6].date})`;
    }

    this.demandWeeksNav.querySelectorAll('.week-pill').forEach(el => {
      el.addEventListener('click', () => {
        const btn = /** @type {HTMLButtonElement} */ (el);
        const targetIdx = parseInt(btn.dataset.index || '0');
        const targetWeek = btn.dataset.week || '';
        if (targetIdx === this.activeDemandWeekIndex) return;

        if (onSelectWeek) {
          onSelectWeek({ targetIndex: targetIdx, targetWeek });
        }
      });
    });
  }

  /**
   * @param {number} targetIndex
   * @param {string} targetWeek
   */
  updateActivePill(targetIndex, targetWeek) {
    this.activeDemandWeekIndex = targetIndex;
    this.activeDemandWeekStr = targetWeek;

    if (this.demandWeeksNav) {
      this.demandWeeksNav.querySelectorAll('.week-pill').forEach(p => p.classList.remove('active'));
      const activeBtn = this.demandWeeksNav.querySelector(`.week-pill[data-index="${targetIndex}"]`);
      if (activeBtn) activeBtn.classList.add('active');
    }

    if (this.demandIndicator) {
      const tDates = getDayDates(targetWeek);
      this.demandIndicator.textContent = `Demanda para: Semana ${targetIndex + 1} (${tDates[0].date} - ${tDates[6].date})`;
    }
  }
}

export const demandView = new DemandView();
