import type { Config } from 'tailwindcss';

/**
 * Los colores se definen como CSS variables (ver src/styles/tokens.css) y aquí
 * solo se mapean al theme de Tailwind. Esto habilita modo claro/oscuro sin
 * duplicar clases y mantiene una fuente única de verdad para el design system.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        content: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          soft: 'var(--color-primary-soft)',
          contrast: 'var(--color-primary-contrast)',
        },
        state: {
          active: 'var(--state-active)',
          expired: 'var(--state-expired)',
          blocked: 'var(--state-blocked)',
          pending: 'var(--state-pending)',
          frozen: 'var(--state-frozen)',
          cancel: 'var(--state-cancel)',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        metric: ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        overlay: '0 10px 40px -10px rgb(0 0 0 / 0.25)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 120ms ease-out',
        'slide-in-right': 'slide-in-right 180ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
