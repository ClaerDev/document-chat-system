/**
 * Anthropic Adapter Tests
 * 
 * Comprehensive unit tests for the Anthropic adapter implementation
 * covering all functionality including completions, streaming, cost estimation,
 * error handling, and health checks. Note: Anthropic does not support embeddings.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AnthropicAdapter } from '../anthropic-adapter';
import { 
  UnifiedCompletionRequest, 
  UnifiedEmbeddingRequest,
  UnifiedCompletionResponse,
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
jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn()
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn()
}));

// Mock configuration
jest.mock('@/lib/config/env', () => ({
  ai: {
    anthropic: {
      apiKey: 'sk-ant-test-key'
    }
  }
}));

import { generateText, streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;
const mockStreamText = streamText as jest.MockedFunction<typeof streamText>;
const mockCreateAnthropic = createAnthropic as jest.MockedFunction<typeof createAnthropic>;

describe('Anthropic Adapter Tests', () => {
  let adapter: AnthropicAdapter;
  let mockConfig: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock configuration
    mockConfig = {
      apiKey: 'sk-ant-test-key',
      maxRetries: 3,
      timeout: 30000
    };

    // Mock Anthropic client creation
    mockCreateAnthropic.mockReturnValue({} as any);

    // Create adapter instance
    adapter = new AnthropicAdapter(mockConfig);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create adapter with valid configuration', () => {
      expect(adapter).toBeInstanceOf(AnthropicAdapter);
      expect(adapter.getName()).toBe('anthropic');
      expect(adapter.getHealth().isHealthy).toBe(false); // Not initialized yet
    });

    it('should throw error for invalid API key', () => {
      expect(() => new AnthropicAdapter({ apiKey: '' })).toThrow(ValidationError);
      expect(() => new AnthropicAdapter({ apiKey: 'invalid-key' })).toThrow(ValidationError);
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
        { input: 'fast', expected: 'claude-3-haiku-20240307' },
        { input: 'balanced', expected: 'claude-3-sonnet-20240229' },
        { input: 'powerful', expected: 'claude-3-opus-20240229' },
        { input: 'latest', expected: 'claude-3-5-sonnet-20241022' }
      ];

      testCases.forEach(({ input, expected }) => {
        const resolved = (adapter as any).resolveModel(input);
        expect(resolved).toBe(expected);
      });
    });

    it('should handle direct Claude model names', () => {
      const directModels = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
      
      directModels.forEach(model => {
        const resolved = (adapter as any).resolveModel(model);
        expect(resolved).toBe(model);
      });
    });

    it('should handle cross-provider model fallbacks', () => {
      const crossProviderCases = [
        { input: 'gpt-4', expected: 'claude-3-opus-20240229' },
        { input: 'gpt-4-turbo', expected: 'claude-3-opus-20240229' },
        { input: 'gpt-3.5-turbo', expected: 'claude-3-haiku-20240307' }
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
        expect(resolved).toBe('claude-3-sonnet-20240229');
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
          id: 'msg_123',
          model: 'claude-3-haiku-20240307'
        }
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse);

      const response = await adapter.generateCompletion(request);

      expect(response).toEqual<UnifiedCompletionResponse>({
        id: 'msg_123',
        content: 'I am doing well, thank you for asking!',
        model: 'claude-3-haiku-20240307',
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25
        },
        metadata: {
          provider: 'anthropic',
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
          id: 'msg_function',
          model: 'claude-3-sonnet-20240229'
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

    it('should handle completion with system message transformation', async () => {
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
          id: 'msg_system',
          model: 'claude-3-haiku-20240307'
        }
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse);

      await adapter.generateCompletion(request);

      // Verify system message was transformed
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'System: You are a helpful assistant.\n\nHello' }
          ]
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
          id: 'msg_creative',
          model: 'claude-3-opus-20240229'
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

    it('should handle JSON mode as not supported', async () => {
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
        text: 'I cannot enforce JSON mode, but I can format my response as JSON.',
        usage: { promptTokens: 15, completionTokens: 20, totalTokens: 35 },
        finishReason: 'stop',
        response: {
          id: 'msg_json',
          model: 'claude-3-sonnet-20240229'
        }
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse);

      const response = await adapter.generateCompletion(request);

      // Verify JSON mode was not passed to the API (Anthropic doesn't support it)
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.any(Array)
        })
      );
      expect(mockGenerateText).not.toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: expect.anything()
        })
      );
    });

    it('should handle vision capabilities', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [
          { 
            role: 'user', 
            content: 'What do you see in this image?',
            attachments: [
              {
                type: 'image',
                url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
              }
            ]
          }
        ],
        model: 'powerful',
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      const mockResponse = {
        text: 'I can see an image has been provided.',
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
        finishReason: 'stop',
        response: {
          id: 'msg_vision',
          model: 'claude-3-opus-20240229'
        }
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse);

      const response = await adapter.generateCompletion(request);

      expect(response.content).toBe('I can see an image has been provided.');
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
          id: 'msg_stream',
          model: 'claude-3-sonnet-20240229'
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

    it('should throw error for embedding requests (not supported)', async () => {
      const request: UnifiedEmbeddingRequest = {
        text: 'Government contract opportunity',
        model: 'embedding-small',
        metadata: {
          organizationId: 'org-123',
          userId: 'user-456'
        }
      };

      await expect(adapter.generateEmbedding(request)).rejects.toThrow(ValidationError);
      expect(async () => {
        await adapter.generateEmbedding(request);
      }).rejects.toThrow('Anthropic does not support embedding generation');
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

    it('should handle credit balance errors', async () => {
      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test credit error' }],
        model: 'fast',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      const creditError = new Error('Insufficient credits');
      (creditError as any).cause = { status: 402 };
      mockGenerateText.mockRejectedValueOnce(creditError);

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
  });

  describe('Cost Estimation', () => {
    it('should estimate completion cost correctly', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500
      };

      const cost = adapter.estimateCost(usage, 'claude-3-opus-20240229');
      
      // Claude 3 Opus pricing: $0.015 per 1K prompt tokens, $0.075 per 1K completion tokens
      const expectedCost = (1000 * 0.015 / 1000) + (500 * 0.075 / 1000);
      expect(cost).toBeCloseTo(expectedCost, 6);
    });

    it('should estimate haiku cost correctly', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500
      };

      const cost = adapter.estimateCost(usage, 'claude-3-haiku-20240307');
      
      // Claude 3 Haiku pricing: $0.00025 per 1K prompt tokens, $0.00125 per 1K completion tokens
      const expectedCost = (1000 * 0.00025 / 1000) + (500 * 0.00125 / 1000);
      expect(cost).toBeCloseTo(expectedCost, 6);
    });

    it('should estimate sonnet cost correctly', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500
      };

      const cost = adapter.estimateCost(usage, 'claude-3-sonnet-20240229');
      
      // Claude 3 Sonnet pricing: $0.003 per 1K prompt tokens, $0.015 per 1K completion tokens
      const expectedCost = (1000 * 0.003 / 1000) + (500 * 0.015 / 1000);
      expect(cost).toBeCloseTo(expectedCost, 6);
    });

    it('should handle unknown model cost estimation', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      const cost = adapter.estimateCost(usage, 'unknown-model');
      
      // Should default to balanced model pricing
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

    it('should estimate single text tokens', () => {
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

    it('should handle system message transformation in token estimation', () => {
      const messages = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' }
      ];

      const tokens = adapter.estimateTokens(messages);
      
      // Should account for system message transformation
      expect(tokens).toBeGreaterThan(5);
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
        maxTokens: 200000,
        supportsFunctionCalling: true,
        supportsJsonMode: false, // Anthropic doesn't support JSON mode
        supportsStreaming: true,
        supportsVision: true,
        models: {
          completion: expect.arrayContaining(['fast', 'balanced', 'powerful', 'latest'])
        }
      });
    });

    it('should return available models with metadata', () => {
      const models = adapter.getAvailableModels();

      expect(models).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'claude-3-opus-20240229',
            name: 'Claude 3 Opus',
            provider: 'anthropic',
            type: 'completion',
            contextLength: 200000,
            costPer1kTokens: expect.objectContaining({
              prompt: expect.any(Number),
              completion: expect.any(Number)
            })
          }),
          expect.objectContaining({
            id: 'claude-3-sonnet-20240229',
            name: 'Claude 3 Sonnet',
            provider: 'anthropic',
            type: 'completion',
            contextLength: 200000,
            costPer1kTokens: expect.objectContaining({
              prompt: expect.any(Number),
              completion: expect.any(Number)
            })
          }),
          expect.objectContaining({
            id: 'claude-3-haiku-20240307',
            name: 'Claude 3 Haiku',
            provider: 'anthropic',
            type: 'completion',
            contextLength: 200000,
            costPer1kTokens: expect.objectContaining({
              prompt: expect.any(Number),
              completion: expect.any(Number)
            })
          })
        ])
      );
    });
  });

  describe('Message Transformation', () => {
    it('should transform system messages correctly', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' }
      ];

      const transformed = (adapter as any).transformMessages(messages);
      
      expect(transformed).toEqual([
        { role: 'user', content: 'System: You are helpful\n\nHello' }
      ]);
    });

    it('should handle multiple system messages', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'system', content: 'Be concise' },
        { role: 'user', content: 'Hello' }
      ];

      const transformed = (adapter as any).transformMessages(messages);
      
      expect(transformed).toEqual([
        { role: 'user', content: 'System: You are helpful\n\nSystem: Be concise\n\nHello' }
      ]);
    });

    it('should preserve non-system messages', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ];

      const transformed = (adapter as any).transformMessages(messages);
      
      expect(transformed).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ]);
    });

    it('should handle empty messages array', () => {
      const transformed = (adapter as any).transformMessages([]);
      expect(transformed).toEqual([]);
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

    it('should reject embedding request', () => {
      const embeddingRequest: UnifiedEmbeddingRequest = {
        text: 'Hello world',
        model: 'embedding-small',
        metadata: { organizationId: 'org-123', userId: 'user-456' }
      };

      expect(() => (adapter as any).validateEmbeddingRequest(embeddingRequest)).toThrow(ValidationError);
    });

    it('should validate message roles', () => {
      const invalidMessages = [
        { role: 'invalid', content: 'Test' }
      ];

      expect(() => (adapter as any).validateMessages(invalidMessages)).toThrow(ValidationError);
    });
  });
});