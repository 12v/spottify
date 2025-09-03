import { importMeasurements } from '../importData';
import { PERIOD_OPTIONS } from '../constants';
import { vi } from 'vitest';

// Mock Firebase modules at the top level
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection-ref'),
  addDoc: vi.fn(),
  Timestamp: {
    now: vi.fn()
  }
}));

vi.mock('../../firebase', () => ({
  db: {}
}));

// Mock DataService
vi.mock('../../services/dataService', () => ({
  DataService: {
    getInstance: vi.fn()
  }
}));

// Import after mocking
import { addDoc, Timestamp } from 'firebase/firestore';
import { DataService } from '../../services/dataService';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('importMeasurements', () => {
  const testUserId = 'test-user-123';
  let mockDataService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock DataService
    mockDataService = {
      getMeasurements: vi.fn().mockResolvedValue([])
    };
    vi.mocked(DataService.getInstance).mockReturnValue(mockDataService);
    
    // Setup Firebase mocks
    vi.mocked(addDoc).mockResolvedValue({ id: 'mock-id-123' } as any);
    vi.mocked(Timestamp.now).mockReturnValue({ seconds: Date.now() / 1000 } as any);
  });

  const createTestFile = (data: unknown[]): File => {
    const jsonData = JSON.stringify(data);
    const mockFile = {
      text: vi.fn().mockResolvedValue(jsonData),
      name: 'test-data.json',
      size: jsonData.length,
      type: 'application/json'
    };
    return mockFile as unknown as File;
  };

  describe('Valid data import', () => {
    it('imports period measurements successfully', async () => {
      const testData = [
        {
          id: 'period-1',
          type: 'period',
          date: '2024-01-01',
          value: { option: PERIOD_OPTIONS.MEDIUM }
        },
        {
          id: 'period-2',
          type: 'period',
          date: '2024-01-02',
          value: { option: PERIOD_OPTIONS.HEAVY }
        }
      ];

      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.duplicates).toBe(0);
      expect(addDoc).toHaveBeenCalledTimes(2);
    });

    it('imports BBT measurements successfully', async () => {
      const testData = [
        {
          id: 'bbt-1',
          type: 'bbt',
          date: '2024-01-01',
          value: { temperature: 36.5 }
        },
        {
          id: 'bbt-2',
          type: 'bbt',
          date: '2024-01-02',
          value: { temperature: 36.8 }
        }
      ];

      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.duplicates).toBe(0);
    });

    it('converts spotting measurements to period type', async () => {
      const testData = [
        {
          id: 'spotting-1',
          type: 'spotting',
          date: '2024-01-01',
          value: {}
        }
      ];

      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(1);
      expect(addDoc).toHaveBeenCalledWith(
        'mock-collection-ref',
        expect.objectContaining({
          type: 'period',
          date: '2024-01-01',
          value: { option: 'spotting' },
          userId: testUserId,
          createdAt: expect.any(Object)
        })
      );
    });

    it('imports mixed measurement types', async () => {
      const testData = [
        {
          id: 'period-1',
          type: 'period',
          date: '2024-01-01',
          value: { option: PERIOD_OPTIONS.LIGHT }
        },
        {
          id: 'bbt-1',
          type: 'bbt',
          date: '2024-01-01',
          value: { temperature: 36.4 }
        },
        {
          id: 'spotting-1',
          type: 'spotting',
          date: '2024-01-02',
          value: {}
        }
      ];

      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.duplicates).toBe(0);
    });
  });

  describe('Invalid data handling', () => {
    it('skips measurements with invalid period options', async () => {
      const testData = [
        {
          id: 'period-1',
          type: 'period',
          date: '2024-01-01',
          value: { option: 'invalid-option' }
        },
        {
          id: 'period-2',
          type: 'period',
          date: '2024-01-02',
          value: { option: PERIOD_OPTIONS.MEDIUM }
        }
      ];

      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.duplicates).toBe(0);
    });

    it('skips BBT measurements without temperature', async () => {
      const testData = [
        {
          id: 'bbt-1',
          type: 'bbt',
          date: '2024-01-01',
          value: {}
        },
        {
          id: 'bbt-2',
          type: 'bbt',
          date: '2024-01-02',
          value: { temperature: 36.5 }
        }
      ];

      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.duplicates).toBe(0);
    });

    it('skips measurements with unknown types', async () => {
      const testData = [
        {
          id: 'unknown-1',
          type: 'unknown-type',
          date: '2024-01-01',
          value: { option: 'test' }
        },
        {
          id: 'period-1',
          type: 'period',
          date: '2024-01-02',
          value: { option: PERIOD_OPTIONS.MEDIUM }
        }
      ];

      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.duplicates).toBe(0);
    });

    it('handles malformed JSON gracefully', async () => {
      const mockFile = {
        text: vi.fn().mockResolvedValue('invalid json'),
        name: 'test.json',
        size: 12,
        type: 'application/json'
      };
      
      await expect(importMeasurements(testUserId, mockFile as unknown as File))
        .rejects.toThrow();
    });

    it('handles empty files', async () => {
      const testData: unknown[] = [];
      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.duplicates).toBe(0);
    });
  });

  describe('Duplicate detection', () => {
    beforeEach(() => {
      // Mock existing measurements
      mockDataService.getMeasurements.mockResolvedValue([
        {
          id: 'existing-1',
          date: '2024-01-01',
          type: 'period',
          value: { option: 'medium' }
        },
        {
          id: 'existing-2',
          date: '2024-01-02',
          type: 'bbt',
          value: { temperature: 36.5 }
        }
      ]);
    });

    it('detects and skips duplicate measurements', async () => {
      const testData = [
        {
          id: 'duplicate-1',
          type: 'period',
          date: '2024-01-01', // Same date and type as existing
          value: { option: PERIOD_OPTIONS.HEAVY } // Different value but still duplicate
        },
        {
          id: 'duplicate-2',
          type: 'bbt',
          date: '2024-01-02', // Same date and type as existing
          value: { temperature: 37.0 } // Different value but still duplicate
        },
        {
          id: 'new-1',
          type: 'period',
          date: '2024-01-03', // New date
          value: { option: PERIOD_OPTIONS.LIGHT }
        }
      ];

      const file = createTestFile(testData);
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(1); // Only the new measurement
      expect(result.skipped).toBe(0);
      expect(result.duplicates).toBe(2); // Two duplicates detected
    });

    it('allows same date with different measurement types', async () => {
      const testData = [
        {
          id: 'new-bbt',
          type: 'bbt',
          date: '2024-01-01', // Same date as existing period measurement
          value: { temperature: 36.3 }
        }
      ];

      const file = createTestFile(testData);
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(1); // Should import - different type
      expect(result.duplicates).toBe(0);
    });
  });

  describe('Progress tracking', () => {
    it('logs progress for large imports', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Create 25 measurements to trigger progress logging
      const testData = Array.from({ length: 25 }, (_, i) => ({
        id: `measurement-${i}`,
        type: 'period',
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: { option: PERIOD_OPTIONS.MEDIUM }
      }));

      const file = createTestFile(testData);
      
      await importMeasurements(testUserId, file);

      expect(consoleSpy).toHaveBeenCalledWith('Starting import of 25 measurements...');
      expect(consoleSpy).toHaveBeenCalledWith('Imported 10 measurements...');
      expect(consoleSpy).toHaveBeenCalledWith('Imported 20 measurements...');
      expect(consoleSpy).toHaveBeenCalledWith('Import complete! Imported: 25, Skipped: 0, Duplicates: 0');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error handling', () => {
    it('continues importing after individual measurement errors', async () => {
      // Mock addDoc to fail for the first call only
      let callCount = 0;
      vi.mocked(addDoc).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Database error');
        }
        return { id: `mock-id-${callCount}` } as any;
      });

      const testData = [
        {
          id: 'measurement-1',
          type: 'period',
          date: '2024-01-01',
          value: { option: PERIOD_OPTIONS.MEDIUM }
        },
        {
          id: 'measurement-2',
          type: 'period',
          date: '2024-01-02',
          value: { option: PERIOD_OPTIONS.LIGHT }
        }
      ];

      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(1); // Second measurement succeeded
      expect(result.skipped).toBe(1); // First measurement failed and was skipped
      expect(result.duplicates).toBe(0);
    });

    it('handles network failures during duplicate check', async () => {
      // Mock getMeasurements to fail
      mockDataService.getMeasurements.mockRejectedValue(new Error('Network error'));

      const testData = [
        {
          id: 'measurement-1',
          type: 'period',
          date: '2024-01-01',
          value: { option: PERIOD_OPTIONS.MEDIUM }
        }
      ];

      const file = createTestFile(testData);
      
      await expect(importMeasurements(testUserId, file))
        .rejects.toThrow('Network error');
    });
  });

  describe('Data validation edge cases', () => {
    it('handles measurements with missing value properties', async () => {
      const testData = [
        {
          id: 'missing-value',
          type: 'period',
          date: '2024-01-01',
          value: {} // Missing option property
        }
      ];

      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('handles measurements with null values', async () => {
      const testData = [
        {
          id: 'null-value',
          type: 'bbt',
          date: '2024-01-01',
          value: { temperature: null }
        }
      ];

      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('validates period options against constants', async () => {
      const testData = [
        {
          id: 'valid-option',
          type: 'period',
          date: '2024-01-01',
          value: { option: PERIOD_OPTIONS.SPOTTING }
        },
        {
          id: 'invalid-option',
          type: 'period',
          date: '2024-01-02',
          value: { option: 'not-a-valid-option' }
        }
      ];

      const file = createTestFile(testData);
      
      const result = await importMeasurements(testUserId, file);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });
});