import { z } from 'zod'
import { 
  DocumentType, 
  SecurityClassification, 
  ContractType,
  EntityType 
} from '@/types/documents'

// Deadline schema
export const deadlineSchema = z.object({
  description: z.string()
    .min(1, 'Deadline description is required')
    .max(200, 'Description must be less than 200 characters')
    .describe('Brief description of the deadline (e.g., "Proposal submission deadline")'),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in YYYY-MM-DD format')
    .describe('Deadline date in ISO format (YYYY-MM-DD)')
})

// Contract analysis schema
export const contractAnalysisSchema = z.object({
  id: z.string().describe('Unique identifier for the contract analysis'),
  contractType: z.nativeEnum(ContractType).describe('Type of contract (RFP, RFQ, IDIQ, etc.)'),
  estimatedValue: z.string().nullable().describe('Estimated contract value (e.g., "$2.5M over 3 years")'),
  timeline: z.string().nullable().describe('Overall contract timeline and duration'),
  requirements: z.array(z.string()).describe('Key requirements and specifications'),
  risks: z.array(z.string()).describe('Identified risks and challenges'),
  opportunities: z.array(z.string()).describe('Opportunities and advantages'),
  keyTerms: z.array(z.string()).describe('Important contract terms'),
  deadlines: z.array(deadlineSchema).nullable().describe('Important dates and deadlines'),
  parties: z.array(z.string()).describe('Parties involved in the contract'),
  createdAt: z.string().describe('ISO timestamp when analysis was created'),
  updatedAt: z.string().describe('ISO timestamp when analysis was last updated')
})

// Document analysis schema
export const documentAnalysisSchema = z.object({
  summary: z.string().describe('AI-generated summary of the document'),
  keyPoints: z.array(z.string()).describe('Key points extracted from the document'),
  questions: z.array(z.string()).describe('Questions identified in the document'),
  sentiment: z.string().describe('Overall sentiment (positive, negative, neutral)'),
  actionItems: z.array(z.string()).describe('Action items identified'),
  suggestions: z.array(z.string()).describe('AI suggestions for improvement'),
  qualityScore: z.number().min(0).max(100).describe('Document quality score (0-100)'),
  readabilityScore: z.number().min(0).max(100).describe('Readability score (0-100)'),
  confidence: z.number().min(0).max(1).describe('AI confidence level (0-1)'),
  processingTime: z.number().describe('Processing time in milliseconds'),
  completedAt: z.string().describe('ISO timestamp when analysis completed'),
  
  entities: z.array(z.object({
    text: z.string().describe('Extracted entity text'),
    type: z.nativeEnum(EntityType).describe('Type of entity'),
    confidence: z.number().describe('Extraction confidence'),
    startOffset: z.number().describe('Start position in text'),
    endOffset: z.number().describe('End position in text'),
    context: z.string().nullable().describe('Surrounding context')
  })).describe('Extracted entities'),
  
  security: z.object({
    securityRisks: z.array(z.any()).describe('Identified security risks'),
    classification: z.nativeEnum(SecurityClassification).describe('Security classification level'),
    confidenceScore: z.number().describe('Security analysis confidence'),
    recommendations: z.array(z.string()).describe('Security recommendations'),
    complianceIssues: z.array(z.any()).describe('Compliance issues found'),
    sensitiveDataTypes: z.array(z.any()).describe('Types of sensitive data found'),
    sensitiveDataDetected: z.boolean().describe('Whether sensitive data was detected')
  }).describe('Security analysis results'),
  
  contract: contractAnalysisSchema.optional().describe('Contract-specific analysis'),
  
  structure: z.object({
    sections: z.array(z.any()).describe('Document sections'),
    wordCount: z.number().describe('Total word count'),
    characterCount: z.number().describe('Total character count')
  }).describe('Document structure analysis')
})

// Contract analyzer result schema (for validation)
export const contractAnalyzerResultSchema = z.object({
  contractType: z.string().describe('Type of contract identified'),
  estimatedValue: z.string().optional().describe('Estimated contract value'),
  timeline: z.string().optional().describe('Contract timeline'),
  requirements: z.array(z.string()).describe('Contract requirements'),
  risks: z.array(z.string()).describe('Identified risks'),
  opportunities: z.array(z.string()).describe('Identified opportunities'),
  deadlines: z.array(deadlineSchema).optional().describe('Contract deadlines')
})

// Metadata analyzer result schema
export const metadataAnalyzerResultSchema = z.object({
  documentType: z.nativeEnum(DocumentType).describe('Document type classification'),
  securityClassification: z.nativeEnum(SecurityClassification).describe('Security classification'),
  setAsideType: z.string().optional().describe('Priority or special category (e.g., Small Business, Minority-Owned, Women-Owned, etc.)'),
  naicsCodes: z.array(z.string().regex(/^\d{6}$/)).describe('6-digit NAICS industry codes'),
  tags: z.array(z.string()).describe('Document tags for categorization'),
  description: z.string().describe('Brief document description'),
  summary: z.string().describe('Document summary'),
  keywords: z.array(z.string()).describe('Key terms and keywords'),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']).describe('Document urgency level'),
  complexityScore: z.number().min(0).max(100).describe('Document complexity score')
})