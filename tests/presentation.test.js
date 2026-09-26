import test from 'node:test';
import assert from 'node:assert';
import { ScheduleView } from '../src/features/scheduling/presentation/schedule-view.js';
import { EmployeeNamesView } from '../src/features/settings/presentation/employee-names-view.js';
import { DemandView } from '../src/features/settings/presentation/demand-view.js';
import { WeekNavView } from '../src/features/settings/presentation/week-nav-view.js';
import { Renderer } from '../src/renderer.js';

test('Presentation Views: Instanciación limpia y métodos defensivos sin DOM', () => {
  const scheduleView = new ScheduleView();
  assert.strictEqual(scheduleView.isScheduleVisible(), false);
  assert.deepStrictEqual(scheduleView.getScheduleFromDOM(), []);

  const employeeNamesView = new EmployeeNamesView();
  assert.deepStrictEqual(employeeNamesView.getEmployeeNames(), []);

  const demandView = new DemandView();
  assert.strictEqual(demandView.getActiveDemandWeekStr('2026-03-30'), '2026-03-30');

  const weekNavView = new WeekNavView();
  assert.strictEqual(weekNavView.getWeeksCount(), 1);
  assert.strictEqual(weekNavView.getWeekStart(), '');
});

test('Renderer Facade: Compatibilidad hacia atrás y delegación correcta', () => {
  assert.strictEqual(typeof Renderer.init, 'function');
  assert.strictEqual(typeof Renderer.showConfig, 'function');
  assert.strictEqual(typeof Renderer.showSchedule, 'function');
  assert.strictEqual(typeof Renderer.renderSchedule, 'function');
  assert.strictEqual(typeof Renderer.renderPDF, 'function');
  assert.strictEqual(typeof Renderer.getEmployeeNames, 'function');
  assert.strictEqual(typeof Renderer.getDemandConfig, 'function');
  assert.strictEqual(typeof Renderer.getMonday, 'function');
  assert.strictEqual(typeof Renderer.normalizeToMonday, 'function');

  // Comprobación de funciones de fecha delegadas
  const monday = Renderer.getMonday('2026-03-31'); // Tuesday
  assert.strictEqual(monday.getDay(), 1);
  assert.strictEqual(Renderer.normalizeToMonday('2026-03-31'), '2026-03-30');
});
