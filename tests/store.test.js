import test from 'node:test';
import assert from 'node:assert';

import { MemoryStore } from '../src/core/infrastructure/memory.store.js';
import { LocalStorageStore } from '../src/core/infrastructure/local-storage.store.js';
import { PersistenceNotifier } from '../src/core/infrastructure/persistence-notifier.js';

test('MemoryStore: operaciones básicas CRUD y aislamiento de mutación', () => {
  const store = new MemoryStore();
  assert.strictEqual(store.get('missing'), null);

  const testObj = { a: 1, b: [1, 2, 3] };
  store.set('key1', testObj);

  const retrieved = store.get('key1');
  assert.deepStrictEqual(retrieved, testObj);

  // Mutación externa no afecta al store
  retrieved.a = 999;
  assert.strictEqual(store.get('key1').a, 1);

  assert.deepStrictEqual(store.keys(), ['key1']);

  store.remove('key1');
  assert.strictEqual(store.get('key1'), null);
  assert.deepStrictEqual(store.keys(), []);
});

test('LocalStorageStore: fallback en entorno sin window/localStorage', () => {
  const store = new LocalStorageStore();
  // En Node.js (donde localStorage puede ser un mock o undefined), el fallback opera transparentemente
  store.set('turnos_test_key', { foo: 'bar' });
  const val = store.get('turnos_test_key');
  assert.deepStrictEqual(val, { foo: 'bar' });

  store.remove('turnos_test_key');
  assert.strictEqual(store.get('turnos_test_key'), null);
});

test('PersistenceNotifier: suscripción, notificación y desuscripción', () => {
  const notifier = new PersistenceNotifier();
  let callCount = 0;

  const unsubscribe = notifier.subscribe(() => {
    callCount++;
  });

  notifier.notify();
  assert.strictEqual(callCount, 1);

  notifier.notify();
  assert.strictEqual(callCount, 2);

  unsubscribe();
  notifier.notify();
  assert.strictEqual(callCount, 2);
});
