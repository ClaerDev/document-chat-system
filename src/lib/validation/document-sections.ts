import { z } from 'zod'

// Base schemas for nested data types
export const EntitySchema = z.object({
  id: z.string().optional().describe("Unique identifier for the entity"),
  type: z.enum(['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE', 'MONEY', 'MISC']).describe("Type of entity extracted"),
  value: z.string().describe("The text value of the entity"),
  confidence: z.number().min(0).max(1).describe("Confidence score between 0 and 1"),
  startOffset: z.number().describe("Character start position in document"),
  endOffset: z.number().describe("Character end position in document"),
  context: z.string().optional().describe("Surrounding context of the entity")
})

export const DocumentSectionSchema = z.object({
  title: z.string().describe("Section title or heading"),
  content: z.string().describe("Section text content"),
  pageNumber: z.number().optional().describe("Page number where section appears"),
  level: z.number().optional().describe("Heading level (1-6)"),
  sectionId: z.string().optional().describe("Unique identifier for section linking")
})

export const DocumentTableSchema = z.object({
  headers: z.array(z.string()).describe("Table column headers"),
  rows: z.array(z.array(z.string())).describe("Table row data"),
  pageNumber: z.number().optional().describe("Page number where table appears"),
  caption: z.string().optional().describe("Table caption or title")
})

export const DocumentImageSchema = z.object({
  id: z.string().describe("Unique image identifier"),
  description: z.string().optional().describe("Image description"),
  altText: z.string().optional().describe("Alternative text for accessibility"),
  pageNumber: z.number().optional().describe("Page number where image appears"),
  filePath: z.string().optional().describe("Path to image file"),
  mimeType: z.string().optional().describe("Image MIME type"),
  width: z.number().optional().describe("Image width in pixels"),
  height: z.number().optional().describe("Image height in pixels"),
  extractedText: z.string().optional().describe("OCR extracted text from image"),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }).optional().describe("Image position coordinates")
})

export const PermissionSchema = z.object({
  id: z.string().optional().describe("Permission identifier"),
  userId: z.string().describe("User ID to grant permission to"),
  permission: z.enum(['READ', 'WRITE', 'DELETE', 'SHARE', 'COMMENT']).describe("Type of permission"),
  grantedBy: z.string().describe("User ID who granted the permission"),
  grantedAt: z.string().datetime().describe("When permission was granted"),
  expiresAt: z.string().datetime().optional().describe("Optional expiration timestamp")
})

export const ShareConfigSchema = z.object({
  id: z.string().optional().describe("Share configuration identifier"),
  shareUrl: z.string().url().describe("Public share URL"),
  shareToken: z.string().describe("Unique share token"),
  isShared: z.boolean().describe("Whether document is currently shared"),
  expiresAt: z.string().datetime().optional().describe("Optional expiration timestamp"),
  allowDownload: z.boolean().default(true).describe("Allow downloading shared document"),
  allowPreview: z.boolean().default(true).describe("Allow previewing shared document"),
  trackViews: z.boolean().default(true).describe("Track view analytics"),
  viewCount: z.number().default(0).describe("Number of views"),
  lastViewedAt: z.string().datetime().optional().describe("Last view timestamp"),
  password: z.string().optional().describe("Optional password protection")
})

export const ShareViewSchema = z.object({
  id: z.string().describe("Share view identifier"),
  ipAddress: z.string().describe("Viewer IP address"),
  userAgent: z.string().describe("Viewer browser/user agent"),
  viewedAt: z.string().datetime().describe("View timestamp"),
  location: z.string().optional().describe("Geographic location (if available)")
})

export const CommentSchema = z.object({
  id: z.string().describe("Comment identifier"),
  userId: z.string().describe("User who made the comment"),
  content: z.string().describe("Comment text content"),
  createdAt: z.string().datetime().describe("Comment creation timestamp"),
  updatedAt: z.string().datetime().optional().describe("Last update timestamp"),
  parentId: z.string().optional().describe("Parent comment ID for replies"),
  isResolved: z.boolean().default(false).describe("Whether comment thread is resolved")
})

export const ProcessingEventSchema = z.object({
  id: z.string().describe("Event identifier"),
  eventType: z.enum(['STARTED', 'PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED']).describe("Type of processing event"),
  status: z.string().describe("Current processing status"),
  message: z.string().describe("Event description or error message"),
  timestamp: z.string().datetime().describe("Event timestamp"),
  progress: z.number().min(0).max(100).optional().describe("Processing progress percentage"),
  metadata: z.record(z.any()).optional().describe("Additional event metadata"),
  success: z.boolean().describe("Whether event was successful")
})

export const ContractAnalysisSchema = z.object({
  score: z.number().min(0).max(100).describe("Overall contract quality score"),
  contractType: z.enum(['SERVICE_AGREEMENT', 'PROCUREMENT', 'LEASE', 'EMPLOYMENT', 'OTHER']).describe("Type of contract"),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe("Contract risk assessment"),
  keyTerms: z.array(z.string()).describe("Important contract terms identified"),
  estimatedValue: z.string().optional().describe("Estimated contract value"),
  deadlines: z.array(z.string()).describe("Important dates and deadlines"),
  parties: z.array(z.string()).describe("Contract parties identified"),
  requirements: z.array(z.string()).describe("Contract requirements"),
  risks: z.array(z.string()).describe("Identified risks"),
  opportunities: z.array(z.string()).describe("Identified opportunities")
})

export const ComplianceCheckSchema = z.object({
  score: z.number().min(0).max(100).describe("Compliance score percentage"),
  status: z.enum(['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL', 'UNKNOWN']).describe("Compliance status"),
  checks: z.array(z.object({
    category: z.string().describe("Compliance category"),
    passed: z.boolean().describe("Whether check passed"),
    details: z.string().describe("Check details or requirements"),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().describe("Issue severity")
  })).describe("Individual compliance checks"),
  recommendations: z.array(z.string()).describe("Compliance recommendations"),
  lastCheckedAt: z.string().datetime().describe("Last compliance check timestamp")
})

export const EmbeddingVectorSchema = z.object({
  id: z.string().describe("Vector identifier"),
  sectionId: z.string().optional().describe("Associated section ID"),
  vector: z.array(z.number()).describe("Embedding vector values"),
  model: z.string().describe("Embedding model used"),
  dimensions: z.number().describe("Vector dimensions"),
  metadata: z.record(z.any()).optional().describe("Additional vector metadata"),
  generatedAt: z.string().datetime().describe("Vector generation timestamp")
})

export const RevisionSchema = z.object({
  id: z.string().describe("Revision identifier"),
  version: z.number().describe("Version number"),
  changes: z.array(z.object({
    field: z.string().describe("Field that was changed"),
    oldValue: z.any().describe("Previous value"),
    newValue: z.any().describe("New value"),
    changeType: z.enum(['ADD', 'UPDATE', 'DELETE']).describe("Type of change")
  })).describe("List of changes made"),
  createdBy: z.string().describe("User who made the revision"),
  createdAt: z.string().datetime().describe("Revision timestamp"),
  reason: z.string().optional().describe("Reason for the revision")
})

// Section-specific schemas for the unified API
export const ContentSectionSchema = z.object({
  sections: z.array(DocumentSectionSchema).describe("Document sections and headings"),
  tables: z.array(DocumentTableSchema).describe("Extracted tables"),
  images: z.array(DocumentImageSchema).describe("Document images and figures")
})

export const EntitiesSectionSchema = z.object({
  entities: z.array(EntitySchema).describe("Extracted entities from document")
})

export const SharingSectionSchema = z.object({
  permissions: z.array(PermissionSchema).describe("Document access permissions"),
  share: ShareConfigSchema.optional().describe("Public sharing configuration"),
  shareViews: z.array(ShareViewSchema).describe("Share view analytics"),
  comments: z.array(CommentSchema).describe("Document comments and discussions")
})

export const ProcessingSectionSchema = z.object({
  currentStatus: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).describe("Current processing status"),
  progress: z.number().min(0).max(100).describe("Processing progress percentage"),
  events: z.array(ProcessingEventSchema).describe("Processing event history"),
  startedAt: z.string().datetime().optional().describe("Processing start timestamp"),
  completedAt: z.string().datetime().optional().describe("Processing completion timestamp"),
  error: z.string().optional().describe("Error message if processing failed")
})

export const AnalysisSectionSchema = z.object({
  contract: ContractAnalysisSchema.optional().describe("Contract analysis results"),
  compliance: ComplianceCheckSchema.optional().describe("Compliance check results")
})

export const EmbeddingsSectionSchema = z.object({
  vectors: z.array(EmbeddingVectorSchema).describe("Document embedding vectors")
})

export const RevisionsSectionSchema = z.object({
  revisions: z.array(RevisionSchema).describe("Document revision history")
})

// Unified update schema with section routing
export const UnifiedUpdateSchema = z.object({
  section: z.enum(['content', 'entities', 'sharing', 'processing', 'analysis', 'embeddings', 'revisions']).describe("Document section to update"),
  action: z.enum(['replace', 'add', 'update', 'remove', 'add_permission', 'remove_permission', 'create_share', 'update_share', 'delete_share', 'update_status', 'add_event']).optional().describe("Specific action to perform"),
  data: z.union([
    ContentSectionSchema,
    EntitiesSectionSchema,
    SharingSectionSchema,
    ProcessingSectionSchema,
    AnalysisSectionSchema,
    EmbeddingsSectionSchema,
    RevisionsSectionSchema
  ]).describe("Section data to update")
})

// Individual action schemas for more specific validation
export const AddPermissionSchema = z.object({
  section: z.literal('sharing'),
  action: z.literal('add_permission'),
  data: z.object({
    permission: PermissionSchema.omit({ id: true, grantedAt: true })
  })
})

export const CreateShareSchema = z.object({
  section: z.literal('sharing'),
  action: z.literal('create_share'),
  data: z.object({
    share: ShareConfigSchema.omit({ id: true, shareUrl: true, shareToken: true, viewCount: true, lastViewedAt: true })
  })
})

export const UpdateStatusSchema = z.object({
  section: z.literal('processing'),
  action: z.literal('update_status'),
  data: z.object({
    currentStatus: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
    progress: z.number().min(0).max(100).optional(),
    events: z.array(ProcessingEventSchema).optional()
  })
})

export const AddEntitiesSchema = z.object({
  section: z.literal('entities'),
  action: z.enum(['replace', 'add']),
  data: z.object({
    entities: z.array(EntitySchema)
  })
})