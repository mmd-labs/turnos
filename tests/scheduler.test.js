import test from 'node:test';
import assert from 'node:assert';
import * as constants from '../src/constants.js';
Object.assign(globalThis, constants); // inject constants for the test environment since scheduler might use them globally if not imported properly, wait, I just injected them in scheduler.js! So no need.
import { Scheduler } from '../src/scheduler.js';

test('Rechazo: demandas infactibles', () => {
  const empNames = Array.from({length: 8}, (_, i) => `E${i}`);
  const demand = {
    morning: [5, 5, 5, 5, 5, 5, 5],
    afternoon: [5, 5, 5, 5, 5, 5, 5]
  };
  const r1 = Scheduler.generate(empNames, demand, { baseWeekStr: '2026-09-28', currentWeekStr: '2026-09-28', patterns: Array(8).fill(1), shiftModes: Array(8).fill('2M3T') });
  assert.strictEqual(r1.success, false);
});

test('Happy path: demanda factible, invariantes correctos', () => {
  const empNames = Array.from({length: 8}, (_, i) => `E${i}`);
  const demand = {
    morning: [2, 2, 2, 2, 3, 3, 3],
    afternoon: [2, 2, 2, 2, 3, 3, 3]
  };
  const r = Scheduler.generate(empNames, demand, { 
    baseWeekStr: '2026-09-28', 
    currentWeekStr: '2026-09-28', 
    patterns: [6, 1, 2, 3, 4, 5, 3, 7], 
    shiftModes: ['5M0T', '3M2T', '2M3T', '2M3T', '2M3T', '2M3T', '3M2T', '2M3T'] 
  });
  
  assert.strictEqual(r.success, true);
  
  const e0 = r.matrix[0];
  const e0M = e0.filter(s => s === 'M').length;
  const e0T = e0.filter(s => s === 'T').length;
  assert.strictEqual(e0M, 5);
  assert.strictEqual(e0T, 0);

  for(let i=0; i<8; i++) {
    const shifts = r.matrix[i];
    const m = shifts.filter(s => s === 'M').length;
    const t = shifts.filter(s => s === 'T').length;
    assert.ok(m >= 1, `Empleado ${i} no tiene al menos 1 M`);
    assert.strictEqual(m + t, 5, `Empleado ${i} no tiene 5 turnos laborables`);
  }
});
