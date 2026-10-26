import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { ink: '#14251f', forest: '#174d3a', mint: '#dff5e8', canvas: '#f7f8f5' }, boxShadow: { soft: '0 8px 30px rgba(20,37,31,.06)' } } }, plugins: [] };
export default config;
