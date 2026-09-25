import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Referencias brindadas por el usuario
const SUPABASE_URL = 'https://uqafiezampjoqzozmlih.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2CJJ9mjBUvBrcpbjHFYyXg_WuVoaxWM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
