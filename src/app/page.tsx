import * as stylex from "@stylexjs/stylex";
import { EmptyState } from "../components/library/EmptyState";
import { spacing } from "../styles/tokens.stylex";

// Stryker disable all
const styles = stylex.create({
  main: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    boxSizing: "border-box",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
});
// Stryker restore all

export default function Home() {
  return (
    <main {...stylex.props(styles.main)}>
      <EmptyState />
    </main>
  );
}
