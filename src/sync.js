import { supabase } from './supabase.js';

export const SyncManager = {
  _timeout: null,

  async pull() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    try {
      // Pull user config
      const { data: configData, error: configError } = await supabase
        .from('user_config')
        .select('config_json')
        .eq('user_id', user.id)
        .single();
      
      if (!configError && configData?.config_json) {
        // Merge with localStorage
        const keys = Object.keys(configData.config_json);
        for (const key of keys) {
          localStorage.setItem(key, JSON.stringify(configData.config_json[key]));
        }
      }

      // Pull schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('weekly_schedules')
        .select('week_start, data_json')
        .eq('user_id', user.id);

      if (!schedulesError && schedulesData) {
        for (const row of schedulesData) {
          localStorage.setItem(row.week_start, JSON.stringify(row.data_json));
        }
      }
      
      console.log('SyncManager: Pull completado desde Supabase');
    } catch (e) {
      console.error('SyncManager: Error durante el pull', e);
    }
  },

  async push() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    try {
      // Recopilar configuraciones generales (claves que no son semanas específicas)
      const configJson = {};
      const schedules = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        try {
          const raw = localStorage.getItem(key);
          const parsed = JSON.parse(raw);
          
          if (key.startsWith('schedule_') || key.startsWith('demand_')) {
            schedules.push({ week_start: key, data_json: parsed });
          } else {
            configJson[key] = parsed;
          }
        } catch (e) {
          // Ignorar keys que no son JSON nuestro (ej: toolbars)
        }
      }

      // 1. Push user_config
      if (Object.keys(configJson).length > 0) {
        await supabase
          .from('user_config')
          .upsert({ user_id: user.id, config_json: configJson });
      }

      // 2. Push schedules (upsert)
      if (schedules.length > 0) {
        // Añadir el user_id a todas las filas
        const rows = schedules.map(s => ({
          user_id: user.id,
          week_start: s.week_start,
          data_json: s.data_json
        }));
        await supabase
          .from('weekly_schedules')
          .upsert(rows, { onConflict: 'user_id, week_start' });
      }
      
      console.log('SyncManager: Push completado a Supabase');
    } catch (e) {
      console.error('SyncManager: Error durante el push', e);
    }
  },

  onLocalChange() {
    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => this.push(), 3000);
  }
};
