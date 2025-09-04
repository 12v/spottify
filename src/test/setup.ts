import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Polyfill URL methods for jsdom environment
global.URL = global.URL || {};
global.URL.createObjectURL = global.URL.createObjectURL || vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = global.URL.revokeObjectURL || vi.fn();