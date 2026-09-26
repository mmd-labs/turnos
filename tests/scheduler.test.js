import test from 'node:test';
import assert from 'node:assert';

import { Scheduler } from '../src/scheduler.js';
import { ROTATING_OFF_PATTERN } from '../src/constants.js';

test('Rechazo: demandas infactibles', () => {
  const empNames = Array.from({length: 8}, (_, i) => `E${i}`);
  const demand = {
    morning: [5, 5, 5, 5, 5, 5, 5],
    afternoon: [5, 5, 5, 5, 5, 5, 5]
  };
  const r1 = Scheduler.generate(empNames, demand, { weekStart: '2026-09-28', patternWeeks: Array(8).fill(1), shiftTargets: Array(8).fill({m: 2, t: 3, mode: '2M3T'}) });
  assert.strictEqual(r1.success, false);
});

test('Happy path: demanda factible, invariantes correctos y cobertura diaria', () => {
  const empNames = Array.from({length: 8}, (_, i) => `E${i}`);
  const demand = {
    morning: [3, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };
  const r = Scheduler.generate(empNames, demand, { 
    weekStart: '2026-09-28', 
    patternWeeks: [6, 1, 2, 3, 4, 5, 3, 7], 
    shiftTargets: [
      {m: 5, t: 0, mode: '5M0T'}, 
      {m: 3, t: 2, mode: '3M2T'}, 
      {m: 2, t: 3, mode: '2M3T'}, 
      {m: 2, t: 3, mode: '2M3T'}, 
      {m: 2, t: 3, mode: '2M3T'}, 
      {m: 2, t: 3, mode: '2M3T'}, 
      {m: 3, t: 2, mode: '3M2T'}, 
      {m: 2, t: 3, mode: '2M3T'}
    ]
  });
  
  assert.strictEqual(r.success, true);
  
  const e0 = r.matrix[0];
  const e0M = e0.filter(s => s === 'M').length;
  const e0T = e0.filter(s => s === 'T').length;
  assert.strictEqual(e0M, 5);
  assert.strictEqual(e0T, 0);

  for (let i = 0; i < 8; i++) {
    const shifts = r.matrix[i];
    const m = shifts.filter(s => s === 'M').length;
    const t = shifts.filter(s => s === 'T').length;
    assert.ok(m >= 1, `Empleado ${i} no tiene al menos 1 M`);
    assert.strictEqual(m + t, 5, `Empleado ${i} no tiene 5 turnos laborables`);
  }

  // Exact daily coverage assertion
  for (let d = 0; d < 7; d++) {
    const countM = r.matrix.filter(row => row[d] === 'M').length;
    const countT = r.matrix.filter(row => row[d] === 'T').length;
    assert.strictEqual(countM, demand.morning[d], `Día ${d}: mañanas esperadas ${demand.morning[d]}, obtenidas ${countM}`);
    assert.strictEqual(countT, demand.afternoon[d], `Día ${d}: tardes esperadas ${demand.afternoon[d]}, obtenidas ${countT}`);
  }
});

test('Patrón personalizado + demanda por defecto: éxito y cobertura exacta', () => {
  const empNames = Array.from({length: 8}, (_, i) => `E${i}`);
  const demand = {
    morning: [3, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };
  const patternWeeks = [1, 2, 3, 4, 5, 6, 7, 1];
  const r = Scheduler.generate(empNames, demand, {
    weekStart: '2026-09-28',
    patternWeeks,
    shiftTargets: [
      {m: 5, t: 0, mode: '5M0T'},
      {m: 3, t: 2, mode: '3M2T'},
      {m: 2, t: 3, mode: '2M3T'},
      {m: 2, t: 3, mode: '2M3T'},
      {m: 2, t: 3, mode: '2M3T'},
      {m: 2, t: 3, mode: '2M3T'},
      {m: 3, t: 2, mode: '3M2T'},
      {m: 2, t: 3, mode: '2M3T'}
    ]
  });

  assert.strictEqual(r.success, true);
  for (let d = 0; d < 7; d++) {
    const countM = r.matrix.filter(row => row[d] === 'M').length;
    const countT = r.matrix.filter(row => row[d] === 'T').length;
    assert.strictEqual(countM, demand.morning[d]);
    assert.strictEqual(countT, demand.afternoon[d]);
  }
  for (let emp = 0; emp < 8; emp++) {
    const offDays = [];
    for (let d = 0; d < 7; d++) {
      if (r.matrix[emp][d] === 'L') offDays.push(d);
    }
    assert.strictEqual(offDays.length, 2, `Empleado ${emp} debe tener exactamente 2 libres`);
    const isConsecutive = (offDays[1] === offDays[0] + 1) || (offDays[0] === 0 && offDays[1] === 6);
    assert.ok(isConsecutive, `Empleado ${emp} debe tener 2 libres consecutivos`);
  }
});

test('Rotación multi-semana (7 semanas) con demanda fija', () => {
  const empNames = Array.from({length: 8}, (_, i) => `E${i}`);
  const demand = {
    morning: [3, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };
  const basePatterns = [6, 1, 2, 3, 4, 5, 3, 7];
  for (let k = 0; k < 7; k++) {
    const patternWeeks = basePatterns.map(p => ((p - 1 + k) % 7 + 7) % 7 + 1);
    const r = Scheduler.generate(empNames, demand, {
      weekStart: '2026-09-28',
      patternWeeks,
      shiftTargets: [
        {m: 5, t: 0, mode: '5M0T'},
        {m: 3, t: 2, mode: '3M2T'},
        {m: 2, t: 3, mode: '2M3T'},
        {m: 2, t: 3, mode: '2M3T'},
        {m: 2, t: 3, mode: '2M3T'},
        {m: 2, t: 3, mode: '2M3T'},
        {m: 3, t: 2, mode: '3M2T'},
        {m: 2, t: 3, mode: '2M3T'}
      ]
    });
    assert.strictEqual(r.success, true, `Semana rotada +${k} debe ser exitosa`);
    for (let d = 0; d < 7; d++) {
      const countM = r.matrix.filter(row => row[d] === 'M').length;
      const countT = r.matrix.filter(row => row[d] === 'T').length;
      assert.strictEqual(countM, demand.morning[d]);
      assert.strictEqual(countT, demand.afternoon[d]);
    }
  }
});

test('Demanda infactible por descomposición en pares consecutivos', () => {
  const empNames = Array.from({length: 8}, (_, i) => `E${i}`);
  const demand = {
    morning: [2, 4, 2, 4, 3, 3, 3],
    afternoon: [2, 3, 2, 3, 3, 3, 3]
  };
  const r = Scheduler.generate(empNames, demand, {
    weekStart: '2026-09-28',
    patternWeeks: [6, 1, 2, 3, 4, 5, 3, 7]
  });
  assert.strictEqual(r.success, false);
  assert.ok(r.error.includes('pares de 2 días libres consecutivos'));
});

test('Capacidad total errónea: n=10 con demanda total 40', () => {
  const empNames = Array.from({length: 10}, (_, i) => `E${i}`);
  const demand = {
    morning: [3, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };
  const r = Scheduler.generate(empNames, demand, {
    weekStart: '2026-09-28'
  });
  assert.strictEqual(r.success, false);
  assert.ok(r.error.includes('capacidad de la plantilla'));
});

test('Límite de desviaciones respecto a rotación preferida (<= 2)', () => {
  const empNames = Array.from({length: 8}, (_, i) => `E${i}`);
  const demand = {
    morning: [3, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };
  const patternWeeks = [6, 1, 2, 3, 4, 5, 3, 7];
  const r = Scheduler.generate(empNames, demand, {
    weekStart: '2026-09-28',
    patternWeeks,
    shiftTargets: [
      {m: 5, t: 0, mode: '5M0T'},
      {m: 3, t: 2, mode: '3M2T'},
      {m: 2, t: 3, mode: '2M3T'},
      {m: 2, t: 3, mode: '2M3T'},
      {m: 2, t: 3, mode: '2M3T'},
      {m: 2, t: 3, mode: '2M3T'},
      {m: 3, t: 2, mode: '3M2T'},
      {m: 2, t: 3, mode: '2M3T'}
    ]
  });
  assert.strictEqual(r.success, true);
  let deviations = 0;
  for (let emp = 0; emp < 8; emp++) {
    const prefItem = ROTATING_OFF_PATTERN[(patternWeeks[emp] - 1) % 7];
    const [d1, d2] = prefItem.days;
    if (r.matrix[emp][d1] !== 'L' || r.matrix[emp][d2] !== 'L') {
      deviations++;
    }
  }
  assert.ok(deviations <= 2, `Se esperaban <= 2 desviaciones pero hubo ${deviations}`);
});
