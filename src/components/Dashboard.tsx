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

  function formatCountdown(days: number, type: 'period' | 'ovulation') {
    if (days < 0) {
      const daysPast = Math.abs(days);
      if (type === 'period') {
        return {
          number: daysPast,
          label: daysPast === 1 ? 'day late' : 'days late'
        };
      } else {
        return {
          number: daysPast,
          label: daysPast === 1 ? 'day since ovulation' : 'days since ovulation'
        };
      }
    } else if (days === 0) {
      return {
        number: 'Today',
        label: type === 'period' ? 'period starts' : 'ovulation'
      };
    } else {
      return {
        number: days,
        label: type === 'period' 
          ? (days === 1 ? 'day until period' : 'days until period')
          : (days === 1 ? 'day until ovulation' : 'days until ovulation')
      };
    }
  }

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '600px' }}>
        <div className="header-row">
          <h1>Spottify</h1>
          <button onClick={logout} className="btn">Logout</button>
        </div>
        <div className="content-box loading">
          <LoadingSpinner message="Loading your cycle data..." />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '600px' }}>
      <div className="header-row">
        <h1>Spottify</h1>
        <button onClick={logout} className="btn">Logout</button>
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
        <div className="prediction-grid">
          <div className="prediction-card">
            {(() => {
              const days = getDaysUntil(prediction.nextPeriod);
              const countdown = formatCountdown(days, 'period');
              return (
                <>
                  <div className="countdown">{countdown.number}</div>
                  <div className="countdown-label">{countdown.label}</div>
                  <div className="date">{formatDisplayDate(prediction.nextPeriod)}</div>
                </>
              );
            })()}
          </div>
          <div className="prediction-card">
            {(() => {
              const days = getDaysUntil(prediction.ovulation);
              const countdown = formatCountdown(days, 'ovulation');
              return (
                <>
                  <div className="countdown">{countdown.number}</div>
                  <div className="countdown-label">{countdown.label}</div>
                  <div className="date">{formatDisplayDate(prediction.ovulation)}</div>
                </>
              );
            })()}
          </div>
          <div className="prediction-card">
            <div className="fertile-window">
              <div className="fertile-label">Fertile Window</div>
              <div className="date">{formatDisplayDate(prediction.fertileWindow.start)} - {formatDisplayDate(prediction.fertileWindow.end)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="getting-started">
          <h3>Getting Started</h3>
          <p>Record at least 2 complete cycles to see predictions and insights.</p>
        </div>
      )}

      <div className="action-grid">
        <Link 
          to={`/calendar?openModal=true&date=${formatLocalDate(new Date())}`}
          className="main-action"
        >
          <h3>Log Today</h3>
          <p>Record period, symptoms, BBT</p>
        </Link>

        <Link to="/calendar" className="main-action">
          <h3>Calendar</h3>
          <p>View monthly cycle data</p>
        </Link>

        <Link to="/statistics" className="secondary-action">
          Analytics
        </Link>
        
        <Link to="/import" className="secondary-action">
          Import
        </Link>
        
        <button 
          onClick={handleExport}
          disabled={!measurements.length}
          className={`secondary-action ${!measurements.length ? 'disabled' : ''}`}
        >
          Export
        </button>
      </div>
    </div>
  );
}