/**
 * Enhanced Profile Store Implementation
 *
 * Comprehensive state management for profile and organization data with:
 * - Caching and optimistic updates
 * - Real-time validation
 * - Profile completeness scoring
 * - Analytics and insights
 */

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import { shallow } from 'zustand/shallow'
import type { Profile, Organization, User } from '@/types'
import governmentCertificationsDatabase from '@/data/government/certifications/certifications.json'
import type {
  UserCertification,
  CertificationFormData,
  GovCertificationDefinition,
  GovCertificationDatabase,
  CertificationAnalytics,
} from '@/types/certifications'
import {
  validateCertificationForm,
} from '@/lib/validations/certifications'
import { ProfileFieldUtils } from '@/lib/profile-field-utils'

// Enable Immer MapSet plugin for Set support
enableMapSet()

// =============================================
// TYPES & INTERFACES
// =============================================

export interface ProfileValidationError {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
  code: string
}

export interface ValidationResult {
  isValid: boolean
  score: number // 0-100
  totalFields: number
  completedFields: number
  errors: ProfileValidationError[]
  warnings: ProfileValidationError[]
  suggestions: ProfileValidationError[]
}

export interface ProfileCompleteness {
  overall: number // 0-100
  sections: {
    basic: number
    contact: number
    business: number
    naics: number
    samGov: number // SAM.gov integration status (0 or 100)
    certifications: number
    capabilities: number
    pastPerformance: number
  }
  missingFields: string[]
  nextSteps: string[]
  scoreHistory: Array<{
    date: string
    score: number
    changes: string[]
  }>
}

export interface ProfileAnalytics {
  lastUpdated: Date
  updateFrequency: number // updates per month
  viewCount: number
  matchingPotential: number // 0-100
  competitivePosition: 'weak' | 'average' | 'strong'
  recommendations: Array<{
    type: 'improvement' | 'opportunity' | 'warning'
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    actionUrl?: string
  }>
}

export interface OrganizationSettings {
  preferences: {
    notifications: {
      email: boolean
      inApp: boolean
      frequency: 'immediate' | 'daily' | 'weekly'
    }
    matching: {
      autoCalculate: boolean
      minimumScore: number
      includeInactive: boolean
    }
    scoring: {
      weights: {
        naics: number
        location: number
        certifications: number
        experience: number
        size: number
      }
      algorithm: 'v1' | 'v2' | 'ml'
    }
  }
  limits: {
    profiles: number
    users: number
    opportunities: number
  }
  features: {
    advancedScoring: boolean
    aiGeneration: boolean
    analytics: boolean
  }
}

// =============================================
// STORE STATE INTERFACES
// =============================================

interface ProfileState {
  // Current profile data
  current: Profile | null
  profiles: Profile[] // for multi-profile organizations
  loading: boolean
  error: string | null
  lastUpdated: Date | null

  // Optimistic updates
  optimisticUpdates: Partial<Profile>
  pendingChanges: Set<string> // field names

  // Validation
  validation: ValidationResult | null
  isValidating: boolean

  // Completeness & Analytics
  completeness: ProfileCompleteness | null
  analytics: ProfileAnalytics | null

  // Certification management
  certifications: {
    govDatabase: GovCertificationDatabase | null
    govDatabaseLoading: boolean
    govDatabaseError: string | null
    analytics: CertificationAnalytics | null
    analyticsLoading: boolean
  }

  // Cache management
  cache: {
    profiles: Record<string, { data: Profile; timestamp: Date; ttl: number }>
    certificationCache: Record<string, { results: any[]; timestamp: Date }>
    definitionCache: Record<string, GovCertificationDefinition>
    lastSync: Date | null
    isDirty: boolean
  }
}

interface OrganizationState {
  // Current organization data
  currentOrganization: Organization | null
  organizationLoading: boolean
  organizationError: string | null
  organizationLastUpdated: Date | null

  // Settings
  settings: OrganizationSettings | null
  settingsLoading: boolean

  // Members management
  members: User[]
  membersLoading: boolean

  // Organization analytics
  orgAnalytics: {
    totalProfiles: number
    activeUsers: number
    matchingActivity: number
    lastActivityDate: Date | null
  } | null

  // Multi-tenant data
  organizations: Organization[] // for users in multiple orgs
  switchingOrganization: boolean
}

interface SyncState {
  // Background sync
  isSyncing: boolean
  lastSync: Date | null
  syncQueue: Array<{
    id: string
    type: 'profile' | 'organization'
    action: 'create' | 'update' | 'delete'
    data: unknown
    attempts: number
    lastAttempt: Date | null
  }>

  // Real-time updates
  subscription: {
    connected: boolean
    lastHeartbeat: Date | null
    subscriptions: Set<string> // resource IDs
  }

  // Conflict resolution
  conflicts: Array<{
    id: string
    field: string
    localValue: unknown
    remoteValue: unknown
    timestamp: Date
  }>
}

// Combined store state
interface ProfileStoreState extends ProfileState, OrganizationState, SyncState {
  // Global actions
  reset: () => void
  initialize: (data: {
    profile?: Profile
    organization?: Organization
    user?: User
  }) => void
}

// =============================================
// STORE ACTIONS INTERFACES
// =============================================

interface ProfileActions {
  // Core profile management
  fetchProfile: (id?: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  refreshProfile: () => Promise<void>
  setOptimistic: (updates: Partial<Profile>) => void
  revertOptimistic: () => void

  // Multi-profile management
  fetchProfiles: () => Promise<void>
  createProfile: (data: Partial<Profile>) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  switchProfile: (id: string) => Promise<void>

  // Validation
  validateProfile: (profile?: Partial<Profile>) => Promise<ValidationResult>
  validateField: (
    field: string,
    value: unknown
  ) => Promise<ProfileValidationError[]>
  clearValidation: () => void

  // Completeness & Analytics
  calculateCompleteness: (profile?: Profile) => ProfileCompleteness
  refreshAnalytics: () => Promise<void>
  trackProfileView: () => void

  // Certification management
  fetchGovDatabase: () => Promise<void>
  getGovCertificationById: (id: string) => GovCertificationDefinition | null
  addCertification: (data: CertificationFormData) => Promise<UserCertification>
  updateCertification: (id: string, data: Partial<CertificationFormData>) => Promise<UserCertification>
  deleteCertification: (id: string) => Promise<void>
  toggleCertificationActivation: (id: string, isActivated: boolean) => Promise<void>
  refreshCertificationAnalytics: () => Promise<void>

  // Cache management
  clearCache: () => void
  preloadProfile: (id: string) => Promise<void>
  invalidateCache: (id?: string) => void
}

interface OrganizationActions {
  // Core organization management
  fetchOrganization: (id?: string) => Promise<void>
  updateOrganization: (updates: Partial<Organization>) => Promise<void>
  switchOrganization: (id: string) => Promise<void>

  // Settings management
  fetchSettings: () => Promise<void>
  updateSettings: (updates: Partial<OrganizationSettings>) => Promise<void>
  resetSettings: () => Promise<void>

  // Members management
  fetchMembers: () => Promise<void>
  inviteMember: (email: string, role: string) => Promise<void>
  updateMemberRole: (userId: string, role: string) => Promise<void>
  removeMember: (userId: string) => Promise<void>

  // Analytics
  refreshOrgAnalytics: () => Promise<void>
}

interface SyncActions {
  // Background sync
  startSync: () => void
  stopSync: () => void
  forcSync: () => Promise<void>
  addToSyncQueue: (item: {
    id: string
    type: 'profile' | 'organization'
    action: 'create' | 'update' | 'delete'
    data: unknown
    attempts: number
    lastAttempt: Date | null
  }) => void
  processSyncQueue: () => Promise<void>

  // Real-time updates
  subscribe: (resourceId: string) => void
  unsubscribe: (resourceId: string) => void
  handleRealtimeUpdate: (update: {
    type: string
    id: string
    data: unknown
  }) => void

  // Conflict resolution
  resolveConflict: (
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge'
  ) => void
  resolveAllConflicts: (resolution: 'local' | 'remote') => void
}

// Combined actions interface
interface ProfileStoreActions
  extends ProfileActions,
    OrganizationActions,
    SyncActions {}

// Final store type
type ProfileStore = ProfileStoreState & ProfileStoreActions

// =============================================
// STORE IMPLEMENTATION
// =============================================

export const useProfileStore = create<ProfileStore>()(
  devtools(
    subscribeWithSelector(
      immer<ProfileStore>((set, get) => ({
          // ==========================================
          // INITIAL STATE
          // ==========================================

          // Profile State
          current: null,
          profiles: [],
          loading: false,
          error: null,
          lastUpdated: null,
          optimisticUpdates: {},
          pendingChanges: new Set(),
          validation: null,
          isValidating: false,
          completeness: null,
          analytics: null,
          certifications: {
            govDatabase: null,
            govDatabaseLoading: false,
            govDatabaseError: null,
            analytics: null,
            analyticsLoading: false,
          },
          cache: {
            profiles: {},
            certificationCache: {},
            definitionCache: {},
            lastSync: null,
            isDirty: false,
          },

          // Organization State
          currentOrganization: null,
          organizationLoading: false,
          organizationError: null,
          organizationLastUpdated: null,
          settings: null,
          settingsLoading: false,
          members: [],
          membersLoading: false,
          orgAnalytics: null,
          organizations: [],
          switchingOrganization: false,

          // Sync State
          isSyncing: false,
          lastSync: null,
          syncQueue: [],
          subscription: {
            connected: false,
            lastHeartbeat: null,
            subscriptions: new Set(),
          },
          conflicts: [],

          // ==========================================
          // PROFILE ACTIONS
          // ==========================================

          fetchProfile: async (id?: string) => {
            set((state) => {
              state.loading = true
              state.error = null
            })

            try {
              // Check cache first
              const cacheKey = id || 'current'
              const cached = get().cache.profiles[cacheKey]
              const now = new Date()

              if (
                cached &&
                now.getTime() - cached.timestamp.getTime() < cached.ttl
              ) {
                set((state) => {
                  state.current = cached.data
                  state.loading = false
                  state.lastUpdated = cached.timestamp
                })
                return
              }

              // Fetch from API
              const url = id ? `/api/v1/profile/${id}` : '/api/v1/profile'
              const response = await fetch(url)
              const data = await response.json()

              if (data.success) {
                const profile = {
                  ...data.data,
                  createdAt: new Date(data.data.createdAt),
                  updatedAt: new Date(data.data.updatedAt),
                }

                set((state) => {
                  state.current = profile
                  state.loading = false
                  state.lastUpdated = now
                  state.error = null

                  // Update cache
                  state.cache.profiles[cacheKey] = {
                    data: profile,
                    timestamp: now,
                    ttl: 5 * 60 * 1000, // 5 minutes
                  }

                  // Calculate completeness
                  state.completeness = get().calculateCompleteness(profile)
                })
              } else {
                set((state) => {
                  state.error = data.error || 'Failed to fetch profile'
                  state.loading = false
                })
              }
            } catch (error) {
              console.error('Error fetching profile:', error)
              set((state) => {
                state.error = 'Network error while fetching profile'
                state.loading = false
              })
            }
          },

          updateProfile: async (updates: Partial<Profile>) => {
            const currentProfile = get().current
            if (!currentProfile) {
              throw new Error('No current profile to update')
            }

            // Apply optimistic update
            get().setOptimistic(updates)

            try {
              const response = await fetch('/api/v1/profile', {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
              })

              const data = await response.json()

              if (data.success) {
                const updatedProfile = {
                  ...data.data,
                  createdAt: new Date(data.data.createdAt),
                  updatedAt: new Date(data.data.updatedAt),
                }

                set((state) => {
                  state.current = updatedProfile
                  state.optimisticUpdates = {}
                  // Clear pending changes - ensure Set is properly initialized
                  state.pendingChanges = new Set()
                  state.lastUpdated = new Date()
                  state.error = null

                  // Update cache
                  state.cache.profiles['current'] = {
                    data: updatedProfile,
                    timestamp: new Date(),
                    ttl: 5 * 60 * 1000,
                  }

                  // Recalculate completeness
                  state.completeness =
                    get().calculateCompleteness(updatedProfile)
                })

                // Add to sync queue for background processing
                get().addToSyncQueue({
                  id: currentProfile.id,
                  type: 'profile',
                  action: 'update',
                  data: updates,
                  attempts: 0,
                  lastAttempt: null,
                })
              } else {
                // Revert optimistic update on error
                get().revertOptimistic()
                set((state) => {
                  state.error = data.error || 'Failed to update profile'
                })
              }
            } catch (error) {
              console.error('Error updating profile:', error)
              get().revertOptimistic()
              set((state) => {
                state.error = 'Network error while updating profile'
              })
            }
          },

          refreshProfile: async () => {
            const currentProfile = get().current
            if (currentProfile) {
              get().invalidateCache('current')
              await get().fetchProfile()
            }
          },

          setOptimistic: (updates: Partial<Profile>) => {
            set((state) => {
              state.optimisticUpdates = {
                ...state.optimisticUpdates,
                ...updates,
              }

              // Track pending changes - ensure Set is properly initialized
              // Initialize pendingChanges as Set if it doesn't exist or is not a Set
              if (
                !state.pendingChanges ||
                !(state.pendingChanges instanceof Set)
              ) {
                state.pendingChanges = new Set()
              }

              // Create new Set with existing changes and new ones for Immer compatibility
              const existingChanges = Array.from(state.pendingChanges)
              const newPendingChanges = new Set(existingChanges)
              Object.keys(updates).forEach((field) => {
                newPendingChanges.add(field)
              })
              state.pendingChanges = newPendingChanges

              // Apply optimistic updates to current profile
              if (state.current) {
                state.current = { ...state.current, ...updates }
              }
            })
          },

          revertOptimistic: () => {
            set((state) => {
              state.optimisticUpdates = {}

              // Clear pending changes - ensure Set is properly initialized
              if (!state.pendingChanges) {
                state.pendingChanges = new Set()
              } else {
                state.pendingChanges = new Set() // Create new Set for Immer compatibility
              }

              // Restore from cache
              const cached = state.cache.profiles['current']
              if (cached) {
                state.current = cached.data
              }
            })
          },

          fetchProfiles: async () => {
            try {
              const response = await fetch('/api/v1/profiles')
              const data = await response.json()

              if (data.success) {
                set((state) => {
                  state.profiles = data.data.map((p: any) => ({
                    ...p,
                    createdAt: new Date(p.createdAt),
                    updatedAt: new Date(p.updatedAt),
                  }))
                })
              }
            } catch (error) {
              console.error('Error fetching profiles:', error)
            }
          },

          createProfile: async (data: Partial<Profile>) => {
            try {
              const response = await fetch('/api/v1/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              })

              const result = await response.json()

              if (result.success) {
                const newProfile = {
                  ...result.data,
                  createdAt: new Date(result.data.createdAt),
                  updatedAt: new Date(result.data.updatedAt),
                }

                set((state) => {
                  state.profiles.push(newProfile)
                })

                return newProfile
              }
            } catch (error) {
              console.error('Error creating profile:', error)
              throw error
            }
          },

          deleteProfile: async (id: string) => {
            try {
              const response = await fetch(`/api/v1/profiles/${id}`, {
                method: 'DELETE',
              })

              const data = await response.json()

              if (data.success) {
                set((state) => {
                  state.profiles = state.profiles.filter((p) => p.id !== id)
                  if (state.current?.id === id) {
                    state.current = null
                  }
                })
              }
            } catch (error) {
              console.error('Error deleting profile:', error)
              throw error
            }
          },

          switchProfile: async (id: string) => {
            const profile = get().profiles.find((p) => p.id === id)
            if (profile) {
              set((state) => {
                state.current = profile
                state.lastUpdated = new Date()
              })
            } else {
              await get().fetchProfile(id)
            }
          },

          // ==========================================
          // VALIDATION ACTIONS
          // ==========================================

          validateProfile: async (
            profile?: Partial<Profile>
          ): Promise<ValidationResult> => {
            const targetProfile = profile || get().current
            if (!targetProfile) {
              return {
                isValid: false,
                score: 0,
                totalFields: 0,
                completedFields: 0,
                errors: [
                  {
                    field: 'profile',
                    message: 'No profile to validate',
                    severity: 'error',
                    code: 'NO_PROFILE',
                  },
                ],
                warnings: [],
                suggestions: [],
              }
            }

            set((state) => {
              state.isValidating = true
            })

            try {
              // Client-side validation
              const result = await validateProfileData(targetProfile)

              set((state) => {
                state.validation = result
                state.isValidating = false
              })

              return result
            } catch (error) {
              console.error('Error validating profile:', error)
              const errorResult = {
                isValid: false,
                score: 0,
                totalFields: 0,
                completedFields: 0,
                errors: [
                  {
                    field: 'validation',
                    message: 'Validation failed',
                    severity: 'error' as const,
                    code: 'VALIDATION_ERROR',
                  },
                ],
                warnings: [],
                suggestions: [],
              }

              set((state) => {
                state.validation = errorResult
                state.isValidating = false
              })

              return errorResult
            }
          },

          validateField: async (
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            _field: string,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            _value: unknown
          ): Promise<ProfileValidationError[]> => {
            // Implement field-specific validation
            return []
          },

          clearValidation: () => {
            set((state) => {
              state.validation = null
              state.isValidating = false
            })
          },

          // ==========================================
          // COMPLETENESS & ANALYTICS ACTIONS
          // ==========================================

          calculateCompleteness: (profile?: Profile): ProfileCompleteness => {
            const targetProfile = profile || get().current
            if (!targetProfile) {
              return {
                overall: 0,
                sections: {
                  basic: 0,
                  contact: 0,
                  business: 0,
                  naics: 0,
                  samGov: 0,
                  certifications: 0,
                  capabilities: 0,
                  pastPerformance: 0,
                },
                missingFields: [],
                nextSteps: [],
                scoreHistory: [],
              }
            }

            // Calculate section scores based on government contracting research
            const sections = {
              // Past Performance (35% total weight in research)
              pastPerformance: calculatePastPerformanceCompleteness(targetProfile),
              
              // Technical Capability (35% total weight in research) 
              naics: calculateNaicsCompleteness(targetProfile), // Primary NAICS (12%)
              certifications: calculateCertificationsCompleteness(targetProfile), // Certifications (6%)
              capabilities: calculateCapabilitiesCompleteness(targetProfile), // Core competencies & clearance (12%)
              
              // Strategic Fit & Relationships (15% total weight in research)
              business: calculateBusinessCompleteness(targetProfile), // Business type & size (4%)
              
              // Credibility & Market Presence (15% total weight in research)
              basic: calculateBasicCompleteness(targetProfile), // Company name & address (4%)
              contact: calculateContactCompleteness(targetProfile), // Professional contact info (5%)
              samGov: calculateSamGovCompleteness(targetProfile), // Government IDs & registration (6%)
            }

            // Calculate overall score using research-based weights from gov_contract_match_scoring.md
            // Weights reflect importance to government agencies when awarding contracts
            const weights = {
              // Past Performance: 35% (most critical factor per FAR 15.305 and GAO findings)
              pastPerformance: 0.35,
              
              // Technical Capability: 35% (ability to deliver required work)
              naics: 0.12,           // Primary NAICS match is critical
              certifications: 0.06,   // Industry certifications & security clearances  
              capabilities: 0.17,     // Core competencies, secondary NAICS, geographic prefs (35% - 12% - 6%)
              
              // Strategic Fit & Relationships: 15% (alignment with agency preferences)
              business: 0.04,         // Business type & employee count for set-aside requirements
              
              // Credibility & Market Presence: 15% (legitimacy and professionalism)
              basic: 0.04,           // Professional company name & physical address
              contact: 0.05,         // Professional web presence & contact info
              samGov: 0.06,          // Government registration identifiers (UEI, CAGE, DUNS)
            }

            const overall = Math.round(
              Object.entries(sections).reduce((sum, [key, score]) => {
                return sum + score * weights[key as keyof typeof weights]
              }, 0)
            )

            // Generate missing fields and next steps using ProfileFieldUtils
            const missingFields = ProfileFieldUtils.getCompletenessFields().filter(fieldName => 
              !ProfileFieldUtils.isFieldComplete(targetProfile, fieldName)
            )
            const nextSteps = ProfileFieldUtils.generateNextSteps(targetProfile)

            return {
              overall,
              sections,
              missingFields,
              nextSteps,
              scoreHistory: [], // TODO: Implement score history tracking
            }
          },

          refreshAnalytics: async () => {
            try {
              const response = await fetch('/api/v1/profile/analytics')
              const data = await response.json()

              if (data.success) {
                set((state) => {
                  state.analytics = {
                    ...data.data,
                    lastUpdated: new Date(data.data.lastUpdated),
                  }
                })
              }
            } catch (error) {
              console.error('Error fetching analytics:', error)
            }
          },

          trackProfileView: () => {
            // Track profile view for analytics
            fetch('/api/v1/profile/track-view', { method: 'POST' }).catch(
              () => {}
            )
          },

          // ==========================================
          // CERTIFICATION MANAGEMENT ACTIONS
          // ==========================================

          fetchGovDatabase: async () => {
            set((state) => {
              state.certifications.govDatabaseLoading = true
              state.certifications.govDatabaseError = null
            })

            try {
              // Use the statically imported certification data to avoid chunk loading issues
              const database = governmentCertificationsDatabase
              
              console.log(`✅ Government certifications database loaded: ${database.metadata?.totalCertifications || 0} certifications across ${database.certificationCategories.length} categories`)

              set((state) => {
                state.certifications.govDatabase = database
                state.certifications.govDatabaseLoading = false

                // Update definition cache
                if (database.certificationCategories) {
                  // Ensure cache structure exists
                  if (!state.cache) {
                    state.cache = {
                      profiles: {},
                      certificationCache: {},
                      definitionCache: {},
                      lastSync: null,
                      isDirty: false,
                    }
                  }
                  if (!state.cache.definitionCache) {
                    state.cache.definitionCache = {}
                  }
                  
                  database.certificationCategories.forEach((category: any) => {
                    category.certifications.forEach((cert: GovCertificationDefinition) => {
                      state.cache.definitionCache[cert.id] = cert
                    })
                  })
                }
              })
            } catch (error) {
              console.error('Error loading government certification database:', error)
              set((state) => {
                state.certifications.govDatabaseError = 'Failed to load certification database'
                state.certifications.govDatabaseLoading = false
              })
            }
          },

          getGovCertificationById: (id: string) => {
            // Check cache first
            const state = get()
            const cached = state.cache?.definitionCache?.[id]
            if (cached) return cached

            // Search in loaded database
            const database = state.certifications.govDatabase
            if (database) {
              for (const category of database.certificationCategories) {
                const cert = category.certifications.find((c) => c.id === id)
                if (cert) {
                  // Cache the result with safety check
                  set((state) => {
                    if (!state.cache) {
                      state.cache = {
                        profiles: {},
                        certificationCache: {},
                        definitionCache: {},
                        lastSync: null,
                        isDirty: false,
                      }
                    }
                    if (!state.cache.definitionCache) {
                      state.cache.definitionCache = {}
                    }
                    state.cache.definitionCache[id] = cert
                  })
                  return cert
                }
              }
            }

            return null
          },

          addCertification: async (data: CertificationFormData) => {
            try {
              console.log('🔍 addCertification called with:', data)
              
              const validationResult = validateCertificationForm(data)
              console.log('🔍 Validation result:', validationResult)
              
              if (!validationResult.success) {
                console.error('❌ Validation failed:', validationResult)
                throw new Error('Invalid certification data')
              }

              // Create new certification with timestamps and convert dates to ISO format
              const newCertification: UserCertification = {
                id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...validationResult.data,
                // Convert YYYY-MM-DD dates to ISO format for storage
                obtainedDate: new Date(validationResult.data.obtainedDate + 'T00:00:00.000Z').toISOString(),
                expirationDate: validationResult.data.expirationDate ? 
                  new Date(validationResult.data.expirationDate + 'T00:00:00.000Z').toISOString() : 
                  undefined,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              
              console.log('🔍 Created certification object:', newCertification)

              // Add to certifications array
              const currentProfile = get().current
              console.log('🔍 Current profile:', currentProfile)
              
              if (currentProfile) {
                // The certifications field is a JSON object, not just an array
                const currentCertificationsObj = (currentProfile.certifications as Record<string, any>) || {}
                const currentCertifications = currentCertificationsObj.certifications || []
                console.log('🔍 Current certifications object:', currentCertificationsObj)
                console.log('🔍 Current certifications array:', currentCertifications)
                
                const updatedCertifications = [...currentCertifications, newCertification]
                console.log('🔍 Updated certifications:', updatedCertifications)

                // Update profile via main profile endpoint - keep existing structure and update certifications
                console.log('🔍 Calling updateProfile...')
                await get().updateProfile({
                  certifications: {
                    ...currentCertificationsObj,
                    certifications: updatedCertifications,
                    setAsides: currentCertificationsObj?.setAsides || []
                  }
                })
                console.log('✅ Profile updated successfully')

                return newCertification
              } else {
                throw new Error('No current profile found')
              }
            } catch (error) {
              console.error('Error adding certification:', error)
              throw error
            }
          },

          updateCertification: async (id: string, data: Partial<CertificationFormData>) => {
            try {
              console.log('🔍 updateCertification called with:', { id, data })
              
              const currentProfile = get().current
              if (!currentProfile) {
                throw new Error('No current profile found')
              }

              const currentCertificationsObj = (currentProfile.certifications as Record<string, any>) || {}
              const certifications = currentCertificationsObj.certifications || []
              
              const certIndex = certifications.findIndex((cert: any) => cert.id === id)
              
              if (certIndex === -1) {
                throw new Error('Certification not found')
              }

              // Update the certification
              const updatedCertification = {
                ...certifications[certIndex],
                ...data,
                updatedAt: new Date().toISOString(),
              }

              const updatedCertifications = [...certifications]
              updatedCertifications[certIndex] = updatedCertification

              console.log('🔍 Updating profile with certifications:', updatedCertifications)

              // Update profile via main profile endpoint - use correct field name
              await get().updateProfile({
                certifications: {
                  ...currentCertificationsObj,
                  certifications: updatedCertifications,
                  setAsides: currentCertificationsObj?.setAsides || []
                }
              })

              console.log('✅ Certification updated successfully')
              return updatedCertification
            } catch (error) {
              console.error('Error updating certification:', error)
              throw error
            }
          },

          deleteCertification: async (id: string) => {
            try {
              const currentProfile = get().current
              if (!currentProfile) {
                throw new Error('No current profile found')
              }

              const currentCertificationsObj = (currentProfile.certifications as Record<string, any>) || {}
              const certifications = currentCertificationsObj.certifications || []
              
              const updatedCertifications = certifications.filter((cert: any) => cert.id !== id)

              // Update profile via main profile endpoint - use correct field name
              await get().updateProfile({
                certifications: {
                  ...currentCertificationsObj,
                  certifications: updatedCertifications,
                  setAsides: currentCertificationsObj?.setAsides || []
                }
              })
            } catch (error) {
              console.error('Error deleting certification:', error)
              throw error
            }
          },

          toggleCertificationActivation: async (id: string, isActivated: boolean) => {
            try {
              // Simply update the isActivated field using updateCertification
              await get().updateCertification(id, { isActivated })
            } catch (error) {
              console.error('Error toggling certification activation:', error)
              throw error
            }
          },

          refreshCertificationAnalytics: async () => {
            set((state) => {
              state.certifications.analyticsLoading = true
            })

            try {
              const response = await fetch('/api/v1/profile/certifications/analytics')
              const data = await response.json()

              if (data.success) {
                set((state) => {
                  state.certifications.analytics = data.data
                  state.certifications.analyticsLoading = false
                })
              } else {
                set((state) => {
                  state.certifications.analyticsLoading = false
                })
              }
            } catch (error) {
              console.error('Error fetching certification analytics:', error)
              set((state) => {
                state.certifications.analyticsLoading = false
              })
            }
          },

          // ==========================================
          // CACHE MANAGEMENT ACTIONS
          // ==========================================

          clearCache: () => {
            set((state) => {
              state.cache.profiles = {}
              state.cache.certificationCache = {}
              state.cache.definitionCache = {}
              state.cache.lastSync = null
              state.cache.isDirty = false
            })
          },

          preloadProfile: async (id: string) => {
            const cached = get().cache.profiles[id]
            if (
              !cached ||
              new Date().getTime() - cached.timestamp.getTime() > cached.ttl
            ) {
              await get().fetchProfile(id)
            }
          },

          invalidateCache: (id?: string) => {
            set((state) => {
              if (id) {
                delete state.cache.profiles[id]
              } else {
                state.cache.profiles = {}
              }
              state.cache.isDirty = true
            })
          },

          // ==========================================
          // ORGANIZATION ACTIONS
          // ==========================================

          fetchOrganization: async (id?: string) => {
            set((state) => {
              state.organizationLoading = true
            })

            try {
              const url = id
                ? `/api/v1/organizations/${id}`
                : '/api/v1/organization'
              const response = await fetch(url)
              const data = await response.json()

              if (data.success) {
                set((state) => {
                  state.currentOrganization = {
                    ...data.data,
                    createdAt: new Date(data.data.createdAt),
                    updatedAt: new Date(data.data.updatedAt),
                  }
                  state.organizationLoading = false
                  state.organizationLastUpdated = new Date()
                })
              }
            } catch (error) {
              console.error('Error fetching organization:', error)
              set((state) => {
                state.organizationError = 'Failed to fetch organization'
                state.organizationLoading = false
              })
            }
          },

          updateOrganization: async (updates: Partial<Organization>) => {
            try {
              const response = await fetch('/api/v1/organization', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              })

              const data = await response.json()

              if (data.success) {
                set((state) => {
                  if (state.currentOrganization) {
                    state.currentOrganization = { ...state.currentOrganization, ...updates }
                    state.organizationLastUpdated = new Date()
                  }
                })
              }
            } catch (error) {
              console.error('Error updating organization:', error)
              throw error
            }
          },

          switchOrganization: async (id: string) => {
            set((state) => {
              state.switchingOrganization = true
            })

            try {
              await get().fetchOrganization(id)
              // Also refresh profile data for new organization
              await get().fetchProfile()
            } finally {
              set((state) => {
                state.switchingOrganization = false
              })
            }
          },

          // ==========================================
          // SETTINGS ACTIONS
          // ==========================================

          fetchSettings: async () => {
            set((state) => {
              state.settingsLoading = true
            })

            try {
              const response = await fetch('/api/v1/organization/settings')
              const data = await response.json()

              if (data.success) {
                set((state) => {
                  state.settings = data.data
                  state.settingsLoading = false
                })
              }
            } catch (error) {
              console.error('Error fetching settings:', error)
              set((state) => {
                state.settingsLoading = false
              })
            }
          },

          updateSettings: async (updates: Partial<OrganizationSettings>) => {
            try {
              const response = await fetch('/api/v1/organization/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              })

              const data = await response.json()

              if (data.success) {
                set((state) => {
                  if (state.settings) {
                    state.settings = { ...state.settings, ...updates }
                  }
                })
              }
            } catch (error) {
              console.error('Error updating settings:', error)
              throw error
            }
          },

          resetSettings: async () => {
            try {
              const response = await fetch('/api/v1/organization/settings', {
                method: 'DELETE',
              })

              if (response.ok) {
                await get().fetchSettings()
              }
            } catch (error) {
              console.error('Error resetting settings:', error)
              throw error
            }
          },

          // ==========================================
          // MEMBERS ACTIONS
          // ==========================================

          fetchMembers: async () => {
            set((state) => {
              state.membersLoading = true
            })

            try {
              const response = await fetch('/api/v1/organization/members')
              const data = await response.json()

              if (data.success) {
                set((state) => {
                  state.members = data.data
                  state.membersLoading = false
                })
              }
            } catch (error) {
              console.error('Error fetching members:', error)
              set((state) => {
                state.membersLoading = false
              })
            }
          },

          inviteMember: async (email: string, role: string) => {
            try {
              const response = await fetch(
                '/api/v1/organization/members/invite',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, role }),
                }
              )

              const data = await response.json()

              if (data.success) {
                // Refresh members list
                await get().fetchMembers()
              }
            } catch (error) {
              console.error('Error inviting member:', error)
              throw error
            }
          },

          updateMemberRole: async (userId: string, role: string) => {
            try {
              const response = await fetch(
                `/api/v1/organization/members/${userId}`,
                {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ role }),
                }
              )

              const data = await response.json()

              if (data.success) {
                set((state) => {
                  const member = state.members.find((m) => m.id === userId)
                  if (member) {
                    member.role = role as
                      | 'OWNER'
                      | 'ADMIN'
                      | 'MEMBER'
                      | 'VIEWER'
                  }
                })
              }
            } catch (error) {
              console.error('Error updating member role:', error)
              throw error
            }
          },

          removeMember: async (userId: string) => {
            try {
              const response = await fetch(
                `/api/v1/organization/members/${userId}`,
                {
                  method: 'DELETE',
                }
              )

              const data = await response.json()

              if (data.success) {
                set((state) => {
                  state.members = state.members.filter((m) => m.id !== userId)
                })
              }
            } catch (error) {
              console.error('Error removing member:', error)
              throw error
            }
          },

          refreshOrgAnalytics: async () => {
            try {
              const response = await fetch('/api/v1/organization/analytics')
              const data = await response.json()

              if (data.success) {
                set((state) => {
                  state.orgAnalytics = {
                    ...data.data,
                    lastActivityDate: data.data.lastActivityDate
                      ? new Date(data.data.lastActivityDate)
                      : null,
                  }
                })
              }
            } catch (error) {
              console.error('Error fetching organization analytics:', error)
            }
          },

          // ==========================================
          // SYNC ACTIONS
          // ==========================================

          startSync: () => {
            set((state) => {
              state.isSyncing = true
            })
            // TODO: Implement background sync service
          },

          stopSync: () => {
            set((state) => {
              state.isSyncing = false
            })
          },

          forcSync: async () => {
            await get().processSyncQueue()
          },

          addToSyncQueue: (item: {
            id: string
            type: 'profile' | 'organization'
            action: 'create' | 'update' | 'delete'
            data: unknown
            attempts: number
            lastAttempt: Date | null
          }) => {
            set((state) => {
              state.syncQueue.push({
                ...item,
                id: item.id || `sync_${Date.now()}`,
              })
            })
          },

          processSyncQueue: async () => {
            const queue = get().syncQueue
            if (queue.length === 0) return

            set((state) => {
              state.isSyncing = true
            })

            try {
              // Process queue items
              for (const item of queue) {
                try {
                  // TODO: Implement sync processing
                  console.log('Processing sync item:', item)
                } catch (error) {
                  console.error('Error processing sync item:', error)

                  set((state) => {
                    const queueItem = state.syncQueue.find(
                      (q) => q.id === item.id
                    )
                    if (queueItem) {
                      queueItem.attempts++
                      queueItem.lastAttempt = new Date()
                    }
                  })
                }
              }

              // Clear successful items
              set((state) => {
                state.syncQueue = state.syncQueue.filter(
                  (item) => item.attempts < 3
                )
              })
            } finally {
              set((state) => {
                state.isSyncing = false
              })
            }
          },

          subscribe: (resourceId: string) => {
            set((state) => {
              state.subscription.subscriptions.add(resourceId)
            })
          },

          unsubscribe: (resourceId: string) => {
            set((state) => {
              state.subscription.subscriptions.delete(resourceId)
            })
          },

          handleRealtimeUpdate: (update: {
            type: string
            id: string
            data: unknown
          }) => {
            // Handle real-time updates from WebSocket or SSE
            console.log('Real-time update received:', update)
          },

          resolveConflict: (
            conflictId: string,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            _resolution: 'local' | 'remote' | 'merge'
          ) => {
            set((state) => {
              state.conflicts = state.conflicts.filter(
                (c) => c.id !== conflictId
              )
            })
          },

          resolveAllConflicts: (
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            _resolution: 'local' | 'remote'
          ) => {
            set((state) => {
              state.conflicts = []
            })
          },

          // ==========================================
          // GLOBAL ACTIONS
          // ==========================================

          reset: () => {
            set((state) => {
              // Reset all state to initial values
              Object.assign(state, {
                current: null,
                profiles: [],
                loading: false,
                error: null,
                lastUpdated: null,
                optimisticUpdates: {},
                pendingChanges: new Set(),
                validation: null,
                isValidating: false,
                completeness: null,
                analytics: null,
                certifications: {
                  govDatabase: null,
                  govDatabaseLoading: false,
                  govDatabaseError: null,
                  analytics: null,
                  analyticsLoading: false,
                },
                cache: {
                  profiles: {},
                  certificationCache: {},
                  definitionCache: {},
                  lastSync: null,
                  isDirty: false,
                },
                currentOrganization: null,
                organizationLoading: false,
                organizationError: null,
                organizationLastUpdated: null,
                settings: null,
                settingsLoading: false,
                members: [],
                membersLoading: false,
                orgAnalytics: null,
                organizations: [],
                switchingOrganization: false,
                isSyncing: false,
                lastSync: null,
                syncQueue: [],
                subscription: {
                  connected: false,
                  lastHeartbeat: null,
                  subscriptions: new Set(),
                },
                conflicts: [],
              })
            })
          },

          initialize: (data: {
            profile?: Profile
            organization?: Organization
            user?: User
          }) => {
            set((state) => {
              if (data.profile) {
                state.current = data.profile
                state.completeness = get().calculateCompleteness(data.profile)
              }

              if (data.organization) {
                // Note: This sets organization data in the main store, separate from profile data
                // TODO: Implement proper organization state management
                console.log('Organization data received:', data.organization)
              }

              state.lastUpdated = new Date()
            })
          },
        }))
    ),
    {
      name: 'profile-store-devtools',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

// =============================================
// HELPER FUNCTIONS
// =============================================

async function validateProfileData(
  profile: Partial<Profile>
): Promise<ValidationResult> {
  const errors: ProfileValidationError[] = []
  const warnings: ProfileValidationError[] = []
  const suggestions: ProfileValidationError[] = []

  // Basic validation
  if (!profile.companyName?.trim()) {
    errors.push({
      field: 'companyName',
      message: 'Company name is required',
      severity: 'error',
      code: 'REQUIRED_FIELD',
    })
  }

  // Email validation
  if (
    profile.primaryContactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.primaryContactEmail)
  ) {
    errors.push({
      field: 'primaryContactEmail',
      message: 'Invalid email format',
      severity: 'error',
      code: 'INVALID_FORMAT',
    })
  }

  // NAICS validation
  if (profile.primaryNaics && !/^\d{6}$/.test(profile.primaryNaics)) {
    errors.push({
      field: 'primaryNaics',
      message: 'NAICS code must be 6 digits',
      severity: 'error',
      code: 'INVALID_FORMAT',
    })
  }

  // Use ProfileFieldUtils for dynamic field counting and validation
  // This ensures the scoring always reflects the latest profile structure
  const profileCompletenessFields = ProfileFieldUtils.getCompletenessFields()
  const totalFields = ProfileFieldUtils.getTotalFields()
  
  const completedFields = profileCompletenessFields.filter((fieldName) => {
    return ProfileFieldUtils.isFieldComplete(profile as Profile, fieldName)
  }).length

  const score = Math.round((completedFields / totalFields) * 100)

  return {
    isValid: errors.length === 0,
    score,
    totalFields,
    completedFields,
    errors,
    warnings,
    suggestions,
  }
}

function calculateBasicCompleteness(profile: Profile): number {
  let score = 0
  
  // Credibility & Market Presence - Basic Information (4% of total profile weight)
  // Professional company name and physical business address verification
  
  // Company Name (2% of total profile) - Professional company name and branding
  if (profile.companyName && profile.companyName.toString().trim() !== '') {
    score += 50 // Critical field - half the basic score
  }
  
  // Physical Business Address - Professional business address verification
  const addressFields = ['addressLine1', 'city', 'state', 'zipCode']
  const completedAddressFields = addressFields.filter((field) => {
    const value = profile[field as keyof Profile]
    return value && value.toString().trim() !== ''
  }).length
  
  // Address completeness contributes remaining 50%
  score += Math.round((completedAddressFields / addressFields.length) * 50)
  
  return Math.min(score, 100)
}

function calculateContactCompleteness(profile: Profile): number {
  let score = 0
  
  // Credibility & Market Presence - Contact Information (5% of total profile weight)
  // Professional web presence and contact information
  
  // Website (2% of total profile) - Professional web presence
  if (profile.website && profile.website.toString().trim() !== '') {
    score += 40 // Professional web presence is highly valued
  }
  
  // Primary Contact Information - Direct contact availability
  const contactFields = [
    'primaryContactName',   // Designated primary contact (1%)
    'primaryContactEmail',  // Professional contact information (1%)
    'primaryContactPhone',  // Direct contact availability (1%)
  ]
  
  const completedContactFields = contactFields.filter((field) => {
    const value = profile[field as keyof Profile]
    return value && value.toString().trim() !== ''
  }).length
  
  // Each contact field contributes 20 points (60% total)
  score += (completedContactFields / contactFields.length) * 60
  
  return Math.round(Math.min(score, 100))
}

function calculateSamGovCompleteness(profile: Profile): number {
  let score = 0
  
  // Credibility & Market Presence - Government Registration (6% of total profile weight)
  // Government registration identifiers (UEI, CAGE, DUNS) - 25 points per valid ID
  
  const samGovData = (profile as any).samGovData
  const samGovSyncedAt = (profile as any).samGovSyncedAt
  
  // Full SAM.gov integration (100%) - actual sync with SAM.gov system
  // This represents legitimate government contractor status
  if ((samGovData && (samGovData.uei || samGovData.entityName)) || samGovSyncedAt) {
    return 100
  }
  
  // Government IDs - 25 points per valid government identifier
  let govIdScore = 0
  
  if (profile.uei && profile.uei.toString().trim() !== '') {
    govIdScore += 35 // UEI is most important - required for new registrations
  }
  
  if (profile.cageCode && profile.cageCode.toString().trim() !== '') {
    govIdScore += 30 // CAGE Code is critical for defense contracting
  }
  
  if (profile.duns && profile.duns.toString().trim() !== '') {
    govIdScore += 25 // DUNS number (legacy but still used)
  }
  
  score = Math.min(govIdScore, 90) // Cap at 90% without full SAM.gov sync
  
  return score
}

function calculateBusinessCompleteness(profile: Profile): number {
  let score = 0
  
  // Strategic Fit - Business Information (4% of total profile weight)
  // Business classification and size for set-aside and scale requirements
  
  // Business type and employee count are most important for government contracting
  // (set-aside requirements and scale matching)
  if (profile.businessType) {
    score += 40 // Higher weight for business type (set-aside eligibility)
  }
  
  if (profile.employeeCount) {
    score += 40 // Higher weight for employee count (size standards)
  }
  
  // Year established and revenue are supporting factors
  if (profile.yearEstablished && profile.yearEstablished > 0) {
    score += 10 // Stability indicator
  }
  
  if (profile.annualRevenue) {
    score += 10 // Financial capacity indicator
  }
  
  return Math.min(score, 100)
}

function calculateNaicsCompleteness(profile: Profile): number {
  let score = 0
  
  // Primary NAICS (12% of total profile weight) - Critical for opportunity matching
  // Must match opportunity requirements exactly for government contracting
  if (profile.primaryNaics && profile.primaryNaics.trim() !== '') {
    score += 80 // Primary NAICS is critical - higher weight
  }
  
  // Secondary NAICS (5% of total profile weight) - Shows capability breadth
  if (profile.secondaryNaics && profile.secondaryNaics.length > 0) {
    score += 20 // Secondary NAICS adds breadth
  }
  
  return Math.min(score, 100)
}

function calculateCertificationsCompleteness(profile: Profile): number {
  if (!profile.certifications) return 0

  const certs = profile.certifications as any
  let score = 0
  
  // Certifications (6% of total profile weight) - High importance for government contracting
  // Industry certifications including ISO, CMMI, security clearances
  
  // Check new certification structure first
  if ('certifications' in certs && Array.isArray(certs.certifications)) {
    const certArray = certs.certifications as any[]
    if (certArray.length > 0) {
      // 15 points per relevant certification
      score = Math.min(100, certArray.length * 15)
      return score
    }
  }
  
  // Legacy certification structure
  const legacyCertFields = [
    'has8a',          // 8(a) Business Development Program
    'hasHubZone',     // Historically Underutilized Business Zone
    'hasSdvosb',      // Service-Disabled Veteran-Owned Small Business
    'hasWosb',        // Women-Owned Small Business
    'hasEdwosb',      // Economically Disadvantaged WOSB
    'hasVosb',        // Veteran-Owned Small Business
    'hasSdb',         // Small Disadvantaged Business
    'hasGSASchedule', // GSA Schedule Contract
    'hasISO9001',     // ISO 9001 Quality Management
    'hasCMMI',        // Capability Maturity Model Integration
  ]

  const activeCerts = legacyCertFields.filter((field) => certs[field] === true)
  
  if (activeCerts.length > 0) {
    // 15 points per certification, with bonus for multiple certifications
    score = Math.min(100, activeCerts.length * 15)
  }
  
  return score
}

function calculateCapabilitiesCompleteness(profile: Profile): number {
  let score = 0
  
  // Technical Capabilities (17% of total profile weight)
  // Core competencies (8% of total profile) + Secondary NAICS + Geographic preferences
  
  // Core competencies - Technical competencies and specializations
  if (profile.coreCompetencies && profile.coreCompetencies.length > 0) {
    score += 40 // 10 points per relevant competency
  }
  
  // Security clearance (4% of total profile) - Important for classified work
  if (profile.securityClearance && profile.securityClearance !== 'None') {
    // Security clearance levels: Public Trust, Secret, Top Secret, Top Secret/SCI
    score += 25 // 20 points per clearance level above requirement
  }
  
  // Geographic preferences (5% of total profile) - Strategic Fit category  
  const geoPrefs = (profile as any).geographicPreferences
  if (geoPrefs && typeof geoPrefs === 'object') {
    let geoScore = 0
    
    // Check for location preferences - Perfect overlap = 100, Partial = 60, None = 0
    if (geoPrefs.preferences) {
      if (typeof geoPrefs.preferences === 'object' && !Array.isArray(geoPrefs.preferences)) {
        // New grouped structure
        const hasLocationPreferences = Object.values(geoPrefs.preferences).some(
          (arr: any) => Array.isArray(arr) && arr.length > 0
        )
        if (hasLocationPreferences) geoScore += 15
      } else if (Array.isArray(geoPrefs.preferences) && geoPrefs.preferences.length > 0) {
        // Legacy flat array structure
        geoScore += 15
      }
    }
    
    // Check for travel preferences
    if (geoPrefs.workFromHome !== undefined || geoPrefs.travelWillingness || geoPrefs.maxTravelPercentage !== undefined) {
      geoScore += 10
    }
    
    score += Math.min(geoScore, 25)
  }
  
  // Government levels preferences (3% of total profile) - Strategic Fit category
  const governmentLevels = (profile as any).governmentLevels
  if (governmentLevels && Array.isArray(governmentLevels) && governmentLevels.length > 0) {
    score += 10 // Government level match
  }
  
  return Math.min(score, 100)
}

function calculatePastPerformanceCompleteness(profile: Profile): number {
  if (!profile.pastPerformance) return 0

  const pastPerf = profile.pastPerformance as Record<string, unknown>
  let score = 0
  
  // Past Performance scoring based on government contracting research (35% total weight)
  // This is the most critical factor per FAR 15.305 and GAO findings
  
  // Key Projects (20% of total profile) - Most important component
  if (pastPerf.keyProjects && Array.isArray(pastPerf.keyProjects)) {
    const projectCount = pastPerf.keyProjects.length
    if (projectCount === 0) {
      score += 0  // 0-40 points for no projects
    } else if (projectCount >= 1 && projectCount <= 2) {
      score += 40 // 0-40 points for 1-2 projects
    } else if (projectCount >= 3 && projectCount <= 5) {
      score += 70 // 40-70 points for 3-5 projects
    } else {
      score += 85 // 70-100 points for 6+ detailed projects
    }
  }
  
  // Total Contract Value (8% of total profile) - Scale capability
  if (pastPerf.totalContractValue && pastPerf.totalContractValue.toString().trim() !== '') {
    score += 10 // +10 points bonus
  }
  
  // Years in Business (4% of total profile) - Stability indicator
  if (pastPerf.yearsInBusiness && pastPerf.yearsInBusiness.toString().trim() !== '') {
    const years = parseInt(pastPerf.yearsInBusiness.toString())
    if (years > 5) {
      score += 5 // +5 points bonus for >5 years
    }
  }
  
  return Math.min(score, 100)
}

// DEPRECATED: getMissingFields function has been replaced with ProfileFieldUtils.getCompletenessFields() 
// and ProfileFieldUtils.isFieldComplete() for dynamic field counting and validation

// DEPRECATED: generateNextSteps function has been replaced with ProfileFieldUtils.generateNextSteps() 
// for dynamic next steps generation based on profile completeness analysis

// =============================================
// STORE SELECTORS
// =============================================

// Profile selectors
// Stable selector that won't cause infinite re-renders
export const useCurrentProfile = () => {
  return useProfileStore(
    (state) => state.current
  )
}

// Note: Removed useProfileData due to shallow comparison issues with Zustand
// Use individual selectors (useCurrentProfile, useProfileLoading, useProfileError) instead
export const useProfileLoading = () => useProfileStore((state) => state.loading)
export const useProfileError = () => useProfileStore((state) => state.error)
export const useProfileCompleteness = () =>
  useProfileStore((state) => state.completeness)
export const useProfileAnalytics = () =>
  useProfileStore((state) => state.analytics)
export const useProfileValidation = () =>
  useProfileStore((state) => state.validation)
export const usePendingChanges = () =>
  useProfileStore((state) => state.pendingChanges)

// Organization selectors
export const useCurrentOrganization = () =>
  useProfileStore((state) => state.currentOrganization)
export const useOrganizationLoading = () =>
  useProfileStore((state) => state.organizationLoading)
export const useOrganizationError = () =>
  useProfileStore((state) => state.organizationError)
export const useOrganizationAnalytics = () =>
  useProfileStore((state) => state.orgAnalytics)

// Sync selectors
export const useSyncStatus = () =>
  useProfileStore(
    (state) => ({
      isSyncing: state.isSyncing,
      queueLength: state.syncQueue.length,
      lastSync: state.lastSync,
      conflicts: state.conflicts.length,
    })
  )

// Individual action hooks - more stable than object selectors
export const useFetchProfile = () =>
  useProfileStore((state) => state.fetchProfile)
export const useUpdateProfile = () =>
  useProfileStore((state) => state.updateProfile)
export const useRefreshProfile = () =>
  useProfileStore((state) => state.refreshProfile)
export const useValidateProfile = () =>
  useProfileStore((state) => state.validateProfile)
export const useCalculateCompleteness = () =>
  useProfileStore((state) => state.calculateCompleteness)
export const useFetchOrganization = () =>
  useProfileStore((state) => state.fetchOrganization)
export const useUpdateOrganization = () =>
  useProfileStore((state) => state.updateOrganization)
export const useFetchSettings = () =>
  useProfileStore((state) => state.fetchSettings)
export const useUpdateSettings = () =>
  useProfileStore((state) => state.updateSettings)
export const useInitializeStore = () =>
  useProfileStore((state) => state.initialize)
export const useResetStore = () => useProfileStore((state) => state.reset)

// Certification action hooks
export const useFetchGovDatabase = () =>
  useProfileStore((state) => state.fetchGovDatabase)
export const useGetGovCertificationById = () =>
  useProfileStore((state) => state.getGovCertificationById)
export const useAddCertification = () =>
  useProfileStore((state) => state.addCertification)
export const useUpdateCertification = () =>
  useProfileStore((state) => state.updateCertification)
export const useDeleteCertification = () =>
  useProfileStore((state) => state.deleteCertification)
export const useToggleCertificationActivation = () =>
  useProfileStore((state) => state.toggleCertificationActivation)
export const useRefreshCertificationAnalytics = () =>
  useProfileStore((state) => state.refreshCertificationAnalytics)

// Certification data selectors
export const useGovDatabase = () =>
  useProfileStore((state) => state.certifications.govDatabase)
export const useGovDatabaseLoading = () =>
  useProfileStore((state) => state.certifications.govDatabaseLoading)
export const useGovDatabaseError = () =>
  useProfileStore((state) => state.certifications.govDatabaseError)
export const useCertificationAnalytics = () =>
  useProfileStore((state) => state.certifications.analytics)
export const useCertificationAnalyticsLoading = () =>
  useProfileStore((state) => state.certifications.analyticsLoading)

// Legacy combined selector - deprecated, use individual hooks above
export const useProfileStoreActions = () => {
  // This is kept for backward compatibility but should be replaced
  // with individual action hooks to prevent infinite loops
  console.warn(
    'useProfileStoreActions is deprecated. Use individual action hooks instead.'
  )
  return {
    fetchProfile: useFetchProfile(),
    updateProfile: useUpdateProfile(),
    refreshProfile: useRefreshProfile(),
    validateProfile: useValidateProfile(),
    calculateCompleteness: useCalculateCompleteness(),
    fetchOrganization: useFetchOrganization(),
    updateOrganization: useUpdateOrganization(),
    fetchSettings: useFetchSettings(),
    updateSettings: useUpdateSettings(),
    initialize: useInitializeStore(),
    reset: useResetStore(),
  }
}

export default useProfileStore
