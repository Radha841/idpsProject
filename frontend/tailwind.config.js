/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 10px 30px rgba(15, 23, 42, 0.07)"
      }
    }
  },
  plugins: []
};
