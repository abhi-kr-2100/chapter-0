import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
  },
});

export default function Home() {
  return <main {...stylex.props(styles.container)}>Hello, Chapter 0!</main>;
}
