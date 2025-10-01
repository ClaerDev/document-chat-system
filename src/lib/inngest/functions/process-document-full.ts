import { inngest } from "../client";
import { documentProcessor } from "@/lib/ai/document-processor";
import { prisma } from "@/lib/db";

/**
 * Inngest function for full document processing (complete AI analysis)
 * This runs as a background job when manually triggered by users
 */
export const processDocumentFull = inngest.createFunction(
  {
    id: "process-document-full",
    name: "Process Document Full",
    retries: 3,
    concurrency: {
      limit: 5, // Process max 5 documents concurrently for full processing (more resource intensive)
    },
  },
  { event: "document/process-full.requested" },
  async ({ event, step }) => {
    const { documentId, organizationId, userId, options } = event.data;
    const startTime = Date.now();

    try {
      // Step 1: Verify document exists and update status
      const document = await step.run("fetch-and-update-document", async () => {
        const doc = await prisma.document.findUnique({
          where: { 
            id: documentId,
            organizationId: organizationId,
          },
          include: {
            organization: true,
          },
        });

        if (!doc) {
          throw new Error(`Document ${documentId} not found`);
        }

        // Update status to processing
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'PROCESSING' }
        });

        return doc;
      });

      // Step 2: Process document with full AI analysis
      const processingResult = await step.run("process-full-content", async () => {
        console.log(`🔄 [INNGEST] Starting full AI analysis for document: ${documentId}`);
        
        try {
          // Add more aggressive timeout (5 minutes instead of 15)
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              console.error(`⏰ [INNGEST] TIMEOUT: Full processing exceeded 5 minutes for ${documentId}`);
              reject(new Error('Full processing timeout after 5 minutes - likely stuck in AI service call'));
            }, 5 * 60 * 1000);
          });

          const processingPromise = documentProcessor.processDocument(
            documentId,
            (step: string, progress: number) => {
              console.log(`📊 [INNGEST] Full Processing [${documentId}]: ${step} - ${progress}%`);
            }
          );

          console.log(`⏱️ [INNGEST] Racing processing vs timeout for ${documentId}...`);
          const result = await Promise.race([processingPromise, timeoutPromise]) as any;

          if (!result.success) {
            console.error(`❌ [INNGEST] Full processing failed for ${documentId}:`, result.error);
            throw new Error(result.error || 'Full processing failed');
          }

          console.log(`✅ [INNGEST] Full processing completed successfully for ${documentId}`);
          return result;
          
        } catch (error) {
          console.error(`💥 [INNGEST] Exception in full processing for ${documentId}:`, error);
          // Make sure document status is updated to FAILED
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
                events: [
                  ...(currentProcessing.events || []),
                  {
                    id: `event_${Date.now()}`,
                    userId: null,
                    event: 'Processing Failed',
                    eventType: 'FAILED',
                    success: false,
                    error: error instanceof Error ? error.message : 'Processing failed with unknown error',
                    timestamp: new Date().toISOString(),
                    duration: null,
                    metadata: null
                  }
                ]
              }
            }
          });
          throw error;
        }
      });

      // Extract key metrics from the processing result
      const aiData = processingResult.aiData!;
      const qualityScore = aiData.analysis.qualityScore;
      const readabilityScore = aiData.analysis.readabilityScore;
      const securityClassification = aiData.security?.classification || 'INTERNAL';

      // Step 3: Send completion event
      await step.sendEvent("send-completion-event", {
        name: "document/process-full.completed",
        data: {
          documentId,
          organizationId,
          processingTime: Date.now() - startTime,
          qualityScore,
          readabilityScore,
          securityClassification,
        },
      });

      // Step 4: Create detailed notification
      await step.run("create-notification", async () => {
        const securityRisks = aiData.security?.securityRisks?.length || 0;
        const entitiesFound = aiData.analysis.entities.length;

        await prisma.notification.create({
          data: {
            organizationId,
            userId,
            type: 'DOCUMENT_ANALYZED',
            title: 'Document Analysis Complete',
            message: `Full analysis completed for "${document.name}". Quality: ${qualityScore}%, Readability: ${readabilityScore}%, ${entitiesFound} entities found${securityRisks > 0 ? `, ${securityRisks} security risks detected` : ''}`,
            metadata: {
              documentId,
              processingType: 'full',
              qualityScore,
              readabilityScore,
              securityClassification,
              entitiesFound,
              securityRisks,
              sectionsCount: aiData.structure.sections.length,
            },
            priority: securityRisks > 0 ? 'high' : 'medium',
            category: 'document',
          },
        });
      });

      // Step 5: If security risks detected, create additional security notification
      if (aiData.security?.securityRisks && aiData.security.securityRisks.length > 0) {
        await step.run("create-security-notification", async () => {
          await prisma.notification.create({
            data: {
              organizationId,
              userId,
              type: 'SECURITY_ALERT',
              title: 'Security Risks Detected',
              message: `Security analysis found ${aiData.security!.securityRisks.length} potential risks in "${document.name}"`,
              metadata: {
                documentId,
                securityRisks: aiData.security!.securityRisks,
                securityClassification: aiData.security!.classification,
                sensitiveDataDetected: aiData.security!.sensitiveDataDetected,
                sensitiveDataTypes: aiData.security!.sensitiveDataTypes,
              },
              priority: 'high',
              category: 'security',
            },
          });
        });
      }

      return {
        success: true,
        documentId,
        processingType: 'full',
        qualityScore,
        readabilityScore,
        securityClassification,
        entitiesFound: aiData.analysis.entities.length,
        sectionsExtracted: aiData.structure.sections.length,
        securityRisks: aiData.security?.securityRisks?.length || 0,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error(`❌ Full processing failed for document ${documentId}:`, error);

      // Update document status to failed
      await step.run("update-document-failed", async () => {
        const failedDoc = await prisma.document.findUnique({
          where: { id: documentId },
          select: { processing: true }
        });
        
        const failedProcessing = (failedDoc?.processing as any) || {};
        
        await prisma.document.update({
          where: { id: documentId },
          data: {
            processing: {
              ...failedProcessing,
              currentStatus: 'FAILED',
              progress: 0,
              currentStep: null,
              estimatedCompletion: null,
              events: [
                ...(failedProcessing.events || []),
                {
                  id: `event_${Date.now()}`,
                  userId: null,
                  event: 'Processing Failed',
                  eventType: 'FAILED',
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  timestamp: new Date().toISOString(),
                  duration: null,
                  metadata: null
                }
              ]
            }
          }
        });
      });

      // Send failure event
      await step.sendEvent("send-failure-event", {
        name: "document/process-full.failed",
        data: {
          documentId,
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Create error notification
      await step.run("create-error-notification", async () => {
        await prisma.notification.create({
          data: {
            organizationId,
            userId,
            type: 'DOCUMENT_ANALYSIS_FAILED',
            title: 'Document Analysis Failed',
            message: `Failed to analyze "${document?.name || 'document'}": ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: {
              documentId,
              processingType: 'full',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            priority: 'high',
            category: 'document',
          },
        });
      });

      throw error;
    }
  }
);