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
	card: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		maxWidth: "480px",
		textAlign: "center",
	},
	illustration: {
		width: "96px",
		height: "96px",
		marginBottom: "1.5rem",
		borderRadius: "16px",
		userSelect: "none",
	},
	title: {
		fontSize: "2.5rem",
		fontWeight: 700,
		color: "#f8fafc",
		letterSpacing: "-0.025em",
		margin: "0 0 0.75rem 0",
	},
	description: {
		fontSize: "1.05rem",
		color: "#94a3b8",
		margin: "0 0 2rem 0",
		lineHeight: 1.5,
	},
	actions: {
		display: "flex",
		alignItems: "center",
		gap: "0.75rem",
		flexWrap: "wrap",
		justifyContent: "center",
	},
	retryButton: {
		display: "inline-flex",
		alignItems: "center",
		gap: "0.5rem",
		padding: "0.625rem 1.25rem",
		borderRadius: "8px",
		backgroundColor: "#38bdf8",
		color: "#0b0f19",
		fontSize: "0.95rem",
		fontWeight: 600,
		cursor: "pointer",
		borderWidth: 0,
		fontFamily: "inherit",
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
	selector: "app-offline",
	standalone: true,
	template: `
    <main [class]="containerProps.className">
      <div [class]="cardProps.className">
        <img
          src="/offline.svg"
          alt="Offline"
          width="96"
          height="96"
          [class]="illustrationProps.className"
        />
        <h1 [class]="titleProps.className">You're Offline</h1>
        <p [class]="descriptionProps.className">
          Chapter 0 operates local-first. Your cached books and library are available, but internet-dependent resources cannot be reached right now.
        </p>
        <div [class]="actionsProps.className">
          <button type="button" (click)="retry()" [class]="retryButtonProps.className">
            Try Again
          </button>
          <a href="/" [class]="navLinkProps.className">
            &larr; Return to Library
          </a>
        </div>
      </div>
    </main>
  `,
})
export class OfflineComponent {
	protected readonly containerProps = stylex.props(styles.container);
	protected readonly cardProps = stylex.props(styles.card);
	protected readonly illustrationProps = stylex.props(styles.illustration);
	protected readonly titleProps = stylex.props(styles.title);
	protected readonly descriptionProps = stylex.props(styles.description);
	protected readonly actionsProps = stylex.props(styles.actions);
	protected readonly retryButtonProps = stylex.props(styles.retryButton);
	protected readonly navLinkProps = stylex.props(styles.navLink);

	protected retry(): void {
		window.location.reload();
	}
}
