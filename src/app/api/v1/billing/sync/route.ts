import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe-server';
import { createErrorResponse, handleApiError } from '@/lib/api-errors';
import { SubscriptionManager } from '@/lib/subscription-manager';

/**
 * Manual sync endpoint to pull subscription data from Stripe
 * This is useful when webhooks aren't working or when manual changes are made in Stripe
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Manual subscription sync started');

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return createErrorResponse('Stripe is not configured', 503, 'STRIPE_NOT_CONFIGURED');
    }

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
      where: { id: organizationId }
    });

    if (!organization) {
      return createErrorResponse('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    if (!organization.stripeCustomerId) {
      return createErrorResponse('No Stripe customer found', 404, 'NO_STRIPE_CUSTOMER');
    }

    console.log(`🔄 Force syncing all subscriptions for customer: ${organization.stripeCustomerId}`);

    // **ENHANCED**: Use SubscriptionManager for comprehensive sync
    const syncResult = await SubscriptionManager.syncAllSubscriptionsFromStripe(organizationId);

    console.log(`✅ Sync completed: ${syncResult.syncedCount} subscriptions synced, ${syncResult.errors.length} errors`);

    if (syncResult.errors.length > 0) {
      console.warn('Sync completed with errors:', syncResult.errors);
    }

    return NextResponse.json({
      success: true,
      syncedSubscriptions: syncResult.syncedCount,
      activeSubscription: syncResult.activeSubscription ? {
        id: syncResult.activeSubscription.id,
        planType: syncResult.activeSubscription.planType,
        status: syncResult.activeSubscription.status
      } : null,
      organizationStatus: {
        subscriptionStatus: syncResult.activeSubscription ? syncResult.activeSubscription.status : 'CANCELED',
        planType: syncResult.activeSubscription ? syncResult.activeSubscription.planType : null
      },
      errors: syncResult.errors
    });

  } catch (error) {
    console.error('Error syncing subscription:', error);
    return handleApiError(error);
  }
}

// Helper functions (duplicated from webhook handler)
function getPlanTypeFromSubscription(subscription: any): string {
  // First check metadata
  if (subscription.metadata?.planType) {
    return subscription.metadata.planType;
  }
  
  // Map price ID to plan type
  const priceId = subscription.items.data[0]?.price.id;
  if (priceId) {
    const priceIdToPlan: Record<string, string> = {
      'price_1Rh465QEGVp7c1lx569CvH1O': 'STARTER',
      'price_1Rh465QEGVp7c1lxXTDm7WaT': 'PROFESSIONAL', 
      'price_1Rh466QEGVp7c1lxpqhF84Tb': 'AGENCY',
    };
    
    if (priceIdToPlan[priceId]) {
      return priceIdToPlan[priceId];
    }
  }
  
  // Default fallback
  return 'STARTER';
}

function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'trialing': 'TRIALING',
    'active': 'ACTIVE',
    'past_due': 'PAST_DUE',
    'canceled': 'CANCELED',
    'unpaid': 'UNPAID',
    'incomplete': 'INCOMPLETE',
    'incomplete_expired': 'INCOMPLETE_EXPIRED',
    'paused': 'PAUSED',
  };

  return statusMap[stripeStatus] || 'ACTIVE';
}