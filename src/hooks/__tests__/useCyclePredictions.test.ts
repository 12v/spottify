import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useCyclePredictions } from '../useCyclePredictions';
import type { Measurement, CycleStats } from '../../types';
import { PERIOD_OPTIONS } from '../../utils/constants';

describe('useCyclePredictions', () => {
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

  const mockStats: CycleStats = {
    averageCycleLength: 28,
    cycleVariation: 2,
    averagePeriodLength: 5
  };

  describe('isPredictedPeriod', () => {
    it('returns false when no stats available', () => {
      const measurements: Measurement[] = [];
      const { result } = renderHook(() => useCyclePredictions(measurements, null));

      expect(result.current.isPredictedPeriod('2024-01-15')).toBe(false);
    });

    it('returns false when no period measurements available', () => {
      const measurements: Measurement[] = [];
      const { result } = renderHook(() => useCyclePredictions(measurements, mockStats));

      expect(result.current.isPredictedPeriod('2024-01-15')).toBe(false);
    });

    it('detects ongoing period from last period start', () => {
      const measurements: Measurement[] = [
        createPeriodMeasurement('2024-01-12'), // 3 days ago - start of current period
        createPeriodMeasurement('2024-01-13'), // 2 days ago
        createPeriodMeasurement('2024-01-14'), // yesterday
        // Today (2024-01-15) should still be predicted as period day 4 of 5
      ];

      const { result } = renderHook(() => useCyclePredictions(measurements, mockStats));

      expect(result.current.isPredictedPeriod('2024-01-15')).toBe(true); // Day 4 of 5-day period
      expect(result.current.isPredictedPeriod('2024-01-16')).toBe(true); // Day 5 of 5-day period
      expect(result.current.isPredictedPeriod('2024-01-17')).toBe(false); // Beyond 5-day period
    });

    it('predicts future periods based on cycle length', () => {
      const measurements: Measurement[] = [
        createPeriodMeasurement('2023-12-18'), // Last period start (28 days ago)
        createPeriodMeasurement('2023-12-19'),
      ];

      const { result } = renderHook(() => useCyclePredictions(measurements, mockStats));

      // Next period should start 2024-01-15 (today) based on 28-day cycle
      expect(result.current.isPredictedPeriod('2024-01-15')).toBe(true); // Day 1 of next period
      expect(result.current.isPredictedPeriod('2024-01-19')).toBe(true); // Day 5 of next period
      expect(result.current.isPredictedPeriod('2024-01-20')).toBe(false); // Beyond 5-day period
    });

    it('does not predict periods for dates before next expected cycle', () => {
      const measurements: Measurement[] = [
        createPeriodMeasurement('2024-01-01'), // 14 days ago - last period start
        createPeriodMeasurement('2024-01-02'),
      ];

      const { result } = renderHook(() => useCyclePredictions(measurements, mockStats));

      // Next period should start on 2024-01-29 (28 days from 2024-01-01)
      expect(result.current.isPredictedPeriod('2024-01-15')).toBe(false); // Too early
      expect(result.current.isPredictedPeriod('2024-01-28')).toBe(false); // Day before expected start
      expect(result.current.isPredictedPeriod('2024-01-29')).toBe(true); // Expected start
    });
  });

  describe('isPredictedOvulation', () => {
    it('returns false when no stats available', () => {
      const measurements: Measurement[] = [];
      const { result } = renderHook(() => useCyclePredictions(measurements, null));

      expect(result.current.isPredictedOvulation('2024-01-15')).toBe(false);
    });

    it('predicts current cycle ovulation', () => {
      const measurements: Measurement[] = [
        createPeriodMeasurement('2024-01-01'), // 14 days ago - last period start
        createPeriodMeasurement('2024-01-02'),
      ];

      const { result } = renderHook(() => useCyclePredictions(measurements, mockStats));

      // Ovulation should be 14 days before next period (2024-01-29 - 14 = 2024-01-15)
      expect(result.current.isPredictedOvulation('2024-01-15')).toBe(true);
      expect(result.current.isPredictedOvulation('2024-01-14')).toBe(false);
      expect(result.current.isPredictedOvulation('2024-01-16')).toBe(false);
    });

    it('uses whole number cycle lengths for predictions', () => {
      // Test with stats that are already rounded (as they should be from calculateCycleStats)
      const roundedStats: CycleStats = {
        averageCycleLength: 29, // Already rounded
        cycleVariation: 2.5,
        averagePeriodLength: 5
      };

      const measurements: Measurement[] = [
        createPeriodMeasurement('2024-01-01'),
        createPeriodMeasurement('2024-01-02'),
      ];

      const { result } = renderHook(() => useCyclePredictions(measurements, roundedStats));

      // With 29-day cycle: next period = 2024-01-30, ovulation = 2024-01-16 (30 - 14)
      expect(result.current.isPredictedOvulation('2024-01-16')).toBe(true);
      expect(result.current.isPredictedOvulation('2024-01-15')).toBe(false);
    });
  });

  describe('isInFertileWindow', () => {
    it('returns false when no stats available', () => {
      const measurements: Measurement[] = [];
      const { result } = renderHook(() => useCyclePredictions(measurements, null));

      expect(result.current.isInFertileWindow('2024-01-15')).toBe(false);
    });

    it('detects current cycle fertile window', () => {
      const measurements: Measurement[] = [
        createPeriodMeasurement('2024-01-01'), // 14 days ago - last period start
        createPeriodMeasurement('2024-01-02'),
      ];

      const { result } = renderHook(() => useCyclePredictions(measurements, mockStats));

      // Fertile window: 5 days before ovulation (2024-01-15) to 1 day after
      // So 2024-01-10 to 2024-01-16
      expect(result.current.isInFertileWindow('2024-01-09')).toBe(false);
      expect(result.current.isInFertileWindow('2024-01-10')).toBe(true);
      expect(result.current.isInFertileWindow('2024-01-15')).toBe(true); // Ovulation day
      expect(result.current.isInFertileWindow('2024-01-16')).toBe(true);
      expect(result.current.isInFertileWindow('2024-01-17')).toBe(false);
    });
  });

  describe('isToday', () => {
    it('correctly identifies today', () => {
      const { result } = renderHook(() => useCyclePredictions([], null));

      expect(result.current.isToday('2024-01-15')).toBe(true); // Mocked date
      expect(result.current.isToday('2024-01-14')).toBe(false);
      expect(result.current.isToday('2024-01-16')).toBe(false);
    });
  });
});