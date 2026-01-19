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

  const allBbtData = CycleService.getBbtByRelativeCycleDay(measurements);
  const currentData = CycleService.getCurrentCycleBbt(measurements);

  if (allBbtData.length === 0 && currentData.length === 0) {
    return (
      <div className="chart">
        <div className="chart-disclaimer">
          No BBT data available for graphing.
        </div>
      </div>
    );
  }

  // Determine max cycle day from all data
  const maxCycleDay = Math.max(
    allBbtData.length > 0 ? Math.max(...allBbtData.map(d => d.cycleDay)) : 0,
    currentData.length > 0 ? Math.max(...currentData.map(d => d.cycleDay)) : 0
  );

  if (maxCycleDay === 0) {
    return (
      <div className="chart">
        <div className="chart-disclaimer">
          No BBT data available for graphing.
        </div>
      </div>
    );
  }

  const labels = Array.from({ length: maxCycleDay }, (_, i) => i + 1);

  // Determine which cycle numbers represent "current cycle" vs "past cycles"
  // Current cycle is any BBT data that's in currentData (which is based on last period start)
  const currentCycleDates = new Set(currentData.map(d => d.date));

  // Group past cycle data by cycle number (exclude any data that's in current cycle)
  const pastCycles = new Map<number, Array<{ cycleDay: number; temperature: number }>>();
  allBbtData.forEach(data => {
    // Only include in past cycles if this BBT measurement is NOT in the current cycle
    if (!currentCycleDates.has(data.date)) {
      if (!pastCycles.has(data.cycleNumber)) {
        pastCycles.set(data.cycleNumber, []);
      }
      pastCycles.get(data.cycleNumber)!.push({ cycleDay: data.cycleDay, temperature: data.temperature });
    }
  });

  // Color palette for past cycles (faint colors)
  const cycleColors = [
    'rgba(155, 89, 182, 0.3)',      // Purple
    'rgba(52, 152, 219, 0.3)',      // Blue
    'rgba(26, 188, 156, 0.3)',      // Teal
    'rgba(241, 196, 15, 0.3)',      // Yellow
    'rgba(230, 126, 34, 0.3)',      // Orange
    'rgba(231, 76, 60, 0.3)',       // Red
    'rgba(155, 89, 182, 0.2)',      // Light Purple
    'rgba(52, 152, 219, 0.2)',      // Light Blue
    'rgba(26, 188, 156, 0.2)',      // Light Teal
    'rgba(241, 196, 15, 0.2)',      // Light Yellow
  ];

  const datasets = [];

  // Add past cycles
  let colorIndex = 0;
  Array.from(pastCycles.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([cycleNum, data]) => {
      const cycleTemps = labels.map(day => {
        const dataPoint = data.find(d => d.cycleDay === day);
        return dataPoint?.temperature ?? null;
      });

      datasets.push({
        label: `Cycle ${cycleNum}`,
        data: cycleTemps,
        borderColor: cycleColors[colorIndex % cycleColors.length],
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 1.5,
        spanGaps: false,
      });
      colorIndex++;
    });

  // Add current cycle - make it stand out
  const currentTemps = labels.map(day => {
    const dataPoint = currentData.find(d => d.cycleDay === day);
    return dataPoint?.temperature ?? null;
  });

  datasets.push({
    label: 'Current Cycle',
    data: currentTemps,
    borderColor: '#FF6B9D',
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
    tension: 0.3,
    pointRadius: 3,
    pointHoverRadius: 5,
    borderWidth: 2.5,
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
          callback: (value) => Number(value).toFixed(1)
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
        Past cycles shown as faint lines. Current cycle (bright pink) updates as you log temperatures.
      </div>
    </div>
  );
}
