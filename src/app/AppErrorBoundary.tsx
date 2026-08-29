import { Component, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="fatal-error" id="main-content">
          <div className="panel panel--centered" role="alert">
            <p className="eyebrow">wordeasy</p>
            <h1>The learning view could not be displayed.</h1>
            <p>Your locally saved progress has not been cleared.</p>
            <button
              className="button button--primary"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload the app
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
