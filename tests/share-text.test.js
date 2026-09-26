import test from 'node:test';
import assert from 'node:assert';
import { buildScheduleShareText, buildIndividualShareText } from '../src/features/export/domain/share-text.js';

test('share-text: generación de texto formateado para WhatsApp del cuadrante global', () => {
  const employees = ['Ana', 'Bernardo'];
  const matrix = [
    ['M', 'M', 'M', 'M', 'M', 'L', 'L'],
    ['T', 'T', 'T', 'T', 'T', 'L', 'L'],
  ];
  const weekStart = '2026-03-30';

  const text = buildScheduleShareText({ matrix, employees, weekStart });

  assert.ok(text.includes('*Cuadrante de Turnos Semanal*'));
  assert.ok(text.includes('30 de marzo de 2026'));
  assert.ok(text.includes('☀️ Mañana: Ana'));
  assert.ok(text.includes('🌅 Tarde: Bernardo'));
  assert.ok(text.includes('🏖️ Libre: Ninguno') || text.includes('🏖️ Libre: Ana, Bernardo'));
});

test('share-text: generación de texto de horario individual con emojis y detalles de rotación', () => {
  const employees = ['Ana', 'Bernardo'];
  const matrix = [
    ['M', 'M', 'M', 'M', 'M', 'L', 'L'],
    ['T', 'T', 'T', 'T', 'T', 'L', 'L'],
  ];
  const weekStart = '2026-03-30';

  const individualText = buildIndividualShareText({
    matrix,
    employees,
    weekStart,
    empIndex: 0,
    patternWeek: 1,
    patternLabel: 'Libre Lunes y Martes',
    shiftModeLabel: 'Solo Mañanas (5M)',
  });

  assert.ok(individualText.includes('*Horario Semanal - Ana*'));
  assert.ok(individualText.includes('Semana 1 (Libre Lunes y Martes)'));
  assert.ok(individualText.includes('Solo Mañanas (5M)'));
  assert.ok(individualText.includes('☀️ Mañana'));
  assert.ok(individualText.includes('🏖️ Libre'));
});

test('share-text: manejo seguro de parámetros nulos o ausentes', () => {
  assert.strictEqual(buildScheduleShareText({ matrix: null, employees: [], weekStart: '' }), '');
  assert.strictEqual(buildIndividualShareText({
    matrix: null,
    employees: [],
    weekStart: '',
    empIndex: 0,
    patternWeek: 1,
    patternLabel: '',
    shiftModeLabel: '',
  }), '');
});
