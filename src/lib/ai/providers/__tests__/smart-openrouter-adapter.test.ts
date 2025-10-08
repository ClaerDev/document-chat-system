/**
 * SmartOpenRouterAdapter Unit Tests
 * 
 * Tests the SmartOpenRouterAdapter functionality including:
 * - Task routing translation
 * - Request/response handling
 * - Error handling
 * - Metrics collection
 * - Provider routing configuration
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SmartOpenRouterAdapter } from '../smart-openrouter-adapter';
import { AIConfiguration } from '../../config/ai-config';
import { 
  UnifiedCompletionRequest, 
  UnifiedCompletionResponse,
  UnifiedEmbeddingRequest,
  TaskType,
  Complexity
} from '../../interfaces/types';
import {
  AuthenticationError,
  RateLimitError,
  ValidationError,
  ProviderUnavailableError
} from '../../interfaces/errors';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock AIConfiguration
jest.mock('../../config/ai-config');
const mockAIConfig = AIConfiguration as jest.Mocked<typeof AIConfiguration>;

describe('SmartOpenRouterAdapter', () => {
  let adapter: SmartOpenRouterAdapter;
  let mockAIConfigInstance: any;

  const mockConfig = {
    apiKey: 'sk-test-key',
    appName: 'Document-Chat-System-Test',
    siteUrl: 'https://test.document-chat-system.vercel.app',
    enableSmartRouting: true,
    costOptimization: 'balanced' as const,
    fallbackStrategy: 'hybrid' as const,
    maxRetries: 3,
    timeout: 30000
  };

  beforeEach(() => {
    // Setup AI config mock
    mockAIConfigInstance = {
      getTaskRouting: jest.fn(),
      getProviderConfig: jest.fn()
    };
    mockAIConfig.getInstance.mockReturnValue(mockAIConfigInstance);

    // Reset fetch mock
    mockFetch.mockClear();

    // Create adapter instance
    adapter = new SmartOpenRouterAdapter(mockConfig);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create adapter with correct configuration', () => {
      expect(adapter).toBeInstanceOf(SmartOpenRouterAdapter);
      expect(mockAIConfig.getInstance).toHaveBeenCalled();
    });

    it('should initialize successfully with valid config', async () => {
      // Mock successful models API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response);

      await expect(adapter.initialize()).resolves.not.toThrow();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key',
            'X-Title': 'Document-Chat-System-Test'
          })
        })
      );
    });

    it('should throw error when API key is missing', async () => {
      const invalidAdapter = new SmartOpenRouterAdapter({
        ...mockConfig,
        apiKey: ''
      });

      await expect(invalidAdapter.initialize()).rejects.toThrow('OpenRouter API key is required');
    });

    it('should throw error when connection test fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response);

      await expect(adapter.initialize()).rejects.toThrow('OpenRouter connection test failed');
    });
  });

  describe('Task Routing Translation', () => {
    beforeEach(() => {
      // Mock task routing configuration
      mockAIConfigInstance.getTaskRouting.mockImplementation((taskType: TaskType) => {
        const configs = {
          'document_analysis': {
            preferredProviders: ['anthropic', 'openai'],
            fallbackProviders: ['google', 'azure'],
            qualityRequirement: 'premium',
            maxLatency: 5000,
            maxCost: 2.0
          },
          'simple_qa': {
            preferredProviders: ['openai', 'google'],
            fallbackProviders: ['anthropic', 'azure'],
            qualityRequirement: 'standard',
            maxLatency: 3000,
            maxCost: 0.8
          }
        };
        return configs[taskType];
      });
    });

    it('should translate document_analysis task routing correctly', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Analyze this document' }],
        model: 'powerful',
        hints: {
          taskType: 'document_analysis',
          complexity: 'high'
        }
      };

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-id',
          choices: [{ message: { content: 'Analysis complete' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
          model: 'anthropic/claude-3-opus',
          generation_id: 'gen-123'
        })
      } as Response);

      const response = await adapter.generateCompletion(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"provider"'),
        })
      );

      // Parse the request body to verify provider configuration
      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      
      expect(requestBody.provider).toEqual({
        order: ['anthropic', 'openai'],
        allow: ['anthropic', 'openai', 'google', 'azure'],
        sort: 'latency', // Due to maxLatency: 5000
        max_price: 2.0,
        require_parameters: false,
        data_collection: 'deny'
      });
    });

    it('should handle simple_qa task routing correctly', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'What is the capital of France?' }],
        model: 'fast',
        hints: {
          taskType: 'simple_qa',
          complexity: 'low'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-id',
          choices: [{ message: { content: 'Paris' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 },
          model: 'openai/gpt-3.5-turbo'
        })
      } as Response);

      await adapter.generateCompletion(request);

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      
      expect(requestBody.provider).toEqual({
        order: ['openai', 'google'],
        allow: ['openai', 'google', 'anthropic', 'azure'],
        sort: 'price', // Cost-optimized for simple tasks
        max_price: 0.8,
        require_parameters: false,
        data_collection: 'deny'
      });
    });

    it('should handle advanced features requirements', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Generate JSON response' }],
        model: 'balanced',
        options: {
          jsonMode: true,
          functionCalling: true
        },
        functions: [
          {
            name: 'analyze_document',
            description: 'Analyze a document',
            parameters: { type: 'object', properties: {} }
          }
        ],
        hints: {
          taskType: 'content_generation',
          complexity: 'medium'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-id',
          choices: [{ message: { content: '{"result": "success"}' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
          model: 'openai/gpt-4o'
        })
      } as Response);

      await adapter.generateCompletion(request);

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      
      expect(requestBody.provider.require_parameters).toBe(true);
      expect(requestBody.response_format).toEqual({ type: 'json_object' });
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'fast'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      } as Response);

      await expect(adapter.generateCompletion(request)).rejects.toThrow(AuthenticationError);
    });

    it('should handle rate limit errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'fast'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      } as Response);

      await expect(adapter.generateCompletion(request)).rejects.toThrow(RateLimitError);
    });

    it('should handle validation errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'fast'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request'
      } as Response);

      await expect(adapter.generateCompletion(request)).rejects.toThrow(ValidationError);
    });

    it('should handle network errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'fast'
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.generateCompletion(request)).rejects.toThrow(ProviderUnavailableError);
    });
  });

  describe('Embedding Generation', () => {
    it('should generate embeddings successfully', async () => {
      const request: UnifiedEmbeddingRequest = {
        text: 'Test embedding text',
        model: 'embedding-small'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: new Array(1536).fill(0.1) }],
          usage: { total_tokens: 10 },
          model: 'openai/text-embedding-3-small'
        })
      } as Response);

      const response = await adapter.generateEmbedding(request);

      expect(response.embedding).toHaveLength(1536);
      expect(response.usage.totalTokens).toBe(10);
      expect(response.metadata.provider).toBe('openrouter');
    });

    it('should handle batch embeddings', async () => {
      const request: UnifiedEmbeddingRequest = {
        text: ['Text one', 'Text two'],
        model: 'embedding-large'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { embedding: new Array(3072).fill(0.1) },
            { embedding: new Array(3072).fill(0.2) }
          ],
          usage: { total_tokens: 20 },
          model: 'openai/text-embedding-3-large'
        })
      } as Response);

      const response = await adapter.generateEmbedding(request);

      expect(Array.isArray(response.embedding)).toBe(true);
      expect(response.embedding).toHaveLength(2);
      expect(response.usage.totalTokens).toBe(20);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate costs correctly for different models', () => {
      const request = {
        messages: [{ role: 'user', content: 'Hello world' }],
        model: 'powerful'
      };

      const estimate = adapter.estimateCost(request);

      expect(estimate.estimatedCost).toBeGreaterThan(0);
      expect(estimate.breakdown.promptTokens).toBeGreaterThan(0);
      expect(estimate.breakdown.completionTokens).toBeGreaterThan(0);
      expect(estimate.breakdown.totalTokens).toBeGreaterThan(0);
    });

    it('should handle different model cost structures', () => {
      const gpt4Request = { messages: [{ role: 'user', content: 'Test' }], model: 'powerful' };
      const gpt35Request = { messages: [{ role: 'user', content: 'Test' }], model: 'fast' };

      const gpt4Estimate = adapter.estimateCost(gpt4Request);
      const gpt35Estimate = adapter.estimateCost(gpt35Request);

      expect(gpt4Estimate.estimatedCost).toBeGreaterThan(gpt35Estimate.estimatedCost);
    });
  });

  describe('Capabilities and Model Info', () => {
    it('should return correct capabilities', () => {
      const capabilities = adapter.getCapabilities();

      expect(capabilities.maxTokens).toBe(200000);
      expect(capabilities.supportsFunctionCalling).toBe(true);
      expect(capabilities.supportsJsonMode).toBe(true);
      expect(capabilities.supportsStreaming).toBe(true);
      expect(capabilities.supportsVision).toBe(true);
      expect(capabilities.models.completion).toContain('openai/gpt-4o');
      expect(capabilities.models.embedding).toContain('openai/text-embedding-3-small');
    });

    it('should return available models', () => {
      const models = adapter.getAvailableModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('provider', 'openrouter');
      expect(models[0]).toHaveProperty('costPer1KTokens');
      expect(models[0]).toHaveProperty('averageLatency');
      expect(models[0]).toHaveProperty('qualityScore');
    });
  });

  describe('Model Mapping', () => {
    it('should map unified model names correctly', () => {
      // Test via actual request to see the mapping
      const testCases = [
        { unified: 'fast', expected: 'openai/gpt-3.5-turbo' },
        { unified: 'balanced', expected: 'openai/gpt-4o-mini' },
        { unified: 'powerful', expected: 'openai/gpt-4o' }
      ];

      testCases.forEach(({ unified, expected }) => {
        const request: UnifiedCompletionRequest = {
          messages: [{ role: 'user', content: 'Test' }],
          model: unified
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'test-id',
            choices: [{ message: { content: 'Test' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            model: expected
          })
        } as Response);

        // Call the method to trigger model mapping
        adapter.generateCompletion(request).catch(() => {});

        const callArgs = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const requestBody = JSON.parse(callArgs[1]?.body as string);
        expect(requestBody.model).toBe(expected);
      });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when API is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 'openai/gpt-4o' },
            { id: 'anthropic/claude-3-opus' }
          ]
        })
      } as Response);

      const health = await adapter.getHealthMetrics();

      expect(health.status).toBe('healthy');
      expect(health.availableProviders).toContain('openai');
      expect(health.availableProviders).toContain('anthropic');
      expect(health.latency).toBeGreaterThan(0);
    });

    it('should return unavailable status when API is down', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const health = await adapter.getHealthMetrics();

      expect(health.status).toBe('unavailable');
      expect(health.errors).toContain('OpenRouter API returned 500');
    });
  });
});