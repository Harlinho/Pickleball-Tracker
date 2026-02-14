import { createClient } from '@supabase/supabase-js';

const getRequiredEnv = (key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `[Supabase] Missing required environment variable: ${key}. ` +
        `Set it in .env.local before using the Supabase client.`
    );
  }
  return value;
};

const supabaseUrl = getRequiredEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getRequiredEnv('VITE_SUPABASE_ANON_KEY');
export const realtimeEndpoint = `${supabaseUrl.replace(/^http/i, 'ws')}/realtime/v1/websocket`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    logger: (kind: string, message: string, data: unknown) => {
      console.debug('[Supabase realtime]', kind, message, data);
    }
  }
});
