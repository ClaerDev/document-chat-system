/**
 * API Authentication Middleware
 * 
 * Handles both session-based authentication (Clerk) and API key authentication
 * for programmatic access to the API endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateAPIKey, hasScope, APIKeyScope, extractAPIKeyFromRequest } from '@/lib/api-keys';
import { getCurrentUser } from '@/lib/auth';

export interface AuthContext {
  type: 'session' | 'api_key';
  userId: string;
  organizationId: string;
  userRole?: string;
  apiKeyData?: {
    keyId: string;
    name: string;
    scopes: APIKeyScope[];
  };
}

export interface AuthResult {
  authenticated: boolean;
  context?: AuthContext;
  error?: string;
  statusCode?: number;
}

/**
 * Authenticate request using either session or API key
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // First, try API key authentication
    const apiKey = extractAPIKeyFromRequest(request);
    
    if (apiKey) {
      const validation = await validateAPIKey(apiKey);
      
      if (!validation.valid || !validation.keyData) {
        return {
          authenticated: false,
          error: validation.error || 'Invalid API key',
          statusCode: 401
        };
      }

      return {
        authenticated: true,
        context: {
          type: 'api_key',
          userId: validation.keyData.userId,
          organizationId: validation.keyData.organizationId,
          apiKeyData: {
            keyId: validation.keyData.keyId,
            name: validation.keyData.name,
            scopes: validation.keyData.scopes as APIKeyScope[]
          }
        }
      };
    }

    // Fall back to session authentication
    const { userId } = await auth();
    
    if (!userId) {
      return {
        authenticated: false,
        error: 'Authentication required',
        statusCode: 401
      };
    }

    // Get user details for session auth
    const user = await getCurrentUser();
    
    if (!user) {
      return {
        authenticated: false,
        error: 'User not found',
        statusCode: 404
      };
    }

    return {
      authenticated: true,
      context: {
        type: 'session',
        userId: user.id,
        organizationId: user.organizationId,
        userRole: user.role
      }
    };

  } catch (error) {
    console.error('Authentication error:', error);
    
    return {
      authenticated: false,
      error: 'Authentication failed',
      statusCode: 500
    };
  }
}

/**
 * Check if authenticated context has required scope/permission
 */
export function hasPermission(
  context: AuthContext,
  requiredScope: APIKeyScope
): boolean {
  if (context.type === 'api_key') {
    if (!context.apiKeyData) return false;
    
    // Check if API key has required scope
    const keyData = {
      scopes: context.apiKeyData.scopes
    } as any;
    
    return hasScope(keyData, requiredScope);
  }

  if (context.type === 'session') {
    // For session auth, map scopes to user roles
    const scopeToRoleMapping: Record<APIKeyScope, string[]> = {
      'read:profile': ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
      'write:profile': ['MEMBER', 'ADMIN', 'OWNER'],
      'read:opportunities': ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
      'read:match-scores': ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
      'write:match-scores': ['MEMBER', 'ADMIN', 'OWNER'],
      'read:organizations': ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
      'write:organizations': ['ADMIN', 'OWNER'],
      'read:usage': ['ADMIN', 'OWNER'],
      'admin:all': ['OWNER']
    };

    const allowedRoles = scopeToRoleMapping[requiredScope];
    return allowedRoles?.includes(context.userRole || '') || false;
  }

  return false;
}

/**
 * Middleware wrapper for API routes that require authentication
 */
export function withAuth(
  handler: (request: NextRequest, context: AuthContext, ...args: any[]) => Promise<NextResponse>,
  requiredScope?: APIKeyScope
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const context = authResult.context!;

    // Check required scope if specified
    if (requiredScope && !hasPermission(context, requiredScope)) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions',
          requiredScope,
          userScope: context.type === 'api_key' 
            ? context.apiKeyData?.scopes 
            : [context.userRole]
        },
        { status: 403 }
      );
    }

    // Call the handler with the authenticated context
    return handler(request, context, ...args);
  };
}

/**
 * Extract authentication context from request headers for client use
 */
export function getAuthHeaders(context: AuthContext): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Auth-Type': context.type,
    'X-User-ID': context.userId,
    'X-Organization-ID': context.organizationId
  };

  if (context.type === 'api_key' && context.apiKeyData) {
    headers['X-API-Key-ID'] = context.apiKeyData.keyId;
    headers['X-API-Key-Name'] = context.apiKeyData.name;
    headers['X-API-Key-Scopes'] = context.apiKeyData.scopes.join(',');
  }

  if (context.type === 'session' && context.userRole) {
    headers['X-User-Role'] = context.userRole;
  }

  return headers;
}

/**
 * Helper to get authentication info for logging/analytics
 */
export function getAuthInfo(context: AuthContext): {
  authType: string;
  userId: string;
  organizationId: string;
  identifier: string;
  permissions: string[];
} {
  if (context.type === 'api_key' && context.apiKeyData) {
    return {
      authType: 'api_key',
      userId: context.userId,
      organizationId: context.organizationId,
      identifier: context.apiKeyData.name,
      permissions: context.apiKeyData.scopes
    };
  }

  return {
    authType: 'session',
    userId: context.userId,
    organizationId: context.organizationId,
    identifier: context.userRole || 'unknown',
    permissions: [context.userRole || 'none']
  };
}

/**
 * Rate limiting that considers authentication type
 */
export function getAuthBasedRateLimit(context: AuthContext): {
  identifier: string;
  limits: { requests: number; window: number };
} {
  if (context.type === 'api_key') {
    // More restrictive limits for API keys
    return {
      identifier: `api_key:${context.apiKeyData?.keyId}`,
      limits: { requests: 1000, window: 60 * 60 * 1000 } // 1000 per hour
    };
  }

  // Session-based limits
  return {
    identifier: `session:${context.userId}`,
    limits: { requests: 300, window: 60 * 60 * 1000 } // 300 per hour
  };
}

/**
 * Utility to create standardized API responses with auth context
 */
export function createAuthenticatedResponse(
  data: any,
  context: AuthContext,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Add auth context headers
  const authHeaders = getAuthHeaders(context);
  Object.entries(authHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}