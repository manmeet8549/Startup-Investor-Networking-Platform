import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

/**
 * Supabase Admin client with service role privileges.
 * Bypasses RLS for trusted backend operations, user administration, and system maintenance.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Supabase client initialized with anon public key.
 */
export const supabaseClient: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);
