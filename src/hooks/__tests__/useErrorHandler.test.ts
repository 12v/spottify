import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';

describe('useErrorHandler', () => {
  it('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    expect(result.current.error.hasError).toBe(false);
    expect(result.current.error.message).toBe('');
  });

  it('handles string errors', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError('Something went wrong');
    });

    expect(result.current.error.hasError).toBe(true);
    expect(result.current.error.message).toBe('An unexpected error occurred. Please try again.');
  });

  it('handles Error objects', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error message');
    
    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.error.hasError).toBe(true);
    expect(result.current.error.message).toBe('An unexpected error occurred. Please try again.');
    expect(result.current.error.details).toContain(testError.stack);
  });

  it('allows custom user messages', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError('Technical error', 'User-friendly message');
    });

    expect(result.current.error.message).toBe('User-friendly message');
  });

  it('stores retry action', () => {
    const { result } = renderHook(() => useErrorHandler());
    const retryAction = vi.fn();
    
    act(() => {
      result.current.handleError('Error', undefined, retryAction);
    });

    expect(result.current.error.retryAction).toBe(retryAction);
  });

  it('clears error state', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    // First set an error
    act(() => {
      result.current.handleError('Some error');
    });
    
    expect(result.current.error.hasError).toBe(true);

    // Then clear it
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error.hasError).toBe(false);
    expect(result.current.error.message).toBe('');
    expect(result.current.error.details).toBeUndefined();
    expect(result.current.error.retryAction).toBeUndefined();
  });

  it('executes retry action when called', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const retryAction = vi.fn().mockResolvedValue(undefined);
    
    act(() => {
      result.current.handleError('Error', undefined, retryAction);
    });

    await act(async () => {
      await result.current.retry();
    });

    expect(retryAction).toHaveBeenCalledOnce();
    // Error should be cleared after successful retry
    expect(result.current.error.hasError).toBe(false);
  });
});