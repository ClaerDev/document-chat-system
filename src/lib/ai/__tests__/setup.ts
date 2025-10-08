/**
 * Test Setup for OpenRouter Tests
 * 
 * Common setup and configuration for all OpenRouter-related tests.
 */

import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.OPENROUTER_API_KEY = 'sk-test-key';
process.env.OPENROUTER_APP_NAME = 'Document-Chat-System-Test';
process.env.OPENROUTER_SITE_URL = 'https://test.document-chat-system.vercel.app';
process.env.OPENROUTER_SMART_ROUTING = 'true';
process.env.OPENROUTER_COST_OPTIMIZATION = 'balanced';
process.env.OPENROUTER_FALLBACK_STRATEGY = 'hybrid';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Setup default fetch mock responses
beforeEach(() => {
  mockFetch.mockClear();
  
  // Default successful response for health checks
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/models')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 'openai/gpt-4o' },
            { id: 'openai/gpt-4o-mini' },
            { id: 'anthropic/claude-3-opus' }
          ]
        })
      });
    }
    
    if (url.includes('/generation')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 'gen-123',
            cost: 0.01,
            latency: 1000,
            provider: 'openai',
            model: 'gpt-4o',
            routing_info: {
              selected_provider: 'openai',
              fallback_used: false,
              cost_optimization: true
            }
          }
        })
      });
    }
    
    // Default completion response
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'chatcmpl-test',
        choices: [
          {
            message: { content: 'Test response' },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        },
        model: 'openai/gpt-4o'
      })
    });
  });
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
declare global {
  var testUtils: {
    createMockRequest: (overrides?: any) => any;
    createMockResponse: (overrides?: any) => any;
    createMockConfig: (overrides?: any) => any;
  };
}

global.testUtils = {
  createMockRequest: (overrides = {}) => ({
    messages: [{ role: 'user', content: 'Test message' }],
    model: 'fast',
    metadata: {
      organizationId: 'org-test',
      userId: 'user-test'
    },
    ...overrides
  }),
  
  createMockResponse: (overrides = {}) => ({
    id: 'chatcmpl-test',
    choices: [
      {
        message: { content: 'Test response' },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15
    },
    model: 'openai/gpt-4o',
    generation_id: 'gen-123',
    ...overrides
  }),
  
  createMockConfig: (overrides = {}) => ({
    apiKey: 'sk-test-key',
    appName: 'Document-Chat-System-Test',
    siteUrl: 'https://test.document-chat-system.vercel.app',
    enableSmartRouting: true,
    costOptimization: 'balanced' as const,
    fallbackStrategy: 'hybrid' as const,
    maxRetries: 3,
    timeout: 30000,
    ...overrides
  })
};

export {};