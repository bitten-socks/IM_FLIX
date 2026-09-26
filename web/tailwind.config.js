/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // The page itself, and the light plate the near-black products sit
        // on. Both are used from more than one view now, so they live here
        // rather than as hex literals that drift apart.
        ground: '#0b0c0f',
        panel: '#e2e2e2',
      },
      fontFamily: {
        logo: ['"Kumbh Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
