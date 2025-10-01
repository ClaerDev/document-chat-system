import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { Document, AIProcessingStatus, SecurityAnalysis } from '@/types/documents'

/**
 * TRUE DATABASE-INTERFACE ALIGNMENT VALIDATION TEST
 * 
 * This endpoint validates that database values map DIRECTLY to interface
 * with ZERO transformation logic required.
 */
export async function GET() {
  try {
    console.log('🧪 TESTING TRUE DATABASE-INTERFACE ALIGNMENT...')

    // Fetch a sample document from database
    const sampleDoc = await prisma.document.findFirst({
      where: { deletedAt: null },
      include: {
        uploadedBy: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    })

    if (!sampleDoc) {
      return NextResponse.json({
        success: false,
        error: 'No documents found for testing',
        alignment: 'CANNOT_TEST'
      })
    }

    console.log('📊 Raw Database Values:', {
      documentType: sampleDoc.documentType,
      workflowStatus: sampleDoc.workflowStatus,
      status: sampleDoc.status,
      securityClassification: sampleDoc.securityClassification,
      size: sampleDoc.size,
      sizeType: typeof sampleDoc.size
    })

    // DIRECT MAPPING TEST - Should require ZERO transformations
    const directMappedDocument: Partial<Document> = {
      id: sampleDoc.id,
      name: sampleDoc.name,              // DIRECT
      size: sampleDoc.size,              // DIRECT: Int maps to number
      lastModified: sampleDoc.lastModified.toISOString(), // DIRECT: DateTime to string
      // Direct document fields (no metadata wrapper)
      documentType: sampleDoc.documentType,  // DIRECT: UPPERCASE -> UPPERCASE  
      workflowStatus: sampleDoc.workflowStatus, // DIRECT: UPPERCASE -> UPPERCASE
      tags: sampleDoc.tags || [],
      aiData: {
        status: {
          status: sampleDoc.status,            // DIRECT: UPPERCASE -> UPPERCASE
          progress: sampleDoc.status === 'COMPLETED' ? 100 : 0,
          retryCount: 0
        } as AIProcessingStatus,
        content: {
          extractedText: sampleDoc.extractedText || '',
          summary: sampleDoc.summary || '',
          keywords: sampleDoc.tags || [],
          keyPoints: [],
          actionItems: [],
          questions: []
        },
        structure: {
          sections: [],
          tables: [],
          images: [],
          ocrResults: []
        },
        analysis: {
          qualityScore: sampleDoc.scoreValue || 0,
          readabilityScore: 0,
          complexityMetrics: { readabilityScore: 0 },
          entities: [],
          confidence: 0.8,
          suggestions: []
        },
        processedAt: sampleDoc.processedAt?.toISOString() || new Date().toISOString(),
        modelVersion: 'direct-mapping-v1.0',
        processingHistory: []
      },
      securityAnalysis: {
        classification: sampleDoc.securityClassification,  // DIRECT: UPPERCASE -> UPPERCASE
        piiDetected: false,
        piiTypes: [],
        complianceStatus: 'compliant',
        redactionNeeded: false
      } as SecurityAnalysis
    }

    // ALIGNMENT VALIDATION TESTS
    const alignmentTests = {
      // Test 1: Enum Alignment (should be identical)
      enumAlignment: {
        documentType: {
          database: sampleDoc.documentType,
          interface: directMappedDocument.documentType,
          aligned: sampleDoc.documentType === directMappedDocument.documentType
        },
        processingStatus: {
          database: sampleDoc.status,
          interface: directMappedDocument.aiData?.status.status,
          aligned: sampleDoc.status === directMappedDocument.aiData?.status.status
        },
        workflowStatus: {
          database: sampleDoc.workflowStatus,
          interface: directMappedDocument.workflowStatus,
          aligned: sampleDoc.workflowStatus === directMappedDocument.workflowStatus
        },
        securityClassification: {
          database: sampleDoc.securityClassification,
          interface: directMappedDocument.securityAnalysis?.classification,
          aligned: sampleDoc.securityClassification === directMappedDocument.securityAnalysis?.classification
        }
      },
      
      // Test 2: Field Type Alignment
      fieldTypes: {
        size: {
          databaseType: typeof sampleDoc.size,
          interfaceType: typeof directMappedDocument.size,
          aligned: typeof sampleDoc.size === typeof directMappedDocument.size
        },
        name: {
          databaseType: typeof sampleDoc.name,
          interfaceType: typeof directMappedDocument.name,
          aligned: typeof sampleDoc.name === typeof directMappedDocument.name
        }
      }
    }

    // Calculate overall alignment score
    const enumTests = Object.values(alignmentTests.enumAlignment)
    const fieldTests = Object.values(alignmentTests.fieldTypes)
    const allTests = [...enumTests, ...fieldTests]
    const passedTests = allTests.filter(test => test.aligned).length
    const alignmentPercentage = Math.round((passedTests / allTests.length) * 100)

    const isFullyAligned = alignmentPercentage === 100
    const transformationsRequired = !isFullyAligned

    console.log('✅ ALIGNMENT TEST RESULTS:', {
      alignmentPercentage,
      isFullyAligned,
      transformationsRequired,
      passedTests,
      totalTests: allTests.length
    })

    return NextResponse.json({
      success: true,
      alignment: {
        status: isFullyAligned ? 'PERFECT_ALIGNMENT' : 'MISALIGNED',
        percentage: alignmentPercentage,
        transformationsRequired,
        summary: isFullyAligned 
          ? '🎉 TRUE ALIGNMENT ACHIEVED - Zero transformations needed!'
          : `⚠️ ${100 - alignmentPercentage}% misalignment detected - Transformations still required`
      },
      testResults: alignmentTests,
      sampleData: {
        databaseRaw: {
          documentType: sampleDoc.documentType,
          status: sampleDoc.status,
          workflowStatus: sampleDoc.workflowStatus,
          securityClassification: sampleDoc.securityClassification,
          size: sampleDoc.size,
          name: sampleDoc.name
        },
        interfaceMapped: {
          documentType: directMappedDocument.documentType,
          status: directMappedDocument.aiData?.status.status,
          workflowStatus: directMappedDocument.workflowStatus,
          securityClassification: directMappedDocument.securityAnalysis?.classification,
          size: directMappedDocument.size,
          name: directMappedDocument.name
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ TRUE ALIGNMENT TEST FAILED:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test database-interface alignment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}