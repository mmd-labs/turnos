import test from 'node:test';
import assert from 'node:assert';

import {
  getMonday,
  formatDate,
  normalizeToMonday,
  formatDateLong,
  getWeeksDiff,
  getDayDates,
  getNextMonday
} from '../src/core/date.js';
import { escapeHtml } from '../src/core/html.js';

test('core/date: getMonday normaliza correctamente días de la semana al lunes', () => {
  // 2026-09-28 es Lunes
  // 2026-09-30 es Miércoles
  // 2026-10-04 es Domingo
  const monday = getMonday('2026-09-28');
  assert.strictEqual(formatDate(monday), '2026-09-28');

  const wednesday = getMonday('2026-09-30');
  assert.strictEqual(formatDate(wednesday), '2026-09-28');

  // El domingo 4 de octubre pertenece a la semana que empezó el lunes 28 de septiembre
  const sunday = getMonday('2026-10-04');
  assert.strictEqual(formatDate(sunday), '2026-09-28');

  // El lunes 5 de octubre es una nueva semana
  const nextMonday = getMonday('2026-10-05');
  assert.strictEqual(formatDate(nextMonday), '2026-10-05');
});

test('core/date: manejo de valores vacíos o nulos', () => {
  assert.strictEqual(getMonday(''), null);
  assert.strictEqual(getMonday(null), null);
  assert.strictEqual(getMonday(undefined), null);
  assert.strictEqual(normalizeToMonday(''), '');
  assert.strictEqual(normalizeToMonday(null), '');
  assert.strictEqual(formatDate(null), '');
  assert.strictEqual(formatDateLong(''), '');
});

test('core/date: normalizeToMonday retorna string YYYY-MM-DD correcto', () => {
  assert.strictEqual(normalizeToMonday('2026-10-01'), '2026-09-28');
  assert.strictEqual(normalizeToMonday('2026-09-28'), '2026-09-28');
});

test('core/date: getWeeksDiff calcula diferencias positivas, negativas y nulas', () => {
  assert.strictEqual(getWeeksDiff('2026-09-28', '2026-09-28'), 0);
  assert.strictEqual(getWeeksDiff('2026-09-28', '2026-10-05'), 1);
  assert.strictEqual(getWeeksDiff('2026-09-28', '2026-10-12'), 2);
  assert.strictEqual(getWeeksDiff('2026-10-12', '2026-09-28'), -2);
  assert.strictEqual(getWeeksDiff('', '2026-09-28'), 0);
});

test('core/date: getDayDates genera 7 días con nombres y fechas correlativas', () => {
  const dates = getDayDates('2026-09-28');
  assert.strictEqual(dates.length, 7);
  assert.strictEqual(dates[0].short, 'Lun');
  assert.strictEqual(dates[0].date, '28/09');
  assert.strictEqual(dates[0].fullDate, '28/09/2026');

  assert.strictEqual(dates[6].short, 'Dom');
  assert.strictEqual(dates[6].date, '04/10');
  assert.strictEqual(dates[6].fullDate, '04/10/2026');
});

test('core/date: getNextMonday siempre retorna un lunes posterior', () => {
  const fromSaturday = new Date(2026, 8, 26); // Sáb 26 Sep 2026
  const nextMon = getNextMonday(fromSaturday);
  assert.strictEqual(nextMon.getDay(), 1); // 1 = Lunes
  assert.strictEqual(formatDate(nextMon), '2026-09-28');
});

test('core/html: escapeHtml escapa caracteres especiales sin depender de DOM', () => {
  assert.strictEqual(escapeHtml('Hola & adiós'), 'Hola &amp; adiós');
  assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.strictEqual(escapeHtml("Mar's"), 'Mar&#039;s');
  assert.strictEqual(escapeHtml(null), '');
  assert.strictEqual(escapeHtml(undefined), '');
  assert.strictEqual(escapeHtml(123), '123');
});
