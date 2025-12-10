import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { fetchWithInterceptor, rawFetch } from '../services/errorInterceptor';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Main client - uses interceptor to catch errors
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithInterceptor
  }
});

// Logging client - uses RAW fetch to avoid infinite loops
// This client should ONLY be used by the error logger
export const loggingSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: rawFetch
  }
});
