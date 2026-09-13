/* ============================================
   CONSTANTS
   ============================================ */
const STORAGE_KEYS = {
  NAMES: 'turnos_employee_names',
  CONFIG: 'turnos_config',
  SCHEDULE: 'turnos_schedule',
  SCHEDULE_WEEK_PREFIX: 'turnos_schedule_',
  THEME: 'turnos_theme',
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MIN_EMPLOYEES = 8;
const DEFAULT_EMPLOYEES = 8;
const DAYS_OFF_PER_EMPLOYEE = 2;

/* ============================================
   MODULE: Toast Notifications
   ============================================ */
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(message, type = 'info', duration = 3500) {
    if (!this.container) this.init();
    if (!this.container) return;

    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="toast-message">${this._escapeHtml(message)}</span>
    `;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

/* ============================================
   MODULE: Theme (Dark / Light Mode)
   ============================================ */
const Theme = {
  init() {
    this.toggleBtn = document.getElementById('theme-toggle');
    this.icon = document.getElementById('theme-icon');
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    this.setTheme(initial);

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        this.setTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
  },

  setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (this.icon) this.icon.textContent = '☀️';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (this.icon) this.icon.textContent = '🌙';
    }
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }
};

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

  saveSchedule(schedule, weekStart) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
    if (weekStart) {
      localStorage.setItem(`${STORAGE_KEYS.SCHEDULE_WEEK_PREFIX}${weekStart}`, JSON.stringify(schedule));
    }
  },

  loadSchedule(weekStart) {
    if (weekStart) {
      const specific = localStorage.getItem(`${STORAGE_KEYS.SCHEDULE_WEEK_PREFIX}${weekStart}`);
      if (specific) {
        try {
          return JSON.parse(specific);
        } catch {}
      }
    }
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULE));
    } catch {
      return null;
    }
  },

  clearSchedule(weekStart) {
    localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
    if (weekStart) {
      localStorage.removeItem(`${STORAGE_KEYS.SCHEDULE_WEEK_PREFIX}${weekStart}`);
    }
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
              Storage.saveSchedule(this.currentMatrix, this.currentWeekStart);
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
    Auditor.run(this.currentMatrix, this.currentEmployees, this.getDemandConfig(), this.currentWeekStart);
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
      Toast.show('PDF exportado con éxito.', 'success');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      Toast.show('Error al exportar el PDF. Inténtalo de nuevo.', 'error');
    } finally {
      if (btnExport) {
        btnExport.disabled = false;
        btnExport.textContent = originalText;
      }
    }
  },

  exportToCSV(matrix, employees, weekStart) {
    if (!matrix || !employees) return;
    const startDate = weekStart || (Renderer && Renderer.weekStartInput ? Renderer.weekStartInput.value : '');
    const dayDates = Renderer._getDayDates(startDate);

    // 1. Matriz por turnos
    const headers = ['Turno', ...dayDates.map(d => `${d.name} (${d.date})`)];
    const shifts = [
      { key: 'M', label: 'Mañana' },
      { key: 'T', label: 'Tarde' },
      { key: 'L', label: 'Libre' }
    ];

    const rows = [
      [`Cuadrante de Turnos - Semana del ${Renderer._formatDateLong(startDate)}`],
      [],
      headers
    ];

    shifts.forEach(shift => {
      const row = [shift.label];
      for (let d = 0; d < 7; d++) {
        const emps = [];
        for (let e = 0; e < employees.length; e++) {
          if (matrix[e] && matrix[e][d] === shift.key) {
            emps.push(employees[e]);
          }
        }
        row.push(emps.length ? emps.join(' | ') : '—');
      }
      rows.push(row);
    });

    // 2. Desglose individual por empleado
    rows.push([]);
    rows.push(['Desglose por Empleado']);
    rows.push(['Empleado', ...dayDates.map(d => `${d.short} (${d.date})`), 'Mañanas', 'Tardes', 'Libres', 'Total Horas (8h/turno)']);

    for (let e = 0; e < employees.length; e++) {
      const empRow = [employees[e]];
      let m = 0, t = 0, l = 0;
      for (let d = 0; d < 7; d++) {
        const s = matrix[e] ? matrix[e][d] : 'L';
        if (s === 'M') { m++; empRow.push('Mañana'); }
        else if (s === 'T') { t++; empRow.push('Tarde'); }
        else { l++; empRow.push('Libre'); }
      }
      empRow.push(m, t, l, `${(m + t) * 8} h`);
      rows.push(empRow);
    }

    // Codificación UTF-8 con BOM para que Microsoft Excel abra acentos correctamente
    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(';')).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', startDate ? `cuadrante-${startDate}.csv` : 'cuadrante.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Toast.show('Cuadrante exportado a Excel (CSV) con éxito.', 'success');
  }
};

/* ============================================
   MODULE: Auditor & Live Balance
   ============================================ */
const Auditor = {
  run(matrix, employees, demand, weekStart) {
    if (!matrix || !employees || !demand) return;

    const n = employees.length;
    const dayDates = Renderer._getDayDates(weekStart);

    const demandSummary = document.getElementById('audit-demand-summary');
    const offdaysSummary = document.getElementById('audit-offdays-summary');
    const ergonomicsSummary = document.getElementById('audit-ergonomics-summary');
    const globalBadge = document.getElementById('audit-global-badge');
    const equityContainer = document.getElementById('equity-table-container');

    if (!demandSummary || !offdaysSummary || !ergonomicsSummary || !globalBadge) return;

    let totalDemandMismatches = 0;
    let totalOffdayMismatches = 0;
    let totalFatigueIssues = 0;

    // 1. Demand coverage check
    demandSummary.innerHTML = '';
    for (let d = 0; d < 7; d++) {
      let countM = 0;
      let countT = 0;
      for (let e = 0; e < n; e++) {
        if (matrix[e] && matrix[e][d] === 'M') countM++;
        else if (matrix[e] && matrix[e][d] === 'T') countT++;
      }
      const reqM = (demand.morning && demand.morning[d]) || 0;
      const reqT = (demand.afternoon && demand.afternoon[d]) || 0;

      const mOk = countM === reqM;
      const tOk = countT === reqT;
      if (!mOk || !tOk) totalDemandMismatches++;

      const tag = document.createElement('span');
      let statusClass = (mOk && tOk) ? 'ok' : 'err';
      tag.className = `audit-tag audit-tag--${statusClass}`;
      tag.textContent = `${dayDates[d].short}: M ${countM}/${reqM} · T ${countT}/${reqT}`;
      tag.title = `${dayDates[d].name}: Mañana ${countM} asignados de ${reqM} requeridos; Tarde ${countT} asignados de ${reqT} requeridos`;
      demandSummary.appendChild(tag);
    }

    // 2. Offdays check (2 days off required)
    offdaysSummary.innerHTML = '';
    const empStats = [];
    for (let e = 0; e < n; e++) {
      let countL = 0;
      let countM = 0;
      let countT = 0;
      for (let d = 0; d < 7; d++) {
        const s = matrix[e] ? matrix[e][d] : 'L';
        if (s === 'L') countL++;
        else if (s === 'M') countM++;
        else if (s === 'T') countT++;
      }
      empStats.push({ name: employees[e], m: countM, t: countT, l: countL, hours: (countM + countT) * 8 });

      const is2Off = countL === 2;
      if (!is2Off) totalOffdayMismatches++;

      const tag = document.createElement('span');
      let statusClass = is2Off ? 'ok' : (countL < 2 ? 'err' : 'warn');
      tag.className = `audit-tag audit-tag--${statusClass}`;
      tag.textContent = `${employees[e]}: ${countL}/2 Libres`;
      offdaysSummary.appendChild(tag);
    }

    // 3. Ergonomics check (T -> M transitions)
    ergonomicsSummary.innerHTML = '';
    const fatigueList = [];
    for (let e = 0; e < n; e++) {
      for (let d = 0; d < 6; d++) {
        if (matrix[e] && matrix[e][d] === 'T' && matrix[e][d + 1] === 'M') {
          fatigueList.push(`${employees[e]}: ${dayDates[d].short} T → ${dayDates[d + 1].short} M`);
          totalFatigueIssues++;
        }
      }
    }

    if (fatigueList.length === 0) {
      const tag = document.createElement('span');
      tag.className = 'audit-tag audit-tag--ok';
      tag.textContent = 'Descanso óptimo: 0 transiciones T → M ✅';
      ergonomicsSummary.appendChild(tag);
    } else {
      fatigueList.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'audit-tag audit-tag--warn';
        tag.textContent = item;
        tag.title = 'Transición de turno de tarde seguido inmediatamente de mañana al día siguiente';
        ergonomicsSummary.appendChild(tag);
      });
    }

    // 4. Global Badge
    if (totalDemandMismatches === 0 && totalOffdayMismatches === 0 && totalFatigueIssues === 0) {
      globalBadge.className = 'badge badge--success';
      globalBadge.textContent = 'Balance Óptimo ✅';
    } else if (totalDemandMismatches > 0 || totalOffdayMismatches > 0) {
      globalBadge.className = 'badge badge--danger';
      const issues = [];
      if (totalDemandMismatches > 0) issues.push('Demanda');
      if (totalOffdayMismatches > 0) issues.push('Días libres');
      globalBadge.textContent = `Ajuste requerido: ${issues.join(' y ')} ⚠️`;
    } else {
      globalBadge.className = 'badge badge--warning';
      globalBadge.textContent = `${totalFatigueIssues} aviso(s) ergonómico(s) T → M ⚠️`;
    }

    // 5. Equity Table
    if (equityContainer) {
      let html = '<table class="equity-table"><thead><tr><th>Empleado</th><th>Turnos Mañana</th><th>Turnos Tarde</th><th>Días Libres</th><th>Horas Semanales</th></tr></thead><tbody>';
      empStats.forEach(stat => {
        html += `<tr>
          <td style="font-weight:600; text-align:left;">${Renderer._escapeHtml(stat.name)}</td>
          <td><span style="color:var(--color-morning); font-weight:700;">${stat.m}</span></td>
          <td><span style="color:var(--color-afternoon); font-weight:700;">${stat.t}</span></td>
          <td><span style="color:var(--color-free); font-weight:700;">${stat.l}</span></td>
          <td><strong>${stat.hours} h</strong></td>
        </tr>`;
      });
      html += '</tbody></table>';
      equityContainer.innerHTML = html;
    }
  }
};

/* ============================================
   MODULE: ShareHelper (WhatsApp & WebShare)
   ============================================ */
const ShareHelper = {
  getShareText(matrix, employees, weekStart) {
    if (!matrix || !employees) return '';
    const startDate = weekStart || (Renderer && Renderer.weekStartInput ? Renderer.weekStartInput.value : '');
    const dayDates = Renderer._getDayDates(startDate);

    let text = `📅 *Cuadrante de Turnos Semanal*\n`;
    text += `🗓️ Semana del ${Renderer._formatDateLong(startDate)}\n\n`;

    dayDates.forEach((d, dayIdx) => {
      const morningEmps = [];
      const afternoonEmps = [];
      const freeEmps = [];

      for (let e = 0; e < employees.length; e++) {
        const shift = matrix[e] ? matrix[e][dayIdx] : 'L';
        if (shift === 'M') morningEmps.push(employees[e]);
        else if (shift === 'T') afternoonEmps.push(employees[e]);
        else freeEmps.push(employees[e]);
      }

      text += `📍 *${d.name} (${d.date})*\n`;
      text += `☀️ Mañana: ${morningEmps.length ? morningEmps.join(', ') : 'Ninguno'}\n`;
      text += `🌅 Tarde: ${afternoonEmps.length ? afternoonEmps.join(', ') : 'Ninguno'}\n`;
      text += `🏖️ Libre: ${freeEmps.length ? freeEmps.join(', ') : 'Ninguno'}\n\n`;
    });

    return text.trim();
  },

  async share(matrix, employees, weekStart) {
    const text = this.getShareText(matrix, employees, weekStart);
    if (!text) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cuadrante de Turnos Semanal',
          text: text,
        });
        Toast.show('Cuadrante compartido con éxito.', 'success');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback portapapeles
    try {
      await navigator.clipboard.writeText(text);
      Toast.show('¡Cuadrante copiado al portapapeles para WhatsApp!', 'success');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      Toast.show('¡Cuadrante copiado al portapapeles!', 'success');
    }
  }
};

/* ============================================
   MODULE: IndividualView (Modal)
   ============================================ */
const IndividualView = {
  init() {
    this.modal = document.getElementById('individual-modal');
    this.select = document.getElementById('individual-emp-select');
    this.cardsContainer = document.getElementById('individual-schedule-cards');
    this.closeBtn = document.getElementById('modal-close');
    this.copyBtn = document.getElementById('btn-copy-individual');

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
    if (this.select) {
      this.select.addEventListener('change', () => this.renderSelected());
    }
    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', () => this.copySchedule());
    }
  },

  open(matrix, employees, weekStart) {
    this.matrix = matrix;
    this.employees = employees;
    this.weekStart = weekStart;

    if (!this.select) return;
    this.select.innerHTML = '';
    employees.forEach((name, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = name;
      this.select.appendChild(opt);
    });

    this.renderSelected();
    this.modal.hidden = false;
  },

  close() {
    if (this.modal) this.modal.hidden = true;
  },

  renderSelected() {
    if (!this.select || !this.cardsContainer) return;
    const empIdx = parseInt(this.select.value) || 0;
    const dayDates = Renderer._getDayDates(this.weekStart);
    const shiftLabels = { M: 'Mañana', T: 'Tarde', L: 'Libre' };
    const shiftClasses = { M: 'morning', T: 'afternoon', L: 'free' };

    this.cardsContainer.innerHTML = '';
    dayDates.forEach((d, dayIdx) => {
      const shiftKey = (this.matrix && this.matrix[empIdx]) ? this.matrix[empIdx][dayIdx] : 'L';
      const card = document.createElement('div');
      card.className = 'indiv-day-card';
      card.innerHTML = `
        <div class="indiv-day-name">${d.name}</div>
        <div class="indiv-day-date">${d.date}</div>
        <span class="indiv-shift-badge indiv-shift-badge--${shiftClasses[shiftKey] || 'free'}">
          ${shiftLabels[shiftKey] || 'Libre'}
        </span>
      `;
      this.cardsContainer.appendChild(card);
    });
  },

  async copySchedule() {
    const empIdx = parseInt(this.select.value) || 0;
    const empName = this.employees[empIdx];
    const dayDates = Renderer._getDayDates(this.weekStart);
    const shiftEmojis = { M: '☀️ Mañana', T: '🌅 Tarde', L: '🏖️ Libre' };

    let msg = `👤 *Horario Semanal - ${empName}*\n`;
    msg += `🗓️ Semana del ${Renderer._formatDateLong(this.weekStart)}\n\n`;

    dayDates.forEach((d, dayIdx) => {
      const shiftKey = (this.matrix && this.matrix[empIdx]) ? this.matrix[empIdx][dayIdx] : 'L';
      msg += `• *${d.name} (${d.date})*: ${shiftEmojis[shiftKey] || 'Libre'}\n`;
    });

    try {
      await navigator.clipboard.writeText(msg.trim());
      Toast.show(`Horario de ${empName} copiado para WhatsApp.`, 'success');
    } catch {
      Toast.show('No se pudo copiar automáticamente.', 'error');
    }
  }
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
    Toast.init();
    Theme.init();
    IndividualView.init();
    Renderer.init();
    this._bindEvents();
    this._enterApp();
    this._registerServiceWorker();
  },

  _registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    }
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
    this._updateWeekBadge(Renderer.weekStartInput.value);
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

  _updateWeekBadge(weekStr) {
    const badge = document.getElementById('schedule-week-badge');
    if (badge && weekStr) {
      badge.textContent = `Semana del ${Renderer._formatDateLong(weekStr)}`;
    }
  },

  navigateWeek(deltaDays) {
    const currentVal = Renderer.weekStartInput.value;
    let base = currentVal ? new Date(currentVal + 'T00:00:00') : new Date();
    base.setDate(base.getDate() + deltaDays);
    const newWeekStr = Renderer._formatDate(base);

    Renderer.weekStartInput.value = newWeekStr;
    this.state.weekStart = newWeekStr;
    this._saveState();
    this._updateWeekBadge(newWeekStr);

    // Intentar cargar cuadrante específico de esta semana
    const saved = Storage.loadSchedule(newWeekStr);
    const names = Renderer.getEmployeeNames();

    if (saved && saved.length === names.length) {
      Renderer.showSchedule();
      Renderer.renderSchedule(saved, names, newWeekStr);
      Renderer.renderPDF(saved, names, newWeekStr);
      Toast.show(`Cuadrante cargado: semana del ${Renderer._formatDateLong(newWeekStr)}`, 'info', 2500);
    } else {
      if (!Renderer.schedulePanel.hidden) {
        Renderer.showConfig();
        Toast.show(`Semana del ${Renderer._formatDateLong(newWeekStr)} lista para configurar`, 'info', 2500);
      }
    }
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
    Renderer.weekStartInput.addEventListener('change', () => {
      this._saveState();
      this._updateWeekBadge(Renderer.weekStartInput.value);
    });

    // Week navigation buttons
    const btnPrevWeek = document.getElementById('btn-prev-week');
    const btnNextWeek = document.getElementById('btn-next-week');
    const btnSchedPrev = document.getElementById('btn-sched-prev');
    const btnSchedNext = document.getElementById('btn-sched-next');

    if (btnPrevWeek) btnPrevWeek.addEventListener('click', () => this.navigateWeek(-7));
    if (btnNextWeek) btnNextWeek.addEventListener('click', () => this.navigateWeek(7));
    if (btnSchedPrev) btnSchedPrev.addEventListener('click', () => this.navigateWeek(-7));
    if (btnSchedNext) btnSchedNext.addEventListener('click', () => this.navigateWeek(7));

    // Generate schedule
    document.getElementById('btn-generate').addEventListener('click', () => this._generateSchedule());

    // Edit (go back to config)
    document.getElementById('btn-edit').addEventListener('click', () => {
      const editedMatrix = Renderer.getScheduleFromDOM();
      const names = Renderer.getEmployeeNames();
      const weekStart = Renderer.weekStartInput.value;
      Storage.saveSchedule(editedMatrix, weekStart);
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

    // Export CSV / Excel
    const btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => {
        const matrix = Renderer.getScheduleFromDOM();
        const names = Renderer.getEmployeeNames();
        const weekStart = Renderer.weekStartInput.value;
        Exporter.exportToCSV(matrix, names, weekStart);
      });
    }

    // Share by WhatsApp
    const btnShare = document.getElementById('btn-share');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        const matrix = Renderer.getScheduleFromDOM();
        const names = Renderer.getEmployeeNames();
        const weekStart = Renderer.weekStartInput.value;
        ShareHelper.share(matrix, names, weekStart);
      });
    }

    // Individual employee view
    const btnIndividual = document.getElementById('btn-individual');
    if (btnIndividual) {
      btnIndividual.addEventListener('click', () => {
        const matrix = Renderer.getScheduleFromDOM();
        const names = Renderer.getEmployeeNames();
        const weekStart = Renderer.weekStartInput.value;
        IndividualView.open(matrix, names, weekStart);
      });
    }

    // Load saved schedule on startup if available
    window.addEventListener('load', () => {
      const config = Storage.loadConfig();
      const weekStart = config && config.weekStart ? config.weekStart : Renderer.weekStartInput.value;
      const saved = Storage.loadSchedule(weekStart);
      if (saved) {
        const names = Storage.loadNames();
        if (names && saved.length === names.length) {
          this.state.employeeNames = names;
          Renderer.showSchedule();
          Renderer.renderSchedule(saved, names, weekStart);
          Renderer.renderPDF(saved, names, weekStart);
          this._updateWeekBadge(weekStart);
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
      Toast.show(result.error, 'error', 5000);
      return;
    }

    Storage.saveSchedule(result.matrix, weekStart);
    Renderer.renderSchedule(result.matrix, employees, weekStart);
    Renderer.renderPDF(result.matrix, employees, weekStart);
    this._updateWeekBadge(weekStart);
    Renderer.showSchedule();
    Toast.show('¡Cuadrante semanal generado con éxito!', 'success');
  },
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
