/**
 * Zod validation schemas for audit logging
 * Provides comprehensive validation for all audit-related operations
 */

import { z } from 'zod';
import { AuditCategory, AuditEventType, AuditSeverity } from '@prisma/client';

// Base audit log schemas
export const AuditLogBaseSchema = z.object({
  operation: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE'])
    .describe("CRUD operation type being audited"),
  entityType: z.string().min(1)
    .describe("Type of entity being operated on (Profile, Document, etc.)"),
  entityId: z.string().min(1)
    .describe("Unique identifier of the entity"),
  entityName: z.string().optional()
    .describe("Human-readable name or title of the entity"),
  description: z.string().optional()
    .describe("Human-readable description of the operation"),
  category: z.nativeEnum(AuditCategory)
    .describe("High-level category for the audit event"),
  eventType: z.nativeEnum(AuditEventType)
    .describe("Specific type of event within the category"),
  severity: z.nativeEnum(AuditSeverity)
    .describe("Severity level of the audit event"),
  organizationId: z.string()
    .describe("Organization ID for multi-tenant isolation"),
  userId: z.string().nullable().optional()
    .describe("User ID who performed the operation (null for system operations)"),
  previousData: z.any().nullable().optional()
    .describe("Previous state of the entity before operation"),
  currentData: z.any().nullable().optional()
    .describe("Current state of the entity after operation"),
  metadata: z.record(z.any()).optional()
    .describe("Additional context and metadata for the operation"),
  sensitiveFields: z.array(z.string()).optional()
    .describe("List of fields containing sensitive data that should be masked"),
  ipAddress: z.string().optional()
    .describe("IP address of the request"),
  userAgent: z.string().optional()
    .describe("User agent string of the request")
});

// Profile-specific audit schemas
export const ProfileAuditSchema = AuditLogBaseSchema.extend({
  entityType: z.literal('Profile'),
  previousData: z.object({
    companyName: z.string().optional(),
    primaryContactEmail: z.string().optional(),
    uei: z.string().optional(),
    cageCode: z.string().optional(),
    profileCompleteness: z.number().optional()
  }).nullable().optional(),
  currentData: z.object({
    companyName: z.string().optional(),
    primaryContactEmail: z.string().optional(),
    uei: z.string().optional(),
    cageCode: z.string().optional(),
    profileCompleteness: z.number().optional()
  }).nullable().optional(),
  sensitiveFields: z.array(z.enum([
    'primaryContactEmail',
    'primaryContactPhone',
    'annualRevenue',
    'duns',
    'cageCode',
    'uei'
  ])).optional()
});

// Billing/Subscription audit schemas
export const BillingAuditSchema = AuditLogBaseSchema.extend({
  entityType: z.enum(['Subscription', 'Payment', 'Invoice']),
  previousData: z.object({
    planType: z.string().optional(),
    status: z.string().optional(),
    amount: z.number().optional(),
    stripeSubscriptionId: z.string().optional()
  }).nullable().optional(),
  currentData: z.object({
    planType: z.string().optional(),
    status: z.string().optional(),
    amount: z.number().optional(),
    stripeSubscriptionId: z.string().optional()
  }).nullable().optional(),
  sensitiveFields: z.array(z.enum([
    'stripeCustomerId',
    'stripeSubscriptionId',
    'stripePaymentMethodId'
  ])).optional(),
  metadata: z.object({
    isFinancialOperation: z.boolean().optional(),
    endpoint: z.string().optional(),
    method: z.string().optional(),
    organizationId: z.string().optional(),
    stripeEvent: z.string().optional()
  }).optional()
});

// Document audit schemas
export const DocumentAuditSchema = AuditLogBaseSchema.extend({
  entityType: z.literal('Document'),
  previousData: z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    securityClassification: z.string().optional(),
    workflowStatus: z.string().optional()
  }).nullable().optional(),
  currentData: z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    securityClassification: z.string().optional(),
    workflowStatus: z.string().optional()
  }).nullable().optional(),
  metadata: z.object({
    documentType: z.string().optional(),
    isConfidential: z.boolean().optional(),
    fileSize: z.number().optional(),
    action: z.enum(['download', 'share', 'analyze']).optional(),
    endpoint: z.string().optional(),
    method: z.string().optional()
  }).optional()
});

// API Key audit schemas
export const APIKeyAuditSchema = AuditLogBaseSchema.extend({
  entityType: z.literal('APIKey'),
  previousData: z.object({
    name: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    expiresAt: z.date().optional()
  }).nullable().optional(),
  currentData: z.object({
    name: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    expiresAt: z.date().optional(),
    key: z.literal('[REDACTED]').optional(),
    hashedKey: z.literal('[REDACTED]').optional()
  }).nullable().optional(),
  metadata: z.object({
    isSecurityOperation: z.boolean().optional(),
    securityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    action: z.enum(['api_key_generation', 'api_key_rotation', 'api_key_revocation']).optional(),
    isRotation: z.boolean().optional(),
    endpoint: z.string().optional(),
    method: z.string().optional()
  }).optional()
});

// Opportunity lifecycle audit schemas
export const OpportunityAuditSchema = AuditLogBaseSchema.extend({
  entityType: z.enum(['Opportunity_SAVE', 'Opportunity_APPLY', 'Opportunity_NOTE', 'Opportunity_ASSIGN']),
  previousData: z.object({
    status: z.string().optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional()
  }).nullable().optional(),
  currentData: z.object({
    status: z.string().optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    proposalValue: z.number().optional(),
    winProbability: z.number().optional()
  }).nullable().optional(),
  metadata: z.object({
    actionType: z.enum(['SAVE', 'APPLY', 'NOTE', 'ASSIGN']).optional(),
    lifecycleAction: z.string().optional(),
    sourceSystem: z.string().optional(),
    externalId: z.string().optional(),
    statusChange: z.object({
      from: z.string(),
      to: z.string()
    }).optional(),
    noteType: z.string().optional(),
    isPrivate: z.boolean().optional(),
    contentLength: z.number().optional(),
    endpoint: z.string().optional(),
    method: z.string().optional()
  }).optional()
});

// AI/Match Score audit schemas
export const AIAuditSchema = AuditLogBaseSchema.extend({
  entityType: z.literal('MatchScore'),
  currentData: z.object({
    score: z.number(),
    algorithm: z.string(),
    confidence: z.number().optional(),
    factors: z.any().optional()
  }).nullable().optional(),
  metadata: z.object({
    algorithm: z.string(),
    score: z.number(),
    isAIDecision: z.literal(true),
    model: z.string().optional(),
    provider: z.string().optional(),
    profileName: z.string().optional(),
    opportunityTitle: z.string().optional(),
    endpoint: z.string().optional(),
    method: z.string().optional()
  }).optional()
});

// Compliance report audit schemas
export const ComplianceReportAuditSchema = AuditLogBaseSchema.extend({
  entityType: z.literal('COMPLIANCE_REPORT'),
  currentData: z.object({
    reportId: z.string(),
    complianceScore: z.number(),
    organizationId: z.string().optional(),
    reportPeriod: z.object({
      startDate: z.date(),
      endDate: z.date(),
      days: z.number()
    }),
    format: z.enum(['JSON', 'CSV', 'PDF']),
    soc2RequirementsCompliant: z.number()
  }).nullable().optional(),
  metadata: z.object({
    targetOrganization: z.string().optional(),
    reportFormat: z.string(),
    complianceScore: z.number(),
    endpoint: z.string().optional(),
    method: z.string().optional()
  }).optional()
});

// Query parameters for audit log retrieval
export const AuditLogQuerySchema = z.object({
  organizationId: z.string()
    .describe("Organization ID for tenant isolation"),
  limit: z.number().int().min(1).max(1000).default(100)
    .describe("Maximum number of results to return"),
  offset: z.number().int().min(0).default(0)
    .describe("Number of results to skip for pagination"),
  startDate: z.date().optional()
    .describe("Filter results from this date onwards"),
  endDate: z.date().optional()
    .describe("Filter results up to this date"),
  category: z.nativeEnum(AuditCategory).optional()
    .describe("Filter by audit category"),
  severity: z.nativeEnum(AuditSeverity).optional()
    .describe("Filter by severity level"),
  entityType: z.string().optional()
    .describe("Filter by entity type"),
  userId: z.string().optional()
    .describe("Filter by user who performed the operation"),
  operation: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE']).optional()
    .describe("Filter by operation type")
});

// Tenant isolation validation schemas
export const TenantIsolationValidationSchema = z.object({
  organizationId: z.string()
    .describe("Organization ID to validate isolation for"),
  violations: z.array(z.object({
    type: z.enum(['CROSS_TENANT_LOG', 'MISSING_ORGANIZATION', 'USER_ORGANIZATION_MISMATCH']),
    description: z.string(),
    count: z.number().int().min(0)
  })),
  isValid: z.boolean()
    .describe("Whether tenant isolation is valid")
});

// Audit statistics schemas
export const AuditStatsQuerySchema = z.object({
  organizationId: z.string()
    .describe("Organization ID for stats calculation"),
  timeframe: z.enum(['day', 'week', 'month']).default('month')
    .describe("Timeframe for statistics calculation")
});

export const AuditStatsResponseSchema = z.object({
  totalLogs: z.number().int().min(0),
  categoryCounts: z.record(z.nativeEnum(AuditCategory), z.number().int().min(0)),
  severityCounts: z.record(z.nativeEnum(AuditSeverity), z.number().int().min(0)),
  recentActivity: z.array(z.object({
    date: z.string(),
    count: z.number().int().min(0)
  })),
  topUsers: z.array(z.object({
    userId: z.string(),
    userName: z.string(),
    count: z.number().int().min(0)
  })),
  organizationId: z.string()
});

// Security violation schemas
export const SecurityViolationSchema = z.object({
  violationType: z.string()
    .describe("Type of security violation detected"),
  description: z.string()
    .describe("Description of the violation"),
  metadata: z.object({
    organizationId: z.string().optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    requestedOrganization: z.string().optional(),
    violatingLogs: z.number().optional(),
    filteredLogs: z.number().optional(),
    violations: z.array(z.any()).optional()
  }).describe("Additional violation context")
});

// Export all schemas for use in API routes and stores
export {
  AuditLogBaseSchema,
  ProfileAuditSchema,
  BillingAuditSchema,
  DocumentAuditSchema,
  APIKeyAuditSchema,
  OpportunityAuditSchema,
  AIAuditSchema,
  ComplianceReportAuditSchema,
  AuditLogQuerySchema,
  TenantIsolationValidationSchema,
  AuditStatsQuerySchema,
  AuditStatsResponseSchema,
  SecurityViolationSchema
};

// Type exports for TypeScript interfaces
export type AuditLogBase = z.infer<typeof AuditLogBaseSchema>;
export type ProfileAudit = z.infer<typeof ProfileAuditSchema>;
export type BillingAudit = z.infer<typeof BillingAuditSchema>;
export type DocumentAudit = z.infer<typeof DocumentAuditSchema>;
export type APIKeyAudit = z.infer<typeof APIKeyAuditSchema>;
export type OpportunityAudit = z.infer<typeof OpportunityAuditSchema>;
export type AIAudit = z.infer<typeof AIAuditSchema>;
export type ComplianceReportAudit = z.infer<typeof ComplianceReportAuditSchema>;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
export type TenantIsolationValidation = z.infer<typeof TenantIsolationValidationSchema>;
export type AuditStatsQuery = z.infer<typeof AuditStatsQuerySchema>;
export type AuditStatsResponse = z.infer<typeof AuditStatsResponseSchema>;
export type SecurityViolation = z.infer<typeof SecurityViolationSchema>;