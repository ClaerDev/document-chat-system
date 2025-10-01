# Unified Error Handling System

A comprehensive, enterprise-grade error handling system that provides centralized error management, smart routing, and automatic recovery for the GovMatch AI application.

## 🏗️ Architecture Overview

The unified error handling system consists of several key components:

### Core Components

1. **Error Configuration** (`error-config.ts`)
   - Centralized configuration management
   - Environment variable integration
   - Runtime configuration updates
   - Validation with Zod schemas

2. **Error Registry** (`error-registry.ts`)
   - Centralized error reporting and analytics
   - Error correlation and pattern detection
   - Breadcrumb tracking
   - External service integration (Sentry, etc.)

3. **Error Router** (`error-router.ts`)
   - Smart error routing based on context
   - Pluggable error handlers
   - Rule-based routing system
   - Fallback mechanisms

4. **Integration Adapter** (`integration-adapter.ts`)
   - Bridges existing error handlers
   - Backward compatibility
   - Specialized handlers for different error types

## 🚀 Quick Start

### 1. Initialize the System

In your application root (e.g., `_app.tsx` or `layout.tsx`):

```typescript
import { initializeUnifiedErrorHandling } from '@/lib/errors'

// Initialize once at application startup
initializeUnifiedErrorHandling()
```

### 2. Basic Error Reporting

```typescript
import { quickReportError } from '@/lib/errors'

// Simple error reporting
quickReportError('Something went wrong', {
  source: 'ui-component',
  feature: 'opportunity-search',
  severity: 'medium'
})
```

### 3. Use in React Components

```typescript
import { useUnifiedErrorHandling } from '@/lib/errors'

function MyComponent() {
  const { reportError, handleAsyncError, withErrorHandling } = useUnifiedErrorHandling(
    'ui-component',
    'my-feature'
  )

  const handleClick = withErrorHandling(async () => {
    // This will automatically handle errors
    await someAsyncOperation()
  })

  return <button onClick={handleClick}>Click me</button>
}
```

### 4. Scoped Error Reporting

```typescript
import { createScopedErrorReporter } from '@/lib/errors'

// Create a scoped reporter for a specific feature
const errorReporter = createScopedErrorReporter('ai-service', 'document-analysis')

// Use throughout your feature
errorReporter.reportError(error, { metadata: { documentId: '123' } })
```

## 📊 Error Configuration

### Environment Variables

```bash
# Circuit Breaker Configuration
ERROR_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
ERROR_CIRCUIT_BREAKER_RECOVERY_TIMEOUT=30000
ERROR_CIRCUIT_BREAKER_MONITORING_WINDOW=60000

# Notification Configuration
ERROR_NOTIFICATIONS_MAX_PER_MINUTE=10
ERROR_NOTIFICATIONS_COOLDOWN=300000

# Retry Configuration
ERROR_RETRY_MAX_ATTEMPTS=3
ERROR_RETRY_BASE_DELAY=1000
ERROR_RETRY_MAX_DELAY=30000

# Recovery Configuration
ERROR_RECOVERY_MAX_RETRIES=3
ERROR_RECOVERY_TIMEOUT=120000
ERROR_RECOVERY_ENABLE_AUTO=true

# Reporting Configuration
ERROR_REPORTING_TRACKING=true
ERROR_REPORTING_METRICS=true
ERROR_REPORTING_ANALYTICS=true
```

### Runtime Configuration

```typescript
import { getErrorConfig, updateErrorConfig } from '@/lib/errors'

// Get current configuration
const config = getErrorConfig()

// Update configuration at runtime
updateErrorConfig({
  retry: {
    maxAttempts: 5,
    baseDelay: 2000
  }
})
```

## 🎯 Error Sources and Contexts

The system supports the following error sources:

- `api` - REST API errors
- `ai-service` - AI provider errors (OpenAI, Anthropic, etc.)
- `ui-component` - React component errors
- `network` - Network connectivity errors
- `database` - Database/Prisma errors
- `system` - System-level errors

### Error Context

Each error includes rich context information:

```typescript
interface ErrorContext {
  source: 'api' | 'ai-service' | 'ui-component' | 'network' | 'database' | 'system'
  feature?: string              // Feature/component name
  userId?: string              // Current user ID
  organizationId?: string      // Current organization ID
  requestId?: string          // Request tracking ID
  sessionId?: string          // Session ID
  userAgent?: string          // Browser user agent
  url?: string               // Current URL
  componentStack?: string    // React component stack
  metadata?: Record<string, any> // Additional context
}
```

## 🔧 Error Handlers

### Built-in Handlers

1. **AI Service Handler** - Handles AI provider errors with fallback strategies
2. **API Handler** - Handles REST API errors with retry logic
3. **Network Handler** - Handles connectivity issues with offline detection
4. **Authentication Handler** - Handles auth errors with redirect logic
5. **UI Component Handler** - Handles React component errors
6. **Database Handler** - Handles database connection and constraint errors

### Custom Error Handlers

```typescript
import { ErrorHandler, registerErrorHandler } from '@/lib/errors'

class CustomErrorHandler implements ErrorHandler {
  name = 'custom-handler'
  priority = 50

  canHandle(error: Error, context: ErrorContext): boolean {
    return context.feature === 'my-feature'
  }

  async handle(error: EnhancedError, context: ErrorContext): Promise<ErrorHandlerResult> {
    // Custom error handling logic
    return {
      handled: true,
      shouldRetry: false,
      userMessage: 'Custom error occurred',
      actions: [
        {
          type: 'retry',
          label: 'Try Again',
          handler: async () => { /* retry logic */ },
          priority: 'high'
        }
      ]
    }
  }
}

// Register the handler
registerErrorHandler(new CustomErrorHandler())
```

## 📈 Error Analytics and Monitoring

### Error Dashboard

The system includes a comprehensive error dashboard for administrators:

```typescript
import { ErrorDashboard } from '@/components/admin/error-dashboard'

function AdminPage() {
  return <ErrorDashboard />
}
```

### Client-Facing Components

Simple status indicators for user interfaces:

```typescript
import { ErrorStatusIndicator, ErrorRecoveryButton } from '@/components/admin/error-dashboard'

function UserInterface() {
  return (
    <div>
      <ErrorStatusIndicator />
      <ErrorRecoveryButton />
    </div>
  )
}
```

### Analytics API

```typescript
import { getErrorAnalytics } from '@/lib/errors'

// Get error analytics for the last 24 hours
const analytics = getErrorAnalytics({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000),
  end: new Date()
})

console.log('Total errors:', analytics.totalErrors)
console.log('Error rate:', analytics.errorRate)
console.log('Top errors:', analytics.topErrors)
```

## 🔄 Error Recovery

### Auto-Recovery Strategies

The system includes several auto-recovery strategies:

1. **Circuit Breaker** - Prevents cascade failures
2. **Cache Refresh** - Clears corrupted cache entries
3. **Service Restart** - Restarts failed services
4. **Failover** - Switches to backup systems
5. **Retry with Backoff** - Exponential backoff retries
6. **Graceful Degradation** - Reduces functionality during issues

### Manual Recovery

```typescript
import { useErrorRecovery } from '@/contexts/global-error-context'

function RecoveryComponent() {
  const { startRecovery, recoveryState } = useErrorRecovery()

  const handleRecovery = () => {
    startRecovery(['clear-cache', 'restart-services'])
  }

  return (
    <button onClick={handleRecovery} disabled={recoveryState.isRecovering}>
      {recoveryState.isRecovering ? 'Recovering...' : 'Start Recovery'}
    </button>
  )
}
```

## 🧪 Testing Error Handling

### Error Simulation

```typescript
import { useThrowError } from '@/hooks/use-error-handler'

function TestComponent() {
  const throwError = useThrowError()

  return (
    <button onClick={() => throwError('Test error')}>
      Simulate Error
    </button>
  )
}
```

### Error Boundary Testing

```typescript
import { withErrorBoundary } from '@/components/error-boundary'

const SafeComponent = withErrorBoundary(MyComponent, {
  level: 'component',
  feature: 'test-feature',
  onError: (error, errorInfo, errorId) => {
    console.log('Error caught:', { error, errorInfo, errorId })
  }
})
```

## 🔍 Debugging and Development

### Development Mode Features

- Enhanced console logging with error grouping
- Detailed error information display
- Mock error generation for testing
- Verbose logging for troubleshooting

### Console Output

In development mode, the system provides detailed console output:

```
🚨 Error Registry - HIGH
Error: AI service rate limit exceeded
┌─────────────────┬──────────────────────────────────────┐
│ Error ID        │ err_1640995200000_abc123            │
│ Category        │ external_service                     │
│ Severity        │ high                                │
│ Source          │ ai-service                          │
│ Feature         │ document-analysis                    │
│ Timestamp       │ 2023-12-31T12:00:00.000Z           │
└─────────────────┴──────────────────────────────────────┘
```

## 🔧 Migration Guide

### From Existing Error Handlers

1. **Keep existing handlers** - The system is designed for gradual migration
2. **Use legacy wrappers** - Wrap existing code with legacy adapters
3. **Gradual integration** - Migrate one feature at a time

```typescript
import { createLegacyErrorWrapper } from '@/lib/errors'

// Wrap existing error handling
const legacyHandler = createLegacyErrorWrapper('api')

// Use in existing code
legacyHandler.handleError(error, { feature: 'my-feature' })
```

## 📚 Best Practices

### 1. Error Context

Always provide rich context when reporting errors:

```typescript
reportError(error, {
  source: 'ai-service',
  feature: 'document-analysis',
  userId: user.id,
  organizationId: org.id,
  metadata: {
    documentId: doc.id,
    provider: 'openai',
    model: 'gpt-4'
  }
})
```

### 2. User-Friendly Messages

Provide clear, actionable error messages:

```typescript
// Good
error.userMessage = 'Document analysis failed. Please try again or contact support.'

// Bad
error.userMessage = 'HTTP 503 Service Unavailable'
```

### 3. Error Boundaries

Use appropriate error boundary levels:

- **Page level** - For critical page failures
- **Section level** - For major feature failures
- **Component level** - For isolated component errors

### 4. Breadcrumbs

Add meaningful breadcrumbs for error context:

```typescript
addBreadcrumb({
  category: 'user-action',
  message: 'User clicked analyze document button',
  level: 'info',
  data: { documentId: '123', documentType: 'pdf' }
})
```

## 🔒 Security Considerations

- Error messages are sanitized in production
- Sensitive data is filtered from error reports
- User data is anonymized in analytics
- Error IDs are used for tracking without exposing details

## 📦 Dependencies

- `zod` - Configuration validation
- `@/hooks/use-error-handler` - Enhanced error types
- `@/contexts/global-error-context` - Global error state
- `@/contexts/notification-context` - User notifications

## 📄 License

This error handling system is part of the GovMatch AI application and follows the same licensing terms.