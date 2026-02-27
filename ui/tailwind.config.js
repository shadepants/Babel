/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        ui:      ['Inter', '-apple-system', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Mono', 'monospace'],
      },
      colors: {
        // Background layers
        'bg-deep':       '#020817',
        'bg-card':       '#0d1117',
        'bg-card-hover': '#161c27',
        'border-custom': '#1e2d3d',

        // Text
        'text-primary':  '#e2e8f0',
        'text-dim':      '#64748b',

        // Model identity -- A: amber/gold, B: cyan/teal
        'model-a':       '#F59E0B',
        'model-a-dim':   '#D97706',
        'model-b':       '#06B6D4',
        'model-b-dim':   '#0891B2',

        // Status
        'accent':        '#8b5cf6',
        'success':       '#22c55e',
        'warning':       '#eab308',
        'danger':        '#ef4444',
        'info':          '#3b82f6',
      },
      boxShadow: {
        'glow-a':      '0 0 24px rgba(245, 158, 11, 0.45)',
        'glow-b':      '0 0 24px rgba(6, 182, 212, 0.45)',
        'glow-accent': '0 0 24px rgba(139, 92, 246, 0.35)',
        'glow-sm-a':   '0 0 12px rgba(245, 158, 11, 0.3)',
        'glow-sm-b':   '0 0 12px rgba(6, 182, 212, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'fade-in':    'fadeIn 0.4s ease-out',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
