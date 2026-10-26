import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fqbixskkrtlbvplchjjp.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYml4c2trcnRsYnZwbGNoampwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMzU4MjIsImV4cCI6MjEwODYxMTgyMn0.3a8PngSQEPWlRwRTqfzDZ-YSnACiqFI4PL_4rsjVSjY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
