/**
 * Zustand Store for MatchScore Management
 * 
 * Manages match scores with support for both calculation-based and LLM-enhanced scoring
 * Aligned with the comprehensive algorithm from LLM-based Scoring algorithm.md
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  MatchScore, 
  CreateMatchScoreInput, 
  UpdateMatchScoreInput,
  CalculateMatchScoreRequest,
  MatchScoreResponse 
} from '@/lib/validations/match-score';

// ==========================================
// Store State Interface
// ==========================================

interface MatchScoreState {
  // Core data
  scores: Record<string, MatchScore>; // Keyed by score ID
  scoringHistory: Record<string, MatchScore[]>; // Keyed by profileId-opportunityId
  
  // UI state
  isCalculating: boolean;
  calculatingOpportunities: Set<string>; // Track which opportunities are being scored
  selectedScore: MatchScore | null;
  
  // LLM-specific state
  llmAnalysisCache: Record<string, any>; // Cache semantic analysis results
  strategicInsightsCache: Record<string, any>; // Cache strategic insights
  
  // Filtering and sorting
  filters: {
    algorithmVersion?: string;
    scoringMethod?: 'calculation' | 'llm' | 'hybrid';
    minScore?: number;
    maxScore?: number;
    hasUserFeedback?: boolean;
    markedAsReviewed?: boolean;
  };
  sortBy: 'score' | 'confidence' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  
  // Performance tracking
  accuracyMetrics: {
    totalPredictions: number;
    correctPredictions: number;
    averageConfidence: number;
    winRateByScore: Record<string, number>; // Win rate by score range
  };
  
  // Error handling
  lastError: string | null;
  retryQueue: CalculateMatchScoreRequest[];
}

// ==========================================
// Store Actions Interface
// ==========================================

interface MatchScoreActions {
  // Core CRUD operations
  addScore: (score: MatchScore) => void;
  updateScore: (id: string, updates: Partial<MatchScore>) => void;
  removeScore: (id: string) => void;
  getScore: (id: string) => MatchScore | null;
  getScoreByOpportunityAndProfile: (opportunityId: string, profileId: string, algorithmVersion?: string) => MatchScore | null;
  
  // Scoring operations
  calculateScore: (request: CalculateMatchScoreRequest) => Promise<MatchScoreResponse>;
  calculateLLMScore: (opportunityId: string, profileId: string, options?: any) => Promise<MatchScoreResponse>;
  recalculateScore: (scoreId: string, method?: 'calculation' | 'llm' | 'hybrid') => Promise<MatchScoreResponse>;
  
  // Batch operations
  calculateBatchScores: (requests: CalculateMatchScoreRequest[]) => Promise<MatchScoreResponse[]>;
  loadScoresForProfile: (profileId: string) => Promise<void>;
  loadScoresForOpportunity: (opportunityId: string) => Promise<void>;
  
  // User feedback
  submitFeedback: (scoreId: string, feedback: string, rating?: number) => Promise<void>;
  markAsReviewed: (scoreId: string) => Promise<void>;
  updateActualOutcome: (scoreId: string, outcome: 'won' | 'lost' | 'no_bid' | 'withdrawn') => Promise<void>;
  
  // Analytics and insights
  getScoreStatistics: (profileId?: string) => {
    averageScore: number;
    averageConfidence: number;
    totalScores: number;
    scoreDistribution: Record<string, number>;
    algorithmVersionDistribution: Record<string, number>;
  };
  getWinRateAnalysis: () => {
    overallWinRate: number;
    winRateByScoreRange: Record<string, number>;
    confidenceAccuracy: number;
  };
  
  // LLM-specific operations
  getSemanticAnalysis: (scoreId: string) => any | null;
  getStrategicInsights: (scoreId: string) => any | null;
  regenerateInsights: (scoreId: string) => Promise<void>;
  
  // Filtering and sorting
  setFilters: (filters: Partial<MatchScoreState['filters']>) => void;
  clearFilters: () => void;
  setSorting: (sortBy: MatchScoreState['sortBy'], sortOrder: MatchScoreState['sortOrder']) => void;
  getFilteredScores: () => MatchScore[];
  
  // Cache management
  clearCache: () => void;
  invalidateScoreCache: (scoreId: string) => void;
  preloadScores: (profileIds: string[], opportunityIds: string[]) => Promise<void>;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  retryFailedCalculations: () => Promise<void>;
  
  // Performance optimization
  optimizeStore: () => void; // Clean up old data
  exportScores: (profileId?: string) => MatchScore[];
  importScores: (scores: MatchScore[]) => void;
}

// ==========================================
// Store Implementation
// ==========================================

export const useMatchScoreStore = create<MatchScoreState & MatchScoreActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        scores: {},
        scoringHistory: {},
        isCalculating: false,
        calculatingOpportunities: new Set(),
        selectedScore: null,
        llmAnalysisCache: {},
        strategicInsightsCache: {},
        filters: {},
        sortBy: 'createdAt',
        sortOrder: 'desc',
        accuracyMetrics: {
          totalPredictions: 0,
          correctPredictions: 0,
          averageConfidence: 0,
          winRateByScore: {}
        },
        lastError: null,
        retryQueue: [],
        
        // ==========================================
        // Core CRUD Operations
        // ==========================================
        
        addScore: (score: MatchScore) =>
          set((state) => {
            state.scores[score.id] = score;
            
            // Add to history
            const historyKey = `${score.profileId}-${score.opportunityId}`;
            if (!state.scoringHistory[historyKey]) {
              state.scoringHistory[historyKey] = [];
            }
            state.scoringHistory[historyKey].push(score);
            
            // Sort history by creation date
            state.scoringHistory[historyKey].sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }),
        
        updateScore: (id: string, updates: Partial<MatchScore>) =>
          set((state) => {
            if (state.scores[id]) {
              Object.assign(state.scores[id], updates, {
                updatedAt: new Date()
              });
            }
          }),
        
        removeScore: (id: string) =>
          set((state) => {
            delete state.scores[id];
            
            // Remove from history
            Object.keys(state.scoringHistory).forEach(key => {
              state.scoringHistory[key] = state.scoringHistory[key].filter(
                score => score.id !== id
              );
            });
          }),
        
        getScore: (id: string) => get().scores[id] || null,
        
        getScoreByOpportunityAndProfile: (opportunityId: string, profileId: string, algorithmVersion?: string) => {
          const scores = Object.values(get().scores).filter(
            score => score.opportunityId === opportunityId && 
                    score.profileId === profileId &&
                    (!algorithmVersion || score.algorithmVersion === algorithmVersion)
          );
          
          // Return most recent score
          return scores.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0] || null;
        },
        
        // ==========================================
        // Scoring Operations
        // ==========================================
        
        calculateScore: async (request: CalculateMatchScoreRequest) => {
          set((state) => {
            state.isCalculating = true;
            state.calculatingOpportunities.add(request.opportunityId);
            state.lastError = null;
          });
          
          try {
            const response = await fetch('/api/v1/match-scores/calculate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(request)
            });
            
            const result: MatchScoreResponse = await response.json();
            
            if (result.success && result.data) {
              get().addScore(result.data);
            } else {
              throw new Error(result.error || 'Failed to calculate score');
            }
            
            return result;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set((state) => {
              state.lastError = errorMessage;
              state.retryQueue.push(request);
            });
            
            return {
              success: false,
              error: errorMessage
            } as MatchScoreResponse;
          } finally {
            set((state) => {
              state.isCalculating = false;
              state.calculatingOpportunities.delete(request.opportunityId);
            });
          }
        },
        
        calculateLLMScore: async (opportunityId: string, profileId: string, options = {}) => {
          const request: CalculateMatchScoreRequest = {
            opportunityId,
            profileId,
            method: 'llm',
            useAdvancedAnalysis: true,
            saveToDatabase: true,
            ...options
          };
          
          return get().calculateScore(request);
        },
        
        recalculateScore: async (scoreId: string, method = 'calculation') => {
          const score = get().getScore(scoreId);
          if (!score) {
            throw new Error('Score not found');
          }
          
          const request: CalculateMatchScoreRequest = {
            opportunityId: score.opportunityId,
            profileId: score.profileId,
            method,
            useAdvancedAnalysis: method === 'llm',
            saveToDatabase: true
          };
          
          return get().calculateScore(request);
        },
        
        // ==========================================
        // Batch Operations
        // ==========================================
        
        calculateBatchScores: async (requests: CalculateMatchScoreRequest[]) => {
          const results: MatchScoreResponse[] = [];
          
          // Process in batches of 5 to avoid overwhelming the API
          const batchSize = 5;
          for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            const batchResults = await Promise.all(
              batch.map(request => get().calculateScore(request))
            );
            results.push(...batchResults);
          }
          
          return results;
        },
        
        loadScoresForProfile: async (profileId: string) => {
          try {
            const response = await fetch(`/api/v1/match-scores?profileId=${profileId}`);
            const scores: MatchScore[] = await response.json();
            
            set((state) => {
              scores.forEach(score => {
                state.scores[score.id] = score;
              });
            });
          } catch (error) {
            console.error('Failed to load scores for profile:', error);
          }
        },
        
        loadScoresForOpportunity: async (opportunityId: string) => {
          try {
            const response = await fetch(`/api/v1/match-scores?opportunityId=${opportunityId}`);
            const scores: MatchScore[] = await response.json();
            
            set((state) => {
              scores.forEach(score => {
                state.scores[score.id] = score;
              });
            });
          } catch (error) {
            console.error('Failed to load scores for opportunity:', error);
          }
        },
        
        // ==========================================
        // User Feedback Operations
        // ==========================================
        
        submitFeedback: async (scoreId: string, feedback: string, rating?: number) => {
          try {
            const response = await fetch(`/api/v1/match-scores/${scoreId}/feedback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ feedback, rating })
            });
            
            if (response.ok) {
              get().updateScore(scoreId, {
                userFeedback: feedback,
                userRating: rating,
                updatedAt: new Date()
              });
            }
          } catch (error) {
            console.error('Failed to submit feedback:', error);
          }
        },
        
        markAsReviewed: async (scoreId: string) => {
          try {
            const response = await fetch(`/api/v1/match-scores/${scoreId}/review`, {
              method: 'POST'
            });
            
            if (response.ok) {
              get().updateScore(scoreId, {
                markedAsReviewed: true,
                updatedAt: new Date()
              });
            }
          } catch (error) {
            console.error('Failed to mark as reviewed:', error);
          }
        },
        
        updateActualOutcome: async (scoreId: string, outcome: 'won' | 'lost' | 'no_bid' | 'withdrawn') => {
          try {
            const response = await fetch(`/api/v1/match-scores/${scoreId}/outcome`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ outcome })
            });
            
            if (response.ok) {
              get().updateScore(scoreId, {
                actualOutcome: outcome,
                actualWinRate: outcome === 'won',
                updatedAt: new Date()
              });
              
              // Update accuracy metrics
              set((state) => {
                state.accuracyMetrics.totalPredictions++;
                if (outcome === 'won') {
                  state.accuracyMetrics.correctPredictions++;
                }
              });
            }
          } catch (error) {
            console.error('Failed to update outcome:', error);
          }
        },
        
        // ==========================================
        // Analytics Operations
        // ==========================================
        
        getScoreStatistics: (profileId?: string) => {
          const scores = Object.values(get().scores).filter(
            score => !profileId || score.profileId === profileId
          );
          
          if (scores.length === 0) {
            return {
              averageScore: 0,
              averageConfidence: 0,
              totalScores: 0,
              scoreDistribution: {},
              algorithmVersionDistribution: {}
            };
          }
          
          const averageScore = scores.reduce((sum, score) => sum + score.score, 0) / scores.length;
          const averageConfidence = scores.reduce((sum, score) => sum + score.confidence, 0) / scores.length;
          
          // Score distribution (0-20, 21-40, 41-60, 61-80, 81-100)
          const scoreDistribution = scores.reduce((dist, score) => {
            const range = Math.floor(score.score / 20) * 20;
            const key = `${range}-${range + 20}`;
            dist[key] = (dist[key] || 0) + 1;
            return dist;
          }, {} as Record<string, number>);
          
          // Algorithm version distribution
          const algorithmVersionDistribution = scores.reduce((dist, score) => {
            dist[score.algorithmVersion] = (dist[score.algorithmVersion] || 0) + 1;
            return dist;
          }, {} as Record<string, number>);
          
          return {
            averageScore,
            averageConfidence,
            totalScores: scores.length,
            scoreDistribution,
            algorithmVersionDistribution
          };
        },
        
        getWinRateAnalysis: () => {
          const scores = Object.values(get().scores).filter(
            score => score.actualOutcome !== undefined
          );
          
          if (scores.length === 0) {
            return {
              overallWinRate: 0,
              winRateByScoreRange: {},
              confidenceAccuracy: 0
            };
          }
          
          const wonScores = scores.filter(score => score.actualWinRate === true);
          const overallWinRate = wonScores.length / scores.length;
          
          // Win rate by score range
          const winRateByScoreRange = scores.reduce((rates, score) => {
            const range = Math.floor(score.score / 20) * 20;
            const key = `${range}-${range + 20}`;
            
            if (!rates[key]) {
              rates[key] = { won: 0, total: 0 };
            }
            
            rates[key].total++;
            if (score.actualWinRate) {
              rates[key].won++;
            }
            
            return rates;
          }, {} as Record<string, { won: number; total: number }>);
          
          // Convert to percentages
          const winRatePercentages = Object.entries(winRateByScoreRange).reduce((rates, [key, data]) => {
            rates[key] = data.won / data.total;
            return rates;
          }, {} as Record<string, number>);
          
          // Confidence accuracy (how often high confidence scores are correct)
          const highConfidenceScores = scores.filter(score => score.confidence >= 80);
          const confidenceAccuracy = highConfidenceScores.length > 0 
            ? highConfidenceScores.filter(score => score.actualWinRate).length / highConfidenceScores.length
            : 0;
          
          return {
            overallWinRate,
            winRateByScoreRange: winRatePercentages,
            confidenceAccuracy
          };
        },
        
        // ==========================================
        // LLM-Specific Operations
        // ==========================================
        
        getSemanticAnalysis: (scoreId: string) => {
          const score = get().getScore(scoreId);
          return score?.semanticAnalysis || get().llmAnalysisCache[scoreId] || null;
        },
        
        getStrategicInsights: (scoreId: string) => {
          const score = get().getScore(scoreId);
          return score?.strategicInsights || get().strategicInsightsCache[scoreId] || null;
        },
        
        regenerateInsights: async (scoreId: string) => {
          try {
            const response = await fetch(`/api/v1/match-scores/${scoreId}/regenerate-insights`, {
              method: 'POST'
            });
            
            if (response.ok) {
              const updatedScore: MatchScore = await response.json();
              get().updateScore(scoreId, updatedScore);
            }
          } catch (error) {
            console.error('Failed to regenerate insights:', error);
          }
        },
        
        // ==========================================
        // Filtering and Sorting
        // ==========================================
        
        setFilters: (filters: Partial<MatchScoreState['filters']>) =>
          set((state) => {
            Object.assign(state.filters, filters);
          }),
        
        clearFilters: () =>
          set((state) => {
            state.filters = {};
          }),
        
        setSorting: (sortBy: MatchScoreState['sortBy'], sortOrder: MatchScoreState['sortOrder']) =>
          set((state) => {
            state.sortBy = sortBy;
            state.sortOrder = sortOrder;
          }),
        
        getFilteredScores: () => {
          const { scores, filters, sortBy, sortOrder } = get();
          let filteredScores = Object.values(scores);
          
          // Apply filters
          if (filters.algorithmVersion) {
            filteredScores = filteredScores.filter(score => 
              score.algorithmVersion === filters.algorithmVersion
            );
          }
          
          if (filters.scoringMethod) {
            filteredScores = filteredScores.filter(score => 
              score.scoringMethod === filters.scoringMethod
            );
          }
          
          if (filters.minScore !== undefined) {
            filteredScores = filteredScores.filter(score => 
              score.score >= filters.minScore!
            );
          }
          
          if (filters.maxScore !== undefined) {
            filteredScores = filteredScores.filter(score => 
              score.score <= filters.maxScore!
            );
          }
          
          if (filters.hasUserFeedback !== undefined) {
            filteredScores = filteredScores.filter(score => 
              !!score.userFeedback === filters.hasUserFeedback
            );
          }
          
          if (filters.markedAsReviewed !== undefined) {
            filteredScores = filteredScores.filter(score => 
              score.markedAsReviewed === filters.markedAsReviewed
            );
          }
          
          // Apply sorting
          filteredScores.sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (sortBy) {
              case 'score':
                aValue = a.score;
                bValue = b.score;
                break;
              case 'confidence':
                aValue = a.confidence;
                bValue = b.confidence;
                break;
              case 'createdAt':
                aValue = new Date(a.createdAt).getTime();
                bValue = new Date(b.createdAt).getTime();
                break;
              case 'updatedAt':
                aValue = new Date(a.updatedAt).getTime();
                bValue = new Date(b.updatedAt).getTime();
                break;
              default:
                return 0;
            }
            
            if (sortOrder === 'asc') {
              return aValue - bValue;
            } else {
              return bValue - aValue;
            }
          });
          
          return filteredScores;
        },
        
        // ==========================================
        // Utility Operations
        // ==========================================
        
        clearCache: () =>
          set((state) => {
            state.llmAnalysisCache = {};
            state.strategicInsightsCache = {};
          }),
        
        invalidateScoreCache: (scoreId: string) =>
          set((state) => {
            delete state.llmAnalysisCache[scoreId];
            delete state.strategicInsightsCache[scoreId];
          }),
        
        preloadScores: async (profileIds: string[], opportunityIds: string[]) => {
          // Implementation would preload scores for given profiles and opportunities
          const promises = [
            ...profileIds.map(id => get().loadScoresForProfile(id)),
            ...opportunityIds.map(id => get().loadScoresForOpportunity(id))
          ];
          
          await Promise.all(promises);
        },
        
        setError: (error: string | null) =>
          set((state) => {
            state.lastError = error;
          }),
        
        clearError: () =>
          set((state) => {
            state.lastError = null;
          }),
        
        retryFailedCalculations: async () => {
          const { retryQueue } = get();
          if (retryQueue.length === 0) return;
          
          const results = await get().calculateBatchScores([...retryQueue]);
          
          set((state) => {
            // Clear successful requests from retry queue
            state.retryQueue = state.retryQueue.filter((_, index) => 
              !results[index]?.success
            );
          });
        },
        
        optimizeStore: () =>
          set((state) => {
            // Remove scores older than 6 months to keep store lean
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            Object.keys(state.scores).forEach(scoreId => {
              const score = state.scores[scoreId];
              if (new Date(score.createdAt) < sixMonthsAgo) {
                delete state.scores[scoreId];
              }
            });
            
            // Clean up history
            Object.keys(state.scoringHistory).forEach(key => {
              state.scoringHistory[key] = state.scoringHistory[key].filter(
                score => new Date(score.createdAt) >= sixMonthsAgo
              );
              
              if (state.scoringHistory[key].length === 0) {
                delete state.scoringHistory[key];
              }
            });
          }),
        
        exportScores: (profileId?: string) => {
          const scores = Object.values(get().scores);
          return profileId 
            ? scores.filter(score => score.profileId === profileId)
            : scores;
        },
        
        importScores: (scores: MatchScore[]) =>
          set((state) => {
            scores.forEach(score => {
              state.scores[score.id] = score;
            });
          })
      })),
      {
        name: 'match-score-store',
        partialize: (state) => ({
          // Only persist essential data, not UI state
          scores: state.scores,
          scoringHistory: state.scoringHistory,
          filters: state.filters,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          accuracyMetrics: state.accuracyMetrics
        })
      }
    ),
    { name: 'match-score-store' }
  )
);

// ==========================================
// Convenience Hooks
// ==========================================

// Hook for getting scores by profile
export const useProfileScores = (profileId: string) => {
  const scores = useMatchScoreStore((state) => 
    Object.values(state.scores).filter(score => score.profileId === profileId)
  );
  
  return scores.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// Hook for getting scores by opportunity
export const useOpportunityScores = (opportunityId: string) => {
  const scores = useMatchScoreStore((state) => 
    Object.values(state.scores).filter(score => score.opportunityId === opportunityId)
  );
  
  return scores.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// Hook for calculating scores
export const useScoreCalculation = () => {
  const calculateScore = useMatchScoreStore(state => state.calculateScore);
  const calculateLLMScore = useMatchScoreStore(state => state.calculateLLMScore);
  const isCalculating = useMatchScoreStore(state => state.isCalculating);
  const calculatingOpportunities = useMatchScoreStore(state => state.calculatingOpportunities);
  
  return {
    calculateScore,
    calculateLLMScore,
    isCalculating,
    calculatingOpportunities
  };
};

// Hook for analytics
export const useScoreAnalytics = () => {
  const getScoreStatistics = useMatchScoreStore(state => state.getScoreStatistics);
  const getWinRateAnalysis = useMatchScoreStore(state => state.getWinRateAnalysis);
  
  return {
    getScoreStatistics,
    getWinRateAnalysis
  };
};