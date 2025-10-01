'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { PageSkeleton } from '@/components/ui/page-skeleton'

interface LoadingContextType {
  isPageLoading: boolean
  setPageLoading: (loading: boolean) => void
  pageLoadingVariant: 'dashboard' | 'profile' | 'opportunities' | 'settings' | 'default'
  setPageLoadingVariant: (variant: 'dashboard' | 'profile' | 'opportunities' | 'settings' | 'default') => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

interface LoadingProviderProps {
  children: React.ReactNode
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [pageLoadingVariant, setPageLoadingVariant] = useState<'dashboard' | 'profile' | 'opportunities' | 'settings' | 'default'>('default')
  const pathname = usePathname()

  // Auto-set loading variant based on route
  useEffect(() => {
    if (pathname.includes('/dashboard')) {
      setPageLoadingVariant('dashboard')
    } else if (pathname.includes('/profile')) {
      setPageLoadingVariant('profile')
    } else if (pathname.includes('/opportunities')) {
      setPageLoadingVariant('opportunities')
    } else if (pathname.includes('/settings')) {
      setPageLoadingVariant('settings')
    } else {
      setPageLoadingVariant('default')
    }
  }, [pathname])

  // Optimized loading management for fast navigation
  useEffect(() => {
    // For client-side navigation, minimize loading states
    setIsPageLoading(false)
    
    // Only show loading for actual page refreshes
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigationEntry?.type === 'reload') {
      setIsPageLoading(true)
      
      // Reduced loading time for faster perceived performance
      const timer = setTimeout(() => {
        setIsPageLoading(false)
      }, 150)

      return () => clearTimeout(timer)
    }
  }, [pathname])

  const setPageLoading = (loading: boolean) => {
    setIsPageLoading(loading)
  }

  const value = {
    isPageLoading,
    setPageLoading,
    pageLoadingVariant,
    setPageLoadingVariant
  }

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  )
}

// Hook for manual page loading control
export function usePageLoading() {
  const { isPageLoading, setPageLoading, pageLoadingVariant, setPageLoadingVariant } = useLoading()
  
  return {
    isLoading: isPageLoading,
    startLoading: () => setPageLoading(true),
    stopLoading: () => setPageLoading(false),
    variant: pageLoadingVariant,
    setVariant: setPageLoadingVariant
  }
}

// Hook for component-level loading
export function useComponentLoading(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState)
  const [error, setError] = useState<string | null>(null)

  const startLoading = () => {
    setIsLoading(true)
    setError(null)
  }

  const stopLoading = () => {
    setIsLoading(false)
  }

  const setLoadingError = (errorMessage: string) => {
    setIsLoading(false)
    setError(errorMessage)
  }

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setError: setLoadingError
  }
}