import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Calendar from '../Calendar';
import { vi } from 'vitest';
import { MockDataFactory } from '../../test/helpers/mockData';

// Mock dependencies
vi.mock('../../hooks/useCycleData', () => ({
  useCycleData: vi.fn()
}));

vi.mock('../../hooks/useCyclePredictions', () => ({
  useCyclePredictions: vi.fn()
}));

vi.mock('../../utils/dateUtils', () => ({
  formatLocalDate: vi.fn((date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })
}));

vi.mock('../LoadingSpinner', () => ({
  __esModule: true,
  default: ({ message }: { message: string }) => <div data-testid="loading-spinner">{message}</div>
}));

vi.mock('../CalendarModal', () => ({
  __esModule: true,
  default: ({ show, date, existingData, onClose, onSave }: {
    show: boolean;
    date: string;
    existingData: unknown[];
    onClose: () => void;
    onSave: (data: unknown) => void;
  }) => 
    show ? (
      <div data-testid="calendar-modal">
        <div data-testid="modal-date">{date}</div>
        <div data-testid="existing-data-count">{existingData.length}</div>
        <button onClick={onClose} data-testid="modal-close">Close</button>
        <button onClick={() => onSave({ period: 'medium', bbt: '36.5', cramps: 'mild', soreBreasts: 'none' })} data-testid="modal-save">
          Save
        </button>
      </div>
    ) : null
}));

vi.mock('../CalendarDay', () => ({
  __esModule: true,
  default: ({ day, measurements, isPredPeriod, isPredOvulation, inFertileWindow, isToday, onClick }: {
    day: Date;
    measurements: unknown[];
    isPredPeriod: boolean;
    isPredOvulation: boolean;
    inFertileWindow: boolean;
    isToday: boolean;
    onClick: () => void;
  }) => (
    <div 
      data-testid="calendar-day"
      data-date={day.toISOString().split('T')[0]}
      data-measurements-count={measurements.length}
      data-pred-period={isPredPeriod}
      data-pred-ovulation={isPredOvulation}
      data-fertile-window={inFertileWindow}
      data-is-today={isToday}
      onClick={onClick}
      role="button"
      style={{ cursor: 'pointer', padding: '0.5rem', border: '1px solid #ccc' }}
    >
      {day.getDate()}
    </div>
  )
}));

import * as useCycleDataModule from '../../hooks/useCycleData';
import * as useCyclePredictionsModule from '../../hooks/useCyclePredictions';

describe('Calendar', () => {
  const mockUseCycleData = vi.mocked(useCycleDataModule.useCycleData);
  const mockUseCyclePredictions = vi.mocked(useCyclePredictionsModule.useCyclePredictions);

  const defaultCycleData = {
    measurements: [],
    groupedMeasurements: {},
    stats: null,
    loading: false,
    loadData: vi.fn(),
    saveMeasurement: vi.fn()
  };

  const defaultPredictions = {
    isPredictedPeriod: vi.fn(() => false),
    isPredictedOvulation: vi.fn(() => false),
    isInFertileWindow: vi.fn(() => false),
    isToday: vi.fn(() => false)
  };

  const renderWithRouter = (component: React.ReactElement, initialEntries: string[] = ['/calendar']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        {component}
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock current date to be consistent across tests
    vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
    
    mockUseCycleData.mockReturnValue(defaultCycleData);
    mockUseCyclePredictions.mockReturnValue(defaultPredictions);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe('Loading State', () => {
    it('shows loading spinner when data is loading', () => {
      mockUseCycleData.mockReturnValue({
        ...defaultCycleData,
        loading: true
      });

      renderWithRouter(<Calendar />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading calendar data...')).toBeInTheDocument();
    });

    it('shows page title and navigation during loading', () => {
      mockUseCycleData.mockReturnValue({
        ...defaultCycleData,
        loading: true
      });

      renderWithRouter(<Calendar />);

      expect(screen.getByText('📅 Calendar')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/');
    });
  });

  describe('Calendar Display', () => {
    it('displays current month and year by default', () => {
      renderWithRouter(<Calendar />);

      expect(screen.getByText('March 2024')).toBeInTheDocument();
    });

    it('displays day headers correctly', () => {
      renderWithRouter(<Calendar />);

      const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      dayHeaders.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it('renders calendar days for the current month', () => {
      renderWithRouter(<Calendar />);

      // March 2024 should have 31 days plus some from adjacent months
      const calendarDays = screen.getAllByTestId('calendar-day');
      expect(calendarDays.length).toBeGreaterThan(31);
      expect(calendarDays.length).toBeLessThanOrEqual(42); // Maximum 6 weeks
    });

    it('displays days from previous and next months to complete grid', () => {
      renderWithRouter(<Calendar />);

      const calendarDays = screen.getAllByTestId('calendar-day');
      
      // Should include some days from February (previous month)
      const febDays = calendarDays.filter(day => 
        day.getAttribute('data-date')?.startsWith('2024-02')
      );
      expect(febDays.length).toBeGreaterThan(0);

      // March 2024 starts on Friday and ends on Sunday, so we need April days to complete the grid
      const aprDays = calendarDays.filter(day => 
        day.getAttribute('data-date')?.startsWith('2024-04')
      );
      
      // March 2024 calendar grid includes March 1-31 plus some February and April days
      // Check that we have both March days and adjacent month days
      const marDays = calendarDays.filter(day => 
        day.getAttribute('data-date')?.startsWith('2024-03')
      );
      expect(marDays.length).toBe(31); // All March days
      expect(febDays.length + marDays.length + aprDays.length).toBe(calendarDays.length);
    });
  });

  describe('Month Navigation', () => {
    it('navigates to previous month when previous button clicked', () => {
      renderWithRouter(<Calendar />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(prevButton);

      expect(screen.getByText('February 2024')).toBeInTheDocument();
    });

    it('navigates to next month when next button clicked', () => {
      renderWithRouter(<Calendar />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(screen.getByText('April 2024')).toBeInTheDocument();
    });

    it('navigates back to current month when today button clicked', () => {
      renderWithRouter(<Calendar />);

      // Navigate to different month first
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      expect(screen.getByText('April 2024')).toBeInTheDocument();

      // Then click today button
      const todayButton = screen.getByRole('button', { name: /today/i });
      fireEvent.click(todayButton);

      expect(screen.getByText('March 2024')).toBeInTheDocument();
    });

    it('disables today button when already on current month', () => {
      renderWithRouter(<Calendar />);

      const todayButton = screen.getByRole('button', { name: /today/i });
      expect(todayButton).toBeDisabled();
    });

    it('enables today button when on different month', () => {
      renderWithRouter(<Calendar />);

      // Navigate to different month
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      const todayButton = screen.getByRole('button', { name: /today/i });
      expect(todayButton).not.toBeDisabled();
    });
  });

  describe('URL Parameters', () => {
    it('initializes to specified year and month from URL parameters', () => {
      renderWithRouter(<Calendar />, ['/calendar?year=2023&month=11']);

      expect(screen.getByText('December 2023')).toBeInTheDocument();
    });

    it('defaults to current month when no URL parameters provided', () => {
      renderWithRouter(<Calendar />, ['/calendar']);

      expect(screen.getByText('March 2024')).toBeInTheDocument();
    });

    it('handles invalid URL parameters by showing Invalid Date', () => {
      renderWithRouter(<Calendar />, ['/calendar?year=invalid&month=invalid']);

      // Invalid URL params create invalid Date, which displays as "Invalid Date"
      expect(screen.getByText('Invalid Date')).toBeInTheDocument();
    });
  });

  describe('Day Click and Modal Integration', () => {
    it('opens modal when calendar day is clicked', () => {
      renderWithRouter(<Calendar />);

      const calendarDays = screen.getAllByTestId('calendar-day');
      const dayToClick = calendarDays.find(day => day.textContent === '15');
      
      fireEvent.click(dayToClick!);

      expect(screen.getByTestId('calendar-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-date')).toHaveTextContent('2024-03-15');
    });

    it('closes modal when close button is clicked', () => {
      renderWithRouter(<Calendar />);

      // Open modal
      const calendarDays = screen.getAllByTestId('calendar-day');
      const dayToClick = calendarDays.find(day => day.textContent === '15');
      fireEvent.click(dayToClick!);

      // Close modal
      const closeButton = screen.getByTestId('modal-close');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('calendar-modal')).not.toBeInTheDocument();
    });

    it('saves measurements when modal save is clicked', async () => {
      const mockSaveMeasurement = vi.fn().mockResolvedValue(undefined);
      mockUseCycleData.mockReturnValue({
        ...defaultCycleData,
        saveMeasurement: mockSaveMeasurement
      });

      renderWithRouter(<Calendar />);

      // Open modal
      const calendarDays = screen.getAllByTestId('calendar-day');
      const dayToClick = calendarDays.find(day => day.textContent === '15');
      fireEvent.click(dayToClick!);

      // Save measurements
      const saveButton = screen.getByTestId('modal-save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveMeasurement).toHaveBeenCalledTimes(4);
        expect(mockSaveMeasurement).toHaveBeenCalledWith('2024-03-15', 'period', 'medium');
        expect(mockSaveMeasurement).toHaveBeenCalledWith('2024-03-15', 'bbt', '36.5');
        expect(mockSaveMeasurement).toHaveBeenCalledWith('2024-03-15', 'cramps', 'mild');
        expect(mockSaveMeasurement).toHaveBeenCalledWith('2024-03-15', 'sore_breasts', 'none');
      });
    });

    it('passes existing measurements to modal', () => {
      const mockMeasurements = MockDataFactory.createDayMeasurements('2024-03-15');
      mockUseCycleData.mockReturnValue({
        ...defaultCycleData,
        groupedMeasurements: {
          '2024-03-15': mockMeasurements
        }
      });

      renderWithRouter(<Calendar />);

      const calendarDays = screen.getAllByTestId('calendar-day');
      const dayToClick = calendarDays.find(day => day.textContent === '15');
      fireEvent.click(dayToClick!);

      expect(screen.getByTestId('existing-data-count')).toHaveTextContent(mockMeasurements.length.toString());
    });
  });

  describe('Auto-open Modal from URL', () => {
    it('automatically opens modal when openModal=true in URL', async () => {
      renderWithRouter(<Calendar />, ['/calendar?openModal=true&date=2024-03-20']);

      await waitFor(() => {
        expect(screen.getByTestId('calendar-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-date')).toHaveTextContent('2024-03-20');
      });
    });

    it('does not auto-open modal when already loading', () => {
      mockUseCycleData.mockReturnValue({
        ...defaultCycleData,
        loading: true
      });

      renderWithRouter(<Calendar />, ['/calendar?openModal=true&date=2024-03-20']);

      expect(screen.queryByTestId('calendar-modal')).not.toBeInTheDocument();
    });

    it('triggers auto-open modal behavior with URL parameters', async () => {
      renderWithRouter(<Calendar />, ['/calendar?openModal=true&date=2024-03-20']);

      await waitFor(() => {
        expect(screen.getByTestId('calendar-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-date')).toHaveTextContent('2024-03-20');
      });
    });
  });

  describe('Predictions Integration', () => {
    it('passes prediction data to calendar days', () => {
      const mockPredictions = {
        isPredictedPeriod: vi.fn((date: string) => date === '2024-03-20'),
        isPredictedOvulation: vi.fn((date: string) => date === '2024-03-15'),
        isInFertileWindow: vi.fn((date: string) => date === '2024-03-14'),
        isToday: vi.fn((date: string) => date === '2024-03-15')
      };
      
      mockUseCyclePredictions.mockReturnValue(mockPredictions);

      renderWithRouter(<Calendar />);

      const calendarDays = screen.getAllByTestId('calendar-day');
      
      // Check predicted period day
      const periodDay = calendarDays.find(day => day.getAttribute('data-date') === '2024-03-20');
      expect(periodDay).toHaveAttribute('data-pred-period', 'true');
      
      // Check ovulation day
      const ovulationDay = calendarDays.find(day => day.getAttribute('data-date') === '2024-03-15');
      expect(ovulationDay).toHaveAttribute('data-pred-ovulation', 'true');
      expect(ovulationDay).toHaveAttribute('data-is-today', 'true');
      
      // Check fertile window day
      const fertileDay = calendarDays.find(day => day.getAttribute('data-date') === '2024-03-14');
      expect(fertileDay).toHaveAttribute('data-fertile-window', 'true');
    });
  });

  describe('Measurements Display', () => {
    it('displays measurement count on calendar days', () => {
      const mockGroupedMeasurements = {
        '2024-03-15': MockDataFactory.createDayMeasurements('2024-03-15'),
        '2024-03-20': MockDataFactory.createDayMeasurements('2024-03-20', 2)
      };
      
      mockUseCycleData.mockReturnValue({
        ...defaultCycleData,
        groupedMeasurements: mockGroupedMeasurements
      });

      renderWithRouter(<Calendar />);

      const calendarDays = screen.getAllByTestId('calendar-day');
      
      // Check day with measurements
      const dayWithMeasurements = calendarDays.find(day => day.getAttribute('data-date') === '2024-03-15');
      expect(dayWithMeasurements).toHaveAttribute('data-measurements-count', mockGroupedMeasurements['2024-03-15'].length.toString());
      
      // Check day without measurements
      const dayWithoutMeasurements = calendarDays.find(day => day.getAttribute('data-date') === '2024-03-10');
      expect(dayWithoutMeasurements).toHaveAttribute('data-measurements-count', '0');
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no measurements exist', () => {
      mockUseCycleData.mockReturnValue({
        ...defaultCycleData,
        measurements: []
      });

      renderWithRouter(<Calendar />);

      expect(screen.getByText('No data recorded yet.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add first measurement/i })).toBeInTheDocument();
    });

    it('opens modal for today when add first measurement is clicked', () => {
      mockUseCycleData.mockReturnValue({
        ...defaultCycleData,
        measurements: []
      });

      renderWithRouter(<Calendar />);

      const addButton = screen.getByRole('button', { name: /add first measurement/i });
      fireEvent.click(addButton);

      expect(screen.getByTestId('calendar-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-date')).toHaveTextContent('2024-03-15'); // Today's date
    });

    it('hides empty state when measurements exist', () => {
      const mockMeasurements = MockDataFactory.createMultipleCycles(new Date(), 1);
      mockUseCycleData.mockReturnValue({
        ...defaultCycleData,
        measurements: mockMeasurements
      });

      renderWithRouter(<Calendar />);

      expect(screen.queryByText('No data recorded yet.')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add first measurement/i })).not.toBeInTheDocument();
    });
  });

  describe('Navigation Integration', () => {
    it('provides correct back navigation to dashboard', () => {
      renderWithRouter(<Calendar />);

      const backLink = screen.getByRole('link', { name: /dashboard/i });
      expect(backLink).toHaveAttribute('href', '/');
    });
  });

  describe('Calendar Grid Layout', () => {
    it('displays correct number of weeks (5-6 weeks)', () => {
      renderWithRouter(<Calendar />);

      const calendarDays = screen.getAllByTestId('calendar-day');
      const weekCount = Math.ceil(calendarDays.length / 7);
      
      expect(weekCount).toBeGreaterThanOrEqual(5);
      expect(weekCount).toBeLessThanOrEqual(6);
    });

    it('maintains Monday-first week format', () => {
      renderWithRouter(<Calendar />);

      // First day header should be Monday
      const dayHeaders = screen.getByText('Mon').parentElement?.children;
      expect(dayHeaders?.[0]).toHaveTextContent('Mon');
      expect(dayHeaders?.[1]).toHaveTextContent('Tue');
      expect(dayHeaders?.[6]).toHaveTextContent('Sun');
    });
  });

  describe('Hook Integration', () => {
    it('calls useCyclePredictions with correct parameters', () => {
      const mockMeasurements = MockDataFactory.createMultipleCycles(new Date(), 2);
      const mockStats = { averageCycleLength: 28, cycleVariation: 2, averagePeriodLength: 5 };
      
      mockUseCycleData.mockReturnValue({
        ...defaultCycleData,
        measurements: mockMeasurements,
        stats: mockStats
      });

      renderWithRouter(<Calendar />);

      expect(mockUseCyclePredictions).toHaveBeenCalledWith(mockMeasurements, mockStats);
    });

    it('handles null stats gracefully', () => {
      const mockMeasurements = MockDataFactory.createMultipleCycles(new Date(), 1);
      
      mockUseCycleData.mockReturnValue({
        ...defaultCycleData,
        measurements: mockMeasurements,
        stats: null
      });

      renderWithRouter(<Calendar />);

      expect(mockUseCyclePredictions).toHaveBeenCalledWith(mockMeasurements, null);
    });
  });

  describe('Edge Cases', () => {
    it('handles month transitions correctly', () => {
      // Start in January to test transitions
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
      
      renderWithRouter(<Calendar />);

      expect(screen.getByText('January 2024')).toBeInTheDocument();

      // Navigate to previous month (December 2023)
      const prevButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(prevButton);
      
      expect(screen.getByText('December 2023')).toBeInTheDocument();

      // Navigate to next month twice (February 2024)
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      
      expect(screen.getByText('February 2024')).toBeInTheDocument();
    });

    it('handles leap year February correctly', () => {
      vi.setSystemTime(new Date('2024-02-15T12:00:00Z')); // 2024 is a leap year
      
      renderWithRouter(<Calendar />);

      expect(screen.getByText('February 2024')).toBeInTheDocument();
      
      // Should include day 29 for leap year
      const calendarDays = screen.getAllByTestId('calendar-day');
      const day29 = calendarDays.find(day => 
        day.textContent === '29' && 
        day.getAttribute('data-date')?.startsWith('2024-02')
      );
      expect(day29).toBeInTheDocument();
    });

    it('handles short months correctly', () => {
      vi.setSystemTime(new Date('2024-02-15T12:00:00Z'));
      
      renderWithRouter(<Calendar />);

      const calendarDays = screen.getAllByTestId('calendar-day');
      
      // February should not have day 31
      const invalidDay = calendarDays.find(day => 
        day.textContent === '31' && 
        day.getAttribute('data-date')?.startsWith('2024-02')
      );
      expect(invalidDay).toBeUndefined();
    });
  });
});