/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Midnight Ledger design tokens
        midnight: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fd',
          300: '#a5bafc',
          400: '#8093f9',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#1e1b4b',
          900: '#0f0e2e',
          950: '#080716',
        },
        navy: {
          DEFAULT: '#0a0f1e',
          card: '#111827',
          elevated: '#1a2235',
          border: '#1e2d45',
        },
        slate: {
          muted: '#64748b',
          secondary: '#94a3b8',
        },
        emerald: {
          income: '#10b981',
          savings: '#34d399',
          light: '#6ee7b7',
        },
        amber: {
          warning: '#f59e0b',
          caution: '#fbbf24',
        },
        rose: {
          danger: '#f43f5e',
          expense: '#fb7185',
        },
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
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'financial-xs': ['0.7rem', { lineHeight: '1rem', fontVariantNumeric: 'tabular-nums' }],
        'financial-sm': ['0.8rem', { lineHeight: '1.2rem', fontVariantNumeric: 'tabular-nums' }],
        'financial-base': ['1rem', { lineHeight: '1.5rem', fontVariantNumeric: 'tabular-nums' }],
        'financial-lg': ['1.25rem', { lineHeight: '1.75rem', fontVariantNumeric: 'tabular-nums' }],
        'financial-xl': ['1.5rem', { lineHeight: '2rem', fontVariantNumeric: 'tabular-nums' }],
        'financial-2xl': ['2rem', { lineHeight: '2.5rem', fontVariantNumeric: 'tabular-nums' }],
        'financial-3xl': ['2.5rem', { lineHeight: '3rem', fontVariantNumeric: 'tabular-nums' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.4)' },
          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 8px rgba(99, 102, 241, 0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-income': 'linear-gradient(135deg, #10b981, #059669)',
        'gradient-expense': 'linear-gradient(135deg, #f43f5e, #e11d48)',
        'gradient-primary': 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.05) 50%, transparent 75%)',
      },
      boxShadow: {
        'card-dark': '0 1px 3px rgba(0,0,0,0.4), 0 4px 24px rgba(0,0,0,0.2)',
        'card-elevated': '0 4px 16px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)',
        'glow-primary': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-rose': '0 0 20px rgba(244, 63, 94, 0.3)',
        'inner-subtle': 'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
