/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf6f3',
          100: '#fae9e0',
          200: '#f5d0bc',
          300: '#edae90',
          400: '#e08060',
          500: '#B85C38',
          600: '#a34e2e',
          700: '#8a4027',
          800: '#703524',
          900: '#5c2d1f',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
