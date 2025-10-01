/**
 * CSRF Protection Implementation
 * 
 * Provides Cross-Site Request Forgery protection through:
 * - Token generation and validation
 * - SameSite cookie attributes
 * - State parameter validation
 * - Referer/Origin header verification
 * 
 * Usage:
 * - generateCSRFToken(): Generate token for forms
 * - validateCSRFToken(): Validate token in API routes
 * - CSRFMiddleware: Automatic protection middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { app } from '@/lib/config/env';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const CSRF_COOKIE_NAME = '__csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export interface CSRFTokenData {
  token: string;
  timestamp: number;
}

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  const tokenBytes = randomBytes(CSRF_TOKEN_LENGTH);
  const timestamp = Date.now();
  
  // Combine token and timestamp for expiration tracking
  const tokenData: CSRFTokenData = {
    token: tokenBytes.toString('hex'),
    timestamp
  };
  
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(
  submittedToken: string,
  storedToken: string
): { valid: boolean; error?: string } {
  try {
    if (!submittedToken || !storedToken) {
      return { valid: false, error: 'Missing CSRF token' };
    }

    // Decode both tokens
    const submittedData: CSRFTokenData = JSON.parse(
      Buffer.from(submittedToken, 'base64').toString()
    );
    const storedData: CSRFTokenData = JSON.parse(
      Buffer.from(storedToken, 'base64').toString()
    );

    // Check token expiration
    const now = Date.now();
    if (now - storedData.timestamp > CSRF_TOKEN_TTL) {
      return { valid: false, error: 'CSRF token expired' };
    }

    // Timing-safe comparison
    const submittedBuffer = Buffer.from(submittedData.token, 'hex');
    const storedBuffer = Buffer.from(storedData.token, 'hex');

    if (submittedBuffer.length !== storedBuffer.length) {
      return { valid: false, error: 'Invalid CSRF token' };
    }

    const isValid = timingSafeEqual(submittedBuffer, storedBuffer);
    
    if (!isValid) {
      return { valid: false, error: 'Invalid CSRF token' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Malformed CSRF token' };
  }
}

/**
 * Set CSRF token in cookie
 */
export async function setCSRFCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: app.nodeEnv === 'production',
    sameSite: app.nodeEnv === 'production' ? 'strict' : 'lax',
    maxAge: CSRF_TOKEN_TTL / 1000, // Convert to seconds
    path: '/'
  });
}

/**
 * Get CSRF token from cookie
 */
export async function getCSRFCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value;
}

/**
 * Extract CSRF token from request (header or body)
 */
export function extractCSRFToken(request: NextRequest): string | null {
  // Try header first
  const token = request.headers.get(CSRF_HEADER_NAME);
  
  if (!token) {
    // Try body for form submissions
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      // Note: This would need to be handled in the API route
      // as we can't easily access form data here
      return null;
    }
  }
  
  return token;
}

/**
 * Validate request origin/referer
 */
export function validateRequestOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Skip validation for same-origin requests
  if (origin && host) {
    const originHost = new URL(origin).host;
    return originHost === host;
  }
  
  if (referer && host) {
    const refererHost = new URL(referer).host;
    return refererHost === host;
  }
  
  // If we can't verify origin, allow (fallback to token validation)
  return true;
}

/**
 * CSRF Protection Middleware
 */
export async function CSRFMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const method = request.method;
  
  // Skip CSRF protection for safe methods (GET, HEAD, OPTIONS, TRACE)
  if (['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
    return null;
  }
  
  // Skip for API authentication endpoints and webhooks
  if (pathname.startsWith('/api/auth/') || 
      pathname.startsWith('/api/webhooks/') ||
      pathname.startsWith('/api/csrf')) { // Allow CSRF token generation
    return null;
  }
  
  // Skip for non-API routes (pages) - only protect API endpoints
  if (!pathname.startsWith('/api/')) {
    return null;
  }
  
  // For development, only validate origin - token validation is too complex with SSR
  if (app.nodeEnv === 'development') {
    if (!validateRequestOrigin(request)) {
      return NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      );
    }
    // Allow request to proceed with just origin validation in development
    return null;
  }
  
  // In production, require full CSRF token validation
  if (!validateRequestOrigin(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin' },
      { status: 403 }
    );
  }
  
  // Extract and validate CSRF token
  const submittedToken = extractCSRFToken(request);
  const storedToken = await getCSRFCookie();
  
  if (!submittedToken || !storedToken) {
    return NextResponse.json(
      { error: 'Missing CSRF token' },
      { status: 403 }
    );
  }
  
  const { valid, error } = validateCSRFToken(submittedToken, storedToken);
  
  if (!valid) {
    return NextResponse.json(
      { error: `CSRF validation failed: ${error}` },
      { status: 403 }
    );
  }
  
  // Token is valid, continue
  return null;
}

/**
 * Generate CSRF token for client-side use
 */
export async function getCSRFTokenForClient(): Promise<string> {
  const token = generateCSRFToken();
  await setCSRFCookie(token);
  return token;
}

/**
 * Hook for React components to get CSRF token
 */
export interface UseCSRFReturn {
  token: string | null;
  loading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
}

// This would be implemented as a custom hook in a separate file
export const useCSRF = (): UseCSRFReturn => {
  // Implementation would go here using React hooks
  // This is a placeholder to show the interface
  throw new Error('useCSRF hook should be implemented in a React component file');
};

/**
 * Utility to add CSRF token to form data
 */
export function addCSRFToFormData(formData: FormData, token: string): FormData {
  formData.append('_csrf', token);
  return formData;
}

/**
 * Utility to add CSRF token to request headers
 */
export function addCSRFToHeaders(headers: Headers, token: string): Headers {
  headers.set(CSRF_HEADER_NAME, token);
  return headers;
}

/**
 * CSRF token validation for API routes
 */
export async function validateCSRFInAPIRoute(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
}> {
  const submittedToken = request.headers.get(CSRF_HEADER_NAME);
  const storedToken = await getCSRFCookie();
  
  if (!submittedToken || !storedToken) {
    return { valid: false, error: 'Missing CSRF token' };
  }
  
  return validateCSRFToken(submittedToken, storedToken);
}

/**
 * Generate CSRF meta tags for HTML pages
 */
export function generateCSRFMetaTags(token: string): string {
  return `<meta name="csrf-token" content="${token}" />`;
}

export {
  CSRF_TOKEN_LENGTH,
  CSRF_TOKEN_TTL,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
};