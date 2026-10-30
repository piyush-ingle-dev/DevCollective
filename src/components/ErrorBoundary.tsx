import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  declare readonly props: Readonly<Props>;
  declare readonly setState: (
    state: Partial<State> | ((prevState: Readonly<State>, props: Readonly<Props>) => Partial<State> | null),
  ) => void;

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DevCollective UI error boundary:', error, info);
  }

  private handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="dc-app-shell min-h-[50vh] bg-background text-on-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg border-2 border-outline-variant bg-surface p-8 dc-shadow-lg text-center">
          <p className="font-label-mono text-[10px] uppercase text-primary">UI / RECOVERY</p>
          <h2 className="dc-display text-4xl mt-2">THIS MODULE HIT A SNAG.</h2>
          <p className="mt-3 text-sm text-on-surface-variant">Your data and account state were not changed. Retry the view to continue.</p>
          <button type="button" onClick={this.handleRetry} className="mt-6 border-2 border-outline-variant bg-primary text-on-primary px-5 py-3 font-label-mono text-[10px] uppercase font-bold dc-shadow-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }
}
