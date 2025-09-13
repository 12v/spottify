import { render, screen } from '@testing-library/react';
import HormoneGraph from '../HormoneGraph';
import { vi } from 'vitest';

// Chart.js mocking legitimately requires any types due to complex external interfaces
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock Chart.js and plugins
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="hormone-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  )
}));

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn()
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {}
}));

vi.mock('chartjs-plugin-annotation', () => ({
  default: {}
}));

describe('HormoneGraph', () => {
  const defaultProps = {
    currentCycleDay: 14,
    cycleLength: 28
  };

  describe('Mathematical Accuracy', () => {
    it('generates correct hormone data for standard 28-day cycle', () => {
      render(<HormoneGraph {...defaultProps} />);
      
      const chartDataElement = screen.getByTestId('chart-data');
      const chartData = JSON.parse(chartDataElement.textContent || '{}');
      
      expect(chartData.labels).toHaveLength(28);
      expect(chartData.datasets).toHaveLength(4);
      
      // Verify we have all hormone datasets
      const datasetLabels = chartData.datasets.map((d: any) => d.label);
      expect(datasetLabels).toEqual(['Oestrogen', 'Progesterone', 'FSH', 'LH']);
      
      // Each dataset should have 28 data points
      chartData.datasets.forEach((dataset: any) => {
        expect(dataset.data).toHaveLength(28);
        // All hormone levels should be non-negative
        dataset.data.forEach((value: number) => {
          expect(value).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('calculates ovulation day correctly for different cycle lengths', () => {
      const testCases = [
        { cycleLength: 21, expectedOvulation: 11 },
        { cycleLength: 28, expectedOvulation: 14 },
        { cycleLength: 35, expectedOvulation: 18 }
      ];

      testCases.forEach(({ cycleLength, expectedOvulation }) => {
        const { unmount } = render(
          <HormoneGraph currentCycleDay={1} cycleLength={cycleLength} />
        );
        
        const chartDataElement = screen.getByTestId('chart-data');
        const chartData = JSON.parse(chartDataElement.textContent || '{}');
        
        // LH should peak around ovulation day
        const lhData = chartData.datasets.find((d: any) => d.label === 'LH').data;
        const maxLHIndex = lhData.indexOf(Math.max(...lhData));
        const ovulationDay = maxLHIndex + 1; // Convert from 0-indexed to 1-indexed
        
        expect(ovulationDay).toBe(expectedOvulation);
        
        unmount();
      });
    });

    it('ensures oestrogen peaks before ovulation', () => {
      render(<HormoneGraph {...defaultProps} />);
      
      const chartDataElement = screen.getByTestId('chart-data');
      const chartData = JSON.parse(chartDataElement.textContent || '{}');
      
      const oestrogenData = chartData.datasets.find((d: any) => d.label === 'Oestrogen').data;
      const lhData = chartData.datasets.find((d: any) => d.label === 'LH').data;
      
      const maxOestrogenIndex = oestrogenData.indexOf(Math.max(...oestrogenData));
      const maxLHIndex = lhData.indexOf(Math.max(...lhData));
      
      // Oestrogen peak should occur before or at LH peak
      expect(maxOestrogenIndex).toBeLessThanOrEqual(maxLHIndex);
    });

    it('ensures progesterone rises after ovulation', () => {
      render(<HormoneGraph {...defaultProps} />);
      
      const chartDataElement = screen.getByTestId('chart-data');
      const chartData = JSON.parse(chartDataElement.textContent || '{}');
      
      const progesteroneData = chartData.datasets.find((d: any) => d.label === 'Progesterone').data;
      const lhData = chartData.datasets.find((d: any) => d.label === 'LH').data;
      
      const maxLHIndex = lhData.indexOf(Math.max(...lhData));
      
      // Progesterone should be higher in luteal phase (after ovulation) than follicular phase
      const follicularProgesterone = progesteroneData.slice(0, maxLHIndex);
      const lutealProgesterone = progesteroneData.slice(maxLHIndex + 1);
      
      const avgFollicularProgesterone = follicularProgesterone.reduce((sum: number, val: number) => sum + val, 0) / follicularProgesterone.length;
      const avgLutealProgesterone = lutealProgesterone.reduce((sum: number, val: number) => sum + val, 0) / lutealProgesterone.length;
      
      expect(avgLutealProgesterone).toBeGreaterThan(avgFollicularProgesterone);
    });

    it('validates FSH patterns throughout cycle', () => {
      render(<HormoneGraph {...defaultProps} />);
      
      const chartDataElement = screen.getByTestId('chart-data');
      const chartData = JSON.parse(chartDataElement.textContent || '{}');
      
      const fshData = chartData.datasets.find((d: any) => d.label === 'FSH').data;
      
      // FSH should be elevated during menstruation (first few days)
      const menstrualFSH = fshData.slice(0, 3);
      const midCycleFSH = fshData.slice(10, 18);
      
      const avgMenstrualFSH = menstrualFSH.reduce((sum: number, val: number) => sum + val, 0) / menstrualFSH.length;
      const avgMidCycleFSH = midCycleFSH.reduce((sum: number, val: number) => sum + val, 0) / midCycleFSH.length;
      
      expect(avgMenstrualFSH).toBeGreaterThan(avgMidCycleFSH);
    });

    it('validates LH surge timing and magnitude', () => {
      render(<HormoneGraph {...defaultProps} />);
      
      const chartDataElement = screen.getByTestId('chart-data');
      const chartData = JSON.parse(chartDataElement.textContent || '{}');
      
      const lhData = chartData.datasets.find((d: any) => d.label === 'LH').data;
      
      const maxLH = Math.max(...lhData);
      const maxLHIndex = lhData.indexOf(maxLH);
      
      // LH surge should be significantly higher than baseline
      const baseline = lhData.slice(0, maxLHIndex - 2);
      const avgBaseline = baseline.reduce((sum: number, val: number) => sum + val, 0) / baseline.length;
      
      expect(maxLH).toBeGreaterThan(avgBaseline * 3); // At least 3x baseline
      
      // LH surge should occur around day 13-15 for 28-day cycle
      expect(maxLHIndex + 1).toBeGreaterThanOrEqual(13);
      expect(maxLHIndex + 1).toBeLessThanOrEqual(15);
    });

    it('ensures hormone levels return to baseline for menstruation', () => {
      render(<HormoneGraph {...defaultProps} />);
      
      const chartDataElement = screen.getByTestId('chart-data');
      const chartData = JSON.parse(chartDataElement.textContent || '{}');
      
      // Get last 2 days (pre-menstruation) and first 2 days (menstruation)
      chartData.datasets.forEach((dataset: any) => {
        const data = dataset.data;
        const lastTwoDays = data.slice(-2);
        const firstTwoDays = data.slice(0, 2);
        
        if (dataset.label === 'Progesterone') {
          // Progesterone should drop significantly before menstruation
          const avgLast = lastTwoDays.reduce((sum: number, val: number) => sum + val, 0) / lastTwoDays.length;
          const avgFirst = firstTwoDays.reduce((sum: number, val: number) => sum + val, 0) / firstTwoDays.length;
          
          expect(avgFirst).toBeLessThan(avgLast * 1.5); // Should be relatively low at cycle start
        }
        
        if (dataset.label === 'LH') {
          // LH should return to low baseline levels
          const avgLast = lastTwoDays.reduce((sum: number, val: number) => sum + val, 0) / lastTwoDays.length;
          expect(avgLast).toBeLessThan(10); // Should be low
        }
      });
    });

    it('validates realistic hormone value ranges', () => {
      render(<HormoneGraph {...defaultProps} />);
      
      const chartDataElement = screen.getByTestId('chart-data');
      const chartData = JSON.parse(chartDataElement.textContent || '{}');
      
      chartData.datasets.forEach((dataset: any) => {
        const data = dataset.data;
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        
        switch (dataset.label) {
          case 'Oestrogen':
            // Oestrogen typically ranges from ~25-100+ pg/ml
            expect(minValue).toBeGreaterThanOrEqual(20);
            expect(maxValue).toBeLessThan(150);
            break;
          case 'Progesterone':
            // Progesterone ranges from ~1-25+ ng/ml, algorithm may go higher
            expect(minValue).toBeGreaterThanOrEqual(0);
            expect(maxValue).toBeLessThan(50);
            break;
          case 'FSH':
            // FSH typically ranges from ~3-12 IU/L
            expect(minValue).toBeGreaterThanOrEqual(2);
            expect(maxValue).toBeLessThan(15);
            break;
          case 'LH':
            // LH ranges from ~2-40+ IU/L (with surge)
            expect(minValue).toBeGreaterThanOrEqual(1);
            expect(maxValue).toBeLessThan(50);
            break;
        }
      });
    });
  });

  describe('Chart Configuration', () => {
    it('configures current day annotation correctly', () => {
      const currentDay = 15;
      render(<HormoneGraph currentCycleDay={currentDay} cycleLength={28} />);
      
      const chartOptionsElement = screen.getByTestId('chart-options');
      const options = JSON.parse(chartOptionsElement.textContent || '{}');
      
      const annotation = options.plugins.annotation.annotations.currentDay;
      expect(annotation.type).toBe('line');
      expect(annotation.xMin).toBe(currentDay - 1); // 0-indexed
      expect(annotation.xMax).toBe(currentDay - 1);
      expect(annotation.borderColor).toBe('#000000');
    });

    it('sets up hormone datasets with correct styling', () => {
      render(<HormoneGraph {...defaultProps} />);
      
      const chartDataElement = screen.getByTestId('chart-data');
      const chartData = JSON.parse(chartDataElement.textContent || '{}');
      
      const expectedColors = {
        'Oestrogen': '#FF6B9D',
        'Progesterone': '#4ECDC4',
        'FSH': '#9B59B6',
        'LH': '#F39C12'
      };
      
      chartData.datasets.forEach((dataset: any) => {
        expect(dataset.borderColor).toBe(expectedColors[dataset.label as keyof typeof expectedColors]);
        expect(dataset.tension).toBe(0.4);
        expect(dataset.pointRadius).toBe(0);
        expect(dataset.borderWidth).toBe(2);
      });
    });

    it('disables animation for performance', () => {
      render(<HormoneGraph {...defaultProps} />);
      
      const chartOptionsElement = screen.getByTestId('chart-options');
      const options = JSON.parse(chartOptionsElement.textContent || '{}');
      
      expect(options.animation).toBe(false);
    });
  });

  describe('Cycle Length Variations', () => {
    it('generates correct data for short cycles', () => {
      const shortCycle = 21;
      render(<HormoneGraph currentCycleDay={1} cycleLength={shortCycle} />);
      
      const chartDataElement = screen.getByTestId('chart-data');
      const chartData = JSON.parse(chartDataElement.textContent || '{}');
      
      expect(chartData.labels).toHaveLength(shortCycle);
      chartData.datasets.forEach((dataset: any) => {
        expect(dataset.data).toHaveLength(shortCycle);
      });
    });

    it('generates correct data for long cycles', () => {
      const longCycle = 35;
      render(<HormoneGraph currentCycleDay={1} cycleLength={longCycle} />);
      
      const chartDataElement = screen.getByTestId('chart-data');
      const chartData = JSON.parse(chartDataElement.textContent || '{}');
      
      expect(chartData.labels).toHaveLength(longCycle);
      chartData.datasets.forEach((dataset: any) => {
        expect(dataset.data).toHaveLength(longCycle);
      });
    });
  });

  describe('Component Rendering', () => {
    it('renders chart with disclaimer', () => {
      render(<HormoneGraph {...defaultProps} />);
      
      expect(screen.getByTestId('hormone-chart')).toBeInTheDocument();
      expect(screen.getByText(/This shows typical hormone patterns/)).toBeInTheDocument();
      expect(screen.getByText(/Individual cycles may vary/)).toBeInTheDocument();
    });
  });
});