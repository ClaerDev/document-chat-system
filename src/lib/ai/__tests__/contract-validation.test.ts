/**
 * Contract Validation Tests
 * 
 * Runs contract tests against all AI provider adapters to ensure
 * they implement the same interface correctly and behave consistently.
 * This validates adapter interchangeability and consistent behavior.
 */

import { describe, beforeEach, afterEach, jest } from '@jest/globals';
import { OpenAIAdapter } from '../providers/openai-adapter';
import { AnthropicAdapter } from '../providers/anthropic-adapter';
import { SmartOpenRouterAdapter } from '../providers/smart-openrouter-adapter';
import { 
  runAdapterContractTests, 
  runPerformanceContractTests, 
  runIntegrationContractTests 
} from './shared/contract-tests';

// Mock external dependencies
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn()
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn()
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn(),
  embed: jest.fn()
}));

jest.mock('@/lib/config/env', () => ({
  ai: {
    openai: {
      apiKey: 'sk-test-openai-key',
      organizationId: 'org-test'
    },
    anthropic: {
      apiKey: 'sk-ant-test-key'
    },
    models: {
      fast: 'gpt-3.5-turbo',
      balanced: 'gpt-4o-mini',
      powerful: 'gpt-4o'
    }
  }
}));

// =============================================================================
// OPENAI ADAPTER CONTRACT TESTS
// =============================================================================

describe('OpenAI Adapter Contract Validation', () => {
  const createAdapter = () => new OpenAIAdapter({
    apiKey: 'sk-test-openai-key',
    organizationId: 'org-test',
    maxRetries: 3,
    timeout: 30000
  });

  const setupMocks = () => {
    // Mock OpenAI client creation
    const { openai } = jest.requireMock('@ai-sdk/openai');
    openai.mockReturnValue({});
  };

  const cleanupMocks = () => {
    jest.clearAllMocks();
  };

  // Run all contract tests
  runAdapterContractTests('openai', createAdapter, setupMocks, cleanupMocks);
  runPerformanceContractTests('openai', createAdapter, setupMocks, cleanupMocks);
  runIntegrationContractTests('openai', createAdapter, setupMocks, cleanupMocks);
});

// =============================================================================
// ANTHROPIC ADAPTER CONTRACT TESTS
// =============================================================================

describe('Anthropic Adapter Contract Validation', () => {
  const createAdapter = () => new AnthropicAdapter({
    apiKey: 'sk-ant-test-key',
    maxRetries: 3,
    timeout: 30000
  });

  const setupMocks = () => {
    // Mock Anthropic client creation
    const { createAnthropic } = jest.requireMock('@ai-sdk/anthropic');
    createAnthropic.mockReturnValue({});
  };

  const cleanupMocks = () => {
    jest.clearAllMocks();
  };

  // Run all contract tests
  runAdapterContractTests('anthropic', createAdapter, setupMocks, cleanupMocks);
  runPerformanceContractTests('anthropic', createAdapter, setupMocks, cleanupMocks);
  runIntegrationContractTests('anthropic', createAdapter, setupMocks, cleanupMocks);
});

// =============================================================================
// OPENROUTER ADAPTER CONTRACT TESTS
// =============================================================================

describe('OpenRouter Adapter Contract Validation', () => {
  const createAdapter = () => new SmartOpenRouterAdapter({
    apiKey: 'sk-or-test-key',
    appName: 'Document-Chat-System-Test',
    siteUrl: 'https://test.document-chat-system.vercel.app',
    enableSmartRouting: true,
    costOptimization: 'balanced',
    fallbackStrategy: 'hybrid',
    maxRetries: 3,
    timeout: 30000
  });

  const setupMocks = () => {
    // OpenRouter uses fetch directly, so we just need to mock fetch
    global.fetch = jest.fn();
  };

  const cleanupMocks = () => {
    jest.clearAllMocks();
  };

  // Run all contract tests
  runAdapterContractTests('openrouter', createAdapter, setupMocks, cleanupMocks);
  runPerformanceContractTests('openrouter', createAdapter, setupMocks, cleanupMocks);
  runIntegrationContractTests('openrouter', createAdapter, setupMocks, cleanupMocks);
});

// =============================================================================
// CROSS-ADAPTER COMPATIBILITY TESTS
// =============================================================================

describe('Cross-Adapter Compatibility Tests', () => {
  let openaiAdapter: OpenAIAdapter;
  let anthropicAdapter: AnthropicAdapter;
  let openrouterAdapter: SmartOpenRouterAdapter;

  beforeEach(() => {
    // Setup mocks for all adapters
    const { openai } = jest.requireMock('@ai-sdk/openai');
    const { createAnthropic } = jest.requireMock('@ai-sdk/anthropic');
    openai.mockReturnValue({});
    createAnthropic.mockReturnValue({});
    global.fetch = jest.fn();

    // Create adapter instances
    openaiAdapter = new OpenAIAdapter({
      apiKey: 'sk-test-openai-key',
      organizationId: 'org-test',
      maxRetries: 3,
      timeout: 30000
    });

    anthropicAdapter = new AnthropicAdapter({
      apiKey: 'sk-ant-test-key',
      maxRetries: 3,
      timeout: 30000
    });

    openrouterAdapter = new SmartOpenRouterAdapter({
      apiKey: 'sk-or-test-key',
      appName: 'Document-Chat-System-Test',
      siteUrl: 'https://test.document-chat-system.vercel.app',
      enableSmartRouting: true,
      costOptimization: 'balanced',
      fallbackStrategy: 'hybrid',
      maxRetries: 3,
      timeout: 30000
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Interface Consistency', () => {
    it('should have consistent method signatures', () => {
      const adapters = [openaiAdapter, anthropicAdapter, openrouterAdapter];
      
      adapters.forEach(adapter => {
        // Check method existence and signatures
        expect(typeof adapter.getName).toBe('function');
        expect(typeof adapter.initialize).toBe('function');
        expect(typeof adapter.generateCompletion).toBe('function');
        expect(typeof adapter.generateEmbedding).toBe('function');
        expect(typeof adapter.streamCompletion).toBe('function');
        expect(typeof adapter.getCapabilities).toBe('function');
        expect(typeof adapter.getAvailableModels).toBe('function');
        expect(typeof adapter.estimateCost).toBe('function');
        expect(typeof adapter.estimateTokens).toBe('function');
        expect(typeof adapter.checkHealth).toBe('function');
        expect(typeof adapter.getHealth).toBe('function');
      });
    });

    it('should return consistent data structures', () => {
      const adapters = [openaiAdapter, anthropicAdapter, openrouterAdapter];
      
      adapters.forEach(adapter => {
        const capabilities = adapter.getCapabilities();
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

        const models = adapter.getAvailableModels();
        expect(Array.isArray(models)).toBe(true);
        
        const health = adapter.getHealth();
        expect(health).toEqual(expect.objectContaining({
          isHealthy: expect.any(Boolean),
          lastHealthCheck: expect.any(Date)
        }));
      });
    });
  });

  describe('Capability Compatibility', () => {
    it('should handle embedding support consistently', () => {
      const openaiCapabilities = openaiAdapter.getCapabilities();
      const anthropicCapabilities = anthropicAdapter.getCapabilities();
      const openrouterCapabilities = openrouterAdapter.getCapabilities();

      // OpenAI and OpenRouter should support embeddings
      expect(openaiCapabilities.models.embedding).toBeDefined();
      expect(openrouterCapabilities.models.embedding).toBeDefined();

      // Anthropic should not support embeddings
      expect(anthropicCapabilities.models.embedding).toBeUndefined();
    });

    it('should handle JSON mode support consistently', () => {
      const openaiCapabilities = openaiAdapter.getCapabilities();
      const anthropicCapabilities = anthropicAdapter.getCapabilities();
      const openrouterCapabilities = openrouterAdapter.getCapabilities();

      // OpenAI and OpenRouter should support JSON mode
      expect(openaiCapabilities.supportsJsonMode).toBe(true);
      expect(openrouterCapabilities.supportsJsonMode).toBe(true);

      // Anthropic should not support JSON mode
      expect(anthropicCapabilities.supportsJsonMode).toBe(false);
    });

    it('should handle function calling support consistently', () => {
      const adapters = [openaiAdapter, anthropicAdapter, openrouterAdapter];
      
      adapters.forEach(adapter => {
        const capabilities = adapter.getCapabilities();
        expect(typeof capabilities.supportsFunctionCalling).toBe('boolean');
      });
    });
  });

  describe('Model Resolution Consistency', () => {
    it('should handle unified model names consistently', () => {
      const unifiedModels = ['fast', 'balanced', 'powerful'];
      
      unifiedModels.forEach(model => {
        const openaiResolved = (openaiAdapter as any).resolveModel?.(model);
        const anthropicResolved = (anthropicAdapter as any).resolveModel?.(model);
        const openrouterResolved = (openrouterAdapter as any).resolveModel?.(model);

        // Each adapter should resolve to a specific model
        if (openaiResolved) expect(typeof openaiResolved).toBe('string');
        if (anthropicResolved) expect(typeof anthropicResolved).toBe('string');
        if (openrouterResolved) expect(typeof openrouterResolved).toBe('string');
      });
    });

    it('should handle cross-provider model fallbacks', () => {
      const crossProviderModels = ['gpt-4', 'claude-3-opus', 'gemini-pro'];
      
      crossProviderModels.forEach(model => {
        const openaiResolved = (openaiAdapter as any).resolveModel?.(model);
        const anthropicResolved = (anthropicAdapter as any).resolveModel?.(model);
        const openrouterResolved = (openrouterAdapter as any).resolveModel?.(model);

        // Each adapter should provide a fallback
        if (openaiResolved) expect(typeof openaiResolved).toBe('string');
        if (anthropicResolved) expect(typeof anthropicResolved).toBe('string');
        if (openrouterResolved) expect(typeof openrouterResolved).toBe('string');
      });
    });
  });

  describe('Cost Estimation Consistency', () => {
    it('should provide reasonable cost estimates', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      const adapters = [openaiAdapter, anthropicAdapter, openrouterAdapter];
      
      adapters.forEach(adapter => {
        const cost = adapter.estimateCost(usage, 'test-model');
        expect(typeof cost).toBe('number');
        expect(cost).toBeGreaterThanOrEqual(0);
        expect(cost).toBeLessThanOrEqual(1); // Should be reasonable
      });
    });

    it('should provide consistent token estimates', () => {
      const testText = 'This is a test message for token estimation';
      const adapters = [openaiAdapter, anthropicAdapter, openrouterAdapter];
      
      const estimates = adapters.map(adapter => adapter.estimateTokens(testText));
      
      // All estimates should be reasonable and within similar ranges
      estimates.forEach(estimate => {
        expect(estimate).toBeGreaterThan(5);
        expect(estimate).toBeLessThan(50);
      });

      // Estimates should be relatively close to each other
      const maxEstimate = Math.max(...estimates);
      const minEstimate = Math.min(...estimates);
      expect(maxEstimate / minEstimate).toBeLessThan(3); // Within 3x of each other
    });
  });
});

// =============================================================================
// ADAPTER INTERCHANGEABILITY TESTS
// =============================================================================

describe('Adapter Interchangeability Tests', () => {
  it('should be able to replace one adapter with another', () => {
    // Create a mock service that uses any adapter
    class MockAIService {
      private adapter: OpenAIAdapter | AnthropicAdapter | SmartOpenRouterAdapter;

      constructor(adapter: OpenAIAdapter | AnthropicAdapter | SmartOpenRouterAdapter) {
        this.adapter = adapter;
      }

      getName(): string {
        return this.adapter.getName();
      }

      getCapabilities() {
        return this.adapter.getCapabilities();
      }

      async generateCompletion(request: any) {
        return this.adapter.generateCompletion(request);
      }
    }

    // Setup mocks
    const { openai } = jest.requireMock('@ai-sdk/openai');
    const { createAnthropic } = jest.requireMock('@ai-sdk/anthropic');
    openai.mockReturnValue({});
    createAnthropic.mockReturnValue({});
    global.fetch = jest.fn();

    // Create adapters
    const openaiAdapter = new OpenAIAdapter({
      apiKey: 'sk-test-openai-key',
      organizationId: 'org-test',
      maxRetries: 3,
      timeout: 30000
    });

    const anthropicAdapter = new AnthropicAdapter({
      apiKey: 'sk-ant-test-key',
      maxRetries: 3,
      timeout: 30000
    });

    const openrouterAdapter = new SmartOpenRouterAdapter({
      apiKey: 'sk-or-test-key',
      appName: 'Document-Chat-System-Test',
      siteUrl: 'https://test.document-chat-system.vercel.app',
      enableSmartRouting: true,
      costOptimization: 'balanced',
      fallbackStrategy: 'hybrid',
      maxRetries: 3,
      timeout: 30000
    });

    // Test that service can use any adapter
    const serviceWithOpenAI = new MockAIService(openaiAdapter);
    const serviceWithAnthropic = new MockAIService(anthropicAdapter);
    const serviceWithOpenRouter = new MockAIService(openrouterAdapter);

    expect(serviceWithOpenAI.getName()).toBe('openai');
    expect(serviceWithAnthropic.getName()).toBe('anthropic');
    expect(serviceWithOpenRouter.getName()).toBe('openrouter');

    // All should provide capabilities
    expect(serviceWithOpenAI.getCapabilities()).toBeDefined();
    expect(serviceWithAnthropic.getCapabilities()).toBeDefined();
    expect(serviceWithOpenRouter.getCapabilities()).toBeDefined();
  });
});

// =============================================================================
// REGRESSION TESTS
// =============================================================================

describe('Adapter Regression Tests', () => {
  it('should maintain backward compatibility', () => {
    // Setup mocks
    const { openai } = jest.requireMock('@ai-sdk/openai');
    const { createAnthropic } = jest.requireMock('@ai-sdk/anthropic');
    openai.mockReturnValue({});
    createAnthropic.mockReturnValue({});
    global.fetch = jest.fn();

    // Create adapters with minimal configuration
    const openaiAdapter = new OpenAIAdapter({
      apiKey: 'sk-test-openai-key'
    });

    const anthropicAdapter = new AnthropicAdapter({
      apiKey: 'sk-ant-test-key'
    });

    const openrouterAdapter = new SmartOpenRouterAdapter({
      apiKey: 'sk-or-test-key',
      appName: 'Document-Chat-System-Test',
      siteUrl: 'https://test.document-chat-system.vercel.app'
    });

    // Should create without errors
    expect(openaiAdapter).toBeInstanceOf(OpenAIAdapter);
    expect(anthropicAdapter).toBeInstanceOf(AnthropicAdapter);
    expect(openrouterAdapter).toBeInstanceOf(SmartOpenRouterAdapter);

    // Should have basic functionality
    expect(openaiAdapter.getName()).toBe('openai');
    expect(anthropicAdapter.getName()).toBe('anthropic');
    expect(openrouterAdapter.getName()).toBe('openrouter');
  });
});