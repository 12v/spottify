import type { Measurement, CycleStats, Prediction } from '../types';
import { formatLocalDate } from '../utils/dateUtils';
import { CYCLE_CONSTANTS, TIME_CONSTANTS, PERIOD_OPTIONS } from '../utils/constants';

export class CycleService {
  static calculateCycleStats(measurements: Measurement[]): CycleStats {
    const periodMeasurements = measurements
      .filter(m => m.type === 'period' && (m.value as { option: string }).option !== PERIOD_OPTIONS.NONE && (m.value as { option: string }).option !== PERIOD_OPTIONS.SPOTTING)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (periodMeasurements.length < CYCLE_CONSTANTS.MINIMUM_CYCLES_FOR_PREDICTIONS) {
      return {
        averageCycleLength: CYCLE_CONSTANTS.DEFAULT_CYCLE_LENGTH,
        cycleVariation: 0,
        averagePeriodLength: CYCLE_CONSTANTS.DEFAULT_PERIOD_LENGTH
      };
    }

    const cycles = this.extractCycles(periodMeasurements);
    const cycleLengths = cycles.map(cycle => cycle.length);
    const periodLengths = cycles.map(cycle => cycle.periodLength);

    return {
      averageCycleLength: this.calculateWeightedAverage(cycleLengths),
      cycleVariation: this.calculateVariation(cycleLengths),
      averagePeriodLength: this.calculateWeightedAverage(periodLengths)
    };
  }

  static predictNextCycle(measurements: Measurement[]): Prediction {
    const stats = this.calculateCycleStats(measurements);
    const lastPeriodStart = this.getLastPeriodStart(measurements);
    
    
    if (!lastPeriodStart) {
      const today = new Date();
      const defaultCycleDays = CYCLE_CONSTANTS.DEFAULT_CYCLE_LENGTH * TIME_CONSTANTS.MILLISECONDS_PER_DAY;
      const ovulationDays = CYCLE_CONSTANTS.DAYS_BEFORE_PERIOD_FOR_OVULATION * TIME_CONSTANTS.MILLISECONDS_PER_DAY;
      const fertileStartDays = (CYCLE_CONSTANTS.DAYS_BEFORE_PERIOD_FOR_OVULATION - CYCLE_CONSTANTS.FERTILE_WINDOW_START_DAYS_BEFORE_OVULATION) * TIME_CONSTANTS.MILLISECONDS_PER_DAY;
      const fertileEndDays = (CYCLE_CONSTANTS.DAYS_BEFORE_PERIOD_FOR_OVULATION + CYCLE_CONSTANTS.FERTILE_WINDOW_END_DAYS_AFTER_OVULATION) * TIME_CONSTANTS.MILLISECONDS_PER_DAY;
      
      return {
        nextPeriod: formatLocalDate(new Date(today.getTime() + defaultCycleDays)),
        ovulation: formatLocalDate(new Date(today.getTime() + ovulationDays)),
        fertileWindow: {
          start: formatLocalDate(new Date(today.getTime() + fertileStartDays)),
          end: formatLocalDate(new Date(today.getTime() + fertileEndDays))
        }
      };
    }

    const nextPeriodDate = new Date(lastPeriodStart.getTime() + stats.averageCycleLength * TIME_CONSTANTS.MILLISECONDS_PER_DAY);
    const ovulationDate = new Date(nextPeriodDate.getTime() - CYCLE_CONSTANTS.DAYS_BEFORE_PERIOD_FOR_OVULATION * TIME_CONSTANTS.MILLISECONDS_PER_DAY);
    
    return {
      nextPeriod: formatLocalDate(nextPeriodDate),
      ovulation: formatLocalDate(ovulationDate),
      fertileWindow: {
        start: formatLocalDate(new Date(ovulationDate.getTime() - CYCLE_CONSTANTS.FERTILE_WINDOW_START_DAYS_BEFORE_OVULATION * TIME_CONSTANTS.MILLISECONDS_PER_DAY)),
        end: formatLocalDate(new Date(ovulationDate.getTime() + CYCLE_CONSTANTS.FERTILE_WINDOW_END_DAYS_AFTER_OVULATION * TIME_CONSTANTS.MILLISECONDS_PER_DAY))
      }
    };
  }


  private static calculateWeightedAverage(values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < values.length; i++) {
      const weight = Math.pow(0.8, values.length - 1 - i);
      weightedSum += values[i] * weight;
      totalWeight += weight;
    }

    return weightedSum / totalWeight;
  }

  private static extractCycles(periodMeasurements: Measurement[]) {
    const cycles = [];
    let currentCycleStart = 0;

    for (let i = 1; i < periodMeasurements.length; i++) {
      const current = new Date(periodMeasurements[i].date);
      const previous = new Date(periodMeasurements[i - 1].date);
      const daysDiff = Math.floor((current.getTime() - previous.getTime()) / TIME_CONSTANTS.MILLISECONDS_PER_DAY);

      if (daysDiff > CYCLE_CONSTANTS.MINIMUM_GAP_BETWEEN_PERIODS_DAYS) {
        const cycleEnd = i - 1;
        const cycleData = periodMeasurements.slice(currentCycleStart, cycleEnd + 1);
        const cycleStartDate = new Date(cycleData[0].date);
        const cycleEndDate = new Date(periodMeasurements[i].date);
        
        cycles.push({
          length: Math.floor((cycleEndDate.getTime() - cycleStartDate.getTime()) / TIME_CONSTANTS.MILLISECONDS_PER_DAY),
          periodLength: cycleData.length,
          measurements: cycleData
        });
        
        currentCycleStart = i;
      }
    }

    return cycles;
  }

  private static calculateVariation(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  static getCycleData(measurements: Measurement[]) {
    const periodMeasurements = measurements
      .filter(m => m.type === 'period' && (m.value as { option: string }).option !== PERIOD_OPTIONS.NONE && (m.value as { option: string }).option !== PERIOD_OPTIONS.SPOTTING)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (periodMeasurements.length < 2) return [];
    
    const cycles = this.extractCycles(periodMeasurements);
    return cycles.map((cycle, index) => ({
      cycleNumber: index + 1,
      cycleLength: cycle.length,
      periodLength: cycle.periodLength,
      startDate: cycle.measurements[0].date
    }));
  }

  static checkIncompleteData(measurements: Measurement[]): string[] {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentMeasurements = measurements.filter(m => 
      new Date(m.date) >= sixMonthsAgo && m.type === 'period'
    );
    
    const alerts = [];
    const monthsToCheck = [];
    
    for (let i = 0; i < 6; i++) {
      const checkDate = new Date();
      checkDate.setMonth(checkDate.getMonth() - i);
      monthsToCheck.push({
        year: checkDate.getFullYear(),
        month: checkDate.getMonth(),
        name: checkDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    
    for (const month of monthsToCheck) {
      const monthData = recentMeasurements.filter(m => {
        const date = new Date(m.date);
        return date.getFullYear() === month.year && date.getMonth() === month.month;
      });
      
      if (monthData.length > 0 && monthData.length < 3) {
        alerts.push(`${month.name}: Only ${monthData.length} period day(s) logged. Period may be incomplete - consider reviewing your data.`);
      }
    }
    
    return alerts;
  }

  static getCurrentCycleDay(measurements: Measurement[]): { cycleDay: number; cycleLength: number } | null {
    const lastPeriodStart = this.getLastPeriodStart(measurements);
    if (!lastPeriodStart) return null;
    
    const today = new Date();
    const daysSinceLastPeriod = Math.floor((today.getTime() - lastPeriodStart.getTime()) / TIME_CONSTANTS.MILLISECONDS_PER_DAY) + 1;
    
    const stats = this.calculateCycleStats(measurements);
    
    return {
      cycleDay: daysSinceLastPeriod,
      cycleLength: Math.round(stats.averageCycleLength)
    };
  }

  static getLastPeriodStart(measurements: Measurement[]): Date | null {
    const periodMeasurements = measurements
      .filter(m => m.type === 'period' && (m.value as { option: string }).option !== PERIOD_OPTIONS.NONE && (m.value as { option: string }).option !== PERIOD_OPTIONS.SPOTTING)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (periodMeasurements.length === 0) return null;

    let periodStart = periodMeasurements[0].date;
    
    for (let i = 1; i < periodMeasurements.length; i++) {
      const currentDate = new Date(periodMeasurements[i - 1].date);
      const nextDate = new Date(periodMeasurements[i].date);
      const daysDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / TIME_CONSTANTS.MILLISECONDS_PER_DAY);
      
      if (daysDiff > 1) {
        break;
      }
      periodStart = periodMeasurements[i].date;
    }

    return new Date(periodStart);
  }

}