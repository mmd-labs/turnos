import { Theme } from './theme.js';
import { Storage } from './storage.js';
import { Renderer } from './renderer.js';
import { Exporter, ShareHelper } from './exporter.js';
import { IndividualView } from './individual.js';
import { HelpModal } from './help.js';
import { Scheduler } from './scheduler.js';
import { Toast } from './toast.js';
import { supabase } from './supabase.js';
import { SyncManager } from './sync.js';
import { DEFAULT_EMPLOYEES, DEFAULT_EMPLOYEE_NAMES, MIN_EMPLOYEES } from './constants.js';

export const App = {
  state: {
    employeeNames: [],
    weekStart: '',
  },

  async init() {
    this._setupAuth();
    Toast.init();
    Theme.init();
    IndividualView.init();
    HelpModal.init();
    Renderer.init();
    this._bindEvents();
    this._registerServiceWorker();
  },

  async _setupAuth() {
    const authContainer = document.getElementById('auth-container');
    const appWrapper = document.getElementById('app-wrapper');
    const btnLogin = document.getElementById('btn-login');
    const usernameInput = document.getElementById('auth-username');
    const passwordInput = document.getElementById('auth-password');
    const errorEl = document.getElementById('auth-error');

    const FAKE_DOMAIN = '@turnos-internal.com';

    const handleLogin = async () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      if (!username || !password) return;

      btnLogin.textContent = 'Ingresando...';
      btnLogin.disabled = true;
      errorEl.style.display = 'none';

      const email = `${username}${FAKE_DOMAIN}`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        errorEl.textContent = 'Credenciales inválidas';
        errorEl.style.display = 'block';
        btnLogin.textContent = 'Ingresar';
        btnLogin.disabled = false;
      }
    };

    btnLogin.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await supabase.auth.signOut();
      });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (authContainer.open) authContainer.close();
        appWrapper.style.display = 'block';
        await SyncManager.pull(); // Traer datos de Supabase antes de pintar
        this._enterApp();
      } else {
        appWrapper.style.display = 'none';
        if (!authContainer.open) authContainer.showModal();
      }
    });
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
    const isOldGeneric = Array.isArray(names) && names.every((n, i) => n === `Empleado ${i + 1}`);
    if (Array.isArray(names) && names.length > 0 && !isOldGeneric) {
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
      const names = Renderer.getEmployeeNames();
      const currentWeekStart = Renderer.weekStartInput.value;
      const weeksCountSelect = document.getElementById('weeks-count');
      const weeksCount = parseInt(weeksCountSelect ? weeksCountSelect.value : '1') || 1;
      
      let generatedWeeks = Storage.loadGeneratedWeeks() || [];
      
      if (weeksCount > 1 && generatedWeeks.length > 1) {
        const weeksData = generatedWeeks.map(ws => {
           const matrix = (ws === currentWeekStart) ? Renderer.getScheduleFromDOM() : (Storage.loadSchedule(ws) || []);
           return { matrix, employees: names, weekStart: ws };
        });
        Renderer.renderMultiWeekPDF(weeksData);
      } else {
        const matrix = Renderer.getScheduleFromDOM();
        Renderer.renderMultiWeekPDF([{ matrix, employees: names, weekStart: currentWeekStart }]);
      }

      Exporter.exportToPDF(currentWeekStart);
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
    if (!Renderer.weekStartInput.value) {
      Renderer.setDefaultWeekStart();
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

      Storage.saveSchedule(currentWeekStr, result.matrix);
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

// Init
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  Theme.init();
  Renderer.init();
  IndividualView.init();
  HelpModal.init();
  App.init();
});
