import test from 'node:test';
import assert from 'node:assert';
import { buildScheduleCSV } from '../src/features/export/domain/csv-builder.js';

test('csv-builder: generación pura de CSV para Microsoft Excel con BOM UTF-8 y punto y coma', () => {
  const employees = ['Ana', 'Bernardo'];
  const matrix = [
    ['M', 'M', 'M', 'M', 'M', 'L', 'L'],
    ['T', 'T', 'T', 'T', 'T', 'L', 'L'],
  ];
  const weekStart = '2026-03-30';

  const csv = buildScheduleCSV({ matrix, employees, weekStart });

  // 1. Debe comenzar con BOM UTF-8 (\uFEFF)
  assert.ok(csv.startsWith('\uFEFF'), 'CSV debe comenzar con BOM UTF-8');

  // 2. Comprobar encabezado de título
  assert.ok(csv.includes('Cuadrante de Turnos - Semana del 30 de marzo de 2026'));

  // 3. Comprobar separadores de celda (;)
  assert.ok(csv.includes('"Turno";"Lunes'), 'Debe utilizar ";" como separador estándar');

  // 4. Comprobar presencia de filas de turnos con nombres asignados
  assert.ok(csv.includes('"Mañana";"Ana"'));
  assert.ok(csv.includes('"Tarde";"Bernardo"'));

  // 5. Comprobar sección de desglose por empleado y cálculo de 8h/turno
  assert.ok(csv.includes('"Desglose por Empleado"'));
  assert.ok(csv.includes('"Ana"'));
  assert.ok(csv.includes('"40 h"'), '5 turnos x 8h = 40h');
});

test('csv-builder: manejo seguro de parámetros nulos o incompletos', () => {
  assert.strictEqual(buildScheduleCSV({ matrix: null, employees: [], weekStart: '' }), '');
  assert.strictEqual(buildScheduleCSV({ matrix: [], employees: null, weekStart: '2026-03-30' }), '');
  assert.strictEqual(buildScheduleCSV({ matrix: [], employees: ['Ana'], weekStart: '' }), '');
});

test('csv-builder: exportación de filas y columnas para Vacaciones y Baja con horas laborables correctas', () => {
  const employees = ['Carlos', 'Diana'];
  const matrix = [
    ['V', 'V', 'V', 'V', 'V', 'L', 'L'], // Carlos: 5 Vacaciones, 2 Libres -> 0 h
    ['B', 'B', 'M', 'M', 'T', 'L', 'L'], // Diana: 2 Bajas, 2 Mañanas, 1 Tarde, 2 Libres -> 24 h
  ];
  const weekStart = '2026-03-30';

  const csv = buildScheduleCSV({ matrix, employees, weekStart });

  // Comprobar filas de la matriz
  assert.ok(csv.includes('"Vacaciones";"Carlos"'));
  assert.ok(csv.includes('"Baja";"Diana"'));

  // Comprobar encabezados de desglose
  assert.ok(csv.includes('"Vacaciones"'));
  assert.ok(csv.includes('"Bajas"'));
  assert.ok(csv.includes('"Total Horas (8h/turno laborable)"'));

  // Comprobar cálculo de horas laborables
  assert.ok(csv.includes('"Carlos"'));
  assert.ok(csv.includes('"0 h"'), 'Carlos no tiene horas laborables al estar de vacaciones');
  assert.ok(csv.includes('"Diana"'));
  assert.ok(csv.includes('"24 h"'), 'Diana tiene 3 turnos trabajados x 8h = 24h');
});

