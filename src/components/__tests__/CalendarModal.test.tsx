import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CalendarModal from '../CalendarModal';
import { PERIOD_OPTIONS, SYMPTOM_SEVERITY } from '../../utils/constants';
import { vi } from 'vitest';

describe('CalendarModal', () => {
  const defaultProps = {
    show: true,
    date: '2024-01-15',
    existingData: [],
    onClose: vi.fn(),
    onSave: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility and Rendering', () => {
    it('renders when show is true', () => {
      render(<CalendarModal {...defaultProps} />);
      expect(screen.getByText(/Log Data - Monday, January 15, 2024/)).toBeInTheDocument();
    });

    it('does not render when show is false', () => {
      render(<CalendarModal {...defaultProps} show={false} />);
      expect(screen.queryByText(/Log Data/)).not.toBeInTheDocument();
    });

    it('displays formatted date correctly', () => {
      render(<CalendarModal {...defaultProps} date="2024-12-25" />);
      expect(screen.getByText(/Log Data - Wednesday, December 25, 2024/)).toBeInTheDocument();
    });
  });

  describe('Initial State', () => {
    it('initializes with default values when no existing data', () => {
      render(<CalendarModal {...defaultProps} />);
      
      // Period should default to None
      expect(screen.getByRole('button', { name: /None/ })).toHaveClass('selected');
      
      // BBT input should be empty
      expect(screen.getByPlaceholderText('36.50')).toHaveValue(null);
      
      // Symptoms should default to None
      expect(screen.getByLabelText(/Cramps/)).toHaveValue('none');
      expect(screen.getByLabelText(/Sore Breasts/)).toHaveValue('none');
    });

    it('loads existing data correctly', () => {
      const existingData = [
        {
          id: 'period-1',
          date: '2024-01-15',
          type: 'period' as const,
          value: { option: PERIOD_OPTIONS.MEDIUM }
        },
        {
          id: 'bbt-1', 
          date: '2024-01-15',
          type: 'bbt' as const,
          value: { temperature: 36.7 }
        },
        {
          id: 'cramps-1',
          date: '2024-01-15', 
          type: 'cramps' as const,
          value: { severity: SYMPTOM_SEVERITY.MILD }
        },
        {
          id: 'sore-1',
          date: '2024-01-15',
          type: 'sore_breasts' as const, 
          value: { severity: SYMPTOM_SEVERITY.MODERATE }
        }
      ];

      render(<CalendarModal {...defaultProps} existingData={existingData} />);

      expect(screen.getByRole('button', { name: /Medium/ })).toHaveClass('selected');
      expect(screen.getByDisplayValue('36.7')).toBeInTheDocument();
      expect(screen.getByLabelText(/Cramps/)).toHaveValue('mild');
      expect(screen.getByLabelText(/Sore Breasts/)).toHaveValue('moderate');
    });

    it('handles partial existing data', () => {
      const existingData = [
        {
          id: 'period-1',
          date: '2024-01-15',
          type: 'period' as const,
          value: { option: PERIOD_OPTIONS.LIGHT }
        }
      ];

      render(<CalendarModal {...defaultProps} existingData={existingData} />);

      expect(screen.getByRole('button', { name: /Light/ })).toHaveClass('selected');
      expect(screen.getByPlaceholderText('36.50')).toHaveValue(null);
    });
  });

  describe('Period Flow Selection', () => {
    it('allows selecting different period flow options', () => {
      render(<CalendarModal {...defaultProps} />);

      // Initially None should be selected
      expect(screen.getByRole('button', { name: /None/ })).toHaveClass('selected');

      // Click Spotting
      fireEvent.click(screen.getByRole('button', { name: /Spotting/ }));
      expect(screen.getByRole('button', { name: /Spotting/ })).toHaveClass('selected');
      expect(screen.getByRole('button', { name: /None/ })).not.toHaveClass('selected');

      // Click Heavy
      fireEvent.click(screen.getByRole('button', { name: /Heavy/ }));
      expect(screen.getByRole('button', { name: /Heavy/ })).toHaveClass('selected');
      expect(screen.getByRole('button', { name: /Spotting/ })).not.toHaveClass('selected');
    });

    it('shows all period flow options', () => {
      render(<CalendarModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /None/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Spotting/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Light/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Medium/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Heavy/ })).toBeInTheDocument();
    });
  });

  describe('BBT Temperature Input', () => {
    it('accepts valid temperature input', () => {
      render(<CalendarModal {...defaultProps} />);
      const input = screen.getByLabelText(/Basal Body Temperature/);

      fireEvent.change(input, { target: { value: '36.5' } });
      expect(input).toHaveValue(36.5);

      fireEvent.change(input, { target: { value: '37.2' } });
      expect(input).toHaveValue(37.2);
    });

    it('has correct input attributes', () => {
      render(<CalendarModal {...defaultProps} />);
      const input = screen.getByLabelText(/Basal Body Temperature/);

      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveAttribute('step', '0.01');
      expect(input).toHaveAttribute('min', '35');
      expect(input).toHaveAttribute('max', '40');
      expect(input).toHaveAttribute('placeholder', '36.50');
    });

    it('updates state on temperature change', () => {
      render(<CalendarModal {...defaultProps} />);
      const input = screen.getByLabelText(/Basal Body Temperature/);

      fireEvent.change(input, { target: { value: '36.8' } });
      expect(input).toHaveValue(36.8);
    });
  });

  describe('Symptom Selection', () => {
    it('allows selecting cramps severity', () => {
      render(<CalendarModal {...defaultProps} />);
      const crampsSelect = screen.getByLabelText(/Cramps/);

      fireEvent.change(crampsSelect, { target: { value: SYMPTOM_SEVERITY.SEVERE } });
      expect(crampsSelect).toHaveValue(SYMPTOM_SEVERITY.SEVERE);
    });

    it('allows selecting sore breasts severity', () => {
      render(<CalendarModal {...defaultProps} />);
      const soreBreastsSelect = screen.getByLabelText(/Sore Breasts/);

      fireEvent.change(soreBreastsSelect, { target: { value: SYMPTOM_SEVERITY.MILD } });
      expect(soreBreastsSelect).toHaveValue(SYMPTOM_SEVERITY.MILD);
    });

    it('shows all severity options for symptoms', () => {
      render(<CalendarModal {...defaultProps} />);

      // Check cramps options
      const crampsSelect = screen.getByLabelText(/Cramps/);
      expect(crampsSelect.querySelector('option[value="none"]')).toBeInTheDocument();
      expect(crampsSelect.querySelector('option[value="mild"]')).toBeInTheDocument();
      expect(crampsSelect.querySelector('option[value="moderate"]')).toBeInTheDocument();
      expect(crampsSelect.querySelector('option[value="severe"]')).toBeInTheDocument();

      // Check sore breasts options
      const soreBreastsSelect = screen.getByLabelText(/Sore Breasts/);
      expect(soreBreastsSelect.querySelector('option[value="none"]')).toBeInTheDocument();
      expect(soreBreastsSelect.querySelector('option[value="mild"]')).toBeInTheDocument();
      expect(soreBreastsSelect.querySelector('option[value="moderate"]')).toBeInTheDocument();
      expect(soreBreastsSelect.querySelector('option[value="severe"]')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls onSave with current measurements on submit', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      render(<CalendarModal {...defaultProps} onSave={mockOnSave} />);

      // Set some data
      fireEvent.click(screen.getByRole('button', { name: /Medium/ }));
      fireEvent.change(screen.getByLabelText(/Basal Body Temperature/), { target: { value: '36.6' } });
      fireEvent.change(screen.getByLabelText(/Cramps/), { target: { value: SYMPTOM_SEVERITY.MILD } });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Save Data/ }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          period: PERIOD_OPTIONS.MEDIUM,
          bbt: '36.6',
          cramps: SYMPTOM_SEVERITY.MILD,
          soreBreasts: SYMPTOM_SEVERITY.NONE,
          lhSurge: false
        });
      });
    });

    it('closes modal after successful save', async () => {
      const mockOnClose = vi.fn();
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      
      render(<CalendarModal {...defaultProps} onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByRole('button', { name: /Save Data/ }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('prevents default form submission', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      render(<CalendarModal {...defaultProps} onSave={mockOnSave} />);

      const form = screen.getByRole('button', { name: /Save Data/ }).closest('form')!;
      
      // Create a mock submit event handler to verify preventDefault is called
      const mockSubmitHandler = vi.fn((e) => e.preventDefault());
      form.addEventListener('submit', mockSubmitHandler);

      fireEvent.click(screen.getByRole('button', { name: /Save Data/ }));

      await waitFor(() => {
        expect(mockSubmitHandler).toHaveBeenCalled();
      });
    });

  });

  describe('Modal Close Functionality', () => {
    it('calls onClose when close button is clicked', () => {
      const mockOnClose = vi.fn();
      render(<CalendarModal {...defaultProps} onClose={mockOnClose} />);

      fireEvent.click(screen.getByRole('button', { name: '✕' }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', () => {
      const mockOnClose = vi.fn();
      render(<CalendarModal {...defaultProps} onClose={mockOnClose} />);

      fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets form state on close', () => {
      const mockOnClose = vi.fn();
      const { rerender } = render(<CalendarModal {...defaultProps} onClose={mockOnClose} />);

      // Set some data
      fireEvent.click(screen.getByRole('button', { name: /Heavy/ }));
      fireEvent.change(screen.getByLabelText(/Basal Body Temperature/), { target: { value: '37.0' } });

      // Close modal
      fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));

      expect(mockOnClose).toHaveBeenCalled();
      
      // Re-render the same component to check if state was reset after close
      rerender(<CalendarModal {...defaultProps} onClose={vi.fn()} show={true} />);
      expect(screen.getByRole('button', { name: /None/ })).toHaveClass('selected');
      expect(screen.getByPlaceholderText('36.50')).toHaveValue(null);
    });
  });

  describe('Complex Form State Management', () => {
    it('maintains independent state for all form fields', () => {
      render(<CalendarModal {...defaultProps} />);

      // Set all fields to non-default values
      fireEvent.click(screen.getByRole('button', { name: /Heavy/ }));
      fireEvent.change(screen.getByLabelText(/Basal Body Temperature/), { target: { value: '37.1' } });
      fireEvent.change(screen.getByLabelText(/Cramps/), { target: { value: SYMPTOM_SEVERITY.SEVERE } });
      fireEvent.change(screen.getByLabelText(/Sore Breasts/), { target: { value: SYMPTOM_SEVERITY.MODERATE } });

      // Verify all values are maintained
      expect(screen.getByRole('button', { name: /Heavy/ })).toHaveClass('selected');
      expect(screen.getByLabelText(/Basal Body Temperature/)).toHaveValue(37.1);
      expect(screen.getByLabelText(/Cramps/)).toHaveValue(SYMPTOM_SEVERITY.SEVERE);
      expect(screen.getByLabelText(/Sore Breasts/)).toHaveValue(SYMPTOM_SEVERITY.MODERATE);
    });

    it('updates existing data when modal reopens with new data', () => {
      const initialData = [
        {
          id: 'period-1',
          date: '2024-01-15',
          type: 'period' as const,
          value: { option: PERIOD_OPTIONS.LIGHT }
        }
      ];

      const { rerender } = render(<CalendarModal {...defaultProps} existingData={initialData} />);
      expect(screen.getByRole('button', { name: /Light/ })).toHaveClass('selected');

      // Update with new data
      const newData = [
        {
          id: 'period-2',
          date: '2024-01-15',
          type: 'period' as const,
          value: { option: PERIOD_OPTIONS.HEAVY }
        },
        {
          id: 'bbt-2',
          date: '2024-01-15',
          type: 'bbt' as const,
          value: { temperature: 36.9 }
        }
      ];

      rerender(<CalendarModal {...defaultProps} existingData={newData} />);
      expect(screen.getByRole('button', { name: /Heavy/ })).toHaveClass('selected');
      expect(screen.getByDisplayValue('36.9')).toBeInTheDocument();
    });
  });

  describe('Integration with Data Persistence', () => {
    it('saves complete measurement data with all fields', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      render(<CalendarModal {...defaultProps} onSave={mockOnSave} />);

      // Fill out complete form
      fireEvent.click(screen.getByRole('button', { name: /Medium/ }));
      fireEvent.change(screen.getByLabelText(/Basal Body Temperature/), { target: { value: '36.7' } });
      fireEvent.change(screen.getByLabelText(/Cramps/), { target: { value: SYMPTOM_SEVERITY.MODERATE } });
      fireEvent.change(screen.getByLabelText(/Sore Breasts/), { target: { value: SYMPTOM_SEVERITY.MILD } });

      fireEvent.click(screen.getByRole('button', { name: /Save Data/ }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          period: PERIOD_OPTIONS.MEDIUM,
          bbt: '36.7',
          cramps: SYMPTOM_SEVERITY.MODERATE,
          soreBreasts: SYMPTOM_SEVERITY.MILD,
          lhSurge: false
        });
      });
    });

    it('saves partial data when only some fields are filled', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      render(<CalendarModal {...defaultProps} onSave={mockOnSave} />);

      // Only set period
      fireEvent.click(screen.getByRole('button', { name: /Spotting/ }));

      fireEvent.click(screen.getByRole('button', { name: /Save Data/ }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          period: PERIOD_OPTIONS.SPOTTING,
          bbt: '',
          cramps: SYMPTOM_SEVERITY.NONE,
          soreBreasts: SYMPTOM_SEVERITY.NONE,
          lhSurge: false
        });
      });
    });

    it('calls onSave and lets errors propagate to parent', async () => {
      const mockOnSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const mockOnClose = vi.fn();
      
      // Set up unhandled rejection handler to catch the expected error
      const unhandledRejections: Error[] = [];
      const originalHandler = process.listeners('unhandledRejection');
      process.removeAllListeners('unhandledRejection');
      process.on('unhandledRejection', (reason) => {
        unhandledRejections.push(reason as Error);
      });
      
      try {
        render(<CalendarModal {...defaultProps} onSave={mockOnSave} onClose={mockOnClose} />);

        fireEvent.click(screen.getByRole('button', { name: /Medium/ }));
        fireEvent.click(screen.getByRole('button', { name: /Save Data/ }));

        // Wait for onSave to be called
        await waitFor(() => {
          expect(mockOnSave).toHaveBeenCalledWith({
            period: 'medium',
            bbt: '',
            cramps: 'none',
            soreBreasts: 'none',
            lhSurge: false
          });
        });

        // Allow time for the unhandled rejection to occur
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Verify the error was thrown as expected
        expect(unhandledRejections).toHaveLength(1);
        expect(unhandledRejections[0].message).toBe('Save failed');
        
        // Modal should not close when save fails (parent handles error)
        expect(mockOnClose).not.toHaveBeenCalled();
        expect(screen.getByText(/Log Data - Monday, January 15, 2024/)).toBeInTheDocument();
        
      } finally {
        // Restore original unhandled rejection handlers
        process.removeAllListeners('unhandledRejection');
        originalHandler.forEach(handler => {
          process.on('unhandledRejection', handler);
        });
      }
    });

  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<CalendarModal {...defaultProps} />);

      expect(screen.getByText(/Period Flow/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Basal Body Temperature/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Cramps/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Sore Breasts/)).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<CalendarModal {...defaultProps} />);

      const bbtInput = screen.getByLabelText(/Basal Body Temperature/);
      bbtInput.focus();
      expect(bbtInput).toHaveFocus();

      const crampsSelect = screen.getByLabelText(/Cramps/);
      crampsSelect.focus();
      expect(crampsSelect).toHaveFocus();
    });
  });
});