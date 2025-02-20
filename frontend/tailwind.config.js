/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        primary: "#9FE0C1",
        secondary: "#555A3B",
      },
      background: {
        primary: "#9FE0C1",
        secondary: "#555A3B",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
