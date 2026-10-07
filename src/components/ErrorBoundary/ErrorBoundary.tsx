import { Component, type ErrorInfo, type ReactNode } from "react";

import i18n from "../../i18n";
import styles from "./ErrorBoundary.module.css";

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
          <div className={styles.box} role="alert">
            <p className={styles.message}>{i18n.t("error.boundary")}</p>
            <button className={styles.retry} onClick={() => this.setState({ error: null })}>
              {i18n.t("error.tryAgain")}
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
