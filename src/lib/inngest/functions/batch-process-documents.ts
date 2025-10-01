import { inngest } from "../client";
import { prisma } from "@/lib/db";

/**
 * Inngest function to process multiple documents in batch
 * This orchestrates individual document scoring jobs
 */
export const batchProcessDocuments = inngest.createFunction(
  {
    id: "batch-process-documents",
    name: "Batch Process Documents",
    retries: 2,
  },
  { event: "document/batch.process" },
  async ({ event, step }) => {
    const { batchId, documentIds, organizationId, userId, options } = event.data;
    const startTime = Date.now();

    try {
      // Step 1: Validate documents exist
      const documents = await step.run("validate-documents", async () => {
        const docs = await prisma.document.findMany({
          where: {
            id: { in: documentIds },
            organizationId: organizationId,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (docs.length !== documentIds.length) {
          const foundIds = docs.map(d => d.id);
          const missingIds = documentIds.filter(id => !foundIds.includes(id));
          throw new Error(`Documents not found: ${missingIds.join(', ')}`);
        }

        return docs;
      });

      // Step 2: Create batch processing record
      await step.run("create-batch-record", async () => {
        await prisma.batchProcessing.create({
          data: {
            id: batchId,
            organizationId,
            userId,
            totalDocuments: documents.length,
            status: 'processing',
            metadata: {
              documentIds,
              options,
              startedAt: new Date().toISOString(),
            },
          },
        });
      });

      // Step 3: Send individual scoring events for each document
      const scoringJobs = await step.run("dispatch-scoring-jobs", async () => {
        const jobs = await Promise.all(
          documents.map(async (doc) => {
            await inngest.send({
              name: "document/score.requested",
              data: {
                documentId: doc.id,
                organizationId,
                userId,
                options: {
                  ...options,
                  batchId, // Include batch ID for tracking
                },
              },
            });

            return {
              documentId: doc.id,
              documentName: doc.name,
              status: 'dispatched',
            };
          })
        );

        return jobs;
      });

      // Step 4: Wait for all documents to be processed
      // In a real implementation, this would monitor the individual jobs
      // For now, we'll simulate waiting
      const results = await step.sleep("wait-for-processing", "30s");

      // Step 5: Aggregate results
      const processedResults = await step.run("aggregate-results", async () => {
        // Query for completed documents in this batch
        const processedDocs = await prisma.document.findMany({
          where: {
            id: { in: documentIds },
            // Check both new aiData structure and legacy field for compatibility
            OR: [
              { aiData: { path: ['status', 'status'], equals: 'COMPLETED' } },
              { aiProcessingStatus: 'completed' }
            ]
          },
          select: {
            id: true,
            name: true,
            aiData: true,
            scoreValue: true,
            aiProcessingStatus: true,
          },
        });

        const failedDocs = await prisma.document.findMany({
          where: {
            id: { in: documentIds },
            OR: [
              { aiData: { path: ['status', 'status'], equals: 'FAILED' } },
              { aiProcessingStatus: 'failed' }
            ]
          },
          select: {
            id: true,
            name: true,
            aiData: true,
            aiProcessingStatus: true,
          },
        });

        return {
          processed: processedDocs.length,
          failed: failedDocs.length,
          successfulDocs: processedDocs,
          failedDocs: failedDocs,
        };
      });

      // Step 6: Update batch record
      await step.run("update-batch-record", async () => {
        await prisma.batchProcessing.update({
          where: { id: batchId },
          data: {
            status: 'completed',
            processedDocuments: processedResults.processed,
            failedDocuments: processedResults.failed,
            completedAt: new Date(),
            metadata: {
              ...(await prisma.batchProcessing.findUnique({ where: { id: batchId }, select: { metadata: true } }))?.metadata as any,
              completedAt: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              results: processedResults,
            },
          },
        });
      });

      // Step 7: Send completion event
      await step.sendEvent("send-batch-completion", {
        name: "document/batch.completed",
        data: {
          batchId,
          organizationId,
          processedCount: processedResults.processed,
          failedCount: processedResults.failed,
          totalTime: Date.now() - startTime,
        },
      });

      // Step 8: Create completion notification
      await step.run("create-completion-notification", async () => {
        await prisma.notification.create({
          data: {
            organizationId,
            userId,
            type: 'BATCH_PROCESSING_COMPLETED',
            title: 'Batch Processing Complete',
            message: `Batch processing completed: ${processedResults.processed} succeeded, ${processedResults.failed} failed`,
            metadata: {
              batchId,
              processed: processedResults.processed,
              failed: processedResults.failed,
              totalDocuments: documents.length,
            },
            priority: 'medium',
            category: 'document',
          },
        });
      });

      return {
        success: true,
        batchId,
        processed: processedResults.processed,
        failed: processedResults.failed,
        total: documents.length,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      // Update batch record as failed
      await step.run("update-batch-failed", async () => {
        await prisma.batchProcessing.update({
          where: { id: batchId },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          },
        });
      });

      // Send failure event
      await step.sendEvent("send-batch-failure", {
        name: "document/batch.failed",
        data: {
          batchId,
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
            type: 'BATCH_PROCESSING_FAILED',
            title: 'Batch Processing Failed',
            message: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: {
              batchId,
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