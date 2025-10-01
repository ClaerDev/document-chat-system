import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { app } from '@/lib/config/env'

// Standard API error response interface
export interface ApiErrorResponse {
  success: false
  error: string
  message?: string
  details?: any
  code?: string
  statusCode?: number
}

// Custom error classes
export class ApiError extends Error {
  public statusCode: number
  public code?: string
  public details?: any

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR')
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR')
    this.name = 'RateLimitError'
  }
}

// Error handler function
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error)

  // Handle custom API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      },
      { status: 400 }
    )
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          {
            success: false,
            error: 'Unique constraint violation',
            code: 'DUPLICATE_ERROR',
            message: 'A record with this information already exists'
          },
          { status: 409 }
        )
      
      case 'P2025':
        return NextResponse.json(
          {
            success: false,
            error: 'Record not found',
            code: 'NOT_FOUND_ERROR',
            message: 'The requested resource was not found'
          },
          { status: 404 }
        )
      
      case 'P2003':
        return NextResponse.json(
          {
            success: false,
            error: 'Foreign key constraint violation',
            code: 'CONSTRAINT_ERROR',
            message: 'Referenced resource does not exist'
          },
          { status: 400 }
        )
      
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Database error',
            code: 'DATABASE_ERROR',
            message: 'A database error occurred'
          },
          { status: 500 }
        )
    }
  }

  // Handle Prisma client initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection error',
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Unable to connect to database'
      },
      { status: 503 }
    )
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const isDevelopment = app.nodeEnv === 'development'
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: isDevelopment ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    )
  }

  // Handle unknown error types
  return NextResponse.json(
    {
      success: false,
      error: 'Unknown error',
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred'
    },
    { status: 500 }
  )
}

// Async error wrapper for API routes
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<ApiErrorResponse>> => {
    try {
      return await fn(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

// Helper function to create standardized success responses
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message })
    },
    { status }
  )
}

// Helper function to create standardized error responses
export function createErrorResponse(
  error: string,
  status: number = 500,
  code?: string,
  details?: any
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(code && { code }),
      ...(details && { details })
    },
    { status }
  )
}

// Common error responses
export const commonErrors = {
  unauthorized: () => new AuthenticationError('Please sign in to access this resource'),
  forbidden: () => new AuthorizationError('You do not have permission to access this resource'),
  notFound: (resource: string = 'Resource') => new NotFoundError(`${resource} not found`),
  conflict: (resource: string = 'Resource') => new ConflictError(`${resource} already exists`),
  validation: (details?: any) => new ValidationError('Invalid input data', details),
  rateLimit: () => new RateLimitError('Too many requests. Please try again later'),
  internal: (message?: string) => new ApiError(message || 'Internal server error', 500)
}

// Type guard functions
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isValidationError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError
}

export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError
}