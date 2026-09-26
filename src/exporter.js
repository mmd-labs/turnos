/**
 * Exporter and ShareHelper Facade.
 * Delegates to:
 * - Domain: csv-builder, share-text
 * - Infrastructure: dom-download.adapter, navigator-share.adapter, html2pdf.adapter
 */

import { buildScheduleCSV } from './features/export/domain/csv-builder.js';
import { buildScheduleShareText } from './features/export/domain/share-text.js';
import { domDownloadAdapter } from './features/export/infrastructure/dom-download.adapter.js';
import { navigatorShareAdapter } from './features/export/infrastructure/navigator-share.adapter.js';
import { html2PdfAdapter } from './features/export/infrastructure/html2pdf.adapter.js';
import { Toast } from './toast.js';

export const Exporter = {
  /**
   * @param {string} [weekStart]
   */
  async exportToPDF(weekStart) {
    const container = document.getElementById('pdf-container');
    if (!container) return;

    const startDate = weekStart || '';
    const filename = startDate ? `cuadrante-${startDate}.pdf` : 'cuadrante.pdf';

    const btnExport = /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-export'));
    const originalText = btnExport ? btnExport.textContent : '';
    if (btnExport) {
      btnExport.disabled = true;
      btnExport.textContent = 'Generando PDF...';
    }

    try {
      await html2PdfAdapter.generatePDF(container, filename);
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

  /**
   * @param {string[][]} matrix
   * @param {string[]} employees
   * @param {string} weekStart
   */
  exportToCSV(matrix, employees, weekStart) {
    if (!matrix || !employees || !weekStart) return;

    const csvContent = buildScheduleCSV({ matrix, employees, weekStart });
    const filename = weekStart ? `cuadrante-${weekStart}.csv` : 'cuadrante.csv';

    domDownloadAdapter.downloadCSV(csvContent, filename);
    Toast.show('Cuadrante exportado a Excel (CSV) con éxito.', 'success');
  },
};

export const ShareHelper = {
  /**
   * @param {string[][]} matrix
   * @param {string[]} employees
   * @param {string} weekStart
   * @returns {string}
   */
  getShareText(matrix, employees, weekStart) {
    return buildScheduleShareText({ matrix, employees, weekStart });
  },

  /**
   * @param {string[][]} matrix
   * @param {string[]} employees
   * @param {string} weekStart
   */
  async share(matrix, employees, weekStart) {
    const text = this.getShareText(matrix, employees, weekStart);
    if (!text) return;

    await navigatorShareAdapter.shareOrCopy({
      title: 'Cuadrante de Turnos Semanal',
      text,
      onShareSuccess: () => Toast.show('Cuadrante compartido con éxito.', 'success'),
      onCopySuccess: () => Toast.show('¡Cuadrante copiado al portapapeles para WhatsApp!', 'success'),
      onError: () => Toast.show('¡Cuadrante copiado al portapapeles!', 'success'),
    });
  },
};
