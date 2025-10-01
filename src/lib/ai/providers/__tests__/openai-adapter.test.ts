/**
 * OpenAI Adapter Tests
 * 
 * Comprehensive unit tests for the OpenAI adapter implementation
 * covering all functionality including completions, embeddings, streaming,
 * error handling, cost estimation, and health checks.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { OpenAIAdapter } from '../openai-adapter';
import { 
  UnifiedCompletionRequest, 
  UnifiedEmbeddingRequest,
  UnifiedCompletionResponse,
  UnifiedEmbeddingResponse,
  ProviderCapabilities,
  TaskType 
} from '../interfaces/types';
import {
  AuthenticationError,
  RateLimitError,
  ValidationError,
  QuotaExceededError,
  NetworkError,
  ProviderUnavailableError
} from '../interfaces/errors';

// Mock AI SDK
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn()
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn(),
  embed: jest.fn()
}));

// Mock configuration
jest.mock('@/lib/config/env', () => ({
  ai: {
    openai: {
      apiKey: 'sk-test-key',
      organizationId: 'org-test'
    },
    models: {
      fast: 'gpt-3.5-turbo',
      balanced: 'gpt-4o-mini',
      powerful: 'gpt-4o'
    }
  }
}));

import { generateText, streamText, embed } from 'ai';
import { openai } from '@ai-sdk/openai';

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;
const mockStreamText = streamText as jest.MockedFunction<typeof streamText>;
const mockEmbed = embed as jest.MockedFunction<typeof embed>;
const mockOpenAI = openai as jest.MockedFunction<typeof openai>;

describe('OpenAI Adapter Tests', () => {
  let adapter: OpenAIAdapter;
  let mockConfig: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock configuration
    mockConfig = {
      apiKey: 'sk-test-key',
      organizationId: 'org-test',
      maxRetries: 3,
      timeout: 30000
    };

    // Create adapter instance
    adapter = new OpenAIAdapter(mockConfig);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create adapter with valid configuration', () => {
      expect(adapter).toBeInstanceOf(OpenAIAdapter);
      expect(adapter.getName()).toBe('openai');
      expect(adapter.getHealth().isHealthy).toBe(false); // Not initialized yet
    });

    it('should throw error for invalid API key', () => {
      expect(() => new OpenAIAdapter({ apiKey: '' })).toThrow(ValidationError);
      expect(() => new OpenAIAdapter({ apiKey: 'invalid-key' })).toThrow(ValidationError);
    });

    it('should initialize successfully with valid API key', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'Hello',
        usage: { promptTokens: 5, completionTokens: 1, totalTokens: 6 }
      });

      await adapter.initialize();

      expect(adapter.getHealth().isHealthy).toBe(true);
      expect(adapter.getHealth().lastHealthCheck).toBeInstanceOf(Date);
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(Object),
          messages: [{ role: 'user', content: 'Hello' }],
          maxTokens: 5
        })
      );
    });

    it('should handle initialization failure', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Invalid API key'));

      await expect(adapter.initialize()).rejects.toThrow(AuthenticationError);
      expect(adapter.getHealth().isHealthy).toBe(false);
    });
  });

  describe('Model Resolution', () => {
    it('should resolve unified model names', () => {
      const testCases = [
        { input: 'fast', expected: 'gpt-3.5-turbo' },
        { input: 'balanced', expected: 'gpt-4o-mini' },
        { input: 'powerful', expected: 'gpt-4o' }
      ];

      testCases.forEach(({ input, expected }) => {
        const resolved = (adapter as any).resolveModel(input);
        expect(resolved).toBe(expected);
      });
    });

    it('should handle direct OpenAI model names', () => {
      const directModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo-16k'];
      
      directModels.forEach(model => {
        const resolved = (adapter as any).resolveModel(model);
        expect(resolved).toBe(model);
      });
    });

    it('should handle cross-provider model fallbacks', () => {
      const crossProviderCases = [
        { input: 'claude-3-opus', expected: 'gpt-4o' },
        { input: 'gemini-pro', expected: 'gpt-4o' },
        { input: 'claude-3-haiku', expected: 'gpt-3.5-turbo' }
      ];

      crossProviderCases.forEach(({ input, expected }) => {
        const resolved = (adapter as any).resolveModel(input);
        expect(resolved).toBe(expected);
      });
    });

    it('should default to balanced model for unknown models', () => {
      const unknownModels = ['unknown-model', 'custom-model'];
      
      unknownModels.forEach(model => {
        const resolved = (adapter as any).resolveModel(model);
        expect(resolved).toBe('gpt-4o-mini');
      });
    });
  });

  describe('Text Completion', () => {
    beforeEach(async () => {
      // Initialize adapter
      mockGenerateText.mockResolvedValueOnce({
        text: 'Hello',
        usage: { promptTokens: 5, completionTokens: 1, totalTokens: 6 }
      });
      await adapter.initialize();
    });

    it('should generate completion successfully', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
        model: 'fast',
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      const mockResponse = {
        text: 'I am doing well, thank you for asking!',
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25
        },
        finishReason: 'stop',
        response: {
          id: 'chatcmpl-123',
          model: 'gpt-3.5-turbo'
        }
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse);

      const response = await adapter.generateCompletion(request);

      expect(response).toEqual<UnifiedCompletionResponse>({
        id: 'chatcmpl-123',
        content: 'I am doing well, thank you for asking!',
        model: 'gpt-3.5-turbo',
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25
        },
        metadata: {
          provider: 'openai',
          finishReason: 'stop',
          organizationId: 'org-123',
          userId: 'user-456'
        }
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(Object),
          messages: [{ role: 'user', content: 'Hello, how are you?' }]
        })
      );
    });

    it('should handle completion with function calling', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Get the weather in New York' }],
        model: 'balanced',
        functions: [
          {
            name: 'get_weather',
            description: 'Get weather information',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' }
              },
              required: ['location']
            }
          }
        ],
        options: {
          functionCalling: true
        },
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      const mockResponse = {
        text: null,
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
        finishReason: 'tool_calls',
        response: {
          id: 'chatcmpl-function',
          model: 'gpt-4o-mini'
        },
        toolCalls: [
          {
            id: 'call_123',
            name: 'get_weather',
            args: { location: 'New York' }
          }
        ]
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse);

      const response = await adapter.generateCompletion(request);

      expect(response.metadata.finishReason).toBe('tool_calls');
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.arrayContaining([
            expect.objectContaining({
              type: 'function',
              function: expect.objectContaining({
                name: 'get_weather'
              })
            })
          ])
        })
      );
    });

    it('should handle completion with JSON mode', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Return data in JSON format' }],
        model: 'balanced',
        options: {
          jsonMode: true
        },
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      const mockResponse = {
        text: '{"status": "success", "data": "response"}',
        usage: { promptTokens: 15, completionTokens: 8, totalTokens: 23 },
        finishReason: 'stop',
        response: {
          id: 'chatcmpl-json',
          model: 'gpt-4o-mini'
        }
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse);

      const response = await adapter.generateCompletion(request);

      expect(response.content).toBe('{"status": "success", "data": "response"}');
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: 'json_object' }
        })
      );
    });

    it('should handle completion with temperature and max tokens', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Creative writing task' }],
        model: 'powerful',
        options: {
          temperature: 0.8,
          maxTokens: 500
        },
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      const mockResponse = {
        text: 'Creative response here...',
        usage: { promptTokens: 12, completionTokens: 50, totalTokens: 62 },
        finishReason: 'stop',
        response: {
          id: 'chatcmpl-creative',
          model: 'gpt-4o'
        }
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse);

      await adapter.generateCompletion(request);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.8,
          maxTokens: 500
        })
      );
    });

    it('should handle completion with system message', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello' }
        ],
        model: 'fast',
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      const mockResponse = {
        text: 'Hello! How can I help you today?',
        usage: { promptTokens: 15, completionTokens: 8, totalTokens: 23 },
        finishReason: 'stop',
        response: {
          id: 'chatcmpl-system',
          model: 'gpt-3.5-turbo'
        }
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse);

      await adapter.generateCompletion(request);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello' }
          ]
        })
      );
    });
  });

  describe('Streaming Completion', () => {
    beforeEach(async () => {
      // Initialize adapter
      mockGenerateText.mockResolvedValueOnce({
        text: 'Hello',
        usage: { promptTokens: 5, completionTokens: 1, totalTokens: 6 }
      });
      await adapter.initialize();
    });

    it('should stream completion successfully', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Tell me a story' }],
        model: 'balanced',
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      const mockTextStream = {
        textStream: (async function* () {
          yield 'Once';
          yield ' upon';
          yield ' a';
          yield ' time';
        })(),
        usage: Promise.resolve({
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }),
        finishReason: Promise.resolve('stop'),
        response: Promise.resolve({
          id: 'chatcmpl-stream',
          model: 'gpt-4o-mini'
        })
      };

      mockStreamText.mockResolvedValueOnce(mockTextStream);

      const stream = await adapter.streamCompletion(request);

      // Collect stream chunks
      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Once', ' upon', ' a', ' time']);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(Object),
          messages: [{ role: 'user', content: 'Tell me a story' }]
        })
      );
    });

    it('should handle streaming errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test streaming error' }],
        model: 'fast',
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      mockStreamText.mockRejectedValueOnce(new Error('Stream error'));

      await expect(adapter.streamCompletion(request)).rejects.toThrow();
    });
  });

  describe('Embedding Generation', () => {
    beforeEach(async () => {
      // Initialize adapter
      mockGenerateText.mockResolvedValueOnce({
        text: 'Hello',
        usage: { promptTokens: 5, completionTokens: 1, totalTokens: 6 }
      });
      await adapter.initialize();
    });

    it('should generate embedding successfully', async () => {
      const request: UnifiedEmbeddingRequest = {
        text: 'Government contract opportunity',
        model: 'embedding-small',
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      const mockResponse = {
        embedding: mockEmbedding,
        usage: { tokens: 5 }
      };

      mockEmbed.mockResolvedValueOnce(mockResponse);

      const response = await adapter.generateEmbedding(request);

      expect(response).toEqual<UnifiedEmbeddingResponse>({
        embedding: mockEmbedding,
        usage: {
          promptTokens: 5,
          totalTokens: 5
        },
        metadata: {
          provider: 'openai',
          model: 'text-embedding-3-small',
          organizationId: 'org-123',
          userId: 'user-456'
        }
      });

      expect(mockEmbed).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(Object),
          value: 'Government contract opportunity'
        })
      );
    });

    it('should handle large embedding model', async () => {
      const request: UnifiedEmbeddingRequest = {
        text: 'Large document for embedding',
        model: 'embedding-large',
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      const mockEmbedding = new Array(3072).fill(0).map(() => Math.random());
      const mockResponse = {
        embedding: mockEmbedding,
        usage: { tokens: 8 }
      };

      mockEmbed.mockResolvedValueOnce(mockResponse);

      const response = await adapter.generateEmbedding(request);

      expect(response.embedding).toHaveLength(3072);
      expect(response.metadata.model).toBe('text-embedding-3-large');
    });

    it('should handle embedding with dimensions parameter', async () => {
      const request: UnifiedEmbeddingRequest = {
        text: 'Text with custom dimensions',
        model: 'embedding-small',
        options: {
          dimensions: 512
        },
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      const mockEmbedding = new Array(512).fill(0).map(() => Math.random());
      const mockResponse = {
        embedding: mockEmbedding,
        usage: { tokens: 6 }
      };

      mockEmbed.mockResolvedValueOnce(mockResponse);

      const response = await adapter.generateEmbedding(request);

      expect(response.embedding).toHaveLength(512);
      expect(mockEmbed).toHaveBeenCalledWith(
        expect.objectContaining({
          dimensions: 512
        })
      );
    });

    it('should handle embedding errors', async () => {
      const request: UnifiedEmbeddingRequest = {
        text: 'Test embedding error',
        model: 'embedding-small',
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      mockEmbed.mockRejectedValueOnce(new Error('Embedding failed'));

      await expect(adapter.generateEmbedding(request)).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      // Initialize adapter
      mockGenerateText.mockResolvedValueOnce({
        text: 'Hello',
        usage: { promptTokens: 5, completionTokens: 1, totalTokens: 6 }
      });
      await adapter.initialize();
    });

    it('should handle authentication errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test auth error' }],
        model: 'fast',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      const authError = new Error('Authentication failed');
      (authError as any).cause = { status: 401 };
      mockGenerateText.mockRejectedValueOnce(authError);

      await expect(adapter.generateCompletion(request)).rejects.toThrow(AuthenticationError);
    });

    it('should handle rate limit errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test rate limit' }],
        model: 'fast',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).cause = { status: 429 };
      mockGenerateText.mockRejectedValueOnce(rateLimitError);

      await expect(adapter.generateCompletion(request)).rejects.toThrow(RateLimitError);
    });

    it('should handle validation errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test validation error' }],
        model: 'fast',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      const validationError = new Error('Invalid request');
      (validationError as any).cause = { status: 400 };
      mockGenerateText.mockRejectedValueOnce(validationError);

      await expect(adapter.generateCompletion(request)).rejects.toThrow(ValidationError);
    });

    it('should handle quota exceeded errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test quota error' }],
        model: 'fast',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      const quotaError = new Error('Quota exceeded');
      (quotaError as any).cause = { status: 402 };
      mockGenerateText.mockRejectedValueOnce(quotaError);

      await expect(adapter.generateCompletion(request)).rejects.toThrow(QuotaExceededError);
    });

    it('should handle network errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test network error' }],
        model: 'fast',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNREFUSED';
      mockGenerateText.mockRejectedValueOnce(networkError);

      await expect(adapter.generateCompletion(request)).rejects.toThrow(NetworkError);
    });

    it('should handle server errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test server error' }],
        model: 'fast',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      const serverError = new Error('Server error');
      (serverError as any).cause = { status: 500 };
      mockGenerateText.mockRejectedValueOnce(serverError);

      await expect(adapter.generateCompletion(request)).rejects.toThrow(ProviderUnavailableError);
    });

    it('should handle timeout errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test timeout' }],
        model: 'fast',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      mockGenerateText.mockRejectedValueOnce(timeoutError);

      await expect(adapter.generateCompletion(request)).rejects.toThrow(NetworkError);
    });

    it('should handle generic errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test generic error' }],
        model: 'fast',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      const genericError = new Error('Unknown error');
      mockGenerateText.mockRejectedValueOnce(genericError);

      await expect(adapter.generateCompletion(request)).rejects.toThrow('Unknown error');
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate completion cost correctly', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500
      };

      const cost = adapter.estimateCost(usage, 'gpt-4o');
      
      // GPT-4o pricing: $0.0025 per 1K prompt tokens, $0.01 per 1K completion tokens
      const expectedCost = (1000 * 0.0025 / 1000) + (500 * 0.01 / 1000);
      expect(cost).toBeCloseTo(expectedCost, 6);
    });

    it('should estimate embedding cost correctly', () => {
      const usage = {
        promptTokens: 100,
        totalTokens: 100
      };

      const cost = adapter.estimateCost(usage, 'text-embedding-3-small');
      
      // Text embedding pricing: $0.00002 per 1K tokens
      const expectedCost = 100 * 0.00002 / 1000;
      expect(cost).toBeCloseTo(expectedCost, 6);
    });

    it('should handle unknown model cost estimation', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      const cost = adapter.estimateCost(usage, 'unknown-model');
      
      // Should default to gpt-4o-mini pricing
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('Token Estimation', () => {
    it('should estimate completion tokens', () => {
      const messages = [
        { role: 'user', content: 'Hello, how are you today?' },
        { role: 'assistant', content: 'I am doing well, thank you for asking!' }
      ];

      const tokens = adapter.estimateTokens(messages);
      
      // Should be approximately 4 characters per token
      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(50);
    });

    it('should estimate embedding tokens', () => {
      const text = 'Government contract opportunity for IT services';
      const tokens = adapter.estimateTokens(text);
      
      // Should be approximately 4 characters per token
      expect(tokens).toBeGreaterThan(5);
      expect(tokens).toBeLessThan(20);
    });

    it('should handle empty input', () => {
      expect(adapter.estimateTokens('')).toBe(0);
      expect(adapter.estimateTokens([])).toBe(0);
    });
  });

  describe('Health Checks', () => {
    it('should perform health check successfully', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'OK',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
      });

      const health = await adapter.checkHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    it('should handle health check failure', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Health check failed'));

      const health = await adapter.checkHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  describe('Capabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = adapter.getCapabilities();

      expect(capabilities).toEqual<ProviderCapabilities>({
        maxTokens: 128000,
        supportsFunctionCalling: true,
        supportsJsonMode: true,
        supportsStreaming: true,
        supportsVision: true,
        embeddingDimensions: [512, 1536, 3072],
        models: {
          completion: expect.arrayContaining(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']),
          embedding: expect.arrayContaining(['text-embedding-3-small', 'text-embedding-3-large'])
        }
      });
    });

    it('should return available models with metadata', () => {
      const models = adapter.getAvailableModels();

      expect(models).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            type: 'completion',
            contextLength: 128000,
            costPer1kTokens: expect.objectContaining({
              prompt: expect.any(Number),
              completion: expect.any(Number)
            })
          })
        ])
      );
    });
  });

  describe('Message Formatting', () => {
    it('should format messages correctly', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      const formatted = (adapter as any).formatMessages(messages);
      
      expect(formatted).toEqual([
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]);
    });

    it('should handle empty messages array', () => {
      const formatted = (adapter as any).formatMessages([]);
      expect(formatted).toEqual([]);
    });

    it('should handle invalid message roles', () => {
      const messages = [
        { role: 'invalid', content: 'Test' }
      ];

      expect(() => (adapter as any).formatMessages(messages)).toThrow(ValidationError);
    });
  });

  describe('Request Validation', () => {
    it('should validate completion request', () => {
      const validRequest: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'fast',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      expect(() => (adapter as any).validateCompletionRequest(validRequest)).not.toThrow();
    });

    it('should reject invalid completion request', () => {
      const invalidRequest = {
        messages: [],
        model: 'fast'
      };

      expect(() => (adapter as any).validateCompletionRequest(invalidRequest)).toThrow(ValidationError);
    });

    it('should validate embedding request', () => {
      const validRequest: UnifiedEmbeddingRequest = {
        text: 'Hello world',
        model: 'embedding-small',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      expect(() => (adapter as any).validateEmbeddingRequest(validRequest)).not.toThrow();
    });

    it('should reject invalid embedding request', () => {
      const invalidRequest = {
        text: '',
        model: 'embedding-small'
      };

      expect(() => (adapter as any).validateEmbeddingRequest(invalidRequest)).toThrow(ValidationError);
    });
  });
});