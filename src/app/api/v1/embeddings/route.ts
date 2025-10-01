/**
 * @swagger
 * /api/v1/embeddings:
 *   post:
 *     summary: Generate embeddings for a document
 *     description: Process a document to generate vector embeddings for semantic search
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentId
 *             properties:
 *               documentId:
 *                 type: string
 *                 description: ID of the document to process
 *               forceReprocess:
 *                 type: boolean
 *                 description: Force reprocessing even if embeddings exist
 *               chunkSize:
 *                 type: number
 *                 description: Custom chunk size in tokens
 *               overlap:
 *                 type: number
 *                 description: Custom overlap between chunks
 *     responses:
 *       200:
 *         description: Embeddings generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 embeddings:
 *                   $ref: '#/components/schemas/DocumentEmbeddings'
 *                 stats:
 *                   type: object
 *                   properties:
 *                     chunksCreated:
 *                       type: number
 *                     tokensProcessed:
 *                       type: number
 *                     costEstimate:
 *                       type: number
 *                     processingTimeMs:
 *                       type: number
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { defaultEmbeddingProcessor } from '@/lib/ai/services/document-embedding-processor'

const GenerateEmbeddingsSchema = z.object({
  documentId: z.string().describe('Document ID to process'),
  forceReprocess: z.boolean().optional().describe('Force reprocessing'),
  chunkSize: z.number().min(100).max(2000).optional().describe('Chunk size in tokens'),
  overlap: z.number().min(0).max(500).optional().describe('Overlap between chunks'),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const validatedData = GenerateEmbeddingsSchema.parse(body)

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get document and verify access
    const document = await prisma.document.findFirst({
      where: {
        id: validatedData.documentId,
        organizationId: user.organizationId,
        deletedAt: null
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Process embeddings
    const result = await defaultEmbeddingProcessor.processDocument(
      document as any, // Type assertion for compatibility
      {
        forceReprocess: validatedData.forceReprocess,
        chunkSize: validatedData.chunkSize,
        overlap: validatedData.overlap
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Processing failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      embeddings: result.embeddings,
      stats: {
        ...result.stats,
        processingTimeMs: result.processingTimeMs
      }
    })

  } catch (error) {
    console.error('Embedding generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/v1/embeddings:
 *   delete:
 *     summary: Delete embeddings for a document
 *     description: Remove all vector embeddings for a specific document
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the document
 *     responses:
 *       200:
 *         description: Embeddings deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID required' },
        { status: 400 }
      )
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get document and verify access
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: user.organizationId,
        deletedAt: null
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete embeddings
    await defaultEmbeddingProcessor.deleteDocumentEmbeddings(document as any)

    return NextResponse.json({
      success: true,
      message: 'Embeddings deleted successfully'
    })

  } catch (error) {
    console.error('Embedding deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}