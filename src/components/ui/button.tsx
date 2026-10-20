import * as stylex from "@stylexjs/stylex";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  borders,
  colors,
  opacities,
  radii,
  shadows,
  spacing,
  transforms,
  transitions,
  typography,
} from "../../styles/tokens.stylex";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "default";
  size?: "default";
  children?: ReactNode;
}

const styles = stylex.create({
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    fontFamily: typography.fontSans,
    fontWeight: typography.weightBold,
    fontSize: typography.sizeBase,
    lineHeight: typography.lineHeightNormal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    borderRadius: radii.md,
    borderWidth: borders.width,
    borderStyle: "solid",
    borderColor: colors.transparent,
    backgroundColor: {
      default: colors.accent,
      ":hover": colors.accentHover,
    },
    color: colors.accentForeground,
    boxShadow: shadows.subtle,
    cursor: "pointer",
    textDecoration: "none",
    transitionProperty: transitions.property,
    transitionDuration: transitions.duration,
    transitionTimingFunction: transitions.timingFunction,
    userSelect: "none",
    transform: {
      default: "none",
      ":hover": transforms.hoverLift,
      ":active": transforms.active,
    },
  },
  disabled: {
    opacity: opacities.disabled,
    cursor: "not-allowed",
    transform: "none",
  },
});

export function Button({
  variant: _variant = "default",
  size: _size = "default",
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const buttonProps = stylex.props(styles.button, disabled && styles.disabled);

  return (
    <button
      type="button"
      data-slot="button"
      disabled={disabled}
      {...buttonProps}
      {...rest}
      className={
        className
          ? `${buttonProps.className} ${className}`
          : buttonProps.className
      }
    >
      {children}
    </button>
  );
}
