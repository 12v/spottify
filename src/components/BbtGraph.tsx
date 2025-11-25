import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import type { Measurement } from '../types';
import { CycleService } from '../services/cycleService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

interface BbtGraphProps {
  currentCycleDay: number;
  measurements: Measurement[];
}

export default function BbtGraph({ currentCycleDay, measurements }: BbtGraphProps) {
  const bbtMeasurements = measurements.filter(m => m.type === 'bbt');

  if (bbtMeasurements.length === 0) {
    return (
      <div className="chart">
        <div className="chart-disclaimer">
          No BBT data recorded yet. Start logging temperatures to see your graph.
        </div>
      </div>
    );
  }

  const historicalData = CycleService.getHistoricalBbtAverage(measurements);
  const currentData = CycleService.getCurrentCycleBbt(measurements);

  const maxDay = Math.max(
    historicalData.length > 0 ? historicalData[historicalData.length - 1].cycleDay : 0,
    currentData.length > 0 ? currentData[currentData.length - 1].cycleDay : 0
  );

  if (maxDay === 0) {
    return (
      <div className="chart">
        <div className="chart-disclaimer">
          No BBT data available for graphing.
        </div>
      </div>
    );
  }

  const labels = Array.from({ length: maxDay }, (_, i) => i + 1);

  const historicalTemps = labels.map(day => {
    const dataPoint = historicalData.find(d => d.cycleDay === day);
    return dataPoint?.avgTemperature ?? null;
  });

  const currentTemps = labels.map(day => {
    const dataPoint = currentData.find(d => d.cycleDay === day);
    return dataPoint?.temperature ?? null;
  });

  const datasets = [];

  if (historicalData.length > 0) {
    datasets.push({
      label: 'Historical Average',
      data: historicalTemps,
      borderColor: '#9B59B6',
      backgroundColor: 'rgba(155, 89, 182, 0.1)',
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      spanGaps: false,
    });
  }

  datasets.push({
    label: 'Current Cycle',
    data: currentTemps,
    borderColor: '#FF6B9D',
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
    tension: 0.3,
    pointRadius: 3,
    pointHoverRadius: 5,
    borderWidth: 2,
    spanGaps: false,
  });

  const chartData = {
    labels,
    datasets
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (context) => `Cycle Day ${context[0].label}`,
          label: (context) => {
            const value = context.parsed.y;
            return value !== null
              ? `${context.dataset.label}: ${value.toFixed(2)}°C`
              : `${context.dataset.label}: No data`;
          }
        }
      },
      annotation: {
        annotations: {
          currentDay: {
            type: 'line' as const,
            xMin: currentCycleDay - 1,
            xMax: currentCycleDay - 1,
            borderColor: '#000000',
            borderWidth: 3,
            borderDash: [5, 5],
            label: {
              display: false
            }
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Cycle Day',
          font: {
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Temperature (°C)',
          font: {
            weight: 'bold'
          }
        },
        beginAtZero: false,
        min: 35.5,
        max: 38.0,
        ticks: {
          callback: (value) => `${value}°C`
        }
      }
    }
  };

  return (
    <div className="chart">
      <div className="bbt-chart-container">
        <Line data={chartData} options={options} />
      </div>
      <div className="chart-disclaimer">
        Historical average shown for past cycles. Current cycle updates as you log temperatures.
      </div>
    </div>
  );
}
