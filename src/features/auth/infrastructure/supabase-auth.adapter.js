import { supabase } from '../../../supabase.js';
import { SUPABASE_CONFIG } from './config.js';

/**
 * Supabase implementation of AuthPort.
 * @implements {import('../application/ports.js').AuthPort}
 */
export class SupabaseAuthAdapter {
  /**
   * @param {Object} [options]
   * @param {any} [options.client]
   * @param {typeof SUPABASE_CONFIG} [options.config]
   */
  constructor({ client = supabase, config = SUPABASE_CONFIG } = {}) {
    this.client = client;
    this.config = config;
  }

  async signIn({ username, email, password }) {
    const userEmail = email || (username ? `${username}${this.config.fakeDomain}` : '');
    const { data, error } = await this.client.auth.signInWithPassword({
      email: userEmail,
      password,
    });
    return { data, error };
  }

  async signOut() {
    return await this.client.auth.signOut();
  }

  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    return { session: data?.session || null, error };
  }

  onAuthStateChange(callback) {
    const { data } = this.client.auth.onAuthStateChange(callback);
    return data?.subscription || { unsubscribe: () => {} };
  }
}
