/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const requiredEnv = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  const missing = requiredEnv.filter((key) => !process.env[key] || process.env[key].trim() === '');
  if (missing.length > 0) {
    throw new Error(
      `[Frontend Build Error] Missing required production environment variable(s):\n${missing.map((k) => `  - ${k}`).join('\n')}\nPlease configure these variables in Vercel project settings.`
    );
  }
}

const nextConfig = { reactStrictMode: true };
export default nextConfig;
