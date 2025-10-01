import { useMemo } from 'react'
import { useProfileStore } from '@/stores/profile-store'
import { SetAsideCode, OpportunitySetAsideMatch } from '@/types/set-asides'
import {
  getAllSetAsides,
  matchOpportunitySetAside,
  getSetAsideStats,
} from '@/lib/set-asides'

/**
 * Hook for managing set-aside eligibility and matching
 */
export function useSetAsides() {
  const profile = useProfileStore()

  // Get user's selected set-asides directly from profile (using new structure)
  const selectedSetAsides = useMemo(() => {
    return profile?.current?.certifications?.setAsides || []
  }, [profile?.current?.certifications?.setAsides])

  // Get all available set-asides from JSON data
  const allSetAsides = useMemo(() => {
    return getAllSetAsides()
  }, [])

  // Filter to show only user's selected set-asides
  const eligibleSetAsides = useMemo(() => {
    if (selectedSetAsides.length === 0) return []
    return allSetAsides.filter((setAside) =>
      selectedSetAsides.includes(setAside.code)
    )
  }, [allSetAsides, selectedSetAsides])

  // Generate set-aside eligibility records based on selected set-asides
  const setAsideEligibility = useMemo(() => {
    return selectedSetAsides.map((code) => {
      const setAside = allSetAsides.find((sa) => sa.code === code)
      return {
        setAsideCode: code,
        isEligible: true, // User explicitly selected this
        eligibilityReason: `Selected by user: ${setAside?.title || code}`,
        expirationDate: null, // Set-asides don't expire, certifications do
        lastVerified: new Date().toISOString(),
      }
    })
  }, [selectedSetAsides, allSetAsides])

  // Get eligible set-aside codes
  const eligibleCodes = useMemo(() => {
    return eligibleSetAsides.map((sa) => sa.code)
  }, [eligibleSetAsides])

  /**
   * Check if user is eligible for a specific set-aside
   */
  const isEligibleForSetAside = (code: SetAsideCode): boolean => {
    return selectedSetAsides.includes(code)
  }

  /**
   * Match opportunities against user's set-aside eligibility
   */
  const matchOpportunities = (
    opportunities: Array<{ id: string; setAsideCode?: string }>
  ): OpportunitySetAsideMatch[] => {
    return opportunities.map((opp) => {
      if (!opp.setAsideCode) {
        return {
          opportunityId: opp.id,
          setAsideCode: 'SBA', // Default fallback
          isEligible: true, // Open competition
          eligibilityReason: 'Open competition - no set-aside restrictions',
          matchScore: 50, // Neutral score
        }
      }

      const match = matchOpportunitySetAside(opp.setAsideCode, eligibleCodes)
      return {
        opportunityId: opp.id,
        setAsideCode: opp.setAsideCode as SetAsideCode,
        isEligible: match.isMatch,
        eligibilityReason: match.isMatch
          ? `Eligible through ${match.matchType} match`
          : 'Not eligible - missing required certifications',
        matchScore: match.score,
      }
    })
  }

  /**
   * Get set-aside statistics for opportunities
   */
  const getOpportunityStats = (
    opportunities: Array<{ setAsideCode?: string }>
  ) => {
    return getSetAsideStats(opportunities)
  }

  /**
   * Get recommendations for additional set-asides user could pursue
   */
  const getSetAsideRecommendations = (
    targetSetAsides: SetAsideCode[]
  ): string[] => {
    const recommendations: string[] = []
    const currentSelections = new Set(selectedSetAsides)

    targetSetAsides.forEach((code) => {
      if (!currentSelections.has(code)) {
        const setAside = allSetAsides.find((sa) => sa.code === code)
        if (setAside) {
          recommendations.push(
            `Consider pursuing ${setAside.title} opportunities`
          )
        }
      }
    })

    return Array.from(new Set(recommendations))
  }

  /**
   * Update profile with auto-detected set-aside eligibility
   */
  const updateProfileSetAsideEligibility = () => {
    // This would integrate with your profile store update logic
    // For now, we'll just return the eligibility data
    return setAsideEligibility
  }

  return {
    // Data
    allSetAsides,
    selectedSetAsides,
    eligibleSetAsides,
    eligibleCodes,
    setAsideEligibility,

    // Functions
    isEligibleForSetAside,
    matchOpportunities,
    getOpportunityStats,
    getSetAsideRecommendations,
    updateProfileSetAsideEligibility,

    // Stats
    totalSelectedSetAsides: selectedSetAsides.length,
    totalEligibleSetAsides: eligibleSetAsides.length,
    hasSmallBusinessEligibility:
      eligibleCodes.includes('SBA') || eligibleCodes.includes('SBP'),
    hasSpecializedEligibility: eligibleCodes.some(
      (code) => !['SBA', 'SBP'].includes(code)
    ),
  }
}

/**
 * Hook for set-aside filtering and search
 */
export function useSetAsideFilters() {
  const { eligibleCodes } = useSetAsides()

  /**
   * Filter opportunities by set-aside eligibility
   */
  const filterByEligibility = <T extends { setAsideCode?: string }>(
    opportunities: T[],
    onlyEligible: boolean = false
  ): T[] => {
    if (!onlyEligible) return opportunities

    return opportunities.filter((opp) => {
      if (!opp.setAsideCode) return true // Open competition
      return eligibleCodes.includes(opp.setAsideCode as SetAsideCode)
    })
  }

  /**
   * Sort opportunities by set-aside match score
   */
  const sortBySetAsideMatch = useMemo(
    () =>
      <T extends { setAsideCode?: string; id: string }>(
        opportunities: T[]
      ): T[] => {
        // Simple sorting based on set-aside eligibility
        return [...opportunities].sort((a, b) => {
          const aEligible =
            !a.setAsideCode ||
            eligibleCodes.includes(a.setAsideCode as SetAsideCode)
          const bEligible =
            !b.setAsideCode ||
            eligibleCodes.includes(b.setAsideCode as SetAsideCode)

          if (aEligible && !bEligible) return -1
          if (!aEligible && bEligible) return 1
          return 0
        })
      },
    [eligibleCodes]
  )

  return {
    filterByEligibility,
    sortBySetAsideMatch,
    eligibleCodes,
  }
}
