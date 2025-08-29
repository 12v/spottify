import { collection, addDoc, getDocs, query, orderBy, where, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Measurement } from '../types';

export class DataService {
  private collection = collection(db, 'measurements');

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

  async deleteMeasurement(userId: string, measurementId: string): Promise<void> {
    const docRef = doc(db, 'measurements', measurementId);
    await deleteDoc(docRef);
  }
}