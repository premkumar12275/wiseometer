/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0f1117',
          800: '#14171f',
          700: '#1a1d27',
          600: '#1f2233',
          500: '#252840',
        },
        border: '#2a2d3a',
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
