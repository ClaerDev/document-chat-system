'use client'

/**
 * Store Initializer Component
 *
 * This component initializes the Document Chat System Zustand store with initial data.
 * Fixed to prevent infinite loops by stabilizing dependencies and using once-only initialization.
 */

import React, { useEffect, useRef, ReactNode } from 'react'
import { initializeDocumentChatStore, useDocumentChatStore } from '@/stores/document-chat-store'
import type { Folder, Document } from '@/types/documents'
import type { User, Organization } from '@/types'

interface StoreInitializerProps {
  children: ReactNode
  initialData: {
    folders?: Folder[]
    documents?: Document[]
    user?: User
    organization?: Organization
  }
}

export function StoreInitializer({ children, initialData }: StoreInitializerProps) {
  // Track initialization state to prevent multiple initializations
  const hasInitialized = useRef(false)
  const lastDataHash = useRef<string>('')
  
  // Single useEffect with stabilized logic
  useEffect(() => {
    // Create a simple hash from the data to detect real changes
    const dataHash = `${initialData.folders?.length || 0}-${initialData.documents?.length || 0}-${initialData.user?.id || ''}-${initialData.organization?.id || ''}`
    
    // Only proceed if data has actually changed or this is the first run
    if (hasInitialized.current && dataHash === lastDataHash.current) {
      return
    }
    
    console.log('🔧 [STORE INIT] Initializing store with data hash:', dataHash, {
      hasInitialData: !!initialData,
      foldersCount: initialData.folders?.length || 0,
      documentsCount: initialData.documents?.length || 0,
      userPresent: !!initialData.user,
      organizationPresent: !!initialData.organization,
      timestamp: new Date().toISOString()
    })
    
    // Only initialize if we have meaningful data
    if (initialData.folders || initialData.documents || initialData.user || initialData.organization) {
      try {
        // Get current store state
        const store = useDocumentChatStore.getState()
        const hasExistingData = store.documents.folders.length > 0 || store.documents.documents.length > 0

        // Only initialize if we don't have data or data has changed
        if (!hasExistingData || dataHash !== lastDataHash.current) {
          console.log('🚀 [STORE INIT] Initializing store...')

          // Initialize store with all available data
          initializeDocumentChatStore(initialData)
          
          console.log('✅ [STORE INIT] Store initialized successfully')
          hasInitialized.current = true
          lastDataHash.current = dataHash
        } else {
          console.log('📦 [STORE INIT] Store already has data, skipping initialization')
        }
      } catch (error) {
        console.error('❌ [STORE INIT] Error in store initialization:', error)
      }
    } else {
      console.log('⏭️ [STORE INIT] No meaningful data to initialize, skipping')
    }
  }, [
    // Only depend on the data counts and IDs, not the arrays themselves
    initialData.folders?.length,
    initialData.documents?.length, 
    initialData.user?.id,
    initialData.organization?.id
  ])

  return <>{children}</>
}