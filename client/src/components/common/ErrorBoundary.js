import React from "react";
import { Button } from "antd";
import { WarningFilled } from "@ant-design/icons";
import "./ErrorBoundary.css";

/**
 * Catches any error thrown while React renders its children and shows this screen instead of a
 * blank page. It appears when a component crashes while rendering (bad data, a code error, or a
 * half-saved file during development). With a `history` prop it clears itself when you move to
 * another page, so one broken page does not lock the whole app.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.unlisten = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    window.addEventListener("popstate", this.onPopState);
    if (this.props.history && typeof this.props.history.listen === "function") {
      this.unlisten = this.props.history.listen(() => {
        if (this.state.hasError) this.handleReset();
      });
    }
  }

  componentWillUnmount() {
    if (this.unlisten) this.unlisten();
    window.removeEventListener("popstate", this.onPopState);
  }

  onPopState = () => {
    if (this.state.hasError) this.handleReset();
  };

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught:", error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="wm-error-screen">
        <div className="wm-error-card">
          <span className="wm-error-icon">
            <WarningFilled />
          </span>
          <h2 className="wm-error-title">Something went wrong</h2>
          <p className="wm-error-text">
            We couldn't show this page. Please try again, or reload it. If it keeps happening, let your admin know.
          </p>
          <div className="wm-error-actions">
            <Button type="primary" onClick={this.handleReset}>
              Try Again
            </Button>
            <Button onClick={this.handleReload}>Reload Page</Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
