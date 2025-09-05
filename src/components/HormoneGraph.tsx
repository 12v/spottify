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

interface HormoneGraphProps {
  currentCycleDay: number;
  cycleLength: number;
}

// Chart configuration constants
const Y_AXIS_PADDING_MULTIPLIER = 1.1;

export default function HormoneGraph({ currentCycleDay, cycleLength }: HormoneGraphProps) {
  // Generate hormone level data for a typical cycle
  const generateHormoneData = (days: number) => {
    const data = [];

    for (let day = 1; day <= days; day++) {
      const ovulationDay = Math.round(days / 2);

      // Oestrogen levels - rises before ovulation, drops after
      let oestrogen;
      if (day <= 5) {
        oestrogen = 25 + day * 1;
      } else if (day <= ovulationDay - 2) {
        oestrogen = 30 + (day - 5) * 8;
      } else if (day <= ovulationDay + 1) {
        oestrogen = 100 - (day - ovulationDay + 2) * 15;
      } else if (day <= days - 3) {
        oestrogen = Math.max(30, 70 - (day - ovulationDay - 1) * 3);
      } else {
        // Gradual return to menstruation levels
        const daysLeft = days - day + 1;
        oestrogen = 30 - (3 - daysLeft) * 2;
      }

      // Progesterone levels - low until ovulation, then rises
      let progesterone;
      const basalProgesterone = 2;
      if (day <= ovulationDay) {
        progesterone = basalProgesterone + Math.sin((day / ovulationDay) * Math.PI) * 1;
      } else {
        const lutealDay = day - ovulationDay;
        const lutealLength = days - ovulationDay;
        if (lutealDay <= lutealLength * 0.7) {
          progesterone = 5 + lutealDay * 4;
        } else if (day <= days - 2) {
          progesterone = Math.max(basalProgesterone + 2, 25 - (lutealDay - lutealLength * 0.7) * 8);
        } else {
          // Return to basal levels for menstruation
          const daysLeft = days - day + 1;
          progesterone = basalProgesterone + (daysLeft - 1) * 1;
        }
      }

      // FSH (Follicle Stimulating Hormone) - peaks before ovulation
      let fsh;
      const basalFsh = 6;
      if (day <= 3) {
        fsh = basalFsh + day * 2; // Higher during menstruation
      } else if (day <= ovulationDay - 3) {
        fsh = basalFsh + Math.sin((day - 3) / (ovulationDay - 6) * Math.PI) * 4;
      } else if (day <= ovulationDay) {
        fsh = 10 - (day - ovulationDay + 3) * 2; // Peak then drop
      } else if (day <= days - 2) {
        fsh = Math.max(3, 4 - (day - ovulationDay) * 0.3);
      } else {
        // Return to basal levels
        const daysLeft = days - day + 1;
        fsh = basalFsh - (2 - daysLeft) * 1;
      }

      // LH (Luteinizing Hormone) - sharp peak at ovulation
      let lh;
      const basalLh = 3;
      if (day <= ovulationDay - 2) {
        lh = basalLh + Math.sin((day / days) * Math.PI * 2) * 1;
      } else if (day === ovulationDay - 1 || day === ovulationDay) {
        lh = 25 + (day === ovulationDay ? 10 : 0); // Sharp peak
      } else if (day <= days - 2) {
        lh = Math.max(basalLh, 8 - (day - ovulationDay) * 0.8);
      } else {
        // Return to basal levels
        const daysLeft = days - day + 1;
        lh = basalLh + (daysLeft - 1) * 0.5;
      }

      data.push({
        day,
        oestrogen: Math.max(0, oestrogen),
        progesterone: Math.max(0, progesterone),
        fsh: Math.max(0, fsh),
        lh: Math.max(0, lh)
      });
    }

    return data;
  };

  const hormoneData = generateHormoneData(cycleLength);
  const days = hormoneData.map(d => d.day);

  const chartData = {
    labels: days,
    datasets: [
      {
        label: 'Oestrogen',
        data: hormoneData.map(d => d.oestrogen),
        borderColor: '#FF6B9D',
        backgroundColor: 'rgba(255, 107, 157, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      {
        label: 'Progesterone',
        data: hormoneData.map(d => d.progesterone),
        borderColor: '#4ECDC4',
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      {
        label: 'FSH',
        data: hormoneData.map(d => d.fsh),
        borderColor: '#9B59B6',
        backgroundColor: 'rgba(155, 89, 182, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      {
        label: 'LH',
        data: hormoneData.map(d => d.lh),
        borderColor: '#F39C12',
        backgroundColor: 'rgba(243, 156, 18, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      intersect: false,
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (context) => `Day ${context[0].label}`,
          label: (context) => `${context.dataset.label}: ${Math.round(context.parsed.y)}`
        }
      },
      annotation: {
        annotations: {
          currentDay: {
            type: 'line' as const,
            xMin: currentCycleDay - 1,
            xMax: currentCycleDay - 1,
            borderColor: '#DC2626',
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
        display: false,
        beginAtZero: true,
        max: Math.max(
          ...hormoneData.map(d => Math.max(d.oestrogen, d.progesterone, d.fsh, d.lh))
        ) * Y_AXIS_PADDING_MULTIPLIER
      }
    }
  };

  return (
    <div className="chart">
      <div className="hormone-chart-container">
        <Line data={chartData} options={options} />
      </div>
      <div className="chart-disclaimer">
        This shows typical hormone patterns during a menstrual cycle. Individual cycles may vary.
      </div>
    </div>
  );
}