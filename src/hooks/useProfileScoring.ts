/**
 * Unified Profile Scoring Hook
 * 
 * Simplified hook that uses the unified scoring system from profile-scoring-config.ts
 * Compatible with existing UI components while using research-based weights
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  calculateProfileScore,
  type LegacyProfileScore as ProfileScore,
} from '@/lib/profile-scoring-config'
import { useProfileStore, useCurrentProfile, useProfileLoading, useProfileError } from '@/stores/profile-store'
import type { Profile } from '@/types'

// =============================================
// TYPES
// =============================================

interface UseProfileScoringOptions {
  autoCalculate?: boolean
  debounceMs?: number
}

interface UseProfileScoringReturn {
  // Current scoring state
  score: ProfileScore | null
  history: null // Simplified - not supported in unified system
  matchingPotential: null // Simplified - not supported in unified system

  // Loading states
  isCalculating: boolean
  isLoadingHistory: boolean
  isLoadingMatching: boolean
  isProfileLoading: boolean

  // Error states
  error: string | null
  profileError: string | null

  // Actions
  calculateScore: (profile: Profile) => Promise<ProfileScore>
  recalculateScore: () => Promise<void>
  clearError: () => void
  
  // Profile state
  hasProfile: boolean
}

// =============================================
// HOOK IMPLEMENTATION
// =============================================

export function useProfileScoring(
  options: UseProfileScoringOptions = {}
): UseProfileScoringReturn {
  const {
    autoCalculate = true,
    debounceMs = 500,
  } = options

  // State
  const [score, setScore] = useState<ProfileScore | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get current profile using individual selectors to avoid shallow comparison issues
  const profile = useCurrentProfile()
  const isProfileLoading = useProfileLoading()
  const profileError = useProfileError()
  
  // Track profile ID to prevent unnecessary re-calculations
  const lastProfileIdRef = useRef<string | null>(null)
  const lastScoreRef = useRef<ProfileScore | null>(null)

  // =============================================
  // CORE SCORING FUNCTION
  // =============================================

  const calculateScore = useCallback(async (targetProfile: Profile): Promise<ProfileScore> => {
    if (!targetProfile) {
      throw new Error('No profile provided for scoring')
    }

    setIsCalculating(true)
    setError(null)

    try {
      // Brief delay for better UX (scoring is actually instant)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Use unified scoring system
      const newScore = calculateProfileScore(targetProfile)
      
      setScore(newScore)
      
      return newScore
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate profile score'
      setError(errorMessage)
      throw err
    } finally {
      setIsCalculating(false)
    }
  }, []) // No dependencies - function is stable and doesn't rely on closure

  // =============================================
  // AUTO-CALCULATION WITH DEBOUNCING
  // =============================================

  useEffect(() => {
    // Don't auto-calculate if disabled, no profile, or still loading
    if (!autoCalculate || !profile || isProfileLoading) return
    
    // Check if profile has actually changed to prevent unnecessary calculations
    const currentProfileId = profile.id
    if (currentProfileId === lastProfileIdRef.current) return
    
    const timeoutId = setTimeout(async () => {
      try {
        setIsCalculating(true)
        setError(null)
        
        // Brief delay for better UX (scoring is actually instant)
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Use unified scoring system
        const newScore = calculateProfileScore(profile)
        
        setScore(newScore)
        lastProfileIdRef.current = currentProfileId
        lastScoreRef.current = newScore
      } catch (err) {
        console.error('Auto-calculation failed:', err)
        setError('Failed to calculate profile score automatically')
      } finally {
        setIsCalculating(false)
      }
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [profile?.id, autoCalculate, debounceMs, isProfileLoading]) // Keep profile access through closure

  // =============================================
  // HELPER FUNCTIONS
  // =============================================

  const recalculateScore = useCallback(async (): Promise<void> => {
    if (!profile) {
      setError('No profile available to recalculate score')
      return
    }
    try {
      await calculateScore(profile)
    } catch (err) {
      console.error('Manual recalculation failed:', err)
      setError('Failed to recalculate profile score')
    }
  }, [profile, calculateScore]) // Include both dependencies

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // =============================================
  // RETURN VALUES
  // =============================================

  return {
    score,
    history: null, // Simplified
    matchingPotential: null, // Simplified
    isCalculating,
    isLoadingHistory: false, // Simplified
    isLoadingMatching: false, // Simplified
    isProfileLoading,
    error,
    profileError,
    calculateScore,
    recalculateScore,
    clearError,
    hasProfile: !!profile,
  }
}