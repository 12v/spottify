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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-title">
          <h2 style={{ margin: '0 0 0.5rem 0' }}>
            {isReset ? '🔑 Reset Password' : (isLogin ? '👋 Welcome Back' : '🌸 Create Account')}
          </h2>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
            {isReset ? 'Enter your email to receive reset instructions' : 
             (isLogin ? 'Sign in to track your cycle' : 'Start tracking your period today')}
          </p>
        </div>
        
        {error && <div className="auth-message error">{error}</div>}
        {message && <div className="auth-message success">{message}</div>}
      
        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
            />
          </div>
          
          {!isReset && (
            <div>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
              />
              {!isLogin && <p style={{ fontSize: '12px', color: '#666', margin: '0.25rem 0 0 0' }}>Must be at least 6 characters</p>}
            </div>
          )}
        
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Loading...' : (isReset ? '📧 Send Reset Email' : (isLogin ? '🔑 Sign In' : '✨ Create Account'))}
          </button>
        </form>
        
        <div className="auth-links">
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
              className="auth-button"
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
                className="auth-button secondary"
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
            className="auth-button secondary"
          >
            ← Back to Sign In
          </button>
        )}
        </div>
      </div>
    </div>
  );
}