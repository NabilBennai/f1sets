/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.html', './src/**/*.ts'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', ...defaultTheme.fontFamily.sans],
        mono: ['"JetBrains Mono"', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#dfe7ff',
          200: '#b8c8ff',
          300: '#90a9ff',
          400: '#6f8fff',
          500: '#4d6bff',
          600: '#3b55db',
          700: '#2d41af',
          800: '#1f2c7f',
          900: '#121c55',
        },
      },
      boxShadow: {
        card: '0 15px 35px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
