import { STORAGE_KEYS } from '../../../core/constants/storage-keys.js';
import { LocalStorageStore } from '../../../core/infrastructure/local-storage.store.js';

/**
 * Settings and Demands repository implementation.
 * @implements {import('../application/ports.js').SettingsRepository}
 */
export class LocalSettingsRepository {
  /**
   * @param {Object} [options]
   * @param {import('../../../core/ports/store.port.js').KeyValueStore} [options.store]
   * @param {() => void} [options.onPersisted]
   */
  constructor({ store = new LocalStorageStore(), onPersisted = null } = {}) {
    this.store = store;
    this.onPersisted = onPersisted;
  }

  _notify() {
    if (typeof this.onPersisted === 'function') {
      this.onPersisted();
    }
  }

  saveNames(names) {
    this.store.set(STORAGE_KEYS.NAMES, names);
    this._notify();
  }

  loadNames() {
    return this.store.get(STORAGE_KEYS.NAMES);
  }

  saveConfig(config) {
    this.store.set(STORAGE_KEYS.CONFIG, config);
    this._notify();
  }

  loadConfig() {
    return this.store.get(STORAGE_KEYS.CONFIG);
  }

  saveDemand(demand) {
    const config = this.loadConfig() || {};
    config.demand = demand;
    this.saveConfig(config);
  }

  loadDemand() {
    const config = this.loadConfig();
    return (config && config.demand) ? config.demand : null;
  }

  saveDemandForWeek(weekStr, demand) {
    if (!weekStr) return;
    this.store.set(`${STORAGE_KEYS.DEMAND_WEEK_PREFIX}${weekStr}`, demand);
    this._notify();
  }

  loadDemandForWeek(weekStr) {
    if (!weekStr) return null;
    return this.store.get(`${STORAGE_KEYS.DEMAND_WEEK_PREFIX}${weekStr}`);
  }

  savePatterns(patterns) {
    this.store.set(STORAGE_KEYS.PATTERNS, patterns);
    this._notify();
  }

  loadPatterns() {
    return this.store.get(STORAGE_KEYS.PATTERNS);
  }

  saveBaseWeek(weekStr) {
    this.store.set(STORAGE_KEYS.BASE_WEEK, weekStr);
    this._notify();
  }

  loadBaseWeek() {
    return this.store.get(STORAGE_KEYS.BASE_WEEK);
  }

  saveWeeksCount(count) {
    this.store.set(STORAGE_KEYS.WEEKS_COUNT, count);
    this._notify();
  }

  loadWeeksCount() {
    return this.store.get(STORAGE_KEYS.WEEKS_COUNT);
  }
}
