import { useMemo } from 'react';
import { CycleService } from '../services/cycleService';
import { formatLocalDate } from '../utils/dateUtils';
import { CYCLE_CONSTANTS, TIME_CONSTANTS } from '../utils/constants';
import type { Measurement, CycleStats } from '../types';

export function useCyclePredictions(measurements: Measurement[], stats: CycleStats | null) {

  const isPredictedPeriod = useMemo(() => (dateStr: string) => {
    if (!stats) return false;

    const lastPeriodStart = CycleService.getLastPeriodStart(measurements);
    if (!lastPeriodStart) return false;

    const checkDate = new Date(dateStr);

    const daysSinceLastPeriod = Math.floor((checkDate.getTime() - lastPeriodStart.getTime()) / TIME_CONSTANTS.MILLISECONDS_PER_DAY);

    // Check if we're currently in the ongoing period (from last period start)
    if (daysSinceLastPeriod >= 0 && daysSinceLastPeriod < stats.averagePeriodLength) {
      return true;
    }

    // Check for future periods
    if (daysSinceLastPeriod < stats.averageCycleLength) return false;

    const cycleNumber = Math.floor(daysSinceLastPeriod / stats.averageCycleLength);
    const periodStartDate = new Date(lastPeriodStart.getTime() + (cycleNumber * stats.averageCycleLength * TIME_CONSTANTS.MILLISECONDS_PER_DAY));
    const daysDiff = Math.floor((checkDate.getTime() - periodStartDate.getTime()) / TIME_CONSTANTS.MILLISECONDS_PER_DAY);

    return daysDiff >= 0 && daysDiff < stats.averagePeriodLength;
  }, [measurements, stats]);

  const isPredictedOvulation = useMemo(() => (dateStr: string) => {
    if (!stats) return false;

    const lastPeriodStart = CycleService.getLastPeriodStart(measurements);
    if (!lastPeriodStart) return false;

    const checkDate = new Date(dateStr);

    const daysSinceLastPeriod = Math.floor((checkDate.getTime() - lastPeriodStart.getTime()) / TIME_CONSTANTS.MILLISECONDS_PER_DAY);

    const currentOvulation = new Date(lastPeriodStart.getTime() + (stats.averageCycleLength - CYCLE_CONSTANTS.DAYS_BEFORE_PERIOD_FOR_OVULATION) * TIME_CONSTANTS.MILLISECONDS_PER_DAY);
    if (formatLocalDate(checkDate) === formatLocalDate(currentOvulation)) return true;

    if (daysSinceLastPeriod < stats.averageCycleLength) return false;

    const cycleNumber = Math.floor(daysSinceLastPeriod / stats.averageCycleLength);
    const ovulationDate = new Date(lastPeriodStart.getTime() + (cycleNumber * stats.averageCycleLength + (stats.averageCycleLength - CYCLE_CONSTANTS.DAYS_BEFORE_PERIOD_FOR_OVULATION)) * TIME_CONSTANTS.MILLISECONDS_PER_DAY);

    return formatLocalDate(checkDate) === formatLocalDate(ovulationDate);
  }, [measurements, stats]);

  const isInFertileWindow = useMemo(() => (dateStr: string) => {
    if (!stats) return false;

    const lastPeriodStart = CycleService.getLastPeriodStart(measurements);
    if (!lastPeriodStart) return false;

    const checkDate = new Date(dateStr);

    const daysSinceLastPeriod = Math.floor((checkDate.getTime() - lastPeriodStart.getTime()) / TIME_CONSTANTS.MILLISECONDS_PER_DAY);

    const currentOvulation = new Date(lastPeriodStart.getTime() + (stats.averageCycleLength - CYCLE_CONSTANTS.DAYS_BEFORE_PERIOD_FOR_OVULATION) * TIME_CONSTANTS.MILLISECONDS_PER_DAY);
    const currentFertileStart = new Date(currentOvulation.getTime() - (CYCLE_CONSTANTS.FERTILE_WINDOW_START_DAYS_BEFORE_OVULATION * TIME_CONSTANTS.MILLISECONDS_PER_DAY));
    const currentFertileEnd = new Date(currentOvulation.getTime() + (CYCLE_CONSTANTS.FERTILE_WINDOW_END_DAYS_AFTER_OVULATION * TIME_CONSTANTS.MILLISECONDS_PER_DAY));

    if (checkDate >= currentFertileStart && checkDate <= currentFertileEnd) return true;

    if (daysSinceLastPeriod < stats.averageCycleLength) return false;

    const cycleNumber = Math.floor(daysSinceLastPeriod / stats.averageCycleLength);
    const ovulationDate = new Date(lastPeriodStart.getTime() + (cycleNumber * stats.averageCycleLength + (stats.averageCycleLength - CYCLE_CONSTANTS.DAYS_BEFORE_PERIOD_FOR_OVULATION)) * TIME_CONSTANTS.MILLISECONDS_PER_DAY);
    const fertileStart = new Date(ovulationDate.getTime() - (CYCLE_CONSTANTS.FERTILE_WINDOW_START_DAYS_BEFORE_OVULATION * TIME_CONSTANTS.MILLISECONDS_PER_DAY));
    const fertileEnd = new Date(ovulationDate.getTime() + (CYCLE_CONSTANTS.FERTILE_WINDOW_END_DAYS_AFTER_OVULATION * TIME_CONSTANTS.MILLISECONDS_PER_DAY));

    return checkDate >= fertileStart && checkDate <= fertileEnd;
  }, [measurements, stats]);

  const isToday = useMemo(() => (dateStr: string) => {
    const today = formatLocalDate(new Date());
    return dateStr === today;
  }, []);

  return {
    isPredictedPeriod,
    isPredictedOvulation,
    isInFertileWindow,
    isToday
  };
}