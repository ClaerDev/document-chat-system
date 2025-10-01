import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest/client";
import * as functions from "../../../lib/inngest/functions";

/**
 * Inngest API route handler
 * This serves the Inngest dashboard and handles function execution
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: Object.values(functions),
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
