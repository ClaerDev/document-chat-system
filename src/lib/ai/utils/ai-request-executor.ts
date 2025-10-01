import { simpleAIClient } from '../services/simple-ai-client'

interface AIAnalysisRequest {
  prompt: string
  systemMessage: string
  model?: string
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
  contextInfo?: {
    documentName?: string
    organizationId?: string
    analyzerName?: string
  }
}

interface AIAnalysisResponse {
  content: string
  success: boolean
  error?: string
  metadata: {
    model: string
    tokensUsed?: number
    responseTime?: number
  }
}

/**
 * Unified AI request executor with standardized error handling, timeouts, and fallbacks
 */
export class AIRequestExecutor {
  private static instance: AIRequestExecutor
  
  public static getInstance(): AIRequestExecutor {
    if (!AIRequestExecutor.instance) {
      AIRequestExecutor.instance = new AIRequestExecutor()
    }
    return AIRequestExecutor.instance
  }

  /**
   * Execute AI analysis request with comprehensive error handling
   */
  async execute(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const {
      prompt,
      systemMessage,
      model = 'openai/gpt-4o-mini',
      maxTokens = 2000,
      temperature = 0.3,
      timeoutMs = 60000,
      contextInfo = {}
    } = request

    const { analyzerName = 'AI_EXECUTOR', documentName, organizationId } = contextInfo
    const startTime = Date.now()

    console.log(`🔍 [${analyzerName}] Starting AI analysis request`)
    console.log(`🔍 [${analyzerName}] Model: ${model}, Tokens: ${maxTokens}, Temperature: ${temperature}`)
    console.log(`🔍 [${analyzerName}] Prompt length: ${prompt.length} characters`)
    if (documentName) console.log(`🔍 [${analyzerName}] Document: ${documentName}`)
    if (organizationId) console.log(`🔍 [${analyzerName}] Organization: ${organizationId}`)

    try {
      // Execute with timeout protection
      const result = await this.executeWithTimeout(
        this.performAIRequest(prompt, systemMessage, model, maxTokens, temperature),
        timeoutMs,
        `${analyzerName} AI request`
      )

      const responseTime = Date.now() - startTime
      console.log(`✅ [${analyzerName}] AI request completed in ${responseTime}ms`)
      console.log(`✅ [${analyzerName}] Response length: ${result.content?.length || 0} characters`)

      if (!result.content) {
        throw new Error('No content in AI response')
      }

      return {
        content: result.content,
        success: true,
        metadata: {
          model,
          responseTime,
          tokensUsed: result.tokensUsed
        }
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      console.error(`❌ [${analyzerName}] AI request failed after ${responseTime}ms:`, error)
      
      return {
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown AI request error',
        metadata: {
          model,
          responseTime
        }
      }
    }
  }

  /**
   * Execute multiple AI requests concurrently with proper error isolation
   */
  async executeBatch(requests: AIAnalysisRequest[]): Promise<AIAnalysisResponse[]> {
    console.log(`🔍 [AI_EXECUTOR] Starting batch execution of ${requests.length} requests`)
    
    const results = await Promise.allSettled(
      requests.map(request => this.execute(request))
    )

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        console.error(`❌ [AI_EXECUTOR] Batch request ${index} failed:`, result.reason)
        return {
          content: '',
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Batch request failed',
          metadata: {
            model: requests[index].model || 'openai/gpt-4o-mini'
          }
        }
      }
    })
  }

  /**
   * Execute with circuit breaker pattern for resilience
   */
  async executeWithCircuitBreaker(
    request: AIAnalysisRequest,
    maxRetries: number = 2,
    backoffMs: number = 1000
  ): Promise<AIAnalysisResponse> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const result = await this.execute({
          ...request,
          contextInfo: {
            ...request.contextInfo,
            analyzerName: `${request.contextInfo?.analyzerName || 'AI_EXECUTOR'}_ATTEMPT_${attempt}`
          }
        })

        if (result.success) {
          if (attempt > 1) {
            console.log(`✅ [AI_EXECUTOR] Request succeeded on attempt ${attempt}`)
          }
          return result
        }

        lastError = new Error(result.error || 'AI request failed')
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.warn(`⚠️ [AI_EXECUTOR] Attempt ${attempt} failed:`, lastError.message)
      }

      // Wait before retry (except on last attempt)
      if (attempt <= maxRetries) {
        const waitTime = backoffMs * Math.pow(2, attempt - 1) // Exponential backoff
        console.log(`⏳ [AI_EXECUTOR] Waiting ${waitTime}ms before retry...`)
        await this.delay(waitTime)
      }
    }

    console.error(`❌ [AI_EXECUTOR] All ${maxRetries + 1} attempts failed`)
    return {
      content: '',
      success: false,
      error: lastError?.message || 'All retry attempts failed',
      metadata: {
        model: request.model || 'openai/gpt-4o-mini'
      }
    }
  }

  /**
   * Perform the actual AI request
   */
  private async performAIRequest(
    prompt: string,
    systemMessage: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<{ content: string; tokensUsed?: number }> {
    const result = await simpleAIClient.generateCompletion({
      model,
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      maxTokens,
      temperature
    })

    return {
      content: result.content || '',
      tokensUsed: result.usage?.total_tokens
    }
  }

  /**
   * Execute with timeout protection
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        console.error(`🚨 [AI_EXECUTOR] TIMEOUT - ${operation} exceeded ${timeoutMs}ms`)
        reject(new Error(`Timeout: ${operation} exceeded ${timeoutMs}ms`))
      }, timeoutMs)
    })

    try {
      const result = await Promise.race([promise, timeoutPromise])
      clearTimeout(timeoutId!)
      return result
    } catch (error) {
      clearTimeout(timeoutId!)
      throw error
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const aiRequestExecutor = AIRequestExecutor.getInstance()