import { getDayDates, formatDateLong } from '../../../core/date.js';

/**
 * Pure domain function to build a WhatsApp-friendly markdown summary of the whole weekly schedule.
 *
 * @param {Object} params
 * @param {string[][]} params.matrix
 * @param {string[]} params.employees
 * @param {string} params.weekStart
 * @returns {string}
 */
export function buildScheduleShareText({ matrix, employees, weekStart }) {
  if (!matrix || !employees || !weekStart) return '';

  const dayDates = getDayDates(weekStart);

  let text = `📅 *Cuadrante de Turnos Semanal*\n`;
  text += `🗓️ Semana del ${formatDateLong(weekStart)}\n\n`;

  dayDates.forEach((d, dayIdx) => {
    const morningEmps = [];
    const afternoonEmps = [];
    const freeEmps = [];

    for (let e = 0; e < employees.length; e++) {
      const shift = matrix[e] ? matrix[e][dayIdx] : 'L';
      if (shift === 'M') morningEmps.push(employees[e]);
      else if (shift === 'T') afternoonEmps.push(employees[e]);
      else freeEmps.push(employees[e]);
    }

    text += `📍 *${d.name} (${d.date})*\n`;
    text += `☀️ Mañana: ${morningEmps.length ? morningEmps.join(', ') : 'Ninguno'}\n`;
    text += `🌅 Tarde: ${afternoonEmps.length ? afternoonEmps.join(', ') : 'Ninguno'}\n`;
    text += `🏖️ Libre: ${freeEmps.length ? freeEmps.join(', ') : 'Ninguno'}\n\n`;
  });

  return text.trim();
}

/**
 * Pure domain function to build a WhatsApp-friendly individual employee schedule message.
 *
 * @param {Object} params
 * @param {string[][]} params.matrix
 * @param {string[]} params.employees
 * @param {string} params.weekStart
 * @param {number} params.empIndex
 * @param {number} params.patternWeek
 * @param {string} params.patternLabel
 * @param {string} params.shiftModeLabel
 * @returns {string}
 */
export function buildIndividualShareText({
  matrix,
  employees,
  weekStart,
  empIndex,
  patternWeek,
  patternLabel,
  shiftModeLabel,
}) {
  if (!matrix || !employees || !weekStart) return '';

  const empName = employees[empIndex] || `Empleado ${empIndex + 1}`;
  const dayDates = getDayDates(weekStart);
  const shiftEmojis = { M: '☀️ Mañana', T: '🌅 Tarde', L: '🏖️ Libre' };

  let msg = `👤 *Horario Semanal - ${empName}*\n`;
  msg += `🗓️ Semana del ${formatDateLong(weekStart)}\n`;
  msg += `🔄 *Patrón rotativo:* Semana ${patternWeek} (${patternLabel})\n`;
  msg += `⏱️ *Turnos:* ${shiftModeLabel}\n\n`;

  dayDates.forEach((d, dayIdx) => {
    const shiftKey = (matrix && matrix[empIndex]) ? matrix[empIndex][dayIdx] : 'L';
    msg += `• *${d.name} (${d.date})*: ${shiftEmojis[shiftKey] || 'Libre'}\n`;
  });

  return msg.trim();
}
