'use client'

import React, { useState, useEffect } from 'react'
import { Building2, Calendar, DollarSign, MapPin, ExternalLink, TrendingUp, Award, Clock, Loader2, ArrowUpDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Opportunity, SimilarContract } from '@/types'

interface SimilarContractsTabProps {
  opportunity: Opportunity
}

export function SimilarContractsTab({ opportunity }: SimilarContractsTabProps) {
  const [similarContracts, setSimilarContracts] = useState<SimilarContract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchCriteria, setSearchCriteria] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'award-value' | 'date' | 'company'>('award-value')

  const fetchSimilarContracts = async () => {
    if (!opportunity) return

    setLoading(true)
    setError(null)

    try {
      const requestData = {
        opportunityId: opportunity.id,
        naicsCodes: opportunity.naicsCodes || [],
        pscCodes: opportunity.pscCodes || [],
        state: opportunity.placeOfPerformance?.state || opportunity.performanceState,
        estimatedValue: opportunity.estimatedValue || opportunity.contractValue,
        limit: 3
      }

      console.log('🔍 Fetching similar contracts for:', opportunity.title, requestData)

      const response = await fetch('/api/v1/similar-contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: Clerk automatically handles authentication via cookies in browser requests
        },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Similar contracts fetched:', result)

        if (result.success) {
          setSimilarContracts(result.data || [])
          setSearchCriteria(result.searchCriteria)
        } else {
          setError(result.error || 'Failed to fetch similar contracts')
        }
      } else if (response.status === 401) {
        setError('Authentication required. Please sign in to view similar contracts.')
      } else {
        const errorText = await response.text()
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('❌ Failed to fetch similar contracts:', error)
      setError('Unable to fetch similar contracts from SAM.gov')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-fetch similar contracts when component mounts
    fetchSimilarContracts()
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

  const getSimilarityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  // Filter and sort contracts based on search, category, and sort criteria
  const filteredAndSortedContracts = similarContracts
    .filter(contract => {
      const matchesSearch = contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contract.agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (contract.description && contract.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (contract.recipientName && contract.recipientName.toLowerCase().includes(searchTerm.toLowerCase()))
      
      return matchesSearch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'award-value':
          const valueA = a.awardedValue || 0
          const valueB = b.awardedValue || 0
          return valueB - valueA // Descending (highest first)
        
        case 'date':
          const dateA = a.awardedDate ? new Date(a.awardedDate).getTime() : 0
          const dateB = b.awardedDate ? new Date(b.awardedDate).getTime() : 0
          return dateB - dateA // Descending (most recent first)
        
        case 'company':
        default:
          const companyA = a.recipientName || ''
          const companyB = b.recipientName || ''
          return companyA.localeCompare(companyB) // Ascending (A-Z)
      }
    })

  // Sort options for similar contracts
  const sortOptions = [
    { value: 'award-value', label: 'Award Value (High to Low)' },
    { value: 'date', label: 'Date (Most Recent)' },
    { value: 'company', label: 'Company Name (A-Z)' }
  ]

  if (loading) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-government" />
          <h3 className="font-semibold mb-2">Searching SAM.gov</h3>
          <p className="text-muted-foreground">Finding similar contracts based on NAICS codes, location, and value...</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50 text-red-500" />
          <h3 className="font-semibold mb-2 text-red-600">Error Loading Similar Contracts</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button 
            onClick={fetchSimilarContracts}
            variant="outline"
            size="sm"
          >
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  if (similarContracts.length === 0) {
    return (
      <div className="space-y-6">
        {/* Search and Sort Bar */}
        <Card>
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="Search similar contracts..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold mb-2">No Similar Contracts Found</h3>
            <p>No contracts found in SAM.gov matching this opportunity's characteristics.</p>
            <Button 
              onClick={fetchSimilarContracts}
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
      {/* Search and Sort Bar */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder="Search similar contracts..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-10" 
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Search Criteria Summary */}
      {searchCriteria && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-blue-900">Search Criteria</h4>
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
          Similar Contracts ({filteredAndSortedContracts.length})
        </h3>
      </div>

      {/* Similar Contracts */}
      <div className="space-y-4">
        {filteredAndSortedContracts.map((contract, index) => (
          <Card key={contract.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-foreground line-clamp-2">
                      {contract.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Building2 className="w-4 h-4" />
                    <span>{contract.agency.name}</span>
                    {contract.agency.subTier && (
                      <span className="text-xs">• {contract.agency.subTier}</span>
                    )}
                  </div>
                </div>
                
                {contract.sourceUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={contract.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on USAspending.gov
                    </a>
                  </Button>
                )}
              </div>

              {/* Description - only show if different from title */}
              {contract.description && contract.description !== contract.title && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {contract.description}
                </p>
              )}

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                {/* Award Value */}
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">Award Value</div>
                    <div className="font-medium">
                      {contract.awardedValue ? formatCurrency(contract.awardedValue) : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Award Date */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">Awarded</div>
                    <div className="font-medium">
                      {formatDate(contract.awardedDate)}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">Location</div>
                    <div className="font-medium">
                      {contract.placeOfPerformance.city}, {contract.placeOfPerformance.state}
                    </div>
                  </div>
                </div>

                {/* Contract Type */}
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-orange-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">Type</div>
                    <div className="font-medium text-sm">
                      {contract.contractType || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipient Information */}
              {(contract.recipientName || contract.recipientUei) && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Recipient Information:</div>
                  <div className="space-y-1">
                    {contract.recipientName && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">Name:</span>
                        {contract.recipientId ? (
                          <a 
                            href={`https://www.usaspending.gov/recipient/${contract.recipientId}/latest`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-600 hover:text-cyan-800 underline"
                          >
                            {contract.recipientName}
                          </a>
                        ) : (
                          <span className="text-foreground">{contract.recipientName}</span>
                        )}
                      </div>
                    )}
                    {contract.recipientUei && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">UEI:</span>
                        <span className="font-mono text-foreground">{contract.recipientUei}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Match Reasons */}
              {contract.matchReasons && contract.matchReasons.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-2">Why this contract is similar:</div>
                  <div className="flex gap-2 flex-wrap">
                    {contract.matchReasons.map((reason, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  {contract.naicsCodes && contract.naicsCodes.length > 0 && (
                    <span>NAICS: {contract.naicsCodes.slice(0, 2).join(', ')}</span>
                  )}
                  {contract.setAsideType && (
                    <span>Set-Aside: {contract.setAsideType}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Updated {formatDate(contract.fetchedAt)}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="text-center pt-4">
        <Button 
          onClick={fetchSimilarContracts}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <Building2 className="w-4 h-4 mr-2" />
          Refresh Similar Contracts
        </Button>
      </div>
    </div>
  )
}