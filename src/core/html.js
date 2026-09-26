/**
 * Escapes HTML special characters in a string.
 * Pure function: works in both browser and Node.js environments without DOM dependency.
 * @param {string|number|null|undefined} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
