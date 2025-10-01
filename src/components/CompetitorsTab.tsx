'use client'

import React, { useState, useEffect } from 'react'
import { Building2, Calendar, DollarSign, MapPin, ExternalLink, TrendingUp, Award, Users, Loader2, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchFilterBar } from '@/components/ui/search-filter-bar'
import type { Opportunity } from '@/types'

interface CompetitorEntity {
  id: string
  name: string
  uei?: string
  recipientId?: string
  duns?: string
  location: {
    city?: string
    state?: string
    zipCode?: string
    address?: string
  }
  businessType?: string
  businessSize?: string
  
  // Aggregated contract data
  totalContracts: number
  totalValue: number
  averageValue: number
  recentContracts: {
    awardDate: Date | string
    awardAmount: number
    title: string
    agency: string
    awardId?: string
    naicsCodes?: string[]
    pscCodes?: string[]
  }[]
  
  // Similarity metrics
  matchReasons: string[]
  competitiveAdvantage?: string[]
}

interface CompetitorsTabProps {
  opportunity: Opportunity
}

export function CompetitorsTab({ opportunity }: CompetitorsTabProps) {
  const [competitors, setCompetitors] = useState<CompetitorEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchCriteria, setSearchCriteria] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  const fetchCompetitors = async () => {
    if (!opportunity) return

    setLoading(true)
    setError(null)

    try {
      const requestData = {
        opportunityId: opportunity.id,
        naicsCodes: opportunity.naicsCodes || [],
        pscCodes: opportunity.pscCodes || [],
        state: opportunity.placeOfPerformance?.state || opportunity.performanceState,
        city: opportunity.placeOfPerformance?.city || opportunity.performanceCity,
        estimatedValue: opportunity.estimatedValue || opportunity.contractValue,
        limit: 20 // Get more contracts to find more unique competitors
      }

      console.log('🔍 Fetching competitors for:', opportunity.title, requestData)

      const response = await fetch('/api/v1/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Competitors fetched:', result)

        if (result.success) {
          setCompetitors(result.data || [])
          setSearchCriteria(result.searchCriteria)
        } else {
          setError(result.error || 'Failed to fetch competitors')
        }
      } else if (response.status === 401) {
        setError('Authentication required. Please sign in to view competitors.')
      } else {
        const errorText = await response.text()
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('❌ Failed to fetch competitors:', error)
      setError('Unable to fetch competitor data from USAspending.gov')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-fetch competitors when component mounts
    fetchCompetitors()
  }, [opportunity.id])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: value >= 1000000 ? 'compact' : 'standard'
    }).format(value)
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getCompetitivenessColor = (totalContracts: number) => {
    if (totalContracts >= 10) return 'text-red-600 bg-red-50 border-red-200'
    if (totalContracts >= 5) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (totalContracts >= 2) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  // Filter competitors based on search and category
  const filteredCompetitors = competitors.filter(competitor => {
    const matchesSearch = competitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (competitor.businessType && competitor.businessType.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (competitor.location.city && competitor.location.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (competitor.location.state && competitor.location.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (competitor.uei && competitor.uei.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = filterCategory === 'all' || 
                           (filterCategory === 'major-contractor' && competitor.totalValue >= 10000000) ||
                           (filterCategory === 'high-volume' && competitor.totalContracts >= 10) ||
                           (filterCategory === 'small-business' && competitor.businessType?.toLowerCase().includes('small')) ||
                           (filterCategory === 'veteran-owned' && competitor.businessType?.toLowerCase().includes('veteran')) ||
                           (filterCategory === 'woman-owned' && competitor.businessType?.toLowerCase().includes('woman'))
    
    return matchesSearch && matchesCategory
  })

  // Filter options for competitors
  const filterOptions = [
    { value: 'all', label: 'All Competitors' },
    { value: 'major-contractor', label: 'Major Contractor ($10M+)' },
    { value: 'high-volume', label: 'High Volume (10+ contracts)' },
    { value: 'small-business', label: 'Small Business' },
    { value: 'veteran-owned', label: 'Veteran-Owned' },
    { value: 'woman-owned', label: 'Woman-Owned' }
  ]

  if (loading) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-government" />
          <h3 className="font-semibold mb-2">Analyzing Competition</h3>
          <p className="text-muted-foreground">Finding entities that have won similar government contracts...</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50 text-red-500" />
          <h3 className="font-semibold mb-2 text-red-600">Error Loading Competitors</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button 
            onClick={fetchCompetitors}
            variant="outline"
            size="sm"
          >
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  if (competitors.length === 0) {
    return (
      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <SearchFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search competitors..."
          filterValue={filterCategory}
          onFilterChange={setFilterCategory}
          filterOptions={filterOptions}
          filterPlaceholder="Filter by type"
        />

        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold mb-2">No Competitors Found</h3>
            <p>No entities found that have won similar government contracts matching this opportunity's characteristics.</p>
            <Button 
              onClick={fetchCompetitors}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Search Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <SearchFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search competitors..."
        filterValue={filterCategory}
        onFilterChange={setFilterCategory}
        filterOptions={filterOptions}
        filterPlaceholder="Filter by type"
      />

      {/* Search Criteria Summary */}
      {searchCriteria && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-blue-900">Competitive Analysis Criteria</h4>
          </div>
          <div className="flex gap-4 text-sm text-blue-800">
            <span>NAICS Match: {searchCriteria.naicsMatch ? '✓' : '✗'}</span>
            <span>PSC Match: {searchCriteria.pscMatch ? '✓' : '✗'}</span>
            <span>State Match: {searchCriteria.stateMatch ? '✓' : '✗'}</span>
            <span>Value Range: {searchCriteria.valueRange}</span>
          </div>
        </Card>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Competitors ({filteredCompetitors.length})
        </h3>
      </div>

      {/* Competitors */}
      <div className="space-y-4">
        {filteredCompetitors.map((competitor, index) => (
          <Card key={competitor.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-foreground line-clamp-2">
                      {competitor.name}
                    </h3>
                    <Badge 
                      className={`text-xs ${getCompetitivenessColor(competitor.totalContracts)}`}
                    >
                      {competitor.totalContracts} Contracts
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Building2 className="w-4 h-4" />
                    <span>{competitor.businessType || 'Unknown Business Type'}</span>
                    {competitor.businessSize && (
                      <span className="text-xs">• {competitor.businessSize}</span>
                    )}
                  </div>
                </div>
                
                {competitor.recipientId && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`https://www.usaspending.gov/recipient/${competitor.recipientId}/latest`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Profile
                    </a>
                  </Button>
                )}
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                {/* Total Contract Value */}
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">Total Value</div>
                    <div className="font-medium">
                      {formatCurrency(competitor.totalValue)}
                    </div>
                  </div>
                </div>

                {/* Average Contract Value */}
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Value</div>
                    <div className="font-medium">
                      {formatCurrency(competitor.averageValue)}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">Location</div>
                    <div className="font-medium">
                      {competitor.location.city && competitor.location.state 
                        ? `${competitor.location.city}, ${competitor.location.state}`
                        : competitor.location.state || 'Unknown'
                      }
                    </div>
                  </div>
                </div>

                {/* Contract Count */}
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-orange-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">Contracts</div>
                    <div className="font-medium">
                      {competitor.totalContracts}
                    </div>
                  </div>
                </div>
              </div>

              {/* UEI Information */}
              {(competitor.uei || competitor.duns) && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Entity Identifiers:</div>
                  <div className="space-y-1">
                    {competitor.uei && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">UEI:</span>
                        <span className="font-mono text-foreground">{competitor.uei}</span>
                      </div>
                    )}
                    {competitor.duns && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">DUNS:</span>
                        <span className="font-mono text-foreground">{competitor.duns}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Contract Examples */}
              {competitor.recentContracts && competitor.recentContracts.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-2">Recent Similar Contracts:</div>
                  <div className="space-y-2">
                    {competitor.recentContracts.slice(0, 2).map((contract, idx) => (
                      <div key={idx} className="bg-muted/30 rounded p-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium line-clamp-1">{contract.title}</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(contract.awardAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{contract.agency}</span>
                          <span>{formatDate(contract.awardDate)}</span>
                          {contract.awardId && (
                            <a
                              href={`https://www.usaspending.gov/award/${contract.awardId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-600 hover:text-cyan-800 underline"
                            >
                              View Award
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitive Advantages */}
              {competitor.competitiveAdvantage && competitor.competitiveAdvantage.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-2">Competitive Advantages:</div>
                  <div className="flex gap-2 flex-wrap">
                    {competitor.competitiveAdvantage.map((advantage, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {advantage}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Match Reasons */}
              {competitor.matchReasons && competitor.matchReasons.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-2">Why this entity is a competitor:</div>
                  <div className="flex gap-2 flex-wrap">
                    {competitor.matchReasons.map((reason, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Competitive Intelligence</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Updated today</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="text-center pt-4">
        <Button 
          onClick={fetchCompetitors}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <Trophy className="w-4 h-4 mr-2" />
          Refresh Competitive Analysis
        </Button>
      </div>
    </div>
  )
}