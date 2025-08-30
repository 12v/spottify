import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DataService } from '../services/dataService';
import { CycleService } from '../services/cycleService';
import { formatLocalDate, formatDisplayDate } from '../utils/dateUtils';
import { useErrorHandler } from '../hooks/useErrorHandler';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import type { Measurement, Prediction } from '../types';

function NavigationGrid({ measurements, handleExport, loading = false }: { measurements: Measurement[], handleExport: () => void, loading?: boolean }) {
  return (
    <div className="nav-grid">
      <Link 
        to={`/calendar?openModal=true&date=${formatLocalDate(new Date())}`}
        className={`nav-card ${loading ? 'disabled' : ''}`}
      >
        <h3>Log Today</h3>
        <p>Record today's data</p>
      </Link>

      <Link 
        to="/calendar" 
        className={`nav-card ${loading ? 'disabled' : ''}`}
      >
        <h3>Calendar</h3>
        <p>View & input cycle data</p>
      </Link>

      <Link 
        to="/statistics" 
        className={`nav-card ${loading ? 'disabled' : ''}`}
      >
        <h3>Statistics</h3>
        <p>Cycle insights and averages</p>
      </Link>

      <Link 
        to="/import" 
        className={`nav-card import ${loading ? 'disabled' : ''}`}
      >
        <h3>📥 Import Data</h3>
        <p>Import historical data</p>
      </Link>

      <button 
        onClick={handleExport}
        disabled={loading || !measurements.length}
        className="nav-card export"
      >
        <h3>📤 Export Data</h3>
        <p>Download your data</p>
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, handleError, clearError, retry } = useErrorHandler();

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  async function loadData() {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      clearError();
      const data = await DataService.getInstance().getMeasurements(currentUser.uid);
      setMeasurements(data);
      const pred = CycleService.predictNextCycle(data);
      setPrediction(pred);
    } catch (loadError) {
      handleError(loadError as Error, 'Failed to load your cycle data. Please try again.', loadData);
    } finally {
      setLoading(false);
    }
  }


  async function handleExport() {
    if (!currentUser || measurements.length === 0) {
      handleError('No data available to export. Please add some measurements first.');
      return;
    }

    try {
      clearError();
      const dataStr = JSON.stringify(measurements, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `spottify-data-${formatLocalDate(new Date())}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (exportError) {
      handleError(exportError as Error, 'Failed to export data. Please try again.');
    }
  }


  function getDaysUntil(dateStr: string) {
    const target = new Date(dateStr);
    const today = new Date();
    return Math.ceil((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  }

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '600px' }}>
        <div className="header-row">
          <h1>Spottify</h1>
          <button onClick={logout} className="btn">
            Logout
          </button>
        </div>

        <div className="content-box loading">
          <LoadingSpinner message="Loading your cycle data..." />
        </div>
        
        <NavigationGrid measurements={measurements} handleExport={handleExport} loading={true} />

      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '600px' }}>
      <div className="header-row">
        <h1>Spottify</h1>
        <button onClick={logout} className="btn">
          Logout
        </button>
      </div>

      {error.hasError && (
        <ErrorMessage 
          message={error.message} 
          details={error.details}
          onRetry={retry}
          onDismiss={clearError}
        />
      )}


      {prediction ? (
        <div className="content-box">
          <h3>Predictions</h3>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <div>
              <strong>Next Period:</strong> {formatDisplayDate(prediction.nextPeriod)} 
              ({getDaysUntil(prediction.nextPeriod)} days)
            </div>
            <div>
              <strong>Ovulation:</strong> {formatDisplayDate(prediction.ovulation)}
              ({getDaysUntil(prediction.ovulation)} days)
            </div>
            <div>
              <strong>Fertile Window:</strong> {formatDisplayDate(prediction.fertileWindow.start)} - {formatDisplayDate(prediction.fertileWindow.end)}
            </div>
          </div>
        </div>
      ) : (
        <div className="content-box disabled">
          <div style={{ textAlign: 'center', color: '#999', padding: '2rem 0' }}>
            <p>Not enough data for predictions.<br/>Record at least 2 complete cycles to see insights.</p>
          </div>
        </div>
      )}

      <NavigationGrid measurements={measurements} handleExport={handleExport} />
    </div>
  );
}