import * as stylex from "@stylexjs/stylex";

export const colors = stylex.defineVars({
  background: {
    default: "#FBFBF9",
    "@media (prefers-color-scheme: dark)": "#141312",
  },
  textPrimary: {
    default: "#1C1917",
    "@media (prefers-color-scheme: dark)": "#F5F3EF",
  },
  textSecondary: {
    default: "#57534E",
    "@media (prefers-color-scheme: dark)": "#A8A29E",
  },
  accent: {
    default: "#BC4F26",
    "@media (prefers-color-scheme: dark)": "#E07A52",
  },
  accentHover: {
    default: "#A5431F",
    "@media (prefers-color-scheme: dark)": "#EA8E69",
  },
  accentForeground: {
    default: "#FFFFFF",
    "@media (prefers-color-scheme: dark)": "#141312",
  },
  transparent: "transparent",
});

export const spacing = stylex.defineVars({
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
});

export const typography = stylex.defineVars({
  fontScript: "var(--font-petit, cursive)",
  fontSans: "var(--font-cantarell, sans-serif)",
  sizeBase: "1rem",
  sizeHero: "2.5rem",
  lineHeightNormal: "1.5",
  weightNormal: "400",
  weightBold: "700",
});

export const radii = stylex.defineVars({
  md: "8px",
});

export const shadows = stylex.defineVars({
  subtle: {
    default: "0 1px 3px rgba(28, 25, 23, 0.05)",
    "@media (prefers-color-scheme: dark)": "0 1px 3px rgba(0, 0, 0, 0.3)",
  },
});

export const borders = stylex.defineVars({
  width: "1px",
});

export const transitions = stylex.defineVars({
  property: "background-color, border-color, color, box-shadow, transform",
  duration: "180ms",
  timingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
});

export const transforms = stylex.defineVars({
  hoverLift: "translateY(-1px)",
  active: "translateY(0)",
});

export const opacities = stylex.defineVars({
  disabled: "0.5",
});
