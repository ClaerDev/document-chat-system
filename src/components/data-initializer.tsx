import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { StoreInitializer } from './store-initializer'
import { ReactNode } from 'react'
import type { Folder, Document } from '@/types/documents'
import { getFileTypeFromMimeType } from '@/components/documents/file-type-utils'

interface DataInitializerProps {
  children: ReactNode
}

// Server-side data fetching component
export async function DataInitializer({ children }: DataInitializerProps) {
  let folders: Folder[] = []
  let documents: Document[] = []
  let userId: string | null = null

  try {
    // Handle auth more gracefully with better error handling
    let authResult
    try {
      authResult = await auth()
      userId = authResult.userId
    } catch (authError: any) {
      // This is expected on public pages - don't log as warning
      userId = null
    }
    
    if (userId) {
      // Get user's organization with minimal data
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { organizationId: true, id: true }
      })

      if (user) {
        // Lazy load data initialization - don't block page rendering
        setImmediate(async () => {
          try {
            await ensureDefaultFolders(user.organizationId, user.id)
          } catch (error) {
            console.error('Background folder creation failed:', error)
          }
        })

        // Fetch minimal data for initial render - use simplified queries
        const [dbFolders, dbDocuments] = await Promise.all([
          // Simplified folder query - no includes for faster loading
          prisma.folder.findMany({
            where: {
              organizationId: user.organizationId,
              deletedAt: null
            },
            select: {
              id: true,
              name: true,
              description: true,
              parentId: true,
              color: true,
              createdAt: true,
              updatedAt: true,
              isSystemFolder: true,
              organizationId: true,
              icon: true,
              level: true,
              folderType: true,
              isPublic: true,
              path: true,
              createdById: true
            },
            orderBy: [
              { isSystemFolder: 'desc' },
              { level: 'asc' },
              { name: 'asc' }
            ],
            take: 50 // Limit initial load
          }),
          
          // Simplified document query - no includes for faster loading  
          prisma.document.findMany({
            where: {
              organizationId: user.organizationId,
              deletedAt: null
            },
            select: {
              id: true,
              name: true,
              folderId: true,
              mimeType: true,
              size: true,
              filePath: true,
              createdAt: true,
              lastModified: true,
              uploadedById: true,
              uploadDate: true,
              description: true,
              documentType: true,
              workflowStatus: true,
              securityClassification: true,
              tags: true,
              setAsideType: true,
              naicsCodes: true,
              organizationId: true
            },
            orderBy: [
              { createdAt: 'desc' }
            ],
            take: 100 // Limit initial load
          })
        ])

        // Transform folders to frontend format - minimal processing
        folders = dbFolders.map(folder => ({
          id: folder.id,
          name: folder.name,
          description: folder.description || '',
          parentId: folder.parentId,
          color: folder.color || '#6b7280',
          createdAt: folder.createdAt.toISOString(),
          updatedAt: folder.updatedAt.toISOString(),
          isProtected: folder.isSystemFolder,
          organizationId: folder.organizationId,
          icon: folder.icon,
          level: folder.level,
          folderType: folder.folderType,
          isSystemFolder: folder.isSystemFolder,
          isPublic: folder.isPublic,
          path: folder.path,
          documentCount: 0, // Calculate lazily
          childrenCount: 0, // Calculate lazily
          createdBy: null, // Load lazily when needed
          parent: null // Load lazily when needed
        }))

        // Minimal document mapping for fast initial load
        documents = dbDocuments.map(doc => ({
          id: doc.id,
          name: doc.name,
          folderId: doc.folderId,
          type: getFileTypeFromMimeType(doc.mimeType, doc.name),
          size: doc.size, // Keep raw size - let UI components format it
          mimeType: doc.mimeType,
          filePath: doc.filePath,
          uploadDate: doc.createdAt.toISOString(),
          lastModified: doc.lastModified.toISOString(),
          updatedBy: 'Loading...', // Load user details lazily
          isEditable: false,
          
          // Core fields only
          uploadedById: doc.uploadedById,
          status: doc.workflowStatus || 'DRAFT',
          title: doc.name, // Use name as title since title field doesn't exist
          description: doc.description,
          documentType: doc.documentType,
          workflowStatus: doc.workflowStatus,
          securityClassification: doc.securityClassification,
          tags: doc.tags || [],
          setAsideType: doc.setAsideType,
          naicsCodes: doc.naicsCodes || [],
          
          // Minimal JSON fields - no complex processing
          processing: { status: 'PENDING', startedAt: null, completedAt: null, error: null },
          analysis: {},
          content: {},
          embeddings: {},
          entities: {},
          sharing: {},
          revisions: {},

          organizationId: doc.organizationId
        }))
      } else {
        console.log('❌ User not found in database for clerkId:', userId)
      }
    } else {
      // Only log this in development - it's expected behavior on public pages
      if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ No authenticated user - providing empty data for public/unauthenticated usage')
      }
    }
  } catch (error) {
    console.error('Error fetching initial data:', error)
    // Continue with empty arrays to prevent app from breaking
  }

  // Minimal logging for performance
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 DataInitializer:', {
      folders: folders.length,
      documents: documents.length,
      hasUser: !!userId
    })
  }

  return (
    <StoreInitializer initialData={{ folders, documents }}>
      {children}
    </StoreInitializer>
  )
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Helper function to safely transform document entities with proper type checking
function transformDocumentEntities(entities: any): Array<{
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'misc';
  confidence: number;
  startOffset: number;
  endOffset: number;
}> {
  // Handle null/undefined
  if (!entities) {
    return []
  }

  // Handle different possible structures
  let entitiesArray: any[] = []
  
  if (Array.isArray(entities)) {
    // Direct array (legacy structure)
    entitiesArray = entities
  } else if (entities.entities && Array.isArray(entities.entities)) {
    // Nested structure (current DocumentEntities interface)
    entitiesArray = entities.entities
  } else {
    // Unknown structure, return empty array
    console.warn('Unknown entities structure:', typeof entities, entities)
    return []
  }

  // Transform the array with safe property access
  return entitiesArray.map((entity: any) => ({
    text: entity?.text || '',
    type: (entity?.type?.toLowerCase() || 'misc') as 'person' | 'organization' | 'location' | 'date' | 'money' | 'misc',
    confidence: entity?.confidence || 0,
    startOffset: entity?.startOffset || 0,
    endOffset: entity?.endOffset || 0
  }))
}


// Transformation layer removed - using direct field mapping with enum.toLowerCase()

// Helper function to ensure default folders exist
async function ensureDefaultFolders(organizationId: string, userId: string) {
  const defaultFolders = [
    {
      name: 'Active Proposals',
      description: 'Currently active government contract proposals',
      color: '#3b82f6',
      folderType: 'PROPOSALS',
      icon: 'file-text'
    },
    {
      name: 'Compliance Documents', 
      description: 'Security and compliance documentation',
      color: '#f59e0b',
      folderType: 'CERTIFICATIONS',
      icon: 'shield'
    },
    {
      name: 'Contract Templates',
      description: 'Reusable contract and proposal templates', 
      color: '#10b981',
      folderType: 'OTHER',
      icon: 'template'
    }
  ]

  for (const folderData of defaultFolders) {
    try {
      // Check if folder already exists
      const existingFolder = await prisma.folder.findFirst({
        where: {
          organizationId,
          name: folderData.name,
          isSystemFolder: true,
          deletedAt: null
        }
      })

      if (!existingFolder) {
        await prisma.folder.create({
          data: {
            ...folderData,
            organizationId,
            createdById: userId,
            parentId: null,
            level: 0,
            path: [],
            isSystemFolder: true,
            isPublic: false
          }
        })
      }
    } catch (error) {
      console.error(`Error creating default folder ${folderData.name}:`, error)
      // Continue with other folders if one fails
    }
  }
}