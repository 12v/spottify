import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataService } from '../services/dataService';
import { CycleService } from '../services/cycleService';
import type { Measurement, CycleStats, MeasurementType } from '../types';

const dataService = new DataService();

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
      const data = await dataService.getMeasurements(currentUser.uid);
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

  async function saveMeasurement(date: string, type: MeasurementType, value: any) {
    if (!currentUser) return;

    try {
      const promises = [];

      // Handle measurement deletion for 'none' values
      const existing = groupedMeasurements[date]?.find(m => m.type === type);
      
      if (type === 'period' || type === 'cramps' || type === 'sore_breasts') {
        if (value === 'none') {
          if (existing) {
            promises.push(dataService.deleteMeasurement(currentUser.uid, existing.id));
          }
        } else {
          promises.push(dataService.addMeasurement(currentUser.uid, {
            type,
            date,
            value: type === 'period' ? { option: value } : { severity: value }
          }));
        }
      } else if (type === 'bbt' && value) {
        promises.push(dataService.addMeasurement(currentUser.uid, {
          type,
          date,
          value: { celsius: parseFloat(value) }
        }));
      }

      await Promise.all(promises);
      await loadData(); // Reload data
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
    saveMeasurement
  };
}