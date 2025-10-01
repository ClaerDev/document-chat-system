/**
 * Shared Test Utilities for AI Providers
 * 
 * Common utilities, mocks, fixtures, and helpers for testing AI providers
 * and services. Provides consistent testing patterns across all AI components.
 */

import { jest } from '@jest/globals';
import { 
  UnifiedCompletionRequest, 
  UnifiedEmbeddingRequest,
  UnifiedCompletionResponse,
  UnifiedEmbeddingResponse,
  UnifiedStreamRequest,
  UnifiedStreamChunk,
  AIProviderAdapter,
  ProviderCapabilities,
  ModelInfo,
  HealthStatus,
  AIMetrics,
  Message
} from '../../interfaces/types';

// =============================================================================
// TEST DATA FIXTURES
// =============================================================================

export const TestFixtures = {
  // Standard test messages
  messages: {
    simple: [
      { role: 'user' as const, content: 'Hello, how are you?' }
    ],
    withSystem: [
      { role: 'system' as const, content: 'You are a helpful assistant.' },
      { role: 'user' as const, content: 'Hello' }
    ],
    conversation: [
      { role: 'user' as const, content: 'What is the capital of France?' },
      { role: 'assistant' as const, content: 'The capital of France is Paris.' },
      { role: 'user' as const, content: 'What is its population?' }
    ],
    withFunctions: [
      { role: 'user' as const, content: 'Get the weather in New York' }
    ],
    withVision: [
      { 
        role: 'user' as const, 
        content: 'What do you see in this image?',
        attachments: [
          {
            type: 'image',
            url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
          }
        ]
      }
    ]
  },

  // Standard completion requests
  completionRequests: {
    simple: {
      messages: [{ role: 'user' as const, content: 'Hello, how are you?' }],
      model: 'fast',
      metadata: {
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as UnifiedCompletionRequest,

    withOptions: {
      messages: [{ role: 'user' as const, content: 'Creative writing task' }],
      model: 'powerful',
      options: {
        temperature: 0.8,
        maxTokens: 500,
        topP: 0.9
      },
      metadata: {
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as UnifiedCompletionRequest,

    withFunctions: {
      messages: [{ role: 'user' as const, content: 'Get the weather in New York' }],
      model: 'balanced',
      functions: [
        {
          name: 'get_weather',
          description: 'Get weather information for a location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'The city and state' },
              units: { type: 'string', enum: ['celsius', 'fahrenheit'] }
            },
            required: ['location']
          }
        }
      ],
      options: {
        functionCalling: true
      },
      metadata: {
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as UnifiedCompletionRequest,

    withHints: {
      messages: [{ role: 'user' as const, content: 'Analyze this government contract' }],
      model: 'powerful',
      metadata: {
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as UnifiedCompletionRequest
  },

  // Standard embedding requests
  embeddingRequests: {
    simple: {
      text: 'Government contract opportunity for IT services',
      model: 'embedding-small',
      metadata: {
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as UnifiedEmbeddingRequest,

    withOptions: {
      text: 'Large document for high-dimensional embedding',
      model: 'embedding-large',
      options: {
        dimensions: 3072
      },
      metadata: {
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as UnifiedEmbeddingRequest,

    batch: {
      text: [
        'First document about government contracts',
        'Second document about procurement processes',
        'Third document about compliance requirements'
      ],
      model: 'embedding-small',
      metadata: {
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as UnifiedEmbeddingRequest
  },

  // Standard responses
  completionResponses: {
    simple: {
      id: 'comp-test-123',
      content: 'I am doing well, thank you for asking! How can I help you today?',
      model: 'gpt-3.5-turbo',
      usage: {
        promptTokens: 15,
        completionTokens: 18,
        totalTokens: 33
      },
      metadata: {
        provider: 'openai',
        finishReason: 'stop',
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as UnifiedCompletionResponse,

    withFunctionCall: {
      id: 'comp-func-123',
      content: null,
      model: 'gpt-4o',
      usage: {
        promptTokens: 25,
        completionTokens: 10,
        totalTokens: 35
      },
      metadata: {
        provider: 'openai',
        finishReason: 'tool_calls',
        organizationId: 'org-test-123',
        userId: 'user-test-456',
        functionCall: {
          name: 'get_weather',
          arguments: '{"location": "New York", "units": "fahrenheit"}'
        }
      }
    } as UnifiedCompletionResponse,

    longForm: {
      id: 'comp-long-123',
      content: 'This is a longer response that would be typical for creative writing or detailed analysis tasks. It contains multiple sentences and demonstrates the model\'s ability to generate coherent, lengthy text.',
      model: 'gpt-4o',
      usage: {
        promptTokens: 20,
        completionTokens: 45,
        totalTokens: 65
      },
      metadata: {
        provider: 'openai',
        finishReason: 'stop',
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as UnifiedCompletionResponse
  },

  embeddingResponses: {
    small: {
      embedding: Array.from({ length: 1536 }, () => Math.random() * 2 - 1),
      usage: {
        promptTokens: 8,
        totalTokens: 8
      },
      metadata: {
        provider: 'openai',
        model: 'text-embedding-3-small',
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as UnifiedEmbeddingResponse,

    large: {
      embedding: Array.from({ length: 3072 }, () => Math.random() * 2 - 1),
      usage: {
        promptTokens: 12,
        totalTokens: 12
      },
      metadata: {
        provider: 'openai',
        model: 'text-embedding-3-large',
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as UnifiedEmbeddingResponse
  },

  // Provider capabilities
  capabilities: {
    openai: {
      maxTokens: 128000,
      supportsFunctionCalling: true,
      supportsJsonMode: true,
      supportsStreaming: true,
      supportsVision: true,
      embeddingDimensions: [512, 1536, 3072],
      models: {
        completion: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
        embedding: ['text-embedding-3-small', 'text-embedding-3-large']
      }
    } as ProviderCapabilities,

    anthropic: {
      maxTokens: 200000,
      supportsFunctionCalling: true,
      supportsJsonMode: false,
      supportsStreaming: true,
      supportsVision: true,
      models: {
        completion: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
      }
    } as ProviderCapabilities,

    openrouter: {
      maxTokens: 200000,
      supportsFunctionCalling: true,
      supportsJsonMode: true,
      supportsStreaming: true,
      supportsVision: true,
      models: {
        completion: ['fast', 'balanced', 'powerful'],
        embedding: ['embedding-small', 'embedding-large']
      }
    } as ProviderCapabilities
  },

  // Health status examples
  healthStatus: {
    healthy: {
      isHealthy: true,
      lastCheck: new Date(),
      latency: 250,
      successRate: 0.99,
      errorRate: 0.01
    } as HealthStatus,

    unhealthy: {
      isHealthy: false,
      lastCheck: new Date(),
      latency: 5000,
      successRate: 0.75,
      errorRate: 0.25,
      error: 'Rate limit exceeded'
    } as HealthStatus
  },

  // Metrics examples
  metrics: {
    successful: {
      provider: 'openai',
      model: 'fast',
      operation: 'completion',
      latency: 1200,
      tokenCount: { prompt: 15, completion: 25, total: 40 },
      cost: 0.003,
      success: true,
      metadata: {
        taskType: 'simple_qa',
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as AIMetrics,

    failed: {
      provider: 'anthropic',
      model: 'balanced',
      operation: 'completion',
      latency: 800,
      tokenCount: { prompt: 10, completion: 0, total: 10 },
      cost: 0.001,
      success: false,
      error: 'Rate limit exceeded',
      metadata: {
        taskType: 'document_analysis',
        organizationId: 'org-test-123',
        userId: 'user-test-456'
      }
    } as AIMetrics
  }
};

// =============================================================================
// MOCK FACTORIES
// =============================================================================

/**
 * Factory for creating mock AI provider adapters
 */
export class MockAdapterFactory {
  static createOpenAI(overrides: Partial<AIProviderAdapter> = {}): jest.Mocked<AIProviderAdapter> {
    return {
      getName: jest.fn().mockReturnValue('openai'),
      initialize: jest.fn().mockResolvedValue(undefined),
      generateCompletion: jest.fn().mockResolvedValue(TestFixtures.completionResponses.simple),
      generateEmbedding: jest.fn().mockResolvedValue(TestFixtures.embeddingResponses.small),
      streamCompletion: jest.fn().mockReturnValue(MockStreamFactory.createCompletionStream()),
      getCapabilities: jest.fn().mockReturnValue(TestFixtures.capabilities.openai),
      getAvailableModels: jest.fn().mockReturnValue([]),
      estimateCost: jest.fn().mockReturnValue(0.002),
      estimateTokens: jest.fn().mockReturnValue(25),
      checkHealth: jest.fn().mockResolvedValue(TestFixtures.healthStatus.healthy),
      getHealth: jest.fn().mockReturnValue(TestFixtures.healthStatus.healthy),
      ...overrides
    } as jest.Mocked<AIProviderAdapter>;
  }

  static createAnthropic(overrides: Partial<AIProviderAdapter> = {}): jest.Mocked<AIProviderAdapter> {
    return {
      getName: jest.fn().mockReturnValue('anthropic'),
      initialize: jest.fn().mockResolvedValue(undefined),
      generateCompletion: jest.fn().mockResolvedValue({
        ...TestFixtures.completionResponses.simple,
        metadata: { ...TestFixtures.completionResponses.simple.metadata, provider: 'anthropic' }
      }),
      generateEmbedding: jest.fn().mockRejectedValue(new Error('Anthropic does not support embeddings')),
      streamCompletion: jest.fn().mockReturnValue(MockStreamFactory.createCompletionStream()),
      getCapabilities: jest.fn().mockReturnValue(TestFixtures.capabilities.anthropic),
      getAvailableModels: jest.fn().mockReturnValue([]),
      estimateCost: jest.fn().mockReturnValue(0.005),
      estimateTokens: jest.fn().mockReturnValue(30),
      checkHealth: jest.fn().mockResolvedValue(TestFixtures.healthStatus.healthy),
      getHealth: jest.fn().mockReturnValue(TestFixtures.healthStatus.healthy),
      ...overrides
    } as jest.Mocked<AIProviderAdapter>;
  }

  static createOpenRouter(overrides: Partial<AIProviderAdapter> = {}): jest.Mocked<AIProviderAdapter> {
    return {
      getName: jest.fn().mockReturnValue('openrouter'),
      initialize: jest.fn().mockResolvedValue(undefined),
      generateCompletion: jest.fn().mockResolvedValue({
        ...TestFixtures.completionResponses.simple,
        metadata: { ...TestFixtures.completionResponses.simple.metadata, provider: 'openrouter' }
      }),
      generateEmbedding: jest.fn().mockResolvedValue({
        ...TestFixtures.embeddingResponses.small,
        metadata: { ...TestFixtures.embeddingResponses.small.metadata, provider: 'openrouter' }
      }),
      streamCompletion: jest.fn().mockReturnValue(MockStreamFactory.createCompletionStream()),
      getCapabilities: jest.fn().mockReturnValue(TestFixtures.capabilities.openrouter),
      getAvailableModels: jest.fn().mockReturnValue([]),
      estimateCost: jest.fn().mockReturnValue(0.001),
      estimateTokens: jest.fn().mockReturnValue(20),
      checkHealth: jest.fn().mockResolvedValue(TestFixtures.healthStatus.healthy),
      getHealth: jest.fn().mockReturnValue(TestFixtures.healthStatus.healthy),
      ...overrides
    } as jest.Mocked<AIProviderAdapter>;
  }

  static createMock(name: string, overrides: Partial<AIProviderAdapter> = {}): jest.Mocked<AIProviderAdapter> {
    return {
      getName: jest.fn().mockReturnValue(name),
      initialize: jest.fn().mockResolvedValue(undefined),
      generateCompletion: jest.fn().mockResolvedValue({
        ...TestFixtures.completionResponses.simple,
        metadata: { ...TestFixtures.completionResponses.simple.metadata, provider: name }
      }),
      generateEmbedding: jest.fn().mockResolvedValue({
        ...TestFixtures.embeddingResponses.small,
        metadata: { ...TestFixtures.embeddingResponses.small.metadata, provider: name }
      }),
      streamCompletion: jest.fn().mockReturnValue(MockStreamFactory.createCompletionStream()),
      getCapabilities: jest.fn().mockReturnValue(TestFixtures.capabilities.openai),
      getAvailableModels: jest.fn().mockReturnValue([]),
      estimateCost: jest.fn().mockReturnValue(0.001),
      estimateTokens: jest.fn().mockReturnValue(15),
      checkHealth: jest.fn().mockResolvedValue(TestFixtures.healthStatus.healthy),
      getHealth: jest.fn().mockReturnValue(TestFixtures.healthStatus.healthy),
      ...overrides
    } as jest.Mocked<AIProviderAdapter>;
  }
}

/**
 * Factory for creating mock streams
 */
export class MockStreamFactory {
  static createCompletionStream(chunks: string[] = ['Hello', ' world', '!']): AsyncIterableIterator<UnifiedStreamChunk> {
    return (async function* () {
      for (const chunk of chunks) {
        yield {
          content: chunk,
          metadata: {
            provider: 'mock',
            model: 'mock-model',
            chunk: true
          }
        };
        // Add small delay to simulate real streaming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    })();
  }

  static createErrorStream(error: Error): AsyncIterableIterator<UnifiedStreamChunk> {
    return (async function* () {
      yield {
        content: 'Partial',
        metadata: { provider: 'mock', model: 'mock-model', chunk: true }
      };
      throw error;
    })();
  }
}

/**
 * Factory for creating mock API responses
 */
export class MockAPIResponseFactory {
  static createSuccessResponse(data: any, status: number = 200) {
    return {
      ok: true,
      status,
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn().mockResolvedValue(JSON.stringify(data))
    } as any;
  }

  static createErrorResponse(status: number, message: string) {
    return {
      ok: false,
      status,
      json: jest.fn().mockRejectedValue(new Error(message)),
      text: jest.fn().mockResolvedValue(message)
    } as any;
  }

  static createNetworkError(code: string = 'ECONNREFUSED') {
    const error = new Error('Network error');
    (error as any).code = code;
    return Promise.reject(error);
  }
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Helper functions for common test assertions
 */
export class TestAssertions {
  static expectValidCompletionResponse(response: UnifiedCompletionResponse) {
    expect(response).toEqual(expect.objectContaining({
      id: expect.any(String),
      content: expect.any(String),
      model: expect.any(String),
      usage: expect.objectContaining({
        promptTokens: expect.any(Number),
        completionTokens: expect.any(Number),
        totalTokens: expect.any(Number)
      }),
      metadata: expect.objectContaining({
        provider: expect.any(String),
        finishReason: expect.any(String)
      })
    }));
  }

  static expectValidEmbeddingResponse(response: UnifiedEmbeddingResponse) {
    expect(response).toEqual(expect.objectContaining({
      embedding: expect.any(Array),
      usage: expect.objectContaining({
        promptTokens: expect.any(Number),
        totalTokens: expect.any(Number)
      }),
      metadata: expect.objectContaining({
        provider: expect.any(String),
        model: expect.any(String)
      })
    }));
  }

  static expectValidHealthStatus(health: HealthStatus) {
    expect(health).toEqual(expect.objectContaining({
      isHealthy: expect.any(Boolean),
      lastCheck: expect.any(Date)
    }));
  }

  static expectValidMetrics(metrics: AIMetrics) {
    expect(metrics).toEqual(expect.objectContaining({
      provider: expect.any(String),
      model: expect.any(String),
      operation: expect.any(String),
      latency: expect.any(Number),
      tokenCount: expect.objectContaining({
        prompt: expect.any(Number),
        completion: expect.any(Number),
        total: expect.any(Number)
      }),
      cost: expect.any(Number),
      success: expect.any(Boolean),
      metadata: expect.any(Object)
    }));
  }

  static expectValidCapabilities(capabilities: ProviderCapabilities) {
    expect(capabilities).toEqual(expect.objectContaining({
      maxTokens: expect.any(Number),
      supportsFunctionCalling: expect.any(Boolean),
      supportsJsonMode: expect.any(Boolean),
      supportsStreaming: expect.any(Boolean),
      supportsVision: expect.any(Boolean),
      models: expect.objectContaining({
        completion: expect.any(Array)
      })
    }));
  }

  static expectCostEstimation(cost: number, min: number = 0, max: number = 10) {
    expect(cost).toBeGreaterThanOrEqual(min);
    expect(cost).toBeLessThanOrEqual(max);
    expect(typeof cost).toBe('number');
  }

  static expectTokenEstimation(tokens: number, text: string) {
    // Rough estimation: 1 token per 3-4 characters
    const minTokens = Math.floor(text.length / 5);
    const maxTokens = Math.ceil(text.length / 2);
    expect(tokens).toBeGreaterThanOrEqual(minTokens);
    expect(tokens).toBeLessThanOrEqual(maxTokens);
  }
}

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Utility functions for common test operations
 */
export class TestUtils {
  /**
   * Wait for a specified number of milliseconds
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Collect all chunks from an async iterator
   */
  static async collectStreamChunks<T>(stream: AsyncIterableIterator<T>): Promise<T[]> {
    const chunks: T[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return chunks;
  }

  /**
   * Create a timeout promise that rejects after specified time
   */
  static createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    });
  }

  /**
   * Generate random test data
   */
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random embedding vector
   */
  static generateRandomEmbedding(dimensions: number): number[] {
    return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
  }

  /**
   * Create a mock console to capture log output
   */
  static createMockConsole(): jest.Mocked<Console> {
    return {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    } as any;
  }

  /**
   * Setup environment variables for testing
   */
  static setupTestEnvironment(vars: Record<string, string>) {
    const originalEnv = { ...process.env };
    
    // Set test environment variables
    Object.entries(vars).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // Return cleanup function
    return () => {
      // Restore original environment
      process.env = originalEnv;
    };
  }

  /**
   * Create a mock fetch function
   */
  static createMockFetch(): jest.MockedFunction<typeof fetch> {
    const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    return mockFetch;
  }

  /**
   * Validate error types and messages
   */
  static expectErrorType<T extends Error>(
    promise: Promise<any>,
    ErrorClass: new (...args: any[]) => T,
    message?: string
  ) {
    return expect(promise).rejects.toThrow(expect.objectContaining({
      constructor: ErrorClass,
      ...(message && { message: expect.stringContaining(message) })
    }));
  }

  /**
   * Create test configuration objects
   */
  static createTestConfig(overrides: Record<string, any> = {}): Record<string, any> {
    return {
      apiKey: 'test-api-key',
      maxRetries: 3,
      timeout: 30000,
      organizationId: 'test-org',
      ...overrides
    };
  }

  /**
   * Generate performance metrics for testing
   */
  static generatePerformanceMetrics(count: number): AIMetrics[] {
    return Array.from({ length: count }, (_, i) => ({
      provider: 'test-provider',
      model: 'test-model',
      operation: 'completion',
      latency: Math.random() * 2000 + 500, // 500-2500ms
      tokenCount: {
        prompt: Math.floor(Math.random() * 100) + 10,
        completion: Math.floor(Math.random() * 50) + 5,
        total: Math.floor(Math.random() * 150) + 15
      },
      cost: Math.random() * 0.01, // $0-0.01
      success: Math.random() > 0.1, // 90% success rate
      metadata: {
        taskType: 'test-task',
        organizationId: 'test-org',
        userId: 'test-user'
      }
    }));
  }
}

// =============================================================================
// SPECIALIZED TEST HELPERS
// =============================================================================

/**
 * Helpers for testing specific AI functionality
 */
export class AITestHelpers {
  /**
   * Test adapter contract compliance
   */
  static async testAdapterContract(adapter: AIProviderAdapter) {
    // Test required methods exist
    expect(typeof adapter.getName).toBe('function');
    expect(typeof adapter.initialize).toBe('function');
    expect(typeof adapter.generateCompletion).toBe('function');
    expect(typeof adapter.getCapabilities).toBe('function');
    expect(typeof adapter.checkHealth).toBe('function');

    // Test getName returns string
    expect(typeof adapter.getName()).toBe('string');

    // Test capabilities structure
    const capabilities = adapter.getCapabilities();
    TestAssertions.expectValidCapabilities(capabilities);

    // Test health check
    const health = await adapter.checkHealth();
    TestAssertions.expectValidHealthStatus(health);
  }

  /**
   * Test error handling for different error types
   */
  static async testErrorHandling(
    adapter: AIProviderAdapter,
    mockFetch: jest.MockedFunction<typeof fetch>
  ) {
    const request = TestFixtures.completionRequests.simple;

    // Test 401 - Authentication Error
    mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createErrorResponse(401, 'Unauthorized'));
    await expect(adapter.generateCompletion(request)).rejects.toThrow();

    // Test 429 - Rate Limit Error
    mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createErrorResponse(429, 'Rate limit exceeded'));
    await expect(adapter.generateCompletion(request)).rejects.toThrow();

    // Test 500 - Server Error
    mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createErrorResponse(500, 'Internal server error'));
    await expect(adapter.generateCompletion(request)).rejects.toThrow();

    // Test Network Error
    mockFetch.mockImplementationOnce(() => MockAPIResponseFactory.createNetworkError());
    await expect(adapter.generateCompletion(request)).rejects.toThrow();
  }

  /**
   * Test streaming functionality
   */
  static async testStreaming(adapter: AIProviderAdapter) {
    const request: UnifiedStreamRequest = {
      ...TestFixtures.completionRequests.simple,
      options: { stream: true }
    };

    const stream = adapter.streamCompletion(request);
    const chunks = await TestUtils.collectStreamChunks(stream);

    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach(chunk => {
      expect(chunk).toEqual(expect.objectContaining({
        content: expect.any(String),
        metadata: expect.objectContaining({
          provider: expect.any(String),
          chunk: true
        })
      }));
    });
  }

  /**
   * Test model resolution logic
   */
  static testModelResolution(adapter: any, testCases: Array<{ input: string; expected: string }>) {
    testCases.forEach(({ input, expected }) => {
      const resolved = adapter.resolveModel(input);
      expect(resolved).toBe(expected);
    });
  }

  /**
   * Test cost and token estimation
   */
  static testCostAndTokenEstimation(adapter: AIProviderAdapter) {
    const usage = {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150
    };

    const cost = adapter.estimateCost(usage, 'test-model');
    TestAssertions.expectCostEstimation(cost);

    const tokenEstimate = adapter.estimateTokens('This is a test message for token estimation');
    expect(tokenEstimate).toBeGreaterThan(0);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  TestFixtures,
  MockAdapterFactory,
  MockStreamFactory,
  MockAPIResponseFactory,
  TestAssertions,
  TestUtils,
  AITestHelpers
};

// Default export for convenience
export default {
  TestFixtures,
  MockAdapterFactory,
  MockStreamFactory,
  MockAPIResponseFactory,
  TestAssertions,
  TestUtils,
  AITestHelpers
};