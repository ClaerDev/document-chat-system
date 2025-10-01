import {
  UnifiedCompletionRequest,
  UnifiedCompletionResponse,
  UnifiedEmbeddingRequest,
  UnifiedEmbeddingResponse,
  UnifiedStreamRequest,
  UnifiedStreamChunk,
  ProviderCapabilities,
  CostEstimate,
  ModelInfo,
  AIRequest,
  TokenEstimate
} from './types';

export interface AIService {
  generateCompletion(request: UnifiedCompletionRequest): Promise<UnifiedCompletionResponse>;
  
  generateEmbedding(request: UnifiedEmbeddingRequest): Promise<UnifiedEmbeddingResponse>;
  
  streamCompletion(request: UnifiedStreamRequest): AsyncIterator<UnifiedStreamChunk>;
  
  getCapabilities(): ProviderCapabilities;
  
  getModelInfo(model: string): ModelInfo;
  
  estimateCost(request: AIRequest): CostEstimate;
  
  estimateTokens(request: AIRequest): TokenEstimate;
  
  healthCheck(): Promise<boolean>;
}

export abstract class AIProviderAdapter implements AIService {
  protected abstract client: any;
  protected abstract modelMapping: Record<string, string>;
  protected abstract providerName: string;

  abstract generateCompletion(request: UnifiedCompletionRequest): Promise<UnifiedCompletionResponse>;
  
  abstract generateEmbedding(request: UnifiedEmbeddingRequest): Promise<UnifiedEmbeddingResponse>;
  
  abstract streamCompletion(request: UnifiedStreamRequest): AsyncIterator<UnifiedStreamChunk>;
  
  abstract getCapabilities(): ProviderCapabilities;
  
  abstract estimateCost(request: AIRequest): CostEstimate;

  getModelInfo(model: string): ModelInfo {
    const mappedModel = this.modelMapping[model] || model;
    return this.getProviderModelInfo(mappedModel);
  }

  protected abstract getProviderModelInfo(model: string): ModelInfo;

  estimateTokens(request: AIRequest): TokenEstimate {
    if (request.messages) {
      const promptText = request.messages.map(m => m.content).join(' ');
      const promptTokens = this.countTokens(promptText);
      const estimatedCompletion = Math.min(promptTokens * 0.3, 1000);
      
      return {
        prompt: promptTokens,
        completion: estimatedCompletion,
        total: promptTokens + estimatedCompletion
      };
    }
    
    if (request.text) {
      const totalTokens = this.countTokens(request.text);
      return {
        prompt: totalTokens,
        completion: 0,
        total: totalTokens
      };
    }
    
    return { prompt: 0, completion: 0, total: 0 };
  }

  protected countTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testRequest: UnifiedCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'fast',
        maxTokens: 1
      };
      
      await this.generateCompletion(testRequest);
      return true;
    } catch (error) {
      console.error(`Health check failed for ${this.providerName}:`, error);
      return false;
    }
  }

  protected abstract transformRequest(request: UnifiedCompletionRequest): any;
  
  protected abstract transformResponse(response: any, originalRequest: UnifiedCompletionRequest): UnifiedCompletionResponse;
  
  protected abstract callProvider(request: any): Promise<any>;
  
  protected abstract handleProviderError(error: any): Error;
}