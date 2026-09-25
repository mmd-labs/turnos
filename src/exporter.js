import { Renderer } from './renderer.js';
import { Toast } from './toast.js';
export const Exporter = {
  async exportToPDF(weekStart) {
    const container = document.getElementById('pdf-container');
    if (!container) return;

    const startDate = weekStart || (Renderer && Renderer.weekStartInput ? Renderer.weekStartInput.value : '');
    const filename = startDate ? `cuadrante-${startDate}.pdf` : 'cuadrante.pdf';

    const btnExport = document.getElementById('btn-export');
    const originalText = btnExport ? btnExport.textContent : '';
    if (btnExport) {
      btnExport.disabled = true;
      btnExport.textContent = 'Generando PDF...';
    }

    const opt = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    };

    try {
      await html2pdf().set(opt).from(container).save();
      Toast.show('PDF exportado con éxito.', 'success');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      Toast.show('Error al exportar el PDF. Inténtalo de nuevo.', 'error');
    } finally {
      if (btnExport) {
        btnExport.disabled = false;
        btnExport.textContent = originalText;
      }
    }
  },

  exportToCSV(matrix, employees, weekStart) {
    if (!matrix || !employees) return;
    const startDate = weekStart || (Renderer && Renderer.weekStartInput ? Renderer.weekStartInput.value : '');
    const dayDates = Renderer._getDayDates(startDate);

    // 1. Matriz por turnos
    const headers = ['Turno', ...dayDates.map(d => `${d.name} (${d.date})`)];
    const shifts = [
      { key: 'M', label: 'Mañana' },
      { key: 'T', label: 'Tarde' },
      { key: 'L', label: 'Libre' }
    ];

    const rows = [
      [`Cuadrante de Turnos - Semana del ${Renderer._formatDateLong(startDate)}`],
      [],
      headers
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
      let m = 0, t = 0, l = 0;
      for (let d = 0; d < 7; d++) {
        const s = matrix[e] ? matrix[e][d] : 'L';
        if (s === 'M') { m++; empRow.push('Mañana'); }
        else if (s === 'T') { t++; empRow.push('Tarde'); }
        else { l++; empRow.push('Libre'); }
      }
      empRow.push(m, t, l, `${(m + t) * 8} h`);
      rows.push(empRow);
    }

    // Codificación UTF-8 con BOM para que Microsoft Excel abra acentos correctamente
    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(';')).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', startDate ? `cuadrante-${startDate}.csv` : 'cuadrante.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Toast.show('Cuadrante exportado a Excel (CSV) con éxito.', 'success');
  }
};

/* ============================================
   MODULE: Auditor & Live Balance
   ============================================ */

export const ShareHelper = {
  getShareText(matrix, employees, weekStart) {
    if (!matrix || !employees) return '';
    const startDate = weekStart || (Renderer && Renderer.weekStartInput ? Renderer.weekStartInput.value : '');
    const dayDates = Renderer._getDayDates(startDate);

    let text = `📅 *Cuadrante de Turnos Semanal*\n`;
    text += `🗓️ Semana del ${Renderer._formatDateLong(startDate)}\n\n`;

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
  },

  async share(matrix, employees, weekStart) {
    const text = this.getShareText(matrix, employees, weekStart);
    if (!text) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cuadrante de Turnos Semanal',
          text: text,
        });
        Toast.show('Cuadrante compartido con éxito.', 'success');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback portapapeles
    try {
      await navigator.clipboard.writeText(text);
      Toast.show('¡Cuadrante copiado al portapapeles para WhatsApp!', 'success');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      Toast.show('¡Cuadrante copiado al portapapeles!', 'success');
    }
  }
};

/* ============================================
   MODULE: IndividualView (Modal)
   ============================================ */