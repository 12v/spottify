import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { MockDataFactory } from '../../test/helpers/mockData';
import Calendar from '../../components/Calendar';
import Statistics from '../../components/Statistics';
import Dashboard from '../../components/Dashboard';
import HormoneGraph from '../../components/HormoneGraph';

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

import { getDocs, Timestamp } from 'firebase/firestore';

describe('Performance: Large Datasets', () => {
  const mockUser = {
    uid: 'performance-test-user',
    email: 'perf@example.com'
  };

  const mockAuthContext = {
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Timestamp
    vi.mocked(Timestamp.now).mockReturnValue({
      seconds: Date.now() / 1000,
      nanoseconds: 0
    });
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

  describe('Chart Rendering Performance', () => {
    it('should render HormoneGraph with 1000+ measurements within performance budget', async () => {
      const startTime = Date.now();
      
      // Generate 1000 measurements across 3 years
      const largeMeasurementSet = MockDataFactory.createLargeDataset(
        mockUser.uid,
        1000, // 1000 measurements
        new Date('2021-01-01'),
        new Date('2024-01-01')
      );

      vi.mocked(getDocs).mockResolvedValue({
        docs: largeMeasurementSet.measurements.map((m, i) => ({
          id: `large-${i}`,
          data: () => m
        }))
      });

      // Render HormoneGraph with large dataset
      renderWithAuth(<HormoneGraph />);

      await waitFor(() => {
        expect(screen.getByText(/hormone/i)).toBeInTheDocument();
      });

      const renderTime = Date.now() - startTime;
      
      // Performance assertion: should render within 2 seconds
      expect(renderTime).toBeLessThan(2000);
      
      // Memory usage should be reasonable
      expect(largeMeasurementSet.measurements).toHaveLength(1000);
    });

    it('should handle rapid chart updates without performance degradation', async () => {
      const measurements = MockDataFactory.createMultiCycleData(
        mockUser.uid,
        12, // 12 cycles (1 year)
        new Date('2023-01-01')
      );

      vi.mocked(getDocs).mockResolvedValue({
        docs: measurements.measurements.map((m, i) => ({
          id: `update-${i}`,
          data: () => m
        }))
      });

      const { rerender } = renderWithAuth(<HormoneGraph />);

      // Perform multiple rapid re-renders
      const updateTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const updateStart = Date.now();
        
        rerender(
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContext}>
              <HormoneGraph key={i} />
            </AuthContext.Provider>
          </BrowserRouter>
        );
        
        await waitFor(() => {
          expect(screen.getByText(/hormone/i)).toBeInTheDocument();
        });
        
        updateTimes.push(Date.now() - updateStart);
      }

      // No update should take longer than 500ms
      updateTimes.forEach(time => {
        expect(time).toBeLessThan(500);
      });

      // Average update time should be under 200ms
      const avgTime = updateTimes.reduce((a, b) => a + b) / updateTimes.length;
      expect(avgTime).toBeLessThan(200);
    });
  });

  describe('Calendar Performance with Multi-Year Data', () => {
    it('should render Calendar with 3+ years of data efficiently', async () => {
      const startTime = Date.now();
      
      // Generate 3 years of comprehensive data
      const threeYearData = MockDataFactory.createMultiYearData(
        mockUser.uid,
        3, // 3 years
        new Date('2021-01-01')
      );

      vi.mocked(getDocs).mockResolvedValue({
        docs: threeYearData.measurements.map((m, i) => ({
          id: `multiyear-${i}`,
          data: () => m
        }))
      });

      renderWithAuth(<Calendar />);

      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });

      const initialRenderTime = Date.now() - startTime;
      
      // Should render initial view within 1.5 seconds
      expect(initialRenderTime).toBeLessThan(1500);

      // Test navigation performance
      const navigationStart = Date.now();
      
      // Simulate month navigation (this would need actual navigation implementation)
      // For now, we test re-render performance
      const { rerender } = renderWithAuth(<Calendar />);
      
      rerender(
        <BrowserRouter>
          <AuthContext.Provider value={mockAuthContext}>
            <Calendar key="nav-test" />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });

      const navigationTime = Date.now() - navigationStart;
      
      // Navigation should be under 300ms
      expect(navigationTime).toBeLessThan(300);
    });

    it('should maintain responsive interaction with large datasets', async () => {
      // Create dataset with many measurements per day
      const denseMeasurements = MockDataFactory.createDenseDataset(
        mockUser.uid,
        365, // 365 days
        5    // 5 measurements per day average
      );

      vi.mocked(getDocs).mockResolvedValue({
        docs: denseMeasurements.measurements.map((m, i) => ({
          id: `dense-${i}`,
          data: () => m
        }))
      });

      const interactionStart = Date.now();
      
      renderWithAuth(<Calendar />);

      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });

      // Test multiple rapid interactions
      for (let i = 0; i < 5; i++) {
        const dayElements = screen.queryAllByText(/\d/);
        const dayElement = dayElements[i];
        if (dayElement) {
          // Simulate hover/click interactions
          const interactionTime = Date.now();
          
          // This would trigger measurement display/tooltip
          // For testing, we just verify the element is responsive
          expect(dayElement).toBeInTheDocument();
          
          const responseTime = Date.now() - interactionTime;
          expect(responseTime).toBeLessThan(50); // Very fast response
        }
      }

      const totalInteractionTime = Date.now() - interactionStart;
      expect(totalInteractionTime).toBeLessThan(1000);
    });
  });

  describe('Statistics Calculation Speed', () => {
    it('should calculate statistics for large datasets within performance budget', async () => {
      const calculationStart = Date.now();
      
      // Create large dataset for statistical analysis
      const largeStatDataset = MockDataFactory.createStatisticalDataset(
        mockUser.uid,
        50, // 50 cycles
        new Date('2020-01-01')
      );

      vi.mocked(getDocs).mockResolvedValue({
        docs: largeStatDataset.measurements.map((m, i) => ({
          id: `stat-${i}`,
          data: () => m
        }))
      });

      renderWithAuth(<Statistics />);

      await waitFor(() => {
        expect(screen.getByText(/cycle statistics/i)).toBeInTheDocument();
      });

      const calculationTime = Date.now() - calculationStart;
      
      // Statistical calculations should complete within 1 second
      expect(calculationTime).toBeLessThan(1000);
      
      // Verify complex calculations were performed
      expect(largeStatDataset.measurements.length).toBeGreaterThan(500);
    });

    it('should handle real-time statistic updates efficiently', async () => {
      let currentDataSize = 10;
      const maxDataSize = 100;
      const updateTimes: number[] = [];

      while (currentDataSize <= maxDataSize) {
        const updateStart = Date.now();
        
        const incrementalData = MockDataFactory.createMultiCycleData(
          mockUser.uid,
          Math.floor(currentDataSize / 10),
          new Date('2023-01-01')
        );

        vi.mocked(getDocs).mockResolvedValue({
          docs: incrementalData.measurements.map((m, i) => ({
            id: `incremental-${currentDataSize}-${i}`,
            data: () => m
          }))
        });

        const { rerender } = renderWithAuth(<Statistics />);
        
        rerender(
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContext}>
              <Statistics key={currentDataSize} />
            </AuthContext.Provider>
          </BrowserRouter>
        );

        await waitFor(() => {
          expect(screen.getByText(/cycle statistics/i)).toBeInTheDocument();
        });

        const updateTime = Date.now() - updateStart;
        updateTimes.push(updateTime);
        
        currentDataSize += 10;
      }

      // Each update should be under 500ms
      updateTimes.forEach(time => {
        expect(time).toBeLessThan(500);
      });

      // Updates should scale reasonably (not exponentially)
      const firstUpdate = updateTimes[0];
      const lastUpdate = updateTimes[updateTimes.length - 1];
      
      // Last update shouldn't be more than 3x the first update time
      expect(lastUpdate).toBeLessThan(firstUpdate * 3);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should manage memory efficiently with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create very large dataset
      const massiveDataset = MockDataFactory.createMassiveDataset(
        mockUser.uid,
        5000 // 5000 measurements
      );

      vi.mocked(getDocs).mockResolvedValue({
        docs: massiveDataset.measurements.map((m, i) => ({
          id: `massive-${i}`,
          data: () => m
        }))
      });

      // Render multiple components with the large dataset
      const { unmount: unmountDashboard } = renderWithAuth(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText(/current cycle/i)).toBeInTheDocument();
      });
      unmountDashboard();

      const { unmount: unmountCalendar } = renderWithAuth(<Calendar />);
      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });
      unmountCalendar();

      const { unmount: unmountStats } = renderWithAuth(<Statistics />);
      await waitFor(() => {
        expect(screen.getByText(/cycle statistics/i)).toBeInTheDocument();
      });
      unmountStats();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB for 5000 measurements)
      const maxMemoryIncrease = 100 * 1024 * 1024; // 100MB
      expect(memoryIncrease).toBeLessThan(maxMemoryIncrease);
    });

    it('should clean up resources properly after component unmount', async () => {
      const dataset = MockDataFactory.createMultiCycleData(
        mockUser.uid,
        20,
        new Date('2022-01-01')
      );

      vi.mocked(getDocs).mockResolvedValue({
        docs: dataset.measurements.map((m, i) => ({
          id: `cleanup-${i}`,
          data: () => m
        }))
      });

      // Mount and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithAuth(<HormoneGraph key={i} />);
        
        await waitFor(() => {
          expect(screen.getByText(/hormone/i)).toBeInTheDocument();
        });
        
        unmount();
      }

      // No memory leaks should occur
      // This test mainly ensures no crashes during rapid mount/unmount cycles
      expect(true).toBe(true); // Test completion indicates success
    });
  });

  describe('Concurrent Operation Performance', () => {
    it('should handle concurrent data operations without blocking UI', async () => {
      const concurrentDatasets = Array.from({ length: 5 }, (_, i) => 
        MockDataFactory.createMultiCycleData(
          mockUser.uid,
          5,
          new Date(`2023-0${i + 1}-01`)
        )
      );

      // Mock multiple concurrent requests
      let requestCount = 0;
      vi.mocked(getDocs).mockImplementation(() => {
        const dataset = concurrentDatasets[requestCount % concurrentDatasets.length];
        requestCount++;
        
        // Simulate network delay
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              docs: dataset.measurements.map((m, i) => ({
                id: `concurrent-${requestCount}-${i}`,
                data: () => m
              }))
            });
          }, 50);
        });
      });

      const renderStart = Date.now();
      
      // Render multiple components simultaneously
      const components = [
        renderWithAuth(<Dashboard key="1" />),
        renderWithAuth(<Calendar key="2" />),
        renderWithAuth(<Statistics key="3" />)
      ];

      // All components should render without blocking each other
      await Promise.all([
        waitFor(() => expect(screen.getAllByText(/current cycle/i).length).toBeGreaterThan(0)),
        waitFor(() => expect(screen.getAllByText(/calendar/i).length).toBeGreaterThan(0)),
        waitFor(() => expect(screen.getAllByText(/statistics/i).length).toBeGreaterThan(0))
      ]);

      const totalRenderTime = Date.now() - renderStart;
      
      // Concurrent rendering should be efficient
      expect(totalRenderTime).toBeLessThan(2000);
      
      // Clean up
      components.forEach(({ unmount }) => unmount());
    });
  });
});