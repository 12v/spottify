import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services';
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
      const data = await dataService.getMeasurements(currentUser.uid);
      setMeasurements(data);
      const pred = CycleService.predictNextCycle(data);
      setPrediction(pred);
    } catch (loadError) {
      handleError(loadError as Error, 'Failed to load your cycle data. Please try again.', loadData);
    } finally {
      setLoading(false);
    }
  }

  const [exportSuccess, setExportSuccess] = useState(false);

  async function handleExport() {
    if (!currentUser || measurements.length === 0) {
      handleError('No data available to export. Please add some measurements first.');
      return;
    }

    try {
      clearError();
      const exportData = {
        exportDate: formatLocalDate(new Date()),
        userId: currentUser.uid,
        measurements: measurements
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `spottify-data-${formatLocalDate(new Date())}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000); // Auto-hide after 3 seconds
    } catch (exportError) {
      handleError(exportError as Error, 'Failed to export data. Please try again.');
    }
  }


  function getDaysUntil(dateStr: string) {
    const target = new Date(dateStr);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, minWidth: '120px' }}>Spottify</h1>
          <button onClick={logout} style={{ padding: '0.5rem 1rem', flexShrink: 0 }}>
            Logout
          </button>
        </div>

        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: '4px', minHeight: '120px' }}>
          <LoadingSpinner message="Loading your cycle data..." />
        </div>
        
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <Link 
            to={`/calendar?openModal=true&date=${formatLocalDate(new Date())}`}
            style={{ 
              padding: '2rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px', 
              textDecoration: 'none', 
              textAlign: 'center',
              color: 'inherit'
            }}
          >
            <h3>Log Today</h3>
            <p>Record today's data</p>
          </Link>

          <Link 
            to="/calendar" 
            style={{ 
              padding: '2rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px', 
              textDecoration: 'none', 
              textAlign: 'center',
              color: 'inherit',
              opacity: '0.7',
              pointerEvents: 'none'
            }}
          >
            <h3>Calendar</h3>
            <p>View & input cycle data</p>
          </Link>

          <Link 
            to="/statistics" 
            style={{ 
              padding: '2rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px', 
              textDecoration: 'none', 
              textAlign: 'center',
              color: 'inherit',
              opacity: '0.7',
              pointerEvents: 'none'
            }}
          >
            <h3>Statistics</h3>
            <p>Cycle insights and averages</p>
          </Link>

          <Link 
            to="/import" 
            style={{ 
              padding: '2rem', 
              border: '1px solid #8B0000', 
              borderRadius: '4px', 
              textDecoration: 'none', 
              textAlign: 'center',
              color: 'inherit',
              backgroundColor: '#f8f0f0',
              opacity: '0.7',
              pointerEvents: 'none'
            }}
          >
            <h3>📥 Import Data</h3>
            <p>Import historical data</p>
          </Link>

          <div style={{ 
            padding: '2rem', 
            border: '1px solid #28a745', 
            borderRadius: '4px', 
            textAlign: 'center',
            color: 'inherit',
            backgroundColor: '#f5f5f5',
            opacity: '0.7'
          }}>
            <h3>📤 Export Data</h3>
            <p>Download your data</p>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, minWidth: '120px' }}>Spottify</h1>
        <button onClick={logout} style={{ padding: '0.5rem 1rem', flexShrink: 0 }}>
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

      {exportSuccess && (
        <div style={{
          padding: '1rem',
          border: '1px solid #28a745',
          borderRadius: '8px',
          backgroundColor: '#d4edda',
          color: '#155724',
          margin: '1rem 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>✅ Data exported successfully!</span>
          <button 
            onClick={() => setExportSuccess(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#155724' }}
          >
            ×
          </button>
        </div>
      )}

      {prediction ? (
        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
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
        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: '4px', minHeight: '120px', opacity: '0.5' }}>
          <div style={{ textAlign: 'center', color: '#999', padding: '2rem 0' }}>
            <p>Not enough data for predictions.<br/>Record at least 2 complete cycles to see insights.</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Link 
          to={`/calendar?openModal=true&date=${formatLocalDate(new Date())}`}
          style={{ 
            padding: '2rem', 
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            textDecoration: 'none', 
            textAlign: 'center',
            color: 'inherit'
          }}
        >
          <h3>Log Today</h3>
          <p>Record today's data</p>
        </Link>

        <Link 
          to="/calendar" 
          style={{ 
            padding: '2rem', 
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            textDecoration: 'none', 
            textAlign: 'center',
            color: 'inherit'
          }}
        >
          <h3>Calendar</h3>
          <p>View & input cycle data</p>
        </Link>

        <Link 
          to="/statistics" 
          style={{ 
            padding: '2rem', 
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            textDecoration: 'none', 
            textAlign: 'center',
            color: 'inherit'
          }}
        >
          <h3>Statistics</h3>
          <p>Cycle insights and averages</p>
        </Link>

        <Link 
          to="/import" 
          style={{ 
            padding: '2rem', 
            border: '1px solid #8B0000', 
            borderRadius: '4px', 
            textDecoration: 'none', 
            textAlign: 'center',
            color: 'inherit',
            backgroundColor: '#f8f0f0'
          }}
        >
          <h3>📥 Import Data</h3>
          <p>Import historical data</p>
        </Link>

        <button 
          onClick={handleExport}
          disabled={!measurements.length}
          style={{ 
            padding: '2rem', 
            border: '1px solid #28a745', 
            borderRadius: '4px', 
            textAlign: 'center',
            color: 'inherit',
            backgroundColor: measurements.length ? '#f0f8f0' : '#f5f5f5',
            cursor: measurements.length ? 'pointer' : 'not-allowed',
            opacity: measurements.length ? 1 : 0.6
          }}
        >
          <h3>📤 Export Data</h3>
          <p>Download your data</p>
        </button>
      </div>
    </div>
  );
}