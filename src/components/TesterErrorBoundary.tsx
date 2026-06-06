import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    testerId: string;
    children: ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

/**
 * Error boundary that catches render errors in tester components,
 * preventing a single failing test from crashing the entire app.
 * Provides a recovery UI with navigation guidance.
 */
export default class TesterErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, errorMessage: '' };

    static getDerivedStateFromError(error: unknown): State {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { hasError: true, errorMessage: message };
    }

    componentDidCatch(_error: Error, info: ErrorInfo): void {
        // Intentionally no console.error — error is surfaced in the UI.
        // componentStack is available in info for debugging if needed.
        void info;
    }

    componentDidUpdate(prevProps: Props): void {
        if (prevProps.testerId !== this.props.testerId && this.state.hasError) {
            this.setState({ hasError: false, errorMessage: '' });
        }
    }

    private handleRetry = (): void => {
        this.setState({ hasError: false, errorMessage: '' });
    };

    render(): ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <div className="tester-error-boundary" role="alert">
                <div className="tester-error-boundary__icon">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                    </svg>
                </div>
                <h2 className="tester-error-boundary__title">This test encountered a problem</h2>
                <p className="tester-error-boundary__message">{this.state.errorMessage}</p>
                <p className="tester-error-boundary__hint">
                    Try another test from the sidebar, or retry this one.
                </p>
                <div className="tester-error-boundary__actions">
                    <button type="button" className="btn btn--primary" onClick={this.handleRetry}>
                        Retry
                    </button>
                    <a href="#dashboard" className="btn">
                        Go to Dashboard
                    </a>
                </div>
                <style>{`
                    .tester-error-boundary {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        min-height: 300px;
                        padding: 2rem;
                        gap: 0.75rem;
                    }
                    .tester-error-boundary__icon {
                        color: var(--error);
                        opacity: 0.7;
                        margin-bottom: 0.5rem;
                    }
                    .tester-error-boundary__title {
                        font-size: 1.25rem;
                        font-weight: 700;
                        color: var(--text);
                    }
                    .tester-error-boundary__message {
                        font-size: var(--text-sm);
                        color: var(--text-muted);
                        max-width: 50ch;
                        line-height: 1.5;
                    }
                    .tester-error-boundary__hint {
                        font-size: var(--text-xs);
                        color: var(--text-muted);
                        opacity: 0.7;
                    }
                    .tester-error-boundary__actions {
                        display: flex;
                        gap: 0.75rem;
                        margin-top: 0.5rem;
                    }
                `}</style>
            </div>
        );
    }
}
