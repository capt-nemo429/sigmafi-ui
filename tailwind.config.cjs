/* eslint-disable no-undef */

const baseTheme = {
  "--btn-focus-scale": "0.98",
  primary: "#f000b8",
  secondary: "#570df8",
  "primary-content": "#f5f5f5",
  "secondary-content": "#f5f5f5"
};

const light = {
  ...baseTheme,
  accent: "#37cdbe",
  "accent-content": "#163835",
  neutral: "#3d4451",
  "neutral-content": "#e5e5e5",
  "base-100": "#ffffff",
  "base-200": "#F2F2F2",
  "base-300": "#E5E6E6",
  "base-content": "#1f2937",
  info: "#60a5fa",
  success: "#22c55e",
  warning: "#eab308",
  error: "#ef4444"
};

const dark = {
  ...baseTheme,
  accent: "#1FB2A5",
  "accent-content": "#fafafa",
  neutral: "#191D24",
  "neutral-focus": "#111318",
  "neutral-content": "#d4d4d8",
  "base-100": "#2A303C",
  "base-200": "#242933",
  "base-300": "#20252E",
  "base-content": "#d4d4d8",
  info: "#60a5fa",
  success: "#22c55e",
  warning: "#facc15",
  error: "#ef4444"
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}", "!@oruga-ui/*"],
  darkMode: "class",
  plugins: [require("daisyui")],
  daisyui: {
    styled: true,
    themes: [{ light }, { dark }],
    base: true,
    utils: true,
    logs: true,
    darkTheme: "dark"
  }
};
