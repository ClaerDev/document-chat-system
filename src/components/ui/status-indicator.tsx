'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, Clock, AlertCircle, XCircle, Loader2, Play } from 'lucide-react'

export interface StatusIndicatorProps {
  status: 'idle' | 'pending' | 'processing' | 'success' | 'error' | 'warning' | 'online' | 'offline' | 'maintenance'
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  text?: string
  animated?: boolean
  className?: string
}

const statusConfig = {
  idle: {
    icon: Clock,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    text: 'Idle'
  },
  pending: {
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/10',
    text: 'Pending'
  },
  processing: {
    icon: Loader2,
    color: 'text-primary',
    bg: 'bg-primary/10',
    text: 'Processing',
    spin: true
  },
  success: {
    icon: CheckCircle,
    color: 'text-match-good',
    bg: 'bg-match-good/10',
    text: 'Success'
  },
  error: {
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    text: 'Error'
  },
  warning: {
    icon: AlertCircle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    text: 'Warning'
  },
  online: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-100',
    text: 'Online'
  },
  offline: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-100',
    text: 'Offline'
  },
  maintenance: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    text: 'Maintenance'
  }
}

const sizeConfig = {
  sm: {
    icon: 'h-3 w-3',
    container: 'h-6 w-6',
    text: 'text-xs'
  },
  md: {
    icon: 'h-4 w-4',
    container: 'h-8 w-8',
    text: 'text-sm'
  },
  lg: {
    icon: 'h-5 w-5',
    container: 'h-10 w-10',
    text: 'text-base'
  }
}

export function StatusIndicator({
  status,
  size = 'md',
  showText = false,
  text,
  animated = true,
  className
}: StatusIndicatorProps) {
  const config = statusConfig[status]
  const sizes = sizeConfig[size]
  const Icon = config.icon

  const displayText = text || config.text

  if (showText) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className={cn(
            "flex items-center justify-center rounded-full",
            config.bg,
            sizes.container,
            animated && "transition-all duration-300"
          )}
        >
          <Icon
            className={cn(
              sizes.icon,
              config.color,
              config.spin && animated && "animate-spin"
            )}
          />
        </div>
        <span className={cn(sizes.text, "font-medium", config.color)}>
          {displayText}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full",
        config.bg,
        sizes.container,
        animated && "transition-all duration-300",
        className
      )}
      title={displayText}
    >
      <Icon
        className={cn(
          sizes.icon,
          config.color,
          config.spin && animated && "animate-spin"
        )}
      />
    </div>
  )
}

// Pulse indicator for real-time updates
export interface PulseIndicatorProps {
  active?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning' | 'error'
  className?: string
}

const pulseColors = {
  primary: 'bg-primary',
  success: 'bg-match-good',
  warning: 'bg-warning',
  error: 'bg-destructive'
}

const pulseSizes = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4'
}

export function PulseIndicator({
  active = true,
  size = 'md',
  color = 'primary',
  className
}: PulseIndicatorProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div
        className={cn(
          "rounded-full",
          pulseSizes[size],
          pulseColors[color],
          active && "animate-pulse"
        )}
      />
      {active && (
        <div
          className={cn(
            "absolute rounded-full animate-ping",
            pulseSizes[size],
            pulseColors[color],
            "opacity-75"
          )}
        />
      )}
    </div>
  )
}

// Loading dots animation
export interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

export function LoadingDots({
  size = 'md',
  color = 'bg-primary',
  className
}: LoadingDotsProps) {
  const dotSizes = {
    sm: 'h-1 w-1',
    md: 'h-2 w-2',
    lg: 'h-3 w-3'
  }

  const dotSize = dotSizes[size]

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div
        className={cn(
          "rounded-full animate-bounce",
          dotSize,
          color
        )}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={cn(
          "rounded-full animate-bounce",
          dotSize,
          color
        )}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={cn(
          "rounded-full animate-bounce",
          dotSize,
          color
        )}
        style={{ animationDelay: '300ms' }}
      />
    </div>
  )
}