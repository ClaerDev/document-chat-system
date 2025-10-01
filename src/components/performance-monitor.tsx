'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PerformanceMonitor() {
  const pathname = usePathname()

  useEffect(() => {
    // Track navigation performance
    const startTime = performance.now()
    
    // Wait for next frame to measure navigation complete
    requestAnimationFrame(() => {
      const endTime = performance.now()
      const navigationTime = endTime - startTime
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Navigation to ${pathname}: ${navigationTime.toFixed(2)}ms`)
        
        // Track if navigation is slow
        if (navigationTime > 100) {
          console.warn(`⚠️ Slow navigation detected: ${navigationTime.toFixed(2)}ms`)
        }
      }
    })
  }, [pathname])

  return null
}