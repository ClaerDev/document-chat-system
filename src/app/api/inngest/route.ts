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

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: Object.values(functions),
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
