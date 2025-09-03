import { collection, addDoc, getDocs, query, orderBy, where, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Measurement } from '../types';

export class DataService {
  private static instance: DataService;
  private collection = collection(db, 'measurements');

  private constructor() {}

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  async addMeasurement(userId: string, measurement: Omit<Measurement, 'id'>): Promise<string> {
    const docRef = await addDoc(this.collection, {
      ...measurement,
      userId,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  }

  async getMeasurements(userId: string): Promise<Measurement[]> {
    const q = query(
      this.collection,
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Measurement));
  }

  async getMeasurementsByDateRange(userId: string, startDate: string, endDate: string): Promise<Measurement[]> {
    const q = query(
      this.collection,
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Measurement));
  }

  async deleteMeasurement(_userId: string, measurementId: string): Promise<void> {
    const docRef = doc(db, 'measurements', measurementId);
    await deleteDoc(docRef);
  }

  async removeDuplicates(userId: string): Promise<{ removed: number; kept: number }> {
    const measurements = await this.getMeasurements(userId);
    
    const duplicateGroups = new Map<string, Measurement[]>();
    
    for (const measurement of measurements) {
      const key = `${measurement.date}-${measurement.type}`;
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push(measurement);
    }
    
    let removed = 0;
    let kept = 0;
    
    for (const group of duplicateGroups.values()) {
      if (group.length > 1) {
        const sorted = group.sort((a, b) => {
          const aTime = (a as { createdAt?: { toMillis?: () => number } }).createdAt?.toMillis?.() || 0;
          const bTime = (b as { createdAt?: { toMillis?: () => number } }).createdAt?.toMillis?.() || 0;
          return aTime - bTime;
        });
        
        const toDelete = sorted.slice(1);
        
        for (const duplicate of toDelete) {
          await this.deleteMeasurement(userId, duplicate.id);
          removed++;
        }
        kept++;
      } else {
        kept++;
      }
    }
    
    return { removed, kept };
  }
}