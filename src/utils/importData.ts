import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
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
  
  console.log(`Starting import of ${measurements.length} measurements...`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const measurement of measurements) {
    try {
      // Convert the measurement to our format
      let convertedMeasurement: Omit<Measurement, 'id'>;
      
      switch (measurement.type) {
        case 'period':
          const validOptions = ['none', 'spotting', 'light', 'medium', 'heavy'];
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
          
        default:
          // Skip types we don't support (energy, exercise, feelings, mind, etc.)
          skipped++;
          continue;
      }
      
      // Add to Firestore
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
  
  console.log(`Import complete! Imported: ${imported}, Skipped: ${skipped}`);
  return { imported, skipped };
}