import { useState, useCallback } from 'react';

interface ErrorState {
  hasError: boolean;
  message: string;
  details?: string;
  retryAction?: () => Promise<void> | void;
}

export function useErrorHandler() {
  const [error, setError] = useState<ErrorState>({ hasError: false, message: '' });

  const handleError = useCallback((
    error: Error | string, 
    userMessage?: string, 
    retryAction?: () => Promise<void> | void
  ) => {
    const message = typeof error === 'string' ? error : error.message;
    const details = typeof error === 'object' && error.stack ? error.stack : undefined;
    
    setError({
      hasError: true,
      message: userMessage || getDefaultMessage(message),
      details,
      retryAction
    });

    console.error('Error handled:', error);
  }, []);

  const clearError = useCallback(() => {
    setError({ hasError: false, message: '' });
  }, []);

  const retry = useCallback(async () => {
    if (error.retryAction) {
      clearError();
      try {
        await error.retryAction();
      } catch (retryError) {
        handleError(retryError as Error, 'Retry failed. Please try again.');
      }
    }
  }, [error.retryAction, clearError, handleError]);

  return {
    error,
    handleError,
    clearError,
    retry
  };
}

function getDefaultMessage(errorMessage: string): string {
  if (errorMessage.includes('permission-denied')) {
    return 'You do not have permission to perform this action.';
  }
  
  if (errorMessage.includes('unauthenticated')) {
    return 'Your session has expired. Please log in again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
}