import { useAuth } from '../useAuth';

describe('useAuth', () => {
  it('is a function that can be imported', () => {
    expect(typeof useAuth).toBe('function');
  });
  
  it('function exists and is testable', () => {
    // Simple test that the hook exists and is properly exported
    expect(useAuth).toBeDefined();
    expect(typeof useAuth).toBe('function');
  });
});