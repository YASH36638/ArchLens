import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';

// Self-hosted — corporate networks often block fonts.googleapis.com.
const inter = localFont({
  src: [
    { path: '../fonts/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/inter-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

const brandFont = localFont({
  src: [
    { path: '../fonts/plus-jakarta-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/plus-jakarta-sans-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-brand',
  display: 'swap',
});

const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('archlens-theme');var d=t==='dark'||(t!=='light'&&(t==='system'?matchMedia('(prefers-color-scheme: dark)').matches:true));if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`;

export const metadata: Metadata = {
  title: 'Archlens · Quality Assessment AI',
  description: 'Architecture-aware code analysis for your repositories.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${brandFont.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>{children}</QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
