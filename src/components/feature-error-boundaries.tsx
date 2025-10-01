'use client'

import React from 'react'
import { GlobalErrorBoundary, ErrorFallbackProps } from '@/components/error-boundary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  AlertTriangle, 
  Brain, 
  FileText, 
  Database, 
  Search,
  CreditCard,
  Bell,
  Users,
  Settings,
  BarChart3
} from 'lucide-react'

/**
 * AI Components Error Boundary
 * 
 * Specialized error boundary for AI-related components like:
 * - LLM requests and responses
 * - Document processing
 * - Match score calculations
 * - AI-powered search and filtering
 */
export function AIErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary
      level="section"
      feature="AI Services"
      enableRetry={true}
      maxRetries={2}
      fallback={AIErrorFallback}
      onError={(error, errorInfo, errorId) => {
        // Custom AI error handling
        console.error('AI Service Error:', {
          error: error.message,
          errorId,
          timestamp: new Date().toISOString(),
          service: 'ai',
        })

        // Track AI-specific error metrics
        // TODO: Integrate with AI service monitoring
      }}
    >
      {children}
    </GlobalErrorBoundary>
  )
}

function AIErrorFallback({ error, resetError, retryCount, maxRetries, errorId }: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries
  const isLLMTimeout = error?.message?.includes('timeout') || error?.message?.includes('ECONNRESET')
  const isQuotaExceeded = error?.message?.includes('quota') || error?.message?.includes('rate limit')

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Brain className="h-5 w-5" />
          AI Service Temporarily Unavailable
        </CardTitle>
        <CardDescription className="text-blue-700">
          Our AI services are experiencing issues. This is usually temporary.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-100">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">What happened?</AlertTitle>
          <AlertDescription className="text-blue-700">
            {isLLMTimeout && (
              <div>
                <p>The AI request took too long to complete. This can happen during high demand periods.</p>
                <p className="mt-1 text-sm">• Try again in a few moments</p>
                <p className="text-sm">• Consider simplifying your request</p>
              </div>
            )}
            {isQuotaExceeded && (
              <div>
                <p>AI service quota has been exceeded for this period.</p>
                <p className="mt-1 text-sm">• Quota resets hourly</p>
                <p className="text-sm">• Consider upgrading your plan for higher limits</p>
              </div>
            )}
            {!isLLMTimeout && !isQuotaExceeded && (
              <p>The AI service encountered an unexpected error. Our team has been notified.</p>
            )}
          </AlertDescription>
        </Alert>

        <div className="flex space-x-2">
          {canRetry && (
            <Button onClick={resetError} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>

        <div className="text-xs text-blue-600 font-mono">
          AI Error ID: {errorId}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Form Error Boundary
 * 
 * Specialized for form-related components:
 * - User registration and profile forms
 * - Opportunity search forms
 * - Settings and configuration forms
 * - File upload forms
 */
export function FormErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary
      level="section"
      feature="Forms"
      enableRetry={true}
      maxRetries={3}
      fallback={FormErrorFallback}
      onError={(error, errorInfo, errorId) => {
        console.error('Form Error:', {
          error: error.message,
          errorId,
          formData: null, // Could capture form state here
        })
      }}
    >
      {children}
    </GlobalErrorBoundary>
  )
}

function FormErrorFallback({ error, resetError, retryCount, maxRetries }: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries
  const isValidationError = error?.message?.includes('validation') || error?.message?.includes('required')

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <FileText className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">Form Error</AlertTitle>
      <AlertDescription className="text-orange-700">
        <div className="space-y-3">
          {isValidationError ? (
            <p>There was a validation error with your form submission. Please check your inputs and try again.</p>
          ) : (
            <p>The form encountered an unexpected error. Your data has been preserved.</p>
          )}
          
          {canRetry && (
            <Button 
              onClick={resetError} 
              size="sm"
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Restore Form
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Data Loading Error Boundary
 * 
 * For components that fetch and display data:
 * - API data fetching
 * - Database queries
 * - Cache operations
 * - Real-time data streams
 */
export function DataLoadingErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary
      level="component"
      feature="Data Loading"
      enableRetry={true}
      maxRetries={3}
      fallback={DataLoadingErrorFallback}
      onError={(error, errorInfo, errorId) => {
        console.error('Data Loading Error:', {
          error: error.message,
          errorId,
          url: window.location.href,
        })
      }}
    >
      {children}
    </GlobalErrorBoundary>
  )
}

function DataLoadingErrorFallback({ error, resetError, retryCount, maxRetries }: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries
  const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('network')

  return (
    <Alert className="border-red-200 bg-red-50">
      <Database className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800">Data Loading Failed</AlertTitle>
      <AlertDescription className="text-red-700">
        <div className="space-y-3">
          {isNetworkError ? (
            <p>Unable to connect to the server. Please check your internet connection.</p>
          ) : (
            <p>Failed to load data. This might be a temporary issue.</p>
          )}
          
          {canRetry && (
            <Button 
              onClick={resetError} 
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry Loading
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Search Error Boundary
 * 
 * For search-related components:
 * - Opportunity search
 * - Profile matching
 * - Advanced filtering
 * - Search suggestions
 */
export function SearchErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary
      level="section"
      feature="Search"
      enableRetry={true}
      maxRetries={2}
      fallback={SearchErrorFallback}
    >
      {children}
    </GlobalErrorBoundary>
  )
}

function SearchErrorFallback({ error, resetError, retryCount, maxRetries }: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Search className="h-5 w-5" />
          Search Temporarily Unavailable
        </CardTitle>
        <CardDescription className="text-yellow-700">
          The search service is experiencing issues. Please try again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canRetry && (
          <Button 
            onClick={resetError} 
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Search
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Billing Error Boundary
 * 
 * For billing and subscription components:
 * - Payment processing
 * - Subscription management
 * - Usage tracking
 * - Invoice generation
 */
export function BillingErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary
      level="section"
      feature="Billing"
      enableRetry={true}
      maxRetries={1} // Be more careful with billing operations
      fallback={BillingErrorFallback}
      onError={(error, errorInfo, errorId) => {
        // High priority for billing errors
        console.error('BILLING ERROR:', {
          error: error.message,
          errorId,
          priority: 'HIGH',
          requiresAttention: true,
        })
      }}
    >
      {children}
    </GlobalErrorBoundary>
  )
}

function BillingErrorFallback({ error, resetError, retryCount, maxRetries }: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries

  return (
    <Card className="border-red-300 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <CreditCard className="h-5 w-5" />
          Billing Service Error
        </CardTitle>
        <CardDescription className="text-red-700">
          We encountered an issue with the billing system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-200 bg-red-100">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>Important:</strong> If you were making a payment, please check your account before retrying. 
            No charges have been processed if you see this error.
          </AlertDescription>
        </Alert>

        <div className="flex space-x-2">
          {canRetry && (
            <Button onClick={resetError} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('/support', '_blank')}
          >
            Contact Support
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Notification Error Boundary
 * 
 * For notification-related components:
 * - Real-time notifications
 * - Email preferences
 * - Push notifications
 * - Notification history
 */
export function NotificationErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary
      level="component"
      feature="Notifications"
      enableRetry={true}
      maxRetries={2}
      fallback={NotificationErrorFallback}
    >
      {children}
    </GlobalErrorBoundary>
  )
}

function NotificationErrorFallback({ error, resetError, retryCount, maxRetries }: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Bell className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800">Notifications Unavailable</AlertTitle>
      <AlertDescription className="text-blue-700">
        <div className="space-y-2">
          <p>Unable to load notifications. You may have missed some updates.</p>
          {canRetry && (
            <Button 
              onClick={resetError} 
              size="sm"
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Reload Notifications
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Team Management Error Boundary
 * 
 * For team and organization management:
 * - User management
 * - Role assignments
 * - Organization settings
 * - Team collaboration features
 */
export function TeamErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary
      level="section"
      feature="Team Management"
      enableRetry={true}
      maxRetries={2}
      fallback={TeamErrorFallback}
    >
      {children}
    </GlobalErrorBoundary>
  )
}

function TeamErrorFallback({ error, resetError, retryCount, maxRetries }: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-800">
          <Users className="h-5 w-5" />
          Team Management Error
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-purple-700 mb-4">
          Unable to load team management features. Your team data is safe.
        </p>
        {canRetry && (
          <Button 
            onClick={resetError} 
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Settings Error Boundary
 * 
 * For settings and configuration:
 * - User preferences
 * - System configuration
 * - Integration settings
 * - Security settings
 */
export function SettingsErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary
      level="section"
      feature="Settings"
      enableRetry={true}
      maxRetries={2}
      fallback={SettingsErrorFallback}
    >
      {children}
    </GlobalErrorBoundary>
  )
}

function SettingsErrorFallback({ error, resetError, retryCount, maxRetries }: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries

  return (
    <Alert className="border-gray-200 bg-gray-50">
      <Settings className="h-4 w-4 text-gray-600" />
      <AlertTitle className="text-gray-800">Settings Unavailable</AlertTitle>
      <AlertDescription className="text-gray-700">
        <div className="space-y-2">
          <p>Unable to load settings. Your current settings are preserved.</p>
          {canRetry && (
            <Button 
              onClick={resetError} 
              size="sm"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Reload Settings
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Analytics Error Boundary
 * 
 * For analytics and reporting:
 * - Dashboard charts
 * - Performance metrics
 * - Usage analytics
 * - Custom reports
 */
export function AnalyticsErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary
      level="component"
      feature="Analytics"
      enableRetry={true}
      maxRetries={3}
      fallback={AnalyticsErrorFallback}
    >
      {children}
    </GlobalErrorBoundary>
  )
}

function AnalyticsErrorFallback({ error, resetError, retryCount, maxRetries }: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries

  return (
    <Card className="border-indigo-200 bg-indigo-50">
      <CardContent className="pt-6">
        <div className="text-center space-y-3">
          <BarChart3 className="h-8 w-8 text-indigo-600 mx-auto" />
          <div>
            <h3 className="font-medium text-indigo-800">Analytics Unavailable</h3>
            <p className="text-sm text-indigo-700">Unable to load chart data</p>
          </div>
          {canRetry && (
            <Button 
              onClick={resetError} 
              size="sm"
              variant="outline"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Reload Chart
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Export all error boundaries for easy use
export {
  AIErrorBoundary,
  FormErrorBoundary,
  DataLoadingErrorBoundary,
  SearchErrorBoundary,
  BillingErrorBoundary,
  NotificationErrorBoundary,
  TeamErrorBoundary,
  SettingsErrorBoundary,
  AnalyticsErrorBoundary,
}