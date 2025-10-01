'use client'

import { useState, useEffect } from 'react'
import { useOpportunitiesStore } from '@/stores/opportunities-store'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextEditor } from '@/components/ui/text-editor'
import { PlateEditor } from '@/components/ui/plate-editor'
import { YearPicker } from '@/components/ui/date-picker'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Target,
  Save,
  X,
  Plus,
  Trash2,
  Lightbulb,
  Users,
  Edit,
  FileText,
  Shield,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  Award,
  User,
  Sparkles,
  Clock,
  Star,
} from 'lucide-react'
import { Profile } from '@/types'
import {
  GovernmentLevel,
  TravelWillingness,
  GOVERNMENT_LEVEL_OPTIONS,
} from '@/types/profile'
import { PSCSelector, PSCLabelWithInfo } from '@/components/psc'
import { CustomerType, CUSTOMER_TYPE_OPTIONS } from '@/types/global-enums'
import { CONTRACT_TYPE_LABELS } from '@/types/opportunity-enums'
import setAsidesData from '@/data/government/set-asides/set-asides.json'
import locationsData from '@/data/government/locations/locations.json'
import { SimpleNAICSInput, NAICSLabelWithInfo } from '@/components/naics'
import { SeparateLocationSelector, SeparateLocationLabelWithInfo } from '@/components/location'
import { AgencySelector, AgencyLabelWithInfo } from '@/components/agency'
import { SetAsideSelector, SetAsideLabelWithInfo } from '@/components/set-aside'
import { useCSRF } from '@/hooks/useCSRF'
import { SimpleGeographicPreferencesForm } from './SimpleGeographicPreferencesForm'
import { ContactSelect, ContactLabelWithInfo } from '@/components/contacts'
import { useContactStore } from '@/stores/contacts-store'
import { SecurityClearanceSelector, SecurityClearanceLabelWithInfo } from '@/components/security-clearance/SecurityClearanceSelector'
import { SecurityClearanceLevel } from '@/lib/security-clearance'

interface ProfileCapabilitiesFormProps {
  profile: Profile
  onUpdate: (profile: Profile) => void
  onComplete: () => void
}

// Use global SecurityClearanceLevel enum instead of hardcoded array

// Helper functions for displaying project details
const formatProjectValue = (value?: number | string): string => {
  if (!value || value === 0) return 'N/A'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return 'N/A'
  
  if (numValue >= 1000000000) return `$${(numValue / 1000000000).toFixed(1)}B`
  if (numValue >= 1000000) return `$${(numValue / 1000000).toFixed(1)}M`
  if (numValue >= 1000) return `$${(numValue / 1000).toFixed(0)}K`
  return `$${numValue.toLocaleString()}`
}

const getProjectIndex = (projectId: string, projects: any[]): number => {
  const index = projects.findIndex(p => p.id === projectId)
  return index >= 0 ? index + 1 : 0
}

export function ProfileCapabilitiesForm({
  profile,
  onUpdate,
  onComplete,
}: ProfileCapabilitiesFormProps) {

  const [coreCompetencies, setCoreCompetencies] = useState<string[]>(
    profile.coreCompetencies || []
  )
  const [securityClearance, setSecurityClearance] = useState(
    profile.securityClearance || ''
  )

  // Brand voice and communication preferences moved to settings tab
  // These are no longer part of capabilities and don't affect profile completeness

  // Government level preferences
  const [governmentLevels, setGovernmentLevels] = useState<GovernmentLevel[]>(
    (profile as any).governmentLevels || []
  )

  // Geographic preferences
  const [geographicPreferences, setGeographicPreferences] = useState(() => {
    const existing = (profile as any).geographicPreferences
    if (existing && typeof existing === 'object') {
      // Check if it's the new structure
      if (
        existing.preferences &&
        typeof existing.preferences === 'object' &&
        !Array.isArray(existing.preferences)
      ) {
        return existing
      }
      // Convert old flat array structure to new grouped structure
      if (existing.preferences && Array.isArray(existing.preferences)) {
        const grouped = {
          country: [] as any[],
          state: [] as any[],
          county: [] as any[],
          city: [] as any[],
          zip: [] as any[],
        }
        existing.preferences.forEach((pref: any) => {
          if (pref.type && grouped[pref.type as keyof typeof grouped]) {
            grouped[pref.type as keyof typeof grouped].push(pref)
          }
        })
        return {
          preferences: grouped,
          workFromHome: existing.workFromHome ?? true,
          travelWillingness:
            existing.travelWillingness ?? TravelWillingness.REGIONAL,
          maxTravelPercentage: existing.maxTravelPercentage ?? 90,
        }
      }
    }
    return {
      preferences: {
        country: [],
        state: [],
        county: [],
        city: [],
        zip: [],
      },
      workFromHome: true,
      travelWillingness: TravelWillingness.REGIONAL,
      maxTravelPercentage: 90,
    }
  })
  const [pastPerformance, setPastPerformance] = useState(() => {
    const existing = profile.pastPerformance as any
    const keyProjects = (existing?.keyProjects || []).map(
      (project: any, index: number) => ({
        ...project,
        id: project.id || `existing-${index}-${Date.now()}`,
      })
    )

    // Calculate initial values from existing projects
    const total = keyProjects.reduce((sum: number, project: any) => {
      const projectValue =
        typeof project.value === 'number'
          ? project.value
          : parseFloat(project.value) || 0
      return sum + projectValue
    }, 0)

    const formatTotalValue = () => {
      if (total === 0) return '$0'
      if (total >= 1000000000) return `$${(total / 1000000000).toFixed(1)}B`
      if (total >= 1000000) return `$${(total / 1000000).toFixed(1)}M`
      if (total >= 1000) return `$${(total / 1000).toFixed(0)}K`
      return `$${total.toLocaleString()}`
    }

    const calculateYears = () => {
      if (!profile.yearEstablished) return 'Not specified'
      const currentYear = new Date().getFullYear()
      const years = currentYear - profile.yearEstablished
      return years > 0 ? `${years} years` : 'Less than 1 year'
    }

    return {
      description: existing?.description || '',
      keyProjects,
      totalContractValue: existing?.totalContractValue || formatTotalValue(),
      yearsInBusiness: existing?.yearsInBusiness || calculateYears(),
    }
  })
  const [newProject, setNewProject] = useState({
    name: '',
    contractId: '',
    client: '',
    clientContactId: '',
    agency: '',
    value: 0,
    description: '',
    completionYear: new Date().getFullYear(),
    customerType: undefined as CustomerType | undefined,
    naicsCode: '',
    pscCode: '',
    contractType: '',
    setAsideType: '',
    securityClearanceRequired: '',
    performanceLocation: {
      city: '',
      state: '',
      country: 'United States',
      zipCode: '',
      isRemote: false,
    },
    primeContractor: true,
  })

  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [editProject, setEditProject] = useState({
    name: '',
    contractId: '',
    client: '',
    clientContactId: '',
    agency: '',
    value: 0,
    description: '',
    completionYear: new Date().getFullYear(),
    customerType: undefined as CustomerType | undefined,
    naicsCode: '',
    pscCode: '',
    contractType: '',
    setAsideType: '',
    securityClearanceRequired: '',
    performanceLocation: {
      city: '',
      state: '',
      country: 'United States',
      zipCode: '',
      isRemote: false,
    },
    primeContractor: true,
  })
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const {
    token: csrfToken,
    loading: csrfLoading,
    error: csrfError,
    addToHeaders,
  } = useCSRF()
  
  const { contacts } = useContactStore()
  const clearMatchScores = useOpportunitiesStore(state => state.clearMatchScores)

  // Auto-update calculated values when key projects change
  useEffect(() => {
    // Calculate total from current key projects
    const total = pastPerformance.keyProjects.reduce(
      (sum: number, project: any) => {
        const projectValue =
          typeof project.value === 'number'
            ? project.value
            : parseFloat(project.value) || 0
        return sum + projectValue
      },
      0
    )

    const newTotalValue = (() => {
      if (total === 0) return '$0'
      if (total >= 1000000000) return `$${(total / 1000000000).toFixed(1)}B`
      if (total >= 1000000) return `$${(total / 1000000).toFixed(1)}M`
      if (total >= 1000) return `$${(total / 1000).toFixed(0)}K`
      return `$${total.toLocaleString()}`
    })()

    const newYearsInBusiness = (() => {
      if (!profile.yearEstablished) return 'Not specified'
      const currentYear = new Date().getFullYear()
      const years = currentYear - profile.yearEstablished
      return years > 0 ? `${years} years` : 'Less than 1 year'
    })()

    // Only update if values have changed to avoid infinite loops
    if (
      pastPerformance.totalContractValue !== newTotalValue ||
      pastPerformance.yearsInBusiness !== newYearsInBusiness
    ) {
      setPastPerformance((prev) => ({
        ...prev,
        totalContractValue: newTotalValue,
        yearsInBusiness: newYearsInBusiness,
      }))
    }
  }, [
    pastPerformance.keyProjects,
    profile.yearEstablished,
    pastPerformance.totalContractValue,
    pastPerformance.yearsInBusiness,
  ])

  // Calculate total contract value from key projects
  const calculateTotalContractValue = () => {
    const total = pastPerformance.keyProjects.reduce(
      (sum: number, project: any) => {
        const projectValue =
          typeof project.value === 'number'
            ? project.value
            : parseFloat(project.value) || 0
        return sum + projectValue
      },
      0
    )

    if (total === 0) return '$0'
    if (total >= 1000000000) return `$${(total / 1000000000).toFixed(1)}B`
    if (total >= 1000000) return `$${(total / 1000000).toFixed(1)}M`
    if (total >= 1000) return `$${(total / 1000).toFixed(0)}K`
    return `$${total.toLocaleString()}`
  }

  // Calculate years in business from yearEstablished
  const calculateYearsInBusiness = () => {
    if (!profile.yearEstablished) return 'Not specified'
    const currentYear = new Date().getFullYear()
    const years = currentYear - profile.yearEstablished
    return years > 0 ? `${years} years` : 'Less than 1 year'
  }


  const handleAddProject = () => {
    if (newProject.name && newProject.client) {
      setPastPerformance((prev) => ({
        ...prev,
        keyProjects: [
          ...prev.keyProjects,
          {
            ...newProject,
            id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          },
        ],
      }))
      setNewProject({
        name: '',
        contractId: '',
        client: '',
        clientContactId: '',
        agency: '',
        value: 0,
        description: '',
        completionYear: new Date().getFullYear(),
        customerType: undefined as CustomerType | undefined,
        naicsCode: '',
        pscCode: '',
        contractType: '',
        setAsideType: '',
        securityClearanceRequired: '',
        performanceLocation: {
          city: '',
          state: '',
          country: 'United States',
          zipCode: '',
          isRemote: false,
        },
        primeContractor: true,
      })
      setShowAddProjectModal(false)
    }
  }

  const handleCancelAddProject = () => {
    setNewProject({
      name: '',
      contractId: '',
      client: '',
      clientContactId: '',
      agency: '',
      value: 0,
      description: '',
      completionYear: new Date().getFullYear(),
      customerType: undefined as CustomerType | undefined,
      naicsCode: '',
      pscCode: '',
      contractType: '',
      setAsideType: '',
      securityClearanceRequired: '',
      performanceLocation: {
        city: '',
        state: '',
        country: 'United States',
        zipCode: '',
        isRemote: false,
      },
      primeContractor: true,
    })
    setShowAddProjectModal(false)
  }

  const handleRemoveProject = (projectId: string) => {
    setPastPerformance((prev) => ({
      ...prev,
      keyProjects: prev.keyProjects.filter((p: any) => p.id !== projectId),
    }))
  }

  const handleEditProject = (project: any) => {
    // Convert city ID to city name for existing projects
    let cityName = project.performanceLocation?.city || ''
    if (cityName && project.performanceLocation?.state) {
      // Check if this looks like a city ID (format: STATE-XXXXX)
      const cityIdPattern = /^[A-Z]{2}-\d+$/
      if (cityIdPattern.test(cityName)) {
        // Find the actual city name from our locations data
        const states = locationsData.states
        const selectedState = states.find(
          (state) => state.id === project.performanceLocation.state
        )
        if (selectedState) {
          for (const county of selectedState.counties) {
            const city = county.cities.find((c) => c.id === cityName)
            if (city) {
              cityName = city.name.replace(/,.*$/, '').trim()
              break
            }
          }
        }
      }
    }

    setEditingProject(project.id)
    setEditProject({
      name: project.name || '',
      contractId: (project as any).contractId || '',
      client: project.client || '',
      clientContactId: (project as any).clientContactId || '',
      agency: project.agency || '',
      value:
        typeof project.value === 'number'
          ? project.value
          : parseFloat(project.value) || 0,
      description: project.description || '',
      completionYear:
        project.completedYear ||
        project.completionYear ||
        new Date().getFullYear(),
      customerType: project.customerType || undefined,
      naicsCode: project.naicsCode || '',
      pscCode: project.pscCode || '',
      contractType: project.contractType || '',
      setAsideType: project.setAsideType || '',
      securityClearanceRequired: project.securityClearanceRequired || '',
      performanceLocation: {
        city: cityName, // Use the converted city name
        state: project.performanceLocation?.state || '',
        country: project.performanceLocation?.country || 'United States',
        zipCode: project.performanceLocation?.zipCode || '',
        isRemote: project.performanceLocation?.isRemote || false,
      },
      primeContractor:
        project.primeContractor !== undefined ? project.primeContractor : true,
    })
  }

  const handleSaveEdit = () => {
    if (!editingProject) return

    setPastPerformance((prev) => ({
      ...prev,
      keyProjects: prev.keyProjects.map((p: any) =>
        p.id === editingProject
          ? {
              ...p,
              name: editProject.name,
              contractId: editProject.contractId,
              client: editProject.client,
              clientContactId: editProject.clientContactId,
              agency: editProject.agency,
              value:
                typeof editProject.value === 'number'
                  ? editProject.value
                  : parseFloat(editProject.value) || 0,
              description: editProject.description,
              completedYear:
                typeof editProject.completionYear === 'number'
                  ? editProject.completionYear
                  : parseInt(editProject.completionYear) ||
                    new Date().getFullYear(),
              customerType: editProject.customerType,
              naicsCode: editProject.naicsCode,
              pscCode: editProject.pscCode,
              contractType: editProject.contractType,
              setAsideType: editProject.setAsideType,
              securityClearanceRequired: editProject.securityClearanceRequired,
              performanceLocation: editProject.performanceLocation,
              primeContractor: editProject.primeContractor,
            }
          : p
      ),
    }))

    setEditingProject(null)
    setEditProject({
      name: '',
      contractId: '',
      client: '',
      clientContactId: '',
      agency: '',
      value: 0,
      description: '',
      completionYear: new Date().getFullYear(),
      customerType: undefined as CustomerType | undefined,
      naicsCode: '',
      pscCode: '',
      contractType: '',
      setAsideType: '',
      securityClearanceRequired: '',
      performanceLocation: {
        city: '',
        state: '',
        country: 'United States',
        zipCode: '',
        isRemote: false,
      },
      primeContractor: true,
    })
  }

  const handleCancelEdit = () => {
    setEditingProject(null)
    setEditProject({
      name: '',
      contractId: '',
      client: '',
      clientContactId: '',
      agency: '',
      value: 0,
      description: '',
      completionYear: new Date().getFullYear(),
      customerType: undefined as CustomerType | undefined,
      naicsCode: '',
      pscCode: '',
      contractType: '',
      setAsideType: '',
      securityClearanceRequired: '',
      performanceLocation: {
        city: '',
        state: '',
        country: 'United States',
        zipCode: '',
        isRemote: false,
      },
      primeContractor: true,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!csrfToken) {
      setError(
        'Security token not available. Please refresh the page and try again.'
      )
      return
    }

    setLoading(true)
    setError('')

    // Client-side validation with helpful messages
    if (coreCompetencies.length === 0) {
      setError(
        'Please add at least one core competency to describe what your company does.'
      )
      setLoading(false)
      return
    }

    if (coreCompetencies.length > 20) {
      setError('Please limit core competencies to 20 or fewer items.')
      setLoading(false)
      return
    }

    if (
      pastPerformance.description &&
      pastPerformance.description.length > 3000
    ) {
      setError('Company experience summary must be 3000 characters or less.')
      setLoading(false)
      return
    }

    if (
      pastPerformance.keyProjects &&
      pastPerformance.keyProjects.length > 15
    ) {
      setError('Please limit key projects to 15 or fewer.')
      setLoading(false)
      return
    }

    try {
      // Debug current state before submission
      console.log('ProfileCapabilitiesForm - Current state before submit:', {
        pastPerformanceDescription: pastPerformance.description,
        pastPerformanceDescriptionLength: pastPerformance.description?.length || 0,
        keyProjects: pastPerformance.keyProjects.map(p => ({
          id: p.id,
          name: p.name,
          hasDescription: !!p.description,
          descriptionLength: p.description?.length || 0
        }))
      })

      const requestBody = {
        coreCompetencies,
        securityClearance: securityClearance || undefined,
        // Brand voice and communication preferences moved to settings tab
        // Government level preferences
        governmentLevels:
          governmentLevels.length > 0 ? governmentLevels : undefined,
        // Geographic preferences
        geographicPreferences: geographicPreferences,
        pastPerformance: {
          description: pastPerformance.description,
          keyProjects: pastPerformance.keyProjects.map((project: any) => ({
            ...project,
            value:
              typeof project.value === 'number'
                ? project.value
                : parseFloat(project.value) || 0,
            completedYear:
              project.completedYear || project.completionYear
                ? parseInt(project.completedYear || project.completionYear) ||
                  new Date().getFullYear()
                : new Date().getFullYear(),
          })),
          // Include calculated values for database storage and scoring
          totalContractValue: pastPerformance.totalContractValue,
          yearsInBusiness: pastPerformance.yearsInBusiness,
        },
      }

      console.log('ProfileCapabilitiesForm - Submitting data:', {
        totalContractValue: requestBody.pastPerformance.totalContractValue,
        yearsInBusiness: requestBody.pastPerformance.yearsInBusiness,
        description: requestBody.pastPerformance.description,
        descriptionLength: requestBody.pastPerformance.description?.length || 0,
        keyProjectsCount: requestBody.pastPerformance.keyProjects.length,
        keyProjectsWithDescriptions: requestBody.pastPerformance.keyProjects.map(p => ({
          id: p.id,
          name: p.name,
          hasDescription: !!p.description,
          descriptionLength: p.description?.length || 0,
          description: p.description?.substring(0, 100) + '...'
        })),
        competencyDetailsCount: requestBody.competencyDetails?.length || 0,
        coreCompetenciesCount: requestBody.coreCompetencies?.length || 0,
      })

      const response = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: addToHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success) {
        // Clear match scores cache since profile has been updated
        console.log('🔄 Profile updated successfully, clearing match scores cache...')
        clearMatchScores()
        
        onUpdate(data.data)
        onComplete()
      } else {
        // Handle validation errors with specific field feedback
        if (data.code === 'VALIDATION_ERROR' && data.details) {
          const errorMessages = data.details.map((detail: any) => {
            if (detail.field?.includes('description')) {
              return `Description is too long (max ${detail.field.includes('keyProjects') ? '2000' : '3000'} characters)`
            }
            if (detail.field?.includes('title')) {
              return `Project title is too long (max 200 characters)`
            }
            return detail.message || 'Invalid input'
          })
          setError(errorMessages.join('. '))
        } else {
          setError(data.error || 'Failed to update capabilities')
        }
      }
    } catch (err) {
      console.error('Profile update error:', err)
      setError(
        'Failed to update capabilities. Please check your internet connection and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {(error || csrfError) && (
        <Alert variant="destructive">
          <AlertDescription>{error || csrfError}</AlertDescription>
        </Alert>
      )}

      {/* Core Competencies Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Target className="h-5 w-5" />
            Core Competencies
          </CardTitle>
          <CardDescription>
            Select the PSC codes that represent your company's core competencies and service offerings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <PSCLabelWithInfo selectedValue={coreCompetencies}>
              PSC Codes (Core Competencies)
            </PSCLabelWithInfo>
            <PSCSelector
              value={coreCompetencies}
              onChange={setCoreCompetencies}
              multiple={true}
              placeholder="Select your core competency PSC codes..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Clearance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Shield className="h-5 w-5" />
            Security Clearance Level
          </CardTitle>
          <CardDescription>
            Specify your company&apos;s security clearance level for government
            contracts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <SecurityClearanceLabelWithInfo selectedValue={securityClearance as SecurityClearanceLevel}>
                Security Clearance Level
              </SecurityClearanceLabelWithInfo>
              <SecurityClearanceSelector
                value={securityClearance as SecurityClearanceLevel}
                onChange={(clearance) => setSecurityClearance(clearance as string)}
                placeholder="Select your security clearance level"
                multiple={false}
                className="w-full"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Government Contracting Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Target className="h-5 w-5" />
            Government Contracting Preferences
          </CardTitle>
          <CardDescription>
            Define your target government markets and geographic preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Government Levels */}
            <div className="space-y-2">
              <Label htmlFor="governmentLevels">Target Government Levels</Label>
              <div className="grid gap-2">
                {GOVERNMENT_LEVEL_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={governmentLevels.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGovernmentLevels([
                            ...governmentLevels,
                            option.value,
                          ])
                        } else {
                          setGovernmentLevels(
                            governmentLevels.filter(
                              (level) => level !== option.value
                            )
                          )
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <span>{option.emoji}</span>
                        <span>{option.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                      {option.examples && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Examples: {option.examples.join(', ')}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select which levels of government your company targets for
                contracts
              </p>
            </div>

            {/* Geographic Preferences */}
            <div className="space-y-4 border-t pt-6">
              <SimpleGeographicPreferencesForm
                value={geographicPreferences}
                onChange={setGeographicPreferences}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Past Performance Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-5 w-5" />
            Past Performance Overview
          </CardTitle>
          <CardDescription>
            Provide an overview of your company&apos;s track record and
            experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="totalContractValue">Total Contract Value</Label>
                <Input
                  id="totalContractValue"
                  value={calculateTotalContractValue()}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Automatically calculated from key projects below
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsInBusiness">Years in Business</Label>
                <Input
                  id="yearsInBusiness"
                  value={calculateYearsInBusiness()}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Calculated from year established:{' '}
                  {profile.yearEstablished || 'Not set'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="performanceDescription">
                Company Experience Summary
              </Label>
              <PlateEditor
                id="company-experience-editor"
                content={pastPerformance.description}
                onChange={(value) => {
                  console.log('🏢 Company experience description onChange:', {
                    valueLength: value?.length || 0,
                    value: value?.substring(0, 100) + (value?.length > 100 ? '...' : ''),
                    hasContent: Boolean(value?.trim())
                  })
                  setPastPerformance((prev) => {
                    const updated = {
                      ...prev,
                      description: value,
                    }
                    console.log('🏢 Updated pastPerformance state:', {
                      descriptionLength: updated.description?.length || 0,
                      hasDescription: Boolean(updated.description?.trim())
                    })
                    return updated
                  })
                }}
                placeholder="Briefly describe your company's experience and track record..."
                minHeight="150px"
                className="company-experience-editor"
              />
              <div className="text-xs text-muted-foreground">
                Describe your company&apos;s relevant experience and
                capabilities
              </div>
            </div>
            
            {/* Generate with AI Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button 
                type="button"
                variant="outline" 
                disabled={true}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Key Projects Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-5 w-5" />
            Key Projects
          </CardTitle>
          <CardDescription>
            Add your most significant projects to showcase your capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Existing Projects */}
            {pastPerformance.keyProjects &&
              pastPerformance.keyProjects.length > 0 && (
                <div className="space-y-3">
                  {pastPerformance.keyProjects
                    .sort((a: any, b: any) => {
                      const yearA = a.completedYear || a.completionYear || 0;
                      const yearB = b.completedYear || b.completionYear || 0;
                      return yearB - yearA; // Most recent first
                    })
                    .map((project: any) => (
                    <div key={project.id}>
                      {editingProject === project.id ? (
                        /* Edit Mode */
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Project Name</Label>
                              <Input
                                value={editProject.name}
                                onChange={(e) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }))
                                }
                                placeholder="Project title"
                                maxLength={200}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Contract ID</Label>
                              <Input
                                value={editProject.contractId}
                                onChange={(e) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    contractId: e.target.value,
                                  }))
                                }
                                placeholder="Contract number or ID (optional)"
                                maxLength={100}
                              />
                              <p className="text-xs text-muted-foreground">
                                Government contract identifier for tracking
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <ContactLabelWithInfo selectedValue={editProject.clientContactId}>
                                Client Contact
                              </ContactLabelWithInfo>
                              <ContactSelect
                                value={editProject.clientContactId}
                                onChange={(contactId) => {
                                  const selectedContact = contactId ? contacts.find(c => c.id === contactId) : null
                                  setEditProject((prev) => ({
                                    ...prev,
                                    clientContactId: contactId as string,
                                    client: selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : '',
                                  }))
                                }}
                                placeholder="Select or search for client contact"
                                multiple={false}
                                showProfileImages={true}
                              />
                              <Input
                                value={editProject.client}
                                onChange={(e) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    client: e.target.value,
                                    clientContactId: '', // Clear contact selection when manually typing
                                  }))
                                }
                                placeholder="Or type client name manually"
                                className="mt-2"
                                maxLength={200}
                              />
                              <p className="text-xs text-muted-foreground">
                                Select from contacts or enter manually
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Contract Value (USD)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="1000"
                                value={editProject.value}
                                onChange={(e) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    value: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                placeholder="500000"
                              />
                              <p className="text-xs text-muted-foreground">
                                Enter dollar amount (e.g., 500000 for $500K)
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Completion Year</Label>
                              <YearPicker
                                value={editProject.completionYear}
                                onChange={(year) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    completionYear: year,
                                  }))
                                }
                                fromYear={1990}
                                toYear={new Date().getFullYear()}
                                placeholder="Select completion year"
                              />
                              <p className="text-xs text-muted-foreground">
                                Project must be completed (no future dates)
                              </p>
                            </div>
                          </div>

                          {/* Government Agency and Customer Type */}
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <AgencyLabelWithInfo selectedValue={editProject.agency}>Government Agency</AgencyLabelWithInfo>
                              <AgencySelector
                                value={editProject.agency}
                                onChange={(agencyCode) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    agency: agencyCode,
                                  }))
                                }
                                placeholder="Select the government agency"
                                onlyContractingAgencies={true}
                                showBusinessAreas={false}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Customer Type</Label>
                              <Select
                                value={editProject.customerType}
                                onValueChange={(value) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    customerType: value as CustomerType,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select customer type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CUSTOMER_TYPE_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>{option.emoji}</span>
                                        <span>{option.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* NAICS and PSC Codes */}
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <NAICSLabelWithInfo selectedValue={editProject.naicsCode}>NAICS Code</NAICSLabelWithInfo>
                              <SimpleNAICSInput
                                value={editProject.naicsCode}
                                onChange={(code) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    naicsCode: code,
                                  }))
                                }
                                placeholder="Enter NAICS code or search..."
                              />
                              <p className="text-xs text-muted-foreground">
                                Industry classification for this project
                              </p>
                            </div>
                            <div className="space-y-2">
                              <PSCLabelWithInfo selectedValue={editProject.pscCode}>
                                PSC Code
                              </PSCLabelWithInfo>
                              <PSCSelector
                                value={editProject.pscCode}
                                onChange={(pscCode) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    pscCode,
                                  }))
                                }
                                placeholder="Select PSC code (optional)"
                              />
                            </div>
                          </div>

                          {/* Contract Details */}
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Contract Type</Label>
                              <Select
                                value={editProject.contractType}
                                onValueChange={(value) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    contractType: value,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select contract type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(CONTRACT_TYPE_LABELS)
                                    .sort(([, a], [, b]) => a.localeCompare(b))
                                    .map(([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Type of contract (optional)
                              </p>
                            </div>
                            <div className="space-y-2">
                              <SetAsideLabelWithInfo selectedValue={editProject.setAsideType}>Set-Aside Type</SetAsideLabelWithInfo>
                              <SetAsideSelector
                                value={editProject.setAsideType}
                                onChange={(setAsideCode) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    setAsideType: setAsideCode,
                                  }))
                                }
                                placeholder="Select set-aside type (optional)"
                                allowClear={true}
                              />
                              <p className="text-xs text-muted-foreground">
                                Contract set-aside classification for eligibility
                              </p>
                            </div>
                          </div>

                          {/* Security Clearance Required */}
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <SecurityClearanceLabelWithInfo selectedValue={editProject.securityClearanceRequired as SecurityClearanceLevel}>
                                Security Clearance Required
                              </SecurityClearanceLabelWithInfo>
                              <SecurityClearanceSelector
                                value={editProject.securityClearanceRequired as SecurityClearanceLevel}
                                onChange={(clearance) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    securityClearanceRequired: clearance as string,
                                  }))
                                }
                                placeholder="Select required clearance level"
                                multiple={false}
                                className="w-full"
                              />
                              <p className="text-xs text-muted-foreground">
                                Clearance level required for this project
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                              <input
                                type="checkbox"
                                id="edit-primeContractor"
                                checked={editProject.primeContractor}
                                onChange={(e) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    primeContractor: e.target.checked,
                                  }))
                                }
                              />
                              <label
                                htmlFor="edit-primeContractor"
                                className="text-sm"
                              >
                                Prime Contractor
                              </label>
                            </div>
                          </div>

                          {/* Performance Location */}
                          <div className="space-y-4">
                            <SeparateLocationLabelWithInfo selectedValue={{
                              state: editProject.performanceLocation.state,
                              city: editProject.performanceLocation.city,
                              zipCode: editProject.performanceLocation.zipCode,
                            }}>Performance Location</SeparateLocationLabelWithInfo>
                            <SeparateLocationSelector
                              value={{
                                state: editProject.performanceLocation.state,
                                city: editProject.performanceLocation.city,
                                zipCode:
                                  editProject.performanceLocation.zipCode,
                              }}
                              onChange={(location) =>
                                setEditProject((prev) => ({
                                  ...prev,
                                  performanceLocation: {
                                    ...prev.performanceLocation,
                                    state: location.state || '',
                                    city: location.city || '',
                                    zipCode: location.zipCode || '',
                                  },
                                }))
                              }
                            />
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="edit-isRemote"
                                checked={
                                  editProject.performanceLocation.isRemote
                                }
                                onChange={(e) =>
                                  setEditProject((prev) => ({
                                    ...prev,
                                    performanceLocation: {
                                      ...prev.performanceLocation,
                                      isRemote: e.target.checked,
                                    },
                                  }))
                                }
                              />
                              <label
                                htmlFor="edit-isRemote"
                                className="text-sm"
                              >
                                Work was performed remotely
                              </label>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Project Description</Label>
                            <PlateEditor
                              id={`edit-project-${project.id}-description`}
                              content={editProject.description}
                              onChange={(value) => {
                                console.log('📝 Edit project description onChange:', {
                                  projectId: project.id,
                                  valueLength: value?.length || 0,
                                  value: value?.substring(0, 100) + (value?.length > 100 ? '...' : ''),
                                  hasContent: Boolean(value?.trim())
                                })
                                setEditProject((prev) => {
                                  const updated = {
                                    ...prev,
                                    description: value,
                                  }
                                  console.log('📝 Updated editProject state:', {
                                    projectId: updated.id,
                                    descriptionLength: updated.description?.length || 0,
                                    hasDescription: Boolean(updated.description?.trim())
                                  })
                                  return updated
                                })
                              }}
                              placeholder="Describe the project, your role, and key achievements..."
                              minHeight="120px"
                              className="edit-project-description-editor"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={handleSaveEdit}
                              size="sm"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCancelEdit}
                              size="sm"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* View Mode - Card-Based Project Display */
                        <div className="bg-gradient-to-r from-muted/30 to-muted/50 border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow dark:from-muted/20 dark:to-muted/40">
                          {/* Project Header with Gradient Background */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                                  Project #{getProjectIndex(project.id, pastPerformance.keyProjects)}
                                </div>
                                <h3 className="text-xl font-bold text-foreground">{project.name || 'Unnamed Project'}</h3>
                                {(project as any).contractId && (
                                  <Badge className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 border-gray-200 font-mono text-xs">
                                    Contract {(project as any).contractId}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="hover:bg-white/60"
                                onClick={() => handleEditProject(project)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="hover:bg-red-100 hover:text-red-600"
                                onClick={() => handleRemoveProject(project.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Key Metrics Row */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-card/50 border border-border rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <div className="bg-green-500/10 p-2 rounded-lg">
                                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Contract Value</p>
                                  <p className="font-bold text-green-600 dark:text-green-400">{formatProjectValue(project.value)}</p>
                                </div>
                              </div>
                            </div>
                            
                            {project.client && (
                              <div className="bg-card/50 border border-border rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                  <div className="bg-blue-500/10 p-2 rounded-lg">
                                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">Client</p>
                                    <p className="font-semibold text-foreground truncate">{project.client}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {(project.completedYear || project.completionYear) && (
                              <div className="bg-card/50 border border-border rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                  <div className="bg-purple-500/10 p-2 rounded-lg">
                                    <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Completed</p>
                                    <p className="font-semibold text-purple-600 dark:text-purple-400">{project.completedYear || project.completionYear}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {project.primeContractor !== undefined && (
                              <div className="bg-card/50 border border-border rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                  <div className={`p-2 rounded-lg ${project.primeContractor ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`}>
                                    <Award className={`h-4 w-4 ${project.primeContractor ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`} />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Role</p>
                                    <p className={`font-semibold ${project.primeContractor ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                      {project.primeContractor ? "Prime Contractor" : "Subcontractor"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Contract Details Tags */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {project.agency && (
                              <Badge className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 border-blue-200 font-medium">
                                <Building className="h-3 w-3" />
                                {project.agency}
                              </Badge>
                            )}
                            {project.performanceLocation?.state && (
                              <Badge className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 border-purple-200 font-medium">
                                <MapPin className="h-3 w-3" />
                                {project.performanceLocation.city ? 
                                  `${project.performanceLocation.city}, ${project.performanceLocation.state}` :
                                  project.performanceLocation.state
                                }
                              </Badge>
                            )}
                            {project.naicsCode && (
                              <Badge className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground border-muted font-mono">
                                NAICS {project.naicsCode}
                              </Badge>
                            )}
                            {project.pscCode && (
                              <Badge className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 border-indigo-200 font-medium">
                                PSC {project.pscCode}
                              </Badge>
                            )}
                            {project.contractType && (
                              <Badge className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 border-gray-200 font-medium">
                                <Clock className="h-3 w-3" />
                                {CONTRACT_TYPE_LABELS[project.contractType as keyof typeof CONTRACT_TYPE_LABELS] || project.contractType}
                              </Badge>
                            )}
                            {project.setAsideType && (
                              <Badge className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border-yellow-200 font-medium">
                                <Award className="h-3 w-3" />
                                {project.setAsideType}
                              </Badge>
                            )}
                            {project.securityClearanceRequired && project.securityClearanceRequired !== 'None' && project.securityClearanceRequired !== 'Not Required' && (
                              <Badge className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 border-red-200 font-medium">
                                <Shield className="h-3 w-3" />
                                {project.securityClearanceRequired}
                              </Badge>
                            )}
                            {project.customerSatisfactionRating && (
                              <Badge className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border-amber-200 font-medium">
                                <Star className="h-3 w-3 fill-current" />
                                {project.customerSatisfactionRating}/5 Rating
                              </Badge>
                            )}
                          </div>

                          {/* Project Description */}
                          {project.description && (
                            <div className="mb-4">
                              <div
                                className="text-sm text-muted-foreground leading-relaxed"
                                dangerouslySetInnerHTML={{
                                  __html: project.description
                                    .replace(
                                      /\*\*(.*?)\*\*/g,
                                      '<strong class="font-semibold text-foreground">$1</strong>'
                                    )
                                    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                    .replace(/\n/g, '<br>'),
                                }}
                              />
                            </div>
                          )}

                          {/* Key Achievements */}
                          {project.keyAchievements && project.keyAchievements.length > 0 && (
                            <div className="bg-card/50 border border-border rounded-lg p-4 mb-4">
                              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <div className="bg-green-500/10 p-1.5 rounded-lg">
                                  <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                Key Achievements
                              </h4>
                              <ul className="space-y-2">
                                {project.keyAchievements.map((achievement, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                    {achievement}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Technologies Used */}
                          {project.technologiesUsed && project.technologiesUsed.length > 0 && (
                            <div className="bg-card/50 border border-border rounded-lg p-4 mb-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Technologies & Tools</h4>
                              <div className="flex flex-wrap gap-2">
                                {project.technologiesUsed.map((tech, index) => (
                                  <span key={index} className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Additional Details Footer */}
                          {(project.teamSize || project.contractDuration) && (
                            <div className="flex flex-wrap gap-6 text-sm text-gray-600 pt-4 border-t border-gray-200">
                              {project.teamSize && (
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-400" />
                                  <span>Team Size: <span className="font-medium text-gray-900">{project.teamSize}</span></span>
                                </div>
                              )}
                              {project.contractDuration && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span>Duration: <span className="font-medium text-gray-900">{project.contractDuration}</span></span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {/* Add New Project Button */}
            <div className="flex justify-center pt-4">
              <Dialog
                open={showAddProjectModal}
                onOpenChange={setShowAddProjectModal}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Key Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Add Key Project</DialogTitle>
                    <DialogDescription>
                      Add a significant project to showcase your company&apos;s
                      capabilities and experience.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto">
                    <div className="space-y-4 py-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="modal-projectName">Project Name</Label>
                        <Input
                          id="modal-projectName"
                          value={newProject.name}
                          onChange={(e) =>
                            setNewProject((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Project title"
                          maxLength={200}
                        />
                        <div className="text-xs text-muted-foreground">
                          {newProject.name.length}/200 characters
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="modal-contractId">Contract ID</Label>
                        <Input
                          id="modal-contractId"
                          value={newProject.contractId}
                          onChange={(e) =>
                            setNewProject((prev) => ({
                              ...prev,
                              contractId: e.target.value,
                            }))
                          }
                          placeholder="Contract number or ID (optional)"
                          maxLength={100}
                        />
                        <p className="text-xs text-muted-foreground">
                          Government contract identifier for tracking
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <ContactLabelWithInfo selectedValue={newProject.clientContactId}>
                          Client Contact
                        </ContactLabelWithInfo>
                        <ContactSelect
                          value={newProject.clientContactId}
                          onChange={(contactId) => {
                            const selectedContact = contactId ? contacts.find(c => c.id === contactId) : null
                            setNewProject((prev) => ({
                              ...prev,
                              clientContactId: contactId as string,
                              client: selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : '',
                            }))
                          }}
                          placeholder="Select or search for client contact"
                          multiple={false}
                          showProfileImages={true}
                        />
                        <Input
                          value={newProject.client}
                          onChange={(e) =>
                            setNewProject((prev) => ({
                              ...prev,
                              client: e.target.value,
                              clientContactId: '', // Clear contact selection when manually typing
                            }))
                          }
                          placeholder="Or type client name manually"
                          className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          Select from contacts or enter manually
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="modal-projectValue">
                          Contract Value (USD)
                        </Label>
                        <Input
                          id="modal-projectValue"
                          type="number"
                          min="0"
                          step="1000"
                          value={newProject.value}
                          onChange={(e) =>
                            setNewProject((prev) => ({
                              ...prev,
                              value: parseFloat(e.target.value) || 0,
                            }))
                          }
                          placeholder="500000"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter dollar amount (e.g., 500000 for $500K)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="modal-completionYear">
                          Completion Year
                        </Label>
                        <YearPicker
                          value={newProject.completionYear}
                          onChange={(year) =>
                            setNewProject((prev) => ({
                              ...prev,
                              completionYear: year,
                            }))
                          }
                          fromYear={1990}
                          toYear={new Date().getFullYear()}
                          placeholder="Select completion year"
                        />
                        <p className="text-xs text-muted-foreground">
                          Project must be completed (no future dates)
                        </p>
                      </div>
                    </div>

                    {/* Government Agency and Customer Type */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <AgencyLabelWithInfo selectedValue={newProject.agency}>Government Agency</AgencyLabelWithInfo>
                        <AgencySelector
                          value={newProject.agency}
                          onChange={(agencyCode) =>
                            setNewProject((prev) => ({
                              ...prev,
                              agency: agencyCode,
                            }))
                          }
                          placeholder="Select the government agency"
                          onlyContractingAgencies={true}
                          showBusinessAreas={false}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="modal-customerType">
                          Customer Type
                        </Label>
                        <Select
                          value={newProject.customerType}
                          onValueChange={(value) =>
                            setNewProject((prev) => ({
                              ...prev,
                              customerType: value as CustomerType,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer type" />
                          </SelectTrigger>
                          <SelectContent>
                            {CUSTOMER_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{option.emoji}</span>
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* NAICS and PSC Codes */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <NAICSLabelWithInfo htmlFor="modal-naicsCode" selectedValue={newProject.naicsCode}>NAICS Code</NAICSLabelWithInfo>
                        <SimpleNAICSInput
                          value={newProject.naicsCode}
                          onChange={(code) =>
                            setNewProject((prev) => ({
                              ...prev,
                              naicsCode: code,
                            }))
                          }
                          placeholder="Enter NAICS code or search..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Industry classification for this project
                        </p>
                      </div>
                      <div className="space-y-2">
                        <PSCLabelWithInfo 
                          htmlFor="modal-pscCode"
                          selectedValue={newProject.pscCode}
                        >
                          PSC Code
                        </PSCLabelWithInfo>
                        <PSCSelector
                          value={newProject.pscCode}
                          onChange={(pscCode) =>
                            setNewProject((prev) => ({
                              ...prev,
                              pscCode,
                            }))
                          }
                          placeholder="Select PSC code (optional)"
                        />
                        <p className="text-xs text-muted-foreground">
                          Product Service Code for contract classification
                        </p>
                      </div>
                    </div>

                    {/* Contract Details */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="modal-contractType">
                          Contract Type
                        </Label>
                        <Select
                          value={newProject.contractType}
                          onValueChange={(value) =>
                            setNewProject((prev) => ({
                              ...prev,
                              contractType: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select contract type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CONTRACT_TYPE_LABELS)
                              .sort(([, a], [, b]) => a.localeCompare(b))
                              .map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Type of contract (optional)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <SetAsideLabelWithInfo htmlFor="modal-setAsideType" selectedValue={newProject.setAsideType}>
                          Set-Aside Type
                        </SetAsideLabelWithInfo>
                        <SetAsideSelector
                          value={newProject.setAsideType}
                          onChange={(setAsideCode) =>
                            setNewProject((prev) => ({
                              ...prev,
                              setAsideType: setAsideCode,
                            }))
                          }
                          placeholder="Select set-aside type (optional)"
                          allowClear={true}
                        />
                        <p className="text-xs text-muted-foreground">
                          Contract set-aside classification for eligibility
                        </p>
                      </div>
                    </div>

                    {/* Performance Location */}
                    <div className="space-y-4">
                      <SeparateLocationLabelWithInfo selectedValue={{
                        state: newProject.performanceLocation.state,
                        city: newProject.performanceLocation.city,
                        zipCode: newProject.performanceLocation.zipCode,
                      }}>Performance Location</SeparateLocationLabelWithInfo>
                      <SeparateLocationSelector
                        value={{
                          state: newProject.performanceLocation.state,
                          city: newProject.performanceLocation.city,
                          zipCode: newProject.performanceLocation.zipCode,
                        }}
                        onChange={(location) =>
                          setNewProject((prev) => ({
                            ...prev,
                            performanceLocation: {
                              ...prev.performanceLocation,
                              state: location.state || '',
                              city: location.city || '',
                              zipCode: location.zipCode || '',
                            },
                          }))
                        }
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="modal-isRemote"
                          checked={newProject.performanceLocation.isRemote}
                          onChange={(e) =>
                            setNewProject((prev) => ({
                              ...prev,
                              performanceLocation: {
                                ...prev.performanceLocation,
                                isRemote: e.target.checked,
                              },
                            }))
                          }
                        />
                        <label htmlFor="modal-isRemote" className="text-sm">
                          Work was performed remotely
                        </label>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="modal-primeContractor"
                          checked={newProject.primeContractor}
                          onChange={(e) =>
                            setNewProject((prev) => ({
                              ...prev,
                              primeContractor: e.target.checked,
                            }))
                          }
                        />
                        <label
                          htmlFor="modal-primeContractor"
                          className="text-sm"
                        >
                          Prime Contractor
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="modal-projectDescription">
                        Project Description
                      </Label>
                      <PlateEditor
                        id="new-project-description-editor"
                        content={newProject.description}
                        onChange={(value) => {
                          console.log('➕ New project description onChange:', {
                            valueLength: value?.length || 0,
                            value: value?.substring(0, 100) + (value?.length > 100 ? '...' : ''),
                            hasContent: Boolean(value?.trim())
                          })
                          setNewProject((prev) => {
                            const updated = {
                              ...prev,
                              description: value,
                            }
                            console.log('➕ Updated newProject state:', {
                              descriptionLength: updated.description?.length || 0,
                              hasDescription: Boolean(updated.description?.trim())
                            })
                            return updated
                          })
                        }}
                        placeholder="Brief description of the project and your role..."
                        minHeight="120px"
                        className="new-project-description-editor"
                      />
                      <div className="text-xs text-muted-foreground">
                        Describe the project scope, your role, and key
                        achievements
                      </div>
                    </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelAddProject}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddProject}
                      disabled={!newProject.name || !newProject.client}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Project
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Information */}
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips for better matching:</strong> Include specific
          technologies, methodologies, and industry experience. Government
          agencies often look for contractors with proven experience in similar
          projects and domains.
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <form onSubmit={handleSubmit}>
        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            disabled={
              loading ||
              coreCompetencies.length === 0 ||
              csrfLoading ||
              !csrfToken
            }
            className={
              coreCompetencies.length === 0 || csrfLoading || !csrfToken
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }
          >
            <Save className="h-4 w-4 mr-2" />
            {loading
              ? 'Saving...'
              : csrfLoading
                ? 'Loading...'
                : 'Save Capabilities'}
          </Button>
          <Button type="button" variant="outline" onClick={onComplete}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
