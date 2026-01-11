/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'market-green': '#10b981',
        'market-red': '#ef4444',
        'market-blue': '#3b82f6',
      },
    },
  },
  plugins: [],
}
