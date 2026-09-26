/**
 * NullSyncAdapter for offline/local mode.
 * Disables network synchronization safely without throwing errors.
 * @implements {import('../application/ports.js').SyncPort}
 */
export class NullSyncAdapter {
  async pull() {
    // Offline mode: no-op
  }

  async push() {
    // Offline mode: no-op
  }

  onLocalChange() {
    // Offline mode: no-op
  }
}
