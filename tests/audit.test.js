import test from 'node:test';
import assert from 'node:assert';

import { auditSchedule } from '../src/features/audit/domain/audit-schedule.js';
import { Scheduler } from '../src/features/scheduling/domain/scheduler.js';

test('audit: cuadrante óptimo sin transiciones T->M produce Balance Óptimo', () => {
  const employees = Array.from({ length: 10 }, (_, i) => `Emp ${i + 1}`);
  const perfectMatrix = [
    ['M', 'M', 'M', 'M', 'M', 'L', 'L'], // E0 (Sem 6)
    ['T', 'T', 'L', 'L', 'M', 'M', 'M'], // E1 (Sem 3)
    ['T', 'T', 'L', 'L', 'M', 'M', 'M'], // E2 (Sem 3)
    ['T', 'T', 'L', 'L', 'M', 'M', 'M'], // E3 (Sem 3)
    ['L', 'L', 'M', 'M', 'T', 'T', 'T'], // E4 (Sem 1)
    ['L', 'L', 'M', 'M', 'T', 'T', 'T'], // E5 (Sem 1)
    ['L', 'L', 'M', 'M', 'T', 'T', 'T'], // E6 (Sem 1)
    ['M', 'M', 'T', 'T', 'L', 'L', 'M'], // E7 (Sem 5)
    ['M', 'M', 'T', 'T', 'L', 'L', 'M'], // E8 (Sem 5)
    ['M', 'M', 'M', 'T', 'T', 'L', 'L'], // E9 (Sem 6)
  ];
  const demand = {
    morning: [4, 4, 5, 4, 4, 3, 5],
    afternoon: [3, 3, 2, 3, 4, 3, 3]
  };
  const pats = [6, 3, 3, 3, 1, 1, 1, 5, 5, 6];

  const report = auditSchedule(perfectMatrix, employees, demand, {
    weekStart: '2026-09-28',
    getPatternWeek: (e) => pats[e],
    getShiftMode: (e) => (e === 0 ? '5M0T' : (e <= 3 ? '3M2T' : '2M3T'))
  });

  assert.ok(report !== null);
  assert.strictEqual(report.totalDemandMismatches, 0);
  assert.strictEqual(report.totalOffdayMismatches, 0);
  assert.strictEqual(report.totalConsecutiveMismatches, 0);
  assert.strictEqual(report.totalMorningIssues, 0);
  assert.strictEqual(report.totalFatigueIssues, 0);
  assert.strictEqual(report.globalBadgeClass, 'badge--success');
  assert.strictEqual(report.globalBadgeText, 'Balance Óptimo ✅');
});

test('audit: cuadrante con avisos ergonómicos produce badge--warning', () => {
  const employees = Array.from({ length: 8 }, (_, i) => `Emp ${i + 1}`);
  const demand = {
    morning: [3, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };
  const patternWeeks = [6, 1, 2, 3, 4, 5, 3, 7];
  const shiftTargets = [
    { m: 5, t: 0, mode: '5M0T' },
    { m: 3, t: 2, mode: '3M2T' },
    { m: 2, t: 3, mode: '2M3T' },
    { m: 2, t: 3, mode: '2M3T' },
    { m: 2, t: 3, mode: '2M3T' },
    { m: 2, t: 3, mode: '2M3T' },
    { m: 3, t: 2, mode: '3M2T' },
    { m: 2, t: 3, mode: '2M3T' }
  ];

  const schedResult = Scheduler.generate(employees, demand, { patternWeeks, shiftTargets });
  assert.strictEqual(schedResult.success, true);

  const report = auditSchedule(schedResult.matrix, employees, demand, {
    weekStart: '2026-09-28',
    getPatternWeek: (e) => patternWeeks[e],
    getShiftMode: (e) => shiftTargets[e].mode
  });

  assert.ok(report !== null);
  // En cuadrante generado válidamente, no debe haber violaciones de negocio duras:
  assert.strictEqual(report.totalDemandMismatches, 0);
  assert.strictEqual(report.totalOffdayMismatches, 0);
  assert.strictEqual(report.totalConsecutiveMismatches, 0);
  assert.strictEqual(report.totalMorningIssues, 0);
  // Y el badge global debe ser éxito o advertencia de fatiga, nunca peligro (danger)
  assert.ok(['badge--success', 'badge--warning'].includes(report.globalBadgeClass));
});

test('audit: detección de violaciones conocidas produce badge--danger', () => {
  const employees = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'];
  const demand = {
    morning: [3, 3, 3, 3, 3, 3, 3],
    afternoon: [3, 3, 2, 2, 3, 3, 3]
  };

  // Matriz con violaciones intencionales:
  // E0 (clave) trabaja tarde ('T') el día 0 y solo 1 descanso
  const invalidMatrix = Array.from({ length: 8 }, () => ['M', 'M', 'M', 'M', 'M', 'L', 'L']);
  invalidMatrix[0][0] = 'T'; // Violación clave: T > 0
  invalidMatrix[1] = ['L', 'M', 'L', 'M', 'M', 'M', 'M']; // Violación libres: no seguidos (0 y 2)
  invalidMatrix[2] = ['M', 'M', 'T', 'M', 'M', 'L', 'L']; // Transición T -> M en días 2 -> 3

  const report = auditSchedule(invalidMatrix, employees, demand, {
    weekStart: '2026-09-28',
    getPatternWeek: () => 1,
    getShiftMode: (e) => (e === 0 ? '5M0T' : '3M2T')
  });

  assert.ok(report !== null);
  assert.ok(report.totalMorningIssues > 0, 'Debe detectar problema con el empleado clave o falta de mañanas');
  assert.ok(report.totalConsecutiveMismatches > 0, 'Debe detectar descansos no consecutivos');
  assert.ok(report.totalFatigueIssues > 0, 'Debe detectar transición T -> M');
  assert.strictEqual(report.globalBadgeClass, 'badge--danger');
  assert.ok(report.globalBadgeText.includes('Ajuste requerido'));
});

test('audit: empleado con semana completa de Vacaciones o Baja no genera falsas violaciones de libres ni mañanas', () => {
  const employees = ['E1_Clave', 'E2_Vacaciones', 'E3_Baja'];
  const matrix = [
    ['M', 'M', 'M', 'M', 'M', 'L', 'L'], // Clave 5M 2L
    ['V', 'V', 'V', 'V', 'V', 'V', 'V'], // Vacaciones toda la semana
    ['B', 'B', 'B', 'B', 'B', 'B', 'B'], // Baja toda la semana
  ];
  const demand = {
    morning: [1, 1, 1, 1, 1, 0, 0],
    afternoon: [0, 0, 0, 0, 0, 0, 0]
  };

  const report = auditSchedule(matrix, employees, demand, {
    weekStart: '2026-09-28',
    getPatternWeek: () => 1,
    getShiftMode: (e) => (e === 0 ? '5M0T' : '3M2T')
  });

  assert.ok(report !== null);
  assert.strictEqual(report.totalMorningIssues, 0, 'No debe penalizar por mañanas a quien está de vacaciones o baja');
  assert.strictEqual(report.totalOffdayMismatches, 0, 'No debe penalizar días libres a quien tiene ausencia completa');
  assert.strictEqual(report.totalConsecutiveMismatches, 0, 'No debe exigir libres consecutivos a quien no trabaja');

  // Comprobar cómputo de horas y estado de ausencia
  const statVac = report.empStats[1];
  assert.strictEqual(statVac.hours, 0, 'Vacaciones computan 0 horas laborables');
  assert.strictEqual(statVac.v, 7);
  assert.strictEqual(statVac.isFullAbsence, true);
  assert.strictEqual(statVac.statusClass, 'ok');

  const statBaja = report.empStats[2];
  assert.strictEqual(statBaja.hours, 0, 'Baja médica computa 0 horas laborables');
  assert.strictEqual(statBaja.b, 7);
  assert.strictEqual(statBaja.isFullAbsence, true);
  assert.strictEqual(statBaja.statusClass, 'ok');
});

test('audit: empleado con ausencia parcial computa horas laborables proporcionalmente', () => {
  const employees = ['E1'];
  const matrix = [
    ['V', 'V', 'M', 'M', 'M', 'L', 'L'], // 2 Vacaciones, 3 Mañanas, 2 Libres
  ];
  const demand = {
    morning: [0, 0, 1, 1, 1, 0, 0],
    afternoon: [0, 0, 0, 0, 0, 0, 0]
  };

  const report = auditSchedule(matrix, employees, demand, {
    weekStart: '2026-09-28',
    getPatternWeek: () => 1,
    getShiftMode: () => '3M2T'
  });

  assert.ok(report !== null);
  const stat = report.empStats[0];
  assert.strictEqual(stat.v, 2);
  assert.strictEqual(stat.m, 3);
  assert.strictEqual(stat.l, 2);
  assert.strictEqual(stat.hours, 24, '3 mañanas x 8h = 24h laborables');
});

