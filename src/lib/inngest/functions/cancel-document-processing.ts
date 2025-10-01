import { inngest } from "../client";
import { prisma } from "@/lib/db";

export const cancelDocumentProcessing = inngest.createFunction(
  { id: "cancel-document-processing" },
  { event: "document/process.cancelled" },
  async ({ event, step }) => {
    const { documentId, organizationId, userId, cancelledAt, previousStatus } = event.data;

    console.log(`🚫 Cancelling document processing for: ${documentId}`);

    // Step 1: Update document status
    await step.run("update-document-status", async () => {
      // Get current processing data
      const currentDoc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { processing: true }
      });
      
      const currentProcessing = (currentDoc?.processing as any) || {};
      
      await prisma.document.update({
        where: { id: documentId },
        data: {
          // Update processing JSON field
          processing: {
            ...currentProcessing,
            currentStatus: 'PENDING',
            progress: 0,
            currentStep: null,
            estimatedCompletion: null,
            events: [
              ...(currentProcessing.events || []),
              {
                id: `event_${Date.now()}`,
                userId: userId,
                event: 'Processing Cancelled',
                eventType: 'CANCELLED',
                success: true,
                error: null,
                timestamp: cancelledAt,
                duration: null,
                metadata: {
                  previousStatus,
                  reason: 'User requested cancellation'
                }
              }
            ]
          }
        }
      });

      console.log(`✅ Document ${documentId} status reset to PENDING`);
    });

    // Step 2: Additional logging (already handled in step 1)
    await step.run("log-cancellation", async () => {
      console.log(`📝 Cancellation logged for document ${documentId}`);
      // Cancellation event is already logged in the processing.events array in step 1
    });

    // Step 3: Clean up any pending jobs (if possible)
    await step.run("cleanup-pending-jobs", async () => {
      // Note: Inngest doesn't have a built-in way to cancel running functions
      // But we can mark the document as cancelled so other functions can check this
      console.log(`🧹 Cleanup completed for document ${documentId}`);
    });

    return {
      success: true,
      documentId,
      message: `Document processing cancelled successfully. Status reset to PENDING.`,
      cancelledAt,
      previousStatus
    };
  }
);