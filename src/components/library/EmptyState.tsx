import * as stylex from "@stylexjs/stylex";
import { colors, spacing, typography } from "../../styles/tokens.stylex";
import { Button } from "../ui/button";

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  title: {
    margin: 0,
    fontFamily: typography.fontScript,
    fontSize: typography.sizeHero,
    fontWeight: typography.weightNormal,
    color: colors.textPrimary,
    lineHeight: "1.2",
    marginBottom: spacing.xs,
  },
  description: {
    margin: 0,
    fontFamily: typography.fontSans,
    fontSize: typography.sizeBase,
    lineHeight: typography.lineHeightNormal,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
});

export function EmptyState() {
  return (
    <div {...stylex.props(styles.container)}>
      <h1 {...stylex.props(styles.title)}>No books yet.</h1>
      <p {...stylex.props(styles.description)}>Add a book to start reading.</p>
      <Button variant="primary" size="default">
        Add your first book
      </Button>
    </div>
  );
}
