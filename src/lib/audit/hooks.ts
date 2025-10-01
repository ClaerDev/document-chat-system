import { useEffect, useCallback } from 'react';
import { auditLogger } from './audit-logger';
import { AuditEventType, AuditCategory, AuditSeverity } from '@prisma/client';

// React hook for component-level audit logging
export function useAuditLog() {
  const logUserInteraction = useCallback(
    async (
      eventType: AuditEventType,
      description: string,
      metadata?: Record<string, any>
    ) => {
      await auditLogger.log({
        eventType,
        category: AuditCategory.USER_MANAGEMENT,
        severity: AuditSeverity.INFO,
        description,
        metadata: {
          ...metadata,
          component: 'client',
          timestamp: new Date().toISOString(),
        },
      });
    },
    []
  );

  const logPageView = useCallback(
    async (page: string, metadata?: Record<string, any>) => {
      await auditLogger.logUserAction(
        AuditEventType.PAGE_VIEW,
        page,
        'page',
        `User viewed ${page}`,
        {
          ...metadata,
          page,
          referrer: document.referrer,
          url: window.location.href,
        }
      );
    },
    []
  );

  const logFormSubmission = useCallback(
    async (formName: string, formData?: Record<string, any>) => {
      await auditLogger.logUserAction(
        AuditEventType.FORM_SUBMIT,
        formName,
        'form',
        `User submitted ${formName} form`,
        {
          formName,
          formData: formData ? Object.keys(formData) : undefined, // Don't log actual data
          url: window.location.href,
        }
      );
    },
    []
  );

  const logError = useCallback(
    async (error: Error, context?: Record<string, any>) => {
      await auditLogger.log({
        eventType: AuditEventType.ERROR,
        category: AuditCategory.SYSTEM_ADMINISTRATION,
        severity: AuditSeverity.ERROR,
        description: `Client error: ${error.message}`,
        metadata: {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          url: window.location.href,
          userAgent: navigator.userAgent,
          ...context,
        },
      });
    },
    []
  );

  return {
    logUserInteraction,
    logPageView,
    logFormSubmission,
    logError,
  };
}

// Hook for tracking page views automatically
export function usePageViewTracking(pageName: string, metadata?: Record<string, any>) {
  const { logPageView } = useAuditLog();

  useEffect(() => {
    logPageView(pageName, metadata);
  }, [pageName, logPageView, metadata]);
}

// Hook for tracking form interactions
export function useFormAudit(formName: string) {
  const { logFormSubmission, logUserInteraction } = useAuditLog();

  const logFieldChange = useCallback(
    async (fieldName: string, newValue?: any) => {
      await logUserInteraction(
        AuditEventType.FORM_FIELD_CHANGE,
        `User changed ${fieldName} in ${formName}`,
        {
          formName,
          fieldName,
          hasValue: newValue !== undefined && newValue !== null && newValue !== '',
        }
      );
    },
    [formName, logUserInteraction]
  );

  const logSubmit = useCallback(
    async (formData?: Record<string, any>) => {
      await logFormSubmission(formName, formData);
    },
    [formName, logFormSubmission]
  );

  const logValidationError = useCallback(
    async (fieldName: string, errorMessage: string) => {
      await logUserInteraction(
        AuditEventType.VALIDATION_ERROR,
        `Validation error in ${formName}.${fieldName}: ${errorMessage}`,
        {
          formName,
          fieldName,
          errorMessage,
        }
      );
    },
    [formName, logUserInteraction]
  );

  return {
    logFieldChange,
    logSubmit,
    logValidationError,
  };
}

// Hook for error boundary logging
export function useErrorBoundaryAudit() {
  const { logError } = useAuditLog();

  const logComponentError = useCallback(
    async (error: Error, errorInfo: { componentStack: string }) => {
      await logError(error, {
        type: 'component_error',
        componentStack: errorInfo.componentStack,
      });
    },
    [logError]
  );

  return { logComponentError };
}