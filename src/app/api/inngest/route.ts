import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest/client";
import * as functions from "../../../lib/inngest/functions";

/**
 * Inngest API route handler
 * This serves the Inngest dashboard and handles function execution
 */

// Debug: Log signing key presence (not the actual key for security)
console.log('[Inngest] Signing key present:', !!process.env.INNGEST_SIGNING_KEY);
console.log('[Inngest] Signing key length:', process.env.INNGEST_SIGNING_KEY?.length);
console.log('[Inngest] Signing key starts with:', process.env.INNGEST_SIGNING_KEY?.substring(0, 15));

// Create the serve handlers with proper configuration
const handler = serve({
  client: inngest,
  functions: Object.values(functions),
  // Only use signing key in production - dev mode doesn't need it and causes issues
  signingKey: process.env.NODE_ENV === 'production' ? process.env.INNGEST_SIGNING_KEY : undefined,
  // Disable landing page in production
  landingPage: process.env.NODE_ENV !== 'production',
  // Force streaming mode to prevent body parsing issues with PUT requests
  streaming: 'force',
});

// Export handlers - streaming mode handles all methods properly
export const { GET, POST, PUT } = handler;
