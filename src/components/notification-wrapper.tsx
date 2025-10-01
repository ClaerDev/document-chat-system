'use client'

import React from 'react'
import { BadgeNotificationProvider } from '@/contexts/badge-notification-context'
import ErrorBoundary from '@/components/ui/error-boundary'

interface NotificationWrapperProps {
  children: React.ReactNode
}

export function NotificationWrapper({ children }: NotificationWrapperProps) {
  return (
    <ErrorBoundary
      onError={(error) => {
        console.warn('Badge notification system error (non-critical):', error)
        // This error won't break the app, just log it
      }}
      fallback={() => (
        // Return the children without notifications if there's an error
        <>{children}</>
      )}
    >
      <BadgeNotificationProvider>
        {children}
      </BadgeNotificationProvider>
    </ErrorBoundary>
  )
}