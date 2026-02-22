/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base (darker than Factory for "arena" feel)
        'bg-deep':       '#0a0e1a',
        'bg-card':       '#141926',
        'bg-card-hover': '#1e2438',
        'border-custom': '#2a3146',

        // Text
        'text-primary':  '#e2e8f0',
        'text-dim':      '#64748b',

        // Model identity colors
        'model-a':       '#6366f1',    // Indigo — left column
        'model-a-dim':   '#4338ca',
        'model-b':       '#f59e0b',    // Amber — right column
        'model-b-dim':   '#d97706',

        // Status
        'accent':        '#8b5cf6',    // Purple — Babel's primary
        'success':       '#22c55e',
        'warning':       '#eab308',
        'danger':        '#ef4444',
        'info':          '#3b82f6',
      },
      animation: {
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'fade-in':    'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
