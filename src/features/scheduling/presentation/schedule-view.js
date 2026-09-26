import { escapeHtml } from '../../../core/html.js';
import { getDayDates, formatDateLong } from '../../../core/date.js';

/**
 * @typedef {Object} DayDateInfo
 * @property {string} name
 * @property {string} date
 */

/**
 * @typedef {Object} WeekScheduleData
 * @property {string[][]} matrix
 * @property {string[]} employees
 * @property {string} weekStart
 */

export class ScheduleView {
  constructor() {
    /** @type {HTMLElement|null} */
    this.configPanel = null;
    /** @type {HTMLElement|null} */
    this.schedulePanel = null;
    /** @type {HTMLElement|null} */
    this.scheduleBody = null;
    /** @type {HTMLElement|null} */
    this.pdfContainer = null;
    /** @type {string[][]|null} */
    this.currentMatrix = null;
    /** @type {string[]|null} */
    this.currentEmployees = null;
    /** @type {string|null} */
    this.currentWeekStart = null;
  }

  init() {
    this.configPanel = document.getElementById('config-panel');
    this.schedulePanel = document.getElementById('schedule-panel');
    this.scheduleBody = document.getElementById('schedule-body');
    this.pdfContainer = document.getElementById('pdf-container');
  }

  showConfig() {
    if (this.configPanel) this.configPanel.hidden = false;
    if (this.schedulePanel) this.schedulePanel.hidden = true;
  }

  showSchedule() {
    if (this.configPanel) this.configPanel.hidden = true;
    if (this.schedulePanel) this.schedulePanel.hidden = false;
  }

  isScheduleVisible() {
    return this.schedulePanel ? !this.schedulePanel.hidden : false;
  }

  /**
   * @param {string} weekStart
   */
  updateWeekBadge(weekStart) {
    const badge = document.getElementById('schedule-week-badge');
    if (badge && weekStart) {
      badge.textContent = `Semana del ${formatDateLong(weekStart)}`;
    }
  }

  /**
   * @param {Object} params
   * @param {string[][]} params.matrix
   * @param {string[]} params.employees
   * @param {string} params.weekStart
   * @param {(change: { empIdx: number, dayIndex: number, newShift: string }) => void} [params.onShiftChange]
   */
  renderSchedule({ matrix, employees, weekStart, onShiftChange }) {
    this.currentMatrix = matrix;
    this.currentEmployees = employees;
    this.currentWeekStart = weekStart;

    const dayInfo = getDayDates(this.currentWeekStart);

    // 1. Render Table Header: Turno + Day names & dates
    const headRow = document.getElementById('schedule-head-row');
    if (headRow) {
      headRow.innerHTML = '<th class="col-shift">Turno</th>';
      dayInfo.forEach(d => {
        const th = document.createElement('th');
        th.className = 'day-col-header';
        th.innerHTML = `
          <div class="day-header-name">${escapeHtml(d.name)}</div>
          <div class="day-header-date">${escapeHtml(d.date)}</div>
        `;
        headRow.appendChild(th);
      });
    }

    // Update schedule week badge
    this.updateWeekBadge(this.currentWeekStart);

    // 2. Render Table Body: 3 rows (Mañana, Tarde, Libre)
    if (!this.scheduleBody) return;
    this.scheduleBody.innerHTML = '';
    const shiftDefs = [
      { key: 'M', label: 'Mañana', cssClass: 'morning' },
      { key: 'T', label: 'Tarde', cssClass: 'afternoon' },
      { key: 'L', label: 'Libre', cssClass: 'free' },
    ];

    shiftDefs.forEach(shift => {
      const tr = document.createElement('tr');

      // Shift Label Column
      const tdLabel = document.createElement('td');
      tdLabel.className = `row-label row-label--${shift.cssClass}`;
      tdLabel.textContent = shift.label;
      tr.appendChild(tdLabel);

      // 7 Day Columns
      for (let d = 0; d < 7; d++) {
        const td = document.createElement('td');
        td.className = `shift-cell shift-cell--${shift.cssClass}`;

        const listContainer = document.createElement('div');
        listContainer.className = 'employee-pill-list';

        const assignedEmps = [];
        for (let emp = 0; emp < employees.length; emp++) {
          if (matrix[emp] && matrix[emp][d] === shift.key) {
            assignedEmps.push(emp);
          }
        }

        if (assignedEmps.length === 0) {
          const emptySpan = document.createElement('span');
          emptySpan.className = 'empty-shift-notice';
          emptySpan.textContent = '—';
          listContainer.appendChild(emptySpan);
        } else {
          assignedEmps.forEach(empIdx => {
            const pill = document.createElement('div');
            pill.className = `employee-pill employee-pill--${shift.cssClass}`;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'employee-pill-name';
            nameSpan.textContent = employees[empIdx];
            nameSpan.title = employees[empIdx];
            pill.appendChild(nameSpan);

            // Shift selector for manual changes
            const select = document.createElement('select');
            select.className = 'employee-shift-select';
            select.dataset.emp = String(empIdx);
            select.dataset.day = String(d);
            select.title = 'Cambiar turno';

            ['M', 'T', 'L'].forEach(val => {
              const opt = document.createElement('option');
              opt.value = val;
              opt.textContent = val;
              if (val === shift.key) opt.selected = true;
              select.appendChild(opt);
            });

            select.addEventListener('change', (e) => {
              const target = /** @type {HTMLSelectElement} */ (e.target);
              const newShift = target.value;
              if (this.currentMatrix) {
                this.currentMatrix[empIdx][d] = newShift;
              }
              if (onShiftChange) {
                onShiftChange({ empIdx, dayIndex: d, newShift });
              }
            });

            pill.appendChild(select);
            listContainer.appendChild(pill);
          });
        }

        td.appendChild(listContainer);
        tr.appendChild(td);
      }

      this.scheduleBody.appendChild(tr);
    });
  }

  /**
   * @returns {string[][]}
   */
  getScheduleFromDOM() {
    if (this.currentMatrix) {
      return this.currentMatrix;
    }
    if (!this.scheduleBody) return [];
    const selects = /** @type {NodeListOf<HTMLSelectElement>} */ (this.scheduleBody.querySelectorAll('.employee-shift-select'));
    let maxEmp = 0;
    selects.forEach(s => {
      const emp = parseInt(s.dataset.emp || '0');
      if (emp > maxEmp) maxEmp = emp;
    });
    const matrix = Array.from({ length: maxEmp + 1 }, () => Array(7).fill('L'));
    selects.forEach(s => {
      const emp = parseInt(s.dataset.emp || '0');
      const day = parseInt(s.dataset.day || '0');
      matrix[emp][day] = s.value;
    });
    return matrix;
  }

  /**
   * @param {string[][]} matrix
   * @param {string[]} employees
   * @param {string} weekStart
   * @returns {HTMLElement}
   */
  renderSingleWeekHTML(matrix, employees, weekStart) {
    const dayInfo = getDayDates(weekStart);

    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-week-wrapper';
    wrapper.style.marginBottom = '30px';

    const header = document.createElement('div');
    header.className = 'pdf-header';
    header.innerHTML = `
      <h1>Cuadrante de Turnos Semanal</h1>
      <p>Semana del ${escapeHtml(formatDateLong(weekStart))}</p>
    `;
    wrapper.appendChild(header);

    const table = document.createElement('table');
    table.className = 'pdf-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.innerHTML = '<th class="pdf-col-shift">Turno</th>';
    dayInfo.forEach(d => {
      const th = document.createElement('th');
      th.innerHTML = `
        <div class="pdf-header-name">${escapeHtml(d.name)}</div>
        <div class="pdf-header-date">${escapeHtml(d.date)}</div>
      `;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const shiftDefs = [
      { key: 'M', label: 'Mañana', cssClass: 'morning' },
      { key: 'T', label: 'Tarde', cssClass: 'afternoon' },
      { key: 'L', label: 'Libre', cssClass: 'free' },
    ];

    shiftDefs.forEach(shift => {
      const tr = document.createElement('tr');
      const tdLabel = document.createElement('td');
      tdLabel.className = `pdf-row-label pdf-row-label--${shift.cssClass}`;
      tdLabel.textContent = shift.label;
      tr.appendChild(tdLabel);

      for (let d = 0; d < 7; d++) {
        const td = document.createElement('td');
        td.className = `pdf-shift-cell pdf-cell-${shift.cssClass}`;

        const assignedEmps = [];
        for (let emp = 0; emp < employees.length; emp++) {
          if (matrix[emp] && matrix[emp][d] === shift.key) {
            assignedEmps.push(employees[emp]);
          }
        }

        if (assignedEmps.length === 0) {
          const empty = document.createElement('span');
          empty.className = 'pdf-empty';
          empty.textContent = '—';
          td.appendChild(empty);
        } else {
          assignedEmps.forEach(name => {
            const div = document.createElement('div');
            div.className = 'pdf-emp-name';
            div.textContent = name;
            td.appendChild(div);
          });
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);

    return wrapper;
  }

  /**
   * @param {WeekScheduleData[]} weeksData
   */
  renderMultiWeekPDF(weeksData) {
    if (!this.pdfContainer) return;
    this.pdfContainer.innerHTML = '';

    weeksData.forEach((w, index) => {
      const el = this.renderSingleWeekHTML(w.matrix, w.employees, w.weekStart);
      if (index > 0) {
        el.style.pageBreakBefore = 'always';
      }
      this.pdfContainer?.appendChild(el);
    });
  }

  /**
   * @param {string[][]} matrix
   * @param {string[]} employees
   * @param {string} weekStart
   */
  renderPDF(matrix, employees, weekStart) {
    this.renderMultiWeekPDF([{ matrix, employees, weekStart }]);
  }
}

export const scheduleView = new ScheduleView();
