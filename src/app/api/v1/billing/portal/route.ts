import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe-server';
import { createErrorResponse, handleApiError } from '@/lib/api-errors';

/**
 * @swagger
 * /api/billing/portal:
 *   post:
 *     summary: Create Stripe customer portal session
 *     description: Creates a Stripe customer portal session for subscription management
 *     tags: [Billing]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to return to after portal session
 *     responses:
 *       200:
 *         description: Portal session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 portalUrl:
 *                   type: string
 *                   description: Stripe customer portal URL
 *       400:
 *         description: Invalid request or no Stripe customer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await currentUser();
    if (!user) {
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get user's organization from database
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true }
    });
    
    if (!dbUser) {
      return createErrorResponse('User not found in database', 404, 'USER_NOT_FOUND');
    }
    
    const organizationId = dbUser.organizationId;

    if (!organizationId) {
      return createErrorResponse('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { stripeCustomerId: true }
    });

    if (!organization?.stripeCustomerId) {
      console.log('Portal access attempt - No Stripe customer:', { 
        organizationId, 
        hasOrganization: !!organization 
      });
      return createErrorResponse(
        'No Stripe customer found. You need to create a subscription before accessing the billing portal.', 
        400, 
        'NO_STRIPE_CUSTOMER'
      );
    }

    const body = await request.json();
    const returnUrl = body.returnUrl || `${request.headers.get('origin')}/billing`;

    console.log('Creating portal session:', {
      customerId: organization.stripeCustomerId,
      returnUrl
    });

    // Create customer portal session
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: organization.stripeCustomerId,
        return_url: returnUrl,
      });

      return NextResponse.json({
        portalUrl: portalSession.url
      });
    } catch (stripeError: any) {
      console.error('Stripe portal error:', stripeError);
      
      // Handle specific Stripe errors
      if (stripeError.code === 'customer_portal_not_configured' || 
          stripeError.message?.includes('No configuration provided')) {
        return createErrorResponse(
          'The Stripe customer portal needs to be configured. Please visit https://dashboard.stripe.com/test/settings/billing/portal to set it up, or contact support for assistance.',
          400,
          'PORTAL_NOT_CONFIGURED'
        );
      }
      
      if (stripeError.code === 'resource_missing') {
        return createErrorResponse(
          'Customer not found in Stripe. Please contact support.',
          404,
          'STRIPE_CUSTOMER_NOT_FOUND'
        );
      }
      
      // Generic Stripe error
      return createErrorResponse(
        'Failed to create portal session. Please try again or contact support.',
        500,
        'STRIPE_ERROR',
        { stripeCode: stripeError.code, stripeType: stripeError.type }
      );
    }

  } catch (error) {
    console.error('Error creating portal session:', error);
    return handleApiError(error);
  }
}