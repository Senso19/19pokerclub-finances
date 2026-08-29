/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F4F7FB',
        felt: {
          DEFAULT: '#0F3D66',
          dark: '#0A2C4A',
          light: '#1E5A91',
        },
        ink: '#122438',
        chip: {
          gold: '#B98A2E',
          red: '#C1443C',
          blue: '#2E7DD1',
          black: '#0A2C4A',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      boxShadow: {
        chip: '0 4px 0 rgba(0,0,0,0.25), 0 6px 12px rgba(0,0,0,0.2)',
        card: '0 1px 2px rgba(15,61,102,0.05), 0 8px 24px rgba(15,61,102,0.08)',
      },
      borderRadius: {
        chip: '9999px',
      },
    },
  },
  plugins: [],
}
