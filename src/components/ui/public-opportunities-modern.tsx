'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Badge } from './badge'
import { Button } from './button'
import { Input } from './input'
import { Search, Loader2, Sparkles, Calendar, DollarSign, Building2, MapPin, FileText, Briefcase, Clock, TrendingUp, Zap, Target, ArrowRight, Star, Shield, RefreshCw } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

interface PublicOpportunity {
  id: string
  title: string
  agency: string
  deadline: string
  contractValue: number
  solicitationNumber: string
  location: string
  setAsideType: string
  type: string
  naicsCodes: string[]
  postedDate: string
  status: string
}

interface PublicOpportunitiesData {
  items: PublicOpportunity[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  preview: boolean
  upgradeMessage: string
  lastUpdated: string
  nextRefresh: string
}

interface PublicOpportunitiesModernProps {
  onSignUpClick?: () => void
  className?: string
  maxResults?: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDeadline(date: string) {
  const deadline = new Date(date)
  const now = new Date()
  const diffTime = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'Expired'
  if (diffDays === 0) return 'Due Today'
  if (diffDays === 1) return 'Due Tomorrow'
  if (diffDays < 7) return `${diffDays} days left`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks left`
  
  return deadline.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

function getDeadlineUrgency(date: string) {
  const deadline = new Date(date)
  const now = new Date()
  const diffTime = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'text-red-400'
  if (diffDays <= 3) return 'text-orange-400'
  if (diffDays <= 7) return 'text-yellow-400'
  return 'text-gray-400'
}

function ModernOpportunityCard({ 
  opportunity, 
  onSignUpClick 
}: { 
  opportunity: PublicOpportunity
  onSignUpClick?: () => void 
}) {
  const deadlineText = formatDeadline(opportunity.deadline)
  const deadlineUrgency = getDeadlineUrgency(opportunity.deadline)
  const valueText = formatCurrency(opportunity.contractValue)
  
  const postedText = new Date(opportunity.postedDate).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })

  return (
    <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-gray-600/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-4">
            <h3 className="font-bold text-lg text-white leading-tight line-clamp-2 mb-3 group-hover:text-blue-300 transition-colors">
              {opportunity.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
              <div className="flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-blue-400" />
                <span className="font-medium">{typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name || ''}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-purple-400" />
                <span>{opportunity.location}</span>
              </div>
            </div>
          </div>
          
          {/* AI Score Placeholder */}
          <div className="shrink-0 relative">
            <div 
              className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-2 border-dashed border-gray-600 relative group/score cursor-pointer hover:border-blue-500/50 transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation()
                onSignUpClick?.()
              }}
            >
              <div className="text-center">
                <Sparkles className="w-6 h-6 mx-auto text-gray-500 group-hover/score:text-blue-400 transition-colors" />
                <div className="text-xs text-gray-500 group-hover/score:text-blue-400 transition-colors font-medium mt-1">AI Score</div>
              </div>
              
              {/* Tooltip */}
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover/score:opacity-100 transition-opacity whitespace-nowrap">
                Sign up to see your match
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/20 transition-colors">
            <FileText className="w-3 h-3 mr-1" />
            {opportunity.solicitationNumber}
          </Badge>
          <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/20 transition-colors">
            <Shield className="w-3 h-3 mr-1" />
            {opportunity.setAsideType}
          </Badge>
          <Badge className="bg-green-500/10 text-green-300 border-green-500/20 hover:bg-green-500/20 transition-colors">
            <Briefcase className="w-3 h-3 mr-1" />
            {opportunity.type}
          </Badge>
          {opportunity.naicsCodes.length > 0 && (
            <Badge className="bg-orange-500/10 text-orange-300 border-orange-500/20 hover:bg-orange-500/20 transition-colors">
              NAICS: {opportunity.naicsCodes[0]}{opportunity.naicsCodes.length > 1 && ` +${opportunity.naicsCodes.length - 1}`}
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <div className="flex items-center space-x-6">
            <div className={cn("flex items-center text-sm font-semibold", deadlineUrgency)}>
              <Calendar className="w-4 h-4 mr-2" />
              <span>{deadlineText}</span>
            </div>
            
            <div className="flex items-center text-sm font-semibold text-green-400">
              <DollarSign className="w-4 h-4 mr-1" />
              {valueText}
            </div>

            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              Posted {postedText}
            </div>
          </div>

          <Badge className="bg-gray-800/50 text-gray-300 border-gray-600/50">
            <Star className="w-3 h-3 mr-1" />
            Preview
          </Badge>
        </div>
      </div>
    </div>
  )
}

// SWR fetcher function
const fetcher = async (url: string) => {
  const response = await fetch(url)
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch opportunities')
  }
  return result.data
}

export function PublicOpportunitiesModern({ 
  onSignUpClick, 
  className,
  maxResults = 6 
}: PublicOpportunitiesModernProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number>(0)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Build the API URL with query parameters
  const params = new URLSearchParams()
  if (debouncedSearchQuery) params.set('query', debouncedSearchQuery)
  params.set('limit', maxResults.toString())
  const apiUrl = `/api/v1/opportunities/public?${params.toString()}`

  // Use SWR for data fetching with caching
  const { data, error, isLoading, mutate } = useSWR<PublicOpportunitiesData>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes deduplication
      refreshInterval: 300000, // Auto refresh every 5 minutes
    }
  )

  // Timer countdown to next refresh
  useEffect(() => {
    if (!data?.nextRefresh) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const nextRefresh = new Date(data.nextRefresh).getTime()
      const timeDiff = Math.max(0, Math.floor((nextRefresh - now) / 1000))
      setTimeUntilRefresh(timeDiff)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    
    return () => clearInterval(interval)
  }, [data?.nextRefresh])

  // Format time until next refresh
  const formatTimeUntilRefresh = (seconds: number) => {
    if (seconds <= 0) return 'Refreshing...'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  return (
    <section className="relative py-20 px-6" id="opportunities">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm font-medium text-blue-300 mb-6">
            <Target className="w-4 h-4 mr-2" />
            Live Government Opportunities
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            See What You're
            <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Missing Out On
            </span>
          </h2>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            These are real, active government contract opportunities. Sign up to unlock AI-powered match scores and see which ones are perfect for your business.
          </p>

          {/* Upgrade CTA */}
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 mb-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white mb-1">Ready to see your AI match scores?</h3>
                  <p className="text-gray-300 text-sm">Join 10,000+ contractors using AI to win more contracts</p>
                </div>
              </div>
              <Button 
                onClick={onSignUpClick}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Unlock AI Matching
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-lg mx-auto mb-12">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search government opportunities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-12 py-4 text-lg bg-gray-800/50 border-gray-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-2xl text-white placeholder-gray-400"
          />
          {isLoading && (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>

        {/* Results */}
        <div>
          {/* Results Summary */}
          {data && (
            <div className="flex justify-between items-center mb-8">
              <p className="text-gray-400">
                Showing <span className="text-white font-semibold">{data.items.length}</span> of <span className="text-white font-semibold">{data.total}</span> opportunities
              </p>
              <div className="flex items-center gap-3">
                <Badge className="bg-yellow-500/10 text-yellow-300 border-yellow-500/20">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Live Data
                </Badge>
                {timeUntilRefresh > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <RefreshCw className="w-4 h-4" />
                    <span>Next refresh: {formatTimeUntilRefresh(timeUntilRefresh)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !data && (
            <div className="flex justify-center py-20">
              <div className="flex items-center gap-3 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-lg">Finding opportunities...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
              <p className="text-red-400 font-semibold text-lg mb-2">Error loading opportunities</p>
              <p className="text-gray-400 mb-4">{error.message}</p>
              <Button
                onClick={() => mutate()}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && data && data.items.length === 0 && (
            <div className="text-center py-20">
              <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-xl mb-2">No opportunities found</p>
              <p className="text-gray-500">Try adjusting your search terms</p>
            </div>
          )}

          {/* Opportunities Grid */}
          {data && data.items.length > 0 && (
            <div className="grid lg:grid-cols-2 gap-6 mb-12">
              {data.items.map((opportunity) => (
                <ModernOpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onSignUpClick={onSignUpClick}
                />
              ))}
            </div>
          )}

          {/* Bottom CTA */}
          {data && data.items.length > 0 && (
            <div className="text-center bg-gradient-to-r from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-12">
              <h3 className="text-3xl font-bold mb-4">Ready to Win More Contracts?</h3>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                Stop guessing which opportunities to pursue. Let our AI analyze your business and show you exactly which contracts you're most likely to win.
              </p>
              <Button 
                onClick={onSignUpClick}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}