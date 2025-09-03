import type { Measurement } from '../../types';

/**
 * Mock Firebase operations for testing
 */
export class FirebaseMocks {
  private static measurements = new Map<string, Measurement[]>();
  private static userAuth = new Map<string, { uid: string; email: string }>();

  static reset() {
    this.measurements.clear();
    this.userAuth.clear();
  }

  static setUserMeasurements(userId: string, measurements: Measurement[]) {
    this.measurements.set(userId, measurements);
  }

  static setUserAuth(uid: string, email: string) {
    this.userAuth.set(uid, { uid, email });
  }

  /**
   * Mock Firestore collection operations
   */
  static createMockFirestore() {
    return {
      collection: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            get: vi.fn(async () => ({
              docs: (this.measurements.get('current-user') || []).map(measurement => ({
                id: measurement.id,
                data: () => measurement
              }))
            }))
          }))
        })),
        
        add: vi.fn(async (data: Omit<Measurement, 'id'>) => {
          const userId = 'current-user';
          const measurements = this.measurements.get(userId) || [];
          const newMeasurement: Measurement = {
            ...data,
            id: `mock-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          measurements.push(newMeasurement);
          this.measurements.set(userId, measurements);
          return { id: newMeasurement.id };
        }),

        doc: vi.fn((id: string) => ({
          update: vi.fn(async (data: Partial<Measurement>) => {
            const userId = 'current-user';
            const measurements = this.measurements.get(userId) || [];
            const index = measurements.findIndex(m => m.id === id);
            if (index !== -1) {
              measurements[index] = { ...measurements[index], ...data };
              this.measurements.set(userId, measurements);
            }
          }),

          delete: vi.fn(async () => {
            const userId = 'current-user';
            const measurements = this.measurements.get(userId) || [];
            const filtered = measurements.filter(m => m.id !== id);
            this.measurements.set(userId, filtered);
          }),

          get: vi.fn(async () => {
            const userId = 'current-user';
            const measurements = this.measurements.get(userId) || [];
            const measurement = measurements.find(m => m.id === id);
            return {
              exists: !!measurement,
              data: () => measurement,
              id: measurement?.id
            };
          })
        }))
      })),

      // Batch operations
      batch: vi.fn(() => ({
        delete: vi.fn(),
        commit: vi.fn(async () => {})
      }))
    };
  }

  /**
   * Mock Firebase Auth
   */
  static createMockAuth() {
    return {
      currentUser: this.userAuth.get('current-user') || null,
      
      signInWithEmailAndPassword: vi.fn(async (email: string, password: string) => {
        if (email === 'test@example.com' && password === 'password123') {
          const user = { uid: 'mock-user-123', email };
          this.userAuth.set('current-user', user);
          return { user };
        }
        throw new Error('auth/user-not-found');
      }),

      createUserWithEmailAndPassword: vi.fn(async (email: string) => {
        const user = { uid: `mock-user-${Date.now()}`, email };
        this.userAuth.set('current-user', user);
        return { user };
      }),

      signOut: vi.fn(async () => {
        this.userAuth.delete('current-user');
      }),

      onAuthStateChanged: vi.fn((callback) => {
        // Simulate initial auth state
        setTimeout(() => {
          const user = this.userAuth.get('current-user') || null;
          callback(user);
        }, 0);
        return () => {}; // Unsubscribe function
      })
    };
  }

  /**
   * Simulate network errors
   */
  static createNetworkErrorScenarios() {
    return {
      // Firestore network error
      networkError: () => {
        throw new Error('Failed to fetch');
      },

      // Permission denied
      permissionDenied: () => {
        const error = new Error('Permission denied');
        (error as Error & { code: string }).code = 'permission-denied';
        throw error;
      },

      // Unauthenticated
      unauthenticated: () => {
        const error = new Error('User not authenticated');
        (error as Error & { code: string }).code = 'unauthenticated';
        throw error;
      },

      // Quota exceeded
      quotaExceeded: () => {
        const error = new Error('Quota exceeded');
        (error as Error & { code: string }).code = 'resource-exhausted';
        throw error;
      }
    };
  }

  /**
   * Simulate realistic delays
   */
  static createDelayedResponses() {
    return {
      fast: () => new Promise(resolve => setTimeout(resolve, 50)),
      slow: () => new Promise(resolve => setTimeout(resolve, 2000)),
      timeout: () => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      )
    };
  }
}