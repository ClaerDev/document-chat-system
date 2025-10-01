/**
 * ImageRouter Store
 * 
 * Zustand store for managing ImageRouter state, preferences, and request tracking.
 * Provides centralized state management for all ImageRouter-related data.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools, persist } from 'zustand/middleware';
import { ModelInfo } from '@/lib/ai/interfaces/types';
import {
  ImageRouterCapabilities,
  ImageRouterMetrics,
  UnifiedMediaGenerationRequest,
  UnifiedMediaGenerationResponse,
  MediaCostEstimate,
  ImageRouterModelType,
  ImageRouterQuality,
  ImageRouterResponseFormat,
  ImageRouterCostOptimization
} from '@/lib/ai/interfaces/imagerouter-types';
import { CircuitBreakerMetrics } from '@/lib/ai/circuit-breaker/circuit-breaker';

// Request tracking types
export interface MediaGenerationRequest {
  id: string;
  request: UnifiedMediaGenerationRequest;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  response?: UnifiedMediaGenerationResponse;
  error?: string;
  estimatedCost?: number;
  actualCost?: number;
  processingTime?: number;
}

// User preferences for ImageRouter
export interface ImageRouterUserPreferences {
  defaultQuality: ImageRouterQuality;
  defaultResponseFormat: ImageRouterResponseFormat;
  costOptimization: ImageRouterCostOptimization;
  autoEstimateCost: boolean;
  preferredModels: {
    image: string;
    video: string;
    edit: string;
  };
  maxCostPerRequest: number;
  enableNotifications: boolean;
  saveHistory: boolean;
  historyRetentionDays: number;
}

// Connection and health state
export interface ConnectionState {
  isConnected: boolean;
  lastHealthCheck: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  lastError?: string;
  connectionLatency?: number;
}

// Store state interface
export interface ImageRouterState {
  // Core data
  models: ModelInfo[];
  capabilities: ImageRouterCapabilities | null;
  metrics: ImageRouterMetrics | null;
  circuitBreakerMetrics: CircuitBreakerMetrics | null;
  
  // Request tracking
  requests: Map<string, MediaGenerationRequest>;
  activeRequests: Set<string>;
  requestHistory: MediaGenerationRequest[];
  
  // User preferences
  preferences: ImageRouterUserPreferences;
  
  // Connection state
  connectionState: ConnectionState;
  
  // UI state
  isLoading: boolean;
  lastError: string | null;
  
  // Actions
  actions: {
    // Model management
    setModels: (models: ModelInfo[]) => void;
    setCapabilities: (capabilities: ImageRouterCapabilities) => void;
    refreshModels: () => Promise<void>;
    
    // Request tracking
    addRequest: (request: MediaGenerationRequest) => void;
    updateRequest: (id: string, updates: Partial<MediaGenerationRequest>) => void;
    completeRequest: (id: string, response: UnifiedMediaGenerationResponse, cost?: number) => void;
    failRequest: (id: string, error: string) => void;
    cancelRequest: (id: string) => void;
    clearRequest: (id: string) => void;
    clearAllRequests: () => void;
    clearHistory: () => void;
    
    // Preferences
    updatePreferences: (updates: Partial<ImageRouterUserPreferences>) => void;
    resetPreferences: () => void;
    
    // Metrics
    updateMetrics: (metrics: ImageRouterMetrics) => void;
    updateCircuitBreakerMetrics: (metrics: CircuitBreakerMetrics) => void;
    
    // Connection state
    updateConnectionState: (state: Partial<ConnectionState>) => void;
    setHealthStatus: (status: ConnectionState['healthStatus']) => void;
    
    // UI state
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    
    // Utility actions
    getRequestById: (id: string) => MediaGenerationRequest | undefined;
    getActiveRequests: () => MediaGenerationRequest[];
    getCompletedRequests: () => MediaGenerationRequest[];
    getFailedRequests: () => MediaGenerationRequest[];
    getTotalCost: () => number;
    getAverageProcessingTime: () => number;
    
    // Model utilities
    getModelsByType: (type: ImageRouterModelType) => ModelInfo[];
    getRecommendedModel: (type: ImageRouterModelType, quality?: ImageRouterQuality) => ModelInfo | null;
    isModelAvailable: (modelName: string) => boolean;
  };
}

// Default preferences
const defaultPreferences: ImageRouterUserPreferences = {
  defaultQuality: 'auto',
  defaultResponseFormat: 'url',
  costOptimization: 'balanced',
  autoEstimateCost: true,
  preferredModels: {
    image: 'test/test',
    video: 'ir/test-video',
    edit: 'openai/gpt-image-1'
  },
  maxCostPerRequest: 1.00,
  enableNotifications: true,
  saveHistory: true,
  historyRetentionDays: 30
};

// Default connection state
const defaultConnectionState: ConnectionState = {
  isConnected: false,
  lastHealthCheck: new Date().toISOString(),
  healthStatus: 'unknown',
  circuitBreakerState: 'closed',
  connectionLatency: undefined
};

// Create the store
export const useImageRouterStore = create<ImageRouterState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // Initial state
        models: [],
        capabilities: null,
        metrics: null,
        circuitBreakerMetrics: null,
        requests: new Map(),
        activeRequests: new Set(),
        requestHistory: [],
        preferences: defaultPreferences,
        connectionState: defaultConnectionState,
        isLoading: false,
        lastError: null,
        
        actions: {
          // Model management
          setModels: (models: ModelInfo[]) => {
            set((state) => ({ 
              models,
              connectionState: {
                ...state.connectionState,
                isConnected: true,
                lastHealthCheck: new Date().toISOString()
              }
            }));
          },
          
          setCapabilities: (capabilities: ImageRouterCapabilities) => {
            set({ capabilities });
          },
          
          refreshModels: async () => {
            // This would typically call the ImageRouter adapter
            // Implementation depends on how the adapter is accessed
            console.log('Refreshing ImageRouter models...');
          },
          
          // Request tracking
          addRequest: (request: MediaGenerationRequest) => {
            set((state) => {
              const newRequests = new Map(state.requests);
              newRequests.set(request.id, request);
              
              const newActiveRequests = new Set(state.activeRequests);
              if (request.status === 'pending' || request.status === 'processing') {
                newActiveRequests.add(request.id);
              }
              
              return {
                requests: newRequests,
                activeRequests: newActiveRequests
              };
            });
          },
          
          updateRequest: (id: string, updates: Partial<MediaGenerationRequest>) => {
            set((state) => {
              const newRequests = new Map(state.requests);
              const existingRequest = newRequests.get(id);
              
              if (existingRequest) {
                const updatedRequest = {
                  ...existingRequest,
                  ...updates,
                  updatedAt: new Date().toISOString()
                };
                newRequests.set(id, updatedRequest);
                
                // Update active requests
                const newActiveRequests = new Set(state.activeRequests);
                if (updates.status === 'completed' || updates.status === 'failed' || updates.status === 'cancelled') {
                  newActiveRequests.delete(id);
                } else if (updates.status === 'pending' || updates.status === 'processing') {
                  newActiveRequests.add(id);
                }
                
                return {
                  requests: newRequests,
                  activeRequests: newActiveRequests
                };
              }
              
              return state;
            });
          },
          
          completeRequest: (id: string, response: UnifiedMediaGenerationResponse, cost?: number) => {
            set((state) => {
              const request = state.requests.get(id);
              if (!request) return state;
              
              const completedAt = new Date().toISOString();
              const processingTime = new Date(completedAt).getTime() - new Date(request.createdAt).getTime();
              
              const updatedRequest: MediaGenerationRequest = {
                ...request,
                status: 'completed',
                updatedAt: completedAt,
                completedAt,
                response,
                actualCost: cost || request.estimatedCost,
                processingTime
              };
              
              const newRequests = new Map(state.requests);
              newRequests.set(id, updatedRequest);
              
              const newActiveRequests = new Set(state.activeRequests);
              newActiveRequests.delete(id);
              
              // Add to history if preferences allow
              const newHistory = state.preferences.saveHistory 
                ? [...state.requestHistory, updatedRequest]
                : state.requestHistory;
              
              return {
                requests: newRequests,
                activeRequests: newActiveRequests,
                requestHistory: newHistory
              };
            });
          },
          
          failRequest: (id: string, error: string) => {
            get().actions.updateRequest(id, {
              status: 'failed',
              error,
              completedAt: new Date().toISOString()
            });
          },
          
          cancelRequest: (id: string) => {
            get().actions.updateRequest(id, {
              status: 'cancelled',
              completedAt: new Date().toISOString()
            });
          },
          
          clearRequest: (id: string) => {
            set((state) => {
              const newRequests = new Map(state.requests);
              newRequests.delete(id);
              
              const newActiveRequests = new Set(state.activeRequests);
              newActiveRequests.delete(id);
              
              return {
                requests: newRequests,
                activeRequests: newActiveRequests
              };
            });
          },
          
          clearAllRequests: () => {
            set({
              requests: new Map(),
              activeRequests: new Set()
            });
          },
          
          clearHistory: () => {
            set({ requestHistory: [] });
          },
          
          // Preferences
          updatePreferences: (updates: Partial<ImageRouterUserPreferences>) => {
            set((state) => ({
              preferences: { ...state.preferences, ...updates }
            }));
          },
          
          resetPreferences: () => {
            set({ preferences: defaultPreferences });
          },
          
          // Metrics
          updateMetrics: (metrics: ImageRouterMetrics) => {
            set({ metrics });
          },
          
          updateCircuitBreakerMetrics: (circuitBreakerMetrics: CircuitBreakerMetrics) => {
            set({ circuitBreakerMetrics });
          },
          
          // Connection state
          updateConnectionState: (updates: Partial<ConnectionState>) => {
            set((state) => ({
              connectionState: { ...state.connectionState, ...updates }
            }));
          },
          
          setHealthStatus: (healthStatus: ConnectionState['healthStatus']) => {
            set((state) => ({
              connectionState: {
                ...state.connectionState,
                healthStatus,
                lastHealthCheck: new Date().toISOString()
              }
            }));
          },
          
          // UI state
          setLoading: (isLoading: boolean) => {
            set({ isLoading });
          },
          
          setError: (lastError: string | null) => {
            set({ lastError });
          },
          
          clearError: () => {
            set({ lastError: null });
          },
          
          // Utility actions
          getRequestById: (id: string) => {
            return get().requests.get(id);
          },
          
          getActiveRequests: () => {
            const { requests, activeRequests } = get();
            return Array.from(activeRequests).map(id => requests.get(id)!).filter(Boolean);
          },
          
          getCompletedRequests: () => {
            const { requests } = get();
            return Array.from(requests.values()).filter(req => req.status === 'completed');
          },
          
          getFailedRequests: () => {
            const { requests } = get();
            return Array.from(requests.values()).filter(req => req.status === 'failed');
          },
          
          getTotalCost: () => {
            const { requests } = get();
            return Array.from(requests.values())
              .filter(req => req.status === 'completed' && req.actualCost)
              .reduce((total, req) => total + (req.actualCost || 0), 0);
          },
          
          getAverageProcessingTime: () => {
            const { requests } = get();
            const completedRequests = Array.from(requests.values())
              .filter(req => req.status === 'completed' && req.processingTime);
            
            if (completedRequests.length === 0) return 0;
            
            const totalTime = completedRequests.reduce((total, req) => total + (req.processingTime || 0), 0);
            return totalTime / completedRequests.length;
          },
          
          // Model utilities
          getModelsByType: (type: ImageRouterModelType) => {
            const { models } = get();
            return models.filter(model => model.metadata?.type === type);
          },
          
          getRecommendedModel: (type: ImageRouterModelType, quality?: ImageRouterQuality) => {
            const models = get().actions.getModelsByType(type);
            
            if (models.length === 0) return null;
            
            // Sort by quality score and return the best match
            const sortedModels = models.sort((a, b) => b.qualityScore - a.qualityScore);
            
            // If quality is specified, try to find a model that matches
            if (quality && quality !== 'auto') {
              const qualityMatch = sortedModels.find(model => 
                model.name.toLowerCase().includes(quality.toLowerCase())
              );
              if (qualityMatch) return qualityMatch;
            }
            
            return sortedModels[0];
          },
          
          isModelAvailable: (modelName: string) => {
            const { models } = get();
            return models.some(model => model.name === modelName);
          }
        }
      })),
      {
        name: 'imagerouter-store',
        partialize: (state) => ({
          preferences: state.preferences,
          requestHistory: state.requestHistory.slice(-100), // Keep only last 100 items
        }),
        version: 1,
      }
    ),
    {
      name: 'ImageRouter Store',
    }
  )
);

// Selectors for common use cases
export const selectModels = (state: ImageRouterState) => state.models;
export const selectCapabilities = (state: ImageRouterState) => state.capabilities;
export const selectActiveRequests = (state: ImageRouterState) => state.actions.getActiveRequests();
export const selectConnectionState = (state: ImageRouterState) => state.connectionState;
export const selectMetrics = (state: ImageRouterState) => state.metrics;
export const selectPreferences = (state: ImageRouterState) => state.preferences;
export const selectIsLoading = (state: ImageRouterState) => state.isLoading;
export const selectLastError = (state: ImageRouterState) => state.lastError;

// Computed selectors
export const selectImageModels = (state: ImageRouterState) => 
  state.actions.getModelsByType('image');

export const selectVideoModels = (state: ImageRouterState) => 
  state.actions.getModelsByType('video');

export const selectEditModels = (state: ImageRouterState) => 
  state.actions.getModelsByType('edit');

export const selectIsHealthy = (state: ImageRouterState) => 
  state.connectionState.healthStatus === 'healthy' && 
  state.connectionState.circuitBreakerState === 'closed';

export const selectTotalRequests = (state: ImageRouterState) => 
  state.requests.size;

export const selectSuccessRate = (state: ImageRouterState) => {
  const requests = Array.from(state.requests.values());
  if (requests.length === 0) return 0;
  
  const completedRequests = requests.filter(req => 
    req.status === 'completed' || req.status === 'failed'
  );
  
  if (completedRequests.length === 0) return 0;
  
  const successfulRequests = completedRequests.filter(req => req.status === 'completed');
  return (successfulRequests.length / completedRequests.length) * 100;
};

// Hook for actions only
export const useImageRouterActions = () => useImageRouterStore(state => state.actions);