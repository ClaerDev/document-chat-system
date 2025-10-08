import { Inngest } from "inngest";

// Create an Inngest client
export const inngest = new Inngest({
  id: "document-chat-system",
  /**
   * Set the event key if provided in environment variables
   * This is used to send events to Inngest
   */
  eventKey: process.env.INNGEST_EVENT_KEY,
  /**
   * Explicitly set environment for production
   * This helps Inngest match the correct app environment
   */
  ...(process.env.NODE_ENV === 'production' && {
    env: 'production'
  })
});

// Define event schemas for type safety
export type InngestEvents = {
  "document/score.requested": {
    data: {
      documentId: string;
      organizationId: string;
      userId: string;
      options?: any;
    };
  };
  "document/batch.process": {
    data: {
      batchId: string;
      documentIds: string[];
      organizationId: string;
      userId: string;
      options?: any;
    };
  };
  "document/process.requested": {
    data: {
      documentId: string;
      organizationId: string;
      userId: string;
      options?: any;
    };
  };
  "document/process-basic.requested": {
    data: {
      documentId: string;
      organizationId: string;
      userId?: string;
      options?: any;
    };
  };
  "document/process-full.requested": {
    data: {
      documentId: string;
      organizationId: string;
      userId: string;
      options?: any;
    };
  };
  "document/score.completed": {
    data: {
      documentId: string;
      organizationId: string;
      score: any;
      processingTime: number;
    };
  };
  "document/score.failed": {
    data: {
      documentId: string;
      organizationId: string;
      error: string;
    };
  };
  "document/batch.completed": {
    data: {
      batchId: string;
      organizationId: string;
      processedCount: number;
      failedCount: number;
      totalTime: number;
    };
  };
  "document/batch.failed": {
    data: {
      batchId: string;
      organizationId: string;
      error: string;
    };
  };
  "document/process-basic.completed": {
    data: {
      documentId: string;
      organizationId: string;
      processingTime: number;
      extractedText: string;
      sectionsCount: number;
    };
  };
  "document/process-basic.failed": {
    data: {
      documentId: string;
      organizationId: string;
      error: string;
    };
  };
  "document/process-full.completed": {
    data: {
      documentId: string;
      organizationId: string;
      processingTime: number;
      qualityScore: number;
      readabilityScore: number;
      securityClassification: string;
    };
  };
  "document/process-full.failed": {
    data: {
      documentId: string;
      organizationId: string;
      error: string;
    };
  };
  "document/vectorize.requested": {
    data: {
      documentId: string;
      organizationId: string;
      userId: string;
      jobId: string;
      options?: {
        forceReprocess?: boolean;
        chunkSize?: number;
        overlap?: number;
      };
    };
  };
  "document/vectorize.progress": {
    data: {
      documentId: string;
      organizationId: string;
      jobId: string;
      progress: number;
      currentStep: string;
      chunksProcessed?: number;
      totalChunks?: number;
    };
  };
  "document/vectorize.completed": {
    data: {
      documentId: string;
      organizationId: string;
      jobId: string;
      processingTime: number;
      chunksCreated: number;
      tokensProcessed: number;
      costEstimate: number;
    };
  };
  "document/vectorize.failed": {
    data: {
      documentId: string;
      organizationId: string;
      jobId: string;
      error: string;
    };
  };
  // SAM.gov Sync Events
  "sync/sam-gov-opportunities": {
    data: {
      fullSync?: boolean;
      organizationId?: string;
      filters?: Record<string, any>;
      priority?: 'low' | 'normal' | 'high';
    };
  };
  "sync/trigger-sam-gov": {
    data: {
      fullSync?: boolean;
      organizationId?: string;
      priority?: 'low' | 'normal' | 'high';
    };
  };
  "sync/sam-gov-opportunities.cancelled": {
    data: {
      organizationId?: string;
      reason?: string;
    };
  };
  // Match Score Events
  "match-score/opportunity.requested": {
    data: {
      opportunityId: string;
      organizationId: string;
      userId: string;
      profileId?: string;
      opportunity?: any; // For real-time opportunities
      method?: 'calculation' | 'llm' | 'hybrid';
      useAdvancedAnalysis?: boolean;
      priority?: 'low' | 'normal' | 'high';
    };
  };
  "match-score/opportunity.completed": {
    data: {
      opportunityId: string;
      organizationId: string;
      score: number;
      details: any;
      processingTime: number;
      method: string;
      cached: boolean;
    };
  };
  "match-score/opportunity.failed": {
    data: {
      opportunityId: string;
      organizationId: string;
      error: string;
      retry?: boolean;
    };
  };
  "match-score/batch.requested": {
    data: {
      batchId: string;
      opportunityIds: string[];
      organizationId: string;
      userId: string;
      profileId?: string;
      opportunities?: Record<string, any>; // For real-time opportunities
      method?: 'calculation' | 'llm' | 'hybrid';
      useAdvancedAnalysis?: boolean;
    };
  };
  // AI Analysis Events
  "ai-analysis/opportunity.requested": {
    data: {
      opportunityId: string;
      organizationId: string;
      userId: string;
      opportunity: any;
      analysisType?: 'overview' | 'requirements' | 'complete';
      priority?: 'low' | 'normal' | 'high';
    };
  };
  "ai-analysis/opportunity.completed": {
    data: {
      opportunityId: string;
      organizationId: string;
      analysis: any;
      processingTime: number;
      analysisType: string;
    };
  };
  "ai-analysis/opportunity.failed": {
    data: {
      opportunityId: string;
      organizationId: string;
      error: string;
      analysisType?: string;
    };
  };
  // Competitors Analysis Events
  "competitors/analysis.requested": {
    data: {
      opportunityId: string;
      organizationId: string;
      userId: string;
      opportunity: any;
      limit?: number;
    };
  };
  "competitors/analysis.completed": {
    data: {
      opportunityId: string;
      organizationId: string;
      competitors: any[];
      totalFound: number;
      processingTime: number;
    };
  };
  "competitors/analysis.failed": {
    data: {
      opportunityId: string;
      organizationId: string;
      error: string;
    };
  };
  // Similar Contracts Events
  "similar-contracts/analysis.requested": {
    data: {
      opportunityId: string;
      organizationId: string;
      userId: string;
      opportunity: any;
      limit?: number;
    };
  };
  "similar-contracts/analysis.completed": {
    data: {
      opportunityId: string;
      organizationId: string;
      contracts: any[];
      totalFound: number;
      processingTime: number;
    };
  };
  "similar-contracts/analysis.failed": {
    data: {
      opportunityId: string;
      organizationId: string;
      error: string;
    };
  };
  // Notification Events
  "notification/analysis.completed": {
    data: {
      userId: string;
      organizationId: string;
      opportunityId: string;
      opportunityTitle: string;
      analysisTypes: string[];
      processingTime: number;
      message: string;
    };
  };
};