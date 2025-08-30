interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export default function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'medium',
  color = '#8B0000'
}: LoadingSpinnerProps) {
  const sizeMap = {
    small: { width: '30px', height: '30px', border: '3px solid' },
    medium: { width: '40px', height: '40px', border: '3px solid' },
    large: { width: '50px', height: '50px', border: '4px solid' }
  };

  const spinnerSize = sizeMap[size];

  return (
    <div style={{ textAlign: 'center', padding: size === 'large' ? '4rem 0' : '2rem 0' }}>
      <div 
        style={{
          width: spinnerSize.width,
          height: spinnerSize.height,
          border: `${spinnerSize.border} #ddd`,
          borderTop: `${spinnerSize.border} ${color}`,
          borderRadius: '50%',
          margin: '0 auto 1rem',
          animation: 'spin 1s linear infinite'
        }}
      />
      <p style={{ color: '#666', margin: 0 }}>{message}</p>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}