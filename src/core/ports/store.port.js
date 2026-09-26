/**
 * KeyValueStore abstraction port.
 * Allows switching between LocalStorageStore, MemoryStore, or IndexedDBStore.
 *
 * @typedef {Object} KeyValueStore
 * @property {(key: string) => any} get
 * @property {(key: string, value: any) => void} set
 * @property {(key: string) => void} remove
 * @property {() => string[]} keys
 */

export {};
