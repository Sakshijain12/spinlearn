import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "border": "rgba(31, 30, 29, 0.12)",
        "border-strong": "rgba(31, 30, 29, 0.22)",
        "surface-0": "#F0EEE6",
        "surface-1": "#F7F6F2",
        "surface-2": "#FFFFFF",
        "text-primary": "#1F1E1D",
        "text-secondary": "#5E5D59",
        "text-muted": "#8A8985",
        "accent-fill": "#2C6FD1",
        "accent-bg": "#E6F0FC",
        "accent-text": "#1B5BB8",
        "success-bg": "#E3F2E1",
        "success-text": "#2E6B26",
        "warning-bg": "#FBEFD5",
        "warning-text": "#8A5A00",
        "danger-bg": "#FBE7E6",
        "danger-text": "#A8332B",
        "category-bg": "#ECEBFD",
        "category-text": "#5145B5",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
      },
      borderRadius: {
        "default": "8px",
        "card": "12px",
        "full": "9999px",
      },
      fontSize: {
        "display": ["32px", { lineHeight: "40px", fontWeight: "500" }],
        "title": ["28px", { lineHeight: "36px", fontWeight: "500" }],
        "heading": ["22px", { lineHeight: "30px", fontWeight: "500" }],
        "body-lg": ["16.5px", { lineHeight: "26px", fontWeight: "400" }],
        "body": ["15px", { lineHeight: "24px", fontWeight: "400" }],
        "small": ["13px", { lineHeight: "20px", fontWeight: "400" }],
        "caption": ["12.5px", { lineHeight: "18px", fontWeight: "400" }],
        "mono": ["13.5px", { lineHeight: "22px", fontWeight: "400" }],
      },
      animation: {
        "spin-reel": "spinReel 3.4s cubic-bezier(0.12, 0.75, 0.2, 1) forwards",
      },
      keyframes: {
        spinReel: {
          to: { transform: "translateY(var(--reel-translate, 0))" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
