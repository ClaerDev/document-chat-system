'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  MapPin, 
  Award, 
  FileText, 
  X,
  Globe,
  TrendingUp,
  Target,
  Building
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MatchScoreBadge } from './match-score-badge'
import { Separator } from '@/components/ui/separator'

interface MatchScoreFactor {
  score: number;
  weight: number;
  contribution: number;
  details: string;
}

interface MatchScoreFactors {
  pastPerformance: MatchScoreFactor;
  technicalCapability: MatchScoreFactor;
  strategicFitRelationships: MatchScoreFactor;
  credibilityMarketPresence: MatchScoreFactor;
}

interface MatchScoreModalV4Props {
  isOpen: boolean;
  onClose: () => void;
  opportunityTitle?: string;
  matchScoreResult: {
    score: number;
    confidence?: number;
    factors?: MatchScoreFactors;
    detailedFactors?: MatchScoreFactors;
    algorithmVersion?: string;
  };
}

export function MatchScoreModalV4({
  isOpen,
  onClose,
  opportunityTitle,
  matchScoreResult
}: MatchScoreModalV4Props) {
  if (!isOpen) return null;

  const factors = matchScoreResult.detailedFactors || matchScoreResult.factors;
  
  console.log('🎯 MatchScoreModalV4 received factors:', factors);

  if (!factors) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Match Score Explanation</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p>No detailed scoring information available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = [
    {
      name: 'Past Performance',
      icon: TrendingUp,
      factor: factors.pastPerformance,
      description: 'Contract history and performance records - most critical evaluation factor per FAR 15.305',
      priority: 'CRITICAL'
    },
    {
      name: 'Technical Capability',
      icon: Target,
      factor: factors.technicalCapability,
      description: 'NAICS codes, certifications, and core competencies demonstrating technical qualifications',
      priority: 'CRITICAL'
    },
    {
      name: 'Strategic Fit & Relationships',
      icon: Globe,
      factor: factors.strategicFitRelationships,
      description: 'Geographic alignment, government level preferences, and business positioning',
      priority: 'IMPORTANT'
    },
    {
      name: 'Credibility & Market Presence',
      icon: Building,
      factor: factors.credibilityMarketPresence,
      description: 'SAM.gov registration, contact completeness, and professional presence',
      priority: 'FOUNDATION'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'IMPORTANT': return 'bg-orange-100 text-orange-800';
      case 'FOUNDATION': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-card border-b border-border z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>MatchScore™ Breakdown</span>
                <MatchScoreBadge score={matchScoreResult.score} size="sm" />
              </CardTitle>
              <CardDescription className="mt-1">
                {opportunityTitle ? `${opportunityTitle.substring(0, 100)}${opportunityTitle.length > 100 ? '...' : ''}` : 'Match Score Analysis'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Overall Score Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{matchScoreResult.score}%</div>
              <div className="text-sm text-muted-foreground">Overall Match</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{matchScoreResult.confidence || 85}%</div>
              <div className="text-sm text-muted-foreground">Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">v{matchScoreResult.algorithmVersion || '4.0'}</div>
              <div className="text-sm text-muted-foreground">Algorithm</div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Factor Breakdown */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Scoring Factors</h3>
            
            {categories.map((category, index) => {
              const IconComponent = category.icon;
              const factor = category.factor;
              
              if (!factor) return null;
              
              return (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{category.name}</h4>
                          <Badge className={`text-xs ${getPriorityColor(category.priority)}`}>
                            {category.priority}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{factor.score}/100</div>
                          <div className="text-sm text-muted-foreground">
{factor.contribution.toFixed(1)} pts
                          </div>
                        </div>
                      </div>
                      
                      <Progress value={factor.score} className="mb-2" />
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {category.description}
                      </p>
                      
                      <div className="text-sm">
                        <p className="font-medium mb-1">{factor.details}</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Score: {factor.score}/100 points</div>
                          <div>Contribution: {factor.contribution.toFixed(1)} points to overall score</div>
                          <div>Impact: {((factor.contribution / matchScoreResult.score) * 100).toFixed(1)}% of final score</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Separator className="my-6" />

          {/* Calculation Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Calculation Summary</h4>
            <div className="space-y-1 text-sm">
              {categories.map((category, index) => {
                const factor = category.factor;
                if (!factor) return null;
                
                return (
                  <div key={index} className="flex justify-between">
                    <span>{category.name}:</span>
                    <span>{factor.contribution.toFixed(1)} points</span>
                  </div>
                );
              })}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total Score:</span>
                <span>{matchScoreResult.score} points</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}