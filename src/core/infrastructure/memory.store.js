/**
 * In-Memory KeyValueStore implementation for unit tests and sandboxed environments.
 * @implements {import('../ports/store.port.js').KeyValueStore}
 */
export class MemoryStore {
  constructor(initialData = {}) {
    /** @type {Map<string, any>} */
    this.map = new Map(Object.entries(initialData));
  }

  get(key) {
    if (!this.map.has(key)) return null;
    const item = this.map.get(key);
    // Clone to prevent external mutation
    return typeof item === 'object' && item !== null ? JSON.parse(JSON.stringify(item)) : item;
  }

  set(key, value) {
    const cloned = typeof value === 'object' && value !== null ? JSON.parse(JSON.stringify(value)) : value;
    this.map.set(key, cloned);
  }

  remove(key) {
    this.map.delete(key);
  }

  keys() {
    return Array.from(this.map.keys());
  }

  clear() {
    this.map.clear();
  }
}
