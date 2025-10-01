/**
 * Scoring Analytics Component - Simplified for Document Chat System
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  TrendingUp,
  Target,
  Award,
  Users,
  BarChart3,
  Activity,
  Clock,
  FileText,
  MessageCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Simplified types for document chat system
interface ProfileScore {
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
  sections?: Array<{
    section: string
    sectionScore: number
    weight: number
  }>
}

interface ScoringAnalyticsProps {
  score: ProfileScore
  history?: any
  matchingPotential?: any
  benchmarkData?: {
    industryAverage: number
    topPerformers: number
    yourRanking: number
    totalProfiles: number
  }
  className?: string
}

const MetricCard: React.FC<{
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  color?: string
}> = ({ title, value, subtitle, icon: Icon, color = '#3B82F6' }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold" style={{ color }}>
              {value}
            </p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end space-y-1">
            {Icon && <Icon className="w-5 h-5" style={{ color }} />}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const ScoringAnalytics: React.FC<ScoringAnalyticsProps> = ({
  score,
  history,
  matchingPotential,
  benchmarkData,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className={cn('space-y-6', className)}>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Profile Score"
          value={`${Math.round(isNaN(score.overall) ? 0 : score.overall)}%`}
          subtitle="Overall completeness"
          icon={Target}
          color={
            score.overall >= 85
              ? '#10B981'
              : score.overall >= 70
                ? '#F59E0B'
                : '#EF4444'
          }
        />

        <MetricCard
          title="Data Quality"
          value={`${Math.round(isNaN(score.quality) ? 0 : score.quality)}%`}
          subtitle="Information accuracy"
          icon={Activity}
          color="#8B5CF6"
        />

        <MetricCard
          title="Fields Complete"
          value={`${Math.round((isNaN(score.completedFields) || isNaN(score.totalFields) || score.totalFields === 0) ? 0 : (score.completedFields / score.totalFields) * 100)}%`}
          subtitle={`${isNaN(score.completedFields) ? '0' : score.completedFields} of ${isNaN(score.totalFields) ? '0' : score.totalFields} fields`}
          icon={FileText}
          color="#06B6D4"
        />

        <MetricCard
          title="System Version"
          value={`v${score.version}`}
          subtitle={score.algorithm}
          icon={BarChart3}
          color="#6B7280"
        />
      </div>

      {/* Detailed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Analysis</TabsTrigger>
          <TabsTrigger value="benchmarks">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Profile Analysis</span>
                </CardTitle>
                <CardDescription>
                  Current state of your document profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>Profile Completeness</span>
                    <span>{Math.round(score.completeness)}%</span>
                  </div>
                  <Progress 
                    value={score.completeness}
                    className={cn(
                      score.completeness >= 85 ? "[&>div]:bg-green-500" :
                      score.completeness >= 70 ? "[&>div]:bg-yellow-500" :
                      "[&>div]:bg-red-500"
                    )}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {score.completeness >= 85 ? "Excellent profile completion" :
                     score.completeness >= 70 ? "Good progress, keep going" :
                     "Needs more information"}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>Data Quality Score</span>
                    <span>{Math.round(score.quality)}%</span>
                  </div>
                  <Progress
                    value={score.quality}
                    className="[&>div]:bg-purple-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Quality and accuracy of provided information
                  </div>
                </div>

                {/* Algorithm Info */}
                <div className="pt-2 border-t">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>
                      Algorithm: {score.algorithm} v{score.version}
                    </div>
                    <div>
                      Last updated: {score.lastCalculated.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Document Interaction</CardTitle>
                <CardDescription>Your system usage patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Documents Processed</span>
                    </div>
                    <span className="font-medium">Coming Soon</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">AI Conversations</span>
                    </div>
                    <span className="font-medium">Coming Soon</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">System Activity</span>
                    </div>
                    <span className="font-medium">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertTitle>Trend Analysis</AlertTitle>
            <AlertDescription>
              Historical analysis will be available as you continue using the system. 
              Your usage patterns and improvement trends will be tracked over time.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Profile Insights</CardTitle>
              <CardDescription>Current assessment of your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/10 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Completeness Status
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {score.completeness >= 85 
                      ? "Your profile is well-completed and ready for full system utilization."
                      : score.completeness >= 70
                      ? "Good progress on profile completion. Consider adding more details."
                      : "Your profile needs more information to unlock full system capabilities."
                    }
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950/10 rounded-lg">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    Data Quality
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {score.quality >= 85
                      ? "Excellent data quality detected in your profile information."
                      : score.quality >= 70
                      ? "Good data quality with room for minor improvements."
                      : "Consider reviewing and updating your profile information."
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-6">
          {benchmarkData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Your Score"
                value={`${Math.round(score.overall)}%`}
                color={
                  score.overall >= benchmarkData.industryAverage
                    ? '#10B981'
                    : '#F59E0B'
                }
                icon={Target}
              />

              <MetricCard
                title="Average User"
                value={`${benchmarkData.industryAverage}%`}
                subtitle="System average"
                icon={Users}
                color="#06B6D4"
              />

              <MetricCard
                title="Top Performers"
                value={`${benchmarkData.topPerformers}%`}
                subtitle="Top 10% of users"
                icon={Award}
                color="#8B5CF6"
              />
            </div>
          ) : (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertTitle>Benchmark Data</AlertTitle>
              <AlertDescription>
                Comparative benchmarking will be available as the system gathers 
                more user data. Your performance will be compared against other users.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>System Insights</CardTitle>
              <CardDescription>Understanding your profile performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="font-medium">Profile Strength Assessment:</div>
                  <div className="pl-4 space-y-1 text-gray-600 dark:text-gray-400">
                    <div>• Overall completeness: {Math.round(score.completeness)}%</div>
                    <div>• Data quality score: {Math.round(score.quality)}%</div>
                    <div>• Fields completed: {score.completedFields} of {score.totalFields}</div>
                    <div>• Critical fields: {score.criticalFieldsCompleted} of {score.totalCriticalFields}</div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm">
                    <div className="font-medium mb-2">Next Steps:</div>
                    <ul className="space-y-1 text-gray-600 dark:text-gray-400 list-disc pl-4">
                      <li>Continue adding information to improve completeness</li>
                      <li>Review existing data for accuracy</li>
                      <li>Explore document chat features</li>
                      <li>Monitor your progress over time</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ScoringAnalytics