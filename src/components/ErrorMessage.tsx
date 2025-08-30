import type { ReactNode } from 'react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  children?: ReactNode;
}

export default function ErrorMessage({
  title = 'Something went wrong',
  message,
  details,
  onRetry,
  onDismiss,
  children
}: ErrorMessageProps) {
  return (
    <div style={{
      padding: '1.5rem',
      border: '1px solid #dc3545',
      borderRadius: '8px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      margin: '1rem 0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#721c24' }}>{title}</h4>
          <p style={{ margin: '0', lineHeight: '1.4' }}>{message}</p>
          {details && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', color: '#495057' }}>View details</summary>
              <pre style={{ 
                marginTop: '0.5rem', 
                padding: '0.5rem', 
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
                fontSize: '0.875rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {details}
              </pre>
            </details>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#721c24',
              padding: '0',
              marginLeft: '1rem'
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
      
      {children && (
        <div style={{ marginBottom: '1rem' }}>
          {children}
        </div>
      )}

      {onRetry && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onRetry}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}