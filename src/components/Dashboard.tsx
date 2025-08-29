import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DataService } from '../services/dataService';
import { CycleService } from '../services/cycleService';
import { formatLocalDate, formatDisplayDate } from '../utils/dateUtils';
import type { Measurement, Prediction } from '../types';

const dataService = new DataService();

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  async function loadData() {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const data = await dataService.getMeasurements(currentUser.uid);
      setMeasurements(data);
      const pred = CycleService.predictNextCycle(data);
      setPrediction(pred);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!currentUser || measurements.length === 0) {
      alert('No data to export');
      return;
    }

    try {
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
      alert('Data exported successfully!');
    } catch (error) {
      alert('Error exporting data');
      console.error('Export error:', error);
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

        {/* Reserve space for predictions section - match loaded state structure */}
        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: '4px', position: 'relative' }}>
          <div style={{ visibility: 'hidden' }}>
            <h3>Predictions</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div>
                <strong>Next Period:</strong> ••••-••-•• (•• days)
              </div>
              <div>
                <strong>Ovulation:</strong> ••••-••-••(•• days)
              </div>
              <div>
                <strong>Fertile Window:</strong> ••••-••-•• - ••••-••-••
              </div>
            </div>
          </div>
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid #ddd', 
              borderTop: '3px solid #8B0000', 
              borderRadius: '50%', 
              margin: '0 auto 1rem',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p>Loading your cycle data...</p>
          </div>
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

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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