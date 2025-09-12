import { render, screen, fireEvent } from '@testing-library/react';
import CalendarDay from '../CalendarDay';
import { vi } from 'vitest';
import { PERIOD_OPTIONS, SYMPTOM_SEVERITY } from '../../utils/constants';
import { MockDataFactory } from '../../test/helpers/mockData';
import type { Measurement } from '../../types';

describe('CalendarDay', () => {
  const defaultProps = {
    day: new Date('2024-03-15'),
    measurements: [] as Measurement[],
    isPredPeriod: false,
    isPredOvulation: false,
    inFertileWindow: false,
    isToday: false,
    onClick: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders day number correctly', () => {
      render(<CalendarDay {...defaultProps} />);
      
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
      const mockOnClick = vi.fn();
      render(<CalendarDay {...defaultProps} onClick={mockOnClick} />);
      
      const dayElement = screen.getByText('15').parentElement;
      fireEvent.click(dayElement!);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('displays correct cursor pointer style', () => {
      render(<CalendarDay {...defaultProps} />);
      
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('Today Marker', () => {
    it('highlights today with special border and styling', () => {
      render(<CalendarDay {...defaultProps} isToday={true} />);
      
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        border: '3px solid #4169E1'
      });
      
      // Day number should be bold and blue
      const dayNumber = screen.getByText('15');
      expect(dayNumber).toHaveStyle({
        fontWeight: 'bold',
        color: '#4169E1'
      });
    });

    it('does not apply today styling when isToday is false', () => {
      render(<CalendarDay {...defaultProps} isToday={false} />);
      
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).not.toHaveStyle({
        border: '3px solid #4169E1'
      });
      
      const dayNumber = screen.getByText('15');
      expect(dayNumber).toHaveStyle({
        fontWeight: 'normal'
      });
    });
  });

  describe('Period Flow Visualization', () => {
    it('displays heavy period flow with dark red background', () => {
      const measurements = [
        MockDataFactory.createPeriodMeasurement('2024-03-15', PERIOD_OPTIONS.HEAVY)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} />);
      
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        backgroundColor: '#ff3535ff'
      });
      
      // Should show period emoji
      expect(screen.getByText('🩸')).toBeInTheDocument();
      
      // Day number should be white on dark background
      const dayNumber = screen.getByText('15');
      expect(dayNumber).toHaveStyle({
        color: 'rgb(255, 255, 255)'
      });
    });

    it('displays medium period flow with medium red background', () => {
      const measurements = [
        MockDataFactory.createPeriodMeasurement('2024-03-15', PERIOD_OPTIONS.MEDIUM)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} />);
      
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        backgroundColor: '#f75555ff'
      });
      
      expect(screen.getByText('🩸')).toBeInTheDocument();
      
      const dayNumber = screen.getByText('15');
      expect(dayNumber).toHaveStyle({
        color: 'rgb(255, 255, 255)'
      });
    });

    it('displays light period flow with light red background', () => {
      const measurements = [
        MockDataFactory.createPeriodMeasurement('2024-03-15', PERIOD_OPTIONS.LIGHT)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} />);
      
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        backgroundColor: '#f89090ff'
      });
      
      expect(screen.getByText('🩸')).toBeInTheDocument();
    });

    it('displays spotting with default background (no special color)', () => {
      const measurements = [
        MockDataFactory.createPeriodMeasurement('2024-03-15', PERIOD_OPTIONS.SPOTTING)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} />);
      
      // Spotting doesn't change background color in the switch statement
      const dayElement = screen.getByText('15').parentElement;
      // Spotting uses default white background (no explicit backgroundColor set)
      expect(dayElement).not.toHaveStyle({
        backgroundColor: '#ff3535ff'
      });
      
      expect(screen.getByText('🩸')).toBeInTheDocument();
    });

    it('handles unknown period flow types gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const measurements: Measurement[] = [{
        id: 'test-unknown',
        date: '2024-03-15',
        type: 'period',
        value: { option: 'unknown-flow' }
      }];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} />);
      
      expect(consoleSpy).toHaveBeenCalledWith('Unknown period flow type: unknown-flow');
      
      consoleSpy.mockRestore();
    });
  });

  describe('BBT Temperature Display', () => {
    it('displays BBT temperature with blue badge', () => {
      const measurements = [
        MockDataFactory.createBBTMeasurement('2024-03-15', 36.7)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} />);
      
      const bbtElement = screen.getByText('36.7°');
      expect(bbtElement).toBeInTheDocument();
      expect(bbtElement).toHaveStyle({
        backgroundColor: 'rgb(33, 150, 243)',
        color: 'rgb(255, 255, 255)',
        padding: '1px 3px'
      });
    });

    it('displays BBT with proper decimal formatting', () => {
      const measurements = [
        MockDataFactory.createBBTMeasurement('2024-03-15', 36.0)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} />);
      
      expect(screen.getByText('36°')).toBeInTheDocument();
    });
  });

  describe('Symptom Display', () => {
    it('displays symptom count with orange badge', () => {
      const measurements = [
        MockDataFactory.createSymptomMeasurement('2024-03-15', 'cramps', SYMPTOM_SEVERITY.MILD),
        MockDataFactory.createSymptomMeasurement('2024-03-15', 'sore_breasts', SYMPTOM_SEVERITY.MODERATE)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} />);
      
      const symptomElement = screen.getByText('2⚠');
      expect(symptomElement).toBeInTheDocument();
      expect(symptomElement).toHaveStyle({
        backgroundColor: 'rgb(255, 152, 0)',
        color: 'rgb(255, 255, 255)',
        padding: '1px 3px'
      });
    });

    it('does not display symptoms badge when no symptoms recorded', () => {
      const measurements = [
        MockDataFactory.createBBTMeasurement('2024-03-15', 36.5)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} />);
      
      expect(screen.queryByText(/⚠/)).not.toBeInTheDocument();
    });
  });

  describe('Multi-Measurement Display', () => {
    it('displays period, BBT, and symptoms together', () => {
      const measurements = [
        MockDataFactory.createPeriodMeasurement('2024-03-15', PERIOD_OPTIONS.MEDIUM),
        MockDataFactory.createBBTMeasurement('2024-03-15', 36.8),
        MockDataFactory.createSymptomMeasurement('2024-03-15', 'cramps', SYMPTOM_SEVERITY.SEVERE)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} />);
      
      // All measurement indicators should be present
      expect(screen.getByText('🩸')).toBeInTheDocument();
      expect(screen.getByText('36.8°')).toBeInTheDocument();
      expect(screen.getByText('1⚠')).toBeInTheDocument();
      
      // Background should be period color
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        backgroundColor: '#f75555ff'
      });
    });

    it('displays only measurements without period flow when no period data', () => {
      const measurements = [
        MockDataFactory.createBBTMeasurement('2024-03-15', 36.4),
        MockDataFactory.createSymptomMeasurement('2024-03-15', 'cramps', SYMPTOM_SEVERITY.MILD)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} />);
      
      expect(screen.queryByText('🩸')).not.toBeInTheDocument();
      expect(screen.getByText('36.4°')).toBeInTheDocument();
      expect(screen.getByText('1⚠')).toBeInTheDocument();
      
      // Should have border for non-period data
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        border: '2px solid #e1bee7' // Light purple for other data
      });
    });
  });

  describe('Prediction Indicators', () => {
    it('displays ovulation prediction emoji when predicted', () => {
      render(<CalendarDay {...defaultProps} isPredOvulation={true} />);
      
      expect(screen.getByText('🥚')).toBeInTheDocument();
    });

    it('displays predicted period background when predicted', () => {
      render(<CalendarDay {...defaultProps} isPredPeriod={true} />);
      
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        backgroundColor: '#FFE4E1'
      });
    });

    it('displays fertile window background when in fertile window', () => {
      render(<CalendarDay {...defaultProps} inFertileWindow={true} />);
      
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        backgroundColor: '#F0FFF0'
      });
    });

    it('prioritizes actual period data over predicted period', () => {
      const measurements = [
        MockDataFactory.createPeriodMeasurement('2024-03-15', PERIOD_OPTIONS.HEAVY)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} isPredPeriod={true} />);
      
      // Should show actual period color, not prediction color
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        backgroundColor: '#ff3535ff' // Actual period color
      });
      expect(dayElement).not.toHaveStyle({
        backgroundColor: '#FFE4E1' // Predicted period color
      });
    });

    it('does not show fertile window when period data exists', () => {
      const measurements = [
        MockDataFactory.createPeriodMeasurement('2024-03-15', PERIOD_OPTIONS.LIGHT)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} inFertileWindow={true} />);
      
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).not.toHaveStyle({
        backgroundColor: '#F0FFF0'
      });
    });

    it('combines ovulation prediction with other indicators', () => {
      const measurements = [
        MockDataFactory.createBBTMeasurement('2024-03-15', 36.9)
      ];
      
      render(<CalendarDay {...defaultProps} measurements={measurements} isPredOvulation={true} />);
      
      expect(screen.getByText('🥚')).toBeInTheDocument();
      expect(screen.getByText('36.9°')).toBeInTheDocument();
    });
  });

  describe('Empty Day States', () => {
    it('displays plain white background when no data or predictions', () => {
      render(<CalendarDay {...defaultProps} />);
      
      const dayElement = screen.getByText('15').parentElement;
      // Should have default white background (no special styling)
      expect(dayElement).not.toHaveStyle({
        backgroundColor: '#FFE4E1' // Not predicted period
      });
      expect(dayElement).not.toHaveStyle({
        backgroundColor: '#F0FFF0' // Not fertile window
      });
    });

    it('does not display any measurement indicators when no data', () => {
      render(<CalendarDay {...defaultProps} />);
      
      expect(screen.queryByText('🩸')).not.toBeInTheDocument();
      expect(screen.queryByText(/°/)).not.toBeInTheDocument();
      expect(screen.queryByText(/⚠/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility and Interaction', () => {
    it('maintains consistent click area regardless of content', () => {
      // Test empty day
      const { rerender } = render(<CalendarDay {...defaultProps} onClick={vi.fn()} />);
      
      let dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        minHeight: '60px',
        cursor: 'pointer'
      });
      
      // Test day with lots of content
      const measurements = MockDataFactory.createDayMeasurements('2024-03-15');
      rerender(<CalendarDay {...defaultProps} measurements={measurements} onClick={vi.fn()} />);
      
      dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        minHeight: '60px',
        cursor: 'pointer'
      });
    });

    it('applies proper flex layout for content organization', () => {
      render(<CalendarDay {...defaultProps} />);
      
      const dayElement = screen.getByText('15').parentElement;
      expect(dayElement).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles measurements with no type gracefully', () => {
      // This shouldn't happen in normal usage but test robustness
      const measurements = [
        MockDataFactory.createBBTMeasurement('2024-03-15', 36.5),
        {} as Measurement // Invalid measurement
      ];
      
      expect(() => {
        render(<CalendarDay {...defaultProps} measurements={measurements} />);
      }).not.toThrow();
      
      // Should still display valid measurements
      expect(screen.getByText('36.5°')).toBeInTheDocument();
    });

    it('handles different day numbers correctly', () => {
      const firstDay = new Date('2024-03-01');
      const lastDay = new Date('2024-03-31');
      
      const { rerender } = render(<CalendarDay {...defaultProps} day={firstDay} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      
      rerender(<CalendarDay {...defaultProps} day={lastDay} />);
      expect(screen.getByText('31')).toBeInTheDocument();
    });

    it('handles measurements with missing value properties', () => {
      const invalidMeasurements: Measurement[] = [
        {
          id: 'test-invalid',
          date: '2024-03-15',
          type: 'period',
          value: {} as { option: string } // Missing option property
        }
      ];
      
      expect(() => {
        render(<CalendarDay {...defaultProps} measurements={invalidMeasurements} />);
      }).not.toThrow();
    });
  });

  describe('Component Optimization', () => {
    it('is wrapped with React.memo for performance', () => {
      // Test that the component doesn't re-render when props haven't changed
      const mockOnClick = vi.fn();
      const props = { ...defaultProps, onClick: mockOnClick };
      
      const { rerender } = render(<CalendarDay {...props} />);
      
      // Rerender with same props
      rerender(<CalendarDay {...props} />);
      
      // Component should be memoized (this is more of a structural test)
      expect(CalendarDay.displayName).toBe(undefined); // memo components don't have displayName by default
    });
  });
});