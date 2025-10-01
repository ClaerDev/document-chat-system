'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Save, X, Info, Building } from 'lucide-react'
import { Profile } from '@/types'
import { useCSRF } from '@/hooks/useCSRF'
import { SimpleNAICSInput } from '@/components/naics/SimpleNAICSInput'
import { findNAICSByCode, formatNAICSCode } from '@/lib/naics'

interface ProfileNaicsFormProps {
  profile: Profile
  onUpdate: (profile: Profile) => void
  onComplete: () => void
}


export function ProfileNaicsForm({ profile, onUpdate, onComplete }: ProfileNaicsFormProps) {
  const [primaryNaics, setPrimaryNaics] = useState(profile.primaryNaics || '')
  const [secondaryNaics, setSecondaryNaics] = useState<string[]>(profile.secondaryNaics || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { token: csrfToken, loading: csrfLoading, error: csrfError, addToHeaders } = useCSRF()

  // Combine primary and secondary codes for the selector
  const allSelectedCodes = useMemo(() => {
    const codes = [...secondaryNaics]
    if (primaryNaics && !codes.includes(primaryNaics)) {
      codes.unshift(primaryNaics)
    }
    return codes
  }, [primaryNaics, secondaryNaics])


  const handleCodesChange = (codes: string[]) => {
    if (codes.length > 0) {
      // If no primary set yet, use first code as primary
      if (!primaryNaics || !codes.includes(primaryNaics)) {
        setPrimaryNaics(codes[0])
        setSecondaryNaics(codes.slice(1))
      } else {
        // Keep existing primary, update secondary codes
        setSecondaryNaics(codes.filter(code => code !== primaryNaics))
      }
    } else {
      // No codes selected
      setPrimaryNaics('')
      setSecondaryNaics([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!csrfToken) {
      setError('Security token not available. Please refresh the page and try again.')
      return
    }

    setLoading(true)
    setError('')

    if (!primaryNaics) {
      setError('Primary NAICS code is required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: addToHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          primaryNaics,
          secondaryNaics: secondaryNaics.filter(code => code !== primaryNaics)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        onUpdate(data.data)
        onComplete()
      } else {
        setError(data.error || 'Failed to update NAICS codes')
      }
    } catch {
      setError('Failed to update NAICS codes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <FileText className="h-5 w-5" />
          NAICS Codes
        </CardTitle>
        <CardDescription>
          Select your primary and secondary NAICS codes to improve opportunity matching
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {(error || csrfError) && (
            <Alert variant="destructive">
              <AlertDescription>{error || csrfError}</AlertDescription>
            </Alert>
          )}


          {/* NAICS Code Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {allSelectedCodes.length}/10 codes selected
              </span>
            </div>
            
            <SimpleNAICSInput
              value={allSelectedCodes}
              onChange={handleCodesChange}
              multiple={true}
              placeholder="Search and select NAICS codes..."
              className="w-full"
            />
          </div>

          {/* Help Information */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>About NAICS codes:</strong> The North American Industry Classification System classifies 
              business establishments by industry. Government agencies use these codes to categorize opportunities 
              and target relevant contractors. Your primary code should represent your main business activity, 
              while secondary codes can represent additional capabilities.
            </AlertDescription>
          </Alert>

          {primaryNaics && (
            <Alert>
              <Building className="h-4 w-4" />
              <AlertDescription>
                <strong>Primary Code:</strong> {formatNAICSCode(primaryNaics, true)}
                {secondaryNaics.length > 0 && (
                  <><br /><strong>Secondary:</strong> {secondaryNaics.length} additional code{secondaryNaics.length !== 1 ? 's' : ''} selected</>  
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button 
              type="submit" 
              disabled={loading || !primaryNaics || csrfLoading || !csrfToken}
              className={(!primaryNaics || csrfLoading || !csrfToken) ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : csrfLoading ? 'Loading...' : 'Save NAICS Codes'}
            </Button>
            <Button type="button" variant="outline" onClick={onComplete}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}