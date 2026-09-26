/**
 * Infrastructure Adapter for client-side HTML to PDF generation using html2pdf.js.
 */

export class Html2PdfAdapter {
  /**
   * Generates and downloads a PDF from an HTML element.
   *
   * @param {HTMLElement} element
   * @param {string} filename
   * @returns {Promise<void>}
   */
  async generatePDF(element, filename) {
    // @ts-ignore - html2pdf is loaded globally via vendor script
    if (typeof html2pdf === 'undefined') {
      throw new Error('html2pdf library is not loaded');
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

    // @ts-ignore
    await html2pdf().set(opt).from(element).save();
  }
}

export const html2PdfAdapter = new Html2PdfAdapter();
