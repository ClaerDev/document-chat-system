/**
 * Unified API Client for consistent error handling and communication
 * 
 * This client provides a centralized way to make API requests with:
 * - Automatic error handling and retry logic
 * - Integration with notification system for user feedback
 * - Type-safe error responses
 * - Network status awareness
 * - Automatic integration with rate limiting
 */

import { handleApiError, ApiErrorResponse, createErrorResponse } from '@/lib/api-errors'
import { useNotifications } from '@/contexts/notification-context'

export interface ApiClientOptions {
  baseUrl?: string
  timeout?: number
  retries?: number
  notifyUser?: boolean
  includeCredentials?: boolean
}

export interface ApiRequestOptions extends RequestInit {
  timeout?: number
  retries?: number
  notifyUser?: boolean
  suppressNotifications?: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
  statusCode?: number
}

export class ApiClient {
  private baseUrl: string
  private defaultTimeout: number
  private defaultRetries: number
  private notifyUser: boolean

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || ''
    this.defaultTimeout = options.timeout || 30000 // 30 seconds
    this.defaultRetries = options.retries || 3
    this.notifyUser = options.notifyUser ?? true
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: any, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }

  /**
   * Make a PUT request
   */
  async put<T>(url: string, data?: any, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(url: string, data?: any, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  }

  /**
   * Core request method with automatic error handling and retries
   */
  async request<T>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`
    const timeout = options.timeout || this.defaultTimeout
    const maxRetries = options.retries ?? this.defaultRetries
    const notifyUser = options.notifyUser ?? this.notifyUser
    const suppressNotifications = options.suppressNotifications ?? false

    let lastError: Error | null = null
    
    // Attempt the request with retries
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(fullUrl, options, timeout)
        
        // Handle successful responses
        if (response.ok) {
          const data = await this.parseResponse<T>(response)
          
          // Show success notification if configured
          if (notifyUser && !suppressNotifications && this.shouldShowSuccessNotification(options.method || 'GET')) {
            this.showSuccessNotification(options.method || 'GET', url)
          }
          
          return {
            success: true,
            data,
            statusCode: response.status,
          }
        }

        // Handle HTTP error responses
        const errorData = await this.parseErrorResponse(response)
        
        // Don't retry on client errors (4xx) except for specific cases
        if (response.status >= 400 && response.status < 500 && !this.shouldRetryClientError(response.status)) {
          if (notifyUser && !suppressNotifications) {
            this.showErrorNotification(errorData, response.status)
          }
          
          return {
            success: false,
            error: errorData.error || 'Request failed',
            message: errorData.message,
            code: errorData.code,
            statusCode: response.status,
          }
        }

        // Prepare for retry on server errors (5xx) or retryable client errors
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt)
          console.log(`API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`)
          await this.delay(delay)
          continue
        }

        // Final attempt failed
        if (notifyUser && !suppressNotifications) {
          this.showErrorNotification(errorData, response.status)
        }

        return {
          success: false,
          error: errorData.error || 'Request failed',
          message: errorData.message,
          code: errorData.code,
          statusCode: response.status,
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Don't retry on network errors if we've reached max attempts
        if (attempt >= maxRetries) {
          break
        }

        // Retry on network errors
        const delay = this.calculateRetryDelay(attempt)
        console.log(`Network error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, lastError.message)
        await this.delay(delay)
      }
    }

    // All retries exhausted
    const errorMessage = lastError?.message || 'Network request failed'
    
    if (notifyUser && !suppressNotifications) {
      this.showNetworkErrorNotification(errorMessage)
    }

    return {
      success: false,
      error: errorMessage,
      code: 'NETWORK_ERROR',
      statusCode: 0,
    }
  }

  /**
   * Make the actual fetch request with timeout
   */
  private async makeRequest(url: string, options: ApiRequestOptions, timeout: number): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include', // Include cookies for authentication
      })
      
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`)
      }
      
      throw error
    }
  }

  /**
   * Parse successful response data
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      const data = await response.json()
      // Handle API responses with success wrapper
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return data.data
      }
      return data
    }
    
    if (contentType?.includes('text/')) {
      return (await response.text()) as unknown as T
    }
    
    // For other content types, return response directly
    return response as unknown as T
  }

  /**
   * Parse error response data
   */
  private async parseErrorResponse(response: Response): Promise<ApiErrorResponse> {
    try {
      const data = await response.json()
      
      // Handle standardized API error format
      if (data && typeof data === 'object') {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          message: data.message,
          code: data.code,
          details: data.details,
          statusCode: response.status,
        }
      }
    } catch {
      // Failed to parse JSON error response
    }

    // Fallback to status-based error
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
      statusCode: response.status,
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 1000 // 1 second
    const maxDelay = 10000 // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Determine if a client error should be retried
   */
  private shouldRetryClientError(status: number): boolean {
    // Retry on specific client errors
    switch (status) {
      case 408: // Request Timeout
      case 429: // Too Many Requests
        return true
      default:
        return false
    }
  }

  /**
   * Show success notification to user
   */
  private showSuccessNotification(method: string, url: string): void {
    // This will be integrated with the notification context
    // For now, we'll use console.log as placeholder
    if (method !== 'GET') { // Don't show notifications for GET requests
      console.log(`✅ ${method} ${url} completed successfully`)
    }
  }

  /**
   * Show error notification to user
   */
  private showErrorNotification(error: ApiErrorResponse, statusCode: number): void {
    const message = error.message || error.error || 'Request failed'
    console.error(`❌ API Error (${statusCode}): ${message}`)
    
    // TODO: Integrate with notification context
    // const { error: showError } = useNotifications()
    // showError('Request Failed', message, { persistent: statusCode >= 500 })
  }

  /**
   * Show network error notification
   */
  private showNetworkErrorNotification(message: string): void {
    console.error(`🔌 Network Error: ${message}`)
    
    // TODO: Integrate with notification context
    // const { error: showError } = useNotifications()
    // showError('Connection Problem', 'Please check your internet connection and try again.', { persistent: true })
  }

  /**
   * Determine if success notification should be shown
   */
  private shouldShowSuccessNotification(method: string): boolean {
    // Show notifications for data modification methods
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
  }
}

// Default instance for convenience
export const apiClient = new ApiClient()

// Hook for React components to use the API client with notifications
export function useApiClient(options: ApiClientOptions = {}): ApiClient {
  // TODO: Integrate with notification context
  // const notifications = useNotifications()
  
  return new ApiClient({
    notifyUser: true,
    ...options,
  })
}

// Type-safe API response wrapper for common patterns
export interface PaginatedApiResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Helper function to handle API responses consistently
export function handleApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error || 'API request failed')
  }
  
  if (response.data === undefined) {
    throw new Error('API response missing data')
  }
  
  return response.data
}

// Utility function for making quick API calls
export async function quickApiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any,
  options: ApiRequestOptions = {}
): Promise<T> {
  const client = apiClient
  
  switch (method) {
    case 'GET':
      return handleApiResponse(await client.get<T>(url, options))
    case 'POST':
      return handleApiResponse(await client.post<T>(url, data, options))
    case 'PUT':
      return handleApiResponse(await client.put<T>(url, data, options))
    case 'PATCH':
      return handleApiResponse(await client.patch<T>(url, data, options))
    case 'DELETE':
      return handleApiResponse(await client.delete<T>(url, options))
    default:
      throw new Error(`Unsupported HTTP method: ${method}`)
  }
}