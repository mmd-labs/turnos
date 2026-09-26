/**
 * Infrastructure Adapter for Web Share API and Clipboard Copy.
 */

export class NavigatorShareAdapter {
  /**
   * Attempts to share text via Web Share API, falling back to clipboard copy.
   *
   * @param {Object} params
   * @param {string} params.title
   * @param {string} params.text
   * @param {() => void} [params.onShareSuccess]
   * @param {() => void} [params.onCopySuccess]
   * @param {(err: unknown) => void} [params.onError]
   */
  async shareOrCopy({ title, text, onShareSuccess, onCopySuccess, onError }) {
    if (!text) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text });
        if (onShareSuccess) onShareSuccess();
        return;
      } catch (err) {
        const error = /** @type {{ name?: string }} */ (err);
        if (error && error.name === 'AbortError') return;
      }
    }

    // Fallback: Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        if (onCopySuccess) onCopySuccess();
        return;
      } catch (err) {
        // Fallback to DOM execCommand below
      }
    }

    // Fallback: document.execCommand('copy')
    try {
      if (typeof document !== 'undefined') {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        if (onCopySuccess) onCopySuccess();
        return;
      }
    } catch (err) {
      if (onError) onError(err);
    }
  }
}

export const navigatorShareAdapter = new NavigatorShareAdapter();
