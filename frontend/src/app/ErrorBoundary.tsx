import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../components/ui/Status';
import { Button } from '../components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render errors in a route and shows a recoverable page instead of a blank screen. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16">
          <ErrorState title="This page could not be shown" error={this.state.error} />
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" onClick={() => window.location.assign('/')}>
              Back to the store
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
