'use client';

import { useEffect } from 'react';
import { setupGlobalImageErrorHandler } from '@/lib/utils/image-error-handler';

/**
 * Image Error Provider
 * Sets up global image error handling for the entire application
 */
export function ImageErrorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Set up global image error handling
    const cleanup = setupGlobalImageErrorHandler();
    
    // Cleanup on unmount
    return cleanup;
  }, []);

  return <>{children}</>;
}