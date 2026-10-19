/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rose: {
          50: '#FDF7F7',
          100: '#FBEFED',
          200: '#F6DADA', // specified soft blush accent
          300: '#EABBBF',
          400: '#D97D87',
          500: '#C7515F',
          600: '#B23A48', // specified deeper rose primary
          700: '#9C2F3C',
          800: '#7F2430',
          900: '#5F1B24',
        },
        ink: {
          900: '#1E1E24', // specified near-black body text
          700: '#3A3A42',
          500: '#686873',
          300: '#A4A4AF',
          100: '#E8E8ED',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
