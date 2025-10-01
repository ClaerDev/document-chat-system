import { createClient } from '@supabase/supabase-js';
import { supabase as supabaseConfig } from '@/lib/config/env';

const supabaseUrl = supabaseConfig.url;
const supabaseAnonKey = supabaseConfig.anonKey;
const supabaseServiceRoleKey = supabaseConfig.serviceRoleKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Document upload features will be disabled.');
}

// Client-side Supabase client (uses anon key, respects RLS)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side Supabase client (uses service role key, bypasses RLS)
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Type-safe Supabase client getter with error handling
export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase client not initialized. Please check your environment variables.'
    );
  }
  return supabase;
}

// Type-safe Supabase admin client getter with error handling
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(
      'Supabase admin client not initialized. Please check your SUPABASE_SERVICE_ROLE_KEY environment variable.'
    );
  }
  return supabaseAdmin;
}

export default supabase;