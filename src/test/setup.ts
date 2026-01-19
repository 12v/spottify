import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Set locale to UK for consistent date formatting in tests
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function(locale?: string | string[], options?: Intl.DateTimeFormatOptions) {
  return originalToLocaleDateString.call(this, locale || 'en-GB', options);
};

// Polyfill URL methods for jsdom environment
global.URL = global.URL || {};
global.URL.createObjectURL = global.URL.createObjectURL || vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = global.URL.revokeObjectURL || vi.fn();