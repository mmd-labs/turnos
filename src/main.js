/**
 * Composition Root of the Application.
 * Wires together Ports, Adapters, Views, Repositories, Use Cases and Controllers.
 * Contains NO business logic.
 */

import { Theme } from './theme.js';
import { Toast } from './toast.js';
import { HelpModal } from './help.js';
import { IndividualView } from './individual.js';
import { persistenceNotifier } from './core/infrastructure/persistence-notifier.js';
import { navigationService } from './core/infrastructure/navigation.service.js';
import { LocalStorageStore } from './core/infrastructure/local-storage.store.js';
import { LocalScheduleRepository } from './features/scheduling/infrastructure/local-schedule.repository.js';
import { LocalSettingsRepository } from './features/settings/infrastructure/local-settings.repository.js';
import { SupabaseAuthAdapter } from './features/auth/infrastructure/supabase-auth.adapter.js';
import { SupabaseSyncAdapter } from './features/sync/infrastructure/supabase-sync.adapter.js';
import { AuthController } from './features/auth/presentation/auth.controller.js';
import { GenerateSchedulesUseCase } from './features/scheduling/application/generate-schedules.usecase.js';
import { scheduleView } from './features/scheduling/presentation/schedule-view.js';
import { employeeNamesView } from './features/settings/presentation/employee-names-view.js';
import { demandView } from './features/settings/presentation/demand-view.js';
import { weekNavView } from './features/settings/presentation/week-nav-view.js';
import { SettingsController } from './features/settings/presentation/settings.controller.js';
import { ScheduleController } from './features/scheduling/presentation/schedule.controller.js';
import { individualController } from './features/individual/presentation/individual.controller.js';

class Application {
  constructor() {
    // 1. Core Infrastructure & Stores
    this.store = new LocalStorageStore();
    this.scheduleRepo = new LocalScheduleRepository({ store: this.store });
    this.settingsRepo = new LocalSettingsRepository({ store: this.store });
    this.authPort = new SupabaseAuthAdapter();
    this.syncPort = new SupabaseSyncAdapter({ store: this.store });

    // 2. Application Use Cases
    this.generateSchedulesUseCase = new GenerateSchedulesUseCase({
      scheduleRepo: this.scheduleRepo,
      demandRepo: this.settingsRepo,
      settingsRepo: this.settingsRepo,
    });

    // 3. Presentation Views
    this.scheduleView = scheduleView;
    this.employeeNamesView = employeeNamesView;
    this.demandView = demandView;
    this.weekNavView = weekNavView;

    // 4. Feature Controllers (with injected dependencies)
    this.individualController = individualController;
    this.individualController.settingsRepo = this.settingsRepo;

    this.settingsController = new SettingsController({
      employeeNamesView: this.employeeNamesView,
      demandView: this.demandView,
      weekNavView: this.weekNavView,
      scheduleView: this.scheduleView,
      settingsRepo: this.settingsRepo,
      scheduleRepo: this.scheduleRepo,
      onDisplaySchedule: (matrix, employees, weekStart) => {
        this.scheduleController.displaySchedule(matrix, employees, weekStart);
      },
    });

    this.scheduleController = new ScheduleController({
      scheduleView: this.scheduleView,
      settingsController: this.settingsController,
      scheduleRepo: this.scheduleRepo,
      settingsRepo: this.settingsRepo,
      generateSchedulesUseCase: this.generateSchedulesUseCase,
      individualCtrl: this.individualController,
    });

    this.authController = new AuthController({
      authPort: this.authPort,
      syncPort: this.syncPort,
      onLoginSuccess: () => this.settingsController.enterApp(),
      onLogout: () => {},
    });
  }

  get state() {
    return this.settingsController.state;
  }

  async init() {
    // 1. Reactive Persistence & Navigation Infrastructure
    persistenceNotifier.subscribe(() => this.syncPort.onLocalChange());
    navigationService.onNavigate((weekStr) => this.navigateToWeek(weekStr));

    // 2. Authentication
    this.authController.init();

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

  _registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }

  _restoreInitialSchedule() {
    window.addEventListener('load', () => {
      const config = this.settingsRepo.loadConfig();
      const weekStart = config && config.weekStart ? config.weekStart : this.weekNavView.getWeekStart();
      const saved = this.scheduleRepo.load(weekStart);
      const generatedWeeks = this.scheduleRepo.loadGeneratedWeeks() || [];
      if (saved) {
        const names = this.settingsRepo.loadNames();
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
