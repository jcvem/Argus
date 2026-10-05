import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        argus: {
          canvas: "#f4f5f7",
          surface: "#ffffff",
          subtle: "#f9fafb",
          border: "#e5e7eb",
          "border-subtle": "#f3f4f6",
          ink: {
            DEFAULT: "#111827",
            secondary: "#4b5563",
            muted: "#9ca3af",
            light: "#6b7280",
          },
          brand: {
            DEFAULT: "#18181b", // zinc-900
            hover: "#27272a", // zinc-800
            surface: "#f4f4f5", // zinc-100
            border: "#e4e4e7", // zinc-200
          },
          // Keep accent mapped to brand for backward compatibility
          accent: {
            DEFAULT: "#18181b",
            hover: "#27272a",
            bright: "#3f3f46",
            dim: "#71717a",
            surface: "#f4f4f5",
            darkSurface: "#18181b",
          },
          action: {
            DEFAULT: "#10b981",
            hover: "#059669",
            surface: "#ecfdf5",
          },
          blocked: {
            DEFAULT: "#ef4444",
            hover: "#dc2626",
            surface: "#fef2f2",
          },
          verified: {
            DEFAULT: "#10b981",
            surface: "#ecfdf5",
            dark: "#22c55e",
            darkSurface: "#052e16",
          },
          review: {
            DEFAULT: "#f59e0b",
            surface: "#fffbeb",
            dark: "#fbbf24",
            darkSurface: "#451a03",
          },
          paper: {
            DEFAULT: "#f4f5f7",
            subtle: "#ffffff",
            dim: "#f3f4f6",
          },
          dark: {
            bg: "#111827",
            surface: "#1f2937",
            elevated: "#374151",
            text: "#f9fafb",
            muted: "#9ca3af",
          },
        },
      },
      fontFamily: {
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      borderRadius: {
        xs: "3px",
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        elevated: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
