import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PrivateRoute from '../PrivateRoute';
import * as useAuthHook from '../../hooks/useAuth';
import type { User } from 'firebase/auth';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth');

const MockedComponent = () => <div>Protected Content</div>;

const renderWithRouter = (children: React.ReactNode) => {
  return render(<BrowserRouter>{children}</BrowserRouter>);
};

describe('PrivateRoute', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when user is authenticated', () => {
    const mockUser: Partial<User> = {
      uid: 'test-user',
      email: 'test@example.com',
      emailVerified: true
    };

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      currentUser: mockUser as User,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <PrivateRoute>
        <MockedComponent />
      </PrivateRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      currentUser: null,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <PrivateRoute>
        <MockedComponent />
      </PrivateRoute>
    );

    // Component should not render when not authenticated
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      currentUser: null,
      loading: true,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <PrivateRoute>
        <MockedComponent />
      </PrivateRoute>
    );

    // Should not render children while loading
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});