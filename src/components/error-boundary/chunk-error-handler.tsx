'use client'

import { useEffect } from 'react'

export function ChunkErrorHandler() {
  useEffect(() => {
    // Handle chunk loading errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error || event.message

      // Check if it's a chunk loading error
      if (
        error &&
        (error.toString().includes('Loading chunk') ||
          error.toString().includes('Failed to fetch dynamically imported module') ||
          error.toString().includes('ChunkLoadError'))
      ) {
        console.warn('Chunk loading error detected, reloading page...', error)

        // Reload the page to get fresh chunks
        window.location.reload()
      }
    }

    // Listen for unhandled errors
    window.addEventListener('error', handleError)

    // Listen for unhandled promise rejections (chunk loading can also fail as promises)
    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason

      if (
        error &&
        (error.toString().includes('Loading chunk') ||
          error.toString().includes('Failed to fetch dynamically imported module') ||
          error.toString().includes('ChunkLoadError'))
      ) {
        console.warn('Chunk loading promise rejection detected, reloading page...', error)

        // Reload the page to get fresh chunks
        window.location.reload()
      }
    }

    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
