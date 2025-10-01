import { useMemo } from 'react'
import { 
  useCurrentProfile,
  useFetchGovDatabase,
  useGetGovCertificationById,
  useAddCertification,
  useUpdateCertification,
  useDeleteCertification,
  useToggleCertificationActivation,
  useRefreshCertificationAnalytics,
  useGovDatabase,
  useGovDatabaseLoading,
  useGovDatabaseError,
  useCertificationAnalytics,
  useCertificationAnalyticsLoading,
} from '@/stores/profile-store'
import type {
  UserCertification,
  CertificationFormData,
  GovCertificationDefinition,
  CertificationStatus,
} from '@/types/certifications'
import {
  isExpiringSoon,
  isExpired,
  calculateCertificationCompleteness,
} from '@/types/certifications'

/**
 * Hook for managing user certifications (similar to useSetAsides)
 */
export function useCertifications() {
  const profile = useCurrentProfile()
  const govDatabase = useGovDatabase()
  const govDatabaseLoading = useGovDatabaseLoading()
  const govDatabaseError = useGovDatabaseError()
  const analytics = useCertificationAnalytics()
  const analyticsLoading = useCertificationAnalyticsLoading()

  // Actions
  const fetchGovDatabase = useFetchGovDatabase()
  const getGovCertificationById = useGetGovCertificationById()
  const addCertification = useAddCertification()
  const updateCertification = useUpdateCertification()
  const deleteCertification = useDeleteCertification()
  const toggleCertificationActivation = useToggleCertificationActivation()
  const refreshCertificationAnalytics = useRefreshCertificationAnalytics()

  // Get user's certifications from profile (using new structure)
  const userCertifications = useMemo(() => {
    console.log('🔍 useCertifications - Raw profile data:', {
      hasProfile: !!profile,
      profileId: profile?.id,
      profileCertifications: profile?.certifications,
      typeOfCertifications: typeof profile?.certifications,
      keysInCertifications: profile?.certifications ? Object.keys(profile.certifications as any) : []
    })
    
    const certObj = profile?.certifications as Record<string, any>
    
    // The structure can be:
    // Option 1: profile.certifications.certifications (nested structure)
    // Option 2: profile.certifications directly contains the array and other fields (flat structure)
    let certifications: any[] = []
    
    if (certObj) {
      // Check if certifications is nested
      if (Array.isArray(certObj.certifications)) {
        certifications = certObj.certifications
        console.log('🔍 Found nested certifications array')
      }
      // Check if the certObj itself contains certification objects (look for objects with certificationId)
      else if (Array.isArray(certObj)) {
        certifications = certObj
        console.log('🔍 Found direct certifications array')
      }
      // Check if there are certification-like objects directly in the certObj
      else {
        // Look for array properties that contain objects with certificationId
        const possibleArrays = Object.values(certObj).filter(val => 
          Array.isArray(val) && val.some((item: any) => 
            item && typeof item === 'object' && 'certificationId' in item
          )
        )
        if (possibleArrays.length > 0) {
          certifications = possibleArrays[0] as any[]
          console.log('🔍 Found certifications in object property')
        }
      }
    }
    
    console.log('🔍 useCertifications - Data sources:', {
      hasProfileCertifications: !!profile?.certifications,
      certificationsArrayLength: certifications.length,
      certificationsData: certifications,
      certObjKeys: certObj ? Object.keys(certObj) : [],
      certObjType: typeof certObj,
      detectedStructure: Array.isArray(certObj?.certifications) ? 'nested' : Array.isArray(certObj) ? 'direct' : 'other'
    })
    
    // Return the found certifications
    return certifications
  }, [profile?.certifications])

  // Get all available certifications from government database
  const allGovCertifications = useMemo(() => {
    console.log('🔍 allGovCertifications DEBUG:', {
      govDatabase: !!govDatabase,
      loading: govDatabaseLoading,
      error: govDatabaseError,
      categories: govDatabase?.certificationCategories?.length || 0
    })
    
    if (!govDatabase) return []
    
    const results = govDatabase.certificationCategories.flatMap(category =>
      category.certifications
        .filter(cert => cert.isActive)
        .map(cert => ({
          ...cert,
          categoryName: category.name,
        }))
    )
    
    console.log('🔍 Found gov certifications:', results.length)
    return results
  }, [govDatabase, govDatabaseLoading, govDatabaseError])

  // Filter certifications by status
  const activeCertifications = useMemo(() => {
    return userCertifications.filter(cert => 
      cert.isActivated && cert.status === 'active'
    )
  }, [userCertifications])

  const expiringSoonCertifications = useMemo(() => {
    return userCertifications.filter(cert => 
      cert.expirationDate && isExpiringSoon(cert)
    )
  }, [userCertifications])

  const expiredCertifications = useMemo(() => {
    return userCertifications.filter(cert => 
      cert.expirationDate && isExpired(cert)
    )
  }, [userCertifications])

  const pendingCertifications = useMemo(() => {
    return userCertifications.filter(cert => cert.status === 'pending')
  }, [userCertifications])

  const verifiedCertifications = useMemo(() => {
    return userCertifications.filter(cert => cert.verificationStatus === 'verified')
  }, [userCertifications])

  // Certification statistics
  const stats = useMemo(() => {
    return {
      total: userCertifications.length,
      active: activeCertifications.length,
      expiringSoon: expiringSoonCertifications.length,
      expired: expiredCertifications.length,
      pending: pendingCertifications.length,
      verified: verifiedCertifications.length,
      completenessScore: calculateCertificationCompleteness(userCertifications),
    }
  }, [
    userCertifications.length,
    activeCertifications.length,
    expiringSoonCertifications.length,
    expiredCertifications.length,
    pendingCertifications.length,
    verifiedCertifications.length,
    userCertifications,
  ])

  /**
   * Check if user has a specific certification
   */
  const hasCertification = (certificationId: string): boolean => {
    return userCertifications.some(cert => 
      cert.certificationId === certificationId && cert.status === 'active'
    )
  }

  /**
   * Check if user has an active certification
   */
  const hasActiveCertification = (certificationId: string): boolean => {
    return userCertifications.some(cert => 
      cert.certificationId === certificationId && 
      cert.status === 'active' && 
      cert.isActivated
    )
  }

  /**
   * Get certification by ID
   */
  const getCertificationById = (id: string): UserCertification | undefined => {
    return userCertifications.find(cert => cert.id === id)
  }

  /**
   * Get government certification definition
   */
  const getGovCertification = (certificationId: string): GovCertificationDefinition | null => {
    return getGovCertificationById(certificationId)
  }

  /**
   * Get certifications by status
   */
  const getCertificationsByStatus = (status: CertificationStatus): UserCertification[] => {
    return userCertifications.filter(cert => cert.status === status)
  }

  /**
   * Get certifications expiring within specified days
   */
  const getCertificationsExpiringIn = (days: number): UserCertification[] => {
    return userCertifications.filter(cert => 
      cert.expirationDate && isExpiringSoon(cert, days)
    )
  }

  /**
   * Get certification recommendations based on missing certifications
   */
  const getRecommendations = (): Array<{
    certification: GovCertificationDefinition
    reason: string
    priority: 'high' | 'medium' | 'low'
  }> => {
    if (!govDatabase) return []

    const userCertIds = new Set(userCertifications.map(cert => cert.certificationId))
    const recommendations: Array<{
      certification: GovCertificationDefinition
      reason: string
      priority: 'high' | 'medium' | 'low'
    }> = []

    // Get high priority certifications user doesn't have
    allGovCertifications.forEach(cert => {
      if (!userCertIds.has(cert.id) && cert.priority === 'high') {
        recommendations.push({
          certification: cert,
          reason: `High priority certification for ${cert.applicableIndustries.join(', ')}`,
          priority: 'high',
        })
      } else if (!userCertIds.has(cert.id) && cert.priority === 'critical') {
        recommendations.push({
          certification: cert,
          reason: `Critical certification that may be required for many opportunities`,
          priority: 'high',
        })
      }
    })

    return recommendations.slice(0, 5) // Limit to top 5 recommendations
  }

  /**
   * Helper to create a new certification
   */
  const createCertification = async (data: CertificationFormData): Promise<UserCertification> => {
    return await addCertification(data)
  }

  /**
   * Helper to update an existing certification
   */
  const editCertification = async (id: string, data: Partial<CertificationFormData>): Promise<UserCertification> => {
    return await updateCertification(id, data)
  }

  /**
   * Helper to remove a certification
   */
  const removeCertification = async (id: string): Promise<void> => {
    await deleteCertification(id)
  }

  /**
   * Helper to toggle certification activation
   */
  const toggleActivation = async (id: string, isActivated: boolean): Promise<void> => {
    await toggleCertificationActivation(id, isActivated)
  }

  /**
   * Load government database if not already loaded
   */
  const ensureGovDatabase = async (): Promise<void> => {
    if (!govDatabase && !govDatabaseLoading) {
      await fetchGovDatabase()
    }
  }

  return {
    // Data
    userCertifications,
    allGovCertifications,
    activeCertifications,
    expiringSoonCertifications,
    expiredCertifications,
    pendingCertifications,
    verifiedCertifications,
    stats,
    analytics,

    // Government database
    govDatabase,
    govDatabaseLoading,
    govDatabaseError,
    analyticsLoading,

    // Helper functions
    hasCertification,
    hasActiveCertification,
    getCertificationById,
    getGovCertification,
    getCertificationsByStatus,
    getCertificationsExpiringIn,
    getRecommendations,

    // Actions
    createCertification,
    editCertification,
    removeCertification,
    toggleActivation,
    refreshAnalytics: refreshCertificationAnalytics,
    ensureGovDatabase,

    // Raw actions (for advanced use)
    actions: {
      fetchGovDatabase,
      getGovCertificationById,
      addCertification,
      updateCertification,
      deleteCertification,
      toggleCertificationActivation,
      refreshCertificationAnalytics,
    },

    // Status flags
    hasAnyCertifications: userCertifications.length > 0,
    hasActiveCertifications: activeCertifications.length > 0,
    hasExpiringSoon: expiringSoonCertifications.length > 0,
    hasExpired: expiredCertifications.length > 0,
    isLoading: govDatabaseLoading,
    hasError: !!govDatabaseError,
  }
}

/**
 * Hook for certification filtering and search
 */
export function useCertificationFilters() {
  const { userCertifications, allGovCertifications } = useCertifications()

  /**
   * Filter certifications by text search
   */
  const searchCertifications = (query: string): GovCertificationDefinition[] => {
    if (!query.trim()) return allGovCertifications

    const searchTerm = query.toLowerCase()
    return allGovCertifications.filter(cert =>
      cert.name.toLowerCase().includes(searchTerm) ||
      cert.fullName.toLowerCase().includes(searchTerm) ||
      cert.description.toLowerCase().includes(searchTerm) ||
      cert.issuingAgency.toLowerCase().includes(searchTerm) ||
      cert.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }

  /**
   * Filter certifications by category
   */
  const filterByCategory = (categoryId: string): GovCertificationDefinition[] => {
    return allGovCertifications.filter(cert => 
      cert.categoryName === categoryId || cert.tags.includes(categoryId)
    )
  }

  /**
   * Filter certifications by agency
   */
  const filterByAgency = (agency: string): GovCertificationDefinition[] => {
    return allGovCertifications.filter(cert =>
      cert.issuingAgency.toLowerCase() === agency.toLowerCase()
    )
  }

  /**
   * Filter certifications by priority
   */
  const filterByPriority = (priority: string): GovCertificationDefinition[] => {
    return allGovCertifications.filter(cert => cert.priority === priority)
  }

  /**
   * Get certifications user doesn't have yet
   */
  const getAvailableCertifications = (): GovCertificationDefinition[] => {
    const userCertIds = new Set(userCertifications.map(cert => cert.certificationId))
    return allGovCertifications.filter(cert => !userCertIds.has(cert.id))
  }

  return {
    searchCertifications,
    filterByCategory,
    filterByAgency,
    filterByPriority,
    getAvailableCertifications,
    allGovCertifications,
  }
}

export default useCertifications