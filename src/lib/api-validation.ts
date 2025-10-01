/**
 * API Request Validation Utilities
 * 
 * Provides standardized validation for API endpoints using Zod schemas.
 * Handles request parsing, validation, and error formatting.
 */

import { NextRequest } from 'next/server';
import { z, ZodSchema } from 'zod';

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details: any;
  };
}

/**
 * Validate API request against a Zod schema
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    // Parse JSON body
    const body = await request.json();
    
    // Validate against schema
    const result = schema.safeParse(body);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          details: result.error.issues
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Invalid JSON in request body',
        details: error
      }
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = request.nextUrl;
    const params = Object.fromEntries(searchParams.entries());
    
    const result = schema.safeParse(params);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      return {
        success: false,
        error: {
          message: 'Query parameter validation failed',
          details: result.error.issues
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Invalid query parameters',
        details: error
      }
    };
  }
}

/**
 * Validate path parameters against a Zod schema
 */
export function validatePathParams<T>(
  params: any,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const result = schema.safeParse(params);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      return {
        success: false,
        error: {
          message: 'Path parameter validation failed',
          details: result.error.issues
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Invalid path parameters',
        details: error
      }
    };
  }
}

/**
 * Create a standardized error response for validation failures
 */
export function createValidationErrorResponse(validation: ValidationResult) {
  return {
    success: false,
    error: validation.error?.message || 'Validation failed',
    details: validation.error?.details
  };
}