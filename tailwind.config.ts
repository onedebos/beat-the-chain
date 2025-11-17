import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 1. Add custom colors
      colors: {
        "dark-bg": "#323437",
        "dark-dim": "#646669",
        "dark-main": "#d1d0c5",
        "dark-highlight": "#38ff9c",
        "dark-error": "#e2b714",
        "dark-kbd": "#2c2e31",
        "dark-kbd-shadow": "#1c1d1f",
      },
      // 2. Add custom font families
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-roboto-mono)", "ui-monospace", "monospace"],
        racing: ["var(--font-racing-sans-one)", "ui-sans-serif", "system-ui"],
        nfs: ["var(--font-nfs)", "ui-sans-serif", "system-ui"],
        sedgwick: ["var(--font-sedgwick-ave-display)", "ui-sans-serif", "system-ui"],
      },
      // 3. Add blink animation
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        blink: "blink 1s infinite",
      },
      // 4. Add custom duration for the race bar
      transitionDuration: {
        "7000": "7000ms",
      },
    },
  },
  plugins: [],
};

export default config;


