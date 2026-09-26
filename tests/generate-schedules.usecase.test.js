import test from 'node:test';
import assert from 'node:assert';

import { GenerateSchedulesUseCase } from '../src/features/scheduling/application/generate-schedules.usecase.js';

class InMemoryScheduleRepo {
  constructor() {
    this.schedules = new Map();
    this.generatedWeeks = [];
  }
  save(weekStr, matrix) {
    this.schedules.set(weekStr, matrix);
  }
  load(weekStr) {
    return this.schedules.get(weekStr) || null;
  }
  saveGeneratedWeeks(weeks) {
    this.generatedWeeks = [...weeks];
  }
  loadGeneratedWeeks() {
    return [...this.generatedWeeks];
  }
}

class InMemoryDemandRepo {
  constructor() {
    this.demands = new Map();
    this.defaultDemand = null;
  }
  saveDemandForWeek(weekStr, demand) {
    this.demands.set(weekStr, demand);
  }
  loadDemandForWeek(weekStr) {
    return this.demands.get(weekStr) || null;
  }
  saveDefaultDemand(demand) {
    this.defaultDemand = demand;
  }
  loadDefaultDemand() {
    return this.defaultDemand;
  }
}

class InMemorySettingsRepo {
  constructor() {
    this.baseWeek = null;
    this.weeksCount = 1;
    this.names = null;
    this.patterns = null;
    this.shiftModes = null;
  }
  saveBaseWeek(w) { this.baseWeek = w; }
  loadBaseWeek() { return this.baseWeek; }
  saveWeeksCount(c) { this.weeksCount = c; }
  loadWeeksCount() { return this.weeksCount; }
  saveNames(n) { this.names = n; }
  loadNames() { return this.names; }
  savePatterns(p) { this.patterns = p; }
  loadPatterns() { return this.patterns; }
  saveShiftModes(s) { this.shiftModes = s; }
  loadShiftModes() { return this.shiftModes; }
}

test('generate-schedules usecase: generación exitosa de 3 semanas con persistencia atómica', () => {
  const scheduleRepo = new InMemoryScheduleRepo();
  const demandRepo = new InMemoryDemandRepo();
  const settingsRepo = new InMemorySettingsRepo();

  const useCase = new GenerateSchedulesUseCase({
    scheduleRepo,
    demandRepo,
    settingsRepo
  });

  const employees = Array.from({ length: 8 }, (_, i) => `Emp ${i + 1}`);
  const validDemand = {
    morning: [3, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };

  const result = useCase.execute({
    startWeek: '2026-09-28',
    weeksCount: 3,
    employees,
    getDemandForWeek: () => validDemand
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.weeks.length, 3);
  assert.strictEqual(scheduleRepo.generatedWeeks.length, 3);
  assert.ok(scheduleRepo.load('2026-09-28') !== null);
  assert.ok(scheduleRepo.load('2026-10-05') !== null);
  assert.ok(scheduleRepo.load('2026-10-12') !== null);
});

test('generate-schedules usecase: fallo atómico en dry-run no persiste ninguna semana', () => {
  const scheduleRepo = new InMemoryScheduleRepo();
  const demandRepo = new InMemoryDemandRepo();
  const settingsRepo = new InMemorySettingsRepo();

  const useCase = new GenerateSchedulesUseCase({
    scheduleRepo,
    demandRepo,
    settingsRepo
  });

  const employees = Array.from({ length: 8 }, (_, i) => `Emp ${i + 1}`);
  const validDemand = {
    morning: [3, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };
  const invalidDemand = {
    morning: [1, 1, 1, 1, 1, 1, 1], // Violación de personal mínimo
    afternoon: [1, 1, 1, 1, 1, 1, 1]
  };

  // Semana 1 válida, Semana 2 inválida
  const result = useCase.execute({
    startWeek: '2026-09-28',
    weeksCount: 2,
    employees,
    getDemandForWeek: (weekStr) => (weekStr === '2026-09-28' ? validDemand : invalidDemand)
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.failedWeekIndex, 1);
  assert.ok(result.error.includes('personal mínimo'));

  // Verificar atomicidad: semana 1 NO debe haberse guardado en el repo
  assert.strictEqual(scheduleRepo.load('2026-09-28'), null);
  assert.strictEqual(scheduleRepo.generatedWeeks.length, 0);
});

test('generate-schedules usecase: rechazo por parámetros requeridos ausentes', () => {
  const useCase = new GenerateSchedulesUseCase({
    scheduleRepo: new InMemoryScheduleRepo(),
    demandRepo: new InMemoryDemandRepo(),
    settingsRepo: new InMemorySettingsRepo()
  });

  const res1 = useCase.execute({
    startWeek: '',
    weeksCount: 1,
    employees: ['E1'],
    getDemandForWeek: () => null
  });
  assert.strictEqual(res1.success, false);

  const res2 = useCase.execute({
    startWeek: '2026-09-28',
    weeksCount: 1,
    employees: [],
    getDemandForWeek: () => null
  });
  assert.strictEqual(res2.success, false);
});
