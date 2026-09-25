import { STORAGE_KEYS } from './constants.js';
import { SyncManager } from './sync.js';

export const Storage = {
  _save(key, data) {
    localStorage.setItem(key, JSON.stringify({ version: 1, data }));
    SyncManager.onLocalChange();
  },

  _load(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) return parsed.data;
      return Array.isArray(parsed) || typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
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
  
  saveDemandsByWeek(map) { this._save(STORAGE_KEYS.DEMANDS_BY_WEEK, map); },
  loadDemandsByWeek() { return this._load(STORAGE_KEYS.DEMANDS_BY_WEEK) || {}; },
  
  saveDemandForWeek(weekStr, demand) {
    if (!weekStr) return;
    this._save(`${STORAGE_KEYS.DEMAND_WEEK_PREFIX}${weekStr}`, demand);
    const all = this.loadDemandsByWeek();
    all[weekStr] = demand;
    this.saveDemandsByWeek(all);
  },
  loadDemandForWeek(weekStr) {
    if (!weekStr) return null;
    const specific = this._load(`${STORAGE_KEYS.DEMAND_WEEK_PREFIX}${weekStr}`);
    if (specific) return specific;
    const all = this.loadDemandsByWeek();
    return all[weekStr] || null;
  },
  
  savePatterns(patterns) { this._save(STORAGE_KEYS.PATTERNS, patterns); },
  loadPatterns() { return this._load(STORAGE_KEYS.PATTERNS); },
  
  saveShiftModes(modes) { this._save(STORAGE_KEYS.SHIFT_MODES, modes); },
  loadShiftModes() { return this._load(STORAGE_KEYS.SHIFT_MODES); },
  
  saveBaseWeek(weekStr) { this._save(STORAGE_KEYS.BASE_WEEK, weekStr); },
  loadBaseWeek() { return this._load(STORAGE_KEYS.BASE_WEEK); },
  
  saveGeneratedWeeks(weeksSet) { this._save(STORAGE_KEYS.GENERATED_WEEKS, Array.from(weeksSet)); },
  loadGeneratedWeeks() {
    const arr = this._load(STORAGE_KEYS.GENERATED_WEEKS);
    return arr ? new Set(arr) : new Set();
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
    localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
    if (weekStart) localStorage.removeItem(`${STORAGE_KEYS.SCHEDULE_WEEK_PREFIX}${weekStart}`);
  }
};