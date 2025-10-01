'use client'

import React from 'react'
import Image from 'next/image'
import { Building2, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Opportunity, MatchScore } from '@/types'
import agenciesData from '@/data/government/agencies/agencies.json'

interface OpportunityDetailHeaderProps {
  opportunity: Opportunity
  matchScore?: MatchScore | null
}

export function OpportunityDetailHeader({ opportunity, matchScore }: OpportunityDetailHeaderProps) {
  const agencyName = typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name || 'Unknown Agency'
  const agencyLogo = typeof opportunity.agency === 'object' ? opportunity.agency?.logoUrl : undefined
  
  // Get agency abbreviation from agencies.json data
  const getAgencyAbbreviation = (name: string): string | null => {
    const allAgencies = [
      ...(agenciesData.agencies.departments || []),
      ...(agenciesData.agencies.independentAgencies || []),
      ...(agenciesData.agencies.corporations || []),
      ...(agenciesData.agencies.subAgencies || [])
    ]
    
    // Direct name match first
    const directMatch = allAgencies.find(agency => 
      agency.name === name || 
      agency.alternateNames?.includes(name) ||
      agency.abbreviation === name
    )
    if (directMatch?.abbreviation) {
      return directMatch.abbreviation
    }
    
    // Fuzzy matching for variations
    const fuzzyMatch = allAgencies.find(agency => {
      const agencyNameLower = agency.name.toLowerCase()
      const searchNameLower = name.toLowerCase()
      
      // Check if agency name contains search name or vice versa
      return agencyNameLower.includes(searchNameLower) || 
             searchNameLower.includes(agencyNameLower) ||
             agency.alternateNames?.some(alt => 
               alt.toLowerCase().includes(searchNameLower) ||
               searchNameLower.includes(alt.toLowerCase())
             )
    })
    
    return fuzzyMatch?.abbreviation || null
  }
  
  const agencyAbbreviation = getAgencyAbbreviation(agencyName)
  
  const getMatchScoreDisplay = () => {
    if (!matchScore) return { score: '?', label: 'Not Scored', status: 'none' }
    
    const score = Math.round(matchScore.score)
    let label = 'Poor Match'
    
    if (score >= 90) label = 'Excellent Match'
    else if (score >= 80) label = 'Very Good Match'
    else if (score >= 70) label = 'Good Match'
    else if (score >= 60) label = 'Fair Match'
    
    return { score: score.toString(), label, status: 'completed' }
  }

  const { score, label } = getMatchScoreDisplay()

  return (
    <div className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start gap-8">
          {/* Agency Logo */}
          <div className="shrink-0">
            {agencyLogo ? (
              <Image 
                src={agencyLogo} 
                alt={agencyName}
                width={80}
                height={80}
                className="rounded-lg border object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-muted border border-border rounded-lg flex items-center justify-center">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Title & Agency Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-card-foreground mb-3 leading-tight">
              {opportunity.title}
            </h1>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-lg font-medium text-muted-foreground">
                <Building2 className="w-5 h-5 shrink-0" />
                <span className="truncate">{agencyName}</span>
                {agencyAbbreviation && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    {agencyAbbreviation}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {opportunity.location || 
                   (opportunity.placeOfPerformance ? 
                     `${(opportunity.placeOfPerformance as any)?.city || ''}, ${(opportunity.placeOfPerformance as any)?.state || ''}`.replace(/^, |, $/, '') || 'Multiple Locations' : 
                     'Multiple Locations')
                  }
                </span>
              </div>
            </div>
          </div>
          
          {/* Match Score */}
          <div className="shrink-0">
            <Card className="p-6 text-center min-w-[200px] border-government/20 bg-gradient-to-br from-government/5 to-government/10">
              <div className="text-4xl font-bold text-government mb-2">
                {score}
                {score !== '?' && <span className="text-lg">%</span>}
              </div>
              <div className="text-sm font-medium text-government mb-1">
                {label}
              </div>
              <div className="text-xs text-muted-foreground">
                {matchScore ? 'Click for details' : 'Click to calculate match'}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}