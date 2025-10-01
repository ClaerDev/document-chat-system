import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { ABTestManager } from '@/lib/ai/ab-testing/ab-test-manager';

const variantRequestSchema = z.object({
  testId: z.string().min(1)
    .describe("Unique identifier for the A/B test to assign a variant for. This determines which AI provider variant (Vercel AI SDK vs traditional) the user will be assigned to for consistent testing experience."),
  
  userId: z.string().min(1)
    .describe("User identifier for variant assignment. The system ensures consistent variant assignment for the same user throughout the test duration to maintain statistical validity and user experience consistency."),
  
  organizationId: z.string().min(1)
    .describe("Organization identifier for scoping the A/B test variant assignment. Ensures the variant assignment respects organization-level configurations and contributes to organization-specific performance analysis.")
});

/**
 * @swagger
 * /api/ai/ab-testing/variant:
 *   post:
 *     summary: Get A/B test variant assignment for a user
 *     description: Returns the assigned variant for a user in an A/B test
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testId
 *               - userId
 *               - organizationId
 *             properties:
 *               testId:
 *                 type: string
 *                 description: The A/B test ID
 *               userId:
 *                 type: string
 *                 description: The user ID
 *               organizationId:
 *                 type: string
 *                 description: The organization ID
 *     responses:
 *       200:
 *         description: Variant assignment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 variant:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     provider:
 *                       type: string
 *                       enum: [vercel, traditional]
 *                     weight:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId } = await auth();
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = variantRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { testId, userId, organizationId } = validation.data;

    const abTestManager = ABTestManager.getInstance();
    const variant = await abTestManager.getVariantForUser(
      testId,
      userId,
      organizationId
    );

    return NextResponse.json({ variant });
  } catch (error) {
    console.error('Failed to get A/B test variant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}