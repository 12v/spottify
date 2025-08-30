import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DataService } from '../services/dataService';
import { CycleService } from '../services/cycleService';
import LoadingSpinner from './LoadingSpinner';
import type { Measurement, CycleStats } from '../types';

export default function Statistics() {
  const { currentUser } = useAuth();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [stats, setStats] = useState<CycleStats | null>(null);
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
      const data = await DataService.getInstance().getMeasurements(currentUser.uid);
      setMeasurements(data);
      const cycleStats = CycleService.calculateCycleStats(data);
      setStats(cycleStats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getRecentMeasurements(type: string, days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return measurements.filter(m => 
      m.type === type && 
      new Date(m.date) >= cutoffDate
    ).length;
  }

  function getAverageBBT() {
    const bbtMeasurements = measurements.filter(m => m.type === 'bbt');
    if (bbtMeasurements.length === 0) return null;
    
    const sum = bbtMeasurements.reduce((total, m) => total + (m.value as any).celsius, 0);
    return (sum / bbtMeasurements.length).toFixed(2);
  }

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Statistics</h2>
          <Link to="/" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>

        <LoadingSpinner message="Calculating statistics..." />

      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Statistics</h2>
        <Link to="/" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
      </div>

      {!stats ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Not enough data for statistics. Record at least 2 complete cycles to see insights.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '1rem' }}>
            <h3>Cycle Statistics</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div>
                <strong>Average Cycle Length:</strong> {Math.round(stats.averageCycleLength)} days
              </div>
              <div>
                <strong>Cycle Variation:</strong> ±{Math.round(stats.cycleVariation)} days
              </div>
              <div>
                <strong>Average Period Length:</strong> {Math.round(stats.averagePeriodLength)} days
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '1rem' }}>
            <h3>Recent Activity (Last 30 Days)</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div>
                <strong>Period Days:</strong> {getRecentMeasurements('period')}
              </div>
              <div>
                <strong>BBT Recordings:</strong> {getRecentMeasurements('bbt')}
              </div>
              <div>
                <strong>Cramps Reported:</strong> {getRecentMeasurements('cramps')}
              </div>
              <div>
                <strong>Sore Breasts Reported:</strong> {getRecentMeasurements('sore_breasts')}
              </div>
            </div>
          </div>

          {getAverageBBT() && (
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '1rem' }}>
              <h3>Temperature</h3>
              <div>
                <strong>Average BBT:</strong> {getAverageBBT()}°C
              </div>
            </div>
          )}

          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '1rem' }}>
            <h3>Data Summary</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div>
                <strong>Total Records:</strong> {measurements.length}
              </div>
              <div>
                <strong>Date Range:</strong> {
                  measurements.length > 0 
                    ? `${new Date(measurements[measurements.length - 1].date).toLocaleDateString()} - ${new Date(measurements[0].date).toLocaleDateString()}`
                    : 'No data'
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}