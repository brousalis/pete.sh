/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  corePlugins: {
    backgroundOpacity: false,
    textOpacity: false,
  },
  theme: {
    extend: {
      fontFamily: {
        notosans: ['Noto Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
