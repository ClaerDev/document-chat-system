/**
 * Zustand Store for Opportunities Management
 * 
 * Manages opportunities with client-side caching, filtering, and performance optimization
 * Aligned with CACHE_POLICY.md for 30-minute TTL with smart invalidation
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Opportunity, SearchFilters, PaginatedResponse } from '@/types';

// ==========================================
// Store State Interface
// ==========================================

interface OpportunitiesState {
  // Core data
  opportunities: Record<string, Opportunity>; // Keyed by opportunity ID
  paginatedResults: Record<string, PaginatedResponse<Opportunity>>; // Keyed by search hash
  searchFilters: SearchFilters;
  
  // Match scores (persistent across navigation)
  matchScores: Record<string, number>; // Keyed by opportunity ID
  matchScoreDetails: Record<string, any>; // Detailed match score data
  matchScoresLoading: boolean;
  
  // Analysis data (AI insights, competitors, similar contracts)
  aiAnalyses: Record<string, any>; // Keyed by opportunity ID
  competitorAnalyses: Record<string, any[]>; // Keyed by opportunity ID
  similarContractsData: Record<string, any[]>; // Keyed by opportunity ID
  
  // Analysis status tracking
  analysisStatus: Record<string, {
    aiInsights: 'pending' | 'processing' | 'completed' | 'failed';
    competitors: 'pending' | 'processing' | 'completed' | 'failed';
    similarContracts: 'pending' | 'processing' | 'completed' | 'failed';
  }>; // Keyed by opportunity ID
  
  // Analysis cache timestamps
  analysisCacheTimestamps: Record<string, {
    aiInsights?: number;
    competitors?: number;
    similarContracts?: number;
  }>; // Keyed by opportunity ID
  
  // Analysis TTLs
  aiAnalysisTTL: number; // 24 hours
  competitorsTTL: number; // 6 hours
  similarContractsTTL: number; // 6 hours
  
  // UI state
  isLoading: boolean;
  loadingStates: Record<string, boolean>; // Track loading per search/filter combo
  selectedOpportunity: Opportunity | null;
  
  // Pagination state
  currentPage: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // Cache management
  cacheTimestamps: Record<string, number>; // Track when data was cached
  cacheTTL: number; // 30 minutes as per CACHE_POLICY.md
  
  // Performance tracking
  searchHistory: string[]; // Recent search hashes for preloading
  
  // Error handling
  lastError: string | null;
  retryCount: number;
}

// ==========================================
// Store Actions Interface
// ==========================================

interface OpportunitiesActions {
  // Core data operations
  setOpportunities: (opportunities: Opportunity[], searchHash: string, paginationData: any) => void;
  addOpportunity: (opportunity: Opportunity) => void;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void;
  removeOpportunity: (id: string) => void;
  getOpportunity: (id: string) => Opportunity | null;
  
  // Match score operations
  setMatchScores: (scores: Record<string, number>) => void;
  setMatchScoreDetails: (details: Record<string, any>) => void;
  getMatchScore: (opportunityId: string) => number | undefined;
  getMatchScoreDetails: (opportunityId: string) => any | undefined;
  setMatchScoresLoading: (loading: boolean) => void;
  loadMatchScoreFromDatabase: (opportunityId: string) => Promise<any | null>;
  clearMatchScores: () => void;
  
  // Analysis operations
  triggerComprehensiveAnalysis: (opportunityId: string, organizationId: string, userId: string, opportunity: any) => Promise<void>;
  startPollingForAnalysis: (opportunityId: string) => void;
  completeAIAnalysis: (opportunityId: string, analysis: any) => void;
  completeCompetitors: (opportunityId: string, competitors: any[]) => void;
  completeSimilarContracts: (opportunityId: string, contracts: any[]) => void;
  setAnalysisStatus: (opportunityId: string, type: 'aiInsights' | 'competitors' | 'similarContracts', status: 'pending' | 'processing' | 'completed' | 'failed') => void;
  
  // Analysis cache utilities
  isCached: (opportunityId: string, type: 'aiInsights' | 'competitors' | 'similarContracts') => boolean;
  isStale: (opportunityId: string, type: 'aiInsights' | 'competitors' | 'similarContracts') => boolean;
  getAnalysisData: (opportunityId: string, type: 'aiInsights' | 'competitors' | 'similarContracts') => any;
  getAnalysisStatus: (opportunityId: string, type: 'aiInsights' | 'competitors' | 'similarContracts') => 'pending' | 'processing' | 'completed' | 'failed';
  clearAnalysisCache: (opportunityId?: string) => void;
  
  // Search and filtering
  setSearchFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setPagination: (page: number, limit?: number) => void;
  
  // Data fetching
  fetchOpportunities: (filters?: SearchFilters, page?: number, useCache?: boolean) => Promise<void>;
  refreshOpportunities: () => Promise<void>;
  
  // Cache management
  isCacheValid: (searchHash: string) => boolean;
  invalidateCache: (searchHash?: string) => void;
  clearExpiredCache: () => void;
  clearAllOpportunities: () => void;
  preloadNextPage: () => Promise<void>;
  
  // Utility functions
  generateSearchHash: (filters: SearchFilters, page: number, sortBy: string, sortOrder: string) => string;
  getCachedResults: (searchHash: string) => PaginatedResponse<Opportunity> | null;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  retryLastRequest: () => Promise<void>;
  
  // Performance optimization
  optimizeStore: () => void;
  getStoreStatistics: () => {
    totalOpportunities: number;
    cacheHitRate: number;
    averageResponseTime: number;
    memoryUsage: number;
  };
}

// ==========================================
// Store Implementation
// ==========================================

export const useOpportunitiesStore = create<OpportunitiesState & OpportunitiesActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        opportunities: {},
        paginatedResults: {},
        searchFilters: {},
        
        // Match scores state
        matchScores: {},
        matchScoreDetails: {},
        matchScoresLoading: false,
        
        // Analysis state
        aiAnalyses: {},
        competitorAnalyses: {},
        similarContractsData: {},
        analysisStatus: {},
        analysisCacheTimestamps: {},
        aiAnalysisTTL: 24 * 60 * 60 * 1000, // 24 hours
        competitorsTTL: 6 * 60 * 60 * 1000, // 6 hours
        similarContractsTTL: 6 * 60 * 60 * 1000, // 6 hours
        
        isLoading: false,
        loadingStates: {},
        selectedOpportunity: null,
        currentPage: 1,
        limit: 10,
        sortBy: 'postedDate',
        sortOrder: 'desc',
        cacheTimestamps: {},
        cacheTTL: 30 * 60 * 1000, // 30 minutes in milliseconds
        searchHistory: [],
        lastError: null,
        retryCount: 0,
        
        // ==========================================
        // Core Data Operations
        // ==========================================
        
        setOpportunities: (opportunities: Opportunity[], searchHash: string, paginationData: any) =>
          set((state) => {
            // Store individual opportunities
            opportunities.forEach(opp => {
              if (opp.id) {
                state.opportunities[opp.id] = opp;
              }
            });
            
            // Store paginated results
            state.paginatedResults[searchHash] = {
              items: opportunities,
              total: paginationData.total,
              page: paginationData.page,
              limit: paginationData.limit,
              hasMore: paginationData.hasMore
            };
            
            // Update cache timestamp
            state.cacheTimestamps[searchHash] = Date.now();
            
            // Add to search history (keep last 10)
            if (!state.searchHistory.includes(searchHash)) {
              state.searchHistory.unshift(searchHash);
              if (state.searchHistory.length > 10) {
                state.searchHistory = state.searchHistory.slice(0, 10);
              }
            }
            
            state.isLoading = false;
            state.loadingStates[searchHash] = false;
          }),
        
        addOpportunity: (opportunity: Opportunity) =>
          set((state) => {
            if (opportunity.id) {
              state.opportunities[opportunity.id] = opportunity;
              // Invalidate related cache entries
              Object.keys(state.paginatedResults).forEach(hash => {
                delete state.cacheTimestamps[hash];
              });
            }
          }),
        
        updateOpportunity: (id: string, updates: Partial<Opportunity>) =>
          set((state) => {
            if (state.opportunities[id]) {
              Object.assign(state.opportunities[id], updates, {
                updatedAt: new Date().toISOString()
              });
              // Invalidate related cache entries
              Object.keys(state.paginatedResults).forEach(hash => {
                delete state.cacheTimestamps[hash];
              });
            }
          }),
        
        removeOpportunity: (id: string) =>
          set((state) => {
            delete state.opportunities[id];
            // Remove from paginated results and invalidate cache
            Object.keys(state.paginatedResults).forEach(hash => {
              const result = state.paginatedResults[hash];
              result.items = result.items.filter(opp => opp.id !== id);
              delete state.cacheTimestamps[hash];
            });
          }),
        
        getOpportunity: (id: string) => get().opportunities[id] || null,
        
        // ==========================================
        // Match Score Operations
        // ==========================================
        
        setMatchScores: (scores: Record<string, number>) =>
          set((state) => {
            state.matchScores = { ...state.matchScores, ...scores };
          }),
          
        setMatchScoreDetails: (details: Record<string, any>) =>
          set((state) => {
            state.matchScoreDetails = { ...state.matchScoreDetails, ...details };
          }),
          
        getMatchScore: (opportunityId: string) => get().matchScores[opportunityId],
        
        getMatchScoreDetails: (opportunityId: string) => get().matchScoreDetails[opportunityId],
        
        setMatchScoresLoading: (loading: boolean) =>
          set((state) => {
            state.matchScoresLoading = loading;
          }),
          
        loadMatchScoreFromDatabase: async (opportunityId: string) => {
          try {
            console.log(`🔍 Loading match score from database for opportunity: ${opportunityId}`)
            
            const response = await fetch(`/api/v1/match-scores?opportunityId=${opportunityId}&limit=1`)
            
            if (!response.ok) {
              console.warn(`No match score found in database for opportunity ${opportunityId}`)
              return null
            }
            
            const result = await response.json()
            
            if (result.success && result.data && result.data.length > 0) {
              const dbScore = result.data[0] // Get the most recent score
              console.log(`✅ Found existing match score in database: ${dbScore.overallScore}% for ${opportunityId}`)
              
              // Convert database score to the format expected by the store
              const storeMatchScore = {
                score: Number(dbScore.overallScore),
                overallScore: Number(dbScore.overallScore),
                factors: dbScore.factors || dbScore.detailedFactors,
                detailedFactors: dbScore.detailedFactors || dbScore.factors,
                algorithmVersion: dbScore.algorithmVersion,
                confidence: Number(dbScore.confidence || 85),
                breakdown: dbScore.factors || dbScore.detailedFactors,
                explanation: dbScore.explanation,
                semanticAnalysis: dbScore.semanticAnalysis,
                strategicInsights: dbScore.strategicInsights,
                recommendations: dbScore.recommendations,
                createdAt: dbScore.createdAt,
                updatedAt: dbScore.updatedAt
              }
              
              // Update the store with the loaded score
              set((state) => {
                state.matchScores[opportunityId] = storeMatchScore.score
                state.matchScoreDetails[opportunityId] = storeMatchScore
              })
              
              return storeMatchScore
            } else {
              console.log(`ℹ️ No match score found in database for opportunity ${opportunityId}`)
              return null
            }
          } catch (error) {
            console.error(`❌ Error loading match score from database for ${opportunityId}:`, error)
            return null
          }
        },
        
        clearMatchScores: () =>
          set((state) => {
            console.log('🧹 Clearing match scores from store:', {
              previousScoreCount: Object.keys(state.matchScores).length,
              previousDetailsCount: Object.keys(state.matchScoreDetails).length
            })
            state.matchScores = {};
            state.matchScoreDetails = {};
          }),
        
        // ==========================================
        // Analysis Operations
        // ==========================================
        
        triggerComprehensiveAnalysis: async (opportunityId: string, organizationId: string, userId: string, opportunity: any) => {
          console.log('🚀 Triggering comprehensive analysis for opportunity:', opportunityId);
          
          set((state) => {
            // Initialize status if not exists
            if (!state.analysisStatus[opportunityId]) {
              state.analysisStatus[opportunityId] = {
                aiInsights: 'pending',
                competitors: 'pending',
                similarContracts: 'pending'
              };
            }
            
            // Set all to processing
            state.analysisStatus[opportunityId].aiInsights = 'processing';
            state.analysisStatus[opportunityId].competitors = 'processing';
            state.analysisStatus[opportunityId].similarContracts = 'processing';
          });
          
          try {
            // Only import and use Inngest on the server side
            if (typeof window === 'undefined') {
              // Server-side: Import and use Inngest
              const { inngest } = await import('@/lib/inngest/client');
              
              await inngest.send({
                name: 'ai-analysis/opportunity.requested',
                data: {
                  opportunityId,
                  organizationId,
                  userId,
                  opportunity,
                  analysisType: 'complete',
                  priority: 'normal'
                }
              });
            } else {
              // Client-side: Use API endpoint to trigger Inngest
              console.log('📡 Calling API endpoint:', '/api/v1/opportunities/analysis/trigger', {
                opportunityId,
                organizationId,
                userId,
                analysisType: 'complete'
              });
              
              const response = await fetch('/api/v1/opportunities/analysis/trigger', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  opportunityId,
                  organizationId,
                  userId,
                  opportunity,
                  analysisType: 'complete',
                  priority: 'normal'
                })
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API request failed:', {
                  status: response.status,
                  statusText: response.statusText,
                  error: errorText
                });
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
              }
              
              const result = await response.json();
              console.log('✅ API response:', result);
            }
            
            console.log('✅ Analysis triggered successfully');
            
            // Start polling for completion
            get().startPollingForAnalysis(opportunityId);
            
          } catch (error) {
            console.error('❌ Failed to trigger analysis:', error);
            
            set((state) => {
              if (state.analysisStatus[opportunityId]) {
                state.analysisStatus[opportunityId].aiInsights = 'failed';
                state.analysisStatus[opportunityId].competitors = 'failed';
                state.analysisStatus[opportunityId].similarContracts = 'failed';
              }
            });
            
            throw error;
          }
        },
        
        startPollingForAnalysis: (opportunityId: string) => {
          const pollInterval = setInterval(async () => {
            try {
              const timestamps = get().analysisCacheTimestamps[opportunityId] || {};
              const params = new URLSearchParams();
              
              if (timestamps.aiInsights) params.set('lastAICheck', timestamps.aiInsights.toString());
              if (timestamps.competitors) params.set('lastCompetitorsCheck', timestamps.competitors.toString());
              if (timestamps.similarContracts) params.set('lastSimilarContractsCheck', timestamps.similarContracts.toString());
              
              const response = await fetch(`/api/v1/opportunities/${opportunityId}/analysis/poll?${params}`);
              const result = await response.json();
              
              if (result.success && result.hasUpdates) {
                console.log('📡 Received analysis updates:', result.updates);
                
                // Update store with new data
                if (result.updates.aiAnalysis) {
                  get().completeAIAnalysis(opportunityId, result.updates.aiAnalysis.data);
                }
                if (result.updates.competitors) {
                  get().completeCompetitors(opportunityId, result.updates.competitors.data);
                }
                if (result.updates.similarContracts) {
                  get().completeSimilarContracts(opportunityId, result.updates.similarContracts.data);
                }
                
                // Check if all analysis is complete
                const status = get().analysisStatus[opportunityId];
                if (status && status.aiInsights === 'completed' && 
                    status.competitors === 'completed' && 
                    status.similarContracts === 'completed') {
                  
                  clearInterval(pollInterval);
                  
                  // Show success notification using existing notification system
                  const opportunity = get().opportunities[opportunityId];
                  const competitorsCount = get().competitorAnalyses[opportunityId]?.length || 0;
                  const contractsCount = get().similarContractsData[opportunityId]?.length || 0;
                  
                  // Import and trigger notification (dynamic import to avoid circular dependencies)
                  if (typeof window !== 'undefined') {
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('analysis-complete', {
                        detail: {
                          opportunityId,
                          opportunityTitle: opportunity?.title || 'Unknown Opportunity',
                          competitorsCount,
                          contractsCount,
                          message: `Analysis complete for "${opportunity?.title || 'opportunity'}" - AI insights, ${competitorsCount} competitors, and ${contractsCount} similar contracts found.`
                        }
                      }));
                    }, 100);
                  }
                }
              }
            } catch (error) {
              console.error('Polling error:', error);
              // Continue polling on error
            }
          }, 3000); // Poll every 3 seconds
          
          // Stop polling after 5 minutes
          setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
        },
        
        completeAIAnalysis: (opportunityId: string, analysis: any) =>
          set((state) => {
            state.aiAnalyses[opportunityId] = analysis;
            if (!state.analysisCacheTimestamps[opportunityId]) {
              state.analysisCacheTimestamps[opportunityId] = {};
            }
            state.analysisCacheTimestamps[opportunityId].aiInsights = Date.now();
            
            if (!state.analysisStatus[opportunityId]) {
              state.analysisStatus[opportunityId] = {
                aiInsights: 'completed',
                competitors: 'pending',
                similarContracts: 'pending'
              };
            } else {
              state.analysisStatus[opportunityId].aiInsights = 'completed';
            }
          }),
          
        completeCompetitors: (opportunityId: string, competitors: any[]) =>
          set((state) => {
            state.competitorAnalyses[opportunityId] = competitors;
            if (!state.analysisCacheTimestamps[opportunityId]) {
              state.analysisCacheTimestamps[opportunityId] = {};
            }
            state.analysisCacheTimestamps[opportunityId].competitors = Date.now();
            
            if (!state.analysisStatus[opportunityId]) {
              state.analysisStatus[opportunityId] = {
                aiInsights: 'pending',
                competitors: 'completed',
                similarContracts: 'pending'
              };
            } else {
              state.analysisStatus[opportunityId].competitors = 'completed';
            }
          }),
          
        completeSimilarContracts: (opportunityId: string, contracts: any[]) =>
          set((state) => {
            state.similarContractsData[opportunityId] = contracts;
            if (!state.analysisCacheTimestamps[opportunityId]) {
              state.analysisCacheTimestamps[opportunityId] = {};
            }
            state.analysisCacheTimestamps[opportunityId].similarContracts = Date.now();
            
            if (!state.analysisStatus[opportunityId]) {
              state.analysisStatus[opportunityId] = {
                aiInsights: 'pending',
                competitors: 'pending',
                similarContracts: 'completed'
              };
            } else {
              state.analysisStatus[opportunityId].similarContracts = 'completed';
            }
          }),
          
        setAnalysisStatus: (opportunityId: string, type: 'aiInsights' | 'competitors' | 'similarContracts', status: 'pending' | 'processing' | 'completed' | 'failed') =>
          set((state) => {
            if (!state.analysisStatus[opportunityId]) {
              state.analysisStatus[opportunityId] = {
                aiInsights: 'pending',
                competitors: 'pending',
                similarContracts: 'pending'
              };
            }
            state.analysisStatus[opportunityId][type] = status;
          }),
        
        // Analysis cache utilities
        isCached: (opportunityId: string, type: 'aiInsights' | 'competitors' | 'similarContracts') => {
          const state = get();
          const timestamps = state.analysisCacheTimestamps[opportunityId];
          if (!timestamps || !timestamps[type]) return false;
          
          const hasData = type === 'aiInsights' ? !!state.aiAnalyses[opportunityId] :
                         type === 'competitors' ? !!state.competitorAnalyses[opportunityId] :
                         !!state.similarContractsData[opportunityId];
          
          return hasData && !state.isStale(opportunityId, type);
        },
        
        isStale: (opportunityId: string, type: 'aiInsights' | 'competitors' | 'similarContracts') => {
          const state = get();
          const timestamps = state.analysisCacheTimestamps[opportunityId];
          if (!timestamps || !timestamps[type]) return true;
          
          const now = Date.now();
          const age = now - timestamps[type]!;
          const ttl = type === 'aiInsights' ? state.aiAnalysisTTL :
                     type === 'competitors' ? state.competitorsTTL :
                     state.similarContractsTTL;
          
          return age > ttl;
        },
        
        getAnalysisData: (opportunityId: string, type: 'aiInsights' | 'competitors' | 'similarContracts') => {
          const state = get();
          return type === 'aiInsights' ? state.aiAnalyses[opportunityId] :
                 type === 'competitors' ? state.competitorAnalyses[opportunityId] :
                 state.similarContractsData[opportunityId];
        },
        
        getAnalysisStatus: (opportunityId: string, type: 'aiInsights' | 'competitors' | 'similarContracts') => {
          const state = get();
          return state.analysisStatus[opportunityId]?.[type] || 'pending';
        },
        
        clearAnalysisCache: (opportunityId?: string) =>
          set((state) => {
            if (opportunityId) {
              delete state.aiAnalyses[opportunityId];
              delete state.competitorAnalyses[opportunityId];
              delete state.similarContractsData[opportunityId];
              delete state.analysisStatus[opportunityId];
              delete state.analysisCacheTimestamps[opportunityId];
            } else {
              state.aiAnalyses = {};
              state.competitorAnalyses = {};
              state.similarContractsData = {};
              state.analysisStatus = {};
              state.analysisCacheTimestamps = {};
            }
          }),
        
        // ==========================================
        // Search and Filtering
        // ==========================================
        
        setSearchFilters: (filters: SearchFilters) =>
          set((state) => {
            state.searchFilters = { ...filters };
            state.currentPage = 1; // Reset to first page on filter change
          }),
        
        clearFilters: () =>
          set((state) => {
            state.searchFilters = {};
            state.currentPage = 1;
          }),
        
        setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') =>
          set((state) => {
            state.sortBy = sortBy;
            state.sortOrder = sortOrder;
            state.currentPage = 1; // Reset to first page on sort change
          }),
        
        setPagination: (page: number, limit?: number) =>
          set((state) => {
            state.currentPage = page;
            if (limit) {
              state.limit = limit;
            }
          }),
        
        // ==========================================
        // Data Fetching
        // ==========================================
        
        fetchOpportunities: async (filters?: SearchFilters, page?: number, useCache = true) => {
          const currentFilters = filters || get().searchFilters;
          const currentPage = page || get().currentPage;
          const { sortBy, sortOrder, limit } = get();
          
          console.log('🚀 FETCH OPPORTUNITIES CALLED:', {
            currentFilters,
            currentPage,
            sortBy,
            sortOrder,
            limit,
            useCache,
            timestamp: new Date().toISOString()
          });
          
          const searchHash = get().generateSearchHash(currentFilters, currentPage, sortBy, sortOrder);
          
          // Check cache if requested
          if (useCache && get().isCacheValid(searchHash)) {
            console.log('🎯 Using cached opportunities for hash:', searchHash);
            return;
          }
          
          set((state) => {
            state.isLoading = true;
            state.loadingStates[searchHash] = true;
            state.lastError = null;
          });
          
          try {
            // Build query parameters for SAM.gov real-time API
            const params = new URLSearchParams();
            
            // Core search parameters
            if (currentFilters.query) params.set('query', currentFilters.query);
            if (currentFilters.agencies?.length) params.set('agencies', currentFilters.agencies.join(','));
            if (currentFilters.naicsCodes?.length) params.set('naicsCodes', currentFilters.naicsCodes.join(','));
            if (currentFilters.setAsideTypes?.length) params.set('setAsideTypes', currentFilters.setAsideTypes.join(','));
            
            // Contract value filters
            if (currentFilters.minValue) params.set('minValue', currentFilters.minValue.toString());
            if (currentFilters.maxValue) params.set('maxValue', currentFilters.maxValue.toString());
            
            // Date filters
            if (currentFilters.postedFrom) {
              const postedFrom = typeof currentFilters.postedFrom === 'string' ? currentFilters.postedFrom : currentFilters.postedFrom.toISOString()
              params.set('postedFrom', postedFrom);
            }
            if (currentFilters.postedTo) {
              const postedTo = typeof currentFilters.postedTo === 'string' ? currentFilters.postedTo : currentFilters.postedTo.toISOString()
              params.set('postedTo', postedTo);
            }
            if (currentFilters.deadline) {
              const deadline = typeof currentFilters.deadline === 'string' 
                ? currentFilters.deadline 
                : currentFilters.deadline instanceof Date 
                  ? currentFilters.deadline.toISOString()
                  : String(currentFilters.deadline)
              params.set('deadlineTo', deadline);
            }
            
            // Location filters (map to SAM.gov parameters)
            if (currentFilters.states?.length) params.set('state', currentFilters.states[0]); // SAM.gov takes single state
            // Performance location (use first state if multiple)
            const performanceLocation = (currentFilters as any).performanceLocation
            if (performanceLocation?.states?.length) {
              params.set('state', performanceLocation.states[0]);
            } else if (currentFilters.performanceStates?.length) {
              params.set('state', currentFilters.performanceStates[0]);
            }
            
            // Performance city (use first city if multiple)
            if (performanceLocation?.cities?.length) {
              params.set('city', performanceLocation.cities[0]);
            } else if (currentFilters.performanceCity?.length) {
              params.set('city', currentFilters.performanceCity[0]);
            }
            
            // Active opportunities only by default
            params.set('active', 'true');
            
            // Pagination
            params.set('page', currentPage.toString());
            params.set('limit', limit.toString());
            
            // Use real-time SAM.gov API endpoint with optional scoring
            const apiUrl = `/api/v1/opportunities/realtime?${params.toString()}`;
            console.log('📡 MAKING REAL-TIME SAM.GOV API CALL:', { apiUrl, params: params.toString() });
            
            // Add a flag to request match scores with the opportunities (unified approach)
            if (currentPage === 1) { // Only score first page for performance
              params.set('includeScores', 'true')
            }
            
            const response = await fetch(apiUrl);
            console.log('📡 API RESPONSE:', { status: response.status, ok: response.ok });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success === false) {
              throw new Error(result.error || 'Failed to fetch opportunities');
            }
            
            // Handle the response data structure from real-time SAM.gov API
            const opportunities = result.data || [];
            const paginationData = {
              total: result.pagination?.total || opportunities.length,
              page: result.pagination?.page || currentPage,
              limit: result.pagination?.limit || limit,
              hasMore: result.pagination?.hasMore || false
            };
            
            get().setOpportunities(opportunities, searchHash, paginationData);
            
            console.log(`✅ Fetched ${opportunities.length} opportunities for hash:`, searchHash);
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('❌ Error fetching opportunities:', errorMessage);
            
            set((state) => {
              state.lastError = errorMessage;
              state.isLoading = false;
              state.loadingStates[searchHash] = false;
              state.retryCount++;
            });
            
            throw error;
          }
        },
        
        refreshOpportunities: async () => {
          const { searchFilters, currentPage } = get();
          await get().fetchOpportunities(searchFilters, currentPage, false); // Force refresh
        },
        
        // ==========================================
        // Cache Management
        // ==========================================
        
        isCacheValid: (searchHash: string) => {
          const timestamp = get().cacheTimestamps[searchHash];
          if (!timestamp) return false;
          
          const now = Date.now();
          const age = now - timestamp;
          return age < get().cacheTTL;
        },
        
        invalidateCache: (searchHash?: string) =>
          set((state) => {
            if (searchHash) {
              delete state.cacheTimestamps[searchHash];
              delete state.paginatedResults[searchHash];
            } else {
              // Clear all cache
              state.cacheTimestamps = {};
              state.paginatedResults = {};
            }
          }),
        
        clearExpiredCache: () =>
          set((state) => {
            const now = Date.now();
            const ttl = state.cacheTTL;
            
            Object.keys(state.cacheTimestamps).forEach(hash => {
              const timestamp = state.cacheTimestamps[hash];
              if (now - timestamp > ttl) {
                delete state.cacheTimestamps[hash];
                delete state.paginatedResults[hash];
              }
            });
          }),

        clearAllOpportunities: () =>
          set((state) => {
            console.log('🧹 Clearing ALL opportunities from Zustand store');
            state.opportunities = {};
            state.paginatedResults = {};
            state.cacheTimestamps = {};
            state.matchScores = {};
            state.matchScoreDetails = {};
            state.selectedOpportunity = null;
          }),
        
        preloadNextPage: async () => {
          const { currentPage, searchFilters, limit } = get();
          const nextPage = currentPage + 1;
          
          // Check if we have more pages
          const currentHash = get().generateSearchHash(searchFilters, currentPage, get().sortBy, get().sortOrder);
          const currentResults = get().paginatedResults[currentHash];
          
          if (currentResults && currentResults.hasMore) {
            try {
              await get().fetchOpportunities(searchFilters, nextPage, true);
            } catch (error) {
              console.warn('Failed to preload next page:', error);
            }
          }
        },
        
        // ==========================================
        // Utility Functions
        // ==========================================
        
        generateSearchHash: (filters: SearchFilters, page: number, sortBy: string, sortOrder: string) => {
          const searchData = {
            filters: JSON.stringify(filters),
            page,
            sortBy,
            sortOrder,
            limit: get().limit
          };
          
          // Simple hash function
          return btoa(JSON.stringify(searchData)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        },
        
        getCachedResults: (searchHash: string) => {
          if (!get().isCacheValid(searchHash)) {
            return null;
          }
          return get().paginatedResults[searchHash] || null;
        },
        
        // ==========================================
        // Error Handling
        // ==========================================
        
        setError: (error: string | null) =>
          set((state) => {
            state.lastError = error;
          }),
        
        clearError: () =>
          set((state) => {
            state.lastError = null;
            state.retryCount = 0;
          }),
        
        retryLastRequest: async () => {
          const { searchFilters, currentPage } = get();
          try {
            await get().fetchOpportunities(searchFilters, currentPage, false);
            get().clearError();
          } catch (error) {
            console.error('Retry failed:', error);
          }
        },
        
        // ==========================================
        // Performance Optimization
        // ==========================================
        
        optimizeStore: () =>
          set((state) => {
            // Clear expired cache
            get().clearExpiredCache();
            
            // Keep only recent search history
            state.searchHistory = state.searchHistory.slice(0, 5);
            
            // Remove old opportunities not in recent results
            const recentOpportunityIds = new Set<string>();
            Object.values(state.paginatedResults).forEach(result => {
              result.items.forEach(opp => {
                if (opp.id) recentOpportunityIds.add(opp.id);
              });
            });
            
            Object.keys(state.opportunities).forEach(id => {
              if (!recentOpportunityIds.has(id)) {
                delete state.opportunities[id];
              }
            });
            
            console.log('🧹 Store optimized - cache cleared and memory usage reduced');
          }),
        
        getStoreStatistics: () => {
          const state = get();
          const totalOpportunities = Object.keys(state.opportunities).length;
          const totalCacheEntries = Object.keys(state.cacheTimestamps).length;
          const validCacheEntries = Object.keys(state.cacheTimestamps).filter(hash => 
            state.isCacheValid(hash)
          ).length;
          
          return {
            totalOpportunities,
            cacheHitRate: totalCacheEntries > 0 ? (validCacheEntries / totalCacheEntries) * 100 : 0,
            averageResponseTime: 0, // Would need to implement timing
            memoryUsage: JSON.stringify(state.opportunities).length + JSON.stringify(state.paginatedResults).length
          };
        }
      })),
      {
        name: 'opportunities-store',
        partialize: (state) => ({
          // Only persist essential data, not UI state
          opportunities: state.opportunities,
          paginatedResults: state.paginatedResults,
          searchFilters: state.searchFilters,
          cacheTimestamps: state.cacheTimestamps,
          searchHistory: state.searchHistory,
          currentPage: state.currentPage,
          limit: state.limit,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          // Analysis data persistence (following our caching policy)
          aiAnalyses: state.aiAnalyses,
          competitorAnalyses: state.competitorAnalyses,
          similarContractsData: state.similarContractsData,
          analysisStatus: state.analysisStatus,
          analysisCacheTimestamps: state.analysisCacheTimestamps
        })
      }
    ),
    { name: 'opportunities-store' }
  )
);

// ==========================================
// Convenience Hooks
// ==========================================

// Hook for current opportunities
export const useCurrentOpportunities = () => {
  const searchFilters = useOpportunitiesStore(state => state.searchFilters);
  const currentPage = useOpportunitiesStore(state => state.currentPage);
  const sortBy = useOpportunitiesStore(state => state.sortBy);
  const sortOrder = useOpportunitiesStore(state => state.sortOrder);
  const generateSearchHash = useOpportunitiesStore(state => state.generateSearchHash);
  const paginatedResults = useOpportunitiesStore(state => state.paginatedResults);
  const isLoading = useOpportunitiesStore(state => state.isLoading);
  
  const searchHash = generateSearchHash(searchFilters, currentPage, sortBy, sortOrder);
  // Get results directly from paginatedResults, regardless of cache validity
  // This ensures we always show the most recently fetched data
  const results = paginatedResults[searchHash];
  
  // Log for debugging
  console.log('🎯 useCurrentOpportunities:', {
    searchHash,
    hasResults: !!results,
    resultCount: results?.items?.length || 0,
    isLoading,
    searchFilters,
    availableHashes: Object.keys(paginatedResults)
  });
  
  return {
    opportunities: results?.items || [],
    total: results?.total || 0,
    hasMore: results?.hasMore || false,
    searchHash
  };
};

// Hook for search operations
export const useOpportunitySearch = () => {
  const fetchOpportunities = useOpportunitiesStore(state => state.fetchOpportunities);
  const setSearchFilters = useOpportunitiesStore(state => state.setSearchFilters);
  const clearFilters = useOpportunitiesStore(state => state.clearFilters);
  const isLoading = useOpportunitiesStore(state => state.isLoading);
  const lastError = useOpportunitiesStore(state => state.lastError);
  
  return {
    fetchOpportunities,
    setSearchFilters,
    clearFilters,
    isLoading,
    lastError
  };
};

// ==========================================
// Debug Helpers (Browser Console Access)  
// ==========================================

// Add global debug function for clearing opportunities cache
if (typeof window !== 'undefined') {
  (window as any).clearOpportunitiesCache = () => {
    console.log('🧹 Clearing opportunities cache from browser console...');
    useOpportunitiesStore.getState().clearAllOpportunities();
    console.log('✅ Cache cleared! Refresh the page or navigate to opportunities to see new CUID IDs.');
  };
  
  (window as any).inspectOpportunities = () => {
    const state = useOpportunitiesStore.getState();
    console.log('🔍 Current opportunities store:', {
      opportunityIds: Object.keys(state.opportunities),
      cacheHashes: Object.keys(state.paginatedResults),
      matchScoreIds: Object.keys(state.matchScores)
    });
  };
}

// Hook for pagination
export const useOpportunityPagination = () => {
  const currentPage = useOpportunitiesStore(state => state.currentPage);
  const limit = useOpportunitiesStore(state => state.limit);
  const setPagination = useOpportunitiesStore(state => state.setPagination);
  const preloadNextPage = useOpportunitiesStore(state => state.preloadNextPage);
  
  return {
    currentPage,
    limit,
    setPagination,
    preloadNextPage
  };
};

// Hook for opportunity analysis
export const useOpportunityAnalysis = (opportunityId: string) => {
  const triggerComprehensiveAnalysis = useOpportunitiesStore(state => state.triggerComprehensiveAnalysis);
  const getAnalysisData = useOpportunitiesStore(state => state.getAnalysisData);
  const getAnalysisStatus = useOpportunitiesStore(state => state.getAnalysisStatus);
  const isCached = useOpportunitiesStore(state => state.isCached);
  const isStale = useOpportunitiesStore(state => state.isStale);
  
  return {
    // Data getters
    aiAnalysis: getAnalysisData(opportunityId, 'aiInsights'),
    competitors: getAnalysisData(opportunityId, 'competitors'),
    similarContracts: getAnalysisData(opportunityId, 'similarContracts'),
    
    // Status getters
    aiAnalysisStatus: getAnalysisStatus(opportunityId, 'aiInsights'),
    competitorsStatus: getAnalysisStatus(opportunityId, 'competitors'),
    similarContractsStatus: getAnalysisStatus(opportunityId, 'similarContracts'),
    
    // Cache status
    isAIAnalysisCached: isCached(opportunityId, 'aiInsights'),
    isCompetitorsCached: isCached(opportunityId, 'competitors'),
    isSimilarContractsCached: isCached(opportunityId, 'similarContracts'),
    
    isAIAnalysisStale: isStale(opportunityId, 'aiInsights'),
    isCompetitorsStale: isStale(opportunityId, 'competitors'),
    isSimilarContractsStale: isStale(opportunityId, 'similarContracts'),
    
    // Actions
    triggerAnalysis: triggerComprehensiveAnalysis
  };
};