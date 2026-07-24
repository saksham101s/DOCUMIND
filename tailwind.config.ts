import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#12151c",
        "ink-soft": "#1a1e29",
        paper: "#f3eee2",
        "paper-line": "#ded6c2",
        marker: "#d7f26d",
        rule: "#7c8cf8",
        muted: "#8b92a3",
        "ink-on-paper": "#1e2430",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
