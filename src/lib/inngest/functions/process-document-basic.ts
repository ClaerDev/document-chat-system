import { inngest } from "../client";
import { documentProcessor } from "@/lib/ai/document-processor";
import { prisma } from "@/lib/db";

/**
 * Inngest function for basic document processing (text extraction + sections only)
 * This runs as a background job when documents are uploaded
 */
export const processDocumentBasic = inngest.createFunction(
  {
    id: "process-document-basic",
    name: "Process Document Basic",
    retries: 3,
    concurrency: {
      limit: 5, // Process max 5 documents concurrently (plan limit)
    },
  },
  { event: "document/process-basic.requested" },
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
              currentStatus: 'PROCESSING',
              progress: 10,
              currentStep: 'Basic Analysis',
              estimatedCompletion: null
            }
          }
        });

        return doc;
      });

      // Step 2: Process document with basic AI analysis
      const processingResult = await step.run("process-basic-content", async () => {
        const result = await documentProcessor.processDocumentBasic(
          documentId,
          (step: string, progress: number) => {
            console.log(`📊 Basic Processing [${documentId}]: ${step} - ${progress}%`);
          }
        );

        if (!result.success) {
          throw new Error(result.error || 'Basic processing failed');
        }

        return result;
      });

      // Step 3: Send completion event
      await step.sendEvent("send-completion-event", {
        name: "document/process-basic.completed",
        data: {
          documentId,
          organizationId,
          processingTime: Date.now() - startTime,
          extractedText: processingResult.aiData?.content.extractedText || '',
          sectionsCount: processingResult.aiData?.structure.sections.length || 0,
        },
      });

      // Step 4: Create notification if user is specified
      if (userId) {
        await step.run("create-notification", async () => {
          await prisma.notification.create({
            data: {
              organizationId,
              userId,
              type: 'DOCUMENT_PROCESSED',
              title: 'Document Upload Complete',
              message: `"${document.name}" has been processed and is ready for review`,
              metadata: {
                documentId,
                processingType: 'basic',
                sectionsCount: processingResult.aiData?.structure.sections.length || 0,
              },
              priority: 'low',
              category: 'document',
            },
          });
        });
      }

      return {
        success: true,
        documentId,
        processingType: 'basic',
        sectionsExtracted: processingResult.aiData?.structure.sections.length || 0,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error(`❌ Basic processing failed for document ${documentId}:`, error);

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
        name: "document/process-basic.failed",
        data: {
          documentId,
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Create error notification if user is specified
      if (userId) {
        await step.run("create-error-notification", async () => {
          await prisma.notification.create({
            data: {
              organizationId,
              userId,
              type: 'DOCUMENT_PROCESSING_FAILED',
              title: 'Document Processing Failed',
              message: `Failed to process "${document?.name || 'document'}": ${error instanceof Error ? error.message : 'Unknown error'}`,
              metadata: {
                documentId,
                processingType: 'basic',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              priority: 'high',
              category: 'document',
            },
          });
        });
      }

      throw error;
    }
  }
);