/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Inter"',
          '"Plus Jakarta Sans"',
          'system-ui',
          'sans-serif',
        ],
        serif: [
          '"New York"',
          '"Lora"',
          'Georgia',
          'Cambria',
          'serif',
        ],
      },
      colors: {
        ios: {
          bg: '#F2F2F7',
          darkBg: '#000000',
          card: '#FFFFFF',
          darkCard: '#1C1C1E',
          darkElevated: '#2C2C2E',
          blue: '#007AFF',
          indigo: '#5856D6',
          amber: '#F59E0B',
          gold: '#D97706',
        },
      },
      boxShadow: {
        'ios': '0 2px 14px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'ios-lg': '0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'gold': '0 4px 20px -2px rgba(245, 158, 11, 0.22)',
      },
    },
  },
  plugins: [],
};
