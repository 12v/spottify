import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import Statistics from './components/Statistics';
import ImportData from './components/ImportData';
import './App.css'

function App() {
  useEffect(() => {
    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath) {
      sessionStorage.removeItem('redirectPath');
      window.history.replaceState(null, '', redirectPath);
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router basename="/spottify" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="app">
            <Routes>
              <Route path="/login" element={
                <ErrorBoundary>
                  <Login />
                </ErrorBoundary>
              } />
              <Route path="/" element={
                <ErrorBoundary>
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                </ErrorBoundary>
              } />
              <Route path="/calendar" element={
                <ErrorBoundary>
                  <PrivateRoute>
                    <Calendar />
                  </PrivateRoute>
                </ErrorBoundary>
              } />
              <Route path="/statistics" element={
                <ErrorBoundary>
                  <PrivateRoute>
                    <Statistics />
                  </PrivateRoute>
                </ErrorBoundary>
              } />
              <Route path="/import" element={
                <ErrorBoundary>
                  <PrivateRoute>
                    <ImportData />
                  </PrivateRoute>
                </ErrorBoundary>
              } />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
