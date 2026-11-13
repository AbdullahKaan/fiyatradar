import type { Config } from 'tailwindcss';

const withVar = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: withVar('primary'), dark: withVar('primary-dark') },
        background: withVar('background'),
        foreground: withVar('foreground'),
        brand: { from: '#4f46e5', via: '#7c3aed', to: '#7e22ce' },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #7e22ce 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(79,70,229,.12) 0%, rgba(124,58,237,.12) 100%)',
      },
      fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-700px 0' }, '100%': { backgroundPosition: '700px 0' } },
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(100%)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        ring: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '10%, 30%': { transform: 'rotate(14deg)' },
          '20%, 40%': { transform: 'rotate(-14deg)' },
          '50%': { transform: 'rotate(0deg)' },
        },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        'fade-up': 'fade-up 0.4s ease-out both',
        fadeIn: 'fadeIn 0.4s ease-out both',
        slideUp: 'slideUp 0.35s cubic-bezier(.16,1,.3,1) both',
        slideInRight: 'slideInRight 0.3s cubic-bezier(.16,1,.3,1) both',
        ring: 'ring 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
