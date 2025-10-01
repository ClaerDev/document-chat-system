'use client'

import React from 'react'
import { MatchScore } from '@/types'
import { MatchScoreFactors } from '@/lib/match-score/algorithm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Building2, 
  MapPin, 
  Award, 
  FileText, 
  ThumbsUp,
  ThumbsDown,
  X,
  MessageSquare,
  Building,
  Globe,
  TrendingUp,
  Target,
  Briefcase,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MatchScoreBadge } from './match-score-badge'
import { Separator } from '@/components/ui/separator'

interface MatchScoreExplanationProps {
  result: MatchScore | MatchScoreResult
  opportunityTitle?: string
  onClose?: () => void
  onFeedback?: (isPositive: boolean, comment?: string) => void
  className?: string
}

// For backward compatibility - legacy result format
interface MatchScoreResult {
  score: number
  breakdown?: any
  explanation?: string
  factors?: any[]
  detailedFactors?: MatchScoreFactors
  algorithmVersion?: string
}

export function MatchScoreExplanation({
  result,
  opportunityTitle,
  onClose,
  onFeedback,
  className
}: MatchScoreExplanationProps) {
  // Helper function to get actual algorithm-generated explanations
  const createCategoryExplanations = (factors: any, result: any) => {
    const score = 'overallScore' in result ? result.overallScore : result.score;
    
    // Helper to create explanation from LLM insights
    const createInsightExplanation = (category: any, categoryName: string) => {
      if (!category?.insights) return null;
      
      const parts = [];
      if (category.insights.strengths?.length > 0) {
        parts.push(`Strengths: ${category.insights.strengths.join(', ')}`);
      }
      if (category.insights.weaknesses?.length > 0) {
        parts.push(`Areas for improvement: ${category.insights.weaknesses.join(', ')}`);
      }
      if (category.insights.opportunities?.length > 0) {
        parts.push(`Opportunities: ${category.insights.opportunities.join(', ')}`);
      }
      
      return parts.length > 0 ? parts.join('. ') : null;
    };
    
    // ALWAYS prioritize the actual algorithm-generated details first
    const explanations = {
      pastPerformance: factors.pastPerformance?.details || 
        createInsightExplanation(factors.pastPerformance, 'Past Performance') ||
        (result.semanticAnalysis?.pastPerformance?.insights?.explanation) ||
        `Past performance evaluation based on your experience and track record (Score: ${Math.round(factors.pastPerformance?.score || 0)}%)`,
      technicalCapability: factors.technicalCapability?.details || 
        createInsightExplanation(factors.technicalCapability, 'Technical Capability') ||
        (result.semanticAnalysis?.technicalCapability?.insights?.explanation) ||
        `Technical capability assessment based on your NAICS codes and certifications (Score: ${Math.round(factors.technicalCapability?.score || 0)}%)`,
      strategicFitRelationships: factors.strategicFitRelationships?.details || 
        createInsightExplanation(factors.strategicFitRelationships, 'Strategic Fit') ||
        (result.semanticAnalysis?.strategicFitRelationships?.insights?.explanation) ||
        `Strategic fit evaluation based on geographic and operational alignment (Score: ${Math.round(factors.strategicFitRelationships?.score || 0)}%)`,
      credibilityMarketPresence: factors.credibilityMarketPresence?.details || 
        createInsightExplanation(factors.credibilityMarketPresence, 'Credibility & Market Presence') ||
        (result.semanticAnalysis?.credibilityMarketPresence?.insights?.explanation) ||
        `Credibility and market presence assessment based on your brand and reputation (Score: ${Math.round(factors.credibilityMarketPresence?.score || 0)}%)`,
      overallExplanation: result.strategicInsights?.winProbability?.rationale || 
        result.explanation || 
        `This ${Math.round(score)}% match indicates ${Math.round(score) >= 80 ? 'excellent potential for winning this contract' : Math.round(score) >= 60 ? 'good competitiveness for this opportunity' : Math.round(score) >= 40 ? 'moderate chances with room for improvement' : 'limited competitiveness - consider strengthening your profile'}. Focus on the most critical factors to improve your positioning.`,
      strategicInsights: result.strategicInsights,
      semanticAnalysis: result.semanticAnalysis
    };

    console.log('🔍 Modal explanations created:', {
      factorsStructure: {
        pastPerformance: factors.pastPerformance ? Object.keys(factors.pastPerformance) : 'none',
        technicalCapability: factors.technicalCapability ? Object.keys(factors.technicalCapability) : 'none',
        strategicFitRelationships: factors.strategicFitRelationships ? Object.keys(factors.strategicFitRelationships) : 'none',
        credibilityMarketPresence: factors.credibilityMarketPresence ? Object.keys(factors.credibilityMarketPresence) : 'none'
      },
      pastPerformanceDetails: factors.pastPerformance?.details,
      pastPerformanceInsights: factors.pastPerformance?.insights,
      technicalCapabilityDetails: factors.technicalCapability?.details,
      technicalCapabilityInsights: factors.technicalCapability?.insights,
      strategicFitDetails: factors.strategicFitRelationships?.details,
      strategicFitInsights: factors.strategicFitRelationships?.insights,
      credibilityDetails: factors.credibilityMarketPresence?.details,
      credibilityInsights: factors.credibilityMarketPresence?.insights,
      finalExplanations: explanations
    });

    return explanations;
  };

  // Handle both new MatchScore and legacy MatchScoreResult formats
  const getFactors = () => {
    // Check for new MatchScore format with detailed factors first (highest priority)
    if (result && 'detailedFactors' in result && result.detailedFactors) {
      const factors = result.detailedFactors as any;
      
      // Handle the actual 4-category structure returned by the algorithm
      if (factors.pastPerformance && factors.technicalCapability && factors.strategicFitRelationships && factors.credibilityMarketPresence) {
        const explanations = createCategoryExplanations(factors, result);
        return {
          categories: [
            {
              name: 'Past Performance',
              icon: TrendingUp,
              weight: factors.pastPerformance.weight || 35,
              priority: (factors.pastPerformance.weight || 35) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
              description: 'Contract history and performance records - most critical evaluation factor per FAR 15.305',
              explanation: explanations.pastPerformance,
              factors: [
                {
                  icon: FileText,
                  name: 'Contract History & Experience',
                  factor: factors.pastPerformance
                }
              ]
            },
            {
              name: 'Technical Capability',
              icon: Target,
              weight: factors.technicalCapability.weight || 35,
              priority: (factors.technicalCapability.weight || 35) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
              description: 'NAICS codes, certifications, and core competencies demonstrating technical qualifications',
              explanation: explanations.technicalCapability,
              factors: [
                {
                  icon: Building2,
                  name: 'Technical Qualifications',
                  factor: factors.technicalCapability
                }
              ]
            },
            {
              name: 'Strategic Fit & Relationships',
              icon: Briefcase,
              weight: factors.strategicFitRelationships.weight || 15,
              priority: (factors.strategicFitRelationships.weight || 15) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
              description: 'Geographic alignment, government level preferences, and business positioning',
              explanation: explanations.strategicFitRelationships,
              factors: [
                {
                  icon: Globe,
                  name: 'Strategic Positioning',
                  factor: factors.strategicFitRelationships
                }
              ]
            },
            {
              name: 'Credibility & Market Presence',
              icon: Users,
              weight: factors.credibilityMarketPresence.weight || 15,
              priority: (factors.credibilityMarketPresence.weight || 15) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
              description: 'SAM.gov registration, contact completeness, and professional presence',
              explanation: explanations.credibilityMarketPresence,
              factors: [
                {
                  icon: Building,
                  name: 'Professional Credibility',
                  factor: factors.credibilityMarketPresence
                }
              ]
            }
          ].filter(category => category.factors.some(f => f.factor)), // Only include categories with valid factors
          algorithmVersion: result.algorithmVersion || 'v4.0-research-based',
          overallExplanation: explanations.overallExplanation
        };
      }
      
      // Fallback to legacy structure if present
      const pastPerformanceWeight = factors.pastPerformance?.weight || 0;
      const technicalCapabilityWeight = (factors.naicsAlignment?.weight || 0) + (factors.certificationMatch?.weight || 0);
      const strategicFitWeight = (factors.geographicProximity?.weight || 0) + (factors.governmentLevelMatch?.weight || 0) + (factors.geographicPreferenceMatch?.weight || 0);
      const credibilityWeight = factors.brandAlignment?.weight || 0;
      
      return {
        categories: [
          {
            name: 'Past Performance',
            icon: TrendingUp,
            weight: pastPerformanceWeight,
            priority: pastPerformanceWeight >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'Evidence of successful contract execution',
            factors: [
              {
                icon: FileText,
                name: 'Past Performance',
                factor: factors.pastPerformance
              }
            ]
          },
          {
            name: 'Technical Capability',
            icon: Target,
            weight: technicalCapabilityWeight,
            priority: technicalCapabilityWeight >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'Technical qualifications and industry alignment',
            factors: [
              {
                icon: Building2,
                name: 'NAICS Alignment',
                factor: factors.naicsAlignment
              },
              {
                icon: Award,
                name: 'Certification Match',
                factor: factors.certificationMatch
              }
            ]
          },
          {
            name: 'Strategic Fit',
            icon: Briefcase,
            weight: strategicFitWeight,
            priority: strategicFitWeight >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'Operational alignment and efficiency',
            factors: [
              {
                icon: MapPin,
                name: 'Geographic Proximity',
                factor: factors.geographicProximity
              },
              {
                icon: Building,
                name: 'Government Level Match',
                factor: factors.governmentLevelMatch
              },
              {
                icon: Globe,
                name: 'Geographic Preference',
                factor: factors.geographicPreferenceMatch
              }
            ]
          },
          {
            name: 'Credibility & Relationships',
            icon: Users,
            weight: credibilityWeight,
            priority: credibilityWeight >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'Professional presentation and communication',
            factors: [
              {
                icon: MessageSquare,
                name: 'Brand Alignment',
                factor: factors.brandAlignment
              }
            ]
          }
        ].filter(category => category.factors.some(f => f.factor)), // Only include categories with valid factors
        algorithmVersion: result.algorithmVersion || 'v3.0-research-based'
      };
    }
    
    
    // Fallback for flat factors structure - convert to grouped format
    const flatFactors = [];
    
    // New MatchScore format with simple factors array (second priority)
    if (result && 'factors' in result && Array.isArray(result.factors)) {
      result.factors.forEach((factor: any) => {
        flatFactors.push({
          name: factor.name,
          contribution: factor.contribution,
          explanation: factor.explanation
        });
      });
    }
    
    // Legacy MatchScoreResult format (from match-score.ts) (lowest priority)
    else if (result && 'breakdown' in result && result.breakdown) {
      if (result.breakdown.naicsAlignment) {
        flatFactors.push({
          name: 'NAICS Alignment',
          contribution: result.breakdown.naicsAlignment.contribution,
          explanation: result.breakdown.naicsAlignment.details
        });
      }
      if (result.breakdown.geographicProximity) {
        flatFactors.push({
          name: 'Geographic Proximity',
          contribution: result.breakdown.geographicProximity.contribution,
          explanation: result.breakdown.geographicProximity.details
        });
      }
      if (result.breakdown.certificationMatch) {
        flatFactors.push({
          name: 'Certification Match',
          contribution: result.breakdown.certificationMatch.contribution,
          explanation: result.breakdown.certificationMatch.details
        });
      }
      if (result.breakdown.pastPerformance) {
        flatFactors.push({
          name: 'Past Performance',
          contribution: result.breakdown.pastPerformance.contribution,
          explanation: result.breakdown.pastPerformance.details
        });
      }
    }
    
    // Convert flat factors to grouped categories (fallback display)
    if (flatFactors.length > 0) {
      return {
        categories: [
          {
            name: 'Evaluation Factors',
            icon: Target,
            weight: 100,
            priority: '',
            description: 'Overall match score factors',
            factors: flatFactors.map(f => ({
              icon: FileText,
              name: f.name,
              factor: {
                score: Math.round((f.contribution / 0.35) * 100), // Estimate score
                weight: Math.round(f.contribution),
                contribution: f.contribution,
                details: f.explanation
              }
            }))
          }
        ],
        algorithmVersion: result.algorithmVersion || 'legacy'
      };
    }
    
    return null;
  };

  const factors = getFactors();
  const score = 'overallScore' in result ? result.overallScore : result.score;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-gray-600'
  }

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500'
    if (score >= 70) return 'bg-blue-500'
    if (score >= 50) return 'bg-amber-500'
    return 'bg-gray-500'
  }

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <MatchScoreBadge score={score} size="lg" showExplanation={false} />
              <div>
                <CardTitle className="text-xl">MatchScore™ Breakdown</CardTitle>
                <CardDescription>
                  {opportunityTitle || 'Opportunity Analysis'}
                </CardDescription>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {'explanation' in result ? result.explanation : 'Comprehensive match score analysis based on profile and opportunity alignment.'}
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Algorithm Version */}
        {factors && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Algorithm Version</span>
            <Badge variant="secondary">
              {factors.algorithmVersion === 'v3.0-research-based' ? 'Research-Based (FAR 15.305)' : factors.algorithmVersion}
            </Badge>
          </div>
        )}

        {/* Factor Breakdown */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Evaluation Categories
          </h3>
          
          {factors && factors.categories ? (
            // New grouped category display
            factors.categories.map((category) => (
              <Card key={category.name} className="border-l-4" style={{ borderLeftColor: category.priority === 'MOST CRITICAL' ? '#ef4444' : '#f59e0b' }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {React.createElement(category.icon, { className: "h-5 w-5 text-muted-foreground" })}
                      <div>
                        <CardTitle className="text-base">{category.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">{category.description}</CardDescription>
                        {(category as any).explanation && (
                          <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/20 rounded border-l-2 border-primary/20">
                            {(category as any).explanation}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {category.priority && (
                        <Badge variant={category.priority === 'MOST CRITICAL' ? 'destructive' : 'default'} className="text-xs">
                          {category.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {category.factors.map(({ icon: Icon, name, factor }) => (
                    <div key={name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-semibold', getScoreColor(factor.score))}>
                            {Math.round(factor.score)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (+{factor.contribution.toFixed(1)} pts)
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Progress 
                          value={factor.score} 
                          className="h-1.5"
                          style={{
                            '--progress-background': getProgressColor(factor.score)
                          } as React.CSSProperties}
                        />
                        <p className="text-xs text-muted-foreground">
                          {factor.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          ) : (
            // Fallback for flat factor display (legacy format)
            <div className="text-sm text-muted-foreground">
              No detailed factor information available
            </div>
          )}
        </div>

        {/* LLM Strategic Insights (if available) */}
        {result && 'strategicInsights' in result && result.strategicInsights && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              AI-Generated Strategic Insights
            </h3>
            
            {/* Win Probability */}
            {result.strategicInsights.winProbability && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    Win Probability Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-700">
                      {result.strategicInsights.winProbability.percentage}%
                    </span>
                    <Badge variant="outline">
                      {result.strategicInsights.winProbability.level}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {result.strategicInsights.winProbability.reasoning}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="h-4 w-4 text-green-600" />
                    Strategic Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="space-y-1">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 text-xs mt-1">•</span>
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Competitive Advantages */}
            {result.strategicInsights.competitiveAdvantages && result.strategicInsights.competitiveAdvantages.length > 0 && (
              <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                    Competitive Advantages
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="space-y-1">
                    {result.strategicInsights.competitiveAdvantages.map((advantage, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 text-xs mt-1">•</span>
                        <span className="text-muted-foreground">{advantage}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Overall Score Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total MatchScore™</span>
            <div className="flex items-center gap-2">
              <span className={cn('text-lg font-bold', getScoreColor(score))}>
                {score}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>
          <Progress value={score} className="mt-2 h-3" />
          
          {/* Overall Score Explanation */}
          {factors && (factors as any).overallExplanation && (
            <div className="mt-3 text-xs text-muted-foreground p-3 bg-primary/5 rounded border-l-2 border-primary/30">
              <strong className="text-primary">Opportunity Assessment:</strong> {(factors as any).overallExplanation}
            </div>
          )}
        </div>

        {/* Feedback Section */}
        {onFeedback && (
          <div className="pt-4 border-t">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Was this score helpful?</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFeedback(true)}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="h-3 w-3" />
                  Yes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFeedback(false)}
                  className="flex items-center gap-2"
                >
                  <ThumbsDown className="h-3 w-3" />
                  No
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your feedback helps improve our scoring algorithm.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Modal wrapper for the explanation
export function MatchScoreExplanationModal({
  isOpen,
  onClose,
  onFeedback,
  result,
  opportunityTitle,
  className
}: MatchScoreExplanationProps & {
  isOpen: boolean
}) {
  if (!isOpen) return null

  // Helper function to get actual algorithm-generated explanations (modal version)
  const createCategoryExplanations = (factors: any, result: any) => {
    const score = 'overallScore' in result ? result.overallScore : result.score;
    
    // Helper to create explanation from LLM insights
    const createInsightExplanation = (category: any, categoryName: string) => {
      if (!category?.insights) return null;
      
      const parts = [];
      if (category.insights.strengths?.length > 0) {
        parts.push(`Strengths: ${category.insights.strengths.join(', ')}`);
      }
      if (category.insights.weaknesses?.length > 0) {
        parts.push(`Areas for improvement: ${category.insights.weaknesses.join(', ')}`);
      }
      if (category.insights.opportunities?.length > 0) {
        parts.push(`Opportunities: ${category.insights.opportunities.join(', ')}`);
      }
      
      return parts.length > 0 ? parts.join('. ') : null;
    };
    
    // ALWAYS prioritize the actual algorithm-generated details first
    const explanations = {
      pastPerformance: factors.pastPerformance?.details || 
        createInsightExplanation(factors.pastPerformance, 'Past Performance') ||
        (result.semanticAnalysis?.pastPerformance?.insights?.explanation) ||
        `Past performance evaluation based on your experience and track record (Score: ${Math.round(factors.pastPerformance?.score || 0)}%)`,
      technicalCapability: factors.technicalCapability?.details || 
        createInsightExplanation(factors.technicalCapability, 'Technical Capability') ||
        (result.semanticAnalysis?.technicalCapability?.insights?.explanation) ||
        `Technical capability assessment based on your NAICS codes and certifications (Score: ${Math.round(factors.technicalCapability?.score || 0)}%)`,
      strategicFitRelationships: factors.strategicFitRelationships?.details || 
        createInsightExplanation(factors.strategicFitRelationships, 'Strategic Fit') ||
        (result.semanticAnalysis?.strategicFitRelationships?.insights?.explanation) ||
        `Strategic fit evaluation based on geographic and operational alignment (Score: ${Math.round(factors.strategicFitRelationships?.score || 0)}%)`,
      credibilityMarketPresence: factors.credibilityMarketPresence?.details || 
        createInsightExplanation(factors.credibilityMarketPresence, 'Credibility & Market Presence') ||
        (result.semanticAnalysis?.credibilityMarketPresence?.insights?.explanation) ||
        `Credibility and market presence assessment based on your brand and reputation (Score: ${Math.round(factors.credibilityMarketPresence?.score || 0)}%)`,
      overallExplanation: result.strategicInsights?.winProbability?.rationale || 
        result.explanation || 
        `This ${Math.round(score)}% match indicates ${Math.round(score) >= 80 ? 'excellent potential for winning this contract' : Math.round(score) >= 60 ? 'good competitiveness for this opportunity' : Math.round(score) >= 40 ? 'moderate chances with room for improvement' : 'limited competitiveness - consider strengthening your profile'}. Focus on the most critical factors to improve your positioning.`,
      strategicInsights: result.strategicInsights,
      semanticAnalysis: result.semanticAnalysis
    };

    console.log('🔍 Modal explanations created (modal version):', {
      factorsStructure: {
        pastPerformance: factors.pastPerformance ? Object.keys(factors.pastPerformance) : 'none',
        technicalCapability: factors.technicalCapability ? Object.keys(factors.technicalCapability) : 'none',
        strategicFitRelationships: factors.strategicFitRelationships ? Object.keys(factors.strategicFitRelationships) : 'none',
        credibilityMarketPresence: factors.credibilityMarketPresence ? Object.keys(factors.credibilityMarketPresence) : 'none'
      },
      pastPerformanceDetails: factors.pastPerformance?.details,
      pastPerformanceInsights: factors.pastPerformance?.insights,
      technicalCapabilityDetails: factors.technicalCapability?.details,
      technicalCapabilityInsights: factors.technicalCapability?.insights,
      strategicFitDetails: factors.strategicFitRelationships?.details,
      strategicFitInsights: factors.strategicFitRelationships?.insights,
      credibilityDetails: factors.credibilityMarketPresence?.details,
      credibilityInsights: factors.credibilityMarketPresence?.insights,
      finalExplanations: explanations
    });

    return explanations;
  };

  // Handle both new MatchScore and legacy MatchScoreResult formats
  const getFactors = () => {
    // Check for new MatchScore format with detailed factors first (highest priority)
    if (result && 'detailedFactors' in result && result.detailedFactors) {
      const factors = result.detailedFactors as any;
      
      // Handle the actual 4-category structure returned by the algorithm
      if (factors.pastPerformance && factors.technicalCapability && factors.strategicFitRelationships && factors.credibilityMarketPresence) {
        const explanations = createCategoryExplanations(factors, result);
        return {
          categories: [
            {
              name: 'Past Performance',
              icon: TrendingUp,
              weight: factors.pastPerformance.weight || 35,
              priority: (factors.pastPerformance.weight || 35) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
              description: 'Contract history and performance records - most critical evaluation factor per FAR 15.305',
              explanation: explanations.pastPerformance,
              factors: [
                {
                  icon: FileText,
                  name: 'Contract History & Experience',
                  factor: factors.pastPerformance
                }
              ]
            },
            {
              name: 'Technical Capability',
              icon: Target,
              weight: factors.technicalCapability.weight || 35,
              priority: (factors.technicalCapability.weight || 35) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
              description: 'NAICS codes, certifications, and core competencies demonstrating technical qualifications',
              explanation: explanations.technicalCapability,
              factors: [
                {
                  icon: Building2,
                  name: 'Technical Qualifications',
                  factor: factors.technicalCapability
                }
              ]
            },
            {
              name: 'Strategic Fit & Relationships',
              icon: Briefcase,
              weight: factors.strategicFitRelationships.weight || 15,
              priority: (factors.strategicFitRelationships.weight || 15) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
              description: 'Geographic alignment, government level preferences, and business positioning',
              explanation: explanations.strategicFitRelationships,
              factors: [
                {
                  icon: Globe,
                  name: 'Strategic Positioning',
                  factor: factors.strategicFitRelationships
                }
              ]
            },
            {
              name: 'Credibility & Market Presence',
              icon: Users,
              weight: factors.credibilityMarketPresence.weight || 15,
              priority: (factors.credibilityMarketPresence.weight || 15) >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
              description: 'SAM.gov registration, contact completeness, and professional presence',
              explanation: explanations.credibilityMarketPresence,
              factors: [
                {
                  icon: Building,
                  name: 'Professional Credibility',
                  factor: factors.credibilityMarketPresence
                }
              ]
            }
          ].filter(category => category.factors.some(f => f.factor)), // Only include categories with valid factors
          algorithmVersion: result.algorithmVersion || 'v4.0-research-based',
          overallExplanation: explanations.overallExplanation
        };
      }
      
      // Fallback to legacy structure if present
      const pastPerformanceWeight = factors.pastPerformance?.weight || 0;
      const technicalCapabilityWeight = (factors.naicsAlignment?.weight || 0) + (factors.certificationMatch?.weight || 0);
      const strategicFitWeight = (factors.geographicProximity?.weight || 0) + (factors.governmentLevelMatch?.weight || 0) + (factors.geographicPreferenceMatch?.weight || 0);
      const credibilityWeight = factors.brandAlignment?.weight || 0;
      
      return {
        categories: [
          {
            name: 'Past Performance',
            icon: TrendingUp,
            weight: pastPerformanceWeight,
            priority: pastPerformanceWeight >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'Evidence of successful contract execution',
            factors: [
              {
                icon: FileText,
                name: 'Past Performance',
                factor: factors.pastPerformance
              }
            ]
          },
          {
            name: 'Technical Capability',
            icon: Target,
            weight: technicalCapabilityWeight,
            priority: technicalCapabilityWeight >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'Technical qualifications and industry alignment',
            factors: [
              {
                icon: Building2,
                name: 'NAICS Alignment',
                factor: factors.naicsAlignment
              },
              {
                icon: Award,
                name: 'Certification Match',
                factor: factors.certificationMatch
              }
            ]
          },
          {
            name: 'Strategic Fit',
            icon: Briefcase,
            weight: strategicFitWeight,
            priority: strategicFitWeight >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'Operational alignment and efficiency',
            factors: [
              {
                icon: MapPin,
                name: 'Geographic Proximity',
                factor: factors.geographicProximity
              },
              {
                icon: Building,
                name: 'Government Level Match',
                factor: factors.governmentLevelMatch
              },
              {
                icon: Globe,
                name: 'Geographic Preference',
                factor: factors.geographicPreferenceMatch
              }
            ]
          },
          {
            name: 'Credibility & Relationships',
            icon: Users,
            weight: credibilityWeight,
            priority: credibilityWeight >= 25 ? 'MOST CRITICAL' : 'IMPORTANT',
            description: 'Professional presentation and communication',
            factors: [
              {
                icon: MessageSquare,
                name: 'Brand Alignment',
                factor: factors.brandAlignment
              }
            ]
          }
        ].filter(category => category.factors.some(f => f.factor)), // Only include categories with valid factors
        algorithmVersion: result.algorithmVersion || 'v3.0-research-based'
      };
    }
    
    
    // Fallback for flat factors structure - convert to grouped format
    const flatFactors = [];
    
    // New MatchScore format with simple factors array (second priority)
    if (result && 'factors' in result && Array.isArray(result.factors)) {
      result.factors.forEach((factor: any) => {
        flatFactors.push({
          name: factor.name,
          contribution: factor.contribution,
          explanation: factor.explanation
        });
      });
    }
    
    // Legacy MatchScoreResult format (from match-score.ts) (lowest priority)
    else if (result && 'breakdown' in result && result.breakdown) {
      if (result.breakdown.naicsAlignment) {
        flatFactors.push({
          name: 'NAICS Alignment',
          contribution: result.breakdown.naicsAlignment.contribution,
          explanation: result.breakdown.naicsAlignment.details
        });
      }
      if (result.breakdown.geographicProximity) {
        flatFactors.push({
          name: 'Geographic Proximity',
          contribution: result.breakdown.geographicProximity.contribution,
          explanation: result.breakdown.geographicProximity.details
        });
      }
      if (result.breakdown.certificationMatch) {
        flatFactors.push({
          name: 'Certification Match',
          contribution: result.breakdown.certificationMatch.contribution,
          explanation: result.breakdown.certificationMatch.details
        });
      }
      if (result.breakdown.pastPerformance) {
        flatFactors.push({
          name: 'Past Performance',
          contribution: result.breakdown.pastPerformance.contribution,
          explanation: result.breakdown.pastPerformance.details
        });
      }
    }
    
    // Convert flat factors to grouped categories (fallback display)
    if (flatFactors.length > 0) {
      return {
        categories: [
          {
            name: 'Evaluation Factors',
            icon: Target,
            weight: 100,
            priority: '',
            description: 'Overall match score factors',
            factors: flatFactors.map(f => ({
              icon: FileText,
              name: f.name,
              factor: {
                score: Math.round((f.contribution / 0.35) * 100), // Estimate score
                weight: Math.round(f.contribution),
                contribution: f.contribution,
                details: f.explanation
              }
            }))
          }
        ],
        algorithmVersion: result.algorithmVersion || 'legacy'
      };
    }
    
    return null;
  };

  const factors = getFactors();
  const score = 'overallScore' in result ? result.overallScore : result.score;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-gray-600'
  }

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500'
    if (score >= 70) return 'bg-blue-500'
    if (score >= 50) return 'bg-amber-500'
    return 'bg-gray-500'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 m-4 w-full max-w-4xl max-h-[85vh] flex flex-col bg-background border border-border rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <MatchScoreBadge score={score} size="lg" showExplanation={false} />
              <div>
                <h2 className="text-xl font-semibold text-foreground">MatchScore™ Breakdown</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {opportunityTitle || 'Contract Opportunity Analysis'}
                </p>
              </div>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Algorithm Version */}
          {factors && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded border border-border">
              <span className="text-sm font-medium text-foreground">Algorithm Version</span>
              <Badge variant="secondary">
                {factors.algorithmVersion === 'v3.0-research-based' ? 'Research-Based (FAR 15.305)' : factors.algorithmVersion}
              </Badge>
            </div>
          )}

          {/* Factor Breakdown */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Evaluation Categories
            </h3>
            
            {factors && factors.categories ? (
              <div className="space-y-4">
                {factors.categories.map((category) => (
                  <Card key={category.name} className="border border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {React.createElement(category.icon, { className: "h-5 w-5 text-muted-foreground" })}
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base font-semibold">{category.name}</CardTitle>
                            </div>
                            <CardDescription className="text-sm text-muted-foreground mt-1">
                              {category.description}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      {(category as any).explanation && (
                        <div className="mt-3 p-3 bg-muted/20 rounded border-l-2 border-primary/40 text-sm text-muted-foreground">
                          {(category as any).explanation}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {category.factors.map(({ icon: Icon, name, factor }) => (
                        <div key={name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{name}</span>
                            </div>
                            <div className="text-right">
                              <span className={cn('text-sm font-semibold', getScoreColor(factor.score))}>
                                {Math.round(factor.score)}%
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                (+{factor.contribution.toFixed(1)} pts)
                              </span>
                            </div>
                          </div>
                          
                          <Progress value={factor.score} className="h-2" />
                          
                          {factor.details && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {factor.details}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Fallback for flat factor display (legacy format)
              <div className="text-sm text-muted-foreground">
                No detailed factor information available
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border p-4">
          {/* Feedback Section */}
          {onFeedback && (
            <div>
              <h4 className="font-medium text-foreground mb-2">Was this score helpful?</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFeedback(true)}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="h-3 w-3" />
                  Yes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFeedback(false)}
                  className="flex items-center gap-2"
                >
                  <ThumbsDown className="h-3 w-3" />
                  No
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Your feedback helps improve our scoring algorithm.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}