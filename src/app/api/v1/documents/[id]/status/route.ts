import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/v1/documents/{id}/status:
 *   get:
 *     summary: Get document processing status
 *     description: Returns real-time processing status and AI analysis progress for a document
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [PENDING, PROCESSING, COMPLETED, FAILED, QUEUED]
 *                 processingProgress:
 *                   type: number
 *                   description: Processing progress percentage (0-100)
 *                 currentStep:
 *                   type: string
 *                   description: Current processing step description
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                 aiData:
 *                   type: object
 *                   description: AI processing results if available
 *                 processingError:
 *                   type: string
 *                   description: Error message if processing failed
 *                 qualityScore:
 *                   type: number
 *                   description: Document quality score if analysis complete
 *                 securityClassification:
 *                   type: string
 *                   description: Security classification if analysis complete
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get document with full details
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        organizationId: true,
        name: true,
        processing: true,
        lastModified: true,
        analysis: true,
        extractedText: true,
        summary: true,
        tags: true,
        documentType: true,
        securityClassification: true,
        // Additional fields for status checking
        createdAt: true,
        updatedAt: true
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify user has access to the document's organization
    if (document.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Extract processing progress and additional details from analysis data
    const processingData = (document.processing as any) || {};
    const analysisData = (document.analysis as any) || {};
    let processingProgress = 0;
    let currentStep: string | undefined;
    let qualityScore: number | undefined;
    let readabilityScore: number | undefined;
    let securityClassification: string | undefined;
    let sectionsCount = 0;
    let entitiesCount = 0;

    // Get progress from processing status
    processingProgress = processingData.progress || 0;
    currentStep = processingData.currentStep;
    
    // Extract analysis results
    if (analysisData) {
      qualityScore = analysisData.qualityScore;
      readabilityScore = analysisData.readabilityScore;
      securityClassification = analysisData.security?.classification;
      sectionsCount = analysisData.structure?.sections?.length || 0;
      entitiesCount = analysisData.entities?.length || 0;
    }

    // Determine overall processing status
    let overallStatus = processingData.currentStatus || 'PENDING';
    
    // Enhanced logging for status polling debugging
    console.log(`📊 [STATUS API] Document ${documentId} status check:`, {
      currentStatus: overallStatus,
      progress: processingProgress,
      currentStep,
      hasAnalysisData: !!analysisData,
      sectionsCount,
      entitiesCount,
      qualityScore,
      timestamp: new Date().toISOString()
    });
    
    // If status is PENDING but we have some analysis data, it might be partially processed
    if (overallStatus === 'PENDING' && analysisData && sectionsCount > 0) {
      console.log(`📊 [STATUS API] Upgrading status from PENDING to PROCESSING due to analysis data`);
      overallStatus = 'PROCESSING';
    }

    // Calculate estimated completion time for processing documents
    let estimatedCompletion: string | undefined;
    if (overallStatus === 'PROCESSING' || overallStatus === 'PENDING') {
      const createdTime = new Date(document.createdAt).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - createdTime) / (1000 * 60);
      
      // Estimate based on document type and current progress
      let estimatedTotalMinutes = 5; // Default 5 minutes for basic processing
      if (processingProgress > 50) {
        estimatedTotalMinutes = 15; // If we're past 50%, likely doing full analysis
      }
      
      const remainingMinutes = Math.max(0, estimatedTotalMinutes - elapsedMinutes);
      if (remainingMinutes > 0) {
        const completionTime = new Date(now + remainingMinutes * 60 * 1000);
        estimatedCompletion = completionTime.toISOString();
      }
    }

    const statusResponse = {
      id: document.id,
      name: document.name,
      status: overallStatus,
      lastUpdated: document.updatedAt,
      
      // Progress fields that frontend expects
      processingProgress: processingProgress,
      currentStep: currentStep,
      estimatedCompletion: estimatedCompletion,
      
      // Processing object that matches UI expectations
      processing: {
        currentStatus: overallStatus,
        progress: processingProgress,
        currentStep: currentStep,
        error: processingData.error,
        completedAt: processingData.completedAt,
        events: processingData.events || []
      },
      
      // Analysis results (if available)
      qualityScore,
      readabilityScore,
      securityClassification: securityClassification || document.securityClassification,
      
      // Processing metrics
      sectionsExtracted: sectionsCount,
      entitiesFound: entitiesCount,
      hasExtractedText: !!document.extractedText,
      hasSummary: !!document.summary,
      
      // Metadata
      documentType: document.documentType,
      tags: document.tags,
      
      // Full processing data for debugging
      processingData: processingData,
      
      // Timestamps
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };
    
    console.log(`📊 [STATUS API] Returning response for document ${documentId}:`, {
      status: overallStatus,
      progress: processingProgress,
      hasError: !!processingData.error,
      hasAnalysis: !!analysisData,
      responseSize: JSON.stringify(statusResponse).length
    });

    return NextResponse.json(statusResponse);

  } catch (error) {
    console.error('Document status error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}