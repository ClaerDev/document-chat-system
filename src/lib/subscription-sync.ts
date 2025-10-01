/**
 * Subscription Sync Utilities
 * 
 * Alternative to webhooks - provides immediate sync functionality
 * to be used after subscription creation/updates.
 */

import { SubscriptionManager } from './subscription-manager';

interface SyncOptions {
  delay?: number; // Delay in milliseconds before syncing
  retries?: number; // Number of retry attempts
  backgroundSync?: boolean; // Whether to sync in background
}

export class SubscriptionSync {
  /**
   * Sync subscription data immediately after a Stripe operation
   * This replaces the need for webhooks by proactively syncing
   */
  static async syncAfterStripeOperation(
    organizationId: string,
    options: SyncOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    const {
      delay = 2000, // Default 2 second delay to let Stripe process
      retries = 3,
      backgroundSync = true
    } = options;

    const syncFunction = async (attempt: number = 1): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log(`🔄 Syncing subscriptions for org ${organizationId} (attempt ${attempt})`);
        
        // Wait for Stripe to process the operation
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Sync all subscriptions for this organization
        const result = await SubscriptionManager.syncAllSubscriptionsFromStripe(organizationId);
        
        if (result.errors.length > 0) {
          console.warn(`⚠️ Sync completed with errors:`, result.errors);
          
          // If we have retries left and there were errors, retry
          if (attempt < retries) {
            console.log(`🔄 Retrying sync (attempt ${attempt + 1}/${retries})`);
            return syncFunction(attempt + 1);
          }
        }

        console.log(`✅ Sync completed: ${result.syncedCount} subscriptions synced`);
        
        return { 
          success: true,
          error: result.errors.length > 0 ? result.errors.join(', ') : undefined
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
        console.error(`❌ Sync attempt ${attempt} failed:`, error);

        // Retry if we have attempts left
        if (attempt < retries) {
          console.log(`🔄 Retrying sync after error (attempt ${attempt + 1}/${retries})`);
          
          // Exponential backoff for retries
          const retryDelay = delay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          return syncFunction(attempt + 1);
        }

        return { success: false, error: errorMessage };
      }
    };

    if (backgroundSync) {
      // Don't await - let it run in background
      syncFunction().catch(error => {
        console.error('Background sync failed:', error);
      });
      
      return { success: true }; // Return immediately for background sync
    } else {
      // Wait for sync to complete
      return await syncFunction();
    }
  }

  /**
   * Sync subscription for a specific Stripe subscription ID
   * Useful when you know the exact subscription that was created/updated
   */
  static async syncSpecificSubscription(
    stripeSubscriptionId: string,
    organizationId: string,
    options: SyncOptions = {}
  ): Promise<{ success: boolean; subscription?: any; error?: string }> {
    const { delay = 1000, retries = 2 } = options;

    try {
      console.log(`🎯 Syncing specific subscription: ${stripeSubscriptionId}`);
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Import stripe here to avoid circular dependencies
      const { stripe } = await import('./stripe-server');
      
      // Fetch the specific subscription from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      
      // Sync it to the database
      const syncedSubscription = await SubscriptionManager.syncSubscriptionToDatabase(
        stripeSubscription,
        organizationId
      );

      console.log(`✅ Specific subscription synced: ${stripeSubscriptionId} -> ${syncedSubscription.id}`);

      return { 
        success: true, 
        subscription: syncedSubscription 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to sync specific subscription ${stripeSubscriptionId}:`, error);

      // Single retry for specific subscription sync
      if (retries > 0) {
        console.log(`🔄 Retrying specific subscription sync...`);
        
        await new Promise(resolve => setTimeout(resolve, delay * 2));
        
        return this.syncSpecificSubscription(
          stripeSubscriptionId, 
          organizationId, 
          { ...options, retries: retries - 1 }
        );
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Smart sync that only syncs if data appears stale
   * Useful for UI components that need fresh data
   */
  static async smartSync(
    organizationId: string,
    maxAgeMinutes: number = 5
  ): Promise<{ synced: boolean; subscription?: any; error?: string }> {
    try {
      // Check current subscription age
      const currentSubscription = await SubscriptionManager.getCurrentSubscription(organizationId);
      
      if (currentSubscription) {
        const ageMinutes = (Date.now() - currentSubscription.updatedAt.getTime()) / (1000 * 60);
        
        if (ageMinutes < maxAgeMinutes) {
          console.log(`ℹ️ Subscription data is fresh (${ageMinutes.toFixed(1)} min old), no sync needed`);
          return { synced: false, subscription: currentSubscription };
        }
      }

      console.log(`🔄 Subscription data is stale, performing smart sync...`);
      
      // Sync and return fresh data
      const syncResult = await this.syncAfterStripeOperation(organizationId, {
        delay: 0, // No delay for smart sync
        backgroundSync: false // Wait for completion
      });

      if (syncResult.success) {
        const freshSubscription = await SubscriptionManager.getCurrentSubscription(organizationId);
        return { 
          synced: true, 
          subscription: freshSubscription,
          error: syncResult.error
        };
      } else {
        return { 
          synced: false, 
          subscription: currentSubscription,
          error: syncResult.error 
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Smart sync failed:', error);
      
      return { synced: false, error: errorMessage };
    }
  }

  /**
   * Validate that sync is working by comparing Stripe vs Database
   * Useful for monitoring and debugging
   */
  static async validateSync(organizationId: string): Promise<{
    isInSync: boolean;
    stripeSubscriptions: number;
    databaseSubscriptions: number;
    issues?: string[];
  }> {
    try {
      const { stripe } = await import('./stripe-server');
      
      // Get organization
      const { db } = await import('./db');
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        include: {
          subscriptions: {
            where: {
              status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] }
            }
          }
        }
      });

      if (!organization) {
        return {
          isInSync: false,
          stripeSubscriptions: 0,
          databaseSubscriptions: 0,
          issues: ['Organization not found']
        };
      }

      if (!organization.stripeCustomerId) {
        return {
          isInSync: true, // No Stripe customer = no subscriptions expected
          stripeSubscriptions: 0,
          databaseSubscriptions: organization.subscriptions.length,
          issues: organization.subscriptions.length > 0 ? ['Database subscriptions exist but no Stripe customer'] : undefined
        };
      }

      // Get Stripe subscriptions
      const stripeSubscriptions = await stripe.subscriptions.list({
        customer: organization.stripeCustomerId,
        status: 'all'
      });

      const activeStripeSubscriptions = stripeSubscriptions.data.filter(sub =>
        ['active', 'trialing', 'past_due'].includes(sub.status)
      );

      const issues: string[] = [];
      
      // Check for mismatches
      if (activeStripeSubscriptions.length !== organization.subscriptions.length) {
        issues.push(`Subscription count mismatch: ${activeStripeSubscriptions.length} in Stripe, ${organization.subscriptions.length} in database`);
      }

      // Check for missing subscriptions
      const stripeSubIds = activeStripeSubscriptions.map(sub => sub.id);
      const dbSubIds = organization.subscriptions.map(sub => sub.stripeSubscriptionId);
      
      const missingInDb = stripeSubIds.filter(id => !dbSubIds.includes(id));
      const missingInStripe = dbSubIds.filter(id => !stripeSubIds.includes(id));

      if (missingInDb.length > 0) {
        issues.push(`Subscriptions in Stripe but not in database: ${missingInDb.join(', ')}`);
      }

      if (missingInStripe.length > 0) {
        issues.push(`Subscriptions in database but not in Stripe: ${missingInStripe.join(', ')}`);
      }

      return {
        isInSync: issues.length === 0,
        stripeSubscriptions: activeStripeSubscriptions.length,
        databaseSubscriptions: organization.subscriptions.length,
        issues: issues.length > 0 ? issues : undefined
      };

    } catch (error) {
      console.error('❌ Sync validation failed:', error);
      
      return {
        isInSync: false,
        stripeSubscriptions: 0,
        databaseSubscriptions: 0,
        issues: [error instanceof Error ? error.message : 'Unknown validation error']
      };
    }
  }
}