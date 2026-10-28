import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tdvvdkobcgfrvotzdcor.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkdnZka29iY2dmcnZvdHpkY29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNDM1MDgsImV4cCI6MjEwODYxOTUwOH0.diVYXcVW9GEeoCTFfUou4lOf5NixS3ODsAHN3D8_OIQ';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
