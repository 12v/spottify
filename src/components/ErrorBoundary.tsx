import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="page-container" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <div style={{ 
            padding: '2rem', 
            border: '1px solid #ff6b6b', 
            borderRadius: '8px', 
            backgroundColor: '#ffe0e0',
            margin: '2rem 0'
          }}>
            <h2 style={{ color: '#d63031', margin: '0 0 1rem 0' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#636e72', marginBottom: '1.5rem' }}>
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#8B0000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Go Back
              </button>
            </div>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              textAlign: 'left'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Error Details (Development)
              </summary>
              <pre style={{ 
                marginTop: '1rem', 
                fontSize: '12px', 
                overflow: 'auto',
                color: '#e74c3c'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}