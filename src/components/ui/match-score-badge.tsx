'use client'

import React from "react"
import { cn } from "@/lib/utils"
import { HelpCircle } from "lucide-react"

interface MatchScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showExplanation?: boolean
  onExplanationClick?: () => void
  className?: string
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-green-800"    // 70-100: Green
  if (score >= 50) return "text-yellow-800"   // 50-69: Yellow
  return "text-red-800"                       // 0-49: Red
}

function getScoreBgColor(score: number) {
  if (score >= 70) return "bg-green-100 border-green-500 ring-green-500/20"
  if (score >= 50) return "bg-yellow-100 border-yellow-500 ring-yellow-500/20"
  return "bg-red-100 border-red-500 ring-red-500/20"
}

// Removed unused function getScoreLabel

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg"
}

export const MatchScoreBadge = React.memo(function MatchScoreBadge({ 
  score, 
  size = 'md', 
  showExplanation = false,
  onExplanationClick,
  className 
}: MatchScoreBadgeProps) {
  const colorClass = getScoreColor(score)
  const bgColorClass = getScoreBgColor(score)
  const sizeClass = sizeClasses[size]

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      {/* Main Badge */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full border-4 font-bold ring-4',
          sizeClass,
          bgColorClass,
          colorClass,
          showExplanation && onExplanationClick && 'cursor-pointer hover:opacity-80 transition-opacity'
        )}
        onClick={showExplanation && onExplanationClick ? onExplanationClick : undefined}
        data-testid="match-score-indicator"
      >
{Math.round(score)}%
      </div>
      
      {/* Explanation Icon */}
      {showExplanation && onExplanationClick && (
        <button
          onClick={onExplanationClick}
          className={cn(
            'absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-background border-2 border-border hover:border-muted-foreground transition-colors',
            size === 'sm' && 'w-4 h-4',
            size === 'md' && 'w-5 h-5', 
            size === 'lg' && 'w-6 h-6'
          )}
          title="View score explanation"
        >
          <HelpCircle className={cn(
            'text-gray-500',
            size === 'sm' && 'w-2.5 h-2.5',
            size === 'md' && 'w-3 h-3',
            size === 'lg' && 'w-3.5 h-3.5'
          )} />
        </button>
      )}
    </div>
  )
})

// Separate component for score with label (used in opportunity cards)
export function MatchScoreDisplay({ 
  score, 
  size = 'md',
  showLabel = true,
  onExplanationClick,
  className 
}: MatchScoreBadgeProps & { showLabel?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <MatchScoreBadge 
        score={score}
        size={size}
        onExplanationClick={onExplanationClick}
      />
      {showLabel && (
        <span className="text-xs text-gray-600 font-medium">
          MatchScore™
        </span>
      )}
    </div>
  )
}