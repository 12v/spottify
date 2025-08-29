import type { Measurement, CycleStats, Prediction, MultiplePredictions } from '../types';

export class CycleService {
  static calculateCycleStats(measurements: Measurement[]): CycleStats {
    const periodMeasurements = measurements
      .filter(m => m.type === 'period' && (m.value as any).option !== 'none')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (periodMeasurements.length < 2) {
      return {
        averageCycleLength: 28,
        cycleVariation: 0,
        averagePeriodLength: 5
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
    
    console.log('Cycle prediction debug:', {
      averageCycleLength: stats.averageCycleLength,
      lastPeriodStart: lastPeriodStart?.toISOString().split('T')[0],
      periodCount: measurements.filter(m => m.type === 'period' && (m.value as any).option !== 'none').length
    });
    
    if (!lastPeriodStart) {
      const today = new Date();
      return {
        nextPeriod: this.formatLocalDate(new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000)),
        ovulation: this.formatLocalDate(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)),
        fertileWindow: {
          start: this.formatLocalDate(new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)),
          end: this.formatLocalDate(new Date(today.getTime() + 16 * 24 * 60 * 60 * 1000))
        }
      };
    }

    const nextPeriodDate = new Date(lastPeriodStart.getTime() + stats.averageCycleLength * 24 * 60 * 60 * 1000);
    const ovulationDate = new Date(nextPeriodDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    return {
      nextPeriod: this.formatLocalDate(nextPeriodDate),
      ovulation: this.formatLocalDate(ovulationDate),
      fertileWindow: {
        start: this.formatLocalDate(new Date(ovulationDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
        end: this.formatLocalDate(new Date(ovulationDate.getTime() + 1 * 24 * 60 * 60 * 1000))
      }
    };
  }

  static predictMultipleCycles(measurements: Measurement[], maxMonthsAhead = 12): MultiplePredictions {
    const stats = this.calculateCycleStats(measurements);
    const lastPeriodStart = this.getLastPeriodStart(measurements);
    const predictions: Prediction[] = [];
    
    if (!lastPeriodStart) {
      // Fallback to current date if no period data
      const today = new Date();
      for (let i = 1; i <= Math.min(maxMonthsAhead, 12); i++) {
        const periodDate = new Date(today.getTime() + (i * 28 * 24 * 60 * 60 * 1000));
        const ovulationDate = new Date(periodDate.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        predictions.push({
          nextPeriod: this.formatLocalDate(periodDate),
          ovulation: this.formatLocalDate(ovulationDate),
          fertileWindow: {
            start: this.formatLocalDate(new Date(ovulationDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
            end: this.formatLocalDate(new Date(ovulationDate.getTime() + 1 * 24 * 60 * 60 * 1000))
          }
        });
      }
      return { predictions, stats };
    }

    // Calculate multiple future cycles
    let currentPeriodStart = lastPeriodStart;
    const cycleLength = Math.round(stats.averageCycleLength);
    
    for (let i = 1; i <= Math.min(maxMonthsAhead, 12); i++) {
      const nextPeriodDate = new Date(currentPeriodStart.getTime() + (cycleLength * 24 * 60 * 60 * 1000));
      const ovulationDate = new Date(nextPeriodDate.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      predictions.push({
        nextPeriod: this.formatLocalDate(nextPeriodDate),
        ovulation: this.formatLocalDate(ovulationDate),
        fertileWindow: {
          start: this.formatLocalDate(new Date(ovulationDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
          end: this.formatLocalDate(new Date(ovulationDate.getTime() + 1 * 24 * 60 * 60 * 1000))
        }
      });
      
      currentPeriodStart = nextPeriodDate;
    }

    return { predictions, stats };
  }

  private static calculateWeightedAverage(values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    let weightedSum = 0;
    let totalWeight = 0;

    // More recent values get higher weights (exponential decay)
    for (let i = 0; i < values.length; i++) {
      const weight = Math.pow(0.8, values.length - 1 - i); // More recent = higher weight
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
      const daysDiff = Math.floor((current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000));

      if (daysDiff > 7) { // New cycle started
        const cycleEnd = i - 1;
        const cycleData = periodMeasurements.slice(currentCycleStart, cycleEnd + 1);
        const cycleStartDate = new Date(cycleData[0].date);
        const cycleEndDate = new Date(periodMeasurements[i].date);
        
        cycles.push({
          length: Math.floor((cycleEndDate.getTime() - cycleStartDate.getTime()) / (24 * 60 * 60 * 1000)),
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

  static getLastPeriodStart(measurements: Measurement[]): Date | null {
    const periodMeasurements = measurements
      .filter(m => m.type === 'period' && (m.value as any).option !== 'none')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (periodMeasurements.length === 0) return null;

    // Find the start of the most recent period by looking for gaps
    let periodStart = periodMeasurements[0].date;
    
    for (let i = 1; i < periodMeasurements.length; i++) {
      const currentDate = new Date(periodMeasurements[i - 1].date);
      const nextDate = new Date(periodMeasurements[i].date);
      const daysDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (24 * 60 * 60 * 1000));
      
      // If there's a gap of more than 1 day, we've found the start of the current period
      if (daysDiff > 1) {
        break;
      }
      periodStart = periodMeasurements[i].date;
    }

    console.log('Period start debug:', {
      mostRecentPeriodStart: periodStart,
      allRecentDays: periodMeasurements.slice(0, 10).map(m => m.date)
    });

    return new Date(periodStart);
  }

  private static formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}