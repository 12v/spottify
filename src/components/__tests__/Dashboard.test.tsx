import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { vi } from 'vitest';
import { MockDataFactory } from '../../test/helpers/mockData';

// Mock all dependencies
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
    predictNextCycle: vi.fn(),
    getCurrentCycleDay: vi.fn(),
    getCurrentPeriodInfo: vi.fn()
  }
}));

vi.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: vi.fn()
}));

// Mock child components
vi.mock('../LoadingSpinner', () => ({
  __esModule: true,
  default: ({ message }: { message: string }) => <div data-testid="loading-spinner">{message}</div>
}));

vi.mock('../ErrorMessage', () => ({
  __esModule: true,
  default: ({ message, onRetry, onDismiss }: { message: string; onRetry: () => void; onDismiss: () => void }) => (
    <div data-testid="error-message">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  )
}));

vi.mock('../HormoneGraph', () => ({
  __esModule: true,
  default: ({ currentCycleDay, cycleLength }: { currentCycleDay: number; cycleLength: number }) => (
    <div data-testid="hormone-graph">
      Day {currentCycleDay} of {cycleLength}
    </div>
  )
}));

vi.mock('../BbtGraph', () => ({
  __esModule: true,
  default: ({ currentCycleDay }: { currentCycleDay: number }) => (
    <div data-testid="bbt-graph">
      BBT Graph - Day {currentCycleDay}
    </div>
  )
}));

// Mock date utilities
vi.mock('../../utils/dateUtils', () => ({
  formatLocalDate: vi.fn((date) => date.toISOString().split('T')[0]),
  formatDisplayDate: vi.fn((dateStr) => new Date(dateStr).toLocaleDateString())
}));

// Firebase mocking legitimately requires any types due to complex external interfaces
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as useAuthModule from '../../hooks/useAuth';
import * as dataServiceModule from '../../services/dataService';
import * as cycleServiceModule from '../../services/cycleService';
import * as errorHandlerModule from '../../hooks/useErrorHandler';

describe('Dashboard', () => {
  const mockCurrentUser = { uid: 'test-user-123', email: 'test@example.com' } as any;
  const mockUseAuth = vi.mocked(useAuthModule.useAuth);
  const mockDataService = {
    getMeasurements: vi.fn(),
    removeDuplicates: vi.fn()
  } as any;
  const mockCycleService = vi.mocked(cycleServiceModule.CycleService);
  const mockUseErrorHandler = vi.mocked(errorHandlerModule.useErrorHandler);

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    
    // Mock current date to be consistent across tests - Jan 15, 2024
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    
    // Reset DOM
    document.body.innerHTML = '';
    
    // Default mocks
    mockUseAuth.mockReturnValue({
      currentUser: mockCurrentUser,
      logout: vi.fn(),
      login: vi.fn(),
      signup: vi.fn(),
      loading: false
    });

    vi.mocked(dataServiceModule.DataService).getInstance.mockReturnValue(mockDataService);

    mockUseErrorHandler.mockReturnValue({
      error: { hasError: false, message: '', details: '' },
      handleError: vi.fn(),
      clearError: vi.fn(),
      retry: vi.fn()
    });

    // Mock successful data loading by default
    mockDataService.getMeasurements.mockResolvedValue([]);
    mockDataService.removeDuplicates.mockResolvedValue({ removed: 0, kept: 0 });
    mockCycleService.predictNextCycle.mockReturnValue(null as any);
    mockCycleService.getCurrentCycleDay.mockReturnValue(null as any);
    mockCycleService.getCurrentPeriodInfo.mockReturnValue({ isInPeriod: false, daysLeftInPeriod: null, isPeriodExpectedToday: false });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('Loading State', () => {
    it('shows loading spinner while data loads', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/Loading your cycle data/)).toBeInTheDocument();
    });

    it('shows logout button during loading', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });
  });

  describe('Data Loading Integration', () => {
    it('loads measurements and predictions on mount', async () => {
      const mockMeasurements = MockDataFactory.createMultipleCycles(new Date(), 3);
      const mockPrediction = {
        nextPeriod: '2024-02-01',
        ovulation: '2024-01-18',
        fertileWindow: { start: '2024-01-14', end: '2024-01-20' }
      };
      const mockCycle = { cycleDay: 15, cycleLength: 28 };
      const mockPeriodInfo = { isInPeriod: false, daysLeftInPeriod: null, isPeriodExpectedToday: false };

      mockDataService.getMeasurements.mockResolvedValue(mockMeasurements);
      mockCycleService.predictNextCycle.mockReturnValue(mockPrediction);
      mockCycleService.getCurrentCycleDay.mockReturnValue(mockCycle);
      mockCycleService.getCurrentPeriodInfo.mockReturnValue(mockPeriodInfo);

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(mockDataService.getMeasurements).toHaveBeenCalledWith(mockCurrentUser.uid);
        expect(mockCycleService.predictNextCycle).toHaveBeenCalledWith(mockMeasurements);
        expect(mockCycleService.getCurrentCycleDay).toHaveBeenCalledWith(mockMeasurements);
        expect(mockCycleService.getCurrentPeriodInfo).toHaveBeenCalledWith(mockMeasurements);
      });
    });

    it('runs background cleanup on first load', async () => {
      mockDataService.removeDuplicates.mockResolvedValue({ removed: 3, kept: 10 });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(mockDataService.removeDuplicates).toHaveBeenCalledWith(mockCurrentUser.uid);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Background cleanup removed 3 duplicate measurements');
      });

      consoleSpy.mockRestore();
    });

    it('handles cleanup failures gracefully', async () => {
      mockDataService.removeDuplicates.mockRejectedValue(new Error('Cleanup failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Background cleanup failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling Integration', () => {
    it('handles data loading errors', async () => {
      const mockError = new Error('Network error');
      const mockHandleError = vi.fn();
      const mockRetry = vi.fn();

      mockDataService.getMeasurements.mockRejectedValue(mockError);
      mockUseErrorHandler.mockReturnValue({
        error: { hasError: false, message: '', details: '' },
        handleError: mockHandleError,
        clearError: vi.fn(),
        retry: mockRetry
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          mockError,
          'Failed to load your cycle data. Please try again.',
          expect.any(Function)
        );
      });
    });

    it('displays error messages from error handler', async () => {
      mockDataService.getMeasurements.mockResolvedValue([]);
      mockUseErrorHandler.mockReturnValue({
        error: { hasError: true, message: 'Something went wrong', details: 'Network timeout' },
        handleError: vi.fn(),
        clearError: vi.fn(),
        retry: vi.fn()
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });
    });

    it('allows error retry functionality', async () => {
      const mockRetry = vi.fn();
      mockDataService.getMeasurements.mockResolvedValue([]);
      mockUseErrorHandler.mockReturnValue({
        error: { hasError: true, message: 'Error occurred', details: '' },
        handleError: vi.fn(),
        clearError: vi.fn(),
        retry: mockRetry
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
        expect(mockRetry).toHaveBeenCalled();
      });
    });
  });

  describe('Predictions Display Integration', () => {
    it('shows prediction cards when predictions available', async () => {
      const mockPrediction = {
        nextPeriod: '2024-02-01',
        ovulation: '2024-01-18',
        fertileWindow: { start: '2024-01-14', end: '2024-01-20' }
      };
      const mockCycle = { cycleDay: 15, cycleLength: 28 };

      mockCycleService.predictNextCycle.mockReturnValue(mockPrediction);
      mockCycleService.getCurrentCycleDay.mockReturnValue(mockCycle);

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('day of your cycle')).toBeInTheDocument();
      });
    });

    it('shows getting started message without predictions', async () => {
      mockCycleService.predictNextCycle.mockReturnValue(null as any);

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Getting Started')).toBeInTheDocument();
        expect(screen.getByText(/Record at least 2 complete cycles/)).toBeInTheDocument();
      });
    });

    it('displays current cycle day even without predictions', async () => {
      const mockCycle = { cycleDay: 7, cycleLength: 28 };
      mockCycleService.predictNextCycle.mockReturnValue(null as any);
      mockCycleService.getCurrentCycleDay.mockReturnValue(mockCycle);

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('7')).toBeInTheDocument();
        expect(screen.getByText('day of your cycle')).toBeInTheDocument();
      });
    });
  });

  describe('HormoneGraph Integration', () => {
    it('renders hormone graph with current cycle data', async () => {
      const mockCycle = { cycleDay: 12, cycleLength: 30 };
      mockCycleService.getCurrentCycleDay.mockReturnValue(mockCycle);

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('hormone-graph')).toBeInTheDocument();
        expect(screen.getByText('Day 12 of 30')).toBeInTheDocument();
      });
    });

    it('hides hormone graph when no cycle data', async () => {
      mockCycleService.getCurrentCycleDay.mockReturnValue(null as any);

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByTestId('hormone-graph')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation Integration', () => {
    beforeEach(async () => {
      // Set up completed loading state
      mockDataService.getMeasurements.mockResolvedValue([]);
      renderWithRouter(<Dashboard />);
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('provides navigation to calendar with today modal', () => {
      const logTodayLink = screen.getByRole('link', { name: /log today/i });
      expect(logTodayLink).toHaveAttribute('href', expect.stringContaining('/calendar?openModal=true'));
    });

    it('provides navigation to calendar', () => {
      const calendarLink = screen.getByRole('link', { name: /calendar/i });
      expect(calendarLink).toHaveAttribute('href', '/calendar');
    });

    it('provides navigation to analytics', () => {
      const analyticsLink = screen.getByRole('link', { name: /analytics/i });
      expect(analyticsLink).toHaveAttribute('href', '/statistics');
    });

    it('provides navigation to import', () => {
      const importLink = screen.getByRole('link', { name: /import/i });
      expect(importLink).toHaveAttribute('href', '/import');
    });
  });

  describe('Additional Functionality Coverage', () => {
    beforeEach(() => {
      mockUseErrorHandler.mockReturnValue({
        error: { hasError: false, message: '', details: '' },
        handleError: vi.fn(),
        clearError: vi.fn(),
        retry: vi.fn()
      });
    });

    it('export button is disabled with no measurements', async () => {
      mockDataService.getMeasurements.mockResolvedValue([]);
      
      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /export/i });
        expect(exportButton).toHaveClass('disabled');
      });
    });

    it('export button is enabled with measurements available', async () => {
      const mockMeasurements = MockDataFactory.createMultipleCycles(new Date(), 2);
      mockDataService.getMeasurements.mockResolvedValue(mockMeasurements);
      
      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /export/i });
        expect(exportButton).not.toHaveClass('disabled');
      });
    });

    it('requires authentication to load data', () => {
      mockUseAuth.mockReturnValue({
        currentUser: null,
        logout: vi.fn(),
        login: vi.fn(),
        signup: vi.fn(),
        loading: false
      });

      renderWithRouter(<Dashboard />);

      expect(mockDataService.getMeasurements).not.toHaveBeenCalled();
    });

    it('shows predictions when data is available', async () => {
      // Use dates in the past relative to mocked date (Jan 15, 2024) to test "late" behavior
      const upcomingPrediction = {
        nextPeriod: '2023-12-01', // 45 days late from mocked date
        ovulation: '2023-11-17', // 59 days ago from mocked date 
        fertileWindow: { 
          start: '2023-11-13', 
          end: '2023-11-19'
        }
      };
      
      // Mock some measurements so predictions show
      const mockMeasurements = MockDataFactory.createMultipleCycles(new Date(), 3);
      mockDataService.getMeasurements.mockResolvedValue(mockMeasurements);
      mockCycleService.predictNextCycle.mockReturnValue(upcomingPrediction);
      
      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        // Should show prediction cards instead of getting started
        expect(screen.queryByText('Getting Started')).not.toBeInTheDocument();
        // Should show prediction grid with countdown information for past dates
        expect(screen.getByText('days late')).toBeInTheDocument();
        expect(screen.getByText('days since ovulation')).toBeInTheDocument();
      });
    });

    it('displays ordinal suffixes for cycle days', async () => {
      mockCycleService.getCurrentCycleDay.mockReturnValue({
        cycleDay: 2,
        cycleLength: 28
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('nd')).toBeInTheDocument();
        expect(screen.getByText('day of your cycle')).toBeInTheDocument();
      });
    });
  });

  describe('Period State Countdown', () => {
    it('shows current period countdown when in period', async () => {
      const mockPeriodInfo = { isInPeriod: true, daysLeftInPeriod: 2, isPeriodExpectedToday: false };
      const mockPrediction = {
        nextPeriod: '2024-02-01', // 17 days in future from mocked date
        ovulation: '2024-01-18', // 3 days in future
        fertileWindow: { start: '2024-01-14', end: '2024-01-20' }
      };

      mockCycleService.getCurrentPeriodInfo.mockReturnValue(mockPeriodInfo);
      mockCycleService.predictNextCycle.mockReturnValue(mockPrediction);
      
      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('days left of your current period')).toBeInTheDocument();
      });
    });

    it('shows period may start today when expected but not recorded', async () => {
      const mockPeriodInfo = { isInPeriod: false, daysLeftInPeriod: null, isPeriodExpectedToday: true };
      const mockPrediction = {
        nextPeriod: '2024-01-15', // Expected today (mocked date)
        ovulation: '2024-01-01', // 14 days ago
        fertileWindow: { start: '2023-12-28', end: '2024-01-03' }
      };

      mockCycleService.getCurrentPeriodInfo.mockReturnValue(mockPeriodInfo);
      mockCycleService.predictNextCycle.mockReturnValue(mockPrediction);
      
      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getByText('period may start today')).toBeInTheDocument();
      });
    });

    it('shows next period countdown when not in period and not expected today', async () => {
      const mockPeriodInfo = { isInPeriod: false, daysLeftInPeriod: null, isPeriodExpectedToday: false };
      
      // Use dates in the future relative to mocked date (Jan 15, 2024) to test "until next period" behavior
      const mockPrediction = {
        nextPeriod: '2024-02-10', // 26 days in future from mocked date
        ovulation: '2024-01-27', // 12 days in future from mocked date
        fertileWindow: { 
          start: '2024-01-23', 
          end: '2024-01-29'
        }
      };

      mockCycleService.getCurrentPeriodInfo.mockReturnValue(mockPeriodInfo);
      mockCycleService.predictNextCycle.mockReturnValue(mockPrediction);
      
      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/days until your next period/)).toBeInTheDocument();
      });
    });
  });

});