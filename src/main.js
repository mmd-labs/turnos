/**
 * Composition Root of the Application.
 * Wires together Ports, Adapters, Views, Repositories and Controllers.
 * Contains NO business logic.
 */

import { Theme } from './theme.js';
import { Storage } from './storage.js';
import { Toast } from './toast.js';
import { HelpModal } from './help.js';
import { IndividualView } from './individual.js';
import { SyncManager } from './sync.js';
import { persistenceNotifier } from './core/infrastructure/persistence-notifier.js';
import { navigationService } from './core/infrastructure/navigation.service.js';
import { SupabaseAuthAdapter } from './features/auth/infrastructure/supabase-auth.adapter.js';
import { SupabaseSyncAdapter } from './features/sync/infrastructure/supabase-sync.adapter.js';
import { AuthController } from './features/auth/presentation/auth.controller.js';
import { scheduleView } from './features/scheduling/presentation/schedule-view.js';
import { employeeNamesView } from './features/settings/presentation/employee-names-view.js';
import { demandView } from './features/settings/presentation/demand-view.js';
import { weekNavView } from './features/settings/presentation/week-nav-view.js';
import { SettingsController } from './features/settings/presentation/settings.controller.js';
import { ScheduleController } from './features/scheduling/presentation/schedule.controller.js';

class Application {
  constructor() {
    this.scheduleView = scheduleView;
    this.employeeNamesView = employeeNamesView;
    this.demandView = demandView;
    this.weekNavView = weekNavView;

    this.settingsController = new SettingsController({
      employeeNamesView: this.employeeNamesView,
      demandView: this.demandView,
      weekNavView: this.weekNavView,
      scheduleView: this.scheduleView,
      onDisplaySchedule: (matrix, employees, weekStart) => {
        this.scheduleController.displaySchedule(matrix, employees, weekStart);
      },
    });

    this.scheduleController = new ScheduleController({
      scheduleView: this.scheduleView,
      settingsController: this.settingsController,
    });
  }

  get state() {
    return this.settingsController.state;
  }

  async init() {
    // 1. Persistence & Navigation Infrastructure
    persistenceNotifier.subscribe(() => SyncManager.onLocalChange());
    navigationService.onNavigate((weekStr) => this.navigateToWeek(weekStr));

    // 2. Authentication
    this._setupAuth();

    // 3. UI Components & Shell
    Toast.init();
    Theme.init();
    IndividualView.init();
    HelpModal.init();

    // 4. Feature Controllers
    this.settingsController.init();
    this.scheduleController.init();

    // 5. PWA Service Worker
    this._registerServiceWorker();

    // 6. Restore active schedule on startup if present
    this._restoreInitialSchedule();
  }

  _setupAuth() {
    const authPort = new SupabaseAuthAdapter();
    const syncPort = new SupabaseSyncAdapter();
    const authController = new AuthController({
      authPort,
      syncPort,
      onLoginSuccess: () => this.settingsController.enterApp(),
      onLogout: () => {},
    });
    authController.init();
  }

  _registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }

  _restoreInitialSchedule() {
    window.addEventListener('load', () => {
      const config = Storage.loadConfig();
      const weekStart = config && config.weekStart ? config.weekStart : this.weekNavView.getWeekStart();
      const saved = Storage.loadSchedule(weekStart);
      const generatedWeeks = Storage.loadGeneratedWeeks();
      if (saved) {
        const names = Storage.loadNames();
        if (names && saved.length === names.length) {
          this.settingsController.state.employeeNames = names;
          this.scheduleView.showSchedule();
          this.scheduleController.displaySchedule(saved, names, weekStart);
          this.weekNavView.updateWeekBadge(weekStart);
          this.weekNavView.renderGeneratedWeeksNav(generatedWeeks, weekStart, (targetWeek) => {
            navigationService.navigateToWeek(targetWeek);
          });
        }
      }
    });
  }

  navigateToWeek(weekStr) {
    this.settingsController.navigateToWeek(weekStr);
  }

  navigateWeek(deltaDays) {
    this.settingsController.navigateWeek(deltaDays);
  }
}

export const app = new Application();

// Global bridge for browser console / backward compatibility
// @ts-ignore
window.App = app;

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
