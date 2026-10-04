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
            DEFAULT: "#7c3aed",
            hover: "#6d28d9",
            surface: "#f5f3ff",
            border: "#ddd6fe",
          },
          // Keep accent mapped to brand for backward compatibility
          accent: {
            DEFAULT: "#7c3aed",
            hover: "#6d28d9",
            bright: "#8b5cf6",
            dim: "#6d28d9",
            surface: "#f5f3ff",
            darkSurface: "#1e1b4b",
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
