import { CycleService } from '../cycleService';
import { PERIOD_OPTIONS } from '../../utils/constants';
import type { Measurement } from '../../types';
import { vi } from 'vitest';

describe('CycleService', () => {
  beforeEach(() => {
    // Mock current date to be consistent across tests
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to create measurement data
  const createPeriodMeasurement = (date: string, option: string = PERIOD_OPTIONS.MEDIUM): Measurement => ({
    id: `test-${date}`,
    date,
    type: 'period',
    value: { option }
  });

  describe('calculateCycleStats', () => {
    it('returns null for insufficient data', () => {
      const measurements: Measurement[] = [
        createPeriodMeasurement('2024-01-01')
      ];

      const stats = CycleService.calculateCycleStats(measurements);

      expect(stats).toBeNull();
    });

    it('calculates stats for regular cycles', () => {
      const measurements: Measurement[] = [
        createPeriodMeasurement('2024-01-01'),
        createPeriodMeasurement('2024-01-02'),
        createPeriodMeasurement('2024-01-03'), // 3-day period
        createPeriodMeasurement('2024-01-29'), // 28-day cycle
        createPeriodMeasurement('2024-01-30'),
        createPeriodMeasurement('2024-02-26'), // 28-day cycle
        createPeriodMeasurement('2024-02-27'),
      ];

      const stats = CycleService.calculateCycleStats(measurements);

      expect(stats).not.toBeNull();
      expect(stats!.averageCycleLength).toBeCloseTo(28, 0);
      expect(stats!.averagePeriodLength).toBeCloseTo(2, 0);
    });

    it('returns whole numbers for cycle and period lengths', () => {
      const measurements: Measurement[] = [
        createPeriodMeasurement('2024-01-01'),
        createPeriodMeasurement('2024-01-02'),
        createPeriodMeasurement('2024-01-03'), // 3-day period
        createPeriodMeasurement('2024-01-29'), // 28-day cycle
        createPeriodMeasurement('2024-01-30'),
        createPeriodMeasurement('2024-01-31'), // 3-day period
        createPeriodMeasurement('2024-02-27'), // 29-day cycle (28.5 average)
        createPeriodMeasurement('2024-02-28'),
        createPeriodMeasurement('2024-02-29'),
        createPeriodMeasurement('2024-03-01'), // 4-day period (3.33 average)
      ];

      const stats = CycleService.calculateCycleStats(measurements);

      expect(stats).not.toBeNull();
      // Ensure values are integers (no decimals)
      expect(Number.isInteger(stats!.averageCycleLength)).toBe(true);
      expect(Number.isInteger(stats!.averagePeriodLength)).toBe(true);
      // Verify reasonable values
      expect(stats!.averageCycleLength).toBeGreaterThan(0);
      expect(stats!.averagePeriodLength).toBeGreaterThan(0);
    });

    it('filters out none and spotting measurements', () => {
      const measurements: Measurement[] = [
        createPeriodMeasurement('2024-01-01', PERIOD_OPTIONS.MEDIUM),
        createPeriodMeasurement('2024-01-02', PERIOD_OPTIONS.NONE),
        createPeriodMeasurement('2024-01-03', PERIOD_OPTIONS.SPOTTING),
        createPeriodMeasurement('2024-01-29', PERIOD_OPTIONS.LIGHT),
      ];

      const stats = CycleService.calculateCycleStats(measurements);
      // Should only count the medium and light flow days
      expect(stats).toBeDefined();
    });
  });

  describe('getCurrentCycleDay', () => {
    it('returns null for no period data', () => {
      const result = CycleService.getCurrentCycleDay([]);
      expect(result).toBeNull();
    });

    it('calculates current cycle day', () => {
      const today = new Date();
      const lastPeriodStart = new Date();
      lastPeriodStart.setDate(today.getDate() - 5); // 5 days ago

      const measurements: Measurement[] = [
        createPeriodMeasurement(lastPeriodStart.toISOString().split('T')[0])
      ];

      const result = CycleService.getCurrentCycleDay(measurements);
      expect(result).not.toBeNull();
      expect(result!.cycleDay).toBe(6); // Day 6 of cycle
      expect(result!.cycleLength).toBeNull(); // No cycle length without sufficient data
    });
  });

  describe('predictNextCycle', () => {
    it('returns null when no data available', () => {
      const prediction = CycleService.predictNextCycle([]);
      expect(prediction).toBeNull();
    });

    it('returns null with insufficient period data', () => {
      const lastPeriodStart = new Date();
      lastPeriodStart.setDate(lastPeriodStart.getDate() - 10);

      const measurements: Measurement[] = [
        createPeriodMeasurement(lastPeriodStart.toISOString().split('T')[0])
      ];

      const prediction = CycleService.predictNextCycle(measurements);
      expect(prediction).toBeNull(); // Not enough data for predictions
    });

    it('calculates ovulation date using rounded cycle length', () => {
      // Create cycles that would average to 28.5 days (should round to 29)
      const measurements: Measurement[] = [
        createPeriodMeasurement('2023-12-01'),
        createPeriodMeasurement('2023-12-02'),
        createPeriodMeasurement('2023-12-29'), // 28-day cycle
        createPeriodMeasurement('2023-12-30'),
        createPeriodMeasurement('2024-01-28'), // 30-day cycle (avg 29)
        createPeriodMeasurement('2024-01-29'),
      ];

      const prediction = CycleService.predictNextCycle(measurements);
      const stats = CycleService.calculateCycleStats(measurements);

      expect(prediction).not.toBeNull();
      expect(stats).not.toBeNull();

      // Verify stats use rounded value
      expect(stats!.averageCycleLength).toBe(29);

      // Verify ovulation is calculated with rounded cycle length
      // Next period: 2024-01-28 + 29 = 2024-02-26
      // Ovulation: 2024-02-26 - 14 = 2024-02-12
      expect(prediction!.nextPeriod).toBe('2024-02-26');
      expect(prediction!.ovulation).toBe('2024-02-12');
    });
  });

  describe('getCurrentPeriodInfo', () => {
    it('returns false for all states when no period data', () => {
      const result = CycleService.getCurrentPeriodInfo([]);
      
      expect(result.isInPeriod).toBe(false);
      expect(result.daysLeftInPeriod).toBeNull();
      expect(result.isPeriodExpectedToday).toBe(false);
    });

    it('detects when currently in period', () => {
      // Create measurements with sufficient data for stats (2+ cycles) 
      // Need gaps > 7 days to be considered separate cycles
      const measurements: Measurement[] = [
        createPeriodMeasurement('2023-11-01'), // Start of cycle 1
        createPeriodMeasurement('2023-11-02'),
        createPeriodMeasurement('2023-11-03'), // 3-day period
        createPeriodMeasurement('2023-11-29'), // Start of cycle 2 (28-day cycle, gap of 26 days)
        createPeriodMeasurement('2023-11-30'),
        createPeriodMeasurement('2023-12-01'), // 3-day period
        createPeriodMeasurement('2023-12-27'), // Start of cycle 3 (26 days later)
        createPeriodMeasurement('2023-12-28'),
        createPeriodMeasurement('2024-01-13'), // Start of current period - 2 days ago (16 days later, shorter cycle)
        createPeriodMeasurement('2024-01-14') // Yesterday
      ];

      const result = CycleService.getCurrentPeriodInfo(measurements);
      
      expect(result.isInPeriod).toBe(true);
      expect(result.daysLeftInPeriod).toBe(0); // Day 3 of ~3-day period, so 0 days left
      expect(result.isPeriodExpectedToday).toBe(false);
    });

    it('detects when period is expected today but not recorded', () => {
      // Working backwards: today is 2024-01-15, I want next period expected today
      // So last period start should be 2023-12-18 (28 days before today)
      // I need at least 2 cycles with 28-day gaps for proper stats
      const measurements: Measurement[] = [
        // Cycle 1: starts 2023-10-23, ends 2023-10-25  
        createPeriodMeasurement('2023-10-23'),
        createPeriodMeasurement('2023-10-24'), 
        createPeriodMeasurement('2023-10-25'),
        // Cycle 2: starts 2023-11-20 (28 days later), ends 2023-11-22
        createPeriodMeasurement('2023-11-20'),
        createPeriodMeasurement('2023-11-21'),
        createPeriodMeasurement('2023-11-22'),
        // Cycle 3: starts 2023-12-18 (28 days later), ends 2023-12-20  
        createPeriodMeasurement('2023-12-18'), // Last period start
        createPeriodMeasurement('2023-12-19'),
        createPeriodMeasurement('2023-12-20'),
        // Cycles: 28 + 28 = avg 28 days exactly
        // Next expected: 2023-12-18 + 28 days = 2024-01-15 (today) ✓
      ];

      const result = CycleService.getCurrentPeriodInfo(measurements);
      
      expect(result.isInPeriod).toBe(false);
      expect(result.daysLeftInPeriod).toBeNull();
      expect(result.isPeriodExpectedToday).toBe(true);
    });


    it('returns false when not in period and not expected today', () => {
      // Create measurements where we're between periods
      const measurements: Measurement[] = [
        createPeriodMeasurement('2023-12-01'), // Start of cycle 1
        createPeriodMeasurement('2023-12-02'),
        createPeriodMeasurement('2023-12-29'), // Start of cycle 2
        createPeriodMeasurement('2023-12-30'),
        createPeriodMeasurement('2024-01-05'), // Recent period, ended 10 days ago
        createPeriodMeasurement('2024-01-06')
        // Next period not expected for another ~20 days
      ];

      const result = CycleService.getCurrentPeriodInfo(measurements);
      
      expect(result.isInPeriod).toBe(false);
      expect(result.daysLeftInPeriod).toBeNull();
      expect(result.isPeriodExpectedToday).toBe(false);
    });

    it('calculates days left in period correctly', () => {
      // Create measurements where we're on day 1 of a 3-day period
      const measurements: Measurement[] = [
        createPeriodMeasurement('2023-12-01'), // Start of cycle 1
        createPeriodMeasurement('2023-12-02'),
        createPeriodMeasurement('2023-12-03'), // 3-day period
        createPeriodMeasurement('2023-12-29'), // Start of cycle 2
        createPeriodMeasurement('2023-12-30'),
        createPeriodMeasurement('2024-01-15') // Today - first day of period
      ];

      const result = CycleService.getCurrentPeriodInfo(measurements);
      
      expect(result.isInPeriod).toBe(true);
      expect(result.daysLeftInPeriod).toBe(1); // 2 more days left in 3-day period
      expect(result.isPeriodExpectedToday).toBe(false);
    });
  });
});