import { inngest } from "../client";
import { prisma } from "@/lib/db";
import { fileProcessor } from '@/lib/file-processing'
import { supabaseAdmin } from '@/lib/supabase'
import { simpleAIClient } from '@/lib/ai/services/simple-ai-client'
import { documentSectionsAnalyzer } from '@/lib/ai/services/document-sections-analyzer'
import { entityExtractor } from '@/lib/ai/services/entity-extractor'
import { documentContentAnalyzer } from '@/lib/ai/services/document-content-analyzer'
import { documentSecurityAnalyzer } from '@/lib/ai/services/document-security-analyzer'
import { DocumentScoringService } from '@/lib/ai/document-scoring'
import { documentMetadataAnalyzer } from '@/lib/ai/services/document-metadata-analyzer'
import { ContractAnalyzer } from '@/lib/ai/services/contract-analyzer'
import { EntityType } from '@/types/documents'
import { downloadFileWithFallback } from '@/lib/storage/path-utils'

/**
 * Map lowercase entity types from AI services to proper EntityType enum
 */
function mapEntityTypeToEnum(type: string): EntityType {
  const mapping: Record<string, EntityType> = {
    'person': EntityType.PERSON,
    'organization': EntityType.ORGANIZATION,
    'location': EntityType.LOCATION,
    'date': EntityType.DATE,
    'money': EntityType.MONEY,
    'misc': EntityType.MISC,
    'email': EntityType.EMAIL,
    'phone': EntityType.PHONE,
    'address': EntityType.ADDRESS,
    'contract_number': EntityType.CONTRACT_NUMBER,
    'naics_code': EntityType.NAICS_CODE,
    'certification': EntityType.CERTIFICATION,
    'deadline': EntityType.DEADLINE,
    'requirement': EntityType.REQUIREMENT
  };
  
  return mapping[type.toLowerCase()] || EntityType.MISC;
}

/**
 * Optimized document analysis function that supports both file and editor content
 * with improved real-time progress tracking
 */
export const analyzeDocument = inngest.createFunction(
  {
    id: "analyze-document-v2",
    name: "Analyze Document v2",
    retries: 2,
    concurrency: {
      limit: 3, // Limit concurrent analysis for better resource management
    },
  },
  { event: "document/process.analyze" },
  async ({ event, step }) => {
    const { documentId, organizationId, userId, options, metadata } = event.data;
    const startTime = Date.now();

    console.log(`🔬 [INNGEST] Starting optimized document analysis:`, {
      documentId,
      hasFile: metadata?.hasFile,
      hasEditorContent: metadata?.hasEditorContent,
      documentType: metadata?.documentType
    });

    try {
      // Step 1: Fetch document and prepare for analysis
      const document = await step.run("fetch-document", async () => {
        console.log(`🔍 [INNGEST DEBUG] Starting document fetch for ID: ${documentId}, orgId: ${organizationId}`);
        
        const doc = await prisma.document.findUnique({
          where: { 
            id: documentId,
            organizationId: organizationId,
          },
          select: {
            id: true,
            name: true,
            organizationId: true,
            filePath: true,
            mimeType: true,
            extractedText: true,
            content: true,
            analysis: true,
            processing: true,
            documentType: true
          }
        });

        console.log(`🔍 [INNGEST DEBUG] Database query completed, doc found: ${!!doc}`);

        if (!doc) {
          console.error(`❌ [INNGEST DEBUG] Document ${documentId} not found in organization ${organizationId}`);
          throw new Error(`Document ${documentId} not found in organization ${organizationId}`);
        }

        console.log(`📄 [INNGEST] Document fetched successfully:`, {
          name: doc.name,
          hasFile: !!doc.filePath,
          hasExtractedText: !!doc.extractedText,
          hasContent: !!(doc.content as any)?.sections?.length
        });

        return doc;
      });

      // Step 2: Update progress - Content preparation
      await step.run("update-progress-preparation", async () => {
        console.log(`🔍 [INNGEST DEBUG] Starting progress update to 15% - Content preparation`);
        
        const currentProcessing = (document.processing as any) || {};
        await prisma.document.update({
          where: { id: documentId },
          data: { 
            processing: {
              ...currentProcessing,
              currentStatus: 'PROCESSING',
              progress: 15,
              currentStep: 'Preparing Content',
              events: [
                ...(currentProcessing.events || []),
                {
                  id: `event_${Date.now()}`,
                  userId: userId,
                  event: 'Content Preparation Started',
                  eventType: 'PROCESSING',
                  success: true,
                  error: null,
                  timestamp: new Date().toISOString(),
                  duration: null,
                  metadata: null
                }
              ]
            }
          }
        });
        
        console.log(`✅ [INNGEST DEBUG] Progress successfully updated to 15%`);
      });

      // Step 3: Prepare content for analysis
      const contentData = await step.run("prepare-content", async () => {
        console.log(`🔍 [INNGEST DEBUG] Starting content preparation step`);
        console.log(`🔍 [INNGEST DEBUG] Document data:`, {
          hasFilePath: !!document.filePath,
          filePath: document.filePath,
          mimeType: document.mimeType,
          hasExtractedText: !!document.extractedText,
          hasEditorContent: metadata?.hasEditorContent,
          hasFile: metadata?.hasFile
        });
        
        let textContent = '';
        let sections: any[] = [];
        let extractionMetadata: any = {};

        if (document.filePath && metadata?.hasFile) {
          // Option 1: Fetch file from Supabase and extract content
          console.log(`📁 [INNGEST] Fetching file content from Supabase: ${document.filePath}`);
          
          try {
            console.log(`🔍 [INNGEST DEBUG] About to download file from Supabase storage...`);
            
            // Check if Supabase is configured
            if (!supabaseAdmin) {
              console.error(`❌ [INNGEST] Supabase is not configured - cannot download file`);
              throw new Error('Supabase is not configured');
            }
            
            // Download file from Supabase with fallback to alternative paths
            const result = await downloadFileWithFallback(document.filePath, document.organizationId);
              
            if (result.error || !result.data) {
              console.error(`❌ [INNGEST] Failed to download file from Supabase:`, result.error);
              throw new Error(`Failed to download file: ${result.error?.message || 'No file data returned'}`);
            }
            
            if (result.actualPath !== document.filePath) {
              console.log(`📁 [INNGEST] File found at alternative path: ${result.actualPath} (original: ${document.filePath})`);
            }
            
            console.log(`✅ [INNGEST] File downloaded successfully, size: ${result.data.size} bytes`);
            
            // Convert Blob to Buffer for file processing
            const arrayBuffer = await result.data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            console.log(`🔍 [INNGEST DEBUG] About to call fileProcessor.processFile with buffer...`);
            const extractionResult = await fileProcessor.processFile(
              buffer,
              document.mimeType || 'application/pdf'
            );
            console.log(`🔍 [INNGEST DEBUG] fileProcessor.processFile completed:`, {
              success: extractionResult.success,
              hasText: !!extractionResult.text,
              textLength: extractionResult.text?.length || 0
            });

            if (extractionResult.success && extractionResult.text) {
              textContent = extractionResult.text;
              extractionMetadata = extractionResult.metadata || {};
              console.log(`✅ [INNGEST] File content extracted: ${textContent.length} characters`);
            } else {
              // Fallback to existing extracted text
              textContent = document.extractedText || '';
              console.log(`⚠️ [INNGEST] File extraction failed, using existing text: ${textContent.length} characters`);
            }
          } catch (fileError) {
            console.warn(`⚠️ [INNGEST] File processing failed, using existing text:`, fileError);
            textContent = document.extractedText || '';
          }
        } else if (metadata?.hasEditorContent) {
          // Option 2: Use TipTap editor content
          console.log(`📝 [INNGEST] Using TipTap editor content`);
          
          const contentData = (document.content as any);
          if (contentData?.sections?.length > 0) {
            sections = contentData.sections;
            textContent = sections.map(section => 
              `${section.title}\n${section.content || ''}`
            ).join('\n\n');
          } else if (contentData?.extractedText) {
            textContent = contentData.extractedText;
          }
          
          console.log(`📝 [INNGEST] Editor content prepared: ${textContent.length} characters, ${sections.length} sections`);
        } else {
          // Fallback to existing extracted text
          textContent = document.extractedText || '';
          console.log(`📄 [INNGEST] Using existing extracted text: ${textContent.length} characters`);
        }

        console.log(`🔍 [INNGEST DEBUG] Final text content length: ${textContent.length}`);

        if (!textContent || textContent.trim().length === 0) {
          console.error(`❌ [INNGEST DEBUG] No content available for analysis!`);
          throw new Error('No content available for analysis. Document has no file content or editor content.');
        }

        console.log(`✅ [INNGEST DEBUG] Content preparation completed successfully`);
        return { textContent, sections, extractionMetadata };
      });

      // Step 4: Update progress - Starting AI analysis
      await step.run("update-progress-ai-start", async () => {
        const currentProcessing = (document.processing as any) || {};
        await prisma.document.update({
          where: { id: documentId },
          data: { 
            processing: {
              ...currentProcessing,
              progress: 20,
              currentStep: 'Starting AI Analysis',
              events: [
                ...(currentProcessing.events || []),
                {
                  id: `event_${Date.now()}`,
                  userId: userId,
                  event: 'AI Analysis Started',
                  eventType: 'PROCESSING',
                  success: true,
                  error: null,
                  timestamp: new Date().toISOString(),
                  duration: null,
                  metadata: { contentLength: contentData.textContent.length }
                }
              ]
            }
          }
        });
      });

      // Step 4.5: AI Analysis - Document Metadata (Contract Details)
      const metadataAnalysis = await step.run("analyze-metadata", async () => {
        const stepStartTime = Date.now();
        console.log(`🏁 [INNGEST STEP] Starting metadata analysis (contract details)...`);
        
        await prisma.document.update({
          where: { id: documentId },
          data: { 
            processing: {
              ...(document.processing as any),
              progress: 30,
              currentStep: 'Extracting Contract Details'
            }
          }
        });

        try {
          const result = await documentMetadataAnalyzer.analyzeMetadata(
            contentData.textContent,
            document.name,
            document.organizationId
          );
          
          const stepDuration = Date.now() - stepStartTime;
          console.log(`💼 [INNGEST] Metadata analysis completed in ${stepDuration}ms:`, {
            success: result.success,
            hasEstimatedValue: !!result.metadata?.estimatedValue,
            hasDeadline: !!result.metadata?.deadline,
            naicsCount: result.metadata?.naicsCodes?.length || 0,
            tagsCount: result.metadata?.tags?.length || 0
          });
          
          return result;
        } catch (error) {
          const stepDuration = Date.now() - stepStartTime;
          console.warn(`⚠️ [INNGEST] Metadata analysis failed after ${stepDuration}ms:`, error);
          return { success: false, metadata: null };
        }
      });

      // Step 5: AI Analysis - Document Sections
      const sectionsAnalysis = await step.run("analyze-sections", async () => {
        await prisma.document.update({
          where: { id: documentId },
          data: { 
            processing: {
              ...(document.processing as any),
              progress: 40,
              currentStep: 'Analyzing Document Structure'
            }
          }
        });

        try {
          const result = await documentSectionsAnalyzer.analyzeSections(
            contentData.textContent,
            document.name,
            document.documentType || 'OTHER'
          );
          
          console.log(`📋 [INNGEST] Sections analysis completed: ${result.sections?.length || 0} sections`);
          return result;
        } catch (error) {
          console.warn(`⚠️ [INNGEST] Sections analysis failed:`, error);
          return { success: false, sections: contentData.sections || [] };
        }
      });

      // Step 6: AI Analysis - Entity Extraction
      const entitiesAnalysis = await step.run("extract-entities", async () => {
        const stepStartTime = Date.now();
        console.log(`🏁 [INNGEST STEP] Starting entity extraction...`);
        if (!options.includeEntityExtraction) {
          console.log(`⏭️ [INNGEST] Skipping entity extraction (disabled)`);
          return { success: true, entities: [] };
        }

        await prisma.document.update({
          where: { id: documentId },
          data: { 
            processing: {
              ...(document.processing as any),
              progress: 55,
              currentStep: 'Extracting Entities'
            }
          }
        });

        try {
          const result = await entityExtractor.extractEntities(
            contentData.textContent,
            document.documentType || 'OTHER',
            document.name
          );
          
          const stepDuration = Date.now() - stepStartTime;
          console.log(`🏷️ [INNGEST] Entity extraction completed: ${result.entities?.length || 0} entities in ${stepDuration}ms`);
          return result;
        } catch (error) {
          const stepDuration = Date.now() - stepStartTime;
          console.warn(`⚠️ [INNGEST] Entity extraction failed after ${stepDuration}ms:`, error);
          return { success: false, entities: [] };
        }
      });

      // Step 7: AI Analysis - Content Analysis
      const contentAnalysis = await step.run("analyze-content", async () => {
        const stepStartTime = Date.now();
        console.log(`🏁 [INNGEST STEP] Starting content analysis...`);
        await prisma.document.update({
          where: { id: documentId },
          data: { 
            processing: {
              ...(document.processing as any),
              progress: 70,
              currentStep: 'Analyzing Content'
            }
          }
        });

        try {
          const result = await documentContentAnalyzer.analyzeContent(
            contentData.textContent,
            document.name,
            document.documentType || 'OTHER'
          );
          
          const stepDuration = Date.now() - stepStartTime;
          console.log(`📄 [INNGEST] Content analysis completed in ${stepDuration}ms`);
          return result;
        } catch (error) {
          const stepDuration = Date.now() - stepStartTime;
          console.warn(`⚠️ [INNGEST] Content analysis failed after ${stepDuration}ms:`, error);
          return { success: false };
        }
      });

      // Step 8: AI Analysis - Security Analysis
      const securityAnalysis = await step.run("analyze-security", async () => {
        const stepStartTime = Date.now();
        console.log(`🏁 [INNGEST STEP] Starting security analysis...`);
        if (!options.includeSecurityAnalysis) {
          console.log(`⏭️ [INNGEST] Skipping security analysis (disabled)`);
          return { success: true, security: { classification: 'UNCLASSIFIED' } };
        }

        await prisma.document.update({
          where: { id: documentId },
          data: { 
            processing: {
              ...(document.processing as any),
              progress: 85,
              currentStep: 'Security Analysis'
            }
          }
        });

        try {
          const result = await documentSecurityAnalyzer.analyzeSecurity(
            contentData.textContent,
            document.name
          );
          
          const stepDuration = Date.now() - stepStartTime;
          console.log(`🔒 [INNGEST] Security analysis completed: ${result.security?.classification || 'UNCLASSIFIED'} in ${stepDuration}ms`);
          return result;
        } catch (error) {
          const stepDuration = Date.now() - stepStartTime;
          console.warn(`⚠️ [INNGEST] Security analysis failed after ${stepDuration}ms:`, error);
          return { success: false, security: { classification: 'UNCLASSIFIED' } };
        }
      });

      // Step 9: AI Analysis - Contract Analysis  
      const contractAnalysis = await step.run("analyze-contract", async () => {
        const stepStartTime = Date.now();
        console.log(`🏁 [INNGEST STEP] Starting contract analysis...`);

        await prisma.document.update({
          where: { id: documentId },
          data: { 
            processing: {
              ...(document.processing as any),
              progress: 87,
              currentStep: 'Contract Analysis'
            }
          }
        });

        try {
          const contractAnalyzer = new ContractAnalyzer();
          const result = await contractAnalyzer.analyzeContract(
            contentData.textContent,
            document.name,
            document.documentType || 'OTHER',
            document.organizationId
          );
          
          const stepDuration = Date.now() - stepStartTime;
          console.log(`📋 [INNGEST] Contract analysis completed in ${stepDuration}ms:`, {
            success: result.success,
            hasRequirements: !!result.analysis?.requirements?.length,
            requirementsCount: result.analysis?.requirements?.length || 0,
            hasOpportunities: !!result.analysis?.opportunities?.length,
            opportunitiesCount: result.analysis?.opportunities?.length || 0,
            contractType: result.analysis?.contractType,
            estimatedValue: result.analysis?.estimatedValue
          });
          
          return result;
        } catch (error) {
          const stepDuration = Date.now() - stepStartTime;
          console.warn(`⚠️ [INNGEST] Contract analysis failed after ${stepDuration}ms:`, error);
          return { success: false, analysis: null };
        }
      });

      // Step 10: Quality Scoring
      const qualityScore = await step.run("calculate-quality-score", async () => {
        const stepStartTime = Date.now();
        console.log(`🏁 [INNGEST STEP] Starting quality scoring...`);
        if (!options.includeQualityScoring) {
          console.log(`⏭️ [INNGEST] Skipping quality scoring (disabled)`);
          return null;
        }

        await prisma.document.update({
          where: { id: documentId },
          data: { 
            processing: {
              ...(document.processing as any),
              progress: 92,
              currentStep: 'Quality Scoring'
            }
          }
        });

        try {
          const scoringService = DocumentScoringService.getInstance();
          const score = await scoringService.scoreDocument({
            content: contentData.textContent,
            title: document.name,
            documentType: document.documentType || 'OTHER',
            metadata: {
              wordCount: contentData.textContent.split(/\s+/).length,
              pageCount: sectionsAnalysis.sections?.length || 1
            }
          }, {
            documentType: document.documentType || 'OTHER',
            organizationId: document.organizationId
          });
          
          const stepDuration = Date.now() - stepStartTime;
          console.log(`⭐ [INNGEST] Quality scoring completed: ${score?.overallScore || 'N/A'} in ${stepDuration}ms`);
          return score;
        } catch (error) {
          const stepDuration = Date.now() - stepStartTime;
          console.warn(`⚠️ [INNGEST] Quality scoring failed after ${stepDuration}ms:`, error);
          return null;
        }
      });

      // Step 10: Save results and complete
      await step.run("save-results", async () => {
        await prisma.document.update({
          where: { id: documentId },
          data: { 
            processing: {
              ...(document.processing as any),
              progress: 95,
              currentStep: 'Saving Results'
            }
          }
        });

        // Prepare analysis data
        console.log(`🔍 [INNGEST] Preparing analysis data:`, {
          sectionsCount: sectionsAnalysis.sections?.length || 0,
          entitiesCount: entitiesAnalysis.entities?.length || 0,
          contentAnalysisSuccess: contentAnalysis.success,
          securityAnalysisSuccess: securityAnalysis.success,
          qualityScore: qualityScore?.overallScore || null,
          contentAnalysisData: contentAnalysis.success ? Object.keys(contentAnalysis.analysis || {}) : 'none',
          securityData: securityAnalysis.security ? Object.keys(securityAnalysis.security) : 'none'
        });

        // Extract content analysis data for proper UI display with safe fallbacks
        const contentAnalysisData = contentAnalysis.success && contentAnalysis.analysis ? contentAnalysis.analysis : {
          summary: '',
          keyPoints: [],
          actionItems: [],
          questions: [],
          suggestions: [],
          sentiment: 'neutral',
          qualityScore: 0,
          readabilityScore: 0
        };
        
        // Calculate overall confidence score based on successful analysis components
        const calculateOverallConfidence = () => {
          let totalConfidence = 0;
          let componentCount = 0;
          
          // Content analysis confidence (weight: 40%)
          if (contentAnalysis.success && contentAnalysisData.qualityScore > 0) {
            totalConfidence += (contentAnalysisData.qualityScore / 100) * 0.4;
            componentCount += 0.4;
          }
          
          // Sections analysis confidence (weight: 20%)
          if (sectionsAnalysis.success && sectionsAnalysis.sections?.length > 0) {
            const sectionsConfidence = Math.min(sectionsAnalysis.sections.length / 5, 1); // Up to 5 sections = 100%
            totalConfidence += sectionsConfidence * 0.2;
            componentCount += 0.2;
          }
          
          // Entity extraction confidence (weight: 20%)
          if (entitiesAnalysis.success && entitiesAnalysis.entities?.length > 0) {
            const avgEntityConfidence = entitiesAnalysis.entities.reduce((sum, entity) => sum + (entity.confidence || 0.8), 0) / entitiesAnalysis.entities.length;
            totalConfidence += avgEntityConfidence * 0.2;
            componentCount += 0.2;
          }
          
          // Security analysis confidence (weight: 20%)
          if (securityAnalysis.success && securityAnalysis.security?.confidenceScore) {
            totalConfidence += (securityAnalysis.security.confidenceScore / 100) * 0.2;
            componentCount += 0.2;
          } else if (securityAnalysis.success) {
            // If security analysis succeeded but no confidence score, assume 80%
            totalConfidence += 0.8 * 0.2;
            componentCount += 0.2;
          }
          
          // Calculate final confidence (0.0 to 1.0)
          const finalConfidence = componentCount > 0 ? totalConfidence / componentCount : 0.75; // Default 75% if no components
          
          console.log(`🎯 [CONFIDENCE] Overall confidence calculation:`, {
            contentSuccess: contentAnalysis.success,
            contentQuality: contentAnalysisData.qualityScore,
            sectionsSuccess: sectionsAnalysis.success,
            sectionsCount: sectionsAnalysis.sections?.length || 0,
            entitiesSuccess: entitiesAnalysis.success,
            entitiesCount: entitiesAnalysis.entities?.length || 0,
            securitySuccess: securityAnalysis.success,
            securityConfidence: securityAnalysis.security?.confidenceScore,
            totalConfidence,
            componentCount,
            finalConfidence: Math.round(finalConfidence * 100)
          });
          
          return Math.max(0.1, Math.min(1.0, finalConfidence)); // Clamp between 10% and 100%
        };
        
        const overallConfidence = calculateOverallConfidence();
        
        const analysisData = {
          structure: {
            sections: sectionsAnalysis.sections || contentData.sections || [],
            wordCount: contentData.textContent.split(/\s+/).length,
            characterCount: contentData.textContent.length
          },
          // Add contract details from metadata analysis and contract analysis
          contract: metadataAnalysis.success && metadataAnalysis.metadata ? {
            estimatedValue: metadataAnalysis.metadata.estimatedValue,
            timeline: metadataAnalysis.metadata.deadline ? `Due: ${metadataAnalysis.metadata.deadline}` : undefined,
            deadlines: metadataAnalysis.metadata.deadline ? [metadataAnalysis.metadata.deadline] : [],
            urgencyLevel: metadataAnalysis.metadata.urgencyLevel,
            complexityScore: metadataAnalysis.metadata.complexityScore
          } : null,
          // Add contract analysis results for requirements and opportunities
          contractAnalysis: contractAnalysis.success && contractAnalysis.analysis ? {
            contractType: contractAnalysis.analysis.contractType || 'Other',
            estimatedValue: contractAnalysis.analysis.estimatedValue,
            timeline: contractAnalysis.analysis.timeline,
            deadlines: [], // Contract analyzer doesn't extract deadlines - handled by metadata analysis
            requirements: contractAnalysis.analysis.requirements || [],
            risks: contractAnalysis.analysis.risks || [],
            opportunities: contractAnalysis.analysis.opportunities || []
          } : null,
          // Add overall confidence score for UI display
          confidence: overallConfidence,
          // Flatten content analysis to top level for UI compatibility
          summary: contentAnalysisData.summary || '',
          keyPoints: contentAnalysisData.keyPoints || [],
          actionItems: contentAnalysisData.actionItems || [],
          questions: contentAnalysisData.questions || [],
          suggestions: contentAnalysisData.suggestions || [],
          sentiment: contentAnalysisData.sentiment || 'neutral',
          qualityScore: contentAnalysisData.qualityScore || qualityScore?.overallScore || 0,
          readabilityScore: contentAnalysisData.readabilityScore || 0,
          security: securityAnalysis.security || { classification: 'UNCLASSIFIED' },
          completedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime
        };
        
        console.log(`🔍 [INNGEST] Final analysis data structure:`, {
          qualityScore: analysisData.qualityScore,
          readabilityScore: analysisData.readabilityScore,
          summaryLength: analysisData.summary?.length || 0,
          keyPointsCount: analysisData.keyPoints?.length || 0,
          securityClassification: analysisData.security?.classification,
          hasContentData: !!analysisData.content,
          hasContract: !!analysisData.contract,
          contractValue: analysisData.contract?.estimatedValue,
          contractDeadline: analysisData.contract?.deadline,
          naicsCount: analysisData.contract?.naicsCodes?.length || 0,
          hasMetadata: !!analysisData.metadata,
          metadataTagsCount: analysisData.metadata?.tags?.length || 0
        });

        // Transform ExtractedEntity[] to DocumentEntities format
        const transformedEntities = (entitiesAnalysis.entities || []).map((entity: any, index: number) => ({
          id: `entity_${documentId}_${index}_${Date.now()}`,
          text: entity.text,
          type: mapEntityTypeToEnum(entity.type),
          confidence: entity.confidence,
          startOffset: entity.startOffset,
          endOffset: entity.endOffset,
          context: entity.context || null,
          metadata: null
        }));

        const entitiesData = {
          entities: transformedEntities,
          extractedAt: new Date().toISOString(),
          totalCount: transformedEntities.length
        };

        // Update document with results
        const finalProcessing = {
          ...(document.processing as any),
          currentStatus: 'COMPLETED',
          progress: 100,
          currentStep: null,
          completedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          events: [
            ...((document.processing as any)?.events || []),
            {
              id: `event_${Date.now()}`,
              userId: userId,
              event: 'Analysis Completed',
              eventType: 'COMPLETED',
              success: true,
              error: null,
              timestamp: new Date().toISOString(),
              duration: Date.now() - startTime,
              metadata: {
                sectionsCount: sectionsAnalysis.sections?.length || 0,
                entitiesCount: entitiesAnalysis.entities?.length || 0,
                qualityScore: qualityScore?.overallScore || null,
                securityClassification: securityAnalysis.security?.classification
              }
            }
          ]
        };

        console.log(`📊 [INNGEST] About to save - analysisData keys:`, Object.keys(analysisData));
        console.log(`📊 [INNGEST] About to save - analysisData structure:`, JSON.stringify(analysisData, null, 2).substring(0, 500));

        try {
          await prisma.document.update({
            where: { id: documentId },
            data: {
              processing: finalProcessing,
              analysis: analysisData,
              entities: entitiesData,
            // Update document-level metadata fields if metadata analysis succeeded
            ...(metadataAnalysis.success && metadataAnalysis.metadata && {
              documentType: metadataAnalysis.metadata.documentType,
              tags: metadataAnalysis.metadata.tags || []
            }),
            // Update extracted text only if we got fresh content from file processing (not editor content)
            ...((contentData.textContent !== document.extractedText && metadata?.hasFile && contentData.textContent?.length > 0) && {
              extractedText: contentData.textContent
            }),
            // Update content structure if we have new sections or content analysis
            ...((sectionsAnalysis.sections || contentAnalysisData.summary) && {
              content: {
                ...(document.content as any),
                sections: sectionsAnalysis.sections || (document.content as any)?.sections || [],
                // Only update extractedText in content if we got fresh file content
                ...(metadata?.hasFile && contentData.textContent?.length > 0 && {
                  extractedText: contentData.textContent
                }),
                summary: contentAnalysisData.summary || '',
                keyPoints: contentAnalysisData.keyPoints || [],
                actionItems: contentAnalysisData.actionItems || [],
                questions: contentAnalysisData.questions || [],
                suggestions: contentAnalysisData.suggestions || [],
                lastUpdated: new Date().toISOString()
              }
            })
          }
          });

          console.log(`✅ [INNGEST] Analysis completed successfully for ${documentId} in ${Date.now() - startTime}ms`);
        } catch (saveError) {
          console.error(`❌ [INNGEST] Failed to save analysis results:`, saveError);
          console.error(`❌ [INNGEST] Error details:`, JSON.stringify(saveError, null, 2));
          throw saveError; // Re-throw to let Inngest handle retry
        }
      });

      return {
        success: true,
        documentId,
        processingTime: Date.now() - startTime,
        analysisResults: {
          sectionsCount: sectionsAnalysis.sections?.length || 0,
          entitiesCount: entitiesAnalysis.entities?.length || 0,
          qualityScore: qualityScore?.overallScore || null,
          securityClassification: securityAnalysis.security?.classification || 'UNCLASSIFIED'
        }
      };

    } catch (error) {
      console.error(`❌ [INNGEST] Analysis failed for ${documentId}:`, error);
      
      // Update document status to failed
      const currentDoc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { processing: true }
      });
      
      const currentProcessing = (currentDoc?.processing as any) || {};
      
      await prisma.document.update({
        where: { id: documentId },
        data: {
          processing: {
            ...currentProcessing,
            currentStatus: 'FAILED',
            progress: 0,
            currentStep: null,
            estimatedCompletion: null,
            completedAt: new Date().toISOString(),
            processingTime: Date.now() - startTime,
            events: [
              ...(currentProcessing.events || []),
              {
                id: `event_${Date.now()}`,
                userId: userId,
                event: 'Analysis Failed',
                eventType: 'FAILED',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown analysis error',
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                metadata: null
              }
            ]
          }
        }
      });

      throw error;
    }
  }
);
