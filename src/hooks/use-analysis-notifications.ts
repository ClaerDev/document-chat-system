/**
 * Hook for listening to analysis completion events and showing notifications
 * 
 * This integrates with our existing notification system to show user-friendly
 * messages when background analysis completes.
 */

import { useEffect } from 'react';
import { useNotifications } from '@/contexts/notification-context';

export function useAnalysisNotifications() {
  const { success, error } = useNotifications();

  useEffect(() => {
    const handleAnalysisComplete = (event: CustomEvent) => {
      const { opportunityTitle, competitorsCount, contractsCount, message } = event.detail;
      
      success(
        'Analysis Complete',
        message,
        {
          duration: 8000, // Show for 8 seconds
          action: {
            label: 'View Results',
            onClick: () => {
              // Focus the opportunity details page (if it's currently open)
              const opportunityDetailElement = document.querySelector('[data-opportunity-detail]');
              if (opportunityDetailElement) {
                opportunityDetailElement.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }
        }
      );
    };

    const handleAnalysisError = (event: CustomEvent) => {
      const { opportunityTitle, errorMessage } = event.detail;
      
      error(
        'Analysis Failed',
        errorMessage || `Failed to analyze ${opportunityTitle}. Please try again.`,
        {
          duration: 10000, // Show errors longer
          persistent: false
        }
      );
    };

    // Listen for custom events from the store
    window.addEventListener('analysis-complete', handleAnalysisComplete as EventListener);
    window.addEventListener('analysis-error', handleAnalysisError as EventListener);

    return () => {
      window.removeEventListener('analysis-complete', handleAnalysisComplete as EventListener);
      window.removeEventListener('analysis-error', handleAnalysisError as EventListener);
    };
  }, [success, error]);

  return null; // This hook doesn't return anything, just sets up listeners
}