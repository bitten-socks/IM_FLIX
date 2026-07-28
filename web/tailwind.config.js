/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        logo: ['"Kumbh Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
