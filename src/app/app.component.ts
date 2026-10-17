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
		fontSize: "3.5rem",
		fontWeight: 700,
		color: "#f8fafc",
		letterSpacing: "-0.025em",
		margin: "0 0 0.75rem 0",
	},
	subtitle: {
		fontSize: "1.25rem",
		color: "#94a3b8",
		margin: "0 0 2rem 0",
		textAlign: "center",
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
	selector: "app-root",
	standalone: true,
	template: `
    <main [class]="containerProps.className">
      <h1 [class]="titleProps.className">Chapter 0</h1>
      <p [class]="subtitleProps.className">Local-first in-browser document reader</p>
      <a href="/reader/" [class]="navLinkProps.className">Open Reader &rarr;</a>
    </main>
  `,
})
export class AppComponent {
	protected readonly containerProps = stylex.props(styles.container);
	protected readonly titleProps = stylex.props(styles.title);
	protected readonly subtitleProps = stylex.props(styles.subtitle);
	protected readonly navLinkProps = stylex.props(styles.navLink);
}
