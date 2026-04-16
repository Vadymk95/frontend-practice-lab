import i18next from 'i18next';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundaryComponent extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, info);

        // Error monitoring service integration (Sentry, LogRocket, etc.)
        // Example integration:
        // if (import.meta.env.PROD) {
        //   Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
        // }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            const isDev = import.meta.env.DEV;
            const t = (key: string) => i18next.t(key);

            return (
                <section
                    role="alert"
                    aria-live="assertive"
                    className="flex min-h-screen flex-col items-center justify-center p-4"
                >
                    <div className="max-w-md space-y-4 text-center">
                        <h1 className="text-2xl font-bold">{t('errors:generic')}</h1>
                        <p className="text-muted-foreground">{t('errors:page.generic')}</p>

                        {isDev && this.state.error && (
                            <details className="mt-4 text-left">
                                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                                    {t('errors:page.errorDetails')}
                                </summary>
                                <pre className="mt-2 overflow-auto rounded-md bg-muted p-4 text-xs">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                            <Button onClick={this.handleReset} variant="default">
                                {t('errors:retry')}
                            </Button>
                            <Button onClick={this.handleReload} variant="outline">
                                {t('errors:reload')}
                            </Button>
                        </div>
                    </div>
                </section>
            );
        }

        return this.props.children;
    }
}

export const ErrorBoundary = ErrorBoundaryComponent;
