/**
 * CRUD Audit Decorators for API Routes
 * Provides easy-to-use decorators for adding audit logging to existing endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { crudAuditLogger, AuditCategory, AuditEventType, AuditSeverity } from './crud-audit-logger';
import { prisma } from '@/lib/db';

/**
 * Decorator for Profile operations
 */
export function auditProfileOperation(
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const request = args[0] as NextRequest;
      let previousData: any = null;
      let profileId: string | null = null;
      
      try {
        // For UPDATE and DELETE, fetch previous data
        if (operation === 'UPDATE' || operation === 'DELETE') {
          const url = new URL(request.url);
          profileId = url.pathname.split('/').pop() || null;
          
          if (profileId) {
            previousData = await prisma.profile.findUnique({
              where: { id: profileId }
            });
          }
        }
        
        // Execute the original method
        const result = await originalMethod.apply(this, args);
        
        // Extract profile data from response
        if (result instanceof NextResponse) {
          const body = await result.clone().json();
          
          if (body.success && body.data) {
            const profileData = body.data;
            profileId = profileId || profileData.id;
            
            // Log the operation
            await crudAuditLogger.logProfileOperation(
              operation,
              profileId,
              profileData.companyName || 'Unknown Company',
              previousData,
              operation !== 'DELETE' ? profileData : null,
              {
                endpoint: request.url,
                method: request.method,
                userAgent: request.headers.get('user-agent')
              }
            );
          }
        }
        
        return result;
      } catch (error) {
        console.error('Audit decorator error:', error);
        // Don't break the main operation
        return originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator for Billing/Subscription operations
 */
export function auditBillingOperation(
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const request = args[0] as NextRequest;
      let previousData: any = null;
      let subscriptionId: string | null = null;
      
      try {
        // For UPDATE and DELETE, fetch previous data
        if (operation === 'UPDATE' || operation === 'DELETE') {
          const url = new URL(request.url);
          subscriptionId = url.pathname.split('/').pop() || null;
          
          if (subscriptionId) {
            previousData = await prisma.subscription.findUnique({
              where: { id: subscriptionId },
              include: { pricingPlan: true }
            });
          }
        }
        
        // Execute the original method
        const result = await originalMethod.apply(this, args);
        
        // Extract subscription data from response
        if (result instanceof NextResponse) {
          const body = await result.clone().json();
          
          if (body.success && body.data) {
            const subscriptionData = body.data;
            subscriptionId = subscriptionId || subscriptionData.id;
            
            // Log the operation
            await crudAuditLogger.logBillingOperation(
              operation,
              subscriptionId,
              subscriptionData.pricingPlan?.name || subscriptionData.planName || 'Unknown Plan',
              previousData,
              operation !== 'DELETE' ? subscriptionData : null,
              {
                endpoint: request.url,
                method: request.method,
                userAgent: request.headers.get('user-agent'),
                stripeEvent: body.stripeEvent || null
              }
            );
          }
        }
        
        return result;
      } catch (error) {
        console.error('Audit decorator error:', error);
        return originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator for Document operations
 */
export function auditDocumentOperation(
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const request = args[0] as NextRequest;
      let previousData: any = null;
      let documentId: string | null = null;
      
      try {
        // For UPDATE and DELETE, fetch previous data
        if (operation === 'UPDATE' || operation === 'DELETE') {
          const url = new URL(request.url);
          const pathParts = url.pathname.split('/');
          documentId = pathParts[pathParts.indexOf('documents') + 1] || null;
          
          if (documentId) {
            previousData = await prisma.document.findUnique({
              where: { id: documentId },
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
                permissions: true,
                folderId: true
              }
            });
          }
        }
        
        // Execute the original method
        const result = await originalMethod.apply(this, args);
        
        // Extract document data from response
        if (result instanceof NextResponse) {
          const body = await result.clone().json();
          
          if (body.success && body.data) {
            const documentData = body.data;
            documentId = documentId || documentData.id;
            
            // Log the operation
            await crudAuditLogger.logDocumentOperation(
              operation,
              documentId,
              documentData.name || documentData.fileName || 'Unknown Document',
              documentData.type || documentData.mimeType || 'unknown',
              previousData,
              operation !== 'DELETE' ? documentData : null,
              {
                endpoint: request.url,
                method: request.method,
                userAgent: request.headers.get('user-agent'),
                fileSize: documentData.size || null,
                action: url.pathname.includes('download') ? 'download' : 
                        url.pathname.includes('share') ? 'share' : 
                        url.pathname.includes('analyze') ? 'analyze' : null
              }
            );
          }
        }
        
        return result;
      } catch (error) {
        console.error('Audit decorator error:', error);
        return originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator for API Key operations
 */
export function auditAPIKeyOperation(
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const request = args[0] as NextRequest;
      let previousData: any = null;
      let keyId: string | null = null;
      
      try {
        // For UPDATE and DELETE, fetch previous data
        if (operation === 'UPDATE' || operation === 'DELETE') {
          const url = new URL(request.url);
          const pathParts = url.pathname.split('/');
          keyId = pathParts[pathParts.indexOf('api-keys') + 1] || null;
          
          if (keyId) {
            previousData = await prisma.apiKey.findUnique({
              where: { id: keyId },
              select: {
                id: true,
                name: true,
                permissions: true,
                expiresAt: true,
                lastUsedAt: true,
                status: true
              }
            });
          }
        }
        
        // Execute the original method
        const result = await originalMethod.apply(this, args);
        
        // Extract API key data from response
        if (result instanceof NextResponse) {
          const body = await result.clone().json();
          
          if (body.success && body.data) {
            const keyData = body.data;
            keyId = keyId || keyData.id;
            
            // Log the operation (never log the actual key)
            await crudAuditLogger.logAPIKeyOperation(
              operation,
              keyId,
              keyData.name || 'Unknown API Key',
              previousData,
              operation !== 'DELETE' ? {
                ...keyData,
                key: '[REDACTED]',
                hashedKey: '[REDACTED]'
              } : null,
              {
                endpoint: request.url,
                method: request.method,
                userAgent: request.headers.get('user-agent'),
                isRotation: url.pathname.includes('rotate')
              }
            );
          }
        }
        
        return result;
      } catch (error) {
        console.error('Audit decorator error:', error);
        return originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator for Opportunity operations
 */
export function auditOpportunityOperation(
  actionType: 'SAVE' | 'APPLY' | 'NOTE' | 'ASSIGN'
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const request = args[0] as NextRequest;
      
      try {
        // Execute the original method
        const result = await originalMethod.apply(this, args);
        
        // Extract opportunity data from response
        if (result instanceof NextResponse) {
          const body = await result.clone().json();
          
          if (body.success && body.data) {
            const opportunityData = body.data;
            
            // Log the operation
            await crudAuditLogger.logOpportunityOperation(
              actionType === 'SAVE' || actionType === 'APPLY' ? 'CREATE' : 'UPDATE',
              opportunityData.opportunityId || opportunityData.id,
              opportunityData.opportunityTitle || opportunityData.title || 'Unknown Opportunity',
              actionType,
              null,
              opportunityData,
              {
                endpoint: request.url,
                method: request.method,
                userAgent: request.headers.get('user-agent')
              }
            );
          }
        }
        
        return result;
      } catch (error) {
        console.error('Audit decorator error:', error);
        return originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator for AI/Match Score operations
 */
export function auditAIOperation() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const request = args[0] as NextRequest;
      
      try {
        // Execute the original method
        const result = await originalMethod.apply(this, args);
        
        // Extract AI/score data from response
        if (result instanceof NextResponse) {
          const body = await result.clone().json();
          
          if (body.success && body.data) {
            const scoreData = Array.isArray(body.data) ? body.data : [body.data];
            
            // Log each score calculation
            for (const score of scoreData) {
              if (score.opportunityId && score.score !== undefined) {
                await crudAuditLogger.logAIOperation(
                  'CREATE',
                  score.id || `${score.profileId}-${score.opportunityId}`,
                  score.opportunityTitle || 'Unknown Opportunity',
                  score.profileName || 'Unknown Profile',
                  score.score || score.overallScore,
                  score.algorithm || score.method || 'unknown',
                  {
                    endpoint: request.url,
                    method: request.method,
                    userAgent: request.headers.get('user-agent'),
                    model: score.model || body.model,
                    provider: score.provider || body.provider,
                    confidence: score.confidence,
                    factors: score.factors || score.breakdown
                  }
                );
              }
            }
          }
        }
        
        return result;
      } catch (error) {
        console.error('Audit decorator error:', error);
        return originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

/**
 * Generic audit wrapper for middleware use
 */
export async function withAuditLogging<T extends (...args: any[]) => any>(
  fn: T,
  auditConfig: {
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
    entityType: string;
    getEntityId: (args: Parameters<T>, result: any) => string;
    getEntityName: (args: Parameters<T>, result: any) => string;
    getPreviousData?: (args: Parameters<T>) => Promise<any>;
    getCurrentData?: (result: any) => any;
    sensitiveFields?: string[];
  }
): T {
  return (async (...args: Parameters<T>) => {
    let previousData: any = null;
    
    try {
      // Get previous data if needed
      if (auditConfig.getPreviousData) {
        previousData = await auditConfig.getPreviousData(args);
      }
      
      // Execute the function
      const result = await fn(...args);
      
      // Get current data
      const currentData = auditConfig.getCurrentData ? 
        auditConfig.getCurrentData(result) : null;
      
      // Log the operation
      await crudAuditLogger.logCRUDOperation(
        {
          operation: auditConfig.operation,
          entityType: auditConfig.entityType,
          entityId: auditConfig.getEntityId(args, result),
          entityName: auditConfig.getEntityName(args, result),
          previousData,
          currentData,
          sensitiveFields: auditConfig.sensitiveFields
        },
        AuditCategory.DATA_ACCESS,
        AuditEventType.DATA_ACCESSED,
        AuditSeverity.INFO
      );
      
      return result;
    } catch (error) {
      console.error('Audit wrapper error:', error);
      throw error;
    }
  }) as T;
}