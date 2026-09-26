import { STORAGE_KEYS } from '../../../core/constants/storage-keys.js';

/**
 * Repository implementation for schedules using KeyValueStore or LocalStorage.
 * Maintains envelope { version: 1, data } compatibility.
 * @implements {import('../application/ports.js').ScheduleRepository}
 */
export class LocalScheduleRepository {
  /**
   * @param {Object} [options]
   * @param {Object} [options.store] - Object implementing get(key) and set(key, val)
   * @param {() => void} [options.onPersisted] - Callback triggered when data is saved
   */
  constructor({ store = null, onPersisted = null } = {}) {
    this.store = store;
    this.onPersisted = onPersisted;
  }

  _save(key, data) {
    if (this.store) {
      this.store.set(key, { version: 1, data });
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify({ version: 1, data }));
    }
    if (this.onPersisted) {
      this.onPersisted();
    }
  }

  _load(key) {
    if (this.store) {
      const parsed = this.store.get(key);
      if (!parsed) return null;
      if (parsed.version === 1) return parsed.data;
      return parsed;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) return parsed.data;
        return Array.isArray(parsed) || typeof parsed === 'object' ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  save(weekStr, schedule) {
    if (!weekStr) return;
    this._save(`${STORAGE_KEYS.SCHEDULE_WEEK_PREFIX}${weekStr}`, schedule);
  }

  load(weekStr) {
    if (!weekStr) return null;
    return this._load(`${STORAGE_KEYS.SCHEDULE_WEEK_PREFIX}${weekStr}`);
  }

  saveGeneratedWeeks(weeksArray) {
    this._save(STORAGE_KEYS.GENERATED_WEEKS, Array.from(weeksArray || []));
  }

  loadGeneratedWeeks() {
    const arr = this._load(STORAGE_KEYS.GENERATED_WEEKS);
    return Array.isArray(arr) ? Array.from(arr) : [];
  }
}
