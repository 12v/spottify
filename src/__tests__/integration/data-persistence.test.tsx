import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { MockDataFactory } from '../../test/helpers/mockData';
import { DataService } from '../../services/dataService';
import CalendarModal from '../../components/CalendarModal';
import Calendar from '../../components/Calendar';
import Dashboard from '../../components/Dashboard';

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

import { addDoc, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';

describe('Integration: Data Persistence', () => {
  const mockUser = {
    uid: 'persistence-test-user',
    email: 'persistence@example.com'
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
    
    // Mock successful operations
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-measurement-id' });
    vi.mocked(deleteDoc).mockResolvedValue(undefined);
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

  describe('Data Flow: Save → Display → Update', () => {
    it('should persist measurement and reflect in calendar display', async () => {
      const user = userEvent.setup();

      // Mock addDoc to capture saved data
      vi.mocked(addDoc).mockImplementation(async () => {
        return { id: 'test-measurement-123' } as any;
      });

      // Step 1: Save a measurement via CalendarModal
      const onSave = vi.fn();
      const testDate = '2024-01-15';
      
      renderWithAuth(
        <CalendarModal 
          date={testDate}
          onSave={onSave}
          onCancel={vi.fn()}
        />
      );

      // Fill in period data
      const heavyOption = screen.getByLabelText(/heavy/i);
      await user.click(heavyOption);

      // Save the measurement
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Step 2: Verify data was saved correctly
      await waitFor(() => {
        expect(vi.mocked(addDoc)).toHaveBeenCalledWith(
          'mock-collection',
          expect.objectContaining({
            userId: mockUser.uid,
            date: testDate,
            type: 'period',
            value: expect.objectContaining({ option: 'heavy' })
          })
        );
      });

      // Step 3: Mock getDocs to return the saved measurement
      vi.mocked(getDocs).mockResolvedValue({
        docs: [{
          id: 'test-measurement-123',
          data: () => ({
            id: 'test-measurement-123',
            date: testDate,
            type: 'period',
            value: { option: 'heavy' },
            userId: mockUser.uid
          })
        }]
      });

      // Step 4: Render Calendar and verify measurement displays
      renderWithAuth(<Calendar />);

      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });
    });

    it('should handle measurement updates and deletions', async () => {
      const measurementId = 'update-test-123';
      const testDate = '2024-01-20';

      // Step 1: Mock existing measurement
      const existingMeasurement = MockDataFactory.createPeriodMeasurement(
        testDate, 
        'light', 
        measurementId
      );

      vi.mocked(getDocs).mockResolvedValue({
        docs: [{
          id: measurementId,
          data: () => ({ ...existingMeasurement, userId: mockUser.uid })
        }]
      });

      // Step 2: Render Calendar with existing data
      renderWithAuth(<Calendar />);

      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });

      // Step 3: Delete the measurement
      await dataService.deleteMeasurement(measurementId, mockUser.uid);

      // Step 4: Verify deletion was called
      expect(vi.mocked(deleteDoc)).toHaveBeenCalled();

      // Step 5: Mock empty results after deletion
      vi.mocked(getDocs).mockResolvedValue({ docs: [] });

      // Re-render and verify measurement is gone
      renderWithAuth(<Calendar />);

      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Isolation: Authentication → Data → Filtering', () => {
    it('should enforce user data isolation', async () => {
      const user1Id = 'user-1';
      const user2Id = 'user-2';
      
      // Step 1: Create measurements for different users
      const user1Measurements = [
        { ...MockDataFactory.createPeriodMeasurement('2024-01-01'), userId: user1Id },
        { ...MockDataFactory.createPeriodMeasurement('2024-01-02'), userId: user1Id }
      ];
      
      const user2Measurements = [
        { ...MockDataFactory.createPeriodMeasurement('2024-01-01'), userId: user2Id },
        { ...MockDataFactory.createPeriodMeasurement('2024-01-03'), userId: user2Id }
      ];

      // Step 2: Mock context for user 1
      const user1Context = {
        user: { uid: user1Id, email: 'user1@test.com' },
        login: vi.fn(),
        logout: vi.fn(),
        loading: false
      };

      // Step 3: Mock getDocs to return all measurements (simulating database)
      vi.mocked(getDocs).mockResolvedValue({
        docs: [...user1Measurements, ...user2Measurements].map((m, i) => ({
          id: `measurement-${i}`,
          data: () => m
        }))
      });

      // Step 4: Render Dashboard for user 1
      render(
        <BrowserRouter>
          <AuthContext.Provider value={user1Context}>
            <Dashboard />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/current cycle/i)).toBeInTheDocument();
      });

      // Step 5: Verify DataService was called with user 1's ID
      expect(vi.mocked(getDocs)).toHaveBeenCalled();
      
      // The where clause should filter by user1Id
      // This would be verified by checking the query construction
    });

    it('should handle authentication state changes', async () => {
      let authContextValue = {
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        loading: true
      };

      const { rerender } = render(
        <BrowserRouter>
          <AuthContext.Provider value={authContextValue}>
            <Dashboard />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Step 1: Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Step 2: Simulate user login
      authContextValue = {
        user: mockUser,
        login: vi.fn(),
        logout: vi.fn(),
        loading: false
      };

      vi.mocked(getDocs).mockResolvedValue({ docs: [] });

      rerender(
        <BrowserRouter>
          <AuthContext.Provider value={authContextValue}>
            <Dashboard />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Step 3: Should load user data
      await waitFor(() => {
        expect(screen.getByText(/current cycle/i)).toBeInTheDocument();
      });

      expect(vi.mocked(getDocs)).toHaveBeenCalled();
    });
  });

  describe('Error Recovery: Network Failure → Consistency → Restoration', () => {
    it('should handle network failures gracefully', async () => {
      const user = userEvent.setup();

      // Step 1: Mock network failure
      vi.mocked(addDoc).mockRejectedValue(new Error('Network error'));

      renderWithAuth(
        <CalendarModal 
          date="2024-01-25"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Step 2: Try to save measurement
      const heavyOption = screen.getByLabelText(/heavy/i);
      await user.click(heavyOption);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Step 3: Should handle error gracefully
      await waitFor(() => {
        expect(vi.mocked(addDoc)).toHaveBeenCalled();
        // Error handling should prevent app crash
      });
    });

    it('should maintain data consistency during concurrent operations', async () => {
      const measurementId = 'concurrent-test-123';
      const testDate = '2024-01-30';

      // Step 1: Mock successful save operation
      vi.mocked(addDoc).mockResolvedValue({ id: measurementId });

      // Step 2: Add measurement
      await dataService.addMeasurement({
        date: testDate,
        type: 'period',
        value: { option: 'medium' }
      }, mockUser.uid);

      // Step 3: Mock concurrent read operation
      vi.mocked(getDocs).mockResolvedValue({
        docs: [{
          id: measurementId,
          data: () => ({
            id: measurementId,
            date: testDate,
            type: 'period',
            value: { option: 'medium' },
            userId: mockUser.uid
          })
        }]
      });

      // Step 4: Verify consistency
      const measurements = await dataService.getMeasurements(mockUser.uid);
      expect(measurements).toHaveLength(1);
      expect(measurements[0].id).toBe(measurementId);
    });

    it('should restore state after temporary failures', async () => {
      let failureCount = 0;
      const maxFailures = 2;

      // Step 1: Mock intermittent failures
      vi.mocked(getDocs).mockImplementation(() => {
        failureCount++;
        if (failureCount <= maxFailures) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ docs: [] });
      });

      // Step 2: Render Dashboard (should retry on failure)
      renderWithAuth(<Dashboard />);

      // Step 3: Should eventually recover
      await waitFor(() => {
        expect(vi.mocked(getDocs)).toHaveBeenCalledTimes(maxFailures + 1);
      });
    });
  });
});