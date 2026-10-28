/** @type {import('next').NextConfig} */

// Default production fallbacks to ensure Vercel builds succeed out of the box
process.env.NEXT_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://startup-investor-networking-platform.onrender.com/api/v1';
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tdvvdkobcgfrvotzdcor.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkdnZka29iY2dmcnZvdHpkY29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNDM1MDgsImV4cCI6MjEwODYxOTUwOH0.diVYXcVW9GEeoCTFfUou4lOf5NixS3ODsAHN3D8_OIQ';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://startup-investor-networking-platform.onrender.com/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
