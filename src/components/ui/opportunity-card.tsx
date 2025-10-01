'use client'

import React from "react"
import { Calendar, DollarSign, Building2, Bookmark, BookmarkCheck, MapPin, FileText, Briefcase, Clock, Shield, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card } from "./card"
import { Badge } from "./badge"
import { MatchScoreBadge } from "./match-score-badge"
import { Button } from "./button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"
import { cn } from "@/lib/utils"
import type { Opportunity, MatchScore } from "@/types"
import { SearchHighlight } from "@/components/ui/search-highlight"

interface OpportunityCardProps {
  opportunity: Opportunity
  matchScore?: number | MatchScore
  status?: 'new' | 'saved' | 'applied'
  onSave?: () => void
  onApply?: () => void
  onMatchScoreClick?: () => void
  className?: string
  searchQuery?: string
  highlightSearch?: boolean
  matchScoreLoading?: boolean
}

function formatCurrency(value: number) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '$0'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyRange(min?: number, max?: number, value?: number) {
  if (value && typeof value === 'number' && !isNaN(value)) return formatCurrency(value)
  if (min && max && typeof min === 'number' && typeof max === 'number' && !isNaN(min) && !isNaN(max)) {
    return `${formatCurrency(min)} - ${formatCurrency(max)}`
  }
  if (min && typeof min === 'number' && !isNaN(min)) return `${formatCurrency(min)}+`
  if (max && typeof max === 'number' && !isNaN(max)) return `Up to ${formatCurrency(max)}`
  return '' // NO FALLBACK TEXT - Return empty string instead of misleading "Not specified"
}

function formatDeadline(date: Date | string | undefined | null) {
  if (!date) return '' // NO FALLBACK TEXT - Return empty string instead of "No deadline"
  
  // Convert string to Date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const now = new Date()
  const diffTime = dateObj.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'Expired'
  if (diffDays === 0) return 'Due Today'
  if (diffDays === 1) return 'Due Tomorrow'
  if (diffDays < 7) return `Due in ${diffDays} days`
  if (diffDays < 30) return `Due in ${Math.ceil(diffDays / 7)} weeks`
  
  return dateObj.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

function getStatusBadge(status?: string) {
  switch (status) {
    case 'saved':
      return <Badge variant="secondary" size="sm">Saved</Badge>
    case 'applied':
      return <Badge variant="success" size="sm">Applied</Badge>
    case 'new':
    default:
      return <Badge variant="outline" size="sm">New</Badge>
  }
}

function getDeadlineUrgency(date: Date | string | undefined | null) {
  if (!date) return 'text-muted-foreground'
  
  // Convert string to Date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const now = new Date()
  const diffTime = dateObj.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'text-destructive'
  if (diffDays <= 3) return 'text-warning'
  if (diffDays <= 7) return 'text-government'
  return 'text-muted-foreground'
}

function formatSetAsideType(setAsideType: string) {
  if (setAsideType === 'SMALL_BUSINESS') return 'Small Business'
  if (setAsideType === 'SBA_8A') return '8(a) Program'
  if (setAsideType === 'HUBZONE') return 'HUBZone'
  if (setAsideType === 'SDVOSB') return 'SDVOSB'
  if (setAsideType === 'WOSB') return 'WOSB'
  if (setAsideType === 'EDWOSB') return 'EDWOSB'
  
  // Fallback: convert underscores to spaces and title case
  return setAsideType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function getMatchScoreDetails(matchScore: number | MatchScore) {
  if (typeof matchScore === 'number') {
    return { score: matchScore, factors: null }
  }
  
  return { 
    score: matchScore.score, 
    factors: matchScore.factors 
  }
}

function calculateFactorPercentages(factors: MatchScore['factors']) {
  if (!factors || factors.length === 0) return []
  
  // NO FALLBACK DATA - Only show actual factor data if available
  return factors.map(factor => ({
    name: factor.name,
    percentage: factor.contribution ? Math.round(factor.contribution * 100) : 0, // No fallback calculation
    explanation: factor.explanation || '' // Empty string instead of fallback
  })).filter(factor => factor.percentage > 0) // Only show factors with actual data
}

// Memoized OpportunityCard for performance
export const OpportunityCard = React.memo(function OpportunityCard({
  opportunity,
  matchScore,
  status,
  onSave,
  onApply,
  onMatchScoreClick,
  className,
  searchQuery,
  highlightSearch = false,
  matchScoreLoading = false
}: OpportunityCardProps) {
  const router = useRouter()
  
  const handleClick = React.useCallback(() => {
    router.push(`/opportunities/${opportunity.id}`)
  }, [router, opportunity.id])
  
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }, [handleClick])

  // Memoize expensive calculations
  const calculations = React.useMemo(() => {
    const deadlineText = formatDeadline(opportunity.deadline)
    const deadlineUrgency = getDeadlineUrgency(opportunity.deadline)
    const valueText = formatCurrencyRange(opportunity.contractValueMin, opportunity.contractValueMax, opportunity.contractValue)
    const daysUntilDeadline = opportunity.deadline 
      ? Math.ceil(((typeof opportunity.deadline === 'string' ? new Date(opportunity.deadline) : opportunity.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : -1
    const postedText = opportunity.postedDate ? new Date(opportunity.postedDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }) : ''
    
    return {
      deadlineText,
      deadlineUrgency,
      valueText,
      daysUntilDeadline,
      postedText
    }
  }, [opportunity.deadline, opportunity.contractValueMin, opportunity.contractValueMax, opportunity.contractValue, opportunity.postedDate])

  // Memoize match score calculations
  const matchScoreData = React.useMemo(() => {
    if (!matchScore) return null
    
    const matchScoreDetails = getMatchScoreDetails(matchScore)
    const factorPercentages = matchScoreDetails?.factors ? calculateFactorPercentages(matchScoreDetails.factors) : null
    
    return { matchScoreDetails, factorPercentages }
  }, [matchScore])

  const isSaved = status === 'saved'
  const isApplied = status === 'applied'

  const { deadlineText, deadlineUrgency, valueText, daysUntilDeadline, postedText } = calculations

  return (
    <Card 
      className={cn(
        "p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.005] border",
        "min-h-[180px] relative",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Opportunity: ${opportunity.title} from ${typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name || ''}`}
      data-testid="opportunity-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-4">
          <div className="flex items-start gap-2 mb-1">
            <h3 className="font-semibold text-base leading-tight line-clamp-2" data-testid="opportunity-title" role="heading" aria-level={3}>
              {highlightSearch && searchQuery ? (
                <SearchHighlight text={opportunity.title} searchQuery={searchQuery} />
              ) : (
                opportunity.title
              )}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
            <div className="flex items-center">
              <Building2 className="w-4 h-4 mr-1" />
              {highlightSearch && searchQuery ? (
                <SearchHighlight text={typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name || ''} searchQuery={searchQuery} />
              ) : (
                typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name || ''
              )}
            </div>
            {opportunity.location && (
              <div className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {highlightSearch && searchQuery ? (
                  <SearchHighlight text={opportunity.location} searchQuery={searchQuery} />
                ) : (
                  opportunity.location
                )}
              </div>
            )}
          </div>
          {opportunity.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-2" data-testid="opportunity-description">
              {highlightSearch && searchQuery ? (
                <SearchHighlight text={opportunity.description} searchQuery={searchQuery} />
              ) : (
                opportunity.description
              )}
            </p>
          )}
        </div>
        
        {/* Match Score Section - shows loading state or actual score */}
        {(matchScoreData?.matchScoreDetails || matchScoreLoading) && (
          <div 
            className="shrink-0 flex flex-col items-center gap-1" 
            aria-label={matchScoreLoading ? "Calculating match score..." : `Match score: ${matchScoreData?.matchScoreDetails?.score} percent`}
            onClick={(e) => e.stopPropagation()}
          >
            {matchScoreLoading ? (
              /* Loading State */
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-muted bg-muted/50">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : matchScoreData?.matchScoreDetails ? (
              /* Match Score Display */
              matchScoreData.factorPercentages ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <MatchScoreBadge 
                          score={matchScoreData.matchScoreDetails.score} 
                          size="md"
                          showExplanation={!!onMatchScoreClick}
                          onExplanationClick={onMatchScoreClick}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-popover text-popover-foreground border max-w-xs">
                      <div className="space-y-2">
                        <div className="font-semibold text-sm">Score Breakdown</div>
                        {matchScoreData.factorPercentages.map((factor, index) => (
                          <div key={index} className="text-xs">
                            <div className="font-medium">{factor.name}: {factor.percentage}%</div>
                            <div className="text-muted-foreground">{factor.explanation}</div>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <MatchScoreBadge 
                  score={matchScoreData.matchScoreDetails.score} 
                  size="md"
                  showExplanation={!!onMatchScoreClick}
                  onExplanationClick={onMatchScoreClick}
                />
              )
            ) : null}
            <span className="text-xs text-muted-foreground font-medium">
              {matchScoreLoading ? "Calculating..." : "Match Score"}
            </span>
          </div>
        )}
      </div>

      {/* Middle Section - Key Details */}
      <div className="flex flex-wrap gap-2 mb-3">
        {opportunity.solicitationNumber && (
          <Badge variant="outline" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            {highlightSearch && searchQuery ? (
              <SearchHighlight text={opportunity.solicitationNumber} searchQuery={searchQuery} />
            ) : (
              opportunity.solicitationNumber
            )}
          </Badge>
        )}
        {opportunity.setAsideType && (
          <Badge variant="secondary" className="text-xs">
            {highlightSearch && searchQuery ? (
              <SearchHighlight text={formatSetAsideType(opportunity.setAsideType)} searchQuery={searchQuery} />
            ) : (
              formatSetAsideType(opportunity.setAsideType)
            )}
          </Badge>
        )}
        {opportunity.type && (
          <Badge variant="outline" className="text-xs">
            <Briefcase className="w-3 h-3 mr-1" />
            {highlightSearch && searchQuery ? (
              <SearchHighlight 
                text={opportunity.type === 'SOLICITATION' ? 'Contract' : opportunity.type.replace('_', ' ')} 
                searchQuery={searchQuery} 
              />
            ) : (
              opportunity.type === 'SOLICITATION' ? 'Contract' : opportunity.type.replace('_', ' ')
            )}
          </Badge>
        )}
        {opportunity.naicsCodes && opportunity.naicsCodes.length > 0 && (
          opportunity.naicsCodes.map((code, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {highlightSearch && searchQuery ? (
                <SearchHighlight text={code} searchQuery={searchQuery} />
              ) : (
                code
              )}
            </Badge>
          ))
        )}
        {opportunity.pscCodes && opportunity.pscCodes.length > 0 && (
          opportunity.pscCodes.map((code, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {highlightSearch && searchQuery ? (
                <SearchHighlight text={code} searchQuery={searchQuery} />
              ) : (
                code
              )}
            </Badge>
          ))
        )}
        {opportunity.securityClearance && (
          <Badge variant="outline" className="text-xs" data-testid="security-clearance">
            <Shield className="w-3 h-3 mr-1" />
            {typeof opportunity.securityClearance === 'string' 
              ? opportunity.securityClearance 
              : opportunity.securityClearance.level}
          </Badge>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={cn("flex items-center text-sm font-medium", deadlineUrgency, daysUntilDeadline <= 3 && daysUntilDeadline >= 0 && "text-red-600 font-semibold")} data-testid="due-date">
            <Calendar className="w-4 h-4 mr-1" />
            <span aria-label={`Due date: ${opportunity.deadline ? (typeof opportunity.deadline === 'string' ? new Date(opportunity.deadline) : opportunity.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No deadline'}`}>{deadlineText}</span>
            {daysUntilDeadline >= 0 && daysUntilDeadline <= 30 && (
              <Badge variant={daysUntilDeadline <= 7 ? "destructive" : "outline"} className="ml-2 text-xs">
                {daysUntilDeadline}d left
              </Badge>
            )}
          </div>
          
          <div className="flex items-center text-sm font-medium text-foreground">
            <DollarSign className="w-4 h-4 mr-1" />
            {valueText}
          </div>

          {opportunity.postedDate && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              Posted {postedText}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {getStatusBadge(status)}
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            {onSave && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onSave()
                }}
                className="h-8 w-8 p-0"
              >
                {isSaved ? (
                  <BookmarkCheck className="w-4 h-4 text-government" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </Button>
            )}
            
            {onApply && !isApplied && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onApply()
                }}
                className="text-xs px-2 py-1 h-7"
              >
                Apply
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo optimization
  return (
    prevProps.opportunity.id === nextProps.opportunity.id &&
    prevProps.matchScore === nextProps.matchScore &&
    prevProps.status === nextProps.status &&
    prevProps.className === nextProps.className &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.highlightSearch === nextProps.highlightSearch &&
    prevProps.matchScoreLoading === nextProps.matchScoreLoading &&
    prevProps.onSave === nextProps.onSave &&
    prevProps.onApply === nextProps.onApply &&
    prevProps.onMatchScoreClick === nextProps.onMatchScoreClick
  )
})