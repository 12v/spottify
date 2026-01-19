import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Statistics from '../Statistics';
import { vi } from 'vitest';
import { MockDataFactory } from '../../test/helpers/mockData';

// Mock Chart.js to avoid canvas issues
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: { data: unknown; options: unknown }) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
  Bar: ({ data, options }: { data: unknown; options: unknown }) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  )
}));

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

// Mock dependencies
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../services/dataService', () => ({
  DataService: {
    getInstance: vi.fn()
  }
}));

vi.mock('../../services/cycleService', () => ({
  CycleService: {
    calculateCycleStats: vi.fn(),
    getCycleData: vi.fn(),
    checkIncompleteData: vi.fn()
  }
}));

vi.mock('../LoadingSpinner', () => ({
  __esModule: true,
  default: ({ message }: { message: string }) => <div data-testid="loading-spinner">{message}</div>
}));

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as useAuthModule from '../../hooks/useAuth';
import * as dataServiceModule from '../../services/dataService';
import * as cycleServiceModule from '../../services/cycleService';

describe('Statistics', () => {
  const mockCurrentUser = { uid: 'test-user-123', email: 'test@example.com' } as any;
  const mockUseAuth = vi.mocked(useAuthModule.useAuth);
  const mockDataService = {
    getMeasurements: vi.fn()
  } as any;
  const mockCycleService = vi.mocked(cycleServiceModule.CycleService);

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockUseAuth.mockReturnValue({
      currentUser: mockCurrentUser,
      logout: vi.fn(),
      login: vi.fn(),
      signup: vi.fn(),
      loading: false
    });

    vi.mocked(dataServiceModule.DataService).getInstance.mockReturnValue(mockDataService);
    mockDataService.getMeasurements.mockResolvedValue([]);
    mockCycleService.calculateCycleStats.mockReturnValue({
      averageCycleLength: 28,
      cycleVariation: 2,
      averagePeriodLength: 5
    });
    mockCycleService.getCycleData.mockReturnValue([]);
    mockCycleService.checkIncompleteData.mockReturnValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Loading State', () => {
    it('shows loading spinner while data loads', () => {
      renderWithRouter(<Statistics />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Calculating statistics...')).toBeInTheDocument();
    });

    it('shows navigation link during loading', () => {
      renderWithRouter(<Statistics />);
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/');
    });
  });

  describe('Data Loading', () => {
    it('loads measurements and calculates statistics on mount', async () => {
      const mockMeasurements = MockDataFactory.createMultipleCycles(new Date(), 3);
      const mockStats = {
        averageCycleLength: 29,
        cycleVariation: 3,
        averagePeriodLength: 6
      };
      
      mockDataService.getMeasurements.mockResolvedValue(mockMeasurements);
      mockCycleService.calculateCycleStats.mockReturnValue(mockStats);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(mockDataService.getMeasurements).toHaveBeenCalledWith(mockCurrentUser.uid);
        expect(mockCycleService.calculateCycleStats).toHaveBeenCalledWith(mockMeasurements);
        expect(mockCycleService.getCycleData).toHaveBeenCalledWith(mockMeasurements);
        expect(mockCycleService.checkIncompleteData).toHaveBeenCalledWith(mockMeasurements);
      });
    });

    it('handles data loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDataService.getMeasurements.mockRejectedValue(new Error('Network error'));

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading data:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('does not load data when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        currentUser: null,
        logout: vi.fn(),
        login: vi.fn(),
        signup: vi.fn(),
        loading: false
      });

      renderWithRouter(<Statistics />);

      expect(mockDataService.getMeasurements).not.toHaveBeenCalled();
    });
  });

  describe('Insufficient Data State', () => {
    it('shows insufficient data message when no cycle data available', async () => {
      mockCycleService.getCycleData.mockReturnValue([]);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText(/Not enough data for analytics/)).toBeInTheDocument();
        expect(screen.getByText(/Record at least 2 complete cycles/)).toBeInTheDocument();
      });
    });

    it('does not show charts when insufficient data', async () => {
      mockCycleService.getCycleData.mockReturnValue([]);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
        expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Alerts', () => {
    it('shows data alert warnings when incomplete data detected', async () => {
      const mockAlerts = [
        'Missing period data for recent cycle',
        'Irregular cycle detected in March'
      ];
      mockCycleService.checkIncompleteData.mockReturnValue(mockAlerts);
      mockCycleService.getCycleData.mockReturnValue([
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' }
      ]);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText(/Incomplete Period Data/)).toBeInTheDocument();
        expect(screen.getByText('Missing period data for recent cycle')).toBeInTheDocument();
        expect(screen.getByText('Irregular cycle detected in March')).toBeInTheDocument();
      });
    });

    it('does not show alerts when no incomplete data', async () => {
      mockCycleService.checkIncompleteData.mockReturnValue([]);
      mockCycleService.getCycleData.mockReturnValue([
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' }
      ]);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(screen.queryByText(/Incomplete Period Data/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Summary Statistics', () => {
    it('displays statistical summary when data available', async () => {
      const mockStats = {
        averageCycleLength: 29.5,
        cycleVariation: 2.3,
        averagePeriodLength: 5.8
      };
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' },
        { cycleNumber: 2, cycleLength: 30, periodLength: 6, startDate: '2024-01-29' },
        { cycleNumber: 3, cycleLength: 29, periodLength: 6, startDate: '2024-02-28' }
      ];

      mockCycleService.calculateCycleStats.mockReturnValue(mockStats);
      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText('Summary Statistics')).toBeInTheDocument();
        expect(screen.getByText(/Average Cycle Length:/)).toBeInTheDocument();
        expect(screen.getByText(/30 days/)).toBeInTheDocument();
        expect(screen.getByText(/Cycle Variation:/)).toBeInTheDocument();
        expect(screen.getByText(/±2 days/)).toBeInTheDocument();
        expect(screen.getByText(/Average Period Length:/)).toBeInTheDocument();
        expect(screen.getByText(/6 days/)).toBeInTheDocument();
        expect(screen.getByText(/Total Cycles Analysed:/)).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('displays correct date range in summary', async () => {
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' },
        { cycleNumber: 2, cycleLength: 30, periodLength: 6, startDate: '2024-02-01' }
      ];

      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText(/Data Range:/)).toBeInTheDocument();
        // Tests run with en-GB locale, so expect UK date format (dd/mm/yyyy)
        expect(screen.getByText(/01\/01\/2024 - 01\/02\/2024/)).toBeInTheDocument();
      });
    });
  });

  describe('Chart Data Processing', () => {
    it('prepares cycle length line chart data correctly', async () => {
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' },
        { cycleNumber: 2, cycleLength: 30, periodLength: 6, startDate: '2024-01-29' },
        { cycleNumber: 3, cycleLength: 29, periodLength: 4, startDate: '2024-02-28' }
      ];

      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        const lineCharts = screen.getAllByTestId('line-chart');
        const cycleLengthChart = lineCharts[0];
        const chartData = JSON.parse(cycleLengthChart.querySelector('[data-testid="chart-data"]')?.textContent || '{}');
        
        expect(chartData.labels).toEqual(['Cycle 1', 'Cycle 2', 'Cycle 3']);
        expect(chartData.datasets[0].label).toBe('Cycle Length (days)');
        expect(chartData.datasets[0].data).toEqual([28, 30, 29]);
        expect(chartData.datasets[0].borderColor).toBe('#8B0000');
      });
    });

    it('prepares period length line chart data correctly', async () => {
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' },
        { cycleNumber: 2, cycleLength: 30, periodLength: 6, startDate: '2024-01-29' }
      ];

      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        const lineCharts = screen.getAllByTestId('line-chart');
        const periodLengthChart = lineCharts[1];
        const chartData = JSON.parse(periodLengthChart.querySelector('[data-testid="chart-data"]')?.textContent || '{}');
        
        expect(chartData.labels).toEqual(['Cycle 1', 'Cycle 2']);
        expect(chartData.datasets[0].label).toBe('Period Length (days)');
        expect(chartData.datasets[0].data).toEqual([5, 6]);
        expect(chartData.datasets[0].borderColor).toBe('#A52A2A');
      });
    });

    it('prepares cycle length histogram data correctly', async () => {
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' },
        { cycleNumber: 2, cycleLength: 28, periodLength: 6, startDate: '2024-01-29' },
        { cycleNumber: 3, cycleLength: 30, periodLength: 4, startDate: '2024-02-28' },
        { cycleNumber: 4, cycleLength: 28, periodLength: 5, startDate: '2024-03-29' }
      ];

      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        const barCharts = screen.getAllByTestId('bar-chart');
        const cycleLengthHistogram = barCharts[0];
        const chartData = JSON.parse(cycleLengthHistogram.querySelector('[data-testid="chart-data"]')?.textContent || '{}');

        expect(chartData.labels).toEqual(['28', '29', '30']);
        expect(chartData.datasets[0].label).toBe('Number of Cycles');
        expect(chartData.datasets[0].data).toEqual([3, 0, 1]); // 3 cycles of length 28, 0 of 29, 1 cycle of length 30
      });
    });

    it('prepares period length histogram data correctly', async () => {
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' },
        { cycleNumber: 2, cycleLength: 30, periodLength: 5, startDate: '2024-01-29' },
        { cycleNumber: 3, cycleLength: 29, periodLength: 6, startDate: '2024-02-28' }
      ];

      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        const barCharts = screen.getAllByTestId('bar-chart');
        const periodLengthHistogram = barCharts[1];
        const chartData = JSON.parse(periodLengthHistogram.querySelector('[data-testid="chart-data"]')?.textContent || '{}');

        expect(chartData.labels).toEqual(['5', '6']);
        expect(chartData.datasets[0].label).toBe('Number of Periods');
        expect(chartData.datasets[0].data).toEqual([2, 1]); // 2 periods of length 5, 1 period of length 6
      });
    });
  });

  describe('Chart Configuration', () => {
    it('configures charts with responsive options', async () => {
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' }
      ];
      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        const charts = screen.getAllByTestId('line-chart');
        const chartOptions = JSON.parse(charts[0].querySelector('[data-testid="chart-options"]')?.textContent || '{}');
        
        expect(chartOptions.responsive).toBe(true);
        expect(chartOptions.animation).toBe(false);
        expect(chartOptions.plugins.legend.position).toBe('top');
        expect(chartOptions.scales.y.beginAtZero).toBe(true);
        expect(chartOptions.scales.y.ticks.stepSize).toBe(1);
      });
    });

    it('applies same configuration to bar charts', async () => {
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' }
      ];
      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        const barCharts = screen.getAllByTestId('bar-chart');
        const chartOptions = JSON.parse(barCharts[0].querySelector('[data-testid="chart-options"]')?.textContent || '{}');
        
        expect(chartOptions.responsive).toBe(true);
        expect(chartOptions.scales.y.beginAtZero).toBe(true);
      });
    });
  });

  describe('Chart Rendering', () => {
    it('renders all four chart types when data is available', async () => {
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' },
        { cycleNumber: 2, cycleLength: 30, periodLength: 6, startDate: '2024-01-29' }
      ];
      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText('Cycle Length Over Time')).toBeInTheDocument();
        expect(screen.getByText('Cycle Length Distribution')).toBeInTheDocument();
        expect(screen.getByText('Period Length Over Time')).toBeInTheDocument();
        expect(screen.getByText('Period Length Distribution')).toBeInTheDocument();
        
        expect(screen.getAllByTestId('line-chart')).toHaveLength(2);
        expect(screen.getAllByTestId('bar-chart')).toHaveLength(2);
      });
    });

    it('handles empty cycle data gracefully', async () => {
      mockCycleService.getCycleData.mockReturnValue([]);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
        expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('provides correct back navigation to dashboard', async () => {
      renderWithRouter(<Statistics />);

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /dashboard/i });
        expect(backLink).toHaveAttribute('href', '/');
      });
    });

    it('displays correct page title', async () => {
      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText('Statistics & Analytics')).toBeInTheDocument();
      });
    });
  });

  describe('Statistical Accuracy', () => {
    it('correctly rounds statistical values for display with sufficient data', async () => {
      const mockStats = {
        averageCycleLength: 28.7,
        cycleVariation: 2.4,
        averagePeriodLength: 5.3
      };
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' },
        { cycleNumber: 2, cycleLength: 29, periodLength: 6, startDate: '2024-01-29' }
      ];

      mockCycleService.calculateCycleStats.mockReturnValue(mockStats);
      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText(/Average Cycle Length:/)).toBeInTheDocument();
        expect(screen.getByText(/29 days/)).toBeInTheDocument();
        expect(screen.getByText(/Cycle Variation:/)).toBeInTheDocument();
        expect(screen.getByText(/±2 days/)).toBeInTheDocument();
        expect(screen.getByText(/Average Period Length:/)).toBeInTheDocument();
        expect(screen.getByText(/5 days/)).toBeInTheDocument();
      });
    });

    it('sorts histogram labels numerically, not lexicographically', async () => {
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 8, periodLength: 3, startDate: '2024-01-01' },
        { cycleNumber: 2, cycleLength: 30, periodLength: 4, startDate: '2024-01-29' },
        { cycleNumber: 3, cycleLength: 25, periodLength: 10, startDate: '2024-02-28' }
      ];

      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        const barCharts = screen.getAllByTestId('bar-chart');
        const cycleLengthHistogram = barCharts[0];
        const chartData = JSON.parse(cycleLengthHistogram.querySelector('[data-testid="chart-data"]')?.textContent || '{}');

        // Should be sorted numerically with contiguous range: 8-30
        expect(chartData.labels).toEqual(['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30']);
      });
    });
  });

  describe('Edge Cases', () => {
    it('does not show summary stats for single cycle data', async () => {
      const mockStats = {
        averageCycleLength: 28,
        cycleVariation: 0,
        averagePeriodLength: 5
      };
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' }
      ];

      mockCycleService.calculateCycleStats.mockReturnValue(mockStats);
      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        // Summary statistics should NOT be shown with only 1 cycle
        expect(screen.queryByText(/Total Cycles Analysed:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Cycle Variation:/)).not.toBeInTheDocument();
        // But charts should still be visible
        expect(screen.getByText('Cycle Length Over Time')).toBeInTheDocument();
      });
    });

    it('handles cycles with identical lengths', async () => {
      const mockCycleData = [
        { cycleNumber: 1, cycleLength: 28, periodLength: 5, startDate: '2024-01-01' },
        { cycleNumber: 2, cycleLength: 28, periodLength: 5, startDate: '2024-01-29' },
        { cycleNumber: 3, cycleLength: 28, periodLength: 5, startDate: '2024-02-26' }
      ];

      mockCycleService.getCycleData.mockReturnValue(mockCycleData);

      renderWithRouter(<Statistics />);

      await waitFor(() => {
        const barCharts = screen.getAllByTestId('bar-chart');
        const cycleLengthHistogram = barCharts[0];
        const chartData = JSON.parse(cycleLengthHistogram.querySelector('[data-testid="chart-data"]')?.textContent || '{}');
        
        expect(chartData.labels).toEqual(['28']);
        expect(chartData.datasets[0].data).toEqual([3]);
      });
    });
  });
});