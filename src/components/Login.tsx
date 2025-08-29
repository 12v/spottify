import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, currentUser } = useAuth();

  if (currentUser) {
    return <Navigate to="/" />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (error) {
      setError('Failed to ' + (isLogin ? 'sign in' : 'create account'));
    }

    setLoading(false);
  }

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
          {isLogin ? '👋 Welcome Back' : '🌸 Create Account'}
        </h2>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          {isLogin ? 'Sign in to track your cycle' : 'Start tracking your period today'}
        </p>
      </div>
      
      {error && <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}
      
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
          {loading ? 'Loading...' : (isLogin ? '🔑 Sign In' : '✨ Create Account')}
        </button>
      </form>
      
      <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        <button 
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
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
            fontWeight: 'bold'
          }}
        >
          {isLogin ? '👤 Create New Account' : '🔙 Back to Sign In'}
        </button>
      </div>
    </div>
  );
}