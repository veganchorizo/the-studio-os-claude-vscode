import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // A calm, console-inspired dark palette.
        base: {
          950: "#0a0c10",
          900: "#0f1218",
          800: "#161b24",
          700: "#1e2530",
          600: "#2a3341",
        },
        accent: {
          DEFAULT: "#f59e0b", // amber VU-meter accent
          soft: "#fbbf24",
        },
        signal: { green: "#34d399", red: "#f87171", blue: "#60a5fa" },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
