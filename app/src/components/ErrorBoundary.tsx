import { Component, type ReactNode } from 'react';
import { Button, Card } from './Card.tsx';

/**
 * Wraps the current screen so that one broken screen can never take the header, the red emergency bar or the
 * Emergency page down with it. Give it a `key` per screen: switching screens remounts it, which clears the error.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; onHome: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('A screen failed to draw:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-2xl">
        <Card title="This screen could not be shown">
          <p className="text-base text-slate-300">Something went wrong on this screen. Your data is safe, and the "I feel unwell now" button still works.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => this.setState({ failed: false })}>Try again</Button>
            <Button variant="secondary" onClick={this.props.onHome}>Go to Today</Button>
          </div>
        </Card>
      </div>
    );
  }
}
