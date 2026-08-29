/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F7F3E8',
        felt: {
          DEFAULT: '#0B3D2E',
          dark: '#082C21',
          light: '#144E3A',
        },
        ink: '#1C2321',
        chip: {
          gold: '#D9A63E',
          red: '#C1443C',
          blue: '#2C5F8A',
          black: '#1A1A1A',
          white: '#F7F3E8',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      boxShadow: {
        chip: '0 4px 0 rgba(0,0,0,0.25), 0 6px 12px rgba(0,0,0,0.2)',
        card: '0 1px 2px rgba(28,35,33,0.04), 0 8px 24px rgba(28,35,33,0.06)',
      },
      borderRadius: {
        chip: '9999px',
      },
    },
  },
  plugins: [],
}
