import test from 'node:test';
import assert from 'node:assert';

import {
  calculatePatternWeek,
  calculateBasePattern,
  calculateEffectiveShiftMode,
  getShiftStrategy,
  getEffectivePatternWeeks,
  getEffectiveShiftTargets
} from '../src/features/scheduling/domain/patterns.js';

test('patterns: mod-7 rotación cíclica forward y backward', () => {
  // Patrón 1 avanza en 1 semana -> Patrón 2
  assert.strictEqual(calculatePatternWeek(1, 1), 2);
  // Patrón 7 avanza en 1 semana -> Patrón 1 (vuelta cíclica)
  assert.strictEqual(calculatePatternWeek(7, 1), 1);
  // Patrón 1 avanza 7 semanas -> Patrón 1 (ciclo completo)
  assert.strictEqual(calculatePatternWeek(1, 7), 1);
  // Retroceder 1 semana desde patrón 1 -> Patrón 7
  assert.strictEqual(calculatePatternWeek(1, -1), 7);
  // Retroceder 2 semanas desde patrón 2 -> Patrón 7
  assert.strictEqual(calculatePatternWeek(2, -2), 7);
});

test('patterns: reversibilidad entre calculatePatternWeek y calculateBasePattern', () => {
  for (let base = 1; base <= 7; base++) {
    for (let diff = -14; diff <= 14; diff++) {
      const eff = calculatePatternWeek(base, diff);
      const restored = calculateBasePattern(eff, diff);
      assert.strictEqual(restored, base, `Fallo revirtiendo base=${base} diff=${diff}`);
    }
  }
});

test('patterns: modos de turno para empleado clave (emp 0) siempre es 5M0T', () => {
  assert.strictEqual(calculateEffectiveShiftMode(0, '3M2T', 0), '5M0T');
  assert.strictEqual(calculateEffectiveShiftMode(0, '2M3T', 1), '5M0T');
  assert.strictEqual(calculateEffectiveShiftMode(0, '5M0T', 5), '5M0T');
});

test('patterns: alternancia de modos 3M2T y 2M3T entre semanas pares e impares', () => {
  // Semanas pares (0, 2, -2) mantienen el modo base
  assert.strictEqual(calculateEffectiveShiftMode(1, '3M2T', 0), '3M2T');
  assert.strictEqual(calculateEffectiveShiftMode(1, '3M2T', 2), '3M2T');
  assert.strictEqual(calculateEffectiveShiftMode(1, '2M3T', -2), '2M3T');

  // Semanas impares (1, 3, -1) alternan
  assert.strictEqual(calculateEffectiveShiftMode(1, '3M2T', 1), '2M3T');
  assert.strictEqual(calculateEffectiveShiftMode(1, '2M3T', 1), '3M2T');
  assert.strictEqual(calculateEffectiveShiftMode(1, '3M2T', -1), '2M3T');
});

test('patterns: shift mode strategy registry (OCP)', () => {
  const s5m = getShiftStrategy('5M0T');
  assert.strictEqual(s5m.m, 5);
  assert.strictEqual(s5m.t, 0);

  const s3m = getShiftStrategy('3M2T');
  assert.strictEqual(s3m.m, 3);
  assert.strictEqual(s3m.t, 2);

  const s2m = getShiftStrategy('2M3T');
  assert.strictEqual(s2m.m, 2);
  assert.strictEqual(s2m.t, 3);

  // Fallback seguro
  const unknown = getShiftStrategy('UNKNOWN');
  assert.strictEqual(unknown.mode, '2M3T');
});

test('patterns: getEffectivePatternWeeks y getEffectiveShiftTargets pura integración', () => {
  const count = 8;
  const baseWeek = '2026-09-28';
  const targetWeek = '2026-10-05'; // +1 semana

  const patWeeks = getEffectivePatternWeeks({ count, baseWeek, targetWeek });
  assert.strictEqual(patWeeks.length, 8);

  const targets = getEffectiveShiftTargets({ count, baseWeek, targetWeek });
  assert.strictEqual(targets.length, 8);
  assert.strictEqual(targets[0].mode, '5M0T');
  assert.strictEqual(targets[0].m, 5);
  assert.strictEqual(targets[0].t, 0);
});
