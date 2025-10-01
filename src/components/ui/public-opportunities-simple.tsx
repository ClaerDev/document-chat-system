'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from './card'
import { Badge } from './badge'
import { Button } from './button'
import { Input } from './input'
import { Alert, AlertDescription } from './alert'
import { Search, Loader2, Filter, Target, Zap, Calendar, DollarSign, Building2, MapPin, FileText, Briefcase, Clock, Sparkles } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'

interface PublicOpportunity {
  id: string
  title: string
  agency: string
  deadline: string
  contractValue: number
  solicitationNumber: string
  location: string
  setAsideType: string
  type: string
  naicsCodes: string[]
  postedDate: string
  status: string
}

interface PublicOpportunitiesData {
  items: PublicOpportunity[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  preview: boolean
  upgradeMessage: string
}

interface PublicOpportunitiesSimpleProps {
  onSignUpClick?: () => void
  className?: string
  maxResults?: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDeadline(date: string) {
  const deadline = new Date(date)
  const now = new Date()
  const diffTime = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'Expired'
  if (diffDays === 0) return 'Due Today'
  if (diffDays === 1) return 'Due Tomorrow'
  if (diffDays < 7) return `Due in ${diffDays} days`
  if (diffDays < 30) return `Due in ${Math.ceil(diffDays / 7)} weeks`
  
  return deadline.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

function getDeadlineUrgency(date: string) {
  const deadline = new Date(date)
  const now = new Date()
  const diffTime = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'text-destructive'
  if (diffDays <= 3) return 'text-warning'
  if (diffDays <= 7) return 'text-government'
  return 'text-muted-foreground'
}

function PublicOpportunityCardSimple({ 
  opportunity, 
  onSignUpClick 
}: { 
  opportunity: PublicOpportunity
  onSignUpClick?: () => void 
}) {
  const deadlineText = formatDeadline(opportunity.deadline)
  const deadlineUrgency = getDeadlineUrgency(opportunity.deadline)
  const valueText = formatCurrency(opportunity.contractValue)
  
  const postedText = new Date(opportunity.postedDate).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })

  return (
    <Card className="p-5 transition-all duration-200 hover:shadow-lg hover:scale-[1.002] border relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-base leading-tight line-clamp-2 mb-2">
            {opportunity.title}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
            <div className="flex items-center">
              <Building2 className="w-4 h-4 mr-1" />
              {typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name || ''}
            </div>
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              {opportunity.location}
            </div>
          </div>
        </div>
        
        {/* Hidden Match Score Area */}
        <div className="shrink-0 relative">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 relative group cursor-pointer"
               onClick={(e) => {
                 e.stopPropagation()
                 onSignUpClick?.()
               }}>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-400 dark:text-gray-500">?</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                Sign up to see
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="outline" className="text-xs">
          <FileText className="w-3 h-3 mr-1" />
          {opportunity.solicitationNumber}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {opportunity.setAsideType}
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Briefcase className="w-3 h-3 mr-1" />
          {opportunity.type}
        </Badge>
        {opportunity.naicsCodes.length > 0 && (
          <Badge variant="outline" className="text-xs">
            NAICS: {opportunity.naicsCodes[0]}{opportunity.naicsCodes.length > 1 && ` +${opportunity.naicsCodes.length - 1}`}
          </Badge>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={cn("flex items-center text-sm font-medium", deadlineUrgency)}>
            <Calendar className="w-4 h-4 mr-1" />
            <span>{deadlineText}</span>
          </div>
          
          <div className="flex items-center text-sm font-medium text-foreground">
            <DollarSign className="w-4 h-4 mr-1" />
            {valueText}
          </div>

          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />
            Posted {postedText}
          </div>
        </div>

        <Badge variant="outline" className="text-xs">
          Preview
        </Badge>
      </div>
    </Card>
  )
}

export function PublicOpportunitiesSimple({ 
  onSignUpClick, 
  className,
  maxResults = 6 
}: PublicOpportunitiesSimpleProps) {
  const [data, setData] = useState<PublicOpportunitiesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const fetchOpportunities = useCallback(async (query?: string) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (query) params.set('query', query)
      params.set('limit', maxResults.toString())
      
      const response = await fetch(`/api/v1/opportunities/public?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch opportunities')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [maxResults])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  useEffect(() => {
    fetchOpportunities(debouncedSearchQuery)
  }, [debouncedSearchQuery, fetchOpportunities])

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">
            Discover Government Opportunities
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore real government contracting opportunities. Search and browse to see what GovMatch AI can do for your business.
          </p>
        </div>

        {/* Upgrade CTA */}
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <Target className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="flex items-center justify-between">
              <span>
                <strong>Unlock AI Match Scores!</strong> Sign up to see personalized compatibility scores, full descriptions, and contact information for each opportunity.
              </span>
              <Button 
                size="sm" 
                className="ml-4 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={onSignUpClick}
              >
                <Zap className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search opportunities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/50 backdrop-blur-sm border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Results */}
        <div>
          {/* Results Summary */}
          {data && (
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                Showing {data.items.length} of {data.total} opportunities
              </p>
              <Badge variant="outline" className="text-xs">
                Preview Mode - {data.upgradeMessage}
              </Badge>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading opportunities...
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive font-medium">Error loading opportunities</p>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchOpportunities()}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No opportunities found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search terms
              </p>
            </div>
          )}

          {/* Opportunities Grid */}
          {data && data.items.length > 0 && (
            <div className="grid gap-4">
              {data.items.map((opportunity) => (
                <PublicOpportunityCardSimple
                  key={opportunity.id}
                  opportunity={opportunity}
                  onSignUpClick={onSignUpClick}
                />
              ))}
            </div>
          )}

          {/* Sign-up CTA at bottom */}
          {data && data.items.length > 0 && (
            <div className="text-center py-8 mt-8">
              <h3 className="text-xl font-semibold mb-2">Ready to see your match scores?</h3>
              <p className="text-muted-foreground mb-4">
                Sign up to unlock AI-powered match scores, full opportunity details, and advanced search features.
              </p>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={onSignUpClick}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Unlock Full Access
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}