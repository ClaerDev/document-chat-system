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

// Create the serve handlers with error handling
const handler = serve({
  client: inngest,
  functions: Object.values(functions),
  signingKey: process.env.INNGEST_SIGNING_KEY,
  // Add landingPage: false in production to avoid issues with empty PUT requests
  landingPage: process.env.NODE_ENV !== 'production',
});

// Export handlers with error handling for empty request bodies
export const GET = handler.GET;
export const POST = handler.POST;

// Wrap PUT handler to handle empty body errors gracefully
export async function PUT(request: Request) {
  try {
    // Check if request has a body before trying to parse
    const contentLength = request.headers.get('content-length');
    if (!contentLength || contentLength === '0') {
      console.log('[Inngest] PUT request with empty body, returning 200');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return handler.PUT(request);
  } catch (error) {
    // Handle JSON parsing errors gracefully
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.log('[Inngest] PUT request JSON parsing error, returning 200');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw error;
  }
}
