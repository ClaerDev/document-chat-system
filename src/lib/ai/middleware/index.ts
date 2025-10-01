/**
 * AI Service Middleware System
 * Provides cross-cutting concerns like logging, cost control, caching, and monitoring
 */

export interface Middleware {
  name: string;
  priority: number;
  
  // Request processing
  beforeRequest?(context: RequestContext): Promise<RequestContext | null>;
  
  // Response processing
  afterResponse?(context: ResponseContext): Promise<ResponseContext>;
  
  // Error handling
  onError?(error: Error, context: RequestContext): Promise<Error | null>;
}

export interface RequestContext {
  request: any; // CompletionRequest | EmbeddingRequest
  provider: string;
  model: string;
  operation: 'completion' | 'embedding' | 'stream';
  startTime: Date;
  metadata: Record<string, any>;
  userId?: string;
  organizationId?: string;
}

export interface ResponseContext extends RequestContext {
  response: any; // CompletionResponse | EmbeddingResponse
  endTime: Date;
  latency: number;
  cost?: number;
  success: boolean;
}

// Middleware Manager
export class MiddlewareManager {
  private middlewares: Middleware[] = [];
  
  register(middleware: Middleware): void {
    this.middlewares.push(middleware);
    // Sort by priority (higher priority first)
    this.middlewares.sort((a, b) => b.priority - a.priority);
  }
  
  unregister(name: string): void {
    this.middlewares = this.middlewares.filter(m => m.name !== name);
  }
  
  async processRequest(context: RequestContext): Promise<RequestContext | null> {
    let currentContext = context;
    
    for (const middleware of this.middlewares) {
      if (middleware.beforeRequest) {
        try {
          const result = await middleware.beforeRequest(currentContext);
          if (result === null) {
            // Middleware blocked the request
            return null;
          }
          currentContext = result;
        } catch (error) {
          console.error(`Middleware ${middleware.name} failed in beforeRequest:`, error);
          // Continue with other middleware
        }
      }
    }
    
    return currentContext;
  }
  
  async processResponse(context: ResponseContext): Promise<ResponseContext> {
    let currentContext = context;
    
    // Process in reverse order for response
    for (const middleware of [...this.middlewares].reverse()) {
      if (middleware.afterResponse) {
        try {
          currentContext = await middleware.afterResponse(currentContext);
        } catch (error) {
          console.error(`Middleware ${middleware.name} failed in afterResponse:`, error);
          // Continue with other middleware
        }
      }
    }
    
    return currentContext;
  }
  
  async processError(error: Error, context: RequestContext): Promise<Error | null> {
    let currentError = error;
    
    for (const middleware of this.middlewares) {
      if (middleware.onError) {
        try {
          const result = await middleware.onError(currentError, context);
          if (result === null) {
            // Middleware handled the error
            return null;
          }
          currentError = result;
        } catch (middlewareError) {
          console.error(`Middleware ${middleware.name} failed in onError:`, middlewareError);
          // Continue with original error
        }
      }
    }
    
    return currentError;
  }
  
  getRegisteredMiddlewares(): string[] {
    return this.middlewares.map(m => m.name);
  }
}

export { MiddlewareManager as default };