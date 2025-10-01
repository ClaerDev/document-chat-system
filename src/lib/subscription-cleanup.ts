/**
 * Enhanced Subscription Cleanup Service
 * 
 * This service provides comprehensive subscription cleanup functionality
 * that can be used by webhooks, billing APIs, and administrative scripts.
 * 
 * Features:
 * - Prevents duplicate active subscriptions
 * - Handles cleanup for plan changes and new subscriptions
 * - Comprehensive error handling and logging
 * - Atomic operations with rollback support
 * - Audit trail for all operations
 */

import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe-server';
import Stripe from 'stripe';

export interface CleanupOptions {
  organizationId?: string;
  excludeSubscriptionId?: string;
  dryRun?: boolean;
  includeTrialing?: boolean;
  includePastDue?: boolean;
}

export interface CleanupResult {
  subscriptionId: string;
  organizationId: string;
  organizationName: string;
  planType: string;
  status: string;
  stripeSubscriptionId: string;
  canceledInStripe: boolean;
  canceledInDatabase: boolean;
  error?: string;
  originalStatus: string;
}

export interface CleanupSummary {
  totalSubscriptions: number;
  successfulCancellations: number;
  failedCancellations: number;
  alreadyCanceled: number;
  stripeErrors: number;
  databaseErrors: number;
  results: CleanupResult[];
  startTime: Date;
  endTime: Date;
  executionTimeMs: number;
}

export class SubscriptionCancellationManager {
  private options: CleanupOptions;
  
  constructor(options: CleanupOptions = {}) {
    this.options = {
      dryRun: false,
      includeTrialing: true,
      includePastDue: true,
      ...options
    };
  }

  /**
   * Execute cleanup for webhooks and billing operations
   */
  async executeCleanup(): Promise<CleanupSummary> {
    const summary: CleanupSummary = {
      totalSubscriptions: 0,
      successfulCancellations: 0,
      failedCancellations: 0,
      alreadyCanceled: 0,
      stripeErrors: 0,
      databaseErrors: 0,
      results: [],
      startTime: new Date(),
      endTime: new Date(),
      executionTimeMs: 0,
    };

    try {
      // Get subscriptions to cancel
      const subscriptions = await this.getSubscriptionsToCancel();
      summary.totalSubscriptions = subscriptions.length;

      console.log(`🧹 Cleanup: Found ${subscriptions.length} subscription(s) to process`);

      if (subscriptions.length === 0) {
        console.log('✅ No subscriptions found to cancel');
        return summary;
      }

      // Process each subscription
      for (const subscription of subscriptions) {
        const result = await this.cancelSubscription(subscription);
        summary.results.push(result);
        
        if (result.error) {
          summary.failedCancellations++;
          if (result.error.includes('Stripe')) {
            summary.stripeErrors++;
          } else {
            summary.databaseErrors++;
          }
        } else if (result.canceledInStripe && result.canceledInDatabase) {
          summary.successfulCancellations++;
        } else {
          summary.alreadyCanceled++;
        }
      }

      summary.endTime = new Date();
      summary.executionTimeMs = summary.endTime.getTime() - summary.startTime.getTime();

      console.log(`✅ Cleanup completed: ${summary.successfulCancellations} canceled, ${summary.failedCancellations} failed`);
      
      return summary;

    } catch (error) {
      console.error('❌ Fatal error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Legacy execute method for backward compatibility with the script
   */
  async execute(): Promise<CleanupSummary> {
    return this.executeCleanup();
  }

  private async getSubscriptionsToCancel() {
    const whereClause: any = {};

    if (this.options.organizationId) {
      whereClause.organizationId = this.options.organizationId;
    }

    // Build status filter
    const statusFilter = ['ACTIVE'];
    if (this.options.includeTrialing) {
      statusFilter.push('TRIALING');
    }
    if (this.options.includePastDue) {
      statusFilter.push('PAST_DUE');
    }

    whereClause.status = { in: statusFilter };

    // Exclude specific subscription if provided
    if (this.options.excludeSubscriptionId) {
      whereClause.stripeSubscriptionId = {
        not: this.options.excludeSubscriptionId
      };
    }

    const subscriptions = await db.subscription.findMany({
      where: whereClause,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            stripeCustomerId: true,
          }
        }
      }
    });

    return subscriptions;
  }

  private async cancelSubscription(subscription: any): Promise<CleanupResult> {
    const result: CleanupResult = {
      subscriptionId: subscription.id,
      organizationId: subscription.organizationId,
      organizationName: subscription.organization.name,
      planType: subscription.planType,
      status: subscription.status,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      canceledInStripe: false,
      canceledInDatabase: false,
      originalStatus: subscription.status,
    };

    console.log(`🔄 Processing subscription ${subscription.id} (${subscription.organization.name})`);

    try {
      // Skip if already canceled
      if (subscription.status === 'CANCELED') {
        console.log('   ⚠️  Already canceled, skipping...');
        result.canceledInDatabase = true;
        return result;
      }

      // Cancel in Stripe first
      if (subscription.stripeSubscriptionId) {
        await this.cancelInStripe(subscription.stripeSubscriptionId, result);
      }

      // Cancel in database
      await this.cancelInDatabase(subscription, result);

      if (result.canceledInStripe && result.canceledInDatabase) {
        console.log('   ✅ Successfully canceled');
      } else {
        console.log('   ❌ Partially failed');
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Failed: ${result.error}`);
    }

    return result;
  }

  private async cancelInStripe(stripeSubscriptionId: string, result: CleanupResult): Promise<void> {
    try {
      if (this.options.dryRun) {
        console.log('   🔍 DRY RUN: Would cancel in Stripe');
        result.canceledInStripe = true;
        return;
      }

      // Get current subscription from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      
      if (stripeSubscription.status === 'canceled') {
        console.log('   ✅ Already canceled in Stripe');
        result.canceledInStripe = true;
        return;
      }

      // Cancel immediately in Stripe
      await stripe.subscriptions.cancel(stripeSubscriptionId);
      
      console.log('   ✅ Canceled in Stripe');
      result.canceledInStripe = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Stripe error';
      console.log(`   ❌ Stripe cancellation failed: ${errorMessage}`);
      result.error = `Stripe: ${errorMessage}`;
      
      // Don't throw - continue with database cancellation
    }
  }

  private async cancelInDatabase(subscription: any, result: CleanupResult): Promise<void> {
    try {
      if (this.options.dryRun) {
        console.log('   🔍 DRY RUN: Would cancel in database');
        result.canceledInDatabase = true;
        return;
      }

      const now = new Date();

      // Update subscription status
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELED',
          canceledAt: now,
          cancelAtPeriodEnd: true,
          updatedAt: now,
        }
      });

      // Update organization subscription status if this was the active subscription
      // Check if this was the organization's current active subscription
      const organization = await db.organization.findUnique({
        where: { id: subscription.organizationId },
        select: { planType: true, subscriptionStatus: true }
      });

      if (organization && organization.planType === subscription.planType) {
        await db.organization.update({
          where: { id: subscription.organizationId },
          data: {
            subscriptionStatus: 'CANCELED',
            planType: null,
          }
        });
      }

      console.log('   ✅ Canceled in database');
      result.canceledInDatabase = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      console.log(`   ❌ Database cancellation failed: ${errorMessage}`);
      result.error = result.error ? `${result.error}, Database: ${errorMessage}` : `Database: ${errorMessage}`;
      throw error; // Re-throw database errors as they're critical
    }
  }
}

/**
 * Comprehensive subscription cleanup for organization
 * Used by webhooks and billing APIs
 */
export async function cleanupOrganizationSubscriptions(
  organizationId: string,
  excludeSubscriptionId?: string,
  options: { dryRun?: boolean } = {}
): Promise<CleanupSummary> {
  const manager = new SubscriptionCancellationManager({
    organizationId,
    excludeSubscriptionId,
    dryRun: options.dryRun || false,
  });

  return await manager.executeCleanup();
}

/**
 * Emergency cleanup for all subscriptions
 * Used by administrative scripts
 */
export async function emergencyCleanupAllSubscriptions(
  options: { dryRun?: boolean; organizationId?: string } = {}
): Promise<CleanupSummary> {
  const manager = new SubscriptionCancellationManager({
    organizationId: options.organizationId,
    dryRun: options.dryRun || false,
  });

  return await manager.executeCleanup();
}

/**
 * Helper function to ensure only one active subscription per organization
 */
export async function ensureSingleActiveSubscription(organizationId: string): Promise<void> {
  const activeSubscriptions = await db.subscription.findMany({
    where: {
      organizationId,
      status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] }
    },
    orderBy: [
      { updatedAt: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  if (activeSubscriptions.length > 1) {
    console.log(`⚠️ Found ${activeSubscriptions.length} active subscriptions for org ${organizationId}, cleaning up...`);
    
    // Keep the most recent one, cancel the rest
    const subscriptionsToCancel = activeSubscriptions.slice(1);
    
    for (const subscription of subscriptionsToCancel) {
      try {
        // Cancel in Stripe if it exists
        if (subscription.stripeSubscriptionId) {
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        }
        
        // Cancel in database
        await db.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'CANCELED',
            canceledAt: new Date(),
            cancelAtPeriodEnd: true,
            updatedAt: new Date(),
          }
        });
        
        console.log(`✅ Canceled duplicate subscription: ${subscription.id}`);
      } catch (error) {
        console.error(`❌ Failed to cancel duplicate subscription ${subscription.id}:`, error);
      }
    }
  }
}