import { formatLocalDate, formatDisplayDate } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatLocalDate', () => {
    it('formats date to YYYY-MM-DD format', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatLocalDate(date)).toBe('2024-01-15');
    });

    it('pads single digit months and days', () => {
      const date = new Date(2024, 8, 5); // September 5, 2024
      expect(formatLocalDate(date)).toBe('2024-09-05');
    });

    it('handles leap year dates', () => {
      const date = new Date(2024, 1, 29); // February 29, 2024
      expect(formatLocalDate(date)).toBe('2024-02-29');
    });
  });

  describe('formatDisplayDate', () => {
    it('formats date string for display', () => {
      const result = formatDisplayDate('2024-01-15');
      // Note: toLocaleDateString output varies by system locale
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/1/);
    });

    it('handles different date formats', () => {
      const result = formatDisplayDate('2024-12-31');
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/31/);
      expect(result).toMatch(/12/);
    });
  });
});