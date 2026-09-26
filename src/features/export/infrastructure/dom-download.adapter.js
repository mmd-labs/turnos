/**
 * Infrastructure Adapter for initiating browser file downloads.
 */

export class DomDownloadAdapter {
  /**
   * Triggers download of a given Blob.
   *
   * @param {Blob} blob
   * @param {string} filename
   */
  downloadBlob(blob, filename) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Triggers download of CSV string content.
   *
   * @param {string} csvContent
   * @param {string} filename
   */
  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, filename);
  }
}

export const domDownloadAdapter = new DomDownloadAdapter();
