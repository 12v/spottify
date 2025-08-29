import type { Measurement, CycleStats, Prediction } from '../types';

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
    
    if (!lastPeriodStart) {
      const today = new Date();
      return {
        nextPeriod: new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ovulation: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fertileWindow: {
          start: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date(today.getTime() + 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      };
    }

    const nextPeriodDate = new Date(lastPeriodStart.getTime() + stats.averageCycleLength * 24 * 60 * 60 * 1000);
    const ovulationDate = new Date(nextPeriodDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    return {
      nextPeriod: nextPeriodDate.toISOString().split('T')[0],
      ovulation: ovulationDate.toISOString().split('T')[0],
      fertileWindow: {
        start: new Date(ovulationDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date(ovulationDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    };
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

  private static getLastPeriodStart(measurements: Measurement[]): Date | null {
    const periodMeasurements = measurements
      .filter(m => m.type === 'period' && (m.value as any).option !== 'none')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return periodMeasurements.length > 0 ? new Date(periodMeasurements[0].date) : null;
  }
}