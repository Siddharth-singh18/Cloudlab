/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      colors: {
        editor: {
          bg: '#0d1117',
          surface: '#161b22',
          border: '#30363d',
          text: '#e6edf3',
          muted: '#7d8590',
          accent: '#58a6ff',
          green: '#3fb950',
          yellow: '#d29922',
          red: '#f85149',
          purple: '#bc8cff',
          orange: '#ffa657',
        },
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        pulse_dot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        slide_in: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fade_in: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        pulse_dot: 'pulse_dot 1.5s ease-in-out infinite',
        slide_in: 'slide_in 0.2s ease-out',
        fade_in: 'fade_in 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
