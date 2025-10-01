/**
 * Scoring Configuration Showcase
 * 
 * Interactive demonstration of different scoring configurations
 * and their impact on profile scoring and government contracting readiness.
 */

'use client'

import React, { useState, useMemo } from 'react'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Settings,
  Target,
  Award,
  TrendingUp,
  Info,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react'
import {
  UNIFIED_SCORING_CONFIGURATIONS,
  type UnifiedScoringConfigurationKey,
  type UnifiedScoringConfiguration,
  getCategoryPriorityColor,
  getContractReadinessAssessment,
  OPPORTUNITY_MATCHING_CONFIGURATIONS,
  type OpportunityMatchingConfigurationKey,
  type EnhancedOpportunityMatchingConfiguration,
  getCategoryTotals,
  getAllConfigurations,
  getCategoryWeightLabels,
  getMatchingFactorLabels,
} from '@/lib/profile-scoring-config'
import { cn } from '@/lib/utils'

// Mock profile data for demonstration
const MOCK_PROFILE_SCORES = {
  pastPerformance: 75,
  naics: 85,
  certifications: 60,
  capabilities: 80,
  business: 70,
  basic: 90,
  contact: 95,
  samGov: 80,
}

const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
}

const ScoringConfigShowcase: React.FC = () => {
  const [selectedConfig, setSelectedConfig] = useState<UnifiedScoringConfigurationKey>('gov-contracting')
  const [selectedMatchConfig, setSelectedMatchConfig] = useState<OpportunityMatchingConfigurationKey>('current')
  const [activeTab, setActiveTab] = useState('overview')
  const [scoringMode, setScoringMode] = useState<'profile' | 'matching'>('profile')
  
  // Custom weight configurations for dynamic editing
  const [customMatchingWeights, setCustomMatchingWeights] = useState(() => 
    OPPORTUNITY_MATCHING_CONFIGURATIONS.current.weights
  )
  const [customCategoryWeights, setCustomCategoryWeights] = useState(() => 
    OPPORTUNITY_MATCHING_CONFIGURATIONS.current.categoryWeights
  )
  const [useCustomWeights, setUseCustomWeights] = useState(false)
  
  const currentConfig = UNIFIED_SCORING_CONFIGURATIONS[selectedConfig] || UNIFIED_SCORING_CONFIGURATIONS['current']
  const baseMatchConfig = OPPORTUNITY_MATCHING_CONFIGURATIONS[selectedMatchConfig] || OPPORTUNITY_MATCHING_CONFIGURATIONS['current']
  
  // Use custom weights if enabled, otherwise use selected configuration
  const currentMatchConfig = useCustomWeights 
    ? { ...baseMatchConfig, weights: customMatchingWeights, name: `${baseMatchConfig?.name || 'Custom Configuration'} (Custom)` }
    : baseMatchConfig
  
  // Helper functions for weight management
  const updateCustomWeight = (factor: keyof typeof customMatchingWeights, value: number) => {
    setCustomMatchingWeights(prev => ({ ...prev, [factor]: value }))
  }
  
  const getTotalWeights = () => Object.values(customMatchingWeights).reduce((sum, weight) => sum + weight, 0)
  
  const resetWeights = () => {
    setCustomMatchingWeights(baseMatchConfig?.weights || {})
    setUseCustomWeights(false)
  }
  
  const balanceWeights = () => {
    const totalWeight = 100
    const numFactors = Object.keys(customMatchingWeights).length
    const balancedWeight = Math.floor(totalWeight / numFactors)
    const remainder = totalWeight - (balancedWeight * numFactors)
    
    const balanced = Object.keys(customMatchingWeights).reduce((acc, key, index) => {
      acc[key as keyof typeof customMatchingWeights] = balancedWeight + (index < remainder ? 1 : 0)
      return acc
    }, {} as typeof customMatchingWeights)
    
    setCustomMatchingWeights(balanced)
    setUseCustomWeights(true)
  }
  
  // Calculate scores based on current configuration
  const calculatedScores = useMemo(() => {
    const config = currentConfig
    
    // Calculate category scores based on configuration weights
    const pastPerformanceScore = MOCK_PROFILE_SCORES.pastPerformance
    
    const technicalCapabilityScore = Math.round(
      (MOCK_PROFILE_SCORES.naics * (config.categories.technicalCapability.sections.naics)) +
      (MOCK_PROFILE_SCORES.certifications * (config.categories.technicalCapability.sections.certifications)) +
      (MOCK_PROFILE_SCORES.capabilities * (config.categories.technicalCapability.sections.capabilities))
    )
    
    const strategicFitScore = MOCK_PROFILE_SCORES.business
    
    const credibilityScore = Math.round(
      (MOCK_PROFILE_SCORES.basic * (config.categories.credibility.sections.basic)) +
      (MOCK_PROFILE_SCORES.contact * (config.categories.credibility.sections.contact)) +
      (MOCK_PROFILE_SCORES.samGov * (config.categories.credibility.sections.samGov))
    )
    
    // Calculate overall weighted score
    const overallScore = Math.round(
      (pastPerformanceScore * config.sectionWeights.pastPerformance) +
      (MOCK_PROFILE_SCORES.naics * config.sectionWeights.naics) +
      (MOCK_PROFILE_SCORES.certifications * config.sectionWeights.certifications) +
      (MOCK_PROFILE_SCORES.capabilities * config.sectionWeights.capabilities) +
      (strategicFitScore * config.sectionWeights.business) +
      (MOCK_PROFILE_SCORES.basic * config.sectionWeights.basic) +
      (MOCK_PROFILE_SCORES.contact * config.sectionWeights.contact) +
      (MOCK_PROFILE_SCORES.samGov * config.sectionWeights.samGov)
    )
    
    return {
      overall: overallScore,
      pastPerformance: pastPerformanceScore,
      technicalCapability: technicalCapabilityScore,
      strategicFit: strategicFitScore,
      credibility: credibilityScore,
    }
  }, [currentConfig])
  
  // Radar chart data for profile mode
  const radarData = [
    {
      category: 'Past Performance',
      score: calculatedScores.pastPerformance,
      weight: `${Math.round((currentConfig?.sectionWeights?.pastPerformance || 0) * 100)}%`,
      fullMark: 100,
    },
    {
      category: 'Technical Capability',
      score: calculatedScores.technicalCapability,
      weight: `${Math.round(((currentConfig?.sectionWeights?.naics || 0) + (currentConfig?.sectionWeights?.certifications || 0) + (currentConfig?.sectionWeights?.capabilities || 0)) * 100)}%`,
      fullMark: 100,
    },
    {
      category: 'Strategic Fit',
      score: calculatedScores.strategicFit,
      weight: `${Math.round((currentConfig?.sectionWeights?.business || 0) * 100)}%`,
      fullMark: 100,
    },
    {
      category: 'Credibility',
      score: calculatedScores.credibility,
      weight: `${Math.round(((currentConfig?.sectionWeights?.basic || 0) + (currentConfig?.sectionWeights?.contact || 0) + (currentConfig?.sectionWeights?.samGov || 0)) * 100)}%`,
      fullMark: 100,
    },
  ]
  
  // Calculate category totals for display
  const categoryTotals = getCategoryTotals(currentMatchConfig?.categoryWeights || {})
  
  // Radar chart data for matching mode (4 categories - research-based structure)
  const matchingRadarData = [
    {
      category: 'Past Performance',
      score: 75,
      weight: `${categoryTotals.pastPerformance}%`,
      fullMark: 100,
      categoryType: 'critical'
    },
    {
      category: 'Technical Capability',
      score: Math.round((85 * (currentMatchConfig?.categoryWeights?.technicalCapability?.naicsAlignment || 0) + 60 * (currentMatchConfig?.categoryWeights?.technicalCapability?.certificationMatch || 0)) / (categoryTotals.technicalCapability || 1)), // Weighted average of NAICS (85) and Certifications (60)
      weight: `${categoryTotals.technicalCapability}%`,
      fullMark: 100,
      categoryType: 'critical'
    },
    {
      category: 'Strategic Fit',
      score: Math.round((70 * (currentMatchConfig?.categoryWeights?.strategicFit?.geographicProximity || 0) + 90 * (currentMatchConfig?.categoryWeights?.strategicFit?.governmentLevelMatch || 0) + 65 * (currentMatchConfig?.categoryWeights?.strategicFit?.geographicPreferenceMatch || 0)) / (categoryTotals.strategicFit || 1)), // Weighted average of Geographic factors
      weight: `${categoryTotals.strategicFit}%`,
      fullMark: 100,
      categoryType: 'important'
    },
    {
      category: 'Credibility & Relationships',
      score: 80,
      weight: `${categoryTotals.credibilityRelationships}%`,
      fullMark: 100,
      categoryType: 'important'
    },
  ]

  // Detailed 7-factor breakdown for custom weights section
  const detailedMatchingData = [
    {
      category: 'Past Performance',
      score: 75,
      weight: `${currentMatchConfig?.weights?.pastPerformance || 0}%`,
      fullMark: 100,
    },
    {
      category: 'NAICS Alignment',
      score: 85,
      weight: `${currentMatchConfig?.weights?.naicsAlignment || 0}%`,
      fullMark: 100,
    },
    {
      category: 'Certification Match',
      score: 60,
      weight: `${currentMatchConfig?.weights?.certificationMatch || 0}%`,
      fullMark: 100,
    },
    {
      category: 'Brand Alignment',
      score: 80,
      weight: `${currentMatchConfig?.weights?.brandAlignment || 0}%`,
      fullMark: 100,
    },
    {
      category: 'Geographic Proximity',
      score: 70,
      weight: `${currentMatchConfig?.weights?.geographicProximity || 0}%`,
      fullMark: 100,
    },
    {
      category: 'Government Level',
      score: 90,
      weight: `${currentMatchConfig?.weights?.governmentLevelMatch || 0}%`,
      fullMark: 100,
    },
    {
      category: 'Geographic Preference',
      score: 65,
      weight: `${currentMatchConfig?.weights?.geographicPreferenceMatch || 0}%`,
      fullMark: 100,
    },
  ]
  
  const contractReadiness = getContractReadinessAssessment(calculatedScores.overall)
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Settings className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Scoring Configuration Showcase</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Interactive demonstration of the research-based opportunity matching algorithm. 
          The 7-factor system is organized into 4 categories based on FAR 15.305 and government contracting research:
          <strong> Past Performance ({getCategoryWeightLabels().pastPerformance.formattedWeight}), Technical Capability ({getCategoryWeightLabels().technicalCapability.formattedWeight}), Strategic Fit ({getCategoryWeightLabels().strategicFitRelationships.formattedWeight}), Credibility & Relationships ({getCategoryWeightLabels().credibilityMarketPresence.formattedWeight})</strong>.
          Switch between configurations or create custom weights to see their impact.
        </p>
      </div>
      
      {/* Configuration Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Select Scoring Configuration</span>
          </CardTitle>
          <CardDescription>
            Choose a scoring model to see how it affects profile evaluation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Scoring Mode Toggle */}
            <div className="flex space-x-4 mb-4">
              <Button
                variant={scoringMode === 'profile' ? 'default' : 'outline'}
                onClick={() => setScoringMode('profile')}
              >
                Profile Completeness
              </Button>
              <Button
                variant={scoringMode === 'matching' ? 'default' : 'outline'}
                onClick={() => setScoringMode('matching')}
              >
                Opportunity Matching
              </Button>
            </div>
            
            {/* Profile Configuration Selector */}
            {scoringMode === 'profile' && (
              <Select value={selectedConfig} onValueChange={(value) => setSelectedConfig(value as UnifiedScoringConfigurationKey)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select unified scoring configuration" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIFIED_SCORING_CONFIGURATIONS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col">
                        <span className="font-medium">{config?.name || 'Configuration'}</span>
                        <span className="text-sm text-muted-foreground">{config?.description || 'No description'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Matching Configuration Selector */}
            {scoringMode === 'matching' && (
              <Select value={selectedMatchConfig} onValueChange={(value) => setSelectedMatchConfig(value as OpportunityMatchingConfigurationKey)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select opportunity matching configuration" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OPPORTUNITY_MATCHING_CONFIGURATIONS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col">
                        <span className="font-medium">{config?.name || 'Configuration'}</span>
                        <span className="text-sm text-muted-foreground">{config?.description || 'No description'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Current Configuration: {scoringMode === 'profile' ? currentConfig?.name || 'Default Configuration' : currentMatchConfig?.name || 'Default Configuration'}</AlertTitle>
              <AlertDescription>
                {scoringMode === 'profile' ? currentConfig?.description || 'Default configuration' : currentMatchConfig?.description || 'Default configuration'}
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
      
      {/* Score Impact Overview - Profile Mode */}
      {scoringMode === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Score</p>
                  <p className="text-3xl font-bold" style={{ color: contractReadiness.color === 'green' ? CHART_COLORS.success : contractReadiness.color === 'yellow' ? CHART_COLORS.warning : CHART_COLORS.danger }}>
                    {calculatedScores.overall}%
                  </p>
                  <p className="text-xs text-gray-500">{contractReadiness.level}</p>
                </div>
                <Award className="w-8 h-8" style={{ color: contractReadiness.color === 'green' ? CHART_COLORS.success : contractReadiness.color === 'yellow' ? CHART_COLORS.warning : CHART_COLORS.danger }} />
              </div>
            </CardContent>
          </Card>
          
          {Object.entries(calculatedScores).slice(1).map(([category, score]) => {
            const categoryConfig = currentConfig?.categories?.[category as keyof typeof currentConfig.categories]
            return (
              <Card key={category}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{categoryConfig?.name || category}</span>
                      <Badge variant={getCategoryPriorityColor(categoryConfig?.priority) as any}>
                        {Math.round((categoryConfig?.totalWeight || 0) * 100)}%
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{score}%</div>
                    <Progress value={score} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      
      {/* Detailed Analysis */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="weights">Weights</TabsTrigger>
          <TabsTrigger value="custom">Custom Weights</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Category Performance</span>
                </CardTitle>
                <CardDescription>
                  Your profile strength across scoring categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={scoringMode === 'profile' ? radarData : matchingRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis 
                      dataKey="category" 
                      tick={{ fontSize: 12, fontWeight: 500 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                      strokeWidth={3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {scoringMode === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle>Contract Readiness Assessment</CardTitle>
                  <CardDescription>
                    Based on {currentConfig?.name || 'Default'} configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className={cn("text-4xl font-bold mb-2", 
                      contractReadiness.color === 'green' ? "text-green-600" :
                      contractReadiness.color === 'yellow' ? "text-yellow-600" : "text-red-600"
                    )}>
                      {contractReadiness.level}
                    </div>
                    <p className="text-gray-600">{contractReadiness.description}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm font-medium mb-2">
                        <span>Overall Readiness</span>
                        <span>{calculatedScores.overall}%</span>
                      </div>
                      <Progress 
                        value={calculatedScores.overall} 
                        className={cn("h-3",
                          contractReadiness.color === 'green' ? "[&>div]:bg-green-500" :
                          contractReadiness.color === 'yellow' ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                        )}
                      />
                    </div>
                    
                    <div className="pt-2 border-t text-sm text-gray-600">
                      <p><strong>Thresholds:</strong></p>
                      <p>• Excellent: {currentConfig?.thresholds?.excellent || 90}%+</p>
                      <p>• Good: {currentConfig?.thresholds?.good || 70}%+</p>
                      <p>• Needs Improvement: Below {currentConfig?.thresholds?.needsImprovement || 50}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="weights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Weights - {scoringMode === 'profile' ? currentConfig?.name || 'Default' : currentMatchConfig?.name || 'Default'}</CardTitle>
              <CardDescription>
                How each category contributes to the overall score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {scoringMode === 'profile' ? (
                    Object.entries(currentConfig?.categories || {}).map(([key, category]) => (
                      <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{category?.name || key}</span>
                            <Badge variant={getCategoryPriorityColor(category?.priority) as any}>
                              {category?.priority || 'medium'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{category?.description || 'No description'}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.round((category?.totalWeight || 0) * 100)}%
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Show category breakdown for matching mode
                    Object.entries(categoryTotals).map(([categoryKey, total]) => {
                      const categoryData = {
                        pastPerformance: { name: 'Past Performance', description: 'Contract history and performance track record', priority: 'critical' as const },
                        technicalCapability: { name: 'Technical Capability', description: 'Core competencies and technical expertise', priority: 'critical' as const },
                        strategicFit: { name: 'Strategic Fit', description: 'Geographic and government level alignment', priority: 'important' as const },
                        credibilityRelationships: { name: 'Credibility & Relationships', description: 'Communication style and professionalism', priority: 'important' as const }
                      }[categoryKey as keyof typeof categoryTotals]
                      
                      return (
                        <div key={categoryKey} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{categoryData?.name}</span>
                              <Badge variant={getCategoryPriorityColor(categoryData?.priority || 'important') as any}>
                                {categoryData?.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{categoryData?.description}</p>
                            
                            {/* Show factor breakdown within category */}
                            <div className="mt-2 text-xs text-muted-foreground">
                              {categoryKey === 'pastPerformance' && (
                                <span>Past Performance: {currentMatchConfig?.categoryWeights?.pastPerformance?.pastPerformance || 0}%</span>
                              )}
                              {categoryKey === 'technicalCapability' && (
                                <span>NAICS: {currentMatchConfig?.categoryWeights?.technicalCapability?.naicsAlignment || 0}% • Certs: {currentMatchConfig?.categoryWeights?.technicalCapability?.certificationMatch || 0}%</span>
                              )}
                              {categoryKey === 'strategicFit' && (
                                <span>Geographic: {currentMatchConfig?.categoryWeights?.strategicFit?.geographicProximity || 0}% • Gov Level: {currentMatchConfig?.categoryWeights?.strategicFit?.governmentLevelMatch || 0}% • Preference: {currentMatchConfig?.categoryWeights?.strategicFit?.geographicPreferenceMatch || 0}%</span>
                              )}
                              {categoryKey === 'credibilityRelationships' && (
                                <span>Brand Alignment: {currentMatchConfig?.categoryWeights?.credibilityRelationships?.brandAlignment || 0}%</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {total}%
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium mb-4">Weight Distribution</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={scoringMode === 'profile' ? radarData : (useCustomWeights ? detailedMatchingData : matchingRadarData)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, weight }) => `${category} (${weight})`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="score"
                      >
                        {(scoringMode === 'profile' ? radarData : (useCustomWeights ? detailedMatchingData : matchingRadarData)).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(CHART_COLORS)[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Dynamic Weight Configuration</span>
                <div className="flex items-center space-x-2">
                  <Badge variant={useCustomWeights ? "default" : "outline"}>
                    {useCustomWeights ? "Custom Weights Active" : "Using Preset"}
                  </Badge>
                  <Badge variant={getTotalWeights() === 100 ? "default" : "destructive"}>
                    Total: {getTotalWeights()}%
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Adjust the 7-factor opportunity matching weights dynamically to see how they affect scoring. 
                Factors are grouped into 4 research-based categories:
                <br />
                <strong>Past Performance ({getCategoryWeightLabels()?.pastPerformance?.formattedWeight || '35%'})</strong> | <strong>Technical Capability ({getCategoryWeightLabels()?.technicalCapability?.formattedWeight || '35%'})</strong> | 
                <strong>Strategic Fit ({getCategoryWeightLabels()?.strategicFitRelationships?.formattedWeight || '15%'})</strong> | <strong>Credibility & Relationships ({getCategoryWeightLabels()?.credibilityMarketPresence?.formattedWeight || '15%'})</strong>
                <br />
                Total must equal 100% for proper matching calculations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Weight Controls */}
                <div className="grid gap-4">
                  {Object.entries(customMatchingWeights).map(([factor, weight]) => (
                    <div key={factor} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium capitalize">
                          {factor.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-mono w-12 text-right">{weight}%</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateCustomWeight(factor as keyof typeof customMatchingWeights, 0)
                              setUseCustomWeights(true)
                            }}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                      <Slider
                        value={[weight]}
                        onValueChange={([value]) => {
                          updateCustomWeight(factor as keyof typeof customMatchingWeights, value)
                          setUseCustomWeights(true)
                        }}
                        max={50}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weight Status */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-2">Weight Distribution Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <strong>Total Weight:</strong>
                      <div className={cn("text-lg font-mono", 
                        getTotalWeights() === 100 ? "text-green-600" : "text-red-600"
                      )}>
                        {getTotalWeights()}%
                      </div>
                    </div>
                    <div>
                      <strong>Active Factors:</strong>
                      <div className="text-lg font-mono">
                        {Object.values(customMatchingWeights).filter(w => w > 0).length}/7
                      </div>
                    </div>
                    <div>
                      <strong>Max Factor:</strong>
                      <div className="text-lg font-mono">
                        {Math.max(...Object.values(customMatchingWeights))}%
                      </div>
                    </div>
                    <div>
                      <strong>Min Factor:</strong>
                      <div className="text-lg font-mono">
                        {Math.min(...Object.values(customMatchingWeights))}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={balanceWeights} variant="outline">
                    Balance All Weights
                  </Button>
                  <Button onClick={resetWeights} variant="outline">
                    Reset to Preset
                  </Button>
                  <Button 
                    onClick={() => setUseCustomWeights(!useCustomWeights)}
                    variant={useCustomWeights ? "default" : "outline"}
                  >
                    {useCustomWeights ? "Using Custom" : "Enable Custom"}
                  </Button>
                </div>

                {/* Warning for invalid totals */}
                {getTotalWeights() !== 100 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Weight Total Warning</AlertTitle>
                    <AlertDescription>
                      Total weights must equal 100% for accurate matching calculations. 
                      Current total: {getTotalWeights()}%. 
                      {getTotalWeights() > 100 ? "Reduce some weights." : "Increase some weights."}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Live Preview */}
                {useCustomWeights && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Live Preview</CardTitle>
                      <CardDescription>
                        See how your custom weights affect the scoring radar chart
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={detailedMatchingData}>
                          <PolarGrid />
                          <PolarAngleAxis 
                            dataKey="category" 
                            tick={{ fontSize: 12, fontWeight: 500 }}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Radar
                            name="Score"
                            dataKey="score"
                            stroke={CHART_COLORS.secondary}
                            fill={CHART_COLORS.secondary}
                            fillOpacity={0.3}
                            strokeWidth={3}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Details - {scoringMode === 'profile' ? currentConfig?.name || 'Default' : currentMatchConfig?.name || 'Default'}</CardTitle>
              <CardDescription>
                Detailed breakdown of the selected configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Configuration Info</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Version:</strong> {scoringMode === 'profile' ? currentConfig?.version || '1.0' : currentMatchConfig?.version || '1.0'}</p>
                    <p><strong>Name:</strong> {scoringMode === 'profile' ? currentConfig?.name || 'Default Configuration' : currentMatchConfig?.name || 'Default Configuration'}</p>
                    <p><strong>Description:</strong> {scoringMode === 'profile' ? currentConfig?.description || 'Default configuration' : currentMatchConfig?.description || 'Default configuration'}</p>
                  </div>
                </div>
                
                {scoringMode === 'profile' && (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">Category Breakdown</h4>
                      <div className="space-y-4">
                        {Object.entries(currentConfig?.categories || {}).map(([key, category]) => (
                          <Card key={key}>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium">{category?.name || key}</h5>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant={getCategoryPriorityColor(category?.priority) as any}>
                                      {category?.priority || 'medium'}
                                    </Badge>
                                    <Badge variant="outline">
                                      {Math.round((category?.totalWeight || 0) * 100)}%
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600">{category?.description || 'No description'}</p>
                                
                                <div>
                                  <h6 className="text-sm font-medium mb-2">Sub-sections:</h6>
                                  <div className="space-y-2">
                                    {Object.entries(category?.sections || {}).map(([subKey, weight]) => (
                                      weight > 0 && (
                                        <div key={subKey} className="flex items-center justify-between text-sm">
                                          <span className="capitalize">{subKey}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {Math.round(weight * 100)}%
                                          </Badge>
                                        </div>
                                      )
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Thresholds</h4>
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <h5 className="font-medium mb-2">Contract Readiness</h5>
                            <div className="space-y-1 text-sm">
                              <p>Excellent: {currentConfig?.thresholds?.excellent || 90}%+</p>
                              <p>Good: {currentConfig?.thresholds?.good || 70}%+</p>
                              <p>Needs Improvement: {currentConfig?.thresholds?.needsImprovement || 50}%+</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </>
                )}
                
                {scoringMode === 'matching' && (
                  <div>
                    <h4 className="font-medium mb-2">Category-Based Matching Weights</h4>
                    <div className="space-y-4">
                      {Object.entries(categoryTotals).map(([categoryKey, total]) => {
                        const categoryData = {
                          pastPerformance: { name: 'Past Performance', description: 'Contract history and performance track record', priority: 'critical' as const, factors: ['Past Performance'] },
                          technicalCapability: { name: 'Technical Capability', description: 'Core competencies and technical expertise', priority: 'critical' as const, factors: ['NAICS Alignment', 'Certification Match'] },
                          strategicFit: { name: 'Strategic Fit', description: 'Geographic and government level alignment', priority: 'important' as const, factors: ['Geographic Proximity', 'Government Level Match', 'Geographic Preference Match'] },
                          credibilityRelationships: { name: 'Credibility & Relationships', description: 'Communication style and professionalism', priority: 'important' as const, factors: ['Brand Alignment'] }
                        }[categoryKey as keyof typeof categoryTotals]
                        
                        return (
                          <Card key={categoryKey}>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium">{categoryData?.name || categoryKey}</h5>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant={getCategoryPriorityColor(categoryData?.priority || 'important') as any}>
                                      {categoryData?.priority || 'important'}
                                    </Badge>
                                    <Badge variant="outline">
                                      {total}%
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600">{categoryData?.description}</p>
                                
                                <div>
                                  <h6 className="text-sm font-medium mb-2">Factor Breakdown:</h6>
                                  <div className="space-y-2">
                                    {categoryKey === 'pastPerformance' && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span>Past Performance</span>
                                        <Badge variant="outline" className="text-xs">
                                          {currentMatchConfig?.categoryWeights?.pastPerformance?.pastPerformance || 0}%
                                        </Badge>
                                      </div>
                                    )}
                                    {categoryKey === 'technicalCapability' && (
                                      <>
                                        <div className="flex items-center justify-between text-sm">
                                          <span>NAICS Alignment</span>
                                          <Badge variant="outline" className="text-xs">
                                            {currentMatchConfig?.categoryWeights?.technicalCapability?.naicsAlignment || 0}%
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                          <span>Certification Match</span>
                                          <Badge variant="outline" className="text-xs">
                                            {currentMatchConfig?.categoryWeights?.technicalCapability?.certificationMatch || 0}%
                                          </Badge>
                                        </div>
                                      </>
                                    )}
                                    {categoryKey === 'strategicFit' && (
                                      <>
                                        <div className="flex items-center justify-between text-sm">
                                          <span>Geographic Proximity</span>
                                          <Badge variant="outline" className="text-xs">
                                            {currentMatchConfig?.categoryWeights?.strategicFit?.geographicProximity || 0}%
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                          <span>Government Level Match</span>
                                          <Badge variant="outline" className="text-xs">
                                            {currentMatchConfig?.categoryWeights?.strategicFit?.governmentLevelMatch || 0}%
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                          <span>Geographic Preference Match</span>
                                          <Badge variant="outline" className="text-xs">
                                            {currentMatchConfig?.categoryWeights?.strategicFit?.geographicPreferenceMatch || 0}%
                                          </Badge>
                                        </div>
                                      </>
                                    )}
                                    {categoryKey === 'credibilityRelationships' && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span>Brand Alignment</span>
                                        <Badge variant="outline" className="text-xs">
                                          {currentMatchConfig?.categoryWeights?.credibilityRelationships?.brandAlignment || 0}%
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Implementation Note */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertTitle>Implementation Note</AlertTitle>
        <AlertDescription>
          This showcase demonstrates how configurable scoring weights affect profile evaluation. 
          In production, these configurations would be stored in the database and selectable 
          through user preferences or admin settings. The scoring engine would dynamically 
          apply the selected configuration to all profile calculations.
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default ScoringConfigShowcase