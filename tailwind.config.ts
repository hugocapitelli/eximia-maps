import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        elevated: "rgb(var(--c-elevated) / <alpha-value>)",
        overlay: "rgb(var(--c-overlay) / <alpha-value>)",
        border: "rgb(var(--c-border) / <alpha-value>)",
        "border-light": "rgb(var(--c-border-light) / <alpha-value>)",
        "border-hover": "rgb(var(--c-border-hover) / <alpha-value>)",
        primary: "rgb(var(--c-primary) / <alpha-value>)",
        "cream-dim": "rgb(var(--c-cream-dim) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        "accent-dim": "rgb(var(--c-accent-dim) / <alpha-value>)",
        "accent-hover": "rgb(var(--c-accent-hover) / <alpha-value>)",
        "accent-alt": "rgb(var(--c-accent-alt) / <alpha-value>)",
        "accent-alt-dim": "rgb(var(--c-accent-alt-dim) / <alpha-value>)",
        sage: "rgb(var(--c-accent-alt) / <alpha-value>)",
        teal: "rgb(var(--c-teal) / <alpha-value>)",
        "teal-dim": "rgb(var(--c-teal-dim) / <alpha-value>)",
        "teal-hover": "rgb(var(--c-teal-hover) / <alpha-value>)",
        success: "rgb(var(--c-success) / <alpha-value>)",
        warning: "rgb(var(--c-warning) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
        info: "rgb(var(--c-info) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glow-teal": "0 0 20px color-mix(in srgb, #82B4C4 15%, transparent)",
        "glow-accent": "0 0 20px color-mix(in srgb, #C4A882 15%, transparent)",
        "glow-sage": "0 0 15px color-mix(in srgb, #7C9E8F 15%, transparent)",
      },
    },
  },
  plugins: [typography],
};

export default config;
