import test from 'node:test';
import assert from 'node:assert';

import { MemoryStore } from '../src/core/infrastructure/memory.store.js';
import { LocalScheduleRepository } from '../src/features/scheduling/infrastructure/local-schedule.repository.js';
import { LocalSettingsRepository } from '../src/features/settings/infrastructure/local-settings.repository.js';

test('LocalScheduleRepository: persistencia y recuperación de cuadrantes y semanas generadas', () => {
  const store = new MemoryStore();
  let notified = false;
  const repo = new LocalScheduleRepository({ store, onPersisted: () => { notified = true; } });

  const dummyMatrix = [
    ['M', 'M', 'M', 'M', 'M', 'L', 'L'],
    ['L', 'L', 'M', 'M', 'M', 'T', 'T']
  ];

  assert.strictEqual(repo.load('2026-09-28'), null);
  assert.deepStrictEqual(repo.loadGeneratedWeeks(), []);

  repo.save('2026-09-28', dummyMatrix);
  assert.strictEqual(notified, true);
  assert.deepStrictEqual(repo.load('2026-09-28'), dummyMatrix);

  repo.saveGeneratedWeeks(['2026-09-28', '2026-10-05']);
  assert.deepStrictEqual(repo.loadGeneratedWeeks(), ['2026-09-28', '2026-10-05']);
});

test('LocalSettingsRepository: persistencia de nombres, config, demanda y patrones', () => {
  const store = new MemoryStore();
  let persistCount = 0;
  const repo = new LocalSettingsRepository({ store, onPersisted: () => { persistCount++; } });

  repo.saveNames(['Ana', 'Beatriz']);
  assert.deepStrictEqual(repo.loadNames(), ['Ana', 'Beatriz']);
  assert.strictEqual(persistCount, 1);

  const config = { weekStart: '2026-09-28', employeeCount: 8 };
  repo.saveConfig(config);
  assert.deepStrictEqual(repo.loadConfig(), config);

  const demand = { morning: [3,3,3,3,3,3,3], afternoon: [3,3,2,2,3,3,3] };
  repo.saveDemandForWeek('2026-09-28', demand);
  assert.deepStrictEqual(repo.loadDemandForWeek('2026-09-28'), demand);

  repo.savePatterns([1, 2, 3, 4, 5, 6, 7, 1]);
  assert.deepStrictEqual(repo.loadPatterns(), [1, 2, 3, 4, 5, 6, 7, 1]);

  repo.saveBaseWeek('2026-09-28');
  assert.strictEqual(repo.loadBaseWeek(), '2026-09-28');

  repo.saveWeeksCount(4);
  assert.strictEqual(repo.loadWeeksCount(), 4);
});
