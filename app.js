/* ============================================
   CONSTANTS
   ============================================ */
const STORAGE_KEYS = {
  NAMES: 'turnos_employee_names',
  CONFIG: 'turnos_config',
  SCHEDULE: 'turnos_schedule',
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MIN_EMPLOYEES = 8;
const DEFAULT_EMPLOYEES = 8;
const DAYS_OFF_PER_EMPLOYEE = 2;

/* ============================================
   MODULE: Storage
   ============================================ */
const Storage = {
  saveNames(names) {
    localStorage.setItem(STORAGE_KEYS.NAMES, JSON.stringify(names));
  },

  loadNames() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.NAMES));
    } catch {
      return null;
    }
  },

  saveConfig(config) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },

  loadConfig() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG));
    } catch {
      return null;
    }
  },

  saveSchedule(schedule) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
  },

  loadSchedule() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULE));
    } catch {
      return null;
    }
  },

  clearSchedule() {
    localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
  },
};

/* ============================================
   MODULE: Scheduler Engine
   ============================================ */
const Scheduler = {
  /**
   * Generate a schedule matrix.
   * Returns { success: boolean, matrix: Array, error: string }
   * matrix[empIndex][dayIndex] = 'M' | 'T' | 'L'
   */
  generate(employees, demand) {
    const n = employees.length;
    if (n < MIN_EMPLOYEES) {
      return { success: false, error: `Se necesitan al menos ${MIN_EMPLOYEES} empleados.` };
    }

    // Build demand arrays: demandM[day], demandT[day]
    const demandM = [];
    const demandT = [];
    let totalDemand = 0;
    for (let d = 0; d < 7; d++) {
      demandM[d] = demand.morning[d] || 0;
      demandT[d] = demand.afternoon[d] || 0;
      totalDemand += demandM[d] + demandT[d];
    }

    // Daily capacity check
    for (let d = 0; d < 7; d++) {
      if (demandM[d] + demandT[d] > n) {
        return {
          success: false,
          error: `La demanda del ${DAYS_FULL[d]} (${demandM[d] + demandT[d]} turnos) supera la cantidad total de empleados (${n}).`,
        };
      }
    }

    // Total capacity: each employee works (7 - DAYS_OFF_PER_EMPLOYEE) days
    const workDaysPerEmployee = 7 - DAYS_OFF_PER_EMPLOYEE;
    const totalCapacity = n * workDaysPerEmployee;

    if (totalDemand > totalCapacity) {
      return {
        success: false,
        error: `La demanda total (${totalDemand} turnos) supera la capacidad disponible (${totalCapacity} turnos con ${DAYS_OFF_PER_EMPLOYEE} libres por empleado).`,
      };
    }

    // Initialize matrix with null (unset)
    const matrix = Array.from({ length: n }, () => Array(7).fill(null));
    const offCount = Array(7).fill(0); // how many employees are off per day

    // ---- PHASE 1: Emp 1 & 2 (index 0, 1) ----
    // Key employees: restricted to Morning only and take off together on lowest demand days
    const dayDemand = [];
    for (let d = 0; d < 7; d++) {
      dayDemand[d] = { day: d, total: demandM[d] + demandT[d] };
    }
    dayDemand.sort((a, b) => a.total - b.total);
    const offDaysEmp12 = [dayDemand[0].day, dayDemand[1].day];

    for (const d of offDaysEmp12) {
      matrix[0][d] = 'L';
      matrix[1][d] = 'L';
      offCount[d] += 2;
    }

    // Emp 1 & 2 work Morning on their working days
    for (let d = 0; d < 7; d++) {
      if (matrix[0][d] === null) matrix[0][d] = 'M';
      if (matrix[1][d] === null) matrix[1][d] = 'M';
    }

    // ---- PHASE 2: Distribute off days for Emp 3..N (indices 2 to n - 1) ----
    const maxRemainingOffPerDay = [];
    for (let d = 0; d < 7; d++) {
      const maxTotalOff = Math.max(0, n - (demandM[d] + demandT[d]));
      maxRemainingOffPerDay[d] = Math.max(0, maxTotalOff - offCount[d]);
    }

    // Assign off days to remaining employees
    const offAssigned = Array(7).fill(0);

    for (let emp = 2; emp < n; emp++) {
      let daysOff = 0;
      const candidates = [];
      for (let d = 0; d < 7; d++) {
        const remaining = maxRemainingOffPerDay[d] - offAssigned[d];
        if (remaining > 0) {
          candidates.push({ day: d, remaining });
        }
      }
      candidates.sort((a, b) => b.remaining - a.remaining);

      for (const c of candidates) {
        if (daysOff >= DAYS_OFF_PER_EMPLOYEE) break;
        matrix[emp][c.day] = 'L';
        offAssigned[c.day]++;
        offCount[c.day]++;
        daysOff++;
      }

      if (daysOff < DAYS_OFF_PER_EMPLOYEE) {
        // Fallback if demand distribution is tight
        for (let d = 0; d < 7 && daysOff < DAYS_OFF_PER_EMPLOYEE; d++) {
          if (matrix[emp][d] === null) {
            matrix[emp][d] = 'L';
            offCount[d]++;
            daysOff++;
          }
        }
      }

      if (daysOff < DAYS_OFF_PER_EMPLOYEE) {
        return {
          success: false,
          error: `No se pueden asignar ${DAYS_OFF_PER_EMPLOYEE} días libres al empleado ${employees[emp]}. La demanda es demasiado alta.`,
        };
      }
    }

    // ---- PHASE 3: Assign M/T for remaining employees ----
    const mCount = Array(n).fill(0);
    const tCount = Array(n).fill(0);

    // Register shifts already assigned to Emp 1 & 2
    for (let emp = 0; emp < 2; emp++) {
      for (let d = 0; d < 7; d++) {
        if (matrix[emp][d] === 'M') mCount[emp]++;
      }
    }

    // For each day, assign shifts to remaining employees
    for (let d = 0; d < 7; d++) {
      // Accurately count morning and afternoon shifts already assigned on day d
      let mAssigned = 0;
      let tAssigned = 0;
      for (let emp = 0; emp < 2; emp++) {
        if (matrix[emp][d] === 'M') mAssigned++;
        else if (matrix[emp][d] === 'T') tAssigned++;
      }

      const workingEmps = [];
      for (let emp = 2; emp < n; emp++) {
        if (matrix[emp][d] === null) {
          workingEmps.push(emp);
        }
      }

      // Balance M and T: prioritize giving M to employees with fewer M relative to T
      workingEmps.sort((a, b) => (mCount[a] - tCount[a]) - (mCount[b] - tCount[b]));

      for (const emp of workingEmps) {
        if (mAssigned < demandM[d]) {
          matrix[emp][d] = 'M';
          mCount[emp]++;
          mAssigned++;
        } else if (tAssigned < demandT[d]) {
          matrix[emp][d] = 'T';
          tCount[emp]++;
          tAssigned++;
        } else {
          // Extra workers beyond exact demand: assign to balance employee workload
          if (mCount[emp] <= tCount[emp]) {
            matrix[emp][d] = 'M';
            mCount[emp]++;
            mAssigned++;
          } else {
            matrix[emp][d] = 'T';
            tCount[emp]++;
            tAssigned++;
          }
        }
      }
    }

    // ---- PHASE 4: Ergonomic optimization (avoid T -> M transitions) ----
    // Preserves strictly exact days off per employee and daily demand counts
    this._fixErgonomics(matrix, n);

    // Verify no nulls remain
    for (let emp = 0; emp < n; emp++) {
      for (let d = 0; d < 7; d++) {
        if (matrix[emp][d] === null) {
          matrix[emp][d] = 'L';
        }
      }
    }

    return { success: true, matrix, error: null };
  },

  _fixErgonomics(matrix, n) {
    const countViolations = (emp) => {
      let v = 0;
      for (let d = 0; d < 6; d++) {
        if (matrix[emp][d] === 'T' && matrix[emp][d + 1] === 'M') {
          v++;
        }
      }
      return v;
    };

    // Emp 1 & 2 are restricted to morning shifts only; eligible employees are index 2 to n-1
    const eligibleStart = 2;

    for (let pass = 0; pass < 5; pass++) {
      let improved = false;
      for (let emp1 = eligibleStart; emp1 < n; emp1++) {
        for (let d = 0; d < 6; d++) {
          if (matrix[emp1][d] === 'T' && matrix[emp1][d + 1] === 'M') {
            // Attempt 1: Swap shift on day d with another employee who works 'M' on day d
            for (let emp2 = eligibleStart; emp2 < n; emp2++) {
              if (emp1 === emp2) continue;
              // Both must be working shifts ('M' <-> 'T'), never touching 'L'
              if (matrix[emp2][d] === 'M') {
                const before = countViolations(emp1) + countViolations(emp2);
                matrix[emp1][d] = 'M';
                matrix[emp2][d] = 'T';
                const after = countViolations(emp1) + countViolations(emp2);

                if (after < before) {
                  improved = true;
                  break;
                } else {
                  // Revert swap
                  matrix[emp1][d] = 'T';
                  matrix[emp2][d] = 'M';
                }
              }
            }

            if (improved) break;

            // Attempt 2: Swap shift on day d+1 with another employee who works 'T' on day d+1
            for (let emp2 = eligibleStart; emp2 < n; emp2++) {
              if (emp1 === emp2) continue;
              // Both must be working shifts ('M' <-> 'T'), never touching 'L'
              if (matrix[emp2][d + 1] === 'T') {
                const before = countViolations(emp1) + countViolations(emp2);
                matrix[emp1][d + 1] = 'T';
                matrix[emp2][d + 1] = 'M';
                const after = countViolations(emp1) + countViolations(emp2);

                if (after < before) {
                  improved = true;
                  break;
                } else {
                  // Revert swap
                  matrix[emp1][d + 1] = 'M';
                  matrix[emp2][d + 1] = 'T';
                }
              }
            }

            if (improved) break;
          }
        }
      }

      if (!improved) break;
    }
  },
};

/* ============================================
   MODULE: Renderer
   ============================================ */
const Renderer = {
  init() {
    this.configPanel = document.getElementById('config-panel');
    this.schedulePanel = document.getElementById('schedule-panel');
    this.weekStartInput = document.getElementById('week-start');
    this.employeeCountInput = document.getElementById('employee-count');
    this.employeeNamesContainer = document.getElementById('employee-names');
    this.scheduleBody = document.getElementById('schedule-body');
    this.pdfBody = document.getElementById('pdf-body');
    this.pdfWeekRange = document.getElementById('pdf-week-range');
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

  renderEmployeeNames(count, savedNames) {
    this.employeeNamesContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const div = document.createElement('div');
      div.className = 'form-group';
      div.innerHTML = `
        <label for="emp-name-${i}">Empleado ${i + 1}</label>
        <input type="text" id="emp-name-${i}" data-index="${i}"
               value="${savedNames && savedNames[i] ? this._escapeHtml(savedNames[i]) : `Empleado ${i + 1}`}"
               placeholder="Nombre del empleado">
      `;
      this.employeeNamesContainer.appendChild(div);
    }
  },

  getEmployeeNames() {
    const inputs = this.employeeNamesContainer.querySelectorAll('input');
    return Array.from(inputs).map(input => input.value.trim() || `Empleado ${parseInt(input.dataset.index) + 1}`);
  },

  loadDemandConfig(demand) {
    document.querySelectorAll('.demand-input').forEach(input => {
      const shift = input.dataset.shift;
      const day = parseInt(input.dataset.day);
      if (demand[shift] && demand[shift][day] !== undefined) {
        input.value = demand[shift][day];
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
              Storage.saveSchedule(this.currentMatrix);
              this.renderSchedule(this.currentMatrix, this.currentEmployees, this.currentWeekStart);
              this.renderPDF(this.currentMatrix, this.currentEmployees, this.currentWeekStart);
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

  renderPDF(matrix, employees, weekStart) {
    const start = weekStart || this.weekStartInput.value;
    this.pdfWeekRange.textContent = `Semana del ${this._formatDateLong(start)}`;
    const dayInfo = this._getDayDates(start);

    // 1. Render PDF Header Row
    const pdfHeadRow = document.getElementById('pdf-head-row');
    if (pdfHeadRow) {
      pdfHeadRow.innerHTML = '<th class="pdf-col-shift">Turno</th>';
      dayInfo.forEach(d => {
        const th = document.createElement('th');
        th.innerHTML = `
          <div class="pdf-header-name">${d.name}</div>
          <div class="pdf-header-date">${d.date}</div>
        `;
        pdfHeadRow.appendChild(th);
      });
    }

    // 2. Render PDF Table Body: 3 rows (Mañana, Tarde, Libre)
    this.pdfBody.innerHTML = '';
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

      this.pdfBody.appendChild(tr);
    });
  },

  _getDayDates(weekStartStr) {
    let base;
    if (weekStartStr) {
      base = new Date(weekStartStr + 'T00:00:00');
    } else {
      base = new Date();
      const day = base.getDay();
      const diff = day === 0 ? 1 : (8 - day) % 7 || 7;
      base.setDate(base.getDate() + diff);
    }
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
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  },
};

/* ============================================
   MODULE: Exporter
   ============================================ */
const Exporter = {
  async exportToPDF(weekStart) {
    const container = document.getElementById('pdf-container');
    if (!container) return;

    const startDate = weekStart || (Renderer && Renderer.weekStartInput ? Renderer.weekStartInput.value : '');
    const filename = startDate ? `cuadrante-${startDate}.pdf` : 'cuadrante.pdf';

    const btnExport = document.getElementById('btn-export');
    const originalText = btnExport ? btnExport.textContent : '';
    if (btnExport) {
      btnExport.disabled = true;
      btnExport.textContent = 'Generando PDF...';
    }

    const opt = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    };

    try {
      await html2pdf().set(opt).from(container).save();
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Error al exportar el PDF. Inténtalo de nuevo.');
    } finally {
      if (btnExport) {
        btnExport.disabled = false;
        btnExport.textContent = originalText;
      }
    }
  },
};

/* ============================================
   APP INITIALIZATION
   ============================================ */
const App = {
  state: {
    employeeNames: [],
    weekStart: '',
  },

  init() {
    Renderer.init();
    this._bindEvents();
    this._enterApp();
  },

  _enterApp() {
    Renderer.showConfig();
    this._loadSavedState();
    Renderer.setDefaultWeekStart();
    if (this.state.weekStart) {
      Renderer.weekStartInput.value = this.state.weekStart;
    }
    Renderer.renderEmployeeNames(
      this.state.employeeNames.length || DEFAULT_EMPLOYEES,
      this.state.employeeNames
    );
    const config = Storage.loadConfig();
    if (config) {
      Renderer.loadDemandConfig(config.demand);
      if (config.employeeCount) {
        Renderer.employeeCountInput.value = config.employeeCount;
        if (!this.state.employeeNames.length) {
          Renderer.renderEmployeeNames(config.employeeCount, null);
        }
      }
    }
  },

  _loadSavedState() {
    const names = Storage.loadNames();
    if (names) this.state.employeeNames = names;
    const config = Storage.loadConfig();
    if (config) this.state.weekStart = config.weekStart;
  },

  _saveState() {
    const names = Renderer.getEmployeeNames();
    this.state.employeeNames = names;
    Storage.saveNames(names);

    const demand = Renderer.getDemandConfig();
    const config = {
      weekStart: Renderer.weekStartInput.value,
      employeeCount: parseInt(Renderer.employeeCountInput.value),
      demand,
    };
    this.state.weekStart = config.weekStart;
    Storage.saveConfig(config);
  },

  _bindEvents() {
    // Employee count change
    Renderer.employeeCountInput.addEventListener('change', () => {
      let count = parseInt(Renderer.employeeCountInput.value);
      if (count < MIN_EMPLOYEES) count = MIN_EMPLOYEES;
      Renderer.employeeCountInput.value = count;
      Renderer.renderEmployeeNames(count, Renderer.getEmployeeNames());
    });

    // Save config on any change
    Renderer.employeeNamesContainer.addEventListener('input', () => this._saveState());
    document.querySelectorAll('.demand-input').forEach(input => {
      input.addEventListener('change', () => this._saveState());
    });
    Renderer.weekStartInput.addEventListener('change', () => this._saveState());

    // Generate schedule
    document.getElementById('btn-generate').addEventListener('click', () => this._generateSchedule());

    // Edit (go back to config)
    document.getElementById('btn-edit').addEventListener('click', () => {
      // Save any manual edits before going back
      const editedMatrix = Renderer.getScheduleFromDOM();
      const names = Renderer.getEmployeeNames();
      Storage.saveSchedule(editedMatrix);
      Storage.saveNames(names);
      Renderer.showConfig();
    });

    // Export PDF
    document.getElementById('btn-export').addEventListener('click', () => {
      const matrix = Renderer.getScheduleFromDOM();
      const names = Renderer.getEmployeeNames();
      const weekStart = Renderer.weekStartInput.value;
      Renderer.renderPDF(matrix, names, weekStart);
      Exporter.exportToPDF(weekStart);
    });

    // Load saved schedule on startup if available
    window.addEventListener('load', () => {
      const saved = Storage.loadSchedule();
      if (saved) {
        const names = Storage.loadNames();
        if (names && saved.length === names.length) {
          this.state.employeeNames = names;
          const config = Storage.loadConfig();
          const weekStart = config && config.weekStart ? config.weekStart : Renderer.weekStartInput.value;
          Renderer.showSchedule();
          Renderer.renderSchedule(saved, names, weekStart);
          Renderer.renderPDF(saved, names, weekStart);
        }
      }
    });
  },

  _generateSchedule() {
    this._saveState();

    const employees = Renderer.getEmployeeNames();
    const demand = Renderer.getDemandConfig();
    const weekStart = Renderer.weekStartInput.value;

    const result = Scheduler.generate(employees, demand);

    if (!result.success) {
      alert(result.error);
      return;
    }

    Storage.saveSchedule(result.matrix);
    Renderer.renderSchedule(result.matrix, employees, weekStart);
    Renderer.renderPDF(result.matrix, employees, weekStart);
    Renderer.showSchedule();
  },
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
