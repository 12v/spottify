import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PERIOD_OPTIONS } from './constants';
import { DataService } from '../services/dataService';
import type { Measurement } from '../types';

interface RawMeasurement {
  type: string;
  id: string;
  date: string;
  value: any;
}

export async function importMeasurements(userId: string, file: File) {
  const fileText = await file.text();
  const measurements = JSON.parse(fileText) as RawMeasurement[];
  const measurementsCollection = collection(db, 'measurements');
  const dataService = DataService.getInstance();
  
  console.log(`Starting import of ${measurements.length} measurements...`);
  
  const existingMeasurements = await dataService.getMeasurements(userId);
  const existingKeys = new Set(
    existingMeasurements.map(m => `${m.date}-${m.type}`)
  );
  
  let imported = 0;
  let skipped = 0;
  let duplicates = 0;
  
  for (const measurement of measurements) {
    try {
      let convertedMeasurement: Omit<Measurement, 'id'>;
      
      switch (measurement.type) {
        case 'period': {
          const validOptions = Object.values(PERIOD_OPTIONS);
          if (!validOptions.includes(measurement.value.option)) {
            console.error(`Invalid period option: ${measurement.value.option} for measurement ${measurement.id}`);
            skipped++;
            continue;
          }
          convertedMeasurement = {
            type: 'period',
            date: measurement.date,
            value: { option: measurement.value.option }
          };
          break;
        }
          
        case 'bbt':
          if (measurement.value.celsius) {
            convertedMeasurement = {
              type: 'bbt',
              date: measurement.date,
              value: { celsius: measurement.value.celsius }
            };
          } else {
            skipped++;
            continue;
          }
          break;
          
        case 'spotting':
          convertedMeasurement = {
            type: 'period',
            date: measurement.date,
            value: { option: 'spotting' }
          };
          break;
          
        default:
          skipped++;
          continue;
      }
      
      const duplicateKey = `${convertedMeasurement.date}-${convertedMeasurement.type}`;
      if (existingKeys.has(duplicateKey)) {
        duplicates++;
        continue;
      }
      
      await addDoc(measurementsCollection, {
        ...convertedMeasurement,
        userId,
        createdAt: Timestamp.now()
      });
      
      imported++;
      
      if (imported % 10 === 0) {
        console.log(`Imported ${imported} measurements...`);
      }
      
    } catch (error) {
      console.error(`Error importing measurement ${measurement.id}:`, error);
      skipped++;
    }
  }
  
  console.log(`Import complete! Imported: ${imported}, Skipped: ${skipped}, Duplicates: ${duplicates}`);
  return { imported, skipped, duplicates };
}