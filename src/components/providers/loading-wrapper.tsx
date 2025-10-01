'use client'

import { useLoading } from './loading-provider'
import { PageSkeleton } from '@/components/ui/page-skeleton'

interface LoadingWrapperProps {
  children: React.ReactNode
}

export function LoadingWrapper({ children }: LoadingWrapperProps) {
  const { isPageLoading, pageLoadingVariant } = useLoading()

  if (isPageLoading) {
    return <PageSkeleton variant={pageLoadingVariant} />
  }

  return <>{children}</>
} 