/**
 * Profile Score Card Component
 *
 * Comprehensive scoring visualization with:
 * - Overall score display
 * - Section breakdowns
 * - Progress indicators
 * - Actionable insights
 * - Interactive recommendations
 */

'use client'

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  Award,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock type definitions for the document chat system
interface LegacyProfileScore {
  overall: number
  completeness: number
  quality: number
  completedFields: number
  totalFields: number
  criticalFieldsCompleted: number
  totalCriticalFields: number
  lastCalculated: Date
  algorithm: string
  version: string
  sections: SectionScore[]
  bonuses?: Array<{ points: number; reason: string }>
  penalties?: Array<{ points: number; reason: string }>
  recommendations: Array<{
    id: string
    title: string
    description: string
    priority: string
    category: string
    impact: number
    effort: string
  }>
  strengths?: string[]
  weaknesses?: string[]
  nextSteps?: string[]
}

interface SectionScore {
  section: string
  sectionScore: number
  weight: number
  fields?: Array<{
    field: string
    completeness?: number
    importance?: string
    rawScore?: number
    suggestions?: string[]
  }>
  suggestions?: string[]
}

// =============================================
// TYPES
// =============================================

interface ProfileScoreCardProps {
  score: LegacyProfileScore
  loading?: boolean
  className?: string
  onRecommendationClick?: (recommendation: {
    id: string
    title: string
    description: string
    priority: string
    category: string
    impact: number
    effort: string
  }) => void
  onFieldClick?: (field: string) => void
  showDetailedBreakdown?: boolean
  showRecommendations?: boolean
  showTrends?: boolean
  interactive?: boolean
}

interface ScoreDisplayProps {
  score: number
  maxScore?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
  className?: string
}

interface SectionBreakdownProps {
  section: SectionScore
  onFieldClick?: (field: string) => void
  expanded?: boolean
}

// Mock functions for category weights
const getCategoryWeightLabels = () => ({
  pastPerformance: { formattedWeight: '35%' },
  technicalCapability: { formattedWeight: '35%' },
  strategicFitRelationships: { formattedWeight: '15%' },
  credibilityMarketPresence: { formattedWeight: '15%' }
})

// =============================================
// SCORE DISPLAY COMPONENT
// =============================================

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  // maxScore = 100,
  size = 'md',
  showLabel = true,
  label,
  className,
}) => {
  // const percentage = (score / maxScore) * 100
  const getScoreColor = (score: number) => {
    if (isNaN(score) || score < 0) return 'text-red-500'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreColorClass = (score: number) => {
    if (isNaN(score) || score < 0) return 'from-red-500 to-red-600'
    if (score >= 80) return 'from-green-500 to-green-600'
    if (score >= 60) return 'from-yellow-500 to-yellow-600'
    if (score >= 40) return 'from-orange-500 to-orange-600'
    return 'from-red-500 to-red-600'
  }

  const sizes = {
    sm: { container: 'w-16 h-16', text: 'text-sm', label: 'text-xs' },
    md: { container: 'w-24 h-24', text: 'text-lg', label: 'text-sm' },
    lg: { container: 'w-32 h-32', text: 'text-2xl', label: 'text-base' },
  }

  return (
    <div className={cn('flex flex-col items-center space-y-2', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full bg-gradient-to-br',
          getScoreColorClass(score),
          sizes[size].container
        )}
      >
        <div className="absolute inset-1 bg-background rounded-full flex items-center justify-center">
          <div
            className={cn('font-bold', getScoreColor(score), sizes[size].text)}
          >
            {isNaN(score) ? '0' : Math.round(score)}
          </div>
        </div>
      </div>
      {showLabel && (
        <div
          className={cn(
            'text-center font-medium text-muted-foreground',
            sizes[size].label
          )}
        >
          {label || 'Score'}
        </div>
      )}
    </div>
  )
}

// =============================================
// SECTION BREAKDOWN COMPONENT
// =============================================

const SectionBreakdown: React.FC<SectionBreakdownProps> = ({
  section,
  onFieldClick,
  expanded = false,
}) => {
  const [isOpen, setIsOpen] = useState(expanded)

  const getSectionColor = (score: number) => {
    if (isNaN(score) || score < 0) return 'bg-red-100 border-red-200 dark:bg-red-500/10 dark:border-red-500/30'
    if (score >= 80) return 'bg-green-100 border-green-200 dark:bg-green-500/10 dark:border-green-500/30'
    if (score >= 60) return 'bg-yellow-100 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/30'
    if (score >= 40) return 'bg-orange-100 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30'
    return 'bg-red-100 border-red-200 dark:bg-red-500/10 dark:border-red-500/30'
  }

  const getProgressColor = (score: number) => {
    if (isNaN(score) || score < 0) return 'bg-red-500'
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    if (score >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div
      className={cn(
        'border rounded-lg p-4 transition-all hover:shadow-md',
        getSectionColor(section.sectionScore)
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <h3 className="font-semibold text-lg capitalize">
                  {section.section.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
              </div>
              <Badge
                variant={section.sectionScore >= 80 ? 'default' : 'secondary'}
              >
                {Math.round(section.sectionScore)}%
              </Badge>
            </div>
            <ScoreDisplay
              score={section.sectionScore}
              size="sm"
              showLabel={false}
            />
          </div>
        </CollapsibleTrigger>

        <div className="mt-3">
          <div className="relative">
            <Progress value={section.sectionScore} className="h-2" />
            <div
              className={cn(
                'absolute top-0 left-0 h-2 rounded-full transition-all',
                getProgressColor(section.sectionScore)
              )}
              style={{ width: `${section.sectionScore}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>
              {section.fields?.filter((f) => f.completeness && f.completeness > 0).length || 0} of{' '}
              {section.fields?.length || 0} fields
            </span>
            <span>
              {Math.round(section.sectionScore || 0)} /{' '}
              {Math.round(100)} points
            </span>
          </div>
        </div>

        <CollapsibleContent>
          <div className="mt-4 space-y-3">
            {/* Field Details */}
            <div className="grid gap-2">
              {section.fields?.map((field) => (
                <div
                  key={field.field}
                  className={cn(
                    'flex items-center justify-between p-2 rounded border cursor-pointer transition-colors',
                    (field.completeness || 0) > 0
                      ? 'bg-background hover:bg-muted/50'
                      : 'bg-muted/30 hover:bg-muted/60',
                    onFieldClick && 'hover:border-blue-300'
                  )}
                  onClick={() => onFieldClick?.(field.field)}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        (field.completeness || 0) > 0 ? 'bg-green-500' : 'bg-muted-foreground/30'
                      )}
                    />
                    <span className="text-sm font-medium">
                      {field.field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                    {field.importance === 'critical' && (
                      <Badge variant="destructive" className="text-xs">
                        Critical
                      </Badge>
                    )}
                    {field.importance === 'high' && (
                      <Badge variant="default" className="text-xs">
                        High
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        (field.completeness || 0) > 0
                          ? 'text-green-600'
                          : 'text-muted-foreground/60'
                      )}
                    >
                      {Math.round(field.rawScore || 0)}%
                    </span>
                    {field.suggestions && field.suggestions.length > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs">
                              {field.suggestions?.map((suggestion, idx) => (
                                <p key={idx} className="text-xs">
                                  {suggestion}
                                </p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Section Suggestions */}
            {section.suggestions && section.suggestions.length > 0 && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>Suggestions</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1">
                    {section.suggestions?.map((suggestion, idx) => (
                      <li
                        key={idx}
                        className="text-sm flex items-start space-x-2"
                      >
                        <ArrowRight className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// =============================================
// MAIN COMPONENT
// =============================================

const ProfileScoreCard: React.FC<ProfileScoreCardProps> = ({
  score,
  loading = false,
  className,
  onRecommendationClick,
  onFieldClick,
  showDetailedBreakdown = true,
  showRecommendations = true,
  // showTrends = false,
  interactive = true,
}) => {
  const [activeTab, setActiveTab] = useState('overview')

  // Loading state
  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getScoreStatus = (score: number) => {
    if (isNaN(score) || score < 0)
      return { text: 'Invalid', color: 'text-red-500', icon: TrendingDown }
    if (score >= 90)
      return { text: 'Excellent', color: 'text-green-600', icon: Star }
    if (score >= 80)
      return { text: 'Very Good', color: 'text-green-600', icon: CheckCircle }
    if (score >= 70)
      return { text: 'Good', color: 'text-yellow-600', icon: Target }
    if (score >= 60)
      return { text: 'Fair', color: 'text-yellow-600', icon: Clock }
    if (score >= 40)
      return { text: 'Needs Work', color: 'text-orange-500', icon: AlertCircle }
    return { text: 'Poor', color: 'text-red-500', icon: TrendingDown }
  }

  const scoreStatus = getScoreStatus(score.overall)
  const StatusIcon = scoreStatus.icon

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>Profile Completeness</span>
              <Badge variant="outline" className={scoreStatus.color}>
                {scoreStatus.text}
              </Badge>
            </CardTitle>
            <CardDescription>
              Last updated {score.lastCalculated.toLocaleDateString()} •
              Algorithm {score.algorithm} v{score.version}
            </CardDescription>
          </div>
          <StatusIcon className={cn('w-6 h-6', scoreStatus.color)} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-1 flex justify-center">
            <ScoreDisplay
              score={score.overall}
              size="lg"
              label="Overall Score"
            />
          </div>

          <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {isNaN(score.completedFields) ? '0' : score.completedFields}
              </div>
              <div className="text-sm text-muted-foreground">
                of {isNaN(score.totalFields) ? '0' : score.totalFields} fields
              </div>
              <Progress
                value={isNaN(score.completedFields) || isNaN(score.totalFields) || score.totalFields === 0 ? 0 : (score.completedFields / score.totalFields) * 100}
                className="mt-2 h-2"
              />
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {isNaN(score.criticalFieldsCompleted) ? '0' : score.criticalFieldsCompleted}
              </div>
              <div className="text-sm text-muted-foreground">
                of {isNaN(score.totalCriticalFields) ? '0' : score.totalCriticalFields} critical
              </div>
              <Progress
                value={
                  isNaN(score.criticalFieldsCompleted) || isNaN(score.totalCriticalFields) || score.totalCriticalFields === 0 
                    ? 0 
                    : (score.criticalFieldsCompleted / score.totalCriticalFields) * 100
                }
                className="mt-2 h-2"
              />
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {isNaN(score.quality) ? '0' : Math.round(score.quality)}%
              </div>
              <div className="text-sm text-muted-foreground">Data Quality</div>
              <Progress value={isNaN(score.quality) ? 0 : score.quality} className="mt-2 h-2" />
            </div>
          </div>
        </div>

        {/* Simple display for document chat system */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sections">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="text-center py-8">
              <Award className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Profile Analysis Complete
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Your profile has been analyzed and scored based on completeness and data quality.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="sections" className="space-y-4">
            {showDetailedBreakdown && score.sections && score.sections.length > 0 ? (
              <div className="space-y-4">
                {score.sections.map((section) => (
                  <SectionBreakdown
                    key={section.section}
                    section={section}
                    onFieldClick={onFieldClick}
                    expanded={section.sectionScore < 70}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Detailed Analysis
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Section-by-section breakdown will be available once analysis is complete.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default ProfileScoreCard