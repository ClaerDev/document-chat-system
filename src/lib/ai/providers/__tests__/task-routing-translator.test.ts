/**
 * TaskRoutingTranslator Unit Tests
 * 
 * Tests the task routing translation logic that converts
 * Document Chat System's task-based routing to OpenRouter provider preferences.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AIConfiguration } from '../../config/ai-config';
import { UnifiedCompletionRequest } from '../../interfaces/types';

// We need to extract the translator class for testing
// Since it's private, we'll test it through the SmartOpenRouterAdapter
import { SmartOpenRouterAdapter } from '../smart-openrouter-adapter';

jest.mock('../../config/ai-config');
const mockAIConfig = AIConfiguration as jest.Mocked<typeof AIConfiguration>;

describe('TaskRoutingTranslator', () => {
  let mockAIConfigInstance: any;
  let adapter: SmartOpenRouterAdapter;

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

    adapter = new SmartOpenRouterAdapter(mockConfig);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Task Type Routing', () => {
    it('should translate document_analysis task correctly', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['anthropic', 'openai'],
        fallbackProviders: ['google', 'azure'],
        qualityRequirement: 'premium',
        maxLatency: 5000,
        maxCost: 2.0
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Analyze this document' }],
        model: 'powerful',
        hints: {
          taskType: 'document_analysis',
          complexity: 'high'
        }
      };

      // Test through adapter's routing logic
      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig).toEqual({
        order: ['anthropic', 'openai'],
        allow: ['anthropic', 'openai', 'google', 'azure'],
        sort: 'latency', // Due to maxLatency: 5000
        max_price: 2.0,
        require_parameters: false,
        data_collection: 'deny'
      });
    });

    it('should translate opportunity_matching task correctly', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai', 'anthropic'],
        fallbackProviders: ['google', 'azure'],
        qualityRequirement: 'high',
        maxLatency: 3000,
        maxCost: 1.0
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Match this opportunity' }],
        model: 'balanced',
        hints: {
          taskType: 'opportunity_matching',
          complexity: 'medium'
        }
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig).toEqual({
        order: ['openai', 'anthropic'],
        allow: ['openai', 'anthropic', 'google', 'azure'],
        sort: 'latency', // Due to maxLatency: 3000
        max_price: 1.0,
        require_parameters: false,
        data_collection: 'deny'
      });
    });

    it('should translate content_generation task correctly', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai', 'anthropic'],
        fallbackProviders: ['google', 'azure'],
        qualityRequirement: 'high',
        maxLatency: 10000,
        maxCost: 3.0
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Generate content' }],
        model: 'powerful',
        hints: {
          taskType: 'content_generation',
          complexity: 'high',
          qualityRequirement: 'premium'
        }
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig).toEqual({
        order: ['openai', 'anthropic'],
        allow: ['openai', 'anthropic', 'google', 'azure'],
        sort: 'throughput', // Due to premium quality requirement
        max_price: 3.0,
        require_parameters: false,
        data_collection: 'deny'
      });
    });

    it('should translate simple_qa task correctly', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai', 'google'],
        fallbackProviders: ['anthropic', 'azure'],
        qualityRequirement: 'standard',
        maxLatency: 3000,
        maxCost: 0.8
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'What is the capital of France?' }],
        model: 'fast',
        hints: {
          taskType: 'simple_qa',
          complexity: 'low'
        }
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig).toEqual({
        order: ['openai', 'google'],
        allow: ['openai', 'google', 'anthropic', 'azure'],
        sort: 'price', // Cost-optimized for simple tasks
        max_price: 0.8,
        require_parameters: false,
        data_collection: 'deny'
      });
    });

    it('should translate classification task correctly', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai', 'google'],
        fallbackProviders: ['anthropic', 'azure'],
        qualityRequirement: 'standard',
        maxLatency: 2000,
        maxCost: 0.5
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Classify this text' }],
        model: 'fast',
        hints: {
          taskType: 'classification',
          complexity: 'low'
        }
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig).toEqual({
        order: ['openai', 'google'],
        allow: ['openai', 'google', 'anthropic', 'azure'],
        sort: 'latency', // Due to maxLatency: 2000
        max_price: 0.5,
        require_parameters: false,
        data_collection: 'deny'
      });
    });
  });

  describe('Sort Strategy Logic', () => {
    it('should use latency sort for latency-sensitive tasks', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai'],
        fallbackProviders: ['anthropic'],
        qualityRequirement: 'standard',
        maxLatency: 2000, // Low latency requirement
        maxCost: 1.0
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Quick response needed' }],
        model: 'fast',
        hints: {
          taskType: 'simple_qa',
          complexity: 'low',
          latencySensitive: true
        }
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig.sort).toBe('latency');
    });

    it('should use throughput sort for premium quality tasks', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['anthropic'],
        fallbackProviders: ['openai'],
        qualityRequirement: 'premium',
        maxLatency: 10000,
        maxCost: 5.0
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'High quality analysis required' }],
        model: 'powerful',
        hints: {
          taskType: 'complex_analysis',
          complexity: 'high',
          qualityRequirement: 'premium'
        }
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig.sort).toBe('throughput');
    });

    it('should use price sort for cost-sensitive tasks', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai'],
        fallbackProviders: ['anthropic'],
        qualityRequirement: 'standard',
        maxLatency: 10000,
        maxCost: 0.5
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Cost-effective response' }],
        model: 'fast',
        hints: {
          taskType: 'simple_qa',
          complexity: 'low'
        }
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig.sort).toBe('price');
    });
  });

  describe('Advanced Features Detection', () => {
    it('should detect function calling requirements', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai'],
        fallbackProviders: ['anthropic'],
        qualityRequirement: 'standard',
        maxLatency: 5000,
        maxCost: 2.0
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Call a function' }],
        model: 'balanced',
        options: {
          functionCalling: true
        },
        functions: [
          {
            name: 'get_weather',
            description: 'Get weather data',
            parameters: { type: 'object', properties: {} }
          }
        ]
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig.require_parameters).toBe(true);
    });

    it('should detect JSON mode requirements', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai'],
        fallbackProviders: ['anthropic'],
        qualityRequirement: 'standard',
        maxLatency: 5000,
        maxCost: 2.0
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Return JSON' }],
        model: 'balanced',
        options: {
          jsonMode: true
        }
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig.require_parameters).toBe(true);
    });

    it('should not require parameters for simple requests', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai'],
        fallbackProviders: ['anthropic'],
        qualityRequirement: 'standard',
        maxLatency: 5000,
        maxCost: 2.0
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Simple text response' }],
        model: 'fast'
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig.require_parameters).toBe(false);
    });
  });

  describe('Fallback Handling', () => {
    it('should provide fallback configuration when task config is missing', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue(null);

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'fast',
        hints: {
          taskType: 'unknown_task' as any,
          complexity: 'medium'
        }
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig).toEqual({
        sort: 'price',
        data_collection: 'deny'
      });
    });

    it('should handle undefined task type gracefully', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai'],
        fallbackProviders: ['anthropic'],
        qualityRequirement: 'standard',
        maxLatency: 5000,
        maxCost: 1.0
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'fast'
        // No hints provided
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      // Should default to simple_qa
      expect(mockAIConfigInstance.getTaskRouting).toHaveBeenCalledWith('simple_qa');
    });
  });

  describe('Data Privacy', () => {
    it('should always set data_collection to deny for government contracting', () => {
      const testCases = [
        { taskType: 'document_analysis', complexity: 'high' },
        { taskType: 'opportunity_matching', complexity: 'medium' },
        { taskType: 'content_generation', complexity: 'low' },
        { taskType: 'simple_qa', complexity: 'low' }
      ];

      testCases.forEach(({ taskType, complexity }) => {
        mockAIConfigInstance.getTaskRouting.mockReturnValue({
          preferredProviders: ['openai'],
          fallbackProviders: ['anthropic'],
          qualityRequirement: 'standard',
          maxLatency: 5000,
          maxCost: 1.0
        });

        const request: UnifiedCompletionRequest = {
          messages: [{ role: 'user', content: 'Test' }],
          model: 'fast',
          hints: {
            taskType: taskType as any,
            complexity: complexity as any
          }
        };

        const translator = (adapter as any).routingTranslator;
        const providerConfig = translator.translateToOpenRouterConfig(request);

        expect(providerConfig.data_collection).toBe('deny');
      });
    });
  });

  describe('Provider Mapping', () => {
    it('should map internal provider names to OpenRouter names', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai', 'anthropic', 'google', 'azure'],
        fallbackProviders: [],
        qualityRequirement: 'standard',
        maxLatency: 5000,
        maxCost: 1.0
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'fast'
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig.order).toEqual(['openai', 'anthropic', 'google', 'azure']);
      expect(providerConfig.allow).toEqual(['openai', 'anthropic', 'google', 'azure']);
    });

    it('should filter out unknown providers', () => {
      mockAIConfigInstance.getTaskRouting.mockReturnValue({
        preferredProviders: ['openai', 'unknown-provider'],
        fallbackProviders: ['anthropic', 'another-unknown'],
        qualityRequirement: 'standard',
        maxLatency: 5000,
        maxCost: 1.0
      });

      const request: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'fast'
      };

      const translator = (adapter as any).routingTranslator;
      const providerConfig = translator.translateToOpenRouterConfig(request);

      expect(providerConfig.order).toEqual(['openai']);
      expect(providerConfig.allow).toEqual(['openai', 'anthropic']);
    });
  });
});