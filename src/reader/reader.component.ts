import { Component } from "@angular/core";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	container: {
		position: "fixed",
		inset: 0,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#0b0f19",
		fontFamily:
			'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		color: "#f8fafc",
		padding: "1.5rem",
		boxSizing: "border-box",
	},
	title: {
		fontSize: "3rem",
		fontWeight: 700,
		color: "#38bdf8",
		letterSpacing: "-0.025em",
		margin: "0 0 1rem 0",
	},
	description: {
		fontSize: "1.125rem",
		color: "#94a3b8",
		margin: "0 0 2rem 0",
		maxWidth: "480px",
		textAlign: "center",
		lineHeight: 1.5,
	},
	navLink: {
		display: "inline-flex",
		alignItems: "center",
		gap: "0.5rem",
		padding: "0.625rem 1.25rem",
		borderRadius: "8px",
		backgroundColor: "#1e293b",
		color: "#38bdf8",
		textDecoration: "none",
		fontSize: "0.95rem",
		fontWeight: 600,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: "#334155",
	},
});

@Component({
	selector: "app-reader",
	standalone: true,
	template: `
    <main [class]="containerProps.className">
      <h1 [class]="titleProps.className">Reader</h1>
      <p [class]="descriptionProps.className">
        Document reading viewport. Fast byte-level streaming via OPFS sync access handles.
      </p>
      <a href="/" [class]="navLinkProps.className">&larr; Back to Library</a>
    </main>
  `,
})
export class ReaderComponent {
	protected readonly containerProps = stylex.props(styles.container);
	protected readonly titleProps = stylex.props(styles.title);
	protected readonly descriptionProps = stylex.props(styles.description);
	protected readonly navLinkProps = stylex.props(styles.navLink);
}
