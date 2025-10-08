/**
 * Prompt Library - Main Export
 * 
 * Centralized exports for the comprehensive prompt management system
 */

// Core types and interfaces
export * from './types'

// Template collections
export { DOCUMENT_PROCESSING_TEMPLATES } from './templates/document-processing'

// Main prompt library
export { 
  PromptLibrary, 
  promptLibrary,
  extractFullText,
  createExecutiveSummary,
  analyzeRFPRequirements,
  extractComplianceRequirements
} from './prompt-library'

// Note: Intent routing and prompt injection removed for simplified architecture

// Re-export key types for convenience
export type {
  PromptTemplate,
  PromptVariables,
  PromptExecutionContext,
  PromptExecutionResult,
  PromptCategory,
  PromptOperation,
  ModelTier,
  PromptComplexity
} from './types'