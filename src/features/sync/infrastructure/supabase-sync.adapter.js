import { supabase } from '../../../supabase.js';
import { STORAGE_KEYS } from '../../../core/constants/storage-keys.js';
import { LocalStorageStore } from '../../../core/infrastructure/local-storage.store.js';

/**
 * Supabase implementation of SyncPort.
 * @implements {import('../application/ports.js').SyncPort}
 */
export class SupabaseSyncAdapter {
  /**
   * @param {Object} [options]
   * @param {any} [options.client]
   * @param {import('../../../core/ports/store.port.js').KeyValueStore} [options.store]
   * @param {number} [options.debounceMs]
   */
  constructor({ client = supabase, store = new LocalStorageStore(), debounceMs = 3000 } = {}) {
    this.client = client;
    this.store = store;
    this.debounceMs = debounceMs;
    this._timeout = null;
  }

  async pull() {
    const { data: sessionData } = await this.client.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    try {
      // 1. Pull user config
      const { data: configData, error: configError } = await this.client
        .from('user_config')
        .select('config_json')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!configError && configData?.config_json) {
        const keys = Object.keys(configData.config_json);
        for (const key of keys) {
          this.store.set(key, configData.config_json[key]);
        }
      }

      // 2. Pull weekly schedules
      const { data: schedulesData, error: schedulesError } = await this.client
        .from('weekly_schedules')
        .select('week_start, data_json')
        .eq('user_id', user.id);

      if (!schedulesError && schedulesData) {
        for (const row of schedulesData) {
          this.store.set(row.week_start, row.data_json);
        }
      }

      console.log('SupabaseSyncAdapter: Pull completado desde Supabase');
    } catch (e) {
      console.error('SupabaseSyncAdapter: Error durante el pull', e);
    }
  }

  async push() {
    const { data: sessionData } = await this.client.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    try {
      const configJson = {};
      const schedules = [];

      const allKeys = this.store.keys();
      for (const key of allKeys) {
        if (!key || !key.startsWith('turnos_')) continue;

        try {
          const val = this.store.get(key);
          if (val === null || val === undefined) continue;

          if (key.startsWith(STORAGE_KEYS.SCHEDULE_WEEK_PREFIX) || key.startsWith(STORAGE_KEYS.DEMAND_WEEK_PREFIX)) {
            schedules.push({ week_start: key, data_json: val });
          } else {
            configJson[key] = val;
          }
        } catch {
          // Ignore parse errors
        }
      }

      // 1. Push user_config
      if (Object.keys(configJson).length > 0) {
        await this.client
          .from('user_config')
          .upsert({ user_id: user.id, config_json: configJson });
      }

      // 2. Push schedules (upsert)
      if (schedules.length > 0) {
        const rows = schedules.map(s => ({
          user_id: user.id,
          week_start: s.week_start,
          data_json: s.data_json,
        }));
        await this.client
          .from('weekly_schedules')
          .upsert(rows, { onConflict: 'user_id, week_start' });
      }

      console.log('SupabaseSyncAdapter: Push completado a Supabase');
    } catch (e) {
      console.error('SupabaseSyncAdapter: Error durante el push', e);
    }
  }

  onLocalChange() {
    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => this.push(), this.debounceMs);
  }
}
