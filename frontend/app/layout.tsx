import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Founders Den — Startup & Investor Network', description: 'A startup discovery and investor engagement platform prototype.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
