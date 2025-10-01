/**
 * TypeScript interfaces for audit logging system
 * Provides comprehensive type definitions for all audit-related operations
 */

import { AuditCategory, AuditEventType, AuditSeverity, User } from '@prisma/client';

// Base audit log interfaces
export interface BaseAuditLog {
  id: string;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  entityName?: string;
  description?: string;
  category: AuditCategory;
  eventType: AuditEventType;
  severity: AuditSeverity;
  organizationId: string;
  userId?: string | null;
  previousData?: any;
  currentData?: any;
  metadata?: Record<string, any>;
  sensitiveFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extended audit log with user information
export interface AuditLogWithUser extends BaseAuditLog {
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: string;
    organizationId: string;
  } | null;
}

// Profile-specific audit interfaces
export interface ProfileAuditData {
  companyName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  uei?: string;
  cageCode?: string;
  duns?: string;
  annualRevenue?: number;
  profileCompleteness?: number;
}

export interface ProfileAuditLog extends BaseAuditLog {
  entityType: 'Profile';
  previousData?: ProfileAuditData | null;
  currentData?: ProfileAuditData | null;
  sensitiveFields?: Array<
    'primaryContactEmail' | 
    'primaryContactPhone' | 
    'annualRevenue' | 
    'duns' | 
    'cageCode' | 
    'uei'
  >;
}

// Billing/Subscription audit interfaces
export interface BillingAuditData {
  planType?: string;
  status?: string;
  amount?: number;
  currency?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
}

export interface BillingAuditMetadata {
  isFinancialOperation?: boolean;
  endpoint?: string;
  method?: string;
  organizationId?: string;
  stripeEvent?: string;
  action?: string;
  checkoutUrl?: string;
  cleanedExistingSubscriptions?: number;
}

export interface BillingAuditLog extends BaseAuditLog {
  entityType: 'Subscription' | 'Payment' | 'Invoice';
  previousData?: BillingAuditData | null;
  currentData?: BillingAuditData | null;
  metadata?: BillingAuditMetadata;
  sensitiveFields?: Array<
    'stripeCustomerId' | 
    'stripeSubscriptionId' | 
    'stripePaymentMethodId'
  >;
}

// Document audit interfaces
export interface DocumentAuditData {
  name?: string;
  type?: string;
  mimeType?: string;
  size?: number;
  securityClassification?: string;
  workflowStatus?: string;
  isConfidential?: boolean;
}

export interface DocumentAuditMetadata {
  documentType?: string;
  isConfidential?: boolean;
  fileSize?: number;
  action?: 'download' | 'share' | 'analyze' | 'upload' | 'delete';
  endpoint?: string;
  method?: string;
}

export interface DocumentAuditLog extends BaseAuditLog {
  entityType: 'Document';
  previousData?: DocumentAuditData | null;
  currentData?: DocumentAuditData | null;
  metadata?: DocumentAuditMetadata;
}

// API Key audit interfaces
export interface APIKeyAuditData {
  name?: string;
  scopes?: string[];
  isActive?: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount?: number;
  key?: '[REDACTED]';
  hashedKey?: '[REDACTED]';
}

export interface APIKeyAuditMetadata {
  isSecurityOperation?: boolean;
  securityLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action?: 'api_key_generation' | 'api_key_rotation' | 'api_key_revocation' | 'api_key_detail_access';
  isRotation?: boolean;
  endpoint?: string;
  method?: string;
  organizationId?: string;
}

export interface APIKeyAuditLog extends BaseAuditLog {
  entityType: 'APIKey';
  previousData?: APIKeyAuditData | null;
  currentData?: APIKeyAuditData | null;
  metadata?: APIKeyAuditMetadata;
}

// Opportunity lifecycle audit interfaces
export interface OpportunityAuditData {
  status?: string;
  priority?: string;
  tags?: string[];
  notes?: string;
  proposalValue?: number;
  winProbability?: number;
  competitorCount?: number;
  title?: string;
  agency?: string;
  dueDate?: Date;
}

export interface OpportunityAuditMetadata {
  actionType?: 'SAVE' | 'APPLY' | 'NOTE' | 'ASSIGN';
  lifecycleAction?: string;
  sourceSystem?: string;
  externalId?: string;
  statusChange?: {
    from: string;
    to: string;
  };
  opportunityStatusChange?: {
    from: string;
    to: string;
  };
  noteType?: string;
  isPrivate?: boolean;
  contentLength?: number;
  changedFields?: string[];
  isOwnNote?: boolean;
  endpoint?: string;
  method?: string;
}

export interface OpportunityAuditLog extends BaseAuditLog {
  entityType: 'Opportunity_SAVE' | 'Opportunity_APPLY' | 'Opportunity_NOTE' | 'Opportunity_ASSIGN';
  previousData?: OpportunityAuditData | null;
  currentData?: OpportunityAuditData | null;
  metadata?: OpportunityAuditMetadata;
}

// AI/Match Score audit interfaces
export interface AIAuditData {
  score: number;
  algorithm: string;
  confidence?: number;
  factors?: any;
  model?: string;
  provider?: string;
}

export interface AIAuditMetadata {
  algorithm: string;
  score: number;
  isAIDecision: true;
  model?: string;
  provider?: string;
  profileName?: string;
  opportunityTitle?: string;
  confidence?: number;
  factors?: any;
  endpoint?: string;
  method?: string;
}

export interface AIAuditLog extends BaseAuditLog {
  entityType: 'MatchScore';
  currentData?: AIAuditData | null;
  metadata?: AIAuditMetadata;
}

// Compliance report audit interfaces
export interface ComplianceReportAuditData {
  reportId: string;
  complianceScore: number;
  organizationId?: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
    days: number;
  };
  format: 'JSON' | 'CSV' | 'PDF';
  soc2RequirementsCompliant: number;
}

export interface ComplianceReportAuditMetadata {
  targetOrganization?: string;
  reportFormat: string;
  complianceScore: number;
  endpoint?: string;
  method?: string;
}

export interface ComplianceReportAuditLog extends BaseAuditLog {
  entityType: 'COMPLIANCE_REPORT';
  currentData?: ComplianceReportAuditData | null;
  metadata?: ComplianceReportAuditMetadata;
}

// Audit log query interfaces
export interface AuditLogQuery {
  organizationId: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  category?: AuditCategory;
  severity?: AuditSeverity;
  entityType?: string;
  userId?: string;
  operation?: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
}

export interface AuditLogResponse {
  logs: AuditLogWithUser[];
  total: number;
  organizationId: string;
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Audit statistics interfaces
export interface AuditStatsQuery {
  organizationId: string;
  timeframe?: 'day' | 'week' | 'month';
}

export interface AuditStatsResponse {
  totalLogs: number;
  categoryCounts: Record<AuditCategory, number>;
  severityCounts: Record<AuditSeverity, number>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
  topUsers: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
  organizationId: string;
}

// Tenant isolation interfaces
export interface TenantIsolationViolation {
  type: 'CROSS_TENANT_LOG' | 'MISSING_ORGANIZATION' | 'USER_ORGANIZATION_MISMATCH';
  description: string;
  count: number;
}

export interface TenantIsolationValidation {
  isValid: boolean;
  violations: TenantIsolationViolation[];
}

// Security violation interfaces
export interface SecurityViolationMetadata {
  organizationId?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requestedOrganization?: string;
  violatingLogs?: number;
  filteredLogs?: number;
  violations?: any[];
}

export interface SecurityViolation {
  violationType: string;
  description: string;
  metadata: SecurityViolationMetadata;
}

// CRUD operation data interface
export interface CRUDEventData {
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  entityName?: string;
  previousData?: any;
  currentData?: any;
  changedFields?: string[];
  metadata?: Record<string, any>;
  sensitiveFields?: string[];
  ipAddress?: string;
  userAgent?: string;
}

// Audit log store interfaces
export interface AuditLogStore {
  // State
  logs: AuditLogWithUser[];
  loading: boolean;
  error: string | null;
  total: number;
  currentQuery: AuditLogQuery | null;
  
  // Actions
  fetchLogs: (query: AuditLogQuery) => Promise<void>;
  clearLogs: () => void;
  setError: (error: string | null) => void;
  
  // Stats
  stats: AuditStatsResponse | null;
  statsLoading: boolean;
  fetchStats: (query: AuditStatsQuery) => Promise<void>;
  
  // Tenant isolation
  tenantValidation: TenantIsolationValidation | null;
  validateTenantIsolation: (organizationId: string) => Promise<void>;
}

// Export utility types
export type AuditLogType = 
  | ProfileAuditLog 
  | BillingAuditLog 
  | DocumentAuditLog 
  | APIKeyAuditLog 
  | OpportunityAuditLog 
  | AIAuditLog 
  | ComplianceReportAuditLog;

export type AuditDataType = 
  | ProfileAuditData 
  | BillingAuditData 
  | DocumentAuditData 
  | APIKeyAuditData 
  | OpportunityAuditData 
  | AIAuditData 
  | ComplianceReportAuditData;

export type AuditMetadataType = 
  | BillingAuditMetadata 
  | DocumentAuditMetadata 
  | APIKeyAuditMetadata 
  | OpportunityAuditMetadata 
  | AIAuditMetadata 
  | ComplianceReportAuditMetadata;