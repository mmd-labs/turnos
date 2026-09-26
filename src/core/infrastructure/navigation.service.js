/**
 * Event-based navigation service to decouple UI components from global window.App (DIP).
 */
export class NavigationService {
  constructor() {
    /** @type {Set<(weekStr: string) => void>} */
    this._listeners = new Set();
  }

  /**
   * Subscribes a listener to week navigation requests.
   * @param {(weekStr: string) => void} listener
   * @returns {() => void}
   */
  onNavigate(listener) {
    if (typeof listener === 'function') {
      this._listeners.add(listener);
      return () => this._listeners.delete(listener);
    }
    return () => {};
  }

  /**
   * Emits a request to navigate to a specific week.
   * @param {string} weekStr
   */
  navigateToWeek(weekStr) {
    for (const listener of this._listeners) {
      try {
        listener(weekStr);
      } catch (err) {
        console.error('NavigationService error:', err);
      }
    }
  }
}

export const navigationService = new NavigationService();
