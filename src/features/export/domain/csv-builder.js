import { getDayDates, formatDateLong } from '../../../core/date.js';

/**
 * Pure domain function to build a CSV spreadsheet for a given schedule.
 * Outputs UTF-8 with BOM (\uFEFF), semicolon (;) delimiter for Excel compatibility.
 *
 * @param {Object} params
 * @param {string[][]} params.matrix
 * @param {string[]} params.employees
 * @param {string} params.weekStart
 * @returns {string}
 */
export function buildScheduleCSV({ matrix, employees, weekStart }) {
  if (!matrix || !employees || !weekStart) return '';

  const dayDates = getDayDates(weekStart);

  // 1. Matriz por turnos
  const headers = ['Turno', ...dayDates.map(d => `${d.name} (${d.date})`)];
  const shifts = [
    { key: 'M', label: 'Mañana' },
    { key: 'T', label: 'Tarde' },
    { key: 'L', label: 'Libre' },
  ];

  const rows = [
    [`Cuadrante de Turnos - Semana del ${formatDateLong(weekStart)}`],
    [],
    headers,
  ];

  shifts.forEach(shift => {
    const row = [shift.label];
    for (let d = 0; d < 7; d++) {
      const emps = [];
      for (let e = 0; e < employees.length; e++) {
        if (matrix[e] && matrix[e][d] === shift.key) {
          emps.push(employees[e]);
        }
      }
      row.push(emps.length ? emps.join(' | ') : '—');
    }
    rows.push(row);
  });

  // 2. Desglose individual por empleado
  rows.push([]);
  rows.push(['Desglose por Empleado']);
  rows.push(['Empleado', ...dayDates.map(d => `${d.short} (${d.date})`), 'Mañanas', 'Tardes', 'Libres', 'Total Horas (8h/turno)']);

  for (let e = 0; e < employees.length; e++) {
    const empRow = [employees[e]];
    let m = 0;
    let t = 0;
    let l = 0;
    for (let d = 0; d < 7; d++) {
      const s = matrix[e] ? matrix[e][d] : 'L';
      if (s === 'M') {
        m++;
        empRow.push('Mañana');
      } else if (s === 'T') {
        t++;
        empRow.push('Tarde');
      } else {
        l++;
        empRow.push('Libre');
      }
    }
    empRow.push(m, t, l, `${(m + t) * 8} h`);
    rows.push(empRow);
  }

  // Codificación UTF-8 con BOM para que Microsoft Excel abra acentos correctamente
  return '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
}
