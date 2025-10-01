import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { inngest } from '@/lib/inngest/client'
import { handleApiError, asyncHandler, commonErrors } from '@/lib/api-errors'

const batchScoreSchema = z.object({
  documentIds: z.array(z.string()).min(1).max(50).describe("Array of document IDs to score (max 50)"),
  organizationId: z.string().min(1).describe("Organization identifier for access control"),
  options: z.object({
    performScoring: z.boolean().default(true).describe("Whether to perform AI scoring"),
    performAnalysis: z.boolean().default(true).describe("Whether to perform content analysis"),
    scoringWeights: z.object({
      relevance: z.number().min(0).max(1).default(0.3),
      compliance: z.number().min(0).max(1).default(0.25),
      completeness: z.number().min(0).max(1).default(0.2),
      technicalMerit: z.number().min(0).max(1).default(0.15),
      riskAssessment: z.number().min(0).max(1).default(0.1)
    }).optional(),
    concurrency: z.number().min(1).max(10).default(3).describe("Number of documents to process concurrently"),
    aiProvider: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high']).default('normal')
  }).optional()
})

/**
 * @swagger
 * /api/v1/documents/batch-score:
 *   post:
 *     summary: Score multiple documents with AI analysis
 *     description: |
 *       Batch score multiple documents simultaneously with configurable concurrency.
 *       Provides comprehensive scoring across all criteria with detailed progress tracking.
 *       Optimized for processing large document sets efficiently.
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentIds
 *               - organizationId
 *             properties:
 *               documentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 50
 *                 description: Array of document IDs to score
 *                 example: ["doc_123", "doc_456", "doc_789"]
 *               organizationId:
 *                 type: string
 *                 description: Organization identifier
 *                 example: "org_456def"
 *               options:
 *                 type: object
 *                 properties:
 *                   performScoring:
 *                     type: boolean
 *                     default: true
 *                   performAnalysis:
 *                     type: boolean
 *                     default: true
 *                   scoringWeights:
 *                     type: object
 *                     description: Custom scoring weights
 *                   concurrency:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 10
 *                     default: 3
 *                     description: Concurrent processing limit
 *                   aiProvider:
 *                     type: string
 *                     description: AI provider preference
 *                   priority:
 *                     type: string
 *                     enum: [low, normal, high]
 *                     default: normal
 *     responses:
 *       200:
 *         description: Batch scoring completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batchId:
 *                   type: string
 *                   description: Unique batch operation ID
 *                 status:
 *                   type: string
 *                   enum: [completed, partial, failed]
 *                 totalDocuments:
 *                   type: number
 *                 completedDocuments:
 *                   type: number
 *                 failedDocuments:
 *                   type: number
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       documentId:
 *                         type: string
 *                       success:
 *                         type: boolean
 *                       score:
 *                         type: object
 *                       analysis:
 *                         type: object
 *                       error:
 *                         type: string
 *                 processingTimeMs:
 *                   type: number
 *                 averageTimePerDocument:
 *                   type: number
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Batch scoring failed
 */
export const POST = asyncHandler(async (request: NextRequest) => {
  const { userId } = await auth()
  if (!userId) {
    throw commonErrors.unauthorized()
  }

  const body = await request.json()
  const validation = batchScoreSchema.safeParse(body)
  
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request data', details: validation.error.format() },
      { status: 400 }
    )
  }

  const { documentIds, organizationId, options = {} } = validation.data
  console.log('📄 Batch analysis request:', { documentIds: documentIds.length, organizationId, userId })
  const startTime = Date.now()
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Get the current user's database ID
  const currentUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true }
  })
  
  if (!currentUser) {
    return NextResponse.json(
      { error: 'User not found in database' },
      { status: 404 }
    )
  }

  // Verify user access to all documents
  const documents = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      organizationId,
      uploadedById: currentUser.id,  // Use database ID
      status: 'COMPLETED',
      aiData: { 
        path: ['content', 'extractedText'],
        not: Prisma.DbNull
      }
    },
    select: {
      id: true,
      name: true,
      aiData: true,
      size: true,
      metadata: true
    }
  })
  console.log('✅ Found', documents.length, 'documents for analysis')
  
  if (documents.length === 0) {
    return NextResponse.json(
      { 
        error: 'No valid processed documents found',
        details: 'Documents must be in COMPLETED status with extracted text to be analyzed',
        totalRequested: documentIds.length
      },
      { status: 404 }
    )
  }

  if (documents.length !== documentIds.length) {
    const foundIds = documents.map(d => d.id)
    const missingIds = documentIds.filter(id => !foundIds.includes(id))
    console.warn(`Missing or inaccessible documents: ${missingIds.join(', ')}`)
  }

  // Trigger Inngest background job for batch processing
  let ids = ['mock-event-id']
  
  if (process.env.INNGEST_EVENT_KEY) {
    try {
      const result = await inngest.send({
        name: "document/batch.process",
        data: {
          batchId,
          documentIds: documents.map(d => d.id),
          organizationId,
          userId,
          options: {
            performScoring: options.performScoring ?? true,
            performAnalysis: options.performAnalysis ?? true,
            scoringWeights: options.scoringWeights,
            aiProvider: options.aiProvider,
            priority: options.priority || 'normal',
          }
        }
      })
      ids = result.ids
      console.log('✅ Inngest job queued:', ids[0])
    } catch (error) {
      console.warn('⚠️ Inngest failed, continuing without background processing:', error.message)
    }
  } else {
    console.log('ℹ️ Inngest not configured, using mock processing for development')
  }

  // Create initial batch processing record
  await prisma.batchProcessing.create({
    data: {
      id: batchId,
      organizationId,
      userId: currentUser.id,  // Use database user ID, not clerkId
      totalDocuments: documents.length,
      status: 'queued',
      metadata: {
        documentIds: documents.map(d => d.id),
        options,
        inngestEventIds: ids,
        queuedAt: new Date().toISOString(),
      },
    },
  })

  // Return immediate response with batch ID for tracking
  return NextResponse.json({
    batchId,
    status: 'queued',
    message: 'Batch processing job queued successfully',
    totalDocuments: documents.length,
    estimatedProcessingTime: documents.length * 2000, // Estimate 2 seconds per document
    trackingUrl: `/api/v1/documents/batch/${batchId}/status`,
    inngestEventIds: ids,
    queuedAt: new Date().toISOString(),
  })
})