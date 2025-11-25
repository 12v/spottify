import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../hooks/useAuth';
import { DataService } from '../services/dataService';
import { CycleService } from '../services/cycleService';
import { CYCLE_CONSTANTS } from '../utils/constants';
import LoadingSpinner from './LoadingSpinner';
import type { Measurement, CycleStats } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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

  const cycleData = CycleService.getCycleData(measurements);
  const dataAlerts = CycleService.checkIncompleteData(measurements);

  // Helper function to create histogram data with contiguous range
  function createHistogramData(
    data: Array<{ cycleLength?: number; periodLength?: number }>,
    key: 'cycleLength' | 'periodLength',
    label: string,
    backgroundColor: string,
    borderColor: string
  ) {
    const counts = data.reduce((acc, item) => {
      const value = item[key]!;
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const values = Object.keys(counts).map(k => parseInt(k));
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    return {
      labels: range.map(String),
      datasets: [{
        label,
        data: range.map(v => counts[v] || 0),
        backgroundColor,
        borderColor,
        borderWidth: 1,
      }]
    };
  }

  // Helper function to create line chart data
  function createLineChartData(
    key: 'cycleLength' | 'periodLength',
    label: string,
    borderColor: string,
    backgroundColor: string
  ) {
    return {
      labels: cycleData.map((_, index) => `Cycle ${index + 1}`),
      datasets: [{
        label,
        data: cycleData.map(cycle => cycle[key]),
        borderColor,
        backgroundColor,
        tension: 0.2,
      }]
    };
  }

  const cycleLengthChart = createLineChartData('cycleLength', 'Cycle Length (days)', '#8B0000', 'rgba(139, 0, 0, 0.1)');
  const periodLengthChart = createLineChartData('periodLength', 'Period Length (days)', '#A52A2A', 'rgba(165, 42, 42, 0.1)');

  const cycleLengthHistogram = createHistogramData(cycleData, 'cycleLength', 'Number of Cycles', 'rgba(139, 0, 0, 0.6)', '#8B0000');
  const periodLengthHistogram = createHistogramData(cycleData, 'periodLength', 'Number of Periods', 'rgba(165, 42, 42, 0.6)', '#A52A2A');

  const chartOptions = {
    responsive: true,
    animation: false as const,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '800px' }}>
        <div className="header-row">
          <h2>Statistics</h2>
          <Link to="/" className="back-link">← Dashboard</Link>
        </div>
        <LoadingSpinner message="Calculating statistics..." />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <div className="header-row">
        <h2>Statistics & Analytics</h2>
        <Link to="/" className="back-link">← Dashboard</Link>
      </div>

      {dataAlerts.length > 0 && (
        <div className="alert warning">
          <strong>⚠️ Incomplete Period Data:</strong>
          <ul>
            {dataAlerts.map((alert, index) => (
              <li key={index}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      {cycleData.length === 0 ? (
        <div className="content-box disabled">
          <p style={{ textAlign: 'center', margin: '2rem 0' }}>
            Not enough data for analytics. Record at least 2 complete cycles to see charts and insights.
          </p>
        </div>
      ) : (
        <div>
          {stats && cycleData.length >= CYCLE_CONSTANTS.MINIMUM_CYCLES_FOR_PREDICTIONS && (
            <div className="content-box">
              <h3>Summary Statistics</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div><strong>Average Cycle Length:</strong> {Math.round(stats.averageCycleLength)} days</div>
                <div><strong>Cycle Variation:</strong> ±{Math.round(stats.cycleVariation)} days</div>
                <div><strong>Average Period Length:</strong> {Math.round(stats.averagePeriodLength)} days</div>
                <div><strong>Total Cycles Analysed:</strong> {cycleData.length}</div>
                <div><strong>Data Range:</strong> {
                  cycleData.length > 0 
                    ? `${new Date(cycleData[0].startDate).toLocaleDateString()} - ${new Date(cycleData[cycleData.length - 1].startDate).toLocaleDateString()}`
                    : 'No data'
                }</div>
              </div>
            </div>
          )}

          <div className="chart">
            <h3>Cycle Length Over Time</h3>
            <Line data={cycleLengthChart} options={chartOptions} />
          </div>
          
          <div className="chart">
            <h3>Cycle Length Distribution</h3>
            <Bar data={cycleLengthHistogram} options={chartOptions} />
          </div>
          
          <div className="chart">
            <h3>Period Length Over Time</h3>
            <Line data={periodLengthChart} options={chartOptions} />
          </div>
          
          <div className="chart">
            <h3>Period Length Distribution</h3>
            <Bar data={periodLengthHistogram} options={chartOptions} />
          </div>
        </div>
      )}
    </div>
  );
}