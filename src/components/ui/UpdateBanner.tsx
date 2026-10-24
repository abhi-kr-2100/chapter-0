import * as stylex from "@stylexjs/stylex";
import {
  borders,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../styles/tokens.stylex";
import { Button } from "./button";

export interface UpdateBannerProps {
  onReload: () => void;
  onDismiss?: () => void;
}

// Stryker disable all
const styles = stylex.create({
  container: {
    position: "fixed",
    bottom: spacing.md,
    left: "50%",
    transform: "translateX(-50%)",
    width: "calc(100% - 32px)",
    maxWidth: "480px",
    backgroundColor: colors.background,
    borderWidth: borders.width,
    borderStyle: "solid",
    borderColor: colors.accent,
    borderRadius: radii.md,
    boxShadow: shadows.subtle,
    padding: spacing.md,
    display: "flex",
    flexDirection: "column",
    gap: spacing.sm,
    zIndex: 1000,
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 0,
  },
  title: {
    margin: 0,
    fontFamily: typography.fontSans,
    fontSize: typography.sizeBase,
    fontWeight: typography.weightBold,
    color: colors.textPrimary,
    lineHeight: typography.lineHeightNormal,
  },
  description: {
    margin: 0,
    fontFamily: typography.fontSans,
    fontSize: typography.sizeBase,
    color: colors.textSecondary,
    lineHeight: typography.lineHeightNormal,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
// Stryker restore all

export function UpdateBanner({ onReload, onDismiss }: UpdateBannerProps) {
  return (
    <aside
      role="status"
      aria-labelledby="update-banner-title"
      aria-describedby="update-banner-desc"
      {...stylex.props(styles.container)}
    >
      <div {...stylex.props(styles.header)}>
        <h2 id="update-banner-title" {...stylex.props(styles.title)}>
          Update available
        </h2>
      </div>
      <p id="update-banner-desc" {...stylex.props(styles.description)}>
        A new version of Chapter 0 is available. Reloading will update all open
        instances of Chapter 0.
      </p>
      <div {...stylex.props(styles.actions)}>
        {onDismiss ? (
          <Button type="button" variant="default" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
        <Button type="button" variant="primary" onClick={onReload}>
          Reload
        </Button>
      </div>
    </aside>
  );
}
