import type { Measurement } from '../../types';
import { PERIOD_OPTIONS, SYMPTOM_SEVERITY } from '../../utils/constants';
import { formatLocalDate } from '../../utils/dateUtils';

export interface MockUserData {
  uid: string;
  email: string;
  measurements: Measurement[];
}

/**
 * Generate realistic measurement data for testing
 */
export class MockDataFactory {
  static createPeriodMeasurement(
    date: string | Date, 
    option: string = PERIOD_OPTIONS.MEDIUM,
    id?: string
  ): Measurement {
    const dateStr = typeof date === 'string' ? date : formatLocalDate(date);
    return {
      id: id || `period-${dateStr}-${Math.random().toString(36).substr(2, 9)}`,
      date: dateStr,
      type: 'period',
      value: { option }
    };
  }

  static createBBTMeasurement(
    date: string | Date, 
    temperature: number,
    id?: string
  ): Measurement {
    const dateStr = typeof date === 'string' ? date : formatLocalDate(date);
    return {
      id: id || `bbt-${dateStr}-${Math.random().toString(36).substr(2, 9)}`,
      date: dateStr,
      type: 'bbt',
      value: { temperature }
    };
  }

  static createSymptomMeasurement(
    date: string | Date,
    type: 'cramps' | 'sore_breasts',
    severity: string = SYMPTOM_SEVERITY.MILD,
    id?: string
  ): Measurement {
    const dateStr = typeof date === 'string' ? date : formatLocalDate(date);
    return {
      id: id || `${type}-${dateStr}-${Math.random().toString(36).substr(2, 9)}`,
      date: dateStr,
      type,
      value: { severity }
    };
  }

  /**
   * Generate a complete cycle with realistic data
   */
  static createCompleteCycle(
    startDate: Date,
    cycleLength: number = 28,
    periodLength: number = 5
  ): Measurement[] {
    const measurements: Measurement[] = [];
    const baseDate = new Date(startDate);

    // Period days - gradually decreasing flow
    for (let day = 0; day < periodLength; day++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + day);
      
      let flow: string;
      if (day === 0) flow = PERIOD_OPTIONS.MEDIUM;
      else if (day === 1) flow = PERIOD_OPTIONS.HEAVY;
      else if (day === 2) flow = PERIOD_OPTIONS.MEDIUM;
      else if (day === 3) flow = PERIOD_OPTIONS.LIGHT;
      else flow = PERIOD_OPTIONS.SPOTTING;

      measurements.push(this.createPeriodMeasurement(currentDate, flow));
    }

    // BBT measurements throughout cycle
    for (let day = 0; day < cycleLength; day++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + day);
      
      // Simulate biphasic temperature pattern
      const ovulationDay = Math.round(cycleLength * 0.5);
      const baseTemp = 36.2;
      const tempShift = day >= ovulationDay ? 0.4 : 0;
      const randomVariation = (Math.random() - 0.5) * 0.3;
      const temperature = baseTemp + tempShift + randomVariation;

      measurements.push(this.createBBTMeasurement(currentDate, Math.round(temperature * 10) / 10));
    }

    // Add some symptoms randomly
    const symptomsData = [
      { day: 0, type: 'cramps' as const, severity: SYMPTOM_SEVERITY.MODERATE },
      { day: 1, type: 'cramps' as const, severity: SYMPTOM_SEVERITY.SEVERE },
      { day: 15, type: 'sore_breasts' as const, severity: SYMPTOM_SEVERITY.MILD },
      { day: 25, type: 'cramps' as const, severity: SYMPTOM_SEVERITY.MILD },
    ];

    symptomsData.forEach(({ day, type, severity }) => {
      if (day < cycleLength) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + day);
        measurements.push(this.createSymptomMeasurement(currentDate, type, severity));
      }
    });

    return measurements;
  }

  /**
   * Generate multiple cycles with variation
   */
  static createMultipleCycles(
    startDate: Date,
    numberOfCycles: number,
    options: {
      avgCycleLength?: number;
      avgPeriodLength?: number;
      variation?: number;
    } = {}
  ): Measurement[] {
    const {
      avgCycleLength = 28,
      avgPeriodLength = 5,
      variation = 3
    } = options;

    const allMeasurements: Measurement[] = [];
    const currentDate = new Date(startDate);

    for (let cycle = 0; cycle < numberOfCycles; cycle++) {
      const cycleLength = avgCycleLength + (Math.random() - 0.5) * variation * 2;
      const periodLength = Math.max(3, avgPeriodLength + (Math.random() - 0.5) * 2);

      const cycleMeasurements = this.createCompleteCycle(
        currentDate,
        Math.round(cycleLength),
        Math.round(periodLength)
      );

      allMeasurements.push(...cycleMeasurements);

      // Move to next cycle
      currentDate.setDate(currentDate.getDate() + Math.round(cycleLength));
    }

    return allMeasurements;
  }

  /**
   * Create test user with realistic data
   */
  static createMockUser(
    uid: string = 'test-user-123',
    cyclesCount: number = 3
  ): MockUserData {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (cyclesCount * 28)); // Start N cycles ago

    return {
      uid,
      email: `test-${uid}@example.com`,
      measurements: this.createMultipleCycles(startDate, cyclesCount)
    };
  }

  /**
   * Create edge case scenarios
   */
  static createEdgeCaseScenarios() {
    return {
      // Very irregular cycles
      irregularCycles: this.createMultipleCycles(
        new Date('2024-01-01'),
        4,
        { avgCycleLength: 28, variation: 10 }
      ),
      
      // Long cycles (PCOS-like)
      longCycles: this.createMultipleCycles(
        new Date('2024-01-01'),
        3,
        { avgCycleLength: 45, avgPeriodLength: 7, variation: 5 }
      ),

      // Short cycles
      shortCycles: this.createMultipleCycles(
        new Date('2024-01-01'),
        5,
        { avgCycleLength: 21, avgPeriodLength: 3, variation: 2 }
      ),

      // Single incomplete cycle
      incompleteData: [
        this.createPeriodMeasurement('2024-01-01', PERIOD_OPTIONS.MEDIUM),
        this.createBBTMeasurement('2024-01-01', 36.4),
      ]
    };
  }
}