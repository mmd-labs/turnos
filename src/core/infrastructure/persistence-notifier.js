/**
 * Event notifier for persistence events.
 * Decouples storage and repositories from network/sync side effects (SRP & DIP).
 */
export class PersistenceNotifier {
  constructor() {
    /** @type {Set<() => void>} */
    this._listeners = new Set();
  }

  /**
   * Subscribes a listener function to persistence notifications.
   * @param {() => void} listener
   * @returns {() => void} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener === 'function') {
      this._listeners.add(listener);
      return () => this._listeners.delete(listener);
    }
    return () => {};
  }

  /**
   * Notifies all registered listeners of a change in persisted state.
   */
  notify() {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch (err) {
        console.error('PersistenceNotifier error:', err);
      }
    }
  }
}

export const persistenceNotifier = new PersistenceNotifier();
