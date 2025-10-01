/**
 * Contract Tests for AI Provider Adapters
 * 
 * Tests to ensure all AI provider adapters implement the same interface
 * correctly and behave consistently. These tests verify that adapters
 * are interchangeable and follow the same contracts.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  AIProviderAdapter,
  UnifiedCompletionRequest,
  UnifiedEmbeddingRequest,
  UnifiedStreamRequest,
  ProviderCapabilities,
  HealthStatus
} from '../../interfaces/types';
import {
  ValidationError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  ProviderUnavailableError
} from '../../interfaces/errors';
import { 
  TestFixtures, 
  MockAPIResponseFactory, 
  TestAssertions, 
  TestUtils, 
  AITestHelpers 
} from './test-utilities';

// =============================================================================
// CONTRACT TEST SUITE
// =============================================================================

/**
 * Contract tests that should be run against all AI provider adapters
 * to ensure consistent behavior and interface compliance
 */
export function runAdapterContractTests(
  adapterName: string,
  createAdapter: () => AIProviderAdapter,
  setupMocks: () => void,
  cleanupMocks: () => void
) {
  describe(`${adapterName} Adapter Contract Tests`, () => {
    let adapter: AIProviderAdapter;
    let mockFetch: jest.MockedFunction<typeof fetch>;

    beforeEach(async () => {
      setupMocks();
      mockFetch = TestUtils.createMockFetch();
      adapter = createAdapter();
      
      // Mock successful initialization
      mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
        text: 'OK',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
      }));
      
      await adapter.initialize();
    });

    afterEach(() => {
      cleanupMocks();
      jest.resetAllMocks();
    });

    describe('Basic Interface Compliance', () => {
      it('should implement all required methods', () => {
        expect(typeof adapter.getName).toBe('function');
        expect(typeof adapter.initialize).toBe('function');
        expect(typeof adapter.generateCompletion).toBe('function');
        expect(typeof adapter.getCapabilities).toBe('function');
        expect(typeof adapter.getAvailableModels).toBe('function');
        expect(typeof adapter.estimateCost).toBe('function');
        expect(typeof adapter.estimateTokens).toBe('function');
        expect(typeof adapter.checkHealth).toBe('function');
        expect(typeof adapter.getHealth).toBe('function');
      });

      it('should return consistent provider name', () => {
        const name = adapter.getName();
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
        expect(name).toBe(adapterName);
      });

      it('should return valid capabilities', () => {
        const capabilities = adapter.getCapabilities();
        TestAssertions.expectValidCapabilities(capabilities);
        
        // Verify required capability fields
        expect(capabilities.maxTokens).toBeGreaterThan(0);
        expect(Array.isArray(capabilities.models.completion)).toBe(true);
        expect(capabilities.models.completion.length).toBeGreaterThan(0);
      });

      it('should return health status', () => {
        const health = adapter.getHealth();
        TestAssertions.expectValidHealthStatus(health);
      });
    });

    describe('Completion Generation Contract', () => {
      it('should generate completion with valid response format', async () => {
        const request = TestFixtures.completionRequests.simple;
        
        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
          id: 'test-completion-123',
          choices: [
            {
              message: { content: 'Test response from adapter' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 15,
            completion_tokens: 10,
            total_tokens: 25
          },
          model: 'test-model'
        }));

        const response = await adapter.generateCompletion(request);
        TestAssertions.expectValidCompletionResponse(response);
        
        // Verify provider-specific metadata
        expect(response.metadata.provider).toBe(adapterName);
        expect(response.metadata.organizationId).toBe(request.metadata.organizationId);
        expect(response.metadata.userId).toBe(request.metadata.userId);
      });

      it('should handle completion with options', async () => {
        const request = TestFixtures.completionRequests.withOptions;
        
        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
          id: 'test-completion-options',
          choices: [
            {
              message: { content: 'Creative response with options' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 15,
            total_tokens: 35
          },
          model: 'test-model'
        }));

        const response = await adapter.generateCompletion(request);
        TestAssertions.expectValidCompletionResponse(response);
        
        // Verify the request was processed (fetch was called)
        expect(mockFetch).toHaveBeenCalled();
      });

      it('should handle function calling if supported', async () => {
        const capabilities = adapter.getCapabilities();
        
        if (capabilities.supportsFunctionCalling) {
          const request = TestFixtures.completionRequests.withFunctions;
          
          mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
            id: 'test-function-call',
            choices: [
              {
                message: {
                  content: null,
                  function_call: {
                    name: 'get_weather',
                    arguments: '{"location": "New York"}'
                  }
                },
                finish_reason: 'function_call'
              }
            ],
            usage: {
              prompt_tokens: 25,
              completion_tokens: 10,
              total_tokens: 35
            },
            model: 'test-model'
          }));

          const response = await adapter.generateCompletion(request);
          TestAssertions.expectValidCompletionResponse(response);
          expect(response.metadata.finishReason).toBe('function_call');
        }
      });

      it('should reject invalid completion requests', async () => {
        const invalidRequest = {
          messages: [], // Empty messages array
          model: 'test-model'
        } as any;

        await expect(adapter.generateCompletion(invalidRequest)).rejects.toThrow(ValidationError);
      });
    });

    describe('Embedding Generation Contract', () => {
      it('should generate embedding if supported', async () => {
        const capabilities = adapter.getCapabilities();
        
        if (capabilities.models.embedding && capabilities.models.embedding.length > 0) {
          const request = TestFixtures.embeddingRequests.simple;
          
          mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
            data: [
              {
                embedding: TestFixtures.embeddingResponses.small.embedding
              }
            ],
            usage: {
              total_tokens: 8
            },
            model: 'test-embedding-model'
          }));

          const response = await adapter.generateEmbedding(request);
          TestAssertions.expectValidEmbeddingResponse(response);
          
          expect(response.metadata.provider).toBe(adapterName);
          expect(response.embedding.length).toBeGreaterThan(0);
        }
      });

      it('should reject embedding requests if not supported', async () => {
        const capabilities = adapter.getCapabilities();
        
        if (!capabilities.models.embedding || capabilities.models.embedding.length === 0) {
          const request = TestFixtures.embeddingRequests.simple;
          
          await expect(adapter.generateEmbedding(request)).rejects.toThrow(ValidationError);
        }
      });

      it('should handle embedding with custom dimensions if supported', async () => {
        const capabilities = adapter.getCapabilities();
        
        if (capabilities.embeddingDimensions && capabilities.embeddingDimensions.length > 0) {
          const request = TestFixtures.embeddingRequests.withOptions;
          
          mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
            data: [
              {
                embedding: Array.from({ length: 512 }, () => Math.random())
              }
            ],
            usage: {
              total_tokens: 10
            },
            model: 'test-embedding-model'
          }));

          const response = await adapter.generateEmbedding(request);
          TestAssertions.expectValidEmbeddingResponse(response);
          
          if (request.options?.dimensions) {
            expect(response.embedding).toHaveLength(request.options.dimensions);
          }
        }
      });
    });

    describe('Streaming Contract', () => {
      it('should support streaming if declared', async () => {
        const capabilities = adapter.getCapabilities();
        
        if (capabilities.supportsStreaming) {
          const request: UnifiedStreamRequest = {
            ...TestFixtures.completionRequests.simple,
            options: { stream: true }
          };

          // Mock streaming response
          const mockStream = {
            getReader: () => ({
              read: jest.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n'), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode('data: [DONE]\n\n'), done: true })
            })
          };

          mockFetch.mockResolvedValueOnce({
            ok: true,
            body: mockStream
          } as any);

          const stream = adapter.streamCompletion(request);
          const chunks = await TestUtils.collectStreamChunks(stream);
          
          expect(chunks.length).toBeGreaterThan(0);
          chunks.forEach(chunk => {
            expect(chunk).toEqual(expect.objectContaining({
              content: expect.any(String),
              metadata: expect.objectContaining({
                provider: adapterName,
                chunk: true
              })
            }));
          });
        }
      });

      it('should reject streaming requests if not supported', async () => {
        const capabilities = adapter.getCapabilities();
        
        if (!capabilities.supportsStreaming) {
          const request: UnifiedStreamRequest = {
            ...TestFixtures.completionRequests.simple,
            options: { stream: true }
          };

          await expect(async () => {
            const stream = adapter.streamCompletion(request);
            await TestUtils.collectStreamChunks(stream);
          }).rejects.toThrow();
        }
      });
    });

    describe('Error Handling Contract', () => {
      it('should handle authentication errors consistently', async () => {
        const request = TestFixtures.completionRequests.simple;
        
        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createErrorResponse(401, 'Unauthorized'));

        await expect(adapter.generateCompletion(request)).rejects.toThrow(AuthenticationError);
      });

      it('should handle rate limit errors consistently', async () => {
        const request = TestFixtures.completionRequests.simple;
        
        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createErrorResponse(429, 'Rate limit exceeded'));

        await expect(adapter.generateCompletion(request)).rejects.toThrow(RateLimitError);
      });

      it('should handle network errors consistently', async () => {
        const request = TestFixtures.completionRequests.simple;
        
        mockFetch.mockImplementationOnce(() => MockAPIResponseFactory.createNetworkError());

        await expect(adapter.generateCompletion(request)).rejects.toThrow(NetworkError);
      });

      it('should handle server errors consistently', async () => {
        const request = TestFixtures.completionRequests.simple;
        
        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createErrorResponse(500, 'Internal server error'));

        await expect(adapter.generateCompletion(request)).rejects.toThrow(ProviderUnavailableError);
      });

      it('should handle validation errors consistently', async () => {
        const invalidRequest = {
          messages: [{ role: 'invalid', content: 'test' }], // Invalid role
          model: 'test-model'
        } as any;

        await expect(adapter.generateCompletion(invalidRequest)).rejects.toThrow(ValidationError);
      });
    });

    describe('Cost and Token Estimation Contract', () => {
      it('should estimate costs reasonably', () => {
        const usage = {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        };

        const cost = adapter.estimateCost(usage, 'test-model');
        TestAssertions.expectCostEstimation(cost);
      });

      it('should estimate tokens reasonably', () => {
        const testTexts = [
          'Short text',
          'This is a longer text that should have more tokens than the short one',
          'A very long piece of text that goes on and on and should definitely have the most tokens of all the test cases we are running here'
        ];

        const estimates = testTexts.map(text => adapter.estimateTokens(text));
        
        // Estimates should generally increase with text length
        expect(estimates[0]).toBeLessThan(estimates[1]);
        expect(estimates[1]).toBeLessThan(estimates[2]);
        
        // All estimates should be reasonable
        estimates.forEach((estimate, index) => {
          TestAssertions.expectTokenEstimation(estimate, testTexts[index]);
        });
      });

      it('should handle empty input gracefully', () => {
        const emptyTextTokens = adapter.estimateTokens('');
        const emptyArrayTokens = adapter.estimateTokens([]);
        
        expect(emptyTextTokens).toBe(0);
        expect(emptyArrayTokens).toBe(0);
      });
    });

    describe('Health Monitoring Contract', () => {
      it('should perform health checks', async () => {
        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
          text: 'OK',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
        }));

        const health = await adapter.checkHealth();
        TestAssertions.expectValidHealthStatus(health);
        
        expect(health.isHealthy).toBe(true);
        expect(health.latency).toBeGreaterThan(0);
      });

      it('should handle health check failures', async () => {
        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createErrorResponse(500, 'Server error'));

        const health = await adapter.checkHealth();
        TestAssertions.expectValidHealthStatus(health);
        
        expect(health.isHealthy).toBe(false);
        expect(health.error).toBeDefined();
      });
    });

    describe('Model Information Contract', () => {
      it('should return available models', () => {
        const models = adapter.getAvailableModels();
        
        expect(Array.isArray(models)).toBe(true);
        expect(models.length).toBeGreaterThan(0);
        
        models.forEach(model => {
          expect(model).toEqual(expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            provider: adapterName,
            type: expect.any(String)
          }));
        });
      });

      it('should include cost information in model data', () => {
        const models = adapter.getAvailableModels();
        
        models.forEach(model => {
          if (model.type === 'completion') {
            expect(model).toEqual(expect.objectContaining({
              costPer1kTokens: expect.objectContaining({
                prompt: expect.any(Number),
                completion: expect.any(Number)
              })
            }));
          } else if (model.type === 'embedding') {
            expect(model).toEqual(expect.objectContaining({
              costPer1kTokens: expect.objectContaining({
                prompt: expect.any(Number)
              })
            }));
          }
        });
      });
    });

    describe('Configuration Contract', () => {
      it('should handle invalid configuration gracefully', () => {
        expect(() => {
          const invalidAdapter = createAdapter();
          // The adapter should validate configuration in constructor
        }).not.toThrow(); // Should not throw during creation, but during initialization
      });

      it('should validate API keys during initialization', async () => {
        const adapterWithInvalidKey = createAdapter();
        
        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createErrorResponse(401, 'Invalid API key'));

        await expect(adapterWithInvalidKey.initialize()).rejects.toThrow(AuthenticationError);
      });
    });

    describe('Consistency Contract', () => {
      it('should return consistent results for identical requests', async () => {
        const request = TestFixtures.completionRequests.simple;
        
        // Mock identical responses
        const mockResponse = {
          id: 'consistent-test',
          choices: [
            {
              message: { content: 'Consistent response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 15,
            completion_tokens: 10,
            total_tokens: 25
          },
          model: 'test-model'
        };

        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse(mockResponse));
        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse(mockResponse));

        const response1 = await adapter.generateCompletion(request);
        const response2 = await adapter.generateCompletion(request);

        // Content should be the same
        expect(response1.content).toBe(response2.content);
        expect(response1.usage).toEqual(response2.usage);
        expect(response1.metadata.provider).toBe(response2.metadata.provider);
      });

      it('should maintain state consistency', () => {
        const health1 = adapter.getHealth();
        const health2 = adapter.getHealth();
        
        // Health status should be consistent when called multiple times
        expect(health1.isHealthy).toBe(health2.isHealthy);
        expect(health1.lastHealthCheck).toEqual(health2.lastHealthCheck);
      });
    });
  });
}

// =============================================================================
// PERFORMANCE CONTRACT TESTS
// =============================================================================

/**
 * Performance contract tests for AI providers
 */
export function runPerformanceContractTests(
  adapterName: string,
  createAdapter: () => AIProviderAdapter,
  setupMocks: () => void,
  cleanupMocks: () => void
) {
  describe(`${adapterName} Performance Contract Tests`, () => {
    let adapter: AIProviderAdapter;
    let mockFetch: jest.MockedFunction<typeof fetch>;

    beforeEach(async () => {
      setupMocks();
      mockFetch = TestUtils.createMockFetch();
      adapter = createAdapter();
      
      // Mock initialization
      mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
        text: 'OK',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
      }));
      
      await adapter.initialize();
    });

    afterEach(() => {
      cleanupMocks();
      jest.resetAllMocks();
    });

    it('should handle concurrent requests without issues', async () => {
      const request = TestFixtures.completionRequests.simple;
      
      // Mock multiple successful responses
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
          id: `concurrent-${i}`,
          choices: [
            {
              message: { content: `Response ${i}` },
              finish_reason: 'stop'
            }
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: 'test-model'
        }));
      }

      const promises = Array.from({ length: 5 }, () => adapter.generateCompletion(request));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach((response, index) => {
        TestAssertions.expectValidCompletionResponse(response);
        expect(response.content).toBe(`Response ${index}`);
      });
    });

    it('should handle large requests efficiently', async () => {
      const largeRequest = {
        ...TestFixtures.completionRequests.simple,
        messages: [
          { role: 'user' as const, content: 'A'.repeat(10000) } // 10KB message
        ]
      };

      mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
        id: 'large-request',
        choices: [
          {
            message: { content: 'Processed large request' },
            finish_reason: 'stop'
          }
        ],
        usage: { prompt_tokens: 2500, completion_tokens: 10, total_tokens: 2510 },
        model: 'test-model'
      }));

      const startTime = Date.now();
      const response = await adapter.generateCompletion(largeRequest);
      const endTime = Date.now();

      TestAssertions.expectValidCompletionResponse(response);
      
      // Should complete within reasonable time (adjust based on your requirements)
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds
    });

    it('should handle timeout scenarios gracefully', async () => {
      const request = TestFixtures.completionRequests.simple;
      
      // Mock a slow response
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });

      await expect(adapter.generateCompletion(request)).rejects.toThrow();
    });
  });
}

// =============================================================================
// INTEGRATION CONTRACT TESTS
// =============================================================================

/**
 * Integration contract tests for AI providers
 */
export function runIntegrationContractTests(
  adapterName: string,
  createAdapter: () => AIProviderAdapter,
  setupMocks: () => void,
  cleanupMocks: () => void
) {
  describe(`${adapterName} Integration Contract Tests`, () => {
    let adapter: AIProviderAdapter;
    let mockFetch: jest.MockedFunction<typeof fetch>;

    beforeEach(async () => {
      setupMocks();
      mockFetch = TestUtils.createMockFetch();
      adapter = createAdapter();
      
      // Mock initialization
      mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
        text: 'OK',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
      }));
      
      await adapter.initialize();
    });

    afterEach(() => {
      cleanupMocks();
      jest.resetAllMocks();
    });

    it('should integrate with metrics collection', async () => {
      const request = TestFixtures.completionRequests.simple;
      
      mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
        id: 'metrics-test',
        choices: [
          {
            message: { content: 'Metrics test response' },
            finish_reason: 'stop'
          }
        ],
        usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 },
        model: 'test-model'
      }));

      const startTime = Date.now();
      const response = await adapter.generateCompletion(request);
      const endTime = Date.now();

      TestAssertions.expectValidCompletionResponse(response);
      
      // Verify metrics can be extracted
      const metrics = {
        provider: adapterName,
        model: response.model,
        operation: 'completion',
        latency: endTime - startTime,
        tokenCount: response.usage,
        success: true,
        metadata: response.metadata
      };

      expect(metrics.latency).toBeGreaterThan(0);
      expect(metrics.tokenCount.totalTokens).toBe(25);
      expect(metrics.success).toBe(true);
    });

    it('should maintain compatibility with different model versions', async () => {
      const capabilities = adapter.getCapabilities();
      const models = adapter.getAvailableModels();
      
      // Test with different model types
      const completionModels = models.filter(m => m.type === 'completion');
      
      if (completionModels.length > 0) {
        const request = {
          ...TestFixtures.completionRequests.simple,
          model: completionModels[0].id
        };

        mockFetch.mockResolvedValueOnce(MockAPIResponseFactory.createSuccessResponse({
          id: 'model-compat-test',
          choices: [
            {
              message: { content: 'Model compatibility test' },
              finish_reason: 'stop'
            }
          ],
          usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 },
          model: completionModels[0].id
        }));

        const response = await adapter.generateCompletion(request);
        TestAssertions.expectValidCompletionResponse(response);
        expect(response.model).toBe(completionModels[0].id);
      }
    });
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  runAdapterContractTests,
  runPerformanceContractTests,
  runIntegrationContractTests
};

export default {
  runAdapterContractTests,
  runPerformanceContractTests,
  runIntegrationContractTests
};