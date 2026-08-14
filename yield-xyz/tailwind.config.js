/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        figtree: ['Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
