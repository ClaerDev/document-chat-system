'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Award, Save, X, Info, Shield } from 'lucide-react'
import { Profile } from '@/types'
import { useZodForm } from '@/hooks/useZodForm'
import { SimpleCertificationFormSchema } from '@/lib/validations/simple-certification-form'
import { useCSRF } from '@/hooks/useCSRF'
import { SetAsideSelector } from '@/components/set-aside/SetAsideSelector'
import { useCertifications } from '@/hooks/use-certifications'
import { useInitializeStore } from '@/stores/profile-store'
import { CertificationsTable, CertificationModal } from '@/components/certifications'

interface ProfileCertificationFormProps {
  profile: Profile
  onUpdate: (profile: Profile) => void
  onComplete: () => void
}


// Legacy constants removed - using comprehensive certification system

export function ProfileCertificationForm({
  profile,
  onUpdate,
  onComplete,
}: ProfileCertificationFormProps) {
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [certificationModal, setCertificationModal] = useState<{
    isOpen: boolean
    mode: 'create' | 'edit' | 'view'
    certificationId?: string
  }>({
    isOpen: false,
    mode: 'create',
  })
  const {
    token: csrfToken,
    error: csrfError,
    addToHeaders,
  } = useCSRF()

  // Get certifications data
  const { stats: certStats, hasAnyCertifications } = useCertifications()
  
  // Store management
  const storeInitialize = useInitializeStore()

  const form = useZodForm({
    schema: SimpleCertificationFormSchema,
    defaultValues: {
      // Only set-asides - simplified structure
      selectedSetAsides:
        ((profile.certifications as any)?.setAsides as string[]) || [],
    },
  })

  // Update form when profile changes (prevents reverting to old values)
  useEffect(() => {
    const currentSetAsides = ((profile.certifications as any)?.setAsides as string[]) || []
    const formCurrentValue = form.getValues('selectedSetAsides')
    
    console.log('🔍 Profile changed!')
    console.log('🔍 Profile setAsides:', currentSetAsides)
    console.log('🔍 Form current value:', formCurrentValue)
    console.log('🔍 Profile ID:', profile.id)
    console.log('🔍 Profile updatedAt:', profile.updatedAt)
    
    // Only reset if the values are actually different
    if (JSON.stringify(currentSetAsides) !== JSON.stringify(formCurrentValue)) {
      console.log('🔍 Values differ, resetting form')
      form.reset({
        selectedSetAsides: currentSetAsides,
      })
    } else {
      console.log('🔍 Values are the same, not resetting form')
    }
  }, [profile, form])

  // Auto-save function for set-asides
  const autoSaveSetAsides = useCallback(async (setAsides: string[]) => {
    if (!csrfToken) return

    setAutoSaveStatus('saving')
    setApiError('')

    try {
      // Get existing certifications
      const existingCertifications = (() => {
        const certs = profile.certifications as any
        if (!certs) return []
        
        if (Array.isArray(certs.certifications)) {
          return certs.certifications
        } else if (Array.isArray(certs)) {
          return certs
        } else {
          const arrays = Object.values(certs).filter(val => Array.isArray(val))
          return arrays.length > 0 ? arrays[0] as any[] : []
        }
      })()

      console.log('🔄 Auto-saving set-asides:', setAsides)
      console.log('🔄 Preserving certifications:', existingCertifications.length)

      const response = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: addToHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          certifications: {
            certifications: existingCertifications,
            setAsides: setAsides,
          },
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ Auto-save successful')
        
        // Update both local state and store
        onUpdate(result.data)
        storeInitialize({ profile: result.data })
        
        setAutoSaveStatus('saved')
        
        // Clear saved status after 2 seconds
        setTimeout(() => {
          setAutoSaveStatus('idle')
        }, 2000)
      } else {
        console.error('❌ Auto-save failed:', result.error)
        setAutoSaveStatus('error')
        setTimeout(() => {
          setAutoSaveStatus('idle')
        }, 3000)
      }
    } catch (error) {
      console.error('❌ Auto-save error:', error)
      setAutoSaveStatus('error')
      setTimeout(() => {
        setAutoSaveStatus('idle')
      }, 3000)
    } finally {
      // Auto-save cleanup if needed
    }
  }, [profile.certifications, csrfToken, addToHeaders, onUpdate, storeInitialize])

  // Watch for set-asides changes and auto-save
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'selectedSetAsides' && value.selectedSetAsides) {
        // Debounce auto-save by 500ms to avoid excessive API calls
        const timeoutId = setTimeout(() => {
          autoSaveSetAsides(value.selectedSetAsides || [])
        }, 500)

        return () => clearTimeout(timeoutId)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, autoSaveSetAsides])

  // Legacy handleSubmit removed - using auto-save now

  // Modal handlers for comprehensive certifications
  const handleCreateCertification = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setCertificationModal({
      isOpen: true,
      mode: 'create',
    })
  }

  const handleEditCertification = (certificationId: string, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setCertificationModal({
      isOpen: true,
      mode: 'edit',
      certificationId,
    })
  }

  const handleViewCertification = (certificationId: string, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setCertificationModal({
      isOpen: true,
      mode: 'view',
      certificationId,
    })
  }

  const handleCloseCertificationModal = () => {
    setCertificationModal({
      isOpen: false,
      mode: 'create',
    })
  }

  // Legacy form helpers removed - using comprehensive certification system

  return (
    <div className="space-y-6">
      {(apiError || csrfError) && (
        <Alert variant="destructive">
          <AlertDescription>{apiError || csrfError}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

    {/* Certifications Management - Separate Card */}
    <CertificationsTable
      onCreateCertification={handleCreateCertification}
      onEditCertification={handleEditCertification}
      onViewCertification={handleViewCertification}
    />

    {/* Set-Aside Selector - Separate Card */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Shield className="h-5 w-5" />
          Set-Asides Programs
        </CardTitle>
        <CardDescription>
          Select all set-aside programs your company is certified for or eligible to participate in
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SetAsideSelector
          value={form.watch('selectedSetAsides') || []}
          onChange={(value) =>
            form.setValue(
              'selectedSetAsides',
              Array.isArray(value) ? value : [value],
              { shouldValidate: true }
            )
          }
          multiple={true}
          placeholder="Search and select set-aside programs..."
          className="w-full"
          allowClear={true}
        />
      </CardContent>
    </Card>

    {/* Actions */}
    <div className="flex gap-4 pt-4">
      <Button type="button" onClick={onComplete}>
        Done
      </Button>
    </div>

    {/* Comprehensive Certification Modal */}
    <CertificationModal
      isOpen={certificationModal.isOpen}
      onClose={handleCloseCertificationModal}
      mode={certificationModal.mode}
      certificationId={certificationModal.certificationId}
    />
    </div>
  )
}
