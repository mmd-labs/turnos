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

    // ---- PHASE 1: Emp 1 & 2 (index 0,1) ----
    // Find the 2 days with lowest total demand to give them off
    const dayDemand = [];
    for (let d = 0; d < 7; d++) {
      dayDemand[d] = { day: d, total: demandM[d] + demandT[d] };
    }
    dayDemand.sort((a, b) => a.total - b.total);
    const offDaysEmp12 = [dayDemand[0].day, dayDemand[1].day];

    for (const d of offDaysEmp12) {
      matrix[0][d] = 'L';
      offCount[d] += 1;
    }

    // Emp 1 works Morning on their working days
    for (let d = 0; d < 7; d++) {
      if (matrix[0][d] === null) {
        matrix[0][d] = 'M';
      }
    }

    // ---- PHASE 2: Distribute off days for Emp 3..N ----
    // For each day, calculate remaining demand after Emp 1&2
    const remainingDemand = [];
    for (let d = 0; d < 7; d++) {
      const emp12Contrib = (offCount[d] < 2) ? 2 : 0; // they work if not off
      remainingDemand[d] = demandM[d] + demandT[d] - emp12Contrib;
    }

    // Max off per day = remaining available staff - remaining demand
    // Remaining available staff = (n - 2) - offCount_from_remaining[d]
    // offCount[d] already includes Emp1&2, so remaining_off[d] = offCount[d] - (Emp1&2 off count)
    const maxOffPerDay = [];
    for (let d = 0; d < 7; d++) {
      const emp12OffCount = offDaysEmp12.includes(d) ? 2 : 0;
      const remainingStaff = (n - 2);
      maxOffPerDay[d] = remainingStaff - remainingDemand[d];
      if (maxOffPerDay[d] < 0) maxOffPerDay[d] = 0;
    }

    // Assign off days to remaining employees using greedy approach
    // Each employee needs exactly DAYS_OFF_PER_EMPLOYEE off days
    const offAssigned = Array(7).fill(0); // count of remaining employees off per day

    for (let emp = 1; emp < n; emp++) {
      let daysOff = 0;
      // Find days where we can still assign off (haven't exceeded max)
      // Sort days by remaining capacity (most room first) to spread out off days
      const candidates = [];
      for (let d = 0; d < 7; d++) {
        const remaining = maxOffPerDay[d] - offAssigned[d];
        if (remaining > 0) {
          candidates.push({ day: d, remaining });
        }
      }
      // Sort by remaining capacity descending
      candidates.sort((a, b) => b.remaining - a.remaining);

      for (const c of candidates) {
        if (daysOff >= DAYS_OFF_PER_EMPLOYEE) break;
        matrix[emp][c.day] = 'L';
        offAssigned[c.day]++;
        offCount[c.day]++;
        daysOff++;
      }

      if (daysOff < DAYS_OFF_PER_EMPLOYEE) {
        // Try to force assign even if it means exceeding ideal max
        // (this happens when demand is tight)
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
    // For each day, we need demandM[d] morning workers and demandT[d] afternoon workers
    // Track per-employee M/T counts for balancing
    const mCount = Array(n).fill(0);
    const tCount = Array(n).fill(0);

    // Already set Emp 1 as M
    for (let d = 0; d < 7; d++) {
      if (matrix[0][d] === 'M') mCount[0]++;
    }

    // For each day, assign shifts to remaining employees
    for (let d = 0; d < 7; d++) {
      const workingEmps = [];
      for (let emp = 1; emp < n; emp++) {
        if (matrix[emp][d] === null) {
          workingEmps.push(emp);
        }
      }

      // We need demandM[d] morning and demandT[d] afternoon from these employees
      // Sort employees by M/T ratio to balance: prefer to give M to those with fewer M's
      workingEmps.sort((a, b) => mCount[a] - mCount[b]);

      let mAssigned = 0;
      let tAssigned = 0;

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
          // Extra workers beyond demand: assign to balance M/T
          if (mCount[emp] <= tCount[emp]) {
            matrix[emp][d] = 'M';
            mCount[emp]++;
          } else {
            matrix[emp][d] = 'T';
            tCount[emp]++;
          }
        }
      }
    }

    // ---- PHASE 4: Ergonomic optimization (avoid T -> M transitions) ----
    this._fixErgonomics(matrix, n, mCount, tCount);

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

  _fixErgonomics(matrix, n, mCount, tCount) {
    // Simple pass: for each employee, if T on day d and M on day d+1, try to swap with another employee
    for (let pass = 0; pass < 3; pass++) {
      let improved = false;
      for (let emp = 1; emp < n; emp++) {
        for (let d = 0; d < 6; d++) {
          if (matrix[emp][d] === 'T' && matrix[emp][d + 1] === 'M') {
            // Try to find another employee to swap with
            for (let emp2 = emp + 1; emp2 < n; emp2++) {
              if (matrix[emp2][d] === 'M' && matrix[emp2][d + 1] === 'T') {
                // Swap both days
                matrix[emp][d] = 'M';
                matrix[emp][d + 1] = 'T';
                matrix[emp2][d] = 'T';
                matrix[emp2][d + 1] = 'M';
                improved = true;
                break;
              }
              if (matrix[emp2][d] === 'M' && matrix[emp2][d + 1] === 'L') {
                // Swap to break T->M
                matrix[emp][d] = 'M';
                matrix[emp][d + 1] = 'L';
                matrix[emp2][d] = 'T';
                matrix[emp2][d + 1] = 'M';
                improved = true;
                break;
              }
            }
            if (improved) break;
          }
        }
        if (improved) break;
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

  renderSchedule(matrix, employees) {
    this.scheduleBody.innerHTML = '';
    for (let emp = 0; emp < employees.length; emp++) {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      tdName.textContent = employees[emp];
      tr.appendChild(tdName);

      for (let d = 0; d < 7; d++) {
        const td = document.createElement('td');
        const select = document.createElement('select');
        select.className = 'schedule-select';
        select.dataset.emp = emp;
        select.dataset.day = d;

        ['M', 'T', 'L'].forEach(val => {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = val;
          if (matrix[emp][d] === val) opt.selected = true;
          select.appendChild(opt);
        });

        this._applyShiftClass(select);
        select.addEventListener('change', () => {
          this._applyShiftClass(select);
          this._updatePDFBody(matrix, employees);
        });

        td.appendChild(select);
        tr.appendChild(td);
      }
      this.scheduleBody.appendChild(tr);
    }
  },

  getScheduleFromDOM() {
    const selects = this.scheduleBody.querySelectorAll('.schedule-select');
    const matrix = [];
    // Find max emp index
    let maxEmp = 0;
    selects.forEach(s => {
      const emp = parseInt(s.dataset.emp);
      if (emp > maxEmp) maxEmp = emp;
    });
    for (let i = 0; i <= maxEmp; i++) {
      matrix[i] = Array(7).fill('L');
    }
    selects.forEach(s => {
      const emp = parseInt(s.dataset.emp);
      const day = parseInt(s.dataset.day);
      matrix[emp][day] = s.value;
    });
    return matrix;
  },

  renderPDF(matrix, employees, weekStart) {
    this.pdfWeekRange.textContent = `Semana del ${this._formatDateLong(weekStart)}`;
    this.pdfBody.innerHTML = '';
    for (let emp = 0; emp < employees.length; emp++) {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      tdName.textContent = employees[emp];
      tr.appendChild(tdName);

      for (let d = 0; d < 7; d++) {
        const td = document.createElement('td');
        const val = matrix[emp][d];
        td.textContent = val;
        if (val === 'M') td.className = 'pdf-cell-morning';
        else if (val === 'T') td.className = 'pdf-cell-afternoon';
        else td.className = 'pdf-cell-free';
        tr.appendChild(td);
      }
      this.pdfBody.appendChild(tr);
    }
  },

  _applyShiftClass(select) {
    select.classList.remove('shift-morning', 'shift-afternoon', 'shift-free');
    if (select.value === 'M') select.classList.add('shift-morning');
    else if (select.value === 'T') select.classList.add('shift-afternoon');
    else select.classList.add('shift-free');
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

  _updatePDFBody(matrix, employees) {
    // Sync DOM selects back to matrix for PDF
    const liveMatrix = this.getScheduleFromDOM();
    const weekStart = document.getElementById('week-start').value;
    this.renderPDF(liveMatrix, employees, weekStart);
  },
};

/* ============================================
   MODULE: Exporter
   ============================================ */
const Exporter = {
  async exportToPDF() {
    const container = document.getElementById('pdf-container');
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.zIndex = '-1';

    const opt = {
      margin: [10, 10, 10, 10],
      filename: 'cuadrante-turnos.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    };

    try {
      await html2pdf().set(opt).from(container).save();
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Error al exportar el PDF. Inténtalo de nuevo.');
    } finally {
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
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
      Exporter.exportToPDF();
    });

    // Load saved schedule on startup if available
    window.addEventListener('load', () => {
      const saved = Storage.loadSchedule();
      if (saved) {
        const names = Storage.loadNames();
        if (names && saved.length === names.length) {
          this.state.employeeNames = names;
          const config = Storage.loadConfig();
          Renderer.showSchedule();
          Renderer.renderSchedule(saved, names);
          Renderer.renderPDF(saved, names, config ? config.weekStart : '');
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
    Renderer.renderSchedule(result.matrix, employees);
    Renderer.renderPDF(result.matrix, employees, weekStart);
    Renderer.showSchedule();
  },
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
