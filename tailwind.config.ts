import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Near-black canvas
        ink: {
          950: "#0a0a0f",
          900: "#0f0f16",
          800: "#14141d",
          700: "#1b1b27",
          600: "#242433",
          500: "#2f2f42",
        },
        // Electric cyan/blue accent scale
        accent: {
          100: "#d5faff",
          200: "#a7f1ff",
          300: "#6fe4ff",
          400: "#38d1ff",
          500: "#00b7ff",
          600: "#0095d6",
          700: "#0073a8",
        },
        verdict: {
          proceed: "#22d3a2",
          caution: "#f5b544",
          avoid: "#f06a6a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(0, 183, 255, 0.35)",
        panel: "0 20px 60px -20px rgba(0, 0, 0, 0.6)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 2s ease-out infinite",
        shimmer: "shimmer 2s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
