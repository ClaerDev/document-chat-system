'use client'

import React from 'react'
import { Sparkles, Trophy, BookmarkPlus, Calendar, MessageSquare, TrendingUp, Target, Award, Lightbulb, BarChart3, Building2, Briefcase, FileText, CheckCircle, ThumbsUp, AlertTriangle, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ContactsSection } from './ContactsSection'
import type { Opportunity, MatchScore } from '@/types'

interface AIInsightsTabProps {
  opportunity: Opportunity
  matchScore?: MatchScore | null
}

export function AIInsightsTab({ opportunity, matchScore }: AIInsightsTabProps) {
  // NO MOCK DATA - No AI-generated content without real AI analysis

  const getDetailedFactors = () => {
    // Use actual detailed factors from match score if available
    if (matchScore?.detailedFactors) {
      const factors = matchScore.detailedFactors as any
      
      // Check if we have the 4-category structure
      if (factors?.pastPerformance && factors?.technicalCapability && 
          factors?.strategicFitRelationships && factors?.credibilityMarketPresence) {
        return [
          {
            name: 'Past Performance',
            icon: TrendingUp,
            score: factors.pastPerformance.score || 0,
            weight: factors.pastPerformance.weight || 35,
            priority: (factors.pastPerformance.weight || 35) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'Contract history and performance records - most critical evaluation factor per FAR 15.305',
            explanation: factors.pastPerformance.details || factors.pastPerformance.explanation || 'Contract history and agency experience evaluation',
            insights: factors.pastPerformance.insights || null,
            color: 'blue',
            category: 'Core Capability'
          },
          {
            name: 'Technical Capability',
            icon: Target,
            score: factors.technicalCapability.score || 0,
            weight: factors.technicalCapability.weight || 35,
            priority: (factors.technicalCapability.weight || 35) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'NAICS codes, certifications, and core competencies demonstrating technical qualifications',
            explanation: factors.technicalCapability.details || factors.technicalCapability.explanation || 'NAICS alignment, certifications, and competencies assessment',
            insights: factors.technicalCapability.insights || null,
            color: 'green',
            category: 'Core Capability'
          },
          {
            name: 'Strategic Fit & Relationships',
            icon: Briefcase,
            score: factors.strategicFitRelationships.score || 0,
            weight: factors.strategicFitRelationships.weight || 15,
            priority: (factors.strategicFitRelationships.weight || 15) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'Geographic alignment, government level preferences, and business positioning',
            explanation: factors.strategicFitRelationships.details || factors.strategicFitRelationships.explanation || 'Geographic and operational alignment evaluation',
            insights: factors.strategicFitRelationships.insights || null,
            color: 'purple',
            category: 'Strategic Positioning'
          },
          {
            name: 'Credibility & Market Presence',
            icon: Building2,
            score: factors.credibilityMarketPresence.score || 0,
            weight: factors.credibilityMarketPresence.weight || 15,
            priority: (factors.credibilityMarketPresence.weight || 15) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'SAM.gov registration, business size, and professional presence assessment',
            explanation: factors.credibilityMarketPresence.details || factors.credibilityMarketPresence.explanation || 'SAM.gov registration and professional presence assessment',
            insights: factors.credibilityMarketPresence.insights || null,
            color: 'amber',
            category: 'Strategic Positioning'
          }
        ]
      }
    }
    return null
  }

  const getScoreFactors = () => {
    // Use actual 4-category structure from match score if available
    if (matchScore?.factors || matchScore?.detailedFactors) {
      const factors = matchScore.detailedFactors || matchScore.factors
      
      // Check if we have the 4-category structure
      if (factors?.pastPerformance && factors?.technicalCapability && 
          factors?.strategicFitRelationships && factors?.credibilityMarketPresence) {
        return [
          {
            name: 'Past Performance',
            score: factors.pastPerformance.score || 0,
            weight: factors.pastPerformance.weight || 35,
            explanation: factors.pastPerformance.details || 'Contract history and agency experience evaluation',
            category: 'Core Capability'
          },
          {
            name: 'Technical Capability',
            score: factors.technicalCapability.score || 0,
            weight: factors.technicalCapability.weight || 35,
            explanation: factors.technicalCapability.details || 'NAICS alignment, certifications, and competencies assessment',
            category: 'Core Capability'
          },
          {
            name: 'Strategic Fit & Relationships',
            score: factors.strategicFitRelationships.score || 0,
            weight: factors.strategicFitRelationships.weight || 15,
            explanation: factors.strategicFitRelationships.details || 'Geographic and operational alignment evaluation',
            category: 'Strategic Positioning'
          },
          {
            name: 'Credibility & Market Presence',
            score: factors.credibilityMarketPresence.score || 0,
            weight: factors.credibilityMarketPresence.weight || 15,
            explanation: factors.credibilityMarketPresence.details || 'SAM.gov registration and professional presence assessment',
            category: 'Strategic Positioning'
          }
        ]
      }
      
      // Fallback to simple array of factors if available
      if (Array.isArray(matchScore.factors)) {
        return matchScore.factors.map(factor => ({
          name: factor.name,
          score: Math.round(factor.contribution * 100),
          weight: Math.round(factor.contribution * 100),
          explanation: factor.explanation,
          category: 'Factor'
        }))
      }
    }
    
    // NO MOCK DATA - Return null when no real scoring data is available
    return null
  }

  const getWinRecommendations = () => {
    const recommendations = [
      'Emphasize your proven track record in similar government contracts and highlight specific past performance examples.',
      'Leverage your team\'s technical expertise and certifications as key differentiators in your proposal.',
      'Develop a competitive pricing strategy that balances value with technical capability demonstrations.',
    ]
    
    if (opportunity.setAsideType && opportunity.setAsideType !== 'NONE') {
      recommendations.push('Highlight your small business status and any additional certifications (8(a), WOSB, etc.) that align with set-aside requirements.')
    }
    
    if (opportunity.securityClearanceRequired && opportunity.securityClearanceRequired !== 'None') {
      recommendations.push('Clearly document your team\'s security clearance levels and facility clearance status if applicable.')
    }
    
    return recommendations
  }

  const detailedFactors = getDetailedFactors()
  const scoreFactors = getScoreFactors()
  const overallScore = matchScore?.score || null // No fallback calculation when no real data available
  const recommendations = getWinRecommendations()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main AI Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* Relevance Reasoning */}
        <Card className="p-6 border-l-4 border-l-government">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-government/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-government" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Relevance Reasoning</h3>
              <p className="text-sm text-muted-foreground">AI analysis of opportunity alignment</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Agency Information</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Agency:</strong> {typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name || 'Not specified'}
                </p>
                {opportunity.office && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Office:</strong> {opportunity.office}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Key Requirements</h4>
                {opportunity.naicsCodes && opportunity.naicsCodes.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    <strong>NAICS Codes:</strong> {opportunity.naicsCodes.join(', ')}
                  </p>
                )}
                {opportunity.setAsideType && opportunity.setAsideType !== 'NONE' && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Set-Aside:</strong> {opportunity.setAsideType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                )}
                {opportunity.securityClearanceRequired && opportunity.securityClearanceRequired !== 'None' && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Security Clearance:</strong> {opportunity.securityClearanceRequired}
                  </p>
                )}
              </div>
            </div>
            
            {opportunity.type && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Opportunity Type</h4>
                <p className="text-sm text-muted-foreground">
                  {opportunity.type === 'SOLICITATION' ? 'Solicitation' : opportunity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Description */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Opportunity Description
          </h3>
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              {opportunity.description || opportunity.summary || 'No description provided for this opportunity.'}
            </p>
            {opportunity.summary && opportunity.description && opportunity.summary !== opportunity.description && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Summary</h4>
                <p className="text-blue-800 dark:text-blue-300 text-sm">{opportunity.summary}</p>
              </div>
            )}
          </div>
        </Card>
        
        {/* Enhanced Match Score Breakdown */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-5 h-5 text-government" />
            <h3 className="text-lg font-semibold">Match Score Breakdown</h3>
          </div>
          
          {detailedFactors ? (
            <div className="space-y-8">
              {/* Core Capabilities Section */}
              <div>
                <h4 className="text-md font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Core Capabilities
                </h4>
                <div className="space-y-6">
                  {detailedFactors.filter(factor => factor.category === 'Core Capability').map((factor, index) => {
                    const IconComponent = factor.icon
                    return (
                      <div key={index} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg bg-${factor.color}-100 dark:bg-${factor.color}-900/20 flex items-center justify-center shrink-0`}>
                            <IconComponent className={`w-5 h-5 text-${factor.color}-600 dark:text-${factor.color}-400`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h5 className="font-semibold text-foreground">{factor.name}</h5>
                              <Badge variant={factor.priority === 'MOST CRITICAL' ? 'destructive' : 'secondary'} className="text-xs">
                                {factor.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Weight: {factor.weight}%
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{factor.description}</p>
                            <div className="bg-muted/50 rounded-lg p-3 mb-3">
                              <p className="text-sm leading-relaxed">{factor.explanation}</p>
                            </div>
                            
                            {/* AI Insights */}
                            {factor.insights && (
                              <div className="space-y-3 mb-3">
                                {factor.insights.strengths && factor.insights.strengths.length > 0 && (
                                  <div className="flex gap-2">
                                    <ThumbsUp className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Strengths</p>
                                      <p className="text-xs text-muted-foreground">{factor.insights.strengths.join(', ')}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {factor.insights.weaknesses && factor.insights.weaknesses.length > 0 && (
                                  <div className="flex gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Areas for Improvement</p>
                                      <p className="text-xs text-muted-foreground">{factor.insights.weaknesses.join(', ')}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {factor.insights.opportunities && factor.insights.opportunities.length > 0 && (
                                  <div className="flex gap-2">
                                    <Zap className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Opportunities</p>
                                      <p className="text-xs text-muted-foreground">{factor.insights.opportunities.join(', ')}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <Progress value={factor.score} className="flex-1 h-2 mr-4" />
                              <span className={`font-bold text-lg text-${factor.color}-600 dark:text-${factor.color}-400`}>
                                {factor.score}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Strategic Positioning Section */}
              <div>
                <h4 className="text-md font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  Strategic Positioning
                </h4>
                <div className="space-y-6">
                  {detailedFactors.filter(factor => factor.category === 'Strategic Positioning').map((factor, index) => {
                    const IconComponent = factor.icon
                    return (
                      <div key={index} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg bg-${factor.color}-100 dark:bg-${factor.color}-900/20 flex items-center justify-center shrink-0`}>
                            <IconComponent className={`w-5 h-5 text-${factor.color}-600 dark:text-${factor.color}-400`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h5 className="font-semibold text-foreground">{factor.name}</h5>
                              <Badge variant={factor.priority === 'MOST CRITICAL' ? 'destructive' : 'secondary'} className="text-xs">
                                {factor.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Weight: {factor.weight}%
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{factor.description}</p>
                            <div className="bg-muted/50 rounded-lg p-3 mb-3">
                              <p className="text-sm leading-relaxed">{factor.explanation}</p>
                            </div>
                            
                            {/* AI Insights */}
                            {factor.insights && (
                              <div className="space-y-3 mb-3">
                                {factor.insights.strengths && factor.insights.strengths.length > 0 && (
                                  <div className="flex gap-2">
                                    <ThumbsUp className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Strengths</p>
                                      <p className="text-xs text-muted-foreground">{factor.insights.strengths.join(', ')}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {factor.insights.weaknesses && factor.insights.weaknesses.length > 0 && (
                                  <div className="flex gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Areas for Improvement</p>
                                      <p className="text-xs text-muted-foreground">{factor.insights.weaknesses.join(', ')}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {factor.insights.opportunities && factor.insights.opportunities.length > 0 && (
                                  <div className="flex gap-2">
                                    <Zap className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Opportunities</p>
                                      <p className="text-xs text-muted-foreground">{factor.insights.opportunities.join(', ')}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <Progress value={factor.score} className="flex-1 h-2 mr-4" />
                              <span className={`font-bold text-lg text-${factor.color}-600 dark:text-${factor.color}-400`}>
                                {factor.score}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Overall Score */}
              <div className="border-t pt-6">
                <div className="bg-government/5 border border-government/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-foreground mb-1">Overall Match Score</h5>
                      <p className="text-sm text-muted-foreground">Weighted average across all factors</p>
                    </div>
                    <span className="text-3xl font-bold text-government">{overallScore}%</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* No detailed factors available - show empty state */
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">No Match Score Available</h3>
              <p className="text-muted-foreground">Match scoring data will appear here once opportunity analysis is completed.</p>
            </div>
          )}
        </Card>
        
        {/* Win Strategy */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Win Strategy Recommendations</h3>
          </div>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Competitive Intelligence */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold">Competitive Intelligence</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Estimated Competition</div>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">Medium</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">5-15 expected bidders</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Win Probability</div>
              <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                {overallScore ? `${Math.round(overallScore * 0.8)}%` : '?'}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {overallScore ? 'Based on your profile' : 'Calculating...'}
              </div>
            </div>
          </div>
        </Card>

      </div>
      
      {/* Sidebar */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <Card className="p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Quick Actions
          </h4>
          <div className="space-y-3">
            <Button className="w-full justify-start" size="sm">
              <BookmarkPlus className="w-4 h-4 mr-2" />
              Save & Track
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Add Deadline Alert
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              Ask AI Questions
            </Button>
          </div>
        </Card>

        {/* Point of Contact - Compact */}
        <div className="space-y-4">
          <ContactsSection opportunity={opportunity} />
        </div>

        {/* Key Details */}
        <Card className="p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Additional Details
          </h4>
          <div className="space-y-3 text-sm">
            {opportunity.postedDate && (
              <div>
                <span className="font-medium text-muted-foreground">Posted Date:</span>
                <p className="mt-1">{new Date(opportunity.postedDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>
            )}
            
            {opportunity.responseDeadline && (
              <div>
                <span className="font-medium text-muted-foreground">Response Deadline:</span>
                <p className="mt-1">{new Date(opportunity.responseDeadline).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            )}
            
            {opportunity.pscCodes && opportunity.pscCodes.length > 0 && (
              <div>
                <span className="font-medium text-muted-foreground">PSC Codes:</span>
                <p className="mt-1">{opportunity.pscCodes.join(', ')}</p>
              </div>
            )}
          </div>
        </Card>
        
      </div>
    </div>
  )
}