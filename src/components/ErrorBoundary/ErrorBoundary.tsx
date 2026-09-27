import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)" }}>
              Something went wrong. Please reload the page.
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ marginTop: "1rem", padding: "0.5rem 1.25rem", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
