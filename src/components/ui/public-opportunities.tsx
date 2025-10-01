'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Opportunity, PaginatedResponse, SearchFilters } from '@/types'
import { PublicOpportunityCard } from './public-opportunity-card'
import { SearchFiltersComponent } from '@/components/SearchFilters'
import { SortSelect } from '@/components/SortSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Loader2, Filter, Target, Zap } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface PublicOpportunitiesState {
  opportunities: Opportunity[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  loading: boolean
  error: string | null
}

interface PublicOpportunitiesProps {
  onSignUpClick?: () => void
  className?: string
}

export function PublicOpportunities({ onSignUpClick, className }: PublicOpportunitiesProps) {
  const [state, setState] = useState<PublicOpportunitiesState>({
    opportunities: [],
    total: 0,
    page: 1,
    limit: 6, // Show fewer opportunities for preview
    hasMore: false,
    loading: true,
    error: null
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [sortBy, setSortBy] = useState('postedDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const fetchOpportunities = useCallback(async (page: number = 1, resetResults = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams()
      
      if (debouncedSearchQuery) params.set('query', debouncedSearchQuery)
      if (filters.agencies?.length) params.set('agencies', filters.agencies.join(','))
      if (filters.naicsCodes?.length) params.set('naicsCodes', filters.naicsCodes.join(','))
      if (filters.states?.length) params.set('states', filters.states.join(','))
      if (filters.performanceStates?.length) params.set('performanceStates', filters.performanceStates.join(','))
      if (filters.setAsideTypes?.length) params.set('setAsideTypes', filters.setAsideTypes.join(','))
      if (filters.securityClearances?.length) params.set('securityClearances', filters.securityClearances.join(','))
      if (filters.procurementMethods?.length) params.set('procurementMethods', filters.procurementMethods.join(','))
      if (filters.itSubcategories?.length) params.set('itSubcategories', filters.itSubcategories.join(','))
      if (filters.opportunityStatus?.length) params.set('opportunityStatus', filters.opportunityStatus.join(','))
      if (filters.contractDuration?.length) params.set('contractDuration', filters.contractDuration.join(','))
      if (filters.minValue) params.set('minValue', filters.minValue.toString())
      if (filters.maxValue) params.set('maxValue', filters.maxValue.toString())
      if (filters.deadline) params.set('deadline', filters.deadline)
      
      params.set('sort', sortBy)
      params.set('order', sortOrder)
      params.set('limit', state.limit.toString())
      params.set('offset', ((page - 1) * state.limit).toString())

      const response = await fetch(`/api/v1/opportunities-mock?${params.toString()}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch opportunities')
      }

      const data: PaginatedResponse<Opportunity> = result.data

      setState(prev => ({
        ...prev,
        opportunities: resetResults ? data.items : [...prev.opportunities, ...data.items],
        total: data.total,
        page: data.page,
        hasMore: data.hasMore,
        loading: false
      }))

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false
      }))
    }
  }, [debouncedSearchQuery, filters, sortBy, sortOrder, state.limit])

  // Fetch opportunities when filters change
  useEffect(() => {
    fetchOpportunities(1, true)
  }, [fetchOpportunities])

  const handleFilterChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters)
  }, [])

  const handleSortChange = useCallback((sort: string, order: 'asc' | 'desc') => {
    setSortBy(sort)
    setSortOrder(order)
  }, [])

  const handleLoadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      fetchOpportunities(state.page + 1, false)
    }
  }, [fetchOpportunities, state.loading, state.hasMore, state.page])

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">
            Discover Government Opportunities
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore real government contracting opportunities. Search, filter, and analyze - get a taste of what GovMatch AI can do for your business.
          </p>
        </div>

        {/* Sign-up CTA */}
        <Alert className="border-gradient-to-r from-blue-200 to-purple-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <Target className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="flex items-center justify-between">
              <span>
                <strong>See Your Match Scores!</strong> Sign up to get personalized AI-powered match scores and advanced analytics for each opportunity.
              </span>
              <Button 
                size="sm" 
                className="ml-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={onSignUpClick}
              >
                <Zap className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Search Bar */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search opportunities by title, description, or solicitation number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {Object.values(filters).some(f => 
                (Array.isArray(f) && f.length > 0) || 
                (typeof f === 'string' && f) ||
                (typeof f === 'number' && f > 0)
              ) && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>
            <SortSelect
              value={`${sortBy}-${sortOrder}`}
              onChange={handleSortChange}
              hideMatchScore // Don't show match score option for public view
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <SearchFiltersComponent
              filters={filters}
              onFiltersChange={handleFilterChange}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-6">
            {/* Results Summary */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {state.loading && state.page === 1 ? (
                  'Loading opportunities...'
                ) : (
                  `Showing ${state.opportunities.length} of ${state.total} opportunities`
                )}
              </p>
              <Badge variant="outline" className="text-xs">
                Preview Mode
              </Badge>
            </div>

            {/* Error State */}
            {state.error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive font-medium">Error loading opportunities</p>
                <p className="text-sm text-destructive/80 mt-1">{state.error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchOpportunities(1, true)}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!state.loading && !state.error && state.opportunities.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No opportunities found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your search criteria or filters
                </p>
              </div>
            )}

            {/* Results Grid */}
            {state.opportunities.length > 0 && (
              <div className="grid gap-4">
                {state.opportunities.map((opportunity) => (
                  <PublicOpportunityCard
                    key={opportunity.id}
                    title={opportunity.title}
                    agency={typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name || ''}
                    deadline={new Date(opportunity.deadline)}
                    value={opportunity.contractValue}
                    valueMin={opportunity.contractValueMin}
                    valueMax={opportunity.contractValueMax}
                    solicitationNumber={opportunity.solicitationNumber}
                    location={opportunity.location}
                    setAsideType={opportunity.setAsideType}
                    contractType={opportunity.type}
                    naicsCodes={opportunity.naicsCodes}
                    postedDate={opportunity.postedDate ? new Date(opportunity.postedDate) : undefined}
                    description={opportunity.description}
                    onSignUpClick={onSignUpClick}
                  />
                ))}
              </div>
            )}

            {/* Loading State */}
            {state.loading && (
              <div className="flex justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading opportunities...
                </div>
              </div>
            )}

            {/* Load More */}
            {state.opportunities.length > 0 && !state.loading && state.hasMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={state.loading}
                >
                  {state.loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}

            {/* Sign-up CTA at bottom */}
            {state.opportunities.length > 0 && (
              <div className="text-center py-8 border-t">
                <h3 className="text-xl font-semibold mb-2">Ready to see your match scores?</h3>
                <p className="text-muted-foreground mb-4">
                  Sign up to unlock personalized AI-powered match scores, advanced filters, and much more.
                </p>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={onSignUpClick}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Get Started Now
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}