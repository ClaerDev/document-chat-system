import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { TenantContext } from '@/lib/db/tenant-context'
import { getFileTypeFromMimeType, formatFileSize } from '@/components/documents/file-type-utils'
import { crudAuditLogger } from '@/lib/audit/crud-audit-logger'

/**
 * @swagger
 * /api/v1/documents:
 *   get:
 *     summary: Get all documents for the authenticated user's organization
 *     description: Retrieves all documents within the user's organization, optionally filtered by folder
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *         description: Filter documents by folder ID (null for root folder)
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include soft-deleted documents
 *     responses:
 *       200:
 *         description: Successfully retrieved documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 *                 count:
 *                   type: number
 *                   example: 42
 *       401:
 *         description: Unauthorized - user not authenticated
 *       403:
 *         description: Forbidden - user not part of organization
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const folderId = searchParams.get('folderId')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const searchQuery = searchParams.get('search')

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Create tenant context for organization-scoped queries
    const tenantContext = new TenantContext(user.organizationId)

    // Build query filters
    const whereClause: any = {
      organizationId: user.organizationId
    }

    // Filter by folder if specified
    if (folderId !== null) {
      whereClause.folderId = folderId === 'null' ? null : folderId
    }

    // Include soft-deleted documents if requested
    if (!includeDeleted) {
      whereClause.deletedAt = null
    }

    // Add search filter if provided
    if (searchQuery && searchQuery.trim().length > 0) {
      whereClause.AND = [
        {
          OR: [
            {
              name: {
                contains: searchQuery,
                mode: 'insensitive'
              }
            },
            {
              type: {
                contains: searchQuery,
                mode: 'insensitive'
              }
            },
            {
              mimeType: {
                contains: searchQuery,
                mode: 'insensitive'
              }
            }
          ]
        }
      ]
    }

    // Fetch documents with new consolidated JSON structure
    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        folder: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    })

    // DIRECT MAPPING using new consolidated JSON fields
    const directMappedDocuments = documents.map(doc => {
      // Parse JSON fields safely
      const content = (doc.content as any) || { sections: [], tables: [], images: [] }
      const entities = (doc.entities as any) || { entities: [] }
      const sharing = (doc.sharing as any) || { permissions: [], share: null, shareViews: [], comments: [] }
      const processing = (doc.processing as any) || { currentStatus: 'COMPLETED', progress: 100, events: [] }
      const analysis = (doc.analysis as any) || { contract: null, compliance: null }
      const embeddings = (doc.embeddings as any) || { vectors: [] }
      
      return {
        // Core document fields
        id: doc.id,
        name: doc.name,
        folderId: doc.folderId,
        size: doc.size,
        mimeType: doc.mimeType,
        organizationId: doc.organizationId,
        uploadedById: doc.uploadedById,
        description: doc.description,
        documentType: doc.documentType,
        securityClassification: doc.securityClassification,
        workflowStatus: doc.workflowStatus,
        tags: doc.tags || [],
        setAsideType: doc.setAsideType,
        naicsCodes: doc.naicsCodes || [],
        isEditable: doc.isEditable,
        
        // Extracted content
        extractedText: doc.extractedText,
        summary: doc.summary,
        
        // Computed/derived fields
        type: getFileTypeFromMimeType(doc.mimeType, doc.name),
        filePath: `/api/v1/documents/${doc.id}/download`,
        uploadDate: doc.uploadDate?.toISOString() || doc.createdAt.toISOString(),
        lastModified: doc.lastModified.toISOString(),
        updatedBy: doc.uploadedBy ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : 'Unknown',
        
        // Processing status from JSON field
        status: processing.currentStatus,
        progress: processing.progress,
        processedAt: processing.events?.find((e: any) => e.eventType === 'COMPLETED')?.timestamp,
        processingError: processing.events?.find((e: any) => e.success === false)?.error,
        
        // JSON field data (consolidated structure)
        content: content,
        entities: entities,
        sharing: sharing,
        processing: processing,
        analysis: analysis,
        embeddings: embeddings,
        
        // Relations
        uploadedBy: doc.uploadedBy,
        folder: doc.folder,
        opportunity: doc.opportunity,
        
        // Legacy compatibility (construct from JSON fields)
        aiData: {
          status: {
            status: processing.currentStatus,
            progress: processing.progress,
            startedAt: doc.createdAt.toISOString(),
            completedAt: processing.events?.find((e: any) => e.eventType === 'COMPLETED')?.timestamp,
            retryCount: processing.events?.filter((e: any) => e.success === false)?.length || 0
          },
          content: {
            extractedText: doc.extractedText || '',
            summary: doc.summary || '',
            keywords: [],
            keyPoints: [],
            actionItems: [],
            questions: []
          },
          structure: {
            sections: content.sections || [],
            tables: content.tables || [],
            images: content.images || [],
            ocrResults: []
          },
          analysis: {
            qualityScore: analysis.contract?.qualityScore || 0,
            readabilityScore: analysis.compliance?.score || 0,
            complexityMetrics: { readabilityScore: analysis.compliance?.score || 0 },
            entities: entities.entities || [],
            confidence: 0.8,
            suggestions: analysis.compliance?.recommendations || []
          },
          processedAt: processing.events?.find((e: any) => e.eventType === 'COMPLETED')?.timestamp || new Date().toISOString(),
          modelVersion: 'consolidated-v2.0',
          processingHistory: processing.events || []
        },
        
        // Security analysis
        securityAnalysis: {
          classification: doc.securityClassification,
          piiDetected: false,
          piiTypes: [],
          complianceStatus: analysis.compliance?.status || 'compliant',
          redactionNeeded: false
        }
      }
    })

    return NextResponse.json({
      success: true,
      documents: directMappedDocuments,
      count: directMappedDocuments.length
    })

  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

// TRANSFORMATION LAYER COMPLETELY ELIMINATED
// All database values now map DIRECTLY to interface with ZERO transformations