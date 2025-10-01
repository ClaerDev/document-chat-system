import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface ComponentLoaderProps {
  variant?: 'spinner' | 'skeleton' | 'button' | 'inline'
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
  children?: React.ReactNode
}

export function ComponentLoader({ 
  variant = 'spinner', 
  size = 'md', 
  text,
  className = '',
  children 
}: ComponentLoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }

  if (variant === 'spinner') {
    return (
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className={`animate-spin ${sizeClasses.sm}`} />
        {text && <span className="text-sm">{text}</span>}
      </div>
    )
  }

  if (variant === 'button') {
    return (
      <Button disabled className={className}>
        <RefreshCw className={`mr-2 ${sizeClasses.sm} animate-spin`} />
        {text || 'Loading...'}
      </Button>
    )
  }

  if (variant === 'skeleton') {
    return children || <FormSkeleton />
  }

  return null
}

// Form-specific skeleton
export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  )
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-6 w-24" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Card list skeleton
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Save indicator
export function SaveIndicator({ 
  status, 
  className = '' 
}: { 
  status: 'idle' | 'saving' | 'saved' | 'error'
  className?: string 
}) {
  if (status === 'idle') return null

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <div className="h-3 w-3 bg-green-500 rounded-full" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="h-3 w-3 bg-red-500 rounded-full" />
          <span className="text-red-600">Error saving</span>
        </>
      )}
    </div>
  )
}

// Enhanced Progressive Skeletons
export function ProgressiveTextBlock({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  // Use deterministic widths based on line index to avoid hydration mismatch
  const getLineWidth = (index: number, totalLines: number) => {
    if (index === totalLines - 1) {
      // Last line should be shorter - use a deterministic pattern
      const widthVariations = ['65%', '70%', '75%', '80%', '85%']
      return widthVariations[index % widthVariations.length]
    }
    return '100%'
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          variant="text" 
          className="skeleton-progressive opacity-0"
          animation="shimmer"
          delay={i * 100}
          width={getLineWidth(i, lines)}
        />
      ))}
    </div>
  )
}

export function ProgressiveProfileCard({ className = '' }: { className?: string }) {
  return (
    <div className={`border rounded-lg p-4 space-y-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <Skeleton variant="avatar" className="skeleton-progressive opacity-0" animation="shimmer" delay={0} />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="skeleton-progressive opacity-0 w-3/4" animation="shimmer" delay={100} />
          <Skeleton variant="line" className="skeleton-progressive opacity-0 w-1/2" animation="shimmer" delay={200} />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="skeleton-progressive opacity-0" animation="shimmer" delay={300} />
        <Skeleton variant="text" className="skeleton-progressive opacity-0 w-4/5" animation="shimmer" delay={400} />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="button" className="skeleton-progressive opacity-0" animation="shimmer" delay={500} />
        <Skeleton variant="button" className="skeleton-progressive opacity-0" animation="shimmer" delay={600} />
      </div>
    </div>
  )
}

export function ProgressiveOpportunityCard({ className = '' }: { className?: string }) {
  return (
    <div className={`border rounded-lg p-4 space-y-4 ${className}`}>
      {/* Header with title and score */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="skeleton-progressive opacity-0 h-6 w-4/5" animation="shimmer" delay={0} />
          <Skeleton variant="line" className="skeleton-progressive opacity-0 w-32" animation="shimmer" delay={100} />
        </div>
        <Skeleton className="skeleton-progressive opacity-0 h-8 w-16 rounded-full" animation="shimmer" delay={150} />
      </div>
      
      {/* Description */}
      <div className="space-y-2">
        <Skeleton variant="text" className="skeleton-progressive opacity-0" animation="shimmer" delay={200} />
        <Skeleton variant="text" className="skeleton-progressive opacity-0 w-5/6" animation="shimmer" delay={250} />
        <Skeleton variant="text" className="skeleton-progressive opacity-0 w-3/4" animation="shimmer" delay={300} />
      </div>
      
      {/* Tags and metadata */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="skeleton-progressive opacity-0 h-6 w-16 rounded-full" animation="shimmer" delay={350} />
          <Skeleton className="skeleton-progressive opacity-0 h-6 w-20 rounded-full" animation="shimmer" delay={400} />
        </div>
        <Skeleton variant="line" className="skeleton-progressive opacity-0 w-24" animation="shimmer" delay={450} />
      </div>
    </div>
  )
}

export function ProgressiveDashboardStats({ className = '' }: { className?: string }) {
  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="line" className="skeleton-progressive opacity-0 w-20" animation="shimmer" delay={i * 100} />
            <Skeleton className="skeleton-progressive opacity-0 h-4 w-4 rounded" animation="shimmer" delay={i * 100 + 50} />
          </div>
          <Skeleton className="skeleton-progressive opacity-0 h-8 w-16" animation="shimmer" delay={i * 100 + 100} />
          <Skeleton variant="line" className="skeleton-progressive opacity-0 w-24" animation="shimmer" delay={i * 100 + 150} />
        </div>
      ))}
    </div>
  )
}

export function ProgressiveNavigation({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-2">
          <Skeleton className="skeleton-progressive opacity-0 h-4 w-4 rounded" animation="shimmer" delay={i * 80} />
          <Skeleton variant="text" className="skeleton-progressive opacity-0 w-20" animation="shimmer" delay={i * 80 + 40} />
        </div>
      ))}
    </div>
  )
}

export function ProgressiveFormFields({ fields = 4, className = '' }: { fields?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="line" className="skeleton-progressive opacity-0 w-24" animation="shimmer" delay={i * 100} />
          <Skeleton className="skeleton-progressive opacity-0 h-10 w-full rounded-md" animation="shimmer" delay={i * 100 + 50} />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Skeleton variant="button" className="skeleton-progressive opacity-0" animation="shimmer" delay={fields * 100} />
        <Skeleton variant="button" className="skeleton-progressive opacity-0" animation="shimmer" delay={fields * 100 + 100} />
      </div>
    </div>
  )
}