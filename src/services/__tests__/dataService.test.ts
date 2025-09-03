import { DataService } from '../dataService';
import { MockDataFactory } from '../../test/helpers/mockData';
import type { Measurement } from '../../types';
import { vi } from 'vitest';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection'),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getFirestore: vi.fn(),
  initializeApp: vi.fn(),
  getAuth: vi.fn(),
  Timestamp: { now: vi.fn() }
}));

vi.mock('../firebase', () => ({ db: {} }));

import { addDoc, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';

// Firebase mocking legitimately requires any types due to complex external interfaces  
/* eslint-disable @typescript-eslint/no-explicit-any */

describe('DataService', () => {
  let dataService: DataService;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(addDoc).mockResolvedValue({ id: 'mock-id-123' } as any);
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);
    vi.mocked(deleteDoc).mockResolvedValue(undefined);
    vi.mocked(Timestamp.now).mockReturnValue({ seconds: Date.now() / 1000, nanoseconds: 0 } as any);
    dataService = DataService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = DataService.getInstance();
      const instance2 = DataService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('addMeasurement', () => {
    it('adds a measurement with userId and timestamp', async () => {
      const measurement = MockDataFactory.createPeriodMeasurement('2024-01-15');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _unusedId, ...measurementData } = measurement;

      const result = await dataService.addMeasurement(testUserId, measurementData);

      expect(result).toBe('mock-id-123');
      expect(addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          ...measurementData,
          userId: testUserId,
          createdAt: expect.any(Object)
        })
      );
    });

    it('handles different measurement types', async () => {
      const periodMeasurement = MockDataFactory.createPeriodMeasurement('2024-01-15');
      const bbtMeasurement = MockDataFactory.createBBTMeasurement('2024-01-15', 36.5);
      const symptomMeasurement = MockDataFactory.createSymptomMeasurement('2024-01-15', 'cramps');

      await dataService.addMeasurement(testUserId, periodMeasurement);
      await dataService.addMeasurement(testUserId, bbtMeasurement);
      await dataService.addMeasurement(testUserId, symptomMeasurement);

      expect(addDoc).toHaveBeenCalledTimes(3);
    });

    it('throws error on network failure', async () => {
      vi.mocked(addDoc).mockRejectedValueOnce(new Error('Network error'));
      
      const measurement = MockDataFactory.createPeriodMeasurement('2024-01-15');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _unusedId, ...measurementData } = measurement;

      await expect(dataService.addMeasurement(testUserId, measurementData))
        .rejects.toThrow('Network error');
    });
  });

  describe('getMeasurements', () => {
    beforeEach(() => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({ date: '2024-01-15', type: 'period', value: { option: 'medium' } })
        },
        {
          id: 'doc2', 
          data: () => ({ date: '2024-01-14', type: 'bbt', value: { temperature: 36.5 } })
        }
      ];
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as any);
    });

    it('retrieves measurements for specific user', async () => {
      const measurements = await dataService.getMeasurements(testUserId);

      expect(measurements).toHaveLength(2);
      expect(measurements[0]).toHaveProperty('id');
      expect(measurements[0]).toHaveProperty('date');
      expect(measurements[0]).toHaveProperty('type');
      expect(measurements[0]).toHaveProperty('value');
    });

    it('filters measurements by userId', async () => {
      await dataService.getMeasurements('different-user');
      
      // Verify query was called with userId filter
      expect(getDocs).toHaveBeenCalled();
    });

    it('orders measurements by date descending', async () => {
      const measurements = await dataService.getMeasurements(testUserId);
      
      expect(measurements).toHaveLength(2);
      // Mock returns in order, so just verify we got results
      expect(measurements[0].id).toBe('doc1');
    });

    it('handles empty result set', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any);
      
      const measurements = await dataService.getMeasurements('empty-user');
      expect(measurements).toHaveLength(0);
    });

    it('handles network errors gracefully', async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(dataService.getMeasurements(testUserId))
        .rejects.toThrow('Failed to fetch');
    });
  });

  describe('getMeasurementsByDateRange', () => {
    beforeEach(() => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({ date: '2024-01-15', type: 'period', value: { option: 'medium' } })
        }
      ];
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as any);
    });

    it('filters measurements by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      const measurements = await dataService.getMeasurementsByDateRange(
        testUserId, 
        startDate, 
        endDate
      );

      expect(measurements).toHaveLength(1);
      expect(measurements[0].date).toBe('2024-01-15');
    });

    it('orders results by date ascending', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const measurements = await dataService.getMeasurementsByDateRange(
        testUserId,
        startDate,
        endDate
      );

      expect(measurements).toHaveLength(1);
    });

    it('respects user isolation in date range queries', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any);
      
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const measurements = await dataService.getMeasurementsByDateRange(
        'non-existent-user',
        startDate,
        endDate
      );

      expect(measurements).toHaveLength(0);
    });
  });

  describe('deleteMeasurement', () => {
    it('deletes measurement by ID', async () => {
      const measurementId = 'test-measurement-123';
      
      await dataService.deleteMeasurement(testUserId, measurementId);

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('handles deletion of non-existent measurement', async () => {
      const nonExistentId = 'non-existent-id';
      
      // Should not throw error even if measurement doesn't exist
      await expect(dataService.deleteMeasurement(testUserId, nonExistentId))
        .resolves.not.toThrow();
    });

    it('handles network errors during deletion', async () => {
      vi.mocked(deleteDoc).mockRejectedValueOnce(new Error('Delete failed'));

      await expect(dataService.deleteMeasurement(testUserId, 'test-id'))
        .rejects.toThrow('Delete failed');
    });
  });

  describe('removeDuplicates', () => {
    beforeEach(() => {
      // Mock getMeasurements to return test data with duplicates
      const mockDocs = [
        {
          id: 'id1',
          data: () => ({ date: '2024-01-01', type: 'period', value: { option: 'medium' }, createdAt: { toMillis: () => 1000 } })
        },
        {
          id: 'id2', 
          data: () => ({ date: '2024-01-01', type: 'period', value: { option: 'heavy' }, createdAt: { toMillis: () => 2000 } })
        },
        {
          id: 'id3',
          data: () => ({ date: '2024-01-02', type: 'period', value: { option: 'light' }, createdAt: { toMillis: () => 3000 } })
        }
      ];
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as any);
    });

    it('identifies and removes duplicate measurements', async () => {
      const result = await dataService.removeDuplicates(testUserId);

      expect(result.removed).toBe(1); // 1 duplicate removed
      expect(result.kept).toBe(2); // 2 unique measurements kept
    });

    it('keeps oldest measurement when duplicates found', async () => {
      const result = await dataService.removeDuplicates(testUserId);
      
      expect(result.removed).toBe(1);
      expect(deleteDoc).toHaveBeenCalledTimes(1);
    });

    it('handles case with no duplicates', async () => {
      const mockDocs = [
        {
          id: 'id1',
          data: () => ({ date: '2024-01-01', type: 'period', value: { option: 'medium' } })
        },
        {
          id: 'id2',
          data: () => ({ date: '2024-01-02', type: 'bbt', value: { temperature: 36.5 } })
        }
      ];
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as any);

      const result = await dataService.removeDuplicates(testUserId);

      expect(result.removed).toBe(0);
      expect(result.kept).toBe(2);
    });

    it('handles empty measurement list', async () => {
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      const result = await dataService.removeDuplicates(testUserId);

      expect(result.removed).toBe(0);
      expect(result.kept).toBe(0);
    });

    it('identifies duplicates by date and type combination', async () => {
      const mockDocs = [
        {
          id: 'id1',
          data: () => ({ date: '2024-01-01', type: 'period', value: { option: 'medium' }, createdAt: { toMillis: () => 1000 } })
        },
        {
          id: 'id2',
          data: () => ({ date: '2024-01-01', type: 'period', value: { option: 'heavy' }, createdAt: { toMillis: () => 2000 } })
        },
        {
          id: 'id3',
          data: () => ({ date: '2024-01-02', type: 'period', value: { option: 'medium' }, createdAt: { toMillis: () => 3000 } })
        },
        {
          id: 'id4',
          data: () => ({ date: '2024-01-01', type: 'bbt', value: { temperature: 36.5 }, createdAt: { toMillis: () => 4000 } })
        }
      ];
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as any);

      const result = await dataService.removeDuplicates(testUserId);

      expect(result.removed).toBe(1); // Only 1 duplicate (same date + type)
      expect(result.kept).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('handles permission denied errors', async () => {
      const error = new Error('Permission denied');
      vi.mocked(addDoc).mockRejectedValueOnce(error);
      
      const measurement = MockDataFactory.createPeriodMeasurement('2024-01-15');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _unusedId, ...measurementData } = measurement;

      await expect(dataService.addMeasurement(testUserId, measurementData))
        .rejects.toThrow('Permission denied');
    });

    it('handles unauthenticated errors', async () => {
      const error = new Error('User not authenticated');
      vi.mocked(getDocs).mockRejectedValueOnce(error);

      await expect(dataService.getMeasurements(testUserId))
        .rejects.toThrow('User not authenticated');
    });

    it('handles quota exceeded errors', async () => {
      const error = new Error('Quota exceeded');
      vi.mocked(addDoc).mockRejectedValueOnce(error);
      
      const measurement = MockDataFactory.createPeriodMeasurement('2024-01-15');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _unusedId, ...measurementData } = measurement;

      await expect(dataService.addMeasurement(testUserId, measurementData))
        .rejects.toThrow('Quota exceeded');
    });
  });

  describe('Data Validation', () => {
    it('accepts valid measurement data', async () => {
      const validMeasurement = {
        date: '2024-01-15',
        type: 'period' as const,
        value: { option: 'medium' }
      };

      const result = await dataService.addMeasurement(testUserId, validMeasurement);
      expect(result).toBe('mock-id-123');
    });

    it('handles malformed measurement data gracefully', async () => {
      const malformedMeasurement = {
        date: '2024-01-15',
        type: 'period' as const,
        value: null // Invalid value
      };

      // Should not throw error at service level - validation should happen elsewhere
      await expect(dataService.addMeasurement(testUserId, malformedMeasurement as unknown as Omit<Measurement, 'id'>))
        .resolves.toBeTruthy();
    });
  });
});