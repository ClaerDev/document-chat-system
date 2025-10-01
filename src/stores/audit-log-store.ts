/**
 * Zustand store for audit log management
 * Provides centralized state management for audit logs, statistics, and tenant isolation
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  AuditLogQuery,
  AuditLogResponse,
  AuditLogWithUser,
  AuditStatsQuery,
  AuditStatsResponse,
  TenantIsolationValidation,
  AuditLogStore
} from '@/types/audit-log';
import { toast } from 'sonner';

interface AuditLogState extends AuditLogStore {
  // Additional UI state
  selectedLogs: string[];
  filters: {
    category?: string;
    severity?: string;
    entityType?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  
  // Pagination state
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  
  // Cache settings
  cacheTimestamp: number | null;
  cacheExpiry: number; // 5 minutes
}

interface AuditLogActions {
  // Log management actions
  fetchLogs: (query: AuditLogQuery) => Promise<void>;
  fetchMoreLogs: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  clearLogs: () => void;
  
  // Selection actions
  selectLog: (logId: string) => void;
  deselectLog: (logId: string) => void;
  selectAllLogs: () => void;
  clearSelection: () => void;
  
  // Filter actions
  setFilters: (filters: Partial<AuditLogState['filters']>) => void;
  clearFilters: () => void;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Statistics actions
  fetchStats: (query: AuditStatsQuery) => Promise<void>;
  clearStats: () => void;
  
  // Tenant isolation actions
  validateTenantIsolation: (organizationId: string) => Promise<void>;
  clearTenantValidation: () => void;
  
  // Cache management
  isCacheValid: () => boolean;
  invalidateCache: () => void;
}

const initialState: Omit<AuditLogState, keyof AuditLogActions> = {
  // Core state
  logs: [],
  loading: false,
  error: null,
  total: 0,
  currentQuery: null,
  
  // UI state
  selectedLogs: [],
  filters: {},
  
  // Pagination
  pagination: {
    limit: 50,
    offset: 0,
    hasMore: false
  },
  
  // Stats
  stats: null,
  statsLoading: false,
  
  // Tenant isolation
  tenantValidation: null,
  
  // Cache
  cacheTimestamp: null,
  cacheExpiry: 5 * 60 * 1000 // 5 minutes
};

export const useAuditLogStore = create<AuditLogState & AuditLogActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Log management actions
        fetchLogs: async (query: AuditLogQuery) => {
          const state = get();
          
          // Check cache validity for same query
          if (
            state.currentQuery &&
            JSON.stringify(state.currentQuery) === JSON.stringify(query) &&
            state.isCacheValid()
          ) {
            return;
          }

          set({ loading: true, error: null });

          try {
            const queryParams = new URLSearchParams();
            queryParams.append('organizationId', query.organizationId);
            queryParams.append('limit', (query.limit || 50).toString());
            queryParams.append('offset', (query.offset || 0).toString());
            
            if (query.startDate) {
              queryParams.append('startDate', query.startDate.toISOString());
            }
            if (query.endDate) {
              queryParams.append('endDate', query.endDate.toISOString());
            }
            if (query.category) {
              queryParams.append('category', query.category);
            }
            if (query.severity) {
              queryParams.append('severity', query.severity);
            }
            if (query.entityType) {
              queryParams.append('entityType', query.entityType);
            }
            if (query.userId) {
              queryParams.append('userId', query.userId);
            }
            if (query.operation) {
              queryParams.append('operation', query.operation);
            }

            const response = await fetch(`/api/v1/audit/logs?${queryParams}`);
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to fetch audit logs');
            }

            const data: AuditLogResponse = await response.json();

            set({
              logs: data.logs,
              total: data.total,
              currentQuery: query,
              loading: false,
              pagination: {
                limit: query.limit || 50,
                offset: query.offset || 0,
                hasMore: (query.offset || 0) + data.logs.length < data.total
              },
              cacheTimestamp: Date.now(),
              selectedLogs: [] // Clear selection on new fetch
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch audit logs';
            set({ 
              error: errorMessage, 
              loading: false,
              logs: [],
              total: 0
            });
            toast.error('Failed to load audit logs', {
              description: errorMessage
            });
          }
        },

        fetchMoreLogs: async () => {
          const state = get();
          if (!state.currentQuery || !state.pagination.hasMore || state.loading) {
            return;
          }

          const nextQuery = {
            ...state.currentQuery,
            offset: state.pagination.offset + state.pagination.limit
          };

          set({ loading: true });

          try {
            const queryParams = new URLSearchParams();
            queryParams.append('organizationId', nextQuery.organizationId);
            queryParams.append('limit', nextQuery.limit!.toString());
            queryParams.append('offset', nextQuery.offset!.toString());
            
            // Add other query parameters...
            if (nextQuery.startDate) {
              queryParams.append('startDate', nextQuery.startDate.toISOString());
            }
            if (nextQuery.endDate) {
              queryParams.append('endDate', nextQuery.endDate.toISOString());
            }
            if (nextQuery.category) {
              queryParams.append('category', nextQuery.category);
            }
            if (nextQuery.severity) {
              queryParams.append('severity', nextQuery.severity);
            }
            if (nextQuery.entityType) {
              queryParams.append('entityType', nextQuery.entityType);
            }
            if (nextQuery.userId) {
              queryParams.append('userId', nextQuery.userId);
            }
            if (nextQuery.operation) {
              queryParams.append('operation', nextQuery.operation);
            }

            const response = await fetch(`/api/v1/audit/logs?${queryParams}`);
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to fetch more audit logs');
            }

            const data: AuditLogResponse = await response.json();

            set(state => ({
              logs: [...state.logs, ...data.logs],
              loading: false,
              pagination: {
                limit: nextQuery.limit || 50,
                offset: nextQuery.offset || 0,
                hasMore: (nextQuery.offset || 0) + data.logs.length < data.total
              },
              currentQuery: nextQuery
            }));

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch more audit logs';
            set({ error: errorMessage, loading: false });
            toast.error('Failed to load more audit logs', {
              description: errorMessage
            });
          }
        },

        refreshLogs: async () => {
          const state = get();
          if (!state.currentQuery) return;
          
          state.invalidateCache();
          await state.fetchLogs(state.currentQuery);
        },

        clearLogs: () => {
          set({
            logs: [],
            total: 0,
            currentQuery: null,
            selectedLogs: [],
            pagination: {
              limit: 50,
              offset: 0,
              hasMore: false
            },
            cacheTimestamp: null
          });
        },

        // Selection actions
        selectLog: (logId: string) => {
          set(state => ({
            selectedLogs: [...state.selectedLogs, logId]
          }));
        },

        deselectLog: (logId: string) => {
          set(state => ({
            selectedLogs: state.selectedLogs.filter(id => id !== logId)
          }));
        },

        selectAllLogs: () => {
          set(state => ({
            selectedLogs: state.logs.map(log => log.id)
          }));
        },

        clearSelection: () => {
          set({ selectedLogs: [] });
        },

        // Filter actions
        setFilters: (filters) => {
          set(state => ({
            filters: { ...state.filters, ...filters }
          }));
        },

        clearFilters: () => {
          set({ filters: {} });
        },

        // Error handling
        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        // Statistics actions
        fetchStats: async (query: AuditStatsQuery) => {
          set({ statsLoading: true });

          try {
            const queryParams = new URLSearchParams();
            queryParams.append('organizationId', query.organizationId);
            if (query.timeframe) {
              queryParams.append('timeframe', query.timeframe);
            }

            const response = await fetch(`/api/v1/audit/stats?${queryParams}`);
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to fetch audit statistics');
            }

            const stats: AuditStatsResponse = await response.json();

            set({ stats, statsLoading: false });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch audit statistics';
            set({ statsLoading: false });
            toast.error('Failed to load audit statistics', {
              description: errorMessage
            });
          }
        },

        clearStats: () => {
          set({ stats: null });
        },

        // Tenant isolation actions
        validateTenantIsolation: async (organizationId: string) => {
          try {
            const response = await fetch(`/api/v1/audit/tenant-validation?organizationId=${organizationId}`);
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to validate tenant isolation');
            }

            const validation: TenantIsolationValidation = await response.json();

            set({ tenantValidation: validation });

            if (!validation.isValid) {
              toast.warning('Tenant isolation violations detected', {
                description: `${validation.violations.length} violations found`
              });
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to validate tenant isolation';
            toast.error('Tenant validation failed', {
              description: errorMessage
            });
          }
        },

        clearTenantValidation: () => {
          set({ tenantValidation: null });
        },

        // Cache management
        isCacheValid: () => {
          const state = get();
          if (!state.cacheTimestamp) return false;
          return Date.now() - state.cacheTimestamp < state.cacheExpiry;
        },

        invalidateCache: () => {
          set({ cacheTimestamp: null });
        }
      }),
      {
        name: 'audit-log-store',
        partialize: (state) => ({
          // Only persist filters and pagination preferences
          filters: state.filters,
          pagination: {
            limit: state.pagination.limit
          }
        })
      }
    ),
    {
      name: 'audit-log-store'
    }
  )
);

// Utility hooks for common operations
export const useAuditLogFilters = () => {
  const filters = useAuditLogStore(state => state.filters);
  const setFilters = useAuditLogStore(state => state.setFilters);
  const clearFilters = useAuditLogStore(state => state.clearFilters);
  
  return { filters, setFilters, clearFilters };
};

export const useAuditLogSelection = () => {
  const selectedLogs = useAuditLogStore(state => state.selectedLogs);
  const selectLog = useAuditLogStore(state => state.selectLog);
  const deselectLog = useAuditLogStore(state => state.deselectLog);
  const selectAllLogs = useAuditLogStore(state => state.selectAllLogs);
  const clearSelection = useAuditLogStore(state => state.clearSelection);
  
  return { 
    selectedLogs, 
    selectLog, 
    deselectLog, 
    selectAllLogs, 
    clearSelection,
    hasSelection: selectedLogs.length > 0
  };
};

export const useAuditLogStats = () => {
  const stats = useAuditLogStore(state => state.stats);
  const statsLoading = useAuditLogStore(state => state.statsLoading);
  const fetchStats = useAuditLogStore(state => state.fetchStats);
  const clearStats = useAuditLogStore(state => state.clearStats);
  
  return { stats, statsLoading, fetchStats, clearStats };
};