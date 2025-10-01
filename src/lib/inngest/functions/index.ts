// export { scoreDocument } from "./score-document";  // Temporarily disabled due to import error
export { batchProcessDocuments } from "./batch-process-documents";
export { processDocumentBasic } from "./process-document-basic";
export { processDocumentFull } from "./process-document-full";
export { cancelDocumentProcessing } from "./cancel-document-processing";
export { analyzeDocument } from "./analyze-document";
export { vectorizeDocument, handleVectorizeError } from "./vectorize-document";

// SAM.gov Sync Functions
export { 
  syncSamGovOpportunities, 
  triggerSamGovSync, 
  scheduledSamGovSync 
} from "./sync-sam-gov-opportunities";

// Match Score Functions
export { 
  calculateMatchScoreFunction,
  calculateBatchMatchScoresFunction
} from "./calculate-match-score";

// Comprehensive Analysis Functions - Using test version to debug Inngest connectivity
export { analyzeOpportunityComprehensive } from "./analyze-opportunity-test";