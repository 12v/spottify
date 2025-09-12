import { CYCLE_CONSTANTS, TIME_CONSTANTS, PERIOD_OPTIONS, SYMPTOM_SEVERITY } from '../constants';

describe('constants', () => {
  describe('CYCLE_CONSTANTS', () => {
    it('has minimum cycles requirement for predictions', () => {
      expect(CYCLE_CONSTANTS.MINIMUM_CYCLES_FOR_PREDICTIONS).toBe(2);
    });

    it('has ovulation timing constants', () => {
      expect(CYCLE_CONSTANTS.DAYS_BEFORE_PERIOD_FOR_OVULATION).toBe(14);
      expect(CYCLE_CONSTANTS.FERTILE_WINDOW_START_DAYS_BEFORE_OVULATION).toBe(5);
      expect(CYCLE_CONSTANTS.FERTILE_WINDOW_END_DAYS_AFTER_OVULATION).toBe(1);
    });

    it('has cycle validation constants', () => {
      expect(CYCLE_CONSTANTS.MINIMUM_GAP_BETWEEN_PERIODS_DAYS).toBe(7);
    });
  });

  describe('PERIOD_OPTIONS', () => {
    it('has all expected period flow options', () => {
      expect(PERIOD_OPTIONS.NONE).toBe('none');
      expect(PERIOD_OPTIONS.SPOTTING).toBe('spotting');
      expect(PERIOD_OPTIONS.LIGHT).toBe('light');
      expect(PERIOD_OPTIONS.MEDIUM).toBe('medium');
      expect(PERIOD_OPTIONS.HEAVY).toBe('heavy');
    });

    it('has unique values', () => {
      const values = Object.values(PERIOD_OPTIONS);
      expect(new Set(values).size).toBe(values.length);
    });
  });

  describe('SYMPTOM_SEVERITY', () => {
    it('has all expected severity levels', () => {
      expect(SYMPTOM_SEVERITY.NONE).toBe('none');
      expect(SYMPTOM_SEVERITY.MILD).toBe('mild');
      expect(SYMPTOM_SEVERITY.MODERATE).toBe('moderate');
      expect(SYMPTOM_SEVERITY.SEVERE).toBe('severe');
    });
  });

  describe('TIME_CONSTANTS', () => {
    it('has correct milliseconds per day', () => {
      expect(TIME_CONSTANTS.MILLISECONDS_PER_DAY).toBe(24 * 60 * 60 * 1000);
    });
  });
});