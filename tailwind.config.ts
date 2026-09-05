import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B2E5C",
        blue: {
          DEFAULT: "#2F6FED",
          deep: "#1B4FC4",
        },
        sky: {
          DEFAULT: "#EAF2FF",
          soft: "#F5F9FF",
        },
        ink: {
          DEFAULT: "#0F1B2D",
          soft: "#5B6B85",
        },
        line: "#DCE6F7",
        success: "#1B9C63",
        amber: "#E58A2A",
      },
      fontFamily: {
        display: ["var(--font-manrope)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};

export default config;
