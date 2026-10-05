import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'Inter',
          'Geist',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        brand: ['var(--font-brand)', 'var(--font-sans)', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'page-title': [
          '1.375rem',
          { lineHeight: '1.75rem', fontWeight: '600', letterSpacing: '-0.025em' },
        ],
        'section-title': [
          '1.125rem',
          { lineHeight: '1.5rem', fontWeight: '600', letterSpacing: '-0.02em' },
        ],
        'card-title': ['0.9375rem', { lineHeight: '1.375rem', fontWeight: '600' }],
        'repo-title': [
          '1.125rem',
          { lineHeight: '1.5rem', fontWeight: '600', letterSpacing: '-0.02em' },
        ],
        body: ['0.9375rem', { lineHeight: '1.55rem' }],
        metadata: ['0.8125rem', { lineHeight: '1.125rem' }],
        navigation: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'table-head': [
          '0.75rem',
          { lineHeight: '1rem', fontWeight: '600', letterSpacing: '0.04em' },
        ],
        badge: ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
        button: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 hsl(var(--foreground) / 0.03)',
        xs: '0 1px 2px 0 hsl(var(--foreground) / 0.05)',
        sm: '0 1px 3px 0 hsl(var(--foreground) / 0.06), 0 1px 2px -1px hsl(var(--foreground) / 0.06)',
        md: '0 4px 6px -1px hsl(var(--foreground) / 0.06), 0 2px 4px -2px hsl(var(--foreground) / 0.06)',
        premium: '0 4px 12px hsl(var(--foreground) / 0.05)',
        'premium-hover': '0 8px 18px hsl(var(--foreground) / 0.07)',
        row: '0 4px 10px hsl(var(--foreground) / 0.04)',
        search: '0 0 0 4px hsl(var(--primary) / 0.12)',
      },
      keyframes: {
        'menu-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'status-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 hsl(var(--success) / 0.45)' },
          '50%': { opacity: '0.72', boxShadow: '0 0 0 5px hsl(var(--success) / 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'menu-in': 'menu-in 160ms ease-out',
        'status-pulse': 'status-pulse 2.8s ease-in-out infinite',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          soft: 'hsl(var(--accent-soft))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          secondary: 'hsl(var(--surface-secondary))',
          elevated: 'hsl(var(--surface-elevated))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        risk: {
          DEFAULT: 'hsl(var(--risk))',
          foreground: '#ffffff',
        },
        grade: {
          a: 'hsl(var(--grade-a))',
          b: 'hsl(var(--grade-b))',
          c: 'hsl(var(--grade-c))',
          d: 'hsl(var(--grade-d))',
          e: 'hsl(var(--grade-e))',
        },
        popover: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--foreground))',
        },
        ai: {
          DEFAULT: 'hsl(var(--primary))',
          bright: 'hsl(var(--accent-soft))',
          glow: 'hsl(var(--muted))',
          soft: 'hsl(var(--brand-soft))',
        },
      },
      borderRadius: {
        '2xl': '1.25rem', // 20px dialogs
        xl: '1.125rem', // 18px interactive
        lg: 'var(--radius)', // 16px cards
        md: 'var(--radius-control)', // 12px controls
        sm: '0.5rem',
        dialog: 'var(--radius-dialog)',
        control: 'var(--radius-control)',
        interactive: 'var(--radius-interactive)',
      },
    },
  },
  plugins: [animate],
};

export default config;
