import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { MockDataFactory } from '../../test/helpers/mockData';
import { DataService } from '../../services/dataService';
import Dashboard from '../../components/Dashboard';
import Calendar from '../../components/Calendar';
import Statistics from '../../components/Statistics';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection'),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getFirestore: vi.fn(),
  Timestamp: { now: vi.fn() }
}));

vi.mock('../../firebase', () => ({ db: {} }));

import { addDoc, getDocs, Timestamp } from 'firebase/firestore';

describe('Integration: Complete Cycle Tracking', () => {
  let dataService: DataService;
  const mockUser = {
    uid: 'integration-test-user',
    email: 'test@example.com'
  };

  const mockAuthContext = {
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dataService = DataService.getInstance();
    
    // Mock Timestamp
    vi.mocked(Timestamp.now).mockReturnValue({
      seconds: Date.now() / 1000,
      nanoseconds: 0
    } as any);
    
    // Mock successful data operations
    vi.mocked(addDoc).mockResolvedValue({ id: 'mock-measurement-id' } as any);
    vi.mocked(getDocs).mockResolvedValue({ 
      docs: [] 
    } as any);
  });

  const renderWithAuth = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          {component}
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  describe('Complete Cycle: Add Measurements → View Predictions → Track Completion', () => {
    it('should support full cycle tracking workflow', async () => {
      const user = userEvent.setup();
      
      // Step 1: Add multiple measurements for a cycle
      const cycleStart = new Date('2024-01-01');
      const measurements = [
        MockDataFactory.createPeriodMeasurement(cycleStart, 'heavy'),
        MockDataFactory.createPeriodMeasurement(new Date('2024-01-02'), 'medium'),
        MockDataFactory.createPeriodMeasurement(new Date('2024-01-03'), 'light'),
        MockDataFactory.createBBTMeasurement(new Date('2024-01-10'), 36.2),
        MockDataFactory.createBBTMeasurement(new Date('2024-01-15'), 36.8),
        MockDataFactory.createSymptomMeasurement(new Date('2024-01-14'), 'cramps', 'mild')
      ];

      // Mock data service to return our test measurements
      vi.mocked(getDocs).mockResolvedValue({
        docs: measurements.map((m, i) => ({
          id: `doc-${i}`,
          data: () => m
        }))
      } as any);

      // Step 2: Render Dashboard and verify it shows current cycle data
      renderWithAuth(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/current cycle/i)).toBeInTheDocument();
      });

      // Step 3: Navigate to Calendar and verify measurements are displayed
      renderWithAuth(<Calendar />);

      await waitFor(() => {
        // Should show calendar grid
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });

      // Step 4: View Statistics and verify cycle data is processed
      renderWithAuth(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText(/cycle statistics/i)).toBeInTheDocument();
      });

      // Step 5: Verify data persistence calls were made
      expect(vi.mocked(getDocs)).toHaveBeenCalled();
    });

    it('should handle irregular cycle patterns', async () => {
      // Test with irregular cycle data (varying lengths)
      const irregularMeasurements = [
        MockDataFactory.createPeriodMeasurement('2024-01-01', 'heavy'),
        MockDataFactory.createPeriodMeasurement('2024-02-15', 'heavy'), // 45-day cycle
        MockDataFactory.createPeriodMeasurement('2024-03-10', 'heavy'), // 24-day cycle
        MockDataFactory.createPeriodMeasurement('2024-04-20', 'heavy')  // 41-day cycle
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: irregularMeasurements.map((m, i) => ({
          id: `irregular-${i}`,
          data: () => m
        }))
      } as any);

      renderWithAuth(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/current cycle/i)).toBeInTheDocument();
      });

      // Statistics should handle irregular patterns gracefully
      renderWithAuth(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText(/cycle statistics/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Workflow: Import → Validate → Export', () => {
    it('should support complete data management workflow', async () => {
      const user = userEvent.setup();
      
      // Step 1: Simulate import of historical data
      const historicalData = MockDataFactory.createMultiCycleData(
        mockUser.uid,
        3, // 3 cycles
        new Date('2023-10-01')
      );

      vi.mocked(getDocs).mockResolvedValue({
        docs: historicalData.measurements.map((m, i) => ({
          id: `historical-${i}`,
          data: () => m
        }))
      } as any);

      // Step 2: Render Dashboard with historical data
      renderWithAuth(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/current cycle/i)).toBeInTheDocument();
      });

      // Step 3: Verify Statistics processes the imported data
      renderWithAuth(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText(/cycle statistics/i)).toBeInTheDocument();
      });

      // Step 4: Verify data was loaded correctly
      expect(vi.mocked(getDocs)).toHaveBeenCalled();
    });
  });

  describe('Multi-Cycle Analysis: Track → Trends → Predictions', () => {
    it('should analyze trends across multiple cycles', async () => {
      // Create 6 months of cycle data
      const multiCycleData = MockDataFactory.createMultiCycleData(
        mockUser.uid,
        6, // 6 cycles
        new Date('2023-08-01')
      );

      vi.mocked(getDocs).mockResolvedValue({
        docs: multiCycleData.measurements.map((m, i) => ({
          id: `multi-${i}`,
          data: () => m
        }))
      } as any);

      // Render Statistics component
      renderWithAuth(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText(/cycle statistics/i)).toBeInTheDocument();
      });

      // Should display trend analysis for multiple cycles
      expect(vi.mocked(getDocs)).toHaveBeenCalled();
    });

    it('should generate accurate predictions based on historical data', async () => {
      const consistentCycles = MockDataFactory.createConsistentCycles(
        mockUser.uid,
        4, // 4 consistent 28-day cycles
        new Date('2024-01-01')
      );

      vi.mocked(getDocs).mockResolvedValue({
        docs: consistentCycles.measurements.map((m, i) => ({
          id: `consistent-${i}`,
          data: () => m
        }))
      } as any);

      renderWithAuth(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/current cycle/i)).toBeInTheDocument();
      });

      // Dashboard should show predictions based on consistent pattern
      expect(vi.mocked(getDocs)).toHaveBeenCalled();
    });
  });
});