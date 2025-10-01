/**
 * Contact Store - Zustand state management for CRM system
 *
 * Manages contact data, search filters, and UI state for the contact management system.
 * Includes caching, optimistic updates, and error handling.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import type {
  Contact,
  ContactSearchData,
  CreateContactData,
  UpdateContactData,
  ContactInteraction,
  Communication,
  PaginatedResponse,
  ApiResponse,
} from '@/types/contacts'

interface ContactOpportunity {
  id: string
  contactId: string
  opportunityId: string
  organizationId: string
  relationship: string
  isPrimary: boolean
  notes?: string
  confidence?: number
  createdAt: Date
  updatedAt: Date
  opportunity?: {
    id: string
    title: string
    solicitationNumber?: string
    agency: string
    responseDeadline?: Date
    estimatedValue?: number
    status?: string
    type?: string
    setAside?: string
    location?: string
    description?: string
    naicsCode?: string
    pscCode?: string
  }
}

interface ContactState {
  // Contact data
  contacts: Contact[]
  selectedContact: Contact | null
  totalContacts: number

  // Search and filters
  searchFilters: ContactSearchData
  searchQuery: string
  isSearching: boolean

  // Pagination
  currentPage: number
  totalPages: number
  hasMore: boolean

  // Loading states
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean

  // Error states
  error: string | null
  fieldErrors: Record<string, string>

  // Cache and optimization
  lastFetchTime: number
  cacheTimeout: number // 5 minutes
  searchCache: Map<string, { data: Contact[]; timestamp: number }>

  // UI state
  isContactDrawerOpen: boolean
  contactDrawerMode: 'view' | 'edit' | 'create'
  selectedContactIds: string[]

  // Related data
  contactInteractions: Map<string, ContactInteraction[]>
  contactCommunications: Map<string, Communication[]>
  contactOpportunities: Map<string, ContactOpportunity[]>
}

interface ContactActions {
  // Contact CRUD operations
  fetchContacts: (params?: ContactSearchData) => Promise<void>
  createContact: (data: CreateContactData) => Promise<Contact | null>
  updateContact: (
    id: string,
    data: UpdateContactData
  ) => Promise<Contact | null>
  deleteContact: (id: string) => Promise<boolean>
  bulkDeleteContacts: (ids: string[]) => Promise<boolean>

  // Contact selection and management
  selectContact: (contact: Contact | null) => void
  toggleContactSelection: (contactId: string) => void
  clearContactSelection: () => void

  // Search and filtering
  setSearchFilters: (filters: Partial<ContactSearchData>) => void
  clearSearchFilters: () => void
  setSearchQuery: (query: string) => void
  performSearch: () => Promise<void>

  // Pagination
  setCurrentPage: (page: number) => void
  loadNextPage: () => Promise<void>

  // UI state management
  openContactDrawer: (
    mode: 'view' | 'edit' | 'create',
    contact?: Contact
  ) => void
  closeContactDrawer: () => void
  setContactDrawerMode: (mode: 'view' | 'edit' | 'create') => void

  // Cache management
  clearCache: () => void
  isCacheValid: (key?: string) => boolean

  // Error handling
  setError: (error: string | null) => void
  setFieldErrors: (errors: Record<string, string>) => void
  clearErrors: () => void

  // Related data
  loadContactInteractions: (contactId: string) => Promise<void>
  loadContactCommunications: (contactId: string) => Promise<void>
  addContactInteraction: (
    contactId: string,
    interaction: ContactInteraction
  ) => void
  addContactCommunication: (
    contactId: string,
    communication: Communication
  ) => void

  // Contact-Opportunity relationships
  loadContactOpportunities: (contactId: string) => Promise<void>
  linkContactToOpportunity: (
    contactId: string,
    data: {
      opportunityId: string
      relationship?: string
      isPrimary?: boolean
      notes?: string
      confidence?: number
    }
  ) => Promise<boolean>
  updateContactOpportunity: (
    contactId: string,
    opportunityId: string,
    data: {
      relationship?: string
      isPrimary?: boolean
      notes?: string
      confidence?: number
    }
  ) => Promise<boolean>
  unlinkContactFromOpportunity: (
    contactId: string,
    opportunityId: string
  ) => Promise<boolean>

  // Utility actions
  reset: () => void
  refreshContacts: () => Promise<void>
  exportContacts: (contactIds?: string[]) => Promise<void>
}

// Default search filters
const defaultSearchFilters: ContactSearchData = {
  sort: 'lastName',
  order: 'asc',
  limit: 20,
  offset: 0,
  page: 1,
}

// Initial state
const initialState: ContactState = {
  contacts: [],
  selectedContact: null,
  totalContacts: 0,

  searchFilters: defaultSearchFilters,
  searchQuery: '',
  isSearching: false,

  currentPage: 1,
  totalPages: 1,
  hasMore: false,

  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,

  error: null,
  fieldErrors: {},

  lastFetchTime: 0,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  searchCache: new Map(),

  isContactDrawerOpen: false,
  contactDrawerMode: 'view',
  selectedContactIds: [],

  contactInteractions: new Map(),
  contactCommunications: new Map(),
  contactOpportunities: new Map(),
}

export const useContactStore = create<ContactState & ContactActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Contact CRUD operations
        fetchContacts: async (params?: ContactSearchData) => {
          set({ isLoading: true, error: null })

          try {
            const searchParams = { ...get().searchFilters, ...params }
            const cacheKey = JSON.stringify(searchParams)

            // Check cache first
            if (get().isCacheValid(cacheKey)) {
              const cached = get().searchCache.get(cacheKey)
              if (cached) {
                set({
                  contacts: cached.data,
                  isLoading: false,
                  totalContacts: cached.data.length,
                })
                return
              }
            }

            const queryString = new URLSearchParams(
              Object.entries(searchParams).reduce(
                (acc, [key, value]) => {
                  if (value !== undefined && value !== null && value !== '') {
                    if (Array.isArray(value)) {
                      acc[key] = value.join(',')
                    } else {
                      acc[key] = String(value)
                    }
                  }
                  return acc
                },
                {} as Record<string, string>
              )
            ).toString()

            const response = await fetch(`/api/v1/contacts?${queryString}`)

            if (!response.ok) {
              throw new Error(
                `Failed to fetch contacts: ${response.statusText}`
              )
            }

            const result = await response.json()

            // Update cache
            get().searchCache.set(cacheKey, {
              data: result.items || [],
              timestamp: Date.now(),
            })

            set({
              contacts: result.items || [],
              totalContacts: result.total || 0,
              currentPage: result.page || 1,
              totalPages: result.totalPages || 1,
              hasMore: result.hasMore || false,
              lastFetchTime: Date.now(),
              isLoading: false,
              searchFilters: searchParams,
            })
          } catch (error) {
            console.error('Error fetching contacts:', error)
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to fetch contacts',
              isLoading: false,
            })
          }
        },

        createContact: async (data: CreateContactData) => {
          set({ isCreating: true, error: null, fieldErrors: {} })

          try {
            console.log('Creating contact with data:', data)

            const response = await fetch('/api/v1/contacts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            })

            let result: ApiResponse<Contact>
            const responseText = await response.text()

            try {
              result = JSON.parse(responseText)
            } catch (jsonError) {
              console.error('Failed to parse JSON response:', jsonError)
              console.error('Response text:', responseText)
              throw new Error(
                `Server error (${response.status}): Invalid JSON response`
              )
            }

            if (!response.ok || !result.success) {
              console.error('Create contact failed:')
              console.error('- Status:', response.status)
              console.error('- Result:', result)
              console.error('- Error message:', result.error)

              // Handle validation errors
              if (
                (result as any).details &&
                Array.isArray((result as any).details)
              ) {
                const fieldErrors: Record<string, string> = {}
                ;(result as any).details.forEach((error: any) => {
                  if (error.path && error.message) {
                    const fieldPath = Array.isArray(error.path)
                      ? error.path.join('.')
                      : error.path
                    fieldErrors[fieldPath] = error.message
                  }
                })

                console.error('Validation errors:', fieldErrors)
                set({ fieldErrors, isCreating: false })

                const validationMessage =
                  Object.keys(fieldErrors).length > 0
                    ? `Validation failed: ${Object.values(fieldErrors).join(', ')}`
                    : result.error || 'Validation failed'

                throw new Error(validationMessage)
              }

              // Handle specific error cases
              if (result.error?.includes('email address already exists')) {
                const errorMessage = 'A contact with this email address already exists. Please use a different email or update the existing contact.'
                set({
                  error: errorMessage,
                  isCreating: false,
                })
                
                return null
              }

              throw new Error(
                result.error || `Server error: ${response.status}`
              )
            }

            if (result.data) {
              console.log('Contact created successfully:', result.data)

              // Optimistically add to contacts list
              set((state) => ({
                contacts: [result.data!, ...state.contacts],
                totalContacts: state.totalContacts + 1,
                isCreating: false,
                selectedContact: result.data!,
              }))

              // Clear cache to trigger refresh
              get().clearCache()

              return result.data
            }

            throw new Error('No contact data returned from server')
          } catch (error) {
            console.error('Error creating contact:', error)

            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to create contact'

            set({
              error: errorMessage,
              isCreating: false,
            })

            // Re-throw the error so the UI can handle it
            throw error
          }
        },

        updateContact: async (id: string, data: UpdateContactData) => {
          set({ isUpdating: true, error: null, fieldErrors: {} })

          try {
            const response = await fetch(`/api/v1/contacts/${id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            })

            let result: ApiResponse<Contact>
            try {
              result = await response.json()
            } catch (jsonError) {
              console.error('Failed to parse JSON response:', jsonError)
              throw new Error(
                `Server error (${response.status}): Unable to parse response`
              )
            }

            if (!response.ok || !result.success) {
              throw new Error(result.error || 'Failed to update contact')
            }

            if (result.data) {
              // Optimistically update contacts list
              set((state) => ({
                contacts: state.contacts.map((contact) =>
                  contact.id === id ? result.data! : contact
                ),
                selectedContact:
                  state.selectedContact?.id === id
                    ? result.data!
                    : state.selectedContact,
                isUpdating: false,
              }))

              // Clear cache to trigger refresh
              get().clearCache()

              return result.data
            }

            return null
          } catch (error) {
            console.error('Error updating contact:', error)
            
            const errorMessage = error instanceof Error
              ? error.message
              : 'Failed to update contact'
              
            set({
              error: errorMessage,
              isUpdating: false,
            })
            
            return null
          }
        },

        deleteContact: async (id: string) => {
          set({ isDeleting: true, error: null })

          try {
            const response = await fetch(`/api/v1/contacts/${id}`, {
              method: 'DELETE',
            })

            if (!response.ok) {
              throw new Error('Failed to delete contact')
            }

            // Optimistically remove from contacts list
            set((state) => ({
              contacts: state.contacts.filter((contact) => contact.id !== id),
              totalContacts: state.totalContacts - 1,
              selectedContact:
                state.selectedContact?.id === id ? null : state.selectedContact,
              selectedContactIds: state.selectedContactIds.filter(
                (contactId) => contactId !== id
              ),
              isDeleting: false,
            }))

            // Clear cache
            get().clearCache()

            return true
          } catch (error) {
            console.error('Error deleting contact:', error)
            
            const errorMessage = error instanceof Error
              ? error.message
              : 'Failed to delete contact'
              
            set({
              error: errorMessage,
              isDeleting: false,
            })
            
            return false
          }
        },

        bulkDeleteContacts: async (ids: string[]) => {
          set({ isDeleting: true, error: null })

          try {
            const response = await fetch('/api/v1/contacts/bulk-delete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ contactIds: ids }),
            })

            if (!response.ok) {
              throw new Error('Failed to delete contacts')
            }

            // Optimistically remove from contacts list
            set((state) => ({
              contacts: state.contacts.filter(
                (contact) => !ids.includes(contact.id)
              ),
              totalContacts: state.totalContacts - ids.length,
              selectedContact: ids.includes(state.selectedContact?.id || '')
                ? null
                : state.selectedContact,
              selectedContactIds: [],
              isDeleting: false,
            }))

            // Clear cache
            get().clearCache()

            return true
          } catch (error) {
            console.error('Error bulk deleting contacts:', error)
            
            const errorMessage = error instanceof Error
              ? error.message
              : 'Failed to delete contacts'
              
            set({
              error: errorMessage,
              isDeleting: false,
            })
            
            return false
          }
        },

        // Contact selection
        selectContact: (contact: Contact | null) => {
          set({ selectedContact: contact })
        },

        toggleContactSelection: (contactId: string) => {
          set((state) => ({
            selectedContactIds: state.selectedContactIds.includes(contactId)
              ? state.selectedContactIds.filter((id) => id !== contactId)
              : [...state.selectedContactIds, contactId],
          }))
        },

        clearContactSelection: () => {
          set({ selectedContactIds: [] })
        },

        // Search and filtering
        setSearchFilters: (filters: Partial<ContactSearchData>) => {
          set((state) => ({
            searchFilters: { ...state.searchFilters, ...filters },
          }))
        },

        clearSearchFilters: () => {
          set({
            searchFilters: defaultSearchFilters,
            searchQuery: '',
          })
        },

        setSearchQuery: (query: string) => {
          set({ searchQuery: query })
        },

        performSearch: async () => {
          const { searchQuery, searchFilters } = get()
          const filters = searchQuery
            ? { ...searchFilters, query: searchQuery }
            : searchFilters
          await get().fetchContacts(filters)
        },

        // Pagination
        setCurrentPage: (page: number) => {
          set({ currentPage: page })
          const filters = {
            ...get().searchFilters,
            page,
            offset: (page - 1) * (get().searchFilters.limit || 20),
          }
          get().fetchContacts(filters)
        },

        loadNextPage: async () => {
          const { currentPage, hasMore } = get()
          if (hasMore) {
            await get().setCurrentPage(currentPage + 1)
          }
        },

        // UI state
        openContactDrawer: (
          mode: 'view' | 'edit' | 'create',
          contact?: Contact
        ) => {
          set({
            isContactDrawerOpen: true,
            contactDrawerMode: mode,
            selectedContact: contact || null,
          })
        },

        closeContactDrawer: () => {
          set({
            isContactDrawerOpen: false,
            contactDrawerMode: 'view',
            selectedContact: null,
          })
        },

        setContactDrawerMode: (mode: 'view' | 'edit' | 'create') => {
          set({ contactDrawerMode: mode })
        },

        // Cache management
        clearCache: () => {
          set({ searchCache: new Map(), lastFetchTime: 0 })
        },

        isCacheValid: (key?: string) => {
          const { cacheTimeout, lastFetchTime, searchCache } = get()
          const now = Date.now()

          if (key) {
            const cached = searchCache.get(key)
            return cached ? now - cached.timestamp < cacheTimeout : false
          }

          return now - lastFetchTime < cacheTimeout
        },

        // Error handling
        setError: (error: string | null) => {
          set({ error })
        },

        setFieldErrors: (errors: Record<string, string>) => {
          set({ fieldErrors: errors })
        },

        clearErrors: () => {
          set({ error: null, fieldErrors: {} })
        },

        // Related data
        loadContactInteractions: async (contactId: string) => {
          try {
            const response = await fetch(
              `/api/v1/contacts/${contactId}/interactions`
            )
            if (response.ok) {
              const interactions: ContactInteraction[] = await response.json()
              set((state) => ({
                contactInteractions: new Map(
                  state.contactInteractions.set(contactId, interactions)
                ),
              }))
            }
          } catch (error) {
            console.error('Error loading contact interactions:', error)
          }
        },

        loadContactCommunications: async (contactId: string) => {
          try {
            const response = await fetch(
              `/api/v1/contacts/${contactId}/communications`
            )
            if (response.ok) {
              const communications: Communication[] = await response.json()
              set((state) => ({
                contactCommunications: new Map(
                  state.contactCommunications.set(contactId, communications)
                ),
              }))
            }
          } catch (error) {
            console.error('Error loading contact communications:', error)
          }
        },

        addContactInteraction: (
          contactId: string,
          interaction: ContactInteraction
        ) => {
          set((state) => {
            const existing = state.contactInteractions.get(contactId) || []
            return {
              contactInteractions: new Map(
                state.contactInteractions.set(contactId, [
                  interaction,
                  ...existing,
                ])
              ),
            }
          })
        },

        addContactCommunication: (
          contactId: string,
          communication: Communication
        ) => {
          set((state) => {
            const existing = state.contactCommunications.get(contactId) || []
            return {
              contactCommunications: new Map(
                state.contactCommunications.set(contactId, [
                  communication,
                  ...existing,
                ])
              ),
            }
          })
        },

        // Contact-Opportunity relationship management
        loadContactOpportunities: async (contactId: string) => {
          try {
            set({ error: null })

            const response = await fetch(
              `/api/v1/contacts/${contactId}/opportunities`
            )

            if (!response.ok) {
              throw new Error(
                `Failed to load contact opportunities: ${response.statusText}`
              )
            }

            const result = await response.json()

            if (result.success) {
              set((state) => ({
                contactOpportunities: new Map(
                  state.contactOpportunities.set(contactId, result.data)
                ),
              }))
            }
          } catch (error) {
            console.error('Error loading contact opportunities:', error)
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to load opportunities',
            })
          }
        },

        linkContactToOpportunity: async (
          contactId: string,
          data: {
            opportunityId: string
            relationship?: string
            isPrimary?: boolean
            notes?: string
            confidence?: number
          }
        ) => {
          try {
            set({ error: null })

            const response = await fetch(
              `/api/v1/contacts/${contactId}/opportunities`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
              }
            )

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(
                errorData.error ||
                  `Failed to link contact to opportunity: ${response.statusText}`
              )
            }

            const result = await response.json()

            if (result.success) {
              // Refresh the contact's opportunities
              await get().loadContactOpportunities(contactId)
              return true
            }

            return false
          } catch (error) {
            console.error('Error linking contact to opportunity:', error)
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to link opportunity',
            })
            return false
          }
        },

        updateContactOpportunity: async (
          contactId: string,
          opportunityId: string,
          data: {
            relationship?: string
            isPrimary?: boolean
            notes?: string
            confidence?: number
          }
        ) => {
          try {
            set({ error: null })

            const response = await fetch(
              `/api/v1/contacts/${contactId}/opportunities/${opportunityId}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
              }
            )

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(
                errorData.error ||
                  `Failed to update contact-opportunity relationship: ${response.statusText}`
              )
            }

            const result = await response.json()

            if (result.success) {
              // Refresh the contact's opportunities
              await get().loadContactOpportunities(contactId)
              return true
            }

            return false
          } catch (error) {
            console.error(
              'Error updating contact-opportunity relationship:',
              error
            )
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to update relationship',
            })
            return false
          }
        },

        unlinkContactFromOpportunity: async (
          contactId: string,
          opportunityId: string
        ) => {
          try {
            set({ error: null })

            const response = await fetch(
              `/api/v1/contacts/${contactId}/opportunities/${opportunityId}`,
              {
                method: 'DELETE',
              }
            )

            if (!response.ok) {
              let errorMessage = `Failed to unlink contact from opportunity: ${response.statusText}`
              try {
                const errorData = await response.json()
                errorMessage = errorData.error || errorMessage
              } catch (jsonError) {
                console.warn('Failed to parse error response JSON:', jsonError)
                // Use the default error message if JSON parsing fails
              }
              throw new Error(errorMessage)
            }

            const result = await response.json()

            if (result.success) {
              // Refresh the contact's opportunities
              await get().loadContactOpportunities(contactId)
              return true
            }

            return false
          } catch (error) {
            console.error('Error unlinking contact from opportunity:', error)
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to unlink opportunity',
            })
            return false
          }
        },

        // Utility actions
        reset: () => {
          set(initialState)
        },

        refreshContacts: async () => {
          get().clearCache()
          await get().fetchContacts()
        },

        exportContacts: async (contactIds?: string[]) => {
          try {
            const params = contactIds
              ? { contactIds: contactIds.join(',') }
              : undefined
            const queryString = params
              ? new URLSearchParams(params).toString()
              : ''
            const response = await fetch(
              `/api/v1/contacts/export?${queryString}`
            )

            if (response.ok) {
              const blob = await response.blob()
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`
              document.body.appendChild(a)
              a.click()
              window.URL.revokeObjectURL(url)
              document.body.removeChild(a)
            }
          } catch (error) {
            console.error('Error exporting contacts:', error)
            set({ error: 'Failed to export contacts' })
          }
        },
      }),
      {
        name: 'contact-store',
        partialize: (state) => ({
          // Don't persist searchQuery to avoid filtering issues on page reload
          // searchFilters: state.searchFilters,  // Also don't persist filters
          selectedContactIds: state.selectedContactIds,
        }),
      }
    ),
    { name: 'contact-store' }
  )
)

// Computed selectors
export const useContactSelectors = () => {
  const store = useContactStore()

  return {
    // Get contacts with computed display names
    contactsWithDisplayNames: store.contacts.map((contact) => ({
      ...contact,
      fullName: `${contact.firstName} ${contact.lastName}`,
      displayName: `${contact.firstName} ${contact.lastName}${contact.title ? ` - ${contact.title}` : ''}`,
      primaryAgency: contact.agencyInfo?.agency || 'Unknown Agency',
      importance: contact.professionalInfo?.importance || 'MEDIUM',
    })),

    // Get selected contacts
    selectedContacts: store.contacts.filter((contact) =>
      store.selectedContactIds.includes(contact.id)
    ),

    // Get contacts by importance
    criticalContacts: store.contacts.filter(
      (contact) => contact.professionalInfo?.importance === 'CRITICAL'
    ),

    // Get recently contacted
    recentlyContacted: store.contacts
      .filter((contact) => contact.activityTracking?.lastContactedAt)
      .sort((a, b) => {
        const aDate = new Date(a.activityTracking?.lastContactedAt || 0)
        const bDate = new Date(b.activityTracking?.lastContactedAt || 0)
        return bDate.getTime() - aDate.getTime()
      })
      .slice(0, 10),

    // Get contacts needing follow up
    needsFollowUp: store.contacts.filter((contact) => {
      const lastContacted = contact.activityTracking?.lastContactedAt
      if (!lastContacted) return false

      const daysSinceContact =
        (Date.now() - new Date(lastContacted).getTime()) / (1000 * 60 * 60 * 24)
      const importance = contact.professionalInfo?.importance || 'MEDIUM'

      // Follow up thresholds based on importance
      const thresholds = {
        CRITICAL: 7, // 1 week
        HIGH: 14, // 2 weeks
        MEDIUM: 30, // 1 month
        LOW: 90, // 3 months
      }

      return (
        daysSinceContact > thresholds[importance as keyof typeof thresholds]
      )
    }),
  }
}
