/* ============================================
   CONSTANTS
   ============================================ */
const STORAGE_KEYS = {
  NAMES: 'turnos_employee_names',
  PATTERNS: 'turnos_employee_patterns',
  SHIFT_MODES: 'turnos_employee_shift_modes',
  BASE_WEEK: 'turnos_pattern_base_week',
  GENERATED_WEEKS: 'turnos_generated_weeks',
  WEEKS_COUNT: 'turnos_weeks_count',
  CONFIG: 'turnos_config',
  DEMANDS_BY_WEEK: 'turnos_demands_by_week',
  DEMAND_WEEK_PREFIX: 'turnos_demand_',
  SCHEDULE: 'turnos_schedule',
  SCHEDULE_WEEK_PREFIX: 'turnos_schedule_',
  THEME: 'turnos_theme',
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MIN_EMPLOYEES = 8;
const DEFAULT_EMPLOYEES = 8;
const DAYS_OFF_PER_EMPLOYEE = 2;

const DEFAULT_EMPLOYEE_NAMES = [
  'Mar',
  'Clary',
  'Estrella',
  'Lidia',
  'Melody',
  'Ashley',
  'Idaira',
  'Scarleth',
];

const ROTATING_OFF_PATTERN = [
  { week: 1, days: [0, 1], label: 'Lun - Mar' },
  { week: 2, days: [1, 2], label: 'Mar - Mié' },
  { week: 3, days: [2, 3], label: 'Mié - Jue' },
  { week: 4, days: [3, 4], label: 'Jue - Vie' },
  { week: 5, days: [4, 5], label: 'Vie - Sáb' },
  { week: 6, days: [5, 6], label: 'Sáb - Dom' },
  { week: 7, days: [6, 0], label: 'Dom - Lun' },
];

const DEFAULT_EMPLOYEE_PATTERNS = [
  6, // Mar: Semana 6 (Sábado - Domingo)
  1, // Clary: Semana 1 (Lunes - Martes)
  2, // Estrella: Semana 2 (Martes - Miércoles)
  3, // Lidia: Semana 3 (Miércoles - Jueves)
  4, // Melody: Semana 4 (Jueves - Viernes)
  5, // Ashley: Semana 5 (Viernes - Sábado)
  3, // Idaira: Semana 3 (Miércoles - Jueves)
  7, // Scarleth: Semana 7 (Domingo - Lunes)
];

const CYCLE_8 = [1, 2, 3, 3, 4, 5, 6, 7];
const DEFAULT_CYCLE_POSITIONS = [6, 0, 1, 2, 4, 5, 3, 7];

const DEFAULT_EMPLOYEE_SHIFT_MODES = [
  '5M0T', // Mar: fija solo mañanas
  '3M2T', // Clary: 3M/2T semana 1 -> 2M/3T semana 2
  '2M3T', // Estrella: 2M/3T semana 1 -> 3M/2T semana 2
  '2M3T', // Lidia: 2M/3T semana 1 -> 3M/2T semana 2
  '2M3T', // Melody: 2M/3T semana 1 -> 3M/2T semana 2
  '2M3T', // Ashley: 2M/3T semana 1 -> 3M/2T semana 2
  '3M2T', // Idaira: 3M/2T semana 1 -> 2M/3T semana 2
  '2M3T', // Scarleth: 2M/3T semana 1 -> 3M/2T semana 2
];

const CONSECUTIVE_PAIRS = [
  [0, 1], // Lun - Mar
  [1, 2], // Mar - Mié
  [2, 3], // Mié - Jue
  [3, 4], // Jue - Vie
  [4, 5], // Vie - Sáb
  [5, 6], // Sáb - Dom
  [6, 0], // Dom - Lun
];

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

  saveDemand(demand) {
    const config = this.loadConfig() || {};
    config.demand = demand;
    this.saveConfig(config);
  },

  loadDemand() {
    const config = this.loadConfig();
    return (config && config.demand) ? config.demand : null;
  },

  saveDemandsByWeek(map) {
    localStorage.setItem(STORAGE_KEYS.DEMANDS_BY_WEEK, JSON.stringify(map));
  },

  loadDemandsByWeek() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DEMANDS_BY_WEEK)) || {};
    } catch {
      return {};
    }
  },

  saveDemandForWeek(weekStr, demand) {
    if (!weekStr) return;
    localStorage.setItem(`${STORAGE_KEYS.DEMAND_WEEK_PREFIX}${weekStr}`, JSON.stringify(demand));
    const all = this.loadDemandsByWeek();
    all[weekStr] = demand;
    this.saveDemandsByWeek(all);
  },

  loadDemandForWeek(weekStr) {
    if (!weekStr) return null;
    const specific = localStorage.getItem(`${STORAGE_KEYS.DEMAND_WEEK_PREFIX}${weekStr}`);
    if (specific) {
      try {
        return JSON.parse(specific);
      } catch {}
    }
    const all = this.loadDemandsByWeek();
    return all[weekStr] || null;
  },

  savePatterns(patterns) {
    localStorage.setItem(STORAGE_KEYS.PATTERNS, JSON.stringify(patterns));
  },

  loadPatterns() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.PATTERNS));
    } catch {
      return null;
    }
  },

  saveShiftModes(modes) {
    localStorage.setItem(STORAGE_KEYS.SHIFT_MODES, JSON.stringify(modes));
  },

  loadShiftModes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SHIFT_MODES));
    } catch {
      return null;
    }
  },

  saveBaseWeek(weekStr) {
    localStorage.setItem(STORAGE_KEYS.BASE_WEEK, weekStr);
  },

  loadBaseWeek() {
    return localStorage.getItem(STORAGE_KEYS.BASE_WEEK);
  },

  saveGeneratedWeeks(weeks) {
    localStorage.setItem(STORAGE_KEYS.GENERATED_WEEKS, JSON.stringify(weeks));
  },

  loadGeneratedWeeks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.GENERATED_WEEKS)) || [];
    } catch {
      return [];
    }
  },

  saveWeeksCount(count) {
    localStorage.setItem(STORAGE_KEYS.WEEKS_COUNT, String(count));
  },

  loadWeeksCount() {
    const val = localStorage.getItem(STORAGE_KEYS.WEEKS_COUNT);
    return val ? parseInt(val) : 4;
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
  generate(employees, demand, options = {}) {
    const n = employees.length;
    if (n < MIN_EMPLOYEES) {
      return { success: false, error: `Se necesitan al menos ${MIN_EMPLOYEES} empleados.` };
    }

    // Build demand arrays: demandM[day], demandT[day]
    const demandM = [];
    const demandT = [];
    let totalDemand = 0;
    let totalDemandM = 0;
    for (let d = 0; d < 7; d++) {
      demandM[d] = demand.morning[d] || 0;
      demandT[d] = demand.afternoon[d] || 0;
      totalDemand += demandM[d] + demandT[d];
      totalDemandM += demandM[d];
    }

    // Minimum staffing checks:
    // Rule: minimum 2 per shift on any day. Never less than 2 per shift.
    // Rule: Friday, Saturday, Sunday ALWAYS have at least 3 employees per shift.
    for (let d = 0; d < 7; d++) {
      if (demandM[d] < 2 || demandT[d] < 2) {
        return {
          success: false,
          error: `El personal mínimo por turno es de 2 empleados. Revisa los turnos del ${DAYS_FULL[d]} (Mañana: ${demandM[d]}, Tarde: ${demandT[d]}). Nunca puede haber menos de dos por turno.`,
        };
      }
      if (d >= 4 && (demandM[d] < 3 || demandT[d] < 3)) {
        return {
          success: false,
          error: `Los viernes, sábados y domingos siempre deben tener al menos 3 empleados por cada turno. Revisa el ${DAYS_FULL[d]} (Mañana: ${demandM[d]}, Tarde: ${demandT[d]}).`,
        };
      }
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

    // Morning capacity check: Emp 1 needs 5 morning shifts, and each of the other n-1 employees needs at least 1 morning shift
    const minMorningsRequired = 5 + (n - 1);
    if (totalDemandM < minMorningsRequired) {
      return {
        success: false,
        error: `La demanda total de mañanas (${totalDemandM} turnos) es insuficiente. Se requieren al menos ${minMorningsRequired} turnos de mañana para que el Empleado 1 trabaje 5 mañanas y cada uno de los restantes ${n - 1} empleados tenga al menos 1 turno de mañana.`,
      };
    }

    // Initialize matrix with null (unset)
    const matrix = Array.from({ length: n }, () => Array(7).fill(null));
    const offCount = Array(7).fill(0); // how many employees are off per day

    // Determine pattern weeks for each employee
    const patternWeeks = (options && options.patternWeeks && options.patternWeeks.length >= n)
      ? options.patternWeeks
      : Array.from({ length: n }, (_, i) => DEFAULT_EMPLOYEE_PATTERNS[i] || ((i % 7) + 1));

    // ---- PHASE 1 & 2: Assign CONSECUTIVE days off (L) following the 7-week rotating pattern ----
    for (let emp = 0; emp < n; emp++) {
      const pWeek = patternWeeks[emp] || ((emp % 7) + 1);
      const patternItem = ROTATING_OFF_PATTERN[(pWeek - 1) % 7] || ROTATING_OFF_PATTERN[0];
      const [d1, d2] = patternItem.days;
      matrix[emp][d1] = 'L';
      matrix[emp][d2] = 'L';
      offCount[d1] += 1;
      offCount[d2] += 1;
    }

    // Emp 1 (index 0 - Clave): works strictly Morning on their 5 working days
    for (let d = 0; d < 7; d++) {
      if (matrix[0][d] === null) {
        matrix[0][d] = 'M';
      }
    }

    // Determine shift targets for each employee:
    // Emp 0 (Mar - Clave): strictly 5M / 0T
    // Emps 1..n-1: alternating 3M/2T and 2M/3T as provided in options.shiftTargets
    let shiftTargets = options && options.shiftTargets;
    if (!shiftTargets || shiftTargets.length < n) {
      shiftTargets = Array.from({ length: n }, (_, i) => {
        if (i === 0) return { m: 5, t: 0 };
        return (i % 2 === 1) ? { m: 3, t: 2 } : { m: 2, t: 3 };
      });
    }

    // ---- PHASE 3: Assign M/T for employees 1..n-1 with guaranteed shiftTargets ----
    const mCount = Array(n).fill(0);
    const tCount = Array(n).fill(0);

    for (let d = 0; d < 7; d++) {
      if (matrix[0][d] === 'M') mCount[0]++;
    }

    // Count remaining working days for an employee from day d to end of week
    const remWork = (emp, fromDay) => {
      let cnt = 0;
      for (let fd = fromDay; fd < 7; fd++) {
        if (matrix[emp][fd] === null) cnt++;
      }
      return cnt;
    };

    for (let d = 0; d < 7; d++) {
      let mAssigned = (matrix[0][d] === 'M') ? 1 : 0;
      let tAssigned = 0;

      const workingEmps = [];
      for (let emp = 1; emp < n; emp++) {
        if (matrix[emp][d] === null) workingEmps.push(emp);
      }

      // Prioritize assigning M:
      // Urgency = slack = remainingWorkingDays - (targetM - currentM)
      workingEmps.sort((a, b) => {
        const neededA = Math.max(0, shiftTargets[a].m - mCount[a]);
        const neededB = Math.max(0, shiftTargets[b].m - mCount[b]);
        if (neededA > 0 && neededB === 0) return -1;
        if (neededB > 0 && neededA === 0) return 1;
        if (neededA > 0 && neededB > 0) {
          const slackA = remWork(a, d) - neededA;
          const slackB = remWork(b, d) - neededB;
          if (slackA !== slackB) return slackA - slackB;
        }
        return (shiftTargets[b].m - mCount[b]) - (shiftTargets[a].m - mCount[a]);
      });

      for (const emp of workingEmps) {
        const needsM = mCount[emp] < shiftTargets[emp].m;
        const needsT = tCount[emp] < shiftTargets[emp].t;

        if (mAssigned < demandM[d] && tAssigned < demandT[d]) {
          if (needsM && !needsT) {
            matrix[emp][d] = 'M';
            mCount[emp]++;
            mAssigned++;
          } else if (needsT && !needsM) {
            matrix[emp][d] = 'T';
            tCount[emp]++;
            tAssigned++;
          } else {
            const defM = shiftTargets[emp].m - mCount[emp];
            const defT = shiftTargets[emp].t - tCount[emp];
            if (defM >= defT) {
              matrix[emp][d] = 'M';
              mCount[emp]++;
              mAssigned++;
            } else {
              matrix[emp][d] = 'T';
              tCount[emp]++;
              tAssigned++;
            }
          }
        } else if (mAssigned < demandM[d]) {
          matrix[emp][d] = 'M';
          mCount[emp]++;
          mAssigned++;
        } else if (tAssigned < demandT[d]) {
          matrix[emp][d] = 'T';
          tCount[emp]++;
          tAssigned++;
        } else {
          matrix[emp][d] = 'T';
          tCount[emp]++;
          tAssigned++;
        }
      }
    }

    // Repair pass: Strictly guarantee every employee reaches shiftTargets[emp].m
    for (let pass = 0; pass < 10; pass++) {
      let improved = false;
      for (let e1 = 1; e1 < n; e1++) {
        if (mCount[e1] < shiftTargets[e1].m) {
          for (let d = 0; d < 7; d++) {
            if (matrix[e1][d] === 'T') {
              for (let e2 = 1; e2 < n; e2++) {
                if (e1 !== e2 && matrix[e2][d] === 'M' && mCount[e2] > shiftTargets[e2].m) {
                  matrix[e1][d] = 'M';
                  matrix[e2][d] = 'T';
                  mCount[e1]++;
                  tCount[e1]--;
                  mCount[e2]--;
                  tCount[e2]++;
                  improved = true;
                  break;
                }
              }
              if (mCount[e1] === shiftTargets[e1].m) break;
            }
          }
        }
      }
      if (!improved) break;
    }

    // ---- PHASE 4: Ergonomic optimization (avoid T -> M transitions) ----
    // Uses reciprocal swaps preserving exact shiftTargets and daily demand
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

    // Emp 1 (index 0) is restricted to morning shifts only; eligible employees are index 1 to n-1
    const eligibleStart = 1;

    for (let pass = 0; pass < 5; pass++) {
      let improved = false;
      for (let emp1 = eligibleStart; emp1 < n; emp1++) {
        for (let d = 0; d < 6; d++) {
          if (matrix[emp1][d] === 'T' && matrix[emp1][d + 1] === 'M') {
            // Reciprocal 2-day swap: emp1 (T at d, M at d+1), emp2 (M at d, T at d+1)
            // Preserves exact mCount and tCount for BOTH employees without altering daily demands!
            for (let emp2 = eligibleStart; emp2 < n; emp2++) {
              if (emp1 === emp2) continue;
              if (matrix[emp2][d] === 'M' && matrix[emp2][d + 1] === 'T') {
                const before = countViolations(emp1) + countViolations(emp2);
                matrix[emp1][d] = 'M';
                matrix[emp1][d + 1] = 'T';
                matrix[emp2][d] = 'T';
                matrix[emp2][d + 1] = 'M';
                const after = countViolations(emp1) + countViolations(emp2);

                if (after < before) {
                  improved = true;
                  break;
                } else {
                  // Revert swap
                  matrix[emp1][d] = 'T';
                  matrix[emp1][d + 1] = 'M';
                  matrix[emp2][d] = 'M';
                  matrix[emp2][d + 1] = 'T';
                }
              }
            }

            if (improved) break;
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (!improved) break;
    }
  },

  _solveConsecutiveOffCounts(numEmpsToAssign, targetOff) {
    let bestCounts = null;
    let bestScore = Infinity;

    function score(counts) {
      let s = 0;
      for (let d = 0; d < 7; d++) {
        const actual = counts[d] + counts[(d + 6) % 7];
        const diff = actual - targetOff[d];
        if (diff > 0) s += diff * 1000 + diff * diff * 100;
        else s += Math.abs(diff) * 10;
      }
      return s;
    }

    const counts = Array(7).fill(0);

    function search(idx, currentSum) {
      if (idx === 6) {
        counts[6] = numEmpsToAssign - currentSum;
        const sc = score(counts);
        if (sc < bestScore) {
          bestScore = sc;
          bestCounts = [...counts];
        }
        return;
      }

      const remaining = numEmpsToAssign - currentSum;
      const maxVal = Math.min(remaining, (targetOff[idx] || 0) + 3);
      for (let v = 0; v <= maxVal; v++) {
        counts[idx] = v;
        search(idx + 1, currentSum + v);
        if (bestScore === 0) return;
      }
    }

    search(0, 0);

    if (!bestCounts || bestScore > 500) {
      function searchBroader(idx, currentSum) {
        if (idx === 6) {
          counts[6] = numEmpsToAssign - currentSum;
          const sc = score(counts);
          if (sc < bestScore) {
            bestScore = sc;
            bestCounts = [...counts];
          }
          return;
        }
        const remaining = numEmpsToAssign - currentSum;
        for (let v = 0; v <= remaining; v++) {
          counts[idx] = v;
          searchBroader(idx + 1, currentSum + v);
          if (bestScore === 0) return;
        }
      }
      searchBroader(0, 0);
    }

    if (!bestCounts) {
      bestCounts = Array(7).fill(0);
      for (let i = 0; i < numEmpsToAssign; i++) {
        bestCounts[i % 7]++;
      }
    }

    return bestCounts;
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
          <span class="emp-shifts-badge ${shiftTagClass}">${shiftLabel}</span>
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

  getMonday(dateOrStr) {
    if (!dateOrStr) return null;
    const d = (typeof dateOrStr === 'string') ? new Date(dateOrStr + 'T00:00:00') : new Date(dateOrStr);
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
    let totalConsecutiveMismatches = 0;
    let totalFatigueIssues = 0;
    let totalMorningIssues = 0;

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
      const minStaffOk = countM >= 2 && countT >= 2;
      const weekendStaffOk = (d < 4) || (countM >= 3 && countT >= 3);
      if (!mOk || !tOk || !minStaffOk || !weekendStaffOk) totalDemandMismatches++;

      const tag = document.createElement('span');
      let statusClass = (mOk && tOk && minStaffOk && weekendStaffOk) ? 'ok' : 'err';
      tag.className = `audit-tag audit-tag--${statusClass}`;
      let staffNotice = '';
      if (!minStaffOk) staffNotice = ' ⚠️ <2 personal';
      else if (!weekendStaffOk) staffNotice = ' ⚠️ Fin de semana <3';
      tag.textContent = `${dayDates[d].short}: M ${countM}/${reqM} · T ${countT}/${reqT}${staffNotice}`;
      tag.title = `${dayDates[d].name}: Mañana ${countM} asignados de ${reqM} requeridos; Tarde ${countT} asignados de ${reqT} requeridos`;
      demandSummary.appendChild(tag);
    }

    // 2. Offdays & Morning Rules check
    offdaysSummary.innerHTML = '';
    const empStats = [];
    for (let e = 0; e < n; e++) {
      let countL = 0;
      let countM = 0;
      let countT = 0;
      const offDays = [];
      for (let d = 0; d < 7; d++) {
        const s = matrix[e] ? matrix[e][d] : 'L';
        if (s === 'L') {
          countL++;
          offDays.push(d);
        } else if (s === 'M') countM++;
        else if (s === 'T') countT++;
      }
      const isKey = (e === 0);
      const is2Off = countL === 2;
      const isConsecutive = is2Off && ((offDays[1] - offDays[0] === 1) || (offDays[0] === 0 && offDays[1] === 6));

      const pWeek = Renderer.getEffectivePatternWeek(e, weekStart);
      const pItem = ROTATING_OFF_PATTERN[pWeek - 1] || ROTATING_OFF_PATTERN[0];
      const matchesPattern = is2Off && isConsecutive && (offDays[0] === pItem.days[0] && offDays[1] === pItem.days[1]);

      const shiftMode = Renderer.getEffectiveShiftMode(e, weekStart);
      const targetM = (e === 0 || shiftMode === '5M0T') ? 5 : (shiftMode === '3M2T' ? 3 : 2);
      const targetT = (e === 0 || shiftMode === '5M0T') ? 0 : (shiftMode === '3M2T' ? 2 : 3);
      const matchesShiftTarget = (countM === targetM && countT === targetT);

      empStats.push({
        name: employees[e],
        m: countM,
        t: countT,
        l: countL,
        hours: (countM + countT) * 8,
        isKey,
        isConsecutive,
        pWeek,
        pLabel: pItem.label,
        matchesPattern,
        shiftMode,
        targetM,
        targetT,
        matchesShiftTarget
      });

      if (!is2Off) totalOffdayMismatches++;
      if (is2Off && !isConsecutive) totalConsecutiveMismatches++;

      // Rule checks: Emp 1 must only work morning; everyone needs >= 1 morning
      if (isKey && countT > 0) totalMorningIssues++;
      if (countM === 0) totalMorningIssues++;

      const tag = document.createElement('span');
      let statusClass = (is2Off && isConsecutive && matchesPattern) ? 'ok' : (!is2Off ? (countL < 2 ? 'err' : 'warn') : 'warn');
      tag.className = `audit-tag audit-tag--${statusClass}`;
      let consecNotice = '';
      if (is2Off && !isConsecutive) {
        consecNotice = ' ⚠️ No seguidos';
      } else if (is2Off && !matchesPattern) {
        consecNotice = ' ℹ️ Modificado';
      }
      tag.textContent = `${employees[e]}: ${countL}/2 Libres [Sem.${pWeek}]${consecNotice}`;
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
    if (totalDemandMismatches === 0 && totalOffdayMismatches === 0 && totalConsecutiveMismatches === 0 && totalFatigueIssues === 0 && totalMorningIssues === 0) {
      globalBadge.className = 'badge badge--success';
      globalBadge.textContent = 'Balance Óptimo ✅';
    } else if (totalDemandMismatches > 0 || totalOffdayMismatches > 0 || totalConsecutiveMismatches > 0 || totalMorningIssues > 0) {
      globalBadge.className = 'badge badge--danger';
      const issues = [];
      if (totalDemandMismatches > 0) issues.push('Demanda');
      if (totalOffdayMismatches > 0) issues.push('Días libres');
      if (totalConsecutiveMismatches > 0) issues.push('Libres no seguidos');
      if (totalMorningIssues > 0) issues.push('Regla de mañanas');
      globalBadge.textContent = `Ajuste requerido: ${issues.join(' · ')} ⚠️`;
    } else {
      globalBadge.className = 'badge badge--warning';
      globalBadge.textContent = `${totalFatigueIssues} aviso(s) ergonómico(s) T → M ⚠️`;
    }

    // 5. Equity Table
    if (equityContainer) {
      let html = '<table class="equity-table"><thead><tr><th>Empleado</th><th>Patrón Rotativo</th><th>Alternancia Turnos</th><th>Turnos Mañana</th><th>Turnos Tarde</th><th>Días Libres</th><th>Horas Semanales</th></tr></thead><tbody>';
      empStats.forEach(stat => {
        const mNotice = stat.m === 0 ? ' <span title="Se requiere al menos 1 turno de mañana" style="color:var(--color-danger); font-size:0.75rem;">⚠️ Mín. 1 M</span>' : '';
        const tNotice = (stat.isKey && stat.t > 0) ? ' <span title="El empleado clave debe ser solo mañana" style="color:var(--color-danger); font-size:0.75rem;">⚠️ Solo M</span>' : '';
        const consecNotice = (!stat.isConsecutive && stat.l === 2) ? ' <span title="Los 2 días libres deben ser seguidos" style="color:var(--color-warning); font-size:0.75rem;">⚠️ No seguidos</span>' : '';
        const patternBadge = stat.matchesPattern
          ? `<span class="badge badge--success" style="font-size:0.75rem;">Sem. ${stat.pWeek} (${stat.pLabel})</span>`
          : `<span class="badge badge--warning" style="font-size:0.75rem;" title="Días libres modificados respecto al patrón de esta semana">Sem. ${stat.pWeek} (Modificado)</span>`;
        const shiftBadge = stat.matchesShiftTarget
          ? `<span class="badge badge--success" style="font-size:0.75rem;">${stat.targetM}M / ${stat.targetT}T ✅</span>`
          : `<span class="badge badge--warning" style="font-size:0.75rem;" title="Objetivo semana: ${stat.targetM}M / ${stat.targetT}T">${stat.targetM}M / ${stat.targetT}T ⚠️</span>`;
        const nameText = stat.isKey
          ? `${Renderer._escapeHtml(stat.name)} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">(Clave)</span>`
          : Renderer._escapeHtml(stat.name);
        html += `<tr>
          <td style="font-weight:600; text-align:left;">${nameText}</td>
          <td>${patternBadge}</td>
          <td>${shiftBadge}</td>
          <td><span style="color:var(--color-morning); font-weight:700;">${stat.m}</span>${mNotice}</td>
          <td><span style="color:var(--color-afternoon); font-weight:700;">${stat.t}</span>${tNotice}</td>
          <td><span style="color:var(--color-free); font-weight:700;">${stat.l}</span>${consecNotice}</td>
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

    const pWeek = Renderer.getEffectivePatternWeek(empIdx, this.weekStart);
    const pItem = ROTATING_OFF_PATTERN[pWeek - 1] || ROTATING_OFF_PATTERN[0];
    const shiftMode = Renderer.getEffectiveShiftMode(empIdx, this.weekStart);
    const shiftModeLabel = (empIdx === 0) ? 'Solo Mañanas (5M)' : (shiftMode === '3M2T' ? '3 Mañanas + 2 Tardes' : '2 Mañanas + 3 Tardes');

    let msg = `👤 *Horario Semanal - ${empName}*\n`;
    msg += `🗓️ Semana del ${Renderer._formatDateLong(this.weekStart)}\n`;
    msg += `🔄 *Patrón rotativo:* Semana ${pWeek} (${pItem.label})\n`;
    msg += `⏱️ *Turnos:* ${shiftModeLabel}\n\n`;

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
   MODULE: HelpModal (Manual & Guide)
   ============================================ */
const HelpModal = {
  init() {
    this.modal = document.getElementById('help-modal');
    this.toggleBtn = document.getElementById('help-toggle');
    this.closeBtn = document.getElementById('help-modal-close');
    this.actionCloseBtn = document.getElementById('btn-close-help');

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.actionCloseBtn) {
      this.actionCloseBtn.addEventListener('click', () => this.close());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && !this.modal.hidden) {
        this.close();
      }
    });
  },

  open() {
    if (this.modal) this.modal.hidden = false;
  },

  close() {
    if (this.modal) this.modal.hidden = true;
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
    HelpModal.init();
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
    const weeksCountSelect = document.getElementById('weeks-count');
    if (weeksCountSelect) {
      const savedWeeksCount = Storage.loadWeeksCount();
      if (savedWeeksCount) {
        weeksCountSelect.value = savedWeeksCount;
      }
    }
    this._updateWeekBadge(Renderer.weekStartInput.value);
    Renderer.renderDemandWeeksNav();
  },

  _loadSavedState() {
    const names = Storage.loadNames();
    const isOldGeneric = names && names.every((n, i) => n === `Empleado ${i + 1}`);
    if (names && names.length > 0 && !isOldGeneric) {
      this.state.employeeNames = names;
    } else {
      this.state.employeeNames = [...DEFAULT_EMPLOYEE_NAMES];
      Storage.saveNames(this.state.employeeNames);
    }
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

    const activeDemandWeekStr = Renderer.getActiveDemandWeekStr();
    if (activeDemandWeekStr) {
      Storage.saveDemandForWeek(activeDemandWeekStr, demand);
    }
  },

  _updateWeekBadge(weekStr) {
    const badge = document.getElementById('schedule-week-badge');
    if (badge && weekStr) {
      badge.textContent = `Semana del ${Renderer._formatDateLong(weekStr)}`;
    }
  },

  navigateToWeek(weekStr) {
    const normalized = Renderer.normalizeToMonday(weekStr);
    if (!normalized) return;
    Renderer.weekStartInput.value = normalized;
    this.state.weekStart = normalized;
    this._saveState();
    this._updateWeekBadge(normalized);
    Renderer.updatePatternSelects();

    const saved = Storage.loadSchedule(normalized);
    const names = Renderer.getEmployeeNames();

    if (saved && saved.length === names.length) {
      Renderer.showSchedule();
      Renderer.renderSchedule(saved, names, normalized);
      Renderer.renderPDF(saved, names, normalized);
      Toast.show(`Semana del ${Renderer._formatDateLong(normalized)}`, 'info', 2000);
    } else {
      if (!Renderer.schedulePanel.hidden) {
        Renderer.showConfig();
        Toast.show(`Semana del ${Renderer._formatDateLong(normalized)} lista para configurar`, 'info', 2500);
      }
    }

    const generatedWeeks = Storage.loadGeneratedWeeks();
    Renderer.renderGeneratedWeeksNav(generatedWeeks, normalized);
  },

  navigateWeek(deltaDays) {
    const currentVal = Renderer.weekStartInput.value;
    let base = Renderer.getMonday(currentVal || new Date());
    base.setDate(base.getDate() + deltaDays);
    const newWeekStr = Renderer._formatDate(base);
    this.navigateToWeek(newWeekStr);
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
      input.addEventListener('change', () => {
        const day = parseInt(input.dataset.day);
        let val = parseInt(input.value) || 0;
        if (day >= 4 && val < 3) {
          input.value = 3;
          Toast.show('Viernes, sábados y domingos siempre deben tener al menos 3 empleados por cada turno.', 'warning', 3500);
        } else if (val < 2) {
          input.value = 2;
          Toast.show('El personal mínimo por turno es de 2 empleados.', 'warning', 3500);
        }
        const activeWeekStr = Renderer.getActiveDemandWeekStr();
        if (activeWeekStr) {
          Storage.saveDemandForWeek(activeWeekStr, Renderer.getDemandConfig());
        }
        this._saveState();
      });
    });

    Renderer.weekStartInput.addEventListener('change', () => {
      const current = Renderer.weekStartInput.value;
      const normalized = Renderer.normalizeToMonday(current);
      if (normalized && normalized !== current) {
        Renderer.weekStartInput.value = normalized;
        Toast.show(`Ajustado al lunes de esa semana (${Renderer._getDayDates(normalized)[0].date}).`, 'info', 2500);
      }
      this.state.weekStart = Renderer.weekStartInput.value;
      this._saveState();
      this._updateWeekBadge(Renderer.weekStartInput.value);
      Renderer.updatePatternSelects();
      Renderer.renderDemandWeeksNav();
    });

    const weeksCountSelect = document.getElementById('weeks-count');
    if (weeksCountSelect) {
      weeksCountSelect.addEventListener('change', () => {
        Storage.saveWeeksCount(weeksCountSelect.value);
        Renderer.renderDemandWeeksNav();
      });
    }

    const btnCopyDemand = document.getElementById('btn-copy-demand');
    if (btnCopyDemand) {
      btnCopyDemand.addEventListener('click', () => {
        const currentDemand = Renderer.getDemandConfig();
        const wcSelect = document.getElementById('weeks-count');
        const wc = parseInt(wcSelect ? wcSelect.value : '1') || 1;
        const startWeek = Renderer.weekStartInput.value;
        if (!startWeek) return;

        for (let w = 0; w < wc; w++) {
          const monday = Renderer.getMonday(startWeek);
          monday.setDate(monday.getDate() + (w * 7));
          const weekStr = Renderer._formatDate(monday);
          Storage.saveDemandForWeek(weekStr, JSON.parse(JSON.stringify(currentDemand)));
        }
        Storage.saveDemand(currentDemand);
        Toast.show(`Demanda de la Semana ${Renderer.activeDemandWeekIndex + 1} copiada a las ${wc} semanas.`, 'success', 3500);
      });
    }

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
      const generatedWeeks = Storage.loadGeneratedWeeks();
      if (saved) {
        const names = Storage.loadNames();
        if (names && saved.length === names.length) {
          this.state.employeeNames = names;
          Renderer.showSchedule();
          Renderer.renderSchedule(saved, names, weekStart);
          Renderer.renderPDF(saved, names, weekStart);
          this._updateWeekBadge(weekStart);
          Renderer.renderGeneratedWeeksNav(generatedWeeks, weekStart);
        }
      }
    });
  },

  _generateSchedule() {
    const rawWeekStart = Renderer.weekStartInput.value;
    const normalized = Renderer.normalizeToMonday(rawWeekStart);
    if (normalized && normalized !== rawWeekStart) {
      Renderer.weekStartInput.value = normalized;
    }
    this.state.weekStart = Renderer.weekStartInput.value;
    this._saveState();

    const employees = Renderer.getEmployeeNames();
    const startWeek = Renderer.weekStartInput.value;
    const weeksCountSelect = document.getElementById('weeks-count');
    const weeksCount = parseInt(weeksCountSelect ? weeksCountSelect.value : '1') || 1;
    Storage.saveWeeksCount(weeksCount);

    // Save active demand week before generating
    const activeDemandWeekStr = Renderer.getActiveDemandWeekStr();
    if (activeDemandWeekStr) {
      Storage.saveDemandForWeek(activeDemandWeekStr, Renderer.getDemandConfig());
    }

    if (!Storage.loadBaseWeek()) {
      Storage.saveBaseWeek(startWeek);
    }

    const generatedWeeks = [];
    let firstWeekMatrix = null;

    // Generate schedules for all selected weeks
    for (let w = 0; w < weeksCount; w++) {
      const monday = Renderer.getMonday(startWeek);
      monday.setDate(monday.getDate() + (w * 7));
      const currentWeekStr = Renderer._formatDate(monday);
      const patternWeeks = Renderer.getEffectivePatternWeeks(currentWeekStr);
      const shiftTargets = Renderer.getEffectiveShiftTargets(currentWeekStr);
      const weekDemand = Renderer.getDemandForWeek(currentWeekStr);

      const result = Scheduler.generate(employees, weekDemand, {
        patternWeeks,
        weekStart: currentWeekStr,
        shiftTargets
      });

      if (!result.success) {
        Toast.show(`Error en semana ${w + 1} (${Renderer._formatDateLong(currentWeekStr)}): ${result.error}`, 'error', 5000);
        return;
      }

      Storage.saveSchedule(result.matrix, currentWeekStr);
      Storage.saveDemandForWeek(currentWeekStr, weekDemand);
      generatedWeeks.push(currentWeekStr);
      if (w === 0) {
        firstWeekMatrix = result.matrix;
      }
    }

    Storage.saveGeneratedWeeks(generatedWeeks);

    // Display first week by default
    Renderer.renderSchedule(firstWeekMatrix, employees, startWeek);
    Renderer.renderPDF(firstWeekMatrix, employees, startWeek);
    this._updateWeekBadge(startWeek);
    Renderer.renderGeneratedWeeksNav(generatedWeeks, startWeek);
    Renderer.showSchedule();

    if (weeksCount > 1) {
      Toast.show(`¡Cuadrante de ${weeksCount} semanas generado con éxito! Usa las pestañas superiores para navegar.`, 'success', 4000);
    } else {
      Toast.show('¡Cuadrante semanal generado con éxito!', 'success');
    }
  },
};

// Expose App globally and start on DOMContentLoaded
window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
