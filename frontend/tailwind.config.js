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
          DEFAULT: '#1F3A6E',
          deep: '#14284F',
          light: '#2D5299',
          50: '#F0F4FA',
          100: '#E1E9F5',
        },
        saffron: {
          DEFAULT: '#F28C28',
          hover: '#E07B18',
          light: '#FFF5EB',
        },
        govgreen: {
          DEFAULT: '#138808',
          light: '#EDF7ED',
        },
        govamber: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
        },
        govred: {
          DEFAULT: '#C62828',
          light: '#FEE2E2',
        },
        govbg: '#F4F6FA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
