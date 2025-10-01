// Main audit logging exports
export { auditLogger } from './audit-logger';
export { AuditQueryService } from './query-service';
export { auditMiddleware } from './middleware';

// Decorators
export {
  AuditLog,
  AuditUserAction,
  AuditDataAccess,
  AuditSecurityEvent,
  AuditCriticalOperation,
} from './decorators';

// React hooks
export {
  useAuditLog,
  usePageViewTracking,
  useFormAudit,
  useErrorBoundaryAudit,
} from './hooks';

// Types from Prisma
export {
  AuditEventType,
  AuditCategory,
  AuditSeverity,
} from '@prisma/client';

// Re-export examples for reference
export * as AuditExamples from './examples';