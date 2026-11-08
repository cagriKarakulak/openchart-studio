/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tv: {
          bg: '#131722',
          surface: '#1e222d',
          card: '#1e222d',
          border: '#2a2e39',
          borderLight: '#363a45',
          text: '#d1d4dc',
          muted: '#787b86',
          hover: '#2a2e39',
          active: '#2962ff',
          green: '#089981',
          red: '#f23645',
          blue: '#2962ff',
          yellow: '#fbc02d',
          purple: '#ab47bc',
          orange: '#ff9800',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Trebuchet MS',
          'Roboto',
          'Ubuntu',
          'sans-serif',
        ],
      }
    },
  },
  plugins: [],
}
