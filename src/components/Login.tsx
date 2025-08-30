import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, currentUser } = useAuth();

  if (currentUser) {
    return <Navigate to="/" />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setError('');
      setMessage('');
      setLoading(true);
      
      if (isReset) {
        await sendPasswordResetEmail(auth, email);
        setMessage('Check your inbox for password reset instructions');
        setLoading(false);
        return;
      }
      
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (error: any) {
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      setError(errorMessage);
    }

    setLoading(false);
  }

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
          {isReset ? '🔑 Reset Password' : (isLogin ? '👋 Welcome Back' : '🌸 Create Account')}
        </h2>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          {isReset ? 'Enter your email to receive reset instructions' : 
           (isLogin ? 'Sign in to track your cycle' : 'Start tracking your period today')}
        </p>
      </div>
      
      {error && <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}
      {message && <div style={{ color: 'green', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>{message}</div>}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem', color: '#333' }}>Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        {!isReset && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.25rem', color: '#333' }}>Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            {!isLogin && <p style={{ fontSize: '12px', color: '#666', margin: '0.25rem 0 0 0' }}>Must be at least 6 characters</p>}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            marginBottom: '1.5rem',
            backgroundColor: isLogin ? '#8B0000' : '#2F4F4F',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Loading...' : (isReset ? '📧 Send Reset Email' : (isLogin ? '🔑 Sign In' : '✨ Create Account'))}
        </button>
      </form>
      
      <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        {!isReset ? (
          <>
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setMessage('');
                setEmail('');
                setPassword('');
              }}
              style={{ 
                background: 'linear-gradient(45deg, #8B0000, #A52A2A)', 
                border: 'none', 
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontWeight: 'bold',
                marginRight: '0.5rem'
              }}
            >
              {isLogin ? '👤 Create New Account' : '🔙 Back to Sign In'}
            </button>
            
            {isLogin && (
              <button 
                type="button"
                onClick={() => {
                  setIsReset(true);
                  setError('');
                  setMessage('');
                  setPassword('');
                }}
                style={{ 
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textDecoration: 'underline'
                }}
              >
                Forgot Password?
              </button>
            )}
          </>
        ) : (
          <button 
            type="button"
            onClick={() => {
              setIsReset(false);
              setIsLogin(true);
              setError('');
              setMessage('');
            }}
            style={{ 
              background: 'none',
              border: 'none',
              color: '#8B0000',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
          >
            ← Back to Sign In
          </button>
        )}
      </div>
    </div>
  );
}