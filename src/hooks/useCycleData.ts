import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { DataService } from '../services/dataService';
import { CycleService } from '../services/cycleService';
import { PERIOD_OPTIONS, SYMPTOM_SEVERITY, LH_SURGE_STATUS } from '../utils/constants';
import type { Measurement, CycleStats } from '../types';

export function useCycleData() {
  const { currentUser } = useAuth();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [groupedMeasurements, setGroupedMeasurements] = useState<Record<string, Measurement[]>>({});
  const [stats, setStats] = useState<CycleStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!currentUser) return;

    setLoading(true);
    try {
      const data = await DataService.getInstance().getMeasurements(currentUser.uid);
      setMeasurements(data);

      const grouped = data.reduce((acc, measurement) => {
        if (!acc[measurement.date]) {
          acc[measurement.date] = [];
        }
        acc[measurement.date].push(measurement);
        return acc;
      }, {} as Record<string, Measurement[]>);

      setGroupedMeasurements(grouped);

      // Just calculate stats, we'll do predictions per month
      const cycleStats = CycleService.calculateCycleStats(data);
      setStats(cycleStats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveMeasurement(date: string, type: string, value: string | number | boolean) {
    if (!currentUser) return;

    const existing = groupedMeasurements[date]?.find(m => m.type === type);

    if (type === 'period' || type === 'cramps' || type === 'sore_breasts') {
      if (value === PERIOD_OPTIONS.NONE || value === SYMPTOM_SEVERITY.NONE) {
        if (existing) {
          await DataService.getInstance().deleteMeasurement(currentUser.uid, existing.id);
        }
      } else {
        await DataService.getInstance().addMeasurement(currentUser.uid, {
          type,
          date,
          value: type === 'period' ? { option: value as string } : { severity: value as string }
        });
      }
    } else if (type === 'lh_surge') {
      if (value === LH_SURGE_STATUS.NOT_DETECTED) {
        if (existing) {
          await DataService.getInstance().deleteMeasurement(currentUser.uid, existing.id);
        }
      } else {
        await DataService.getInstance().addMeasurement(currentUser.uid, {
          type: 'lh_surge',
          date,
          value: { detected: true }
        });
      }
    } else if (type === 'bbt' && value) {
      await DataService.getInstance().addMeasurement(currentUser.uid, {
        type,
        date,
        value: { temperature: parseFloat(value as string) }
      });
    }
  }

  async function saveBatchMeasurements(date: string, measurements: Array<{type: string, value: string | number | boolean}>) {
    if (!currentUser) return;

    try {
      for (const measurement of measurements) {
        await saveMeasurement(date, measurement.type, measurement.value);
      }
      await loadData();
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  return {
    measurements,
    groupedMeasurements,
    stats,
    loading,
    loadData,
    saveBatchMeasurements
  };
}