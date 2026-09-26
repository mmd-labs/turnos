import { STORAGE_KEYS } from './constants.js';
import { LocalStorageStore } from './core/infrastructure/local-storage.store.js';
import { persistenceNotifier } from './core/infrastructure/persistence-notifier.js';

const store = new LocalStorageStore();

export const Storage = {
  _save(key, data) {
    store.set(key, data);
    persistenceNotifier.notify();
  },

  _load(key) {
    return store.get(key);
  },

  saveNames(names) { this._save(STORAGE_KEYS.NAMES, names); },
  loadNames() { return this._load(STORAGE_KEYS.NAMES); },

  saveConfig(config) { this._save(STORAGE_KEYS.CONFIG, config); },
  loadConfig() { return this._load(STORAGE_KEYS.CONFIG); },

  saveDemand(demand) {
    const config = this.loadConfig() || {};
    config.demand = demand;
    this.saveConfig(config);
  },
  loadDemand() {
    const config = this.loadConfig();
    return (config && config.demand) ? config.demand : null;
  },

  saveDemandForWeek(weekStr, demand) {
    if (!weekStr) return;
    this._save(`${STORAGE_KEYS.DEMAND_WEEK_PREFIX}${weekStr}`, demand);
  },
  loadDemandForWeek(weekStr) {
    if (!weekStr) return null;
    return this._load(`${STORAGE_KEYS.DEMAND_WEEK_PREFIX}${weekStr}`);
  },

  savePatterns(patterns) { this._save(STORAGE_KEYS.PATTERNS, patterns); },
  loadPatterns() { return this._load(STORAGE_KEYS.PATTERNS); },

  saveBaseWeek(weekStr) { this._save(STORAGE_KEYS.BASE_WEEK, weekStr); },
  loadBaseWeek() { return this._load(STORAGE_KEYS.BASE_WEEK); },

  saveGeneratedWeeks(weeksArray) { this._save(STORAGE_KEYS.GENERATED_WEEKS, Array.from(weeksArray)); },
  loadGeneratedWeeks() {
    const arr = this._load(STORAGE_KEYS.GENERATED_WEEKS);
    return arr ? Array.from(arr) : [];
  },

  saveWeeksCount(count) { this._save(STORAGE_KEYS.WEEKS_COUNT, count); },
  loadWeeksCount() { return this._load(STORAGE_KEYS.WEEKS_COUNT); },

  saveSchedule(weekStr, schedule) {
    if (!weekStr) return;
    this._save(`${STORAGE_KEYS.SCHEDULE_WEEK_PREFIX}${weekStr}`, schedule);
  },
  loadSchedule(weekStr) {
    if (!weekStr) return null;
    return this._load(`${STORAGE_KEYS.SCHEDULE_WEEK_PREFIX}${weekStr}`);
  },

  clearSchedule(weekStart) {
    store.remove(STORAGE_KEYS.SCHEDULE);
    if (weekStart) store.remove(`${STORAGE_KEYS.SCHEDULE_WEEK_PREFIX}${weekStart}`);
    persistenceNotifier.notify();
  }
};