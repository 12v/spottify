import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useCycleData } from '../useCycleData';
import { DataService } from '../../services/dataService';
import { PERIOD_OPTIONS, SYMPTOM_SEVERITY, LH_SURGE_STATUS } from '../../utils/constants';

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(() => ({
    currentUser: { uid: 'test-user-123' }
  }))
}));

vi.mock('../../services/dataService');
vi.mock('../../services/cycleService', () => ({
  CycleService: {
    calculateCycleStats: vi.fn(() => ({
      averageCycleLength: 28,
      cycleVariation: 2,
      averagePeriodLength: 5
    }))
  }
}));

describe('useCycleData', () => {
  let mockDataService: {
    getMeasurements: ReturnType<typeof vi.fn>;
    addMeasurement: ReturnType<typeof vi.fn>;
    deleteMeasurement: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataService = {
      getMeasurements: vi.fn().mockResolvedValue([]),
      addMeasurement: vi.fn().mockResolvedValue('new-id'),
      deleteMeasurement: vi.fn().mockResolvedValue(undefined)
    };

    vi.mocked(DataService.getInstance).mockReturnValue(mockDataService as unknown as DataService);
  });

  describe('BBT Deletion', () => {
    it('deletes existing BBT when empty string is saved', async () => {
      const existingBBT = {
        id: 'bbt-123',
        date: '2024-01-15',
        type: 'bbt' as const,
        value: { temperature: 36.5 },
        userId: 'test-user-123'
      };

      mockDataService.getMeasurements.mockResolvedValue([existingBBT]);

      const { result } = renderHook(() => useCycleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.saveBatchMeasurements('2024-01-15', [
        { type: 'bbt', value: '' }
      ]);

      expect(mockDataService.deleteMeasurement).toHaveBeenCalledWith('test-user-123', 'bbt-123');
      expect(mockDataService.addMeasurement).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'bbt' })
      );
    });

    it('does not delete when no existing BBT and empty string is saved', async () => {
      mockDataService.getMeasurements.mockResolvedValue([]);

      const { result } = renderHook(() => useCycleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.saveBatchMeasurements('2024-01-15', [
        { type: 'bbt', value: '' }
      ]);

      expect(mockDataService.deleteMeasurement).not.toHaveBeenCalled();
      expect(mockDataService.addMeasurement).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'bbt' })
      );
    });

    it('saves BBT when non-empty value is provided', async () => {
      mockDataService.getMeasurements.mockResolvedValue([]);

      const { result } = renderHook(() => useCycleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.saveBatchMeasurements('2024-01-15', [
        { type: 'bbt', value: '36.5' }
      ]);

      expect(mockDataService.addMeasurement).toHaveBeenCalledWith('test-user-123', {
        type: 'bbt',
        date: '2024-01-15',
        value: { temperature: 36.5 }
      });
      expect(mockDataService.deleteMeasurement).not.toHaveBeenCalled();
    });

    it('replaces existing BBT when new value is provided', async () => {
      const existingBBT = {
        id: 'bbt-123',
        date: '2024-01-15',
        type: 'bbt' as const,
        value: { temperature: 36.5 },
        userId: 'test-user-123'
      };

      mockDataService.getMeasurements.mockResolvedValue([existingBBT]);

      const { result } = renderHook(() => useCycleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.saveBatchMeasurements('2024-01-15', [
        { type: 'bbt', value: '36.8' }
      ]);

      expect(mockDataService.addMeasurement).toHaveBeenCalledWith('test-user-123', {
        type: 'bbt',
        date: '2024-01-15',
        value: { temperature: 36.8 }
      });
      expect(mockDataService.deleteMeasurement).not.toHaveBeenCalled();
    });
  });

  describe('Other Measurement Types Deletion', () => {
    it('deletes period when set to NONE', async () => {
      const existingPeriod = {
        id: 'period-123',
        date: '2024-01-15',
        type: 'period' as const,
        value: { option: PERIOD_OPTIONS.MEDIUM },
        userId: 'test-user-123'
      };

      mockDataService.getMeasurements.mockResolvedValue([existingPeriod]);

      const { result } = renderHook(() => useCycleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.saveBatchMeasurements('2024-01-15', [
        { type: 'period', value: PERIOD_OPTIONS.NONE }
      ]);

      expect(mockDataService.deleteMeasurement).toHaveBeenCalledWith('test-user-123', 'period-123');
    });

    it('deletes cramps when set to NONE', async () => {
      const existingCramps = {
        id: 'cramps-123',
        date: '2024-01-15',
        type: 'cramps' as const,
        value: { severity: SYMPTOM_SEVERITY.MILD },
        userId: 'test-user-123'
      };

      mockDataService.getMeasurements.mockResolvedValue([existingCramps]);

      const { result } = renderHook(() => useCycleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.saveBatchMeasurements('2024-01-15', [
        { type: 'cramps', value: SYMPTOM_SEVERITY.NONE }
      ]);

      expect(mockDataService.deleteMeasurement).toHaveBeenCalledWith('test-user-123', 'cramps-123');
    });

    it('deletes LH surge when set to NOT_TESTED', async () => {
      const existingLH = {
        id: 'lh-123',
        date: '2024-01-15',
        type: 'lh_surge' as const,
        value: { status: LH_SURGE_STATUS.POSITIVE },
        userId: 'test-user-123'
      };

      mockDataService.getMeasurements.mockResolvedValue([existingLH]);

      const { result } = renderHook(() => useCycleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.saveBatchMeasurements('2024-01-15', [
        { type: 'lh_surge', value: LH_SURGE_STATUS.NOT_TESTED }
      ]);

      expect(mockDataService.deleteMeasurement).toHaveBeenCalledWith('test-user-123', 'lh-123');
    });
  });

  describe('Batch Operations', () => {
    it('handles mixed save and delete operations', async () => {
      const existingBBT = {
        id: 'bbt-123',
        date: '2024-01-15',
        type: 'bbt' as const,
        value: { temperature: 36.5 },
        userId: 'test-user-123'
      };

      const existingPeriod = {
        id: 'period-123',
        date: '2024-01-15',
        type: 'period' as const,
        value: { option: PERIOD_OPTIONS.LIGHT },
        userId: 'test-user-123'
      };

      mockDataService.getMeasurements.mockResolvedValue([existingBBT, existingPeriod]);

      const { result } = renderHook(() => useCycleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.saveBatchMeasurements('2024-01-15', [
        { type: 'bbt', value: '' },
        { type: 'period', value: PERIOD_OPTIONS.MEDIUM },
        { type: 'cramps', value: SYMPTOM_SEVERITY.MILD }
      ]);

      expect(mockDataService.deleteMeasurement).toHaveBeenCalledWith('test-user-123', 'bbt-123');
      expect(mockDataService.addMeasurement).toHaveBeenCalledWith('test-user-123', {
        type: 'period',
        date: '2024-01-15',
        value: { option: PERIOD_OPTIONS.MEDIUM }
      });
      expect(mockDataService.addMeasurement).toHaveBeenCalledWith('test-user-123', {
        type: 'cramps',
        date: '2024-01-15',
        value: { severity: SYMPTOM_SEVERITY.MILD }
      });
    });
  });
});
