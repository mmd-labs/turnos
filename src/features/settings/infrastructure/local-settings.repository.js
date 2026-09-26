import { STORAGE_KEYS } from '../../../core/constants/storage-keys.js';
import { LocalStorageStore } from '../../../core/infrastructure/local-storage.store.js';

/**
 * Settings and Demands repository implementation.
 * @implements {import('../application/ports.js').SettingsRepository}
 * @implements {import('../../scheduling/application/ports.js').DemandRepository}
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

  /**
   * @param {string[]} names
   */
  saveNames(names) {
    this.store.set(STORAGE_KEYS.NAMES, names);
    this._notify();
  }

  /**
   * @returns {string[]|null}
   */
  loadNames() {
    return this.store.get(STORAGE_KEYS.NAMES);
  }

  /**
   * @param {import('../application/ports.js').AppConfig} config
   */
  saveConfig(config) {
    this.store.set(STORAGE_KEYS.CONFIG, config);
    this._notify();
  }

  /**
   * @returns {import('../application/ports.js').AppConfig|null}
   */
  loadConfig() {
    return this.store.get(STORAGE_KEYS.CONFIG);
  }

  /**
   * @param {import('../../scheduling/domain/entities.js').Demand} demand
   */
  saveDemand(demand) {
    const config = this.loadConfig() || {};
    config.demand = demand;
    this.saveConfig(config);
  }

  /**
   * @returns {import('../../scheduling/domain/entities.js').Demand|null}
   */
  loadDemand() {
    const config = this.loadConfig();
    return (config && config.demand) ? config.demand : null;
  }

  /**
   * @param {import('../../scheduling/domain/entities.js').Demand} demand
   */
  saveDefaultDemand(demand) {
    this.saveDemand(demand);
  }

  /**
   * @returns {import('../../scheduling/domain/entities.js').Demand|null}
   */
  loadDefaultDemand() {
    return this.loadDemand();
  }

  /**
   * @param {string} weekStr
   * @param {import('../../scheduling/domain/entities.js').Demand} demand
   */
  saveDemandForWeek(weekStr, demand) {
    if (!weekStr) return;
    this.store.set(`${STORAGE_KEYS.DEMAND_WEEK_PREFIX}${weekStr}`, demand);
    this._notify();
  }

  /**
   * @param {string} weekStr
   * @returns {import('../../scheduling/domain/entities.js').Demand|null}
   */
  loadDemandForWeek(weekStr) {
    if (!weekStr) return null;
    return this.store.get(`${STORAGE_KEYS.DEMAND_WEEK_PREFIX}${weekStr}`);
  }

  /**
   * @param {number[]} patterns
   */
  savePatterns(patterns) {
    this.store.set(STORAGE_KEYS.PATTERNS, patterns);
    this._notify();
  }

  /**
   * @returns {number[]|null}
   */
  loadPatterns() {
    return this.store.get(STORAGE_KEYS.PATTERNS);
  }

  /**
   * @param {string[]} shiftModes
   */
  saveShiftModes(shiftModes) {
    const config = this.loadConfig() || {};
    config.shiftModes = shiftModes;
    this.saveConfig(config);
  }

  /**
   * @returns {string[]|null}
   */
  loadShiftModes() {
    const config = this.loadConfig();
    return (config && config.shiftModes) ? config.shiftModes : null;
  }

  /**
   * @param {string} weekStr
   */
  saveBaseWeek(weekStr) {
    this.store.set(STORAGE_KEYS.BASE_WEEK, weekStr);
    this._notify();
  }

  /**
   * @returns {string|null}
   */
  loadBaseWeek() {
    return this.store.get(STORAGE_KEYS.BASE_WEEK);
  }

  /**
   * @param {number} count
   */
  saveWeeksCount(count) {
    this.store.set(STORAGE_KEYS.WEEKS_COUNT, count);
    this._notify();
  }

  /**
   * @returns {number|null}
   */
  loadWeeksCount() {
    return this.store.get(STORAGE_KEYS.WEEKS_COUNT);
  }
}
