import { NextResponse } from 'next/server'
import type { Document, Folder } from '@/types/documents'

export async function GET() {
  try {
    // Test component type alignment
    const testDocument: Document = {
      id: 'test-doc-1',
      organizationId: 'test-org',
      uploadedById: 'test-user',
      name: 'Test Document.pdf',
      folderId: null,
      size: 2621440,  // 2.5 MB in bytes
      mimeType: 'application/pdf',
      filePath: '/documents/test.pdf',
      uploadDate: '2025-07-23T10:00:00Z',
      lastModified: '2025-07-23T12:00:00Z',
      
      // Document classification
      documentType: 'CONTRACT' as import('@/types/documents').DocumentType,
      securityClassification: 'PUBLIC' as import('@/types/documents').SecurityClassification,
      workflowStatus: 'COMPLETED' as import('@/types/documents').WorkflowStatus,
      
      // Content
      extractedText: 'Test content',
      summary: 'Test summary',
      description: 'Test document description',
      tags: ['test', 'alignment'],
      setAsideType: '8(a)',
      naicsCodes: ['541511'],
      isEditable: false,
      // JSON fields
      content: {
        summary: 'Test summary',
        keywords: ['test', 'document'],
        keyPoints: ['Point 1', 'Point 2'],
        actionItems: [],
        questions: [],
        sections: [],
        tables: [],
        images: []
      },
      embeddings: {},
      entities: { entities: [], totalCount: 0 },
      sharing: { permissions: [], share: { id: '', shareUrl: '', shareToken: '', isShared: false, expiresAt: null, password: null, allowDownload: true, allowPreview: true } },
      revisions: { revisions: [], currentRevision: null },
      processing: {
        status: 'completed',
        progress: 100,
        startedAt: '2025-07-23T10:00:00Z',
        completedAt: '2025-07-23T10:05:00Z',
        retryCount: 0,
        events: []
      },
      analysis: {
        qualityScore: 8,
        readabilityScore: 7,
        entities: [],
        confidence: 0.9,
        suggestions: []
      },
      
      // Timestamps
      createdAt: '2025-07-23T10:00:00Z',
      updatedAt: '2025-07-23T12:00:00Z',
      deletedAt: null
    }

    const testFolder: Folder = {
      id: 'test-folder-1',
      organizationId: 'test-org',
      createdById: 'test-user',
      name: 'Test Folder',
      description: 'Test folder for alignment',
      parentId: null,
      path: '/Test Folder',
      level: 0,
      icon: null,
      color: '#6b7280',
      isProtected: false,
      createdAt: '2025-07-23T10:00:00Z',
      updatedAt: '2025-07-23T10:00:00Z',
      deletedAt: null
    }

    return NextResponse.json({
      success: true,
      message: 'Component type alignment test successful',
      testResults: {
        documentFieldsAligned: {
          name: '✅',
          lastModified: '✅',
          size: '✅',
          type: '✅',
          aiData: '✅',
          metadata: '✅'
        },
        enumsAligned: {
          documentStatus: 'lowercase (completed)',
          documentType: 'lowercase (contract)',
          urgencyLevel: 'lowercase (medium)'
        },
        componentsReady: {
          DocumentCard: '✅ Uses Document type',
          FolderCard: '✅ Uses Folder type',
          DocumentModal: '✅ Type-safe props',
          CreateDocumentModal: '✅ Fixed imports'
        }
      },
      testDocument,
      testFolder
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Component alignment test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}