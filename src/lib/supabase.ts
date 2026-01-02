import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { fetchWithInterceptor } from '../services/errorInterceptor';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Main client - uses interceptor to catch errors
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithInterceptor,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
});


