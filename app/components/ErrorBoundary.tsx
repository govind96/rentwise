'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; /** Changing this value resets the caught state (e.g. on view switch). */ resetKey?: string | number };
type State = { error: Error | null };

/** Keeps one broken section from blanking the whole workspace. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Workspace section failed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty section-error" role="alert">
        <strong>This section hit a snag</strong>
        <span>Nothing was lost. Try again, or pick another section from the sidebar.</span>
        <button className="quiet-button" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    );
  }
}
