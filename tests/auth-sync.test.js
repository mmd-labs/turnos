import test from 'node:test';
import assert from 'node:assert';

import { NullSyncAdapter } from '../src/features/sync/infrastructure/null-sync.adapter.js';
import { NavigationService } from '../src/core/infrastructure/navigation.service.js';

test('NullSyncAdapter: modo offline opera como no-op seguro', async () => {
  const nullSync = new NullSyncAdapter();
  await assert.doesNotReject(async () => {
    await nullSync.pull();
    await nullSync.push();
    nullSync.onLocalChange();
  });
});

test('NavigationService: emisión de eventos de navegación sin acoplamiento a window', () => {
  const navService = new NavigationService();
  const navigatedWeeks = [];

  const unsubscribe = navService.onNavigate((w) => {
    navigatedWeeks.push(w);
  });

  navService.navigateToWeek('2026-09-28');
  navService.navigateToWeek('2026-10-05');

  assert.deepStrictEqual(navigatedWeeks, ['2026-09-28', '2026-10-05']);

  unsubscribe();
  navService.navigateToWeek('2026-10-12');
  assert.deepStrictEqual(navigatedWeeks, ['2026-09-28', '2026-10-05']);
});
