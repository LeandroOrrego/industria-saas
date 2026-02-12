import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#333' }}>
                    <h1 style={{ color: '#e11d48' }}>Algo salió mal (Global Error)</h1>
                    <p>Por favor envía una captura de este error al desarrollador.</p>
                    <div style={{
                        background: '#f4f4f5',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        overflow: 'auto',
                        border: '1px solid #e4e4e7',
                        fontFamily: 'monospace',
                        marginTop: '1rem'
                    }}>
                        <strong style={{ display: 'block', marginBottom: '0.5rem' }}>{this.state.error?.name}: {this.state.error?.message}</strong>
                        <pre style={{ margin: 0, fontSize: '0.875rem' }}>{this.state.error?.stack}</pre>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{
                            marginTop: '1.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer'
                        }}
                    >
                        Ir al Inicio
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
