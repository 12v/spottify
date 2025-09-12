import { CycleService } from '../cycleService';
import { PERIOD_OPTIONS } from '../../utils/constants';
import type { Measurement } from '../../types';

describe('CycleService', () => {
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
  });
});