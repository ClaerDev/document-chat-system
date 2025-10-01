'use client';

import { useState, useCallback } from 'react';
import { useNotify } from '@/contexts/notification-context';

interface UsageCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remainingUsage: number;
  percentUsed: number;
  willExceedLimit: boolean;
  canProceed: boolean;
  warningMessage?: string;
  upgradeMessage?: string;
  isDeveloperOverride?: boolean;
}

interface UseUsageCheckReturn {
  checkUsage: (usageType: string, quantity?: number) => Promise<UsageCheckResult | null>;
  isChecking: boolean;
  showUsageWarning: (result: UsageCheckResult, onProceed?: () => void, onUpgrade?: () => void) => void;
}

export function useUsageCheck(): UseUsageCheckReturn {
  const [isChecking, setIsChecking] = useState(false);
  const notify = useNotify();

  const checkUsage = useCallback(async (
    usageType: string, 
    quantity = 1
  ): Promise<UsageCheckResult | null> => {
    setIsChecking(true);
    
    try {
      const response = await fetch('/api/v1/billing/usage/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usageType,
          quantity
        })
      });

      if (!response.ok) {
        console.error('Usage check failed:', response.status, response.statusText);
        return null;
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking usage:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const showUsageWarning = useCallback((
    result: UsageCheckResult,
    onProceed?: () => void,
    onUpgrade?: () => void
  ) => {
    console.log('🔍 Usage warning check:', {
      isDeveloperOverride: result.isDeveloperOverride,
      canProceed: result.canProceed,
      warningMessage: result.warningMessage,
      currentUsage: result.currentUsage,
      limit: result.limit
    });

    if (result.isDeveloperOverride) {
      notify.warning(
        'Developer Mode Warning',
        `This action would exceed your limit for regular users (${result.currentUsage}/${result.limit}) - Proceeding anyway in development mode`
      );
      console.log('✅ Developer override - proceeding with action');
      if (onProceed) {
        onProceed();
      }
    } else if (!result.canProceed) {
      notify.error(
        'Usage Limit Reached',
        result.warningMessage || 'You have reached your usage limit for this feature.'
      );
      console.log('❌ Usage limit reached - blocking action');
    } else if (result.warningMessage) {
      // Show warning but still proceed
      notify.warning(
        'Usage Warning',
        result.warningMessage
      );
      console.log('⚠️ Usage warning shown - proceeding with action');
      if (onProceed) {
        onProceed();
      }
    } else {
      console.log('✅ No usage issues - proceeding with action');
      if (onProceed) {
        onProceed();
      }
    }
  }, [notify]);

  return {
    checkUsage,
    isChecking,
    showUsageWarning
  };
}

// Hook for specific usage types
export function useMatchScoreUsage() {
  const { checkUsage, isChecking, showUsageWarning } = useUsageCheck();

  const checkMatchScoreUsage = useCallback(async (quantity = 1) => {
    return await checkUsage('MATCH_SCORE_CALCULATION', quantity);
  }, [checkUsage]);

  const checkAndProceedWithMatchScore = useCallback(async (
    quantity: number,
    onProceed: () => void,
    onUpgrade?: () => void,
    silent = false // New parameter to skip notifications
  ) => {
    console.log(`🎯 Checking match score usage for ${quantity} opportunities (silent: ${silent})`);
    
    const result = await checkMatchScoreUsage(quantity);
    
    if (!result) {
      console.warn('⚠️ Failed to check match score usage - proceeding in development mode');
      // In development, if usage check fails, proceed anyway
      onProceed();
      return true;
    }

    console.log('📊 Match score usage check result:', {
      canProceed: result.canProceed,
      currentUsage: result.currentUsage,
      limit: result.limit,
      percentUsed: result.percentUsed,
      isDeveloperOverride: result.isDeveloperOverride,
      warningMessage: result.warningMessage,
      silent
    });

    if (result.canProceed || result.isDeveloperOverride) {
      if (silent) {
        // Silent mode: skip all notifications even if there would be warnings
        console.log('🤫 Silent mode - skipping notifications and proceeding');
        onProceed();
      } else if (result.warningMessage || result.isDeveloperOverride) {
        console.log('⚠️ Showing usage warning but proceeding with calculation');
        showUsageWarning(result, onProceed, onUpgrade);
      } else {
        console.log('✅ No usage issues - proceeding directly with calculation');
        onProceed();
      }
      return true;
    } else {
      console.log('🚫 Usage limit exceeded - blocking calculation');
      if (!silent) {
        showUsageWarning(result, undefined, onUpgrade);
      }
      return false;
    }
  }, [checkMatchScoreUsage, showUsageWarning]);

  return {
    checkMatchScoreUsage,
    checkAndProceedWithMatchScore,
    isChecking
  };
}

export function useAIQueryUsage() {
  const { checkUsage, isChecking, showUsageWarning } = useUsageCheck();

  const checkAIQueryUsage = useCallback(async (quantity = 1) => {
    return await checkUsage('AI_QUERY', quantity);
  }, [checkUsage]);

  const checkAndProceedWithAIQuery = useCallback(async (
    quantity: number,
    onProceed: () => void,
    onUpgrade?: () => void
  ) => {
    const result = await checkAIQueryUsage(quantity);
    
    if (!result) {
      console.error('Failed to check AI query usage');
      return false;
    }

    if (result.canProceed) {
      if (result.warningMessage) {
        showUsageWarning(result, onProceed, onUpgrade);
      } else {
        onProceed();
      }
      return true;
    } else {
      showUsageWarning(result, undefined, onUpgrade);
      return false;
    }
  }, [checkAIQueryUsage, showUsageWarning]);

  return {
    checkAIQueryUsage,
    checkAndProceedWithAIQuery,
    isChecking
  };
}