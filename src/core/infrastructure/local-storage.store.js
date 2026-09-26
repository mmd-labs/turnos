/**
 * LocalStorage KeyValueStore implementation preserving { version: 1, data } envelope.
 * Safely falls back if localStorage is restricted or running outside browser.
 * @implements {import('../ports/store.port.js').KeyValueStore}
 */
export class LocalStorageStore {
  constructor() {
    this._memoryFallback = new Map();
  }

  _isAvailable() {
    try {
      return typeof localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  get(key) {
    if (!this._isAvailable()) {
      return this._memoryFallback.get(key) ?? null;
    }
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.version === 1) {
        return parsed.data;
      }
      return Array.isArray(parsed) || typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  set(key, value) {
    if (!this._isAvailable()) {
      this._memoryFallback.set(key, value);
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, data: value }));
    } catch (err) {
      console.warn('LocalStorageStore: failed to write to localStorage', err);
      this._memoryFallback.set(key, value);
    }
  }

  remove(key) {
    if (!this._isAvailable()) {
      this._memoryFallback.delete(key);
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }

  keys() {
    if (!this._isAvailable()) {
      return Array.from(this._memoryFallback.keys());
    }
    const result = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) result.push(k);
      }
    } catch {
      // Ignore
    }
    return result;
  }
}
