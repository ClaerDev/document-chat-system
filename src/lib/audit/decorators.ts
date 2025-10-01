import { auditLogger } from './audit-logger';
import { AuditEventType, AuditCategory, AuditSeverity } from '@prisma/client';

// Decorator for automatic audit logging of class methods
export function AuditLog(
  eventType: AuditEventType,
  options: {
    category?: AuditCategory;
    severity?: AuditSeverity;
    description?: string;
    resourceType?: string;
    includeArgs?: boolean;
    includeResult?: boolean;
  } = {}
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let result: any;
      let error: any;

      try {
        result = await originalMethod.apply(this, args);
        return result;
      } catch (err) {
        error = err;
        throw err;
      } finally {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const metadata: Record<string, any> = {
          method: propertyKey,
          className: target.constructor.name,
          duration,
        };

        if (options.includeArgs) {
          metadata.arguments = args;
        }

        if (options.includeResult && result) {
          metadata.result = result;
        }

        if (error) {
          metadata.error = {
            message: error.message,
            stack: error.stack,
            name: error.name,
          };
        }

        const description = options.description || 
          `${target.constructor.name}.${propertyKey} ${error ? 'failed' : 'executed'}`;

        const severity = error ? AuditSeverity.ERROR : (options.severity || AuditSeverity.INFO);

        await auditLogger.log({
          eventType,
          category: options.category || AuditCategory.SYSTEM_ADMINISTRATION,
          severity,
          description,
          resourceType: options.resourceType,
          metadata,
        });
      }
    };

    return descriptor;
  };
}

// Specific decorators for common use cases
export function AuditUserAction(eventType: AuditEventType, resourceType?: string) {
  return AuditLog(eventType, {
    category: AuditCategory.USER_MANAGEMENT,
    severity: AuditSeverity.INFO,
    resourceType,
  });
}

export function AuditDataAccess(eventType: AuditEventType, resourceType?: string) {
  return AuditLog(eventType, {
    category: AuditCategory.DATA_ACCESS,
    severity: AuditSeverity.INFO,
    resourceType,
    includeArgs: true,
  });
}

export function AuditSecurityEvent(eventType: AuditEventType) {
  return AuditLog(eventType, {
    category: AuditCategory.SECURITY,
    severity: AuditSeverity.WARNING,
    includeArgs: true,
  });
}

export function AuditCriticalOperation(eventType: AuditEventType, resourceType?: string) {
  return AuditLog(eventType, {
    category: AuditCategory.USER_MANAGEMENT,
    severity: AuditSeverity.WARNING,
    resourceType,
    includeArgs: true,
    includeResult: true,
  });
}