import { Auditor } from "./auditor.js";

import {
  STORAGE_KEYS,
  DAYS_FULL,
  DAYS,
  ROTATING_OFF_PATTERN,
  DEFAULT_EMPLOYEE_NAMES,
  DEFAULT_EMPLOYEES,
  DEFAULT_EMPLOYEE_PATTERNS,
  DEFAULT_EMPLOYEE_SHIFT_MODES,
  CYCLE_8,
  DEFAULT_CYCLE_POSITIONS,
} from './constants.js';
import { Storage } from './storage.js';
import { Toast } from './toast.js';
export const Renderer = {
  init() {
    this.configPanel = document.getElementById('config-panel');
    this.schedulePanel = document.getElementById('schedule-panel');
    this.weekStartInput = document.getElementById('week-start');
    this.employeeCountInput = document.getElementById('employee-count');
    this.employeeNamesContainer = document.getElementById('employee-names');
    this.scheduleBody = document.getElementById('schedule-body');
    this.pdfContainer = document.getElementById('pdf-container');
  },

  showConfig() {
    this.configPanel.hidden = false;
    this.schedulePanel.hidden = true;
  },

  showSchedule() {
    this.configPanel.hidden = true;
    this.schedulePanel.hidden = false;
  },

  setDefaultWeekStart() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Find next Monday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    this.weekStartInput.value = this._formatDate(nextMonday);
  },

  _getWeeksDiff(dateStr1, dateStr2) {
    if (!dateStr1 || !dateStr2) return 0;
    const m1 = this.getMonday(dateStr1);
    const m2 = this.getMonday(dateStr2);
    if (!m1 || !m2) return 0;
    const utc1 = Date.UTC(m1.getFullYear(), m1.getMonth(), m1.getDate());
    const utc2 = Date.UTC(m2.getFullYear(), m2.getMonth(), m2.getDate());
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.round((utc2 - utc1) / msPerWeek);
  },

  getEffectivePatternWeek(empIndex, weekStartStr) {
    const baseWeek = Storage.loadBaseWeek() || (this.weekStartInput ? this.weekStartInput.value : '');
    const savedPatterns = Storage.loadPatterns();
    if (savedPatterns && savedPatterns[empIndex] !== undefined) {
      const basePattern = savedPatterns[empIndex] || ((empIndex % 7) + 1);
      if (!baseWeek || !weekStartStr) return basePattern;
      const diffWeeks = this._getWeeksDiff(baseWeek, weekStartStr);
      return (((basePattern - 1 + diffWeeks) % 7) + 7) % 7 + 1;
    }
    const initialPos = DEFAULT_CYCLE_POSITIONS[empIndex] !== undefined ? DEFAULT_CYCLE_POSITIONS[empIndex] : (empIndex % 8);
    if (!baseWeek || !weekStartStr) return CYCLE_8[initialPos];
    const diffWeeks = this._getWeeksDiff(baseWeek, weekStartStr);
    const pos = (((initialPos + diffWeeks) % 8) + 8) % 8;
    return CYCLE_8[pos];
  },

  getEffectivePatternWeeks(weekStartStr) {
    const count = parseInt(this.employeeCountInput ? this.employeeCountInput.value : DEFAULT_EMPLOYEES) || DEFAULT_EMPLOYEES;
    const weeks = [];
    for (let i = 0; i < count; i++) {
      weeks.push(this.getEffectivePatternWeek(i, weekStartStr));
    }
    return weeks;
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
    const newBasePattern = (((effectiveWeek - 1 - diffWeeks) % 7) + 7) % 7 + 1;
    currentPatterns[empIndex] = newBasePattern;
    Storage.savePatterns(currentPatterns);
  },

  getEffectiveShiftMode(empIndex, weekStartStr) {
    if (empIndex === 0) return '5M0T';
    const baseWeek = Storage.loadBaseWeek() || (this.weekStartInput ? this.weekStartInput.value : '');
    const savedModes = Storage.loadShiftModes() || DEFAULT_EMPLOYEE_SHIFT_MODES;
    let baseMode = savedModes[empIndex] || DEFAULT_EMPLOYEE_SHIFT_MODES[empIndex] || ((empIndex % 2 === 1) ? '3M2T' : '2M3T');
    if (baseMode === '5M0T' && empIndex > 0) {
      baseMode = (empIndex % 2 === 1) ? '3M2T' : '2M3T';
    }
    if (!baseWeek || !weekStartStr) return baseMode;
    const diffWeeks = this._getWeeksDiff(baseWeek, weekStartStr);
    if (Math.abs(diffWeeks) % 2 === 0) {
      return baseMode;
    } else {
      return baseMode === '3M2T' ? '2M3T' : '3M2T';
    }
  },

  getEffectiveShiftTargets(weekStartStr) {
    const count = parseInt(this.employeeCountInput ? this.employeeCountInput.value : DEFAULT_EMPLOYEES) || DEFAULT_EMPLOYEES;
    const targets = [];
    for (let i = 0; i < count; i++) {
      const mode = this.getEffectiveShiftMode(i, weekStartStr);
      if (mode === '5M0T') {
        targets.push({ m: 5, t: 0, mode });
      } else if (mode === '3M2T') {
        targets.push({ m: 3, t: 2, mode });
      } else {
        targets.push({ m: 2, t: 3, mode });
      }
    }
    return targets;
  },

  renderGeneratedWeeksNav(weeks, currentWeek) {
    const nav = document.getElementById('generated-weeks-nav');
    if (!nav) return;
    if (!weeks || weeks.length <= 1) {
      nav.hidden = true;
      nav.innerHTML = '';
      return;
    }
    nav.hidden = false;
    nav.innerHTML = weeks.map((w, idx) => {
      const dates = this._getDayDates(w);
      const startStr = `${dates[0].date.split('/')[0]}/${dates[0].date.split('/')[1]}`;
      const endStr = `${dates[6].date.split('/')[0]}/${dates[6].date.split('/')[1]}`;
      const isActive = (w === currentWeek);
      return `<button type="button" class="week-pill ${isActive ? 'active' : ''}" data-week="${w}">
        Semana ${idx + 1} (${startStr} - ${endStr})
      </button>`;
    }).join('');

    nav.querySelectorAll('.week-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const week = btn.dataset.week;
        if (window.App && window.App.navigateToWeek) {
          window.App.navigateToWeek(week);
        }
      });
    });
  },

  updateShiftBadges() {
    const weekStart = this.weekStartInput ? this.weekStartInput.value : '';
    if (!this.employeeNamesContainer) return;
    const cards = this.employeeNamesContainer.querySelectorAll('.employee-card');
    cards.forEach((card, i) => {
      const badge = card.querySelector('.emp-shifts-badge');
      if (badge) {
        const effectiveShiftMode = this.getEffectiveShiftMode(i, weekStart);
        const shiftLabel = (i === 0) 
          ? 'Solo Mañana (5M / 0T)' 
          : (effectiveShiftMode === '3M2T' ? '3 Mañanas + 2 Tardes' : '2 Mañanas + 3 Tardes');
        const shiftTagClass = (i === 0) ? 'emp-shifts-badge--morning' : (effectiveShiftMode === '3M2T' ? 'emp-shifts-badge--3m2t' : 'emp-shifts-badge--2m3t');
        badge.className = `emp-shifts-badge ${shiftTagClass}`;
        badge.textContent = shiftLabel;
      }
    });
  },

  updatePatternSelects() {
    const weekStart = this.weekStartInput ? this.weekStartInput.value : '';
    if (!this.employeeNamesContainer) return;
    const selects = this.employeeNamesContainer.querySelectorAll('.emp-pattern-select');
    selects.forEach(sel => {
      const idx = parseInt(sel.dataset.index);
      const eff = this.getEffectivePatternWeek(idx, weekStart);
      sel.value = eff;
    });
    this.updateShiftBadges();
  },

  renderEmployeeNames(count, savedNames) {
    this.employeeNamesContainer.innerHTML = '';
    const weekStart = this.weekStartInput ? this.weekStartInput.value : '';
    for (let i = 0; i < count; i++) {
      const defaultName = DEFAULT_EMPLOYEE_NAMES[i] || `Empleado ${i + 1}`;
      let currentName = defaultName;
      if (savedNames && savedNames[i] && savedNames[i] !== `Empleado ${i + 1}`) {
        currentName = savedNames[i];
      }
      const effectiveWeek = this.getEffectivePatternWeek(i, weekStart);
      const effectiveShiftMode = this.getEffectiveShiftMode(i, weekStart);
      const shiftLabel = (i === 0) 
        ? 'Solo Mañana (5M / 0T)' 
        : (effectiveShiftMode === '3M2T' ? '3 Mañanas + 2 Tardes' : '2 Mañanas + 3 Tardes');
      const shiftTagClass = (i === 0) ? 'emp-shifts-badge--morning' : (effectiveShiftMode === '3M2T' ? 'emp-shifts-badge--3m2t' : 'emp-shifts-badge--2m3t');

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
               value="${this._escapeHtml(currentName)}"
               placeholder="${this._escapeHtml(defaultName)}">
        <div class="emp-pattern-group">
          <label for="emp-pattern-${i}" class="emp-pattern-label">Patrón rotativo:</label>
          <select id="emp-pattern-${i}" class="emp-pattern-select" data-index="${i}">
            ${patternOptions}
          </select>
        </div>
        <div class="emp-shift-group">
          <span class="emp-shift-label">Turnos semanales:</span>
          <span class="emp-shifts-badge ${shiftTagClass}">${this._escapeHtml(shiftLabel)}</span>
        </div>
      `;
      this.employeeNamesContainer.appendChild(div);
    }

    // Attach change listener to pattern selects
    this.employeeNamesContainer.querySelectorAll('.emp-pattern-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        const val = parseInt(e.target.value);
        const currentWeek = this.weekStartInput ? this.weekStartInput.value : '';
        this.setEmployeePatternForWeek(idx, val, currentWeek);
        const empName = this.getEmployeeNames()[idx] || `Empleado ${idx + 1}`;
        Toast.show(`Patrón de ${empName}: Semana ${val} (${ROTATING_OFF_PATTERN[val-1].label})`, 'info', 2500);
      });
    });
  },

  getEmployeeNames() {
    const inputs = this.employeeNamesContainer.querySelectorAll('.emp-name-input');
    return Array.from(inputs).map(input => {
      const idx = parseInt(input.dataset.index);
      const defaultName = DEFAULT_EMPLOYEE_NAMES[idx] || `Empleado ${idx + 1}`;
      return input.value.trim() || defaultName;
    });
  },

  loadDemandConfig(demand) {
    if (!demand) return;
    document.querySelectorAll('.demand-input').forEach(input => {
      const shift = input.dataset.shift;
      const day = parseInt(input.dataset.day);
      if (demand[shift] && demand[shift][day] !== undefined) {
        let val = demand[shift][day];
        if (day >= 4 && val < 3) val = 3;
        else if (val < 2) val = 2;
        input.value = val;
      }
    });
  },

  getDemandConfig() {
    const demand = { morning: [], afternoon: [] };
    document.querySelectorAll('.demand-input').forEach(input => {
      const shift = input.dataset.shift;
      const day = parseInt(input.dataset.day);
      demand[shift][day] = parseInt(input.value) || 0;
    });
    return demand;
  },

  activeDemandWeekIndex: 0,
  activeDemandWeekStr: null,

  getActiveDemandWeekStr() {
    const startWeek = this.weekStartInput ? this.weekStartInput.value : '';
    if (!startWeek) return '';
    const monday = this.getMonday(startWeek);
    if (!monday) return startWeek;
    monday.setDate(monday.getDate() + (this.activeDemandWeekIndex * 7));
    return this._formatDate(monday);
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
    const nav = document.getElementById('demand-weeks-nav');
    const actions = document.getElementById('demand-actions');
    const indicator = document.getElementById('demand-active-indicator');
    const weeksCountSelect = document.getElementById('weeks-count');
    const weeksCount = parseInt(weeksCountSelect ? weeksCountSelect.value : '1') || 1;
    const startWeek = this.weekStartInput ? this.weekStartInput.value : '';

    if (!nav || !startWeek) return;

    if (weeksCount <= 1) {
      nav.hidden = true;
      nav.innerHTML = '';
      if (actions) actions.hidden = true;
      if (indicator) indicator.hidden = true;
      this.activeDemandWeekIndex = 0;
      this.activeDemandWeekStr = startWeek;
      return;
    }

    nav.hidden = false;
    if (actions) actions.hidden = false;
    if (indicator) indicator.hidden = false;

    if (this.activeDemandWeekIndex >= weeksCount || this.activeDemandWeekIndex < 0) {
      this.activeDemandWeekIndex = 0;
    }

    const pillsHtml = [];
    for (let w = 0; w < weeksCount; w++) {
      const monday = this.getMonday(startWeek);
      monday.setDate(monday.getDate() + (w * 7));
      const weekStr = this._formatDate(monday);
      const dates = this._getDayDates(weekStr);
      const startStr = `${dates[0].date.split('/')[0]}/${dates[0].date.split('/')[1]}`;
      const endStr = `${dates[6].date.split('/')[0]}/${dates[6].date.split('/')[1]}`;
      const isActive = (w === this.activeDemandWeekIndex);
      pillsHtml.push(`
        <button type="button" class="week-pill ${isActive ? 'active' : ''}" data-index="${w}" data-week="${weekStr}">
          Semana ${w + 1} (${startStr} - ${endStr})
        </button>
      `);
    }
    nav.innerHTML = pillsHtml.join('');

    const activeMonday = this.getMonday(startWeek);
    activeMonday.setDate(activeMonday.getDate() + (this.activeDemandWeekIndex * 7));
    this.activeDemandWeekStr = this._formatDate(activeMonday);
    const activeDates = this._getDayDates(this.activeDemandWeekStr);
    if (indicator) {
      indicator.textContent = `Demanda para: Semana ${this.activeDemandWeekIndex + 1} (${activeDates[0].date} - ${activeDates[6].date})`;
    }

    nav.querySelectorAll('.week-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetIdx = parseInt(btn.dataset.index);
        const targetWeek = btn.dataset.week;
        if (targetIdx === this.activeDemandWeekIndex) return;

        // 1. Guardar demanda de la semana actual antes de cambiar
        if (this.activeDemandWeekStr) {
          Storage.saveDemandForWeek(this.activeDemandWeekStr, this.getDemandConfig());
        }

        // 2. Cambiar a la nueva semana
        this.activeDemandWeekIndex = targetIdx;
        this.activeDemandWeekStr = targetWeek;

        // 3. Cargar demanda de la semana seleccionada
        const targetDemand = Storage.loadDemandForWeek(targetWeek) || this.getDemandConfig();
        this.loadDemandConfig(targetDemand);

        // 4. Actualizar botones e indicador
        nav.querySelectorAll('.week-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        if (indicator) {
          const tDates = this._getDayDates(targetWeek);
          indicator.textContent = `Demanda para: Semana ${targetIdx + 1} (${tDates[0].date} - ${tDates[6].date})`;
        }
      });
    });
  },

  renderSchedule(matrix, employees, weekStart) {
    this.currentMatrix = matrix;
    this.currentEmployees = employees;
    this.currentWeekStart = weekStart || this.weekStartInput.value;

    const dayInfo = this._getDayDates(this.currentWeekStart);

    // 1. Render Table Header: Turno + Day names & dates
    const headRow = document.getElementById('schedule-head-row');
    if (headRow) {
      headRow.innerHTML = '<th class="col-shift">Turno</th>';
      dayInfo.forEach(d => {
        const th = document.createElement('th');
        th.className = 'day-col-header';
        th.innerHTML = `
          <div class="day-header-name">${d.name}</div>
          <div class="day-header-date">${d.date}</div>
        `;
        headRow.appendChild(th);
      });
    }

    // Update schedule week badge
    const badge = document.getElementById('schedule-week-badge');
    if (badge) {
      badge.textContent = `Semana del ${this._formatDateLong(this.currentWeekStart)}`;
    }

    // 2. Render Table Body: 3 rows (Mañana, Tarde, Libre)
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
            select.dataset.emp = empIdx;
            select.dataset.day = d;
            select.title = 'Cambiar turno';

            ['M', 'T', 'L'].forEach(val => {
              const opt = document.createElement('option');
              opt.value = val;
              opt.textContent = val;
              if (val === shift.key) opt.selected = true;
              select.appendChild(opt);
            });

            select.addEventListener('change', (e) => {
              const newShift = e.target.value;
              this.currentMatrix[empIdx][d] = newShift;
              Storage.saveSchedule(this.currentWeekStart, this.currentMatrix);
              this.renderSchedule(this.currentMatrix, this.currentEmployees, this.currentWeekStart);
              this.renderPDF(this.currentMatrix, this.currentEmployees, this.currentWeekStart);
              Toast.show('Turno actualizado y balance recalculado.', 'info', 2000);
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

    // 3. Update Live Audit & Balance panel
    const weekDemand = Storage.loadDemandForWeek(this.currentWeekStart) || this.getDemandForWeek(this.currentWeekStart);
    Auditor.run(this.currentMatrix, this.currentEmployees, weekDemand, this.currentWeekStart);

    // 4. Update multi-week nav pills
    const genWeeks = Storage.loadGeneratedWeeks();
    if (genWeeks && genWeeks.length > 1) {
      this.renderGeneratedWeeksNav(genWeeks, this.currentWeekStart);
    }
  },

  getScheduleFromDOM() {
    if (this.currentMatrix) {
      return this.currentMatrix;
    }
    const selects = this.scheduleBody.querySelectorAll('.employee-shift-select');
    let maxEmp = 0;
    selects.forEach(s => {
      const emp = parseInt(s.dataset.emp);
      if (emp > maxEmp) maxEmp = emp;
    });
    const matrix = Array.from({ length: maxEmp + 1 }, () => Array(7).fill('L'));
    selects.forEach(s => {
      const emp = parseInt(s.dataset.emp);
      const day = parseInt(s.dataset.day);
      matrix[emp][day] = s.value;
    });
    return matrix;
  },
  renderSingleWeekHTML(matrix, employees, weekStart) {
    const start = weekStart || this.weekStartInput.value;
    const dayInfo = this._getDayDates(start);

    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-week-wrapper';
    wrapper.style.marginBottom = '30px';

    const header = document.createElement('div');
    header.className = 'pdf-header';
    header.innerHTML = `
      <h1>Cuadrante de Turnos Semanal</h1>
      <p>Semana del ${this._formatDateLong(start)}</p>
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
        <div class="pdf-header-name">${d.name}</div>
        <div class="pdf-header-date">${d.date}</div>
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
  },

  renderMultiWeekPDF(weeksData) {
    if (!this.pdfContainer) return;
    this.pdfContainer.innerHTML = '';
    
    weeksData.forEach((w, index) => {
      const el = this.renderSingleWeekHTML(w.matrix, w.employees, w.weekStart);
      if (index > 0) {
        // Force a page break for multi-week PDFs so they don't overlap awkwardly
        el.style.pageBreakBefore = 'always';
      }
      this.pdfContainer.appendChild(el);
    });
  },

  renderPDF(matrix, employees, weekStart) {
    // Keep backward compatibility for single-week live updates
    this.renderMultiWeekPDF([{ matrix, employees, weekStart }]);
  },

  getMonday(dateOrStr) {
    if (!dateOrStr) return null;
    let d;
    if (typeof dateOrStr === 'string') {
      const parts = dateOrStr.split('-');
      if (parts.length === 3) {
        d = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        d = new Date(dateOrStr);
      }
    } else {
      d = new Date(dateOrStr);
    }
    const day = d.getDay();
    // 0 es Domingo (-6 días hasta el lunes anterior), 1 es Lunes (0), 2 es Martes (-1), etc.
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  },

  normalizeToMonday(dateStr) {
    if (!dateStr) return '';
    const monday = this.getMonday(dateStr);
    return this._formatDate(monday);
  },

  _getDayDates(weekStartStr) {
    const base = weekStartStr ? this.getMonday(weekStartStr) : this.getMonday(new Date());
    const dates = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(base);
      cur.setDate(base.getDate() + d);
      const dayNum = String(cur.getDate()).padStart(2, '0');
      const monthNum = String(cur.getMonth() + 1).padStart(2, '0');
      dates.push({
        name: DAYS_FULL[d],
        short: DAYS[d],
        date: `${dayNum}/${monthNum}`,
        fullDate: `${dayNum}/${monthNum}/${cur.getFullYear()}`,
      });
    }
    return dates;
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  _formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  _formatDateLong(dateStr) {
    const monday = this.getMonday(dateStr);
    if (!monday) return '';
    return monday.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  },
};

/* ============================================
   MODULE: Exporter
   ============================================ */