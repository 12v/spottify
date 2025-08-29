import { CycleService } from '../services/cycleService';
import { formatLocalDate } from '../utils/dateUtils';
import type { Measurement, CycleStats } from '../types';

export function useCyclePredictions(measurements: Measurement[], stats: CycleStats | null) {

  function isPredictedPeriod(dateStr: string) {
    if (!stats) return false;

    const lastPeriodStart = CycleService.getLastPeriodStart(measurements);
    if (!lastPeriodStart) return false;

    const checkDate = new Date(dateStr);
    const averageCycleLength = Math.round(stats.averageCycleLength);
    const averagePeriodLength = Math.round(stats.averagePeriodLength);

    // Calculate which cycle this date might belong to
    const daysSinceLastPeriod = Math.floor((checkDate.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastPeriod < averageCycleLength) return false; // Still in current cycle

    const cycleNumber = Math.floor(daysSinceLastPeriod / averageCycleLength);
    const periodStartDate = new Date(lastPeriodStart.getTime() + (cycleNumber * averageCycleLength * 24 * 60 * 60 * 1000));
    const daysDiff = Math.floor((checkDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysDiff >= 0 && daysDiff < averagePeriodLength;
  }

  function isPredictedOvulation(dateStr: string) {
    if (!stats) return false;

    const lastPeriodStart = CycleService.getLastPeriodStart(measurements);
    if (!lastPeriodStart) return false;

    const checkDate = new Date(dateStr);
    const averageCycleLength = Math.round(stats.averageCycleLength);

    const daysSinceLastPeriod = Math.floor((checkDate.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24));

    // Current cycle ovulation (14 days before next expected period)
    const currentOvulation = new Date(lastPeriodStart.getTime() + (averageCycleLength - 14) * 24 * 60 * 60 * 1000);
    if (formatLocalDate(checkDate) === formatLocalDate(currentOvulation)) return true;

    // Future cycles
    if (daysSinceLastPeriod < averageCycleLength) return false;

    const cycleNumber = Math.floor(daysSinceLastPeriod / averageCycleLength);
    const ovulationDate = new Date(lastPeriodStart.getTime() + (cycleNumber * averageCycleLength + (averageCycleLength - 14)) * 24 * 60 * 60 * 1000);

    return formatLocalDate(checkDate) === formatLocalDate(ovulationDate);
  }

  function isInFertileWindow(dateStr: string) {
    if (!stats) return false;

    const lastPeriodStart = CycleService.getLastPeriodStart(measurements);
    if (!lastPeriodStart) return false;

    const checkDate = new Date(dateStr);
    const averageCycleLength = Math.round(stats.averageCycleLength);

    const daysSinceLastPeriod = Math.floor((checkDate.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24));

    // Current cycle fertile window
    const currentOvulation = new Date(lastPeriodStart.getTime() + (averageCycleLength - 14) * 24 * 60 * 60 * 1000);
    const currentFertileStart = new Date(currentOvulation.getTime() - (5 * 24 * 60 * 60 * 1000));
    const currentFertileEnd = new Date(currentOvulation.getTime() + (1 * 24 * 60 * 60 * 1000));

    if (checkDate >= currentFertileStart && checkDate <= currentFertileEnd) return true;

    // Future cycles
    if (daysSinceLastPeriod < averageCycleLength) return false;

    const cycleNumber = Math.floor(daysSinceLastPeriod / averageCycleLength);
    const ovulationDate = new Date(lastPeriodStart.getTime() + (cycleNumber * averageCycleLength + (averageCycleLength - 14)) * 24 * 60 * 60 * 1000);
    const fertileStart = new Date(ovulationDate.getTime() - (5 * 24 * 60 * 60 * 1000));
    const fertileEnd = new Date(ovulationDate.getTime() + (1 * 24 * 60 * 60 * 1000));

    return checkDate >= fertileStart && checkDate <= fertileEnd;
  }

  function isToday(dateStr: string) {
    const today = formatLocalDate(new Date());
    return dateStr === today;
  }

  return {
    isPredictedPeriod,
    isPredictedOvulation,
    isInFertileWindow,
    isToday
  };
}