import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#f8f7f3",
        parchment: "#efebe0",
        ink: "#1c1b18",
        "ink-light": "#55534c",
        "ink-faint": "#9c9a92",
        gold: "#b78628",
        "gold-light": "#f0ddb4",
        "gold-dark": "#8e6a1e",
        theme: {
          cidadania: "#059669",
          estatistica: "#d97706",
          geometria: "#7c3aed",
          funcoes: "#e11d48",
          analitica: "#0284c7",
          trigonometria: "#dc2626",
          escalar: "#2563eb",
          sucessoes: "#4f46e5",
          contagem: "#db2777",
        },
      },
      fontFamily: {
        display: ["Newsreader", "Georgia", "serif"],
        body: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
