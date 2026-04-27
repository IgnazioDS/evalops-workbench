import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        "border-strong": "hsl(var(--border-strong) / <alpha-value>)",
        "border-subtle": "hsl(var(--border-subtle) / <alpha-value>)",
        input: "hsl(var(--border) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-2": "hsl(var(--surface-2) / <alpha-value>)",
        "surface-3": "hsl(var(--surface-3) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        "foreground-muted": "hsl(var(--foreground-muted) / <alpha-value>)",
        "foreground-subtle": "hsl(var(--foreground-subtle) / <alpha-value>)",
        "foreground-faint": "hsl(var(--foreground-faint) / <alpha-value>)",
        brand: {
          DEFAULT: "hsl(var(--brand) / <alpha-value>)",
          strong: "hsl(var(--brand-strong) / <alpha-value>)",
          foreground: "hsl(var(--brand-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          subtle: "hsl(var(--success) / 0.12)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          subtle: "hsl(var(--warning) / 0.12)",
        },
        danger: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          subtle: "hsl(var(--danger) / 0.12)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          subtle: "hsl(var(--info) / 0.12)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Tighter line-heights than Tailwind's defaults, calibrated for dashboards.
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.4rem" }],
        md: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
        xl: ["1.125rem", { lineHeight: "1.5rem" }],
        "2xl": ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        "3xl": ["1.5rem", { lineHeight: "1.875rem", letterSpacing: "-0.015em" }],
        "4xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "5xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.025em" }],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        // Subtle, layered. Vercel uses these heavily on hover states.
        "subtle": "0 1px 2px 0 rgb(0 0 0 / 0.6), 0 0 0 1px hsl(var(--border) / 0.5)",
        "elevated":
          "0 4px 12px -2px rgb(0 0 0 / 0.5), 0 0 0 1px hsl(var(--border) / 0.8)",
        "popover":
          "0 12px 32px -8px rgb(0 0 0 / 0.7), 0 0 0 1px hsl(var(--border) / 0.8)",
        "glow-brand": "0 0 24px -4px hsl(var(--brand) / 0.4)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "100%": { backgroundPosition: "-200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-up": "fade-up 240ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-down": "fade-down 240ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 160ms cubic-bezier(0.16, 1, 0.3, 1)",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
        "count-up": "count-up 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      transitionTimingFunction: {
        "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
