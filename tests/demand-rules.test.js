import test from 'node:test';
import assert from 'node:assert';

import {
  validateDemand,
  getMinStaffForDay,
  clampDemandValue
} from '../src/features/scheduling/domain/rules/demand.js';

test('demand rules: getMinStaffForDay y clampDemandValue', () => {
  // Lunes a Jueves (0..3): mínimo 2
  assert.strictEqual(getMinStaffForDay(0), 2);
  assert.strictEqual(getMinStaffForDay(3), 2);
  assert.strictEqual(clampDemandValue(0, 1), 2);
  assert.strictEqual(clampDemandValue(0, 4), 4);

  // Viernes a Domingo (4..6): mínimo 3
  assert.strictEqual(getMinStaffForDay(4), 3);
  assert.strictEqual(getMinStaffForDay(5), 3);
  assert.strictEqual(getMinStaffForDay(6), 3);
  assert.strictEqual(clampDemandValue(4, 2), 3);
  assert.strictEqual(clampDemandValue(6, 5), 5);
});

test('demand rules: validación exitosa de demanda factible (n=8, total=40)', () => {
  const demand = {
    morning: [3, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };
  const result = validateDemand(demand, 8);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.error, null);
});

test('demand rules: rechazo por personal mínimo en turno entre semana (< 2)', () => {
  const demand = {
    morning: [1, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };
  const result = validateDemand(demand, 8);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('personal mínimo por turno es de 2 empleados'));
});

test('demand rules: rechazo por personal mínimo en fin de semana (< 3)', () => {
  const demand = {
    morning: [3, 3, 3, 3, 2, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };
  const result = validateDemand(demand, 8);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('al menos 3 empleados por cada turno'));
});

test('demand rules: rechazo si demanda diaria supera plantilla total', () => {
  const demand = {
    morning: [5, 3, 3, 3, 3, 3, 3],
    afternoon: [4, 3, 2, 2, 3, 3, 3] // 5 + 4 = 9 > 8 empleados
  };
  const result = validateDemand(demand, 8);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('supera la cantidad total de empleados'));
});

test('demand rules: rechazo si demanda total no coincide con capacidad total', () => {
  const demand = {
    morning: [3, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 3, 3, 3, 3, 3] // total 42 != 40
  };
  const result = validateDemand(demand, 8);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('capacidad de la plantilla'));
});

test('demand rules: rechazo por descomposición en pares consecutivos imposible', () => {
  const demand = {
    morning: [2, 4, 2, 4, 3, 3, 3],
    afternoon: [2, 3, 2, 3, 3, 3, 3]
  };
  const result = validateDemand(demand, 8);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('pares de 2 días libres consecutivos'));
});
