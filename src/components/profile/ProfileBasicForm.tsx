'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Save, X } from 'lucide-react'
import { Profile } from '@/types'
import { useZodForm, getFormFieldState } from '@/hooks/useZodForm'
import { ProfileUpdateSchema } from '@/lib/validations'
import { FormInput, FormSelect, FormYearPicker, FormPhoneInput } from '@/components/ui/form-field'
import { OrganizationImageUpload } from '@/components/organizations/OrganizationImageUpload'
import { useCSRF } from '@/hooks/useCSRF'
import { SeparateLocationSelector } from '@/components/location/SeparateLocationSelector'
import { z } from 'zod'

interface ProfileBasicFormProps {
  profile: Profile
  onUpdate: (profile: Profile) => void
  onComplete: () => void
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

const BUSINESS_TYPES = [
  'Corporation',
  'LLC',
  'Partnership',
  'Sole Proprietorship',
  'Non-Profit',
  'Government Entity',
  'Other'
]

const EMPLOYEE_COUNT_RANGES = [
  '1-5',
  '6-10',
  '11-25',
  '26-50',
  '51-100',
  '101-250',
  '251-500',
  '501-1000',
  '1000+'
]

const REVENUE_RANGES = [
  'Less than $100K',
  '$100K - $500K',
  '$500K - $1M',
  '$1M - $5M',
  '$5M - $10M',
  '$10M - $25M',
  '$25M - $50M',
  '$50M - $100M',
  '$100M+'
]

const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Ireland',
  'New Zealand',
  'Japan',
  'South Korea',
  'Singapore',
  'Other'
]

// Create a schema for this specific form
const BasicProfileSchema = ProfileUpdateSchema.pick({
  companyName: true,
  dbaName: true,
  uei: true,
  duns: true,
  cageCode: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  primaryContactName: true,
  primaryContactEmail: true,
  primaryContactPhone: true,
  website: true,
  logoUrl: true,
  bannerUrl: true,
  contactProfileImageUrl: true,
  businessType: true,
  yearEstablished: true,
  employeeCount: true,
  annualRevenue: true,
}).extend({
  // Make required fields actually required
  companyName: z.string().min(1, 'Company name is required'),
  addressLine1: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'Please select a state'),
  zipCode: z
    .string()
    .max(10, 'ZIP code cannot exceed 10 characters')
    .regex(/^[\d-]*$/, 'ZIP code can only contain numbers and hyphens')
    .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format (use 12345 or 12345-6789)'),
  primaryContactEmail: z.string().email('Invalid email format'),
}).transform((data) => {
  // Transform empty strings to undefined for optional fields that might be empty
  return {
    ...data,
    dbaName: data.dbaName?.trim() || undefined,
    uei: data.uei?.trim() || undefined,
    duns: data.duns?.trim() || undefined,
    cageCode: data.cageCode?.trim() || undefined,
    addressLine2: data.addressLine2?.trim() || undefined,
    primaryContactName: data.primaryContactName?.trim() || undefined,
    primaryContactPhone: data.primaryContactPhone?.trim() || undefined,
    website: data.website?.trim() || undefined,
  }
})

type BasicProfileFormData = z.infer<typeof BasicProfileSchema>

export function ProfileBasicForm({ profile, onUpdate, onComplete }: ProfileBasicFormProps) {
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const { token: csrfToken, loading: csrfLoading, error: csrfError, addToHeaders } = useCSRF()

  const form = useZodForm({
    schema: BasicProfileSchema,
    defaultValues: {
      companyName: profile.companyName || '',
      dbaName: profile.dbaName || '',
      uei: profile.uei || '',
      duns: profile.duns || '',
      cageCode: profile.cageCode || '',
      addressLine1: profile.addressLine1 || '',
      addressLine2: profile.addressLine2 || '',
      city: profile.city || '',
      state: profile.state || '',
      zipCode: profile.zipCode || '',
      primaryContactName: profile.primaryContactName || '',
      primaryContactEmail: profile.primaryContactEmail || '',
      primaryContactPhone: profile.primaryContactPhone || '',
      website: profile.website || '',
      logoUrl: profile.logoUrl || '',
      bannerUrl: profile.bannerUrl || '',
      contactProfileImageUrl: profile.contactProfileImageUrl || '',
      businessType: profile.businessType || undefined,
      yearEstablished: profile.yearEstablished || undefined,
      employeeCount: profile.employeeCount || undefined,
      annualRevenue: profile.annualRevenue || undefined,
      country: profile.country || 'United States',
    },
  })

  // Don't auto-reset form - let user see their changes persist

  // Watch for value changes (including autofill) and apply formatting
  const watchedUei = form.watch('uei')
  const watchedDuns = form.watch('duns')
  const watchedCageCode = form.watch('cageCode')
  const watchedZipCode = form.watch('zipCode')

  useEffect(() => {
    if (watchedUei !== undefined && watchedUei !== null) {
      const formatted = watchedUei.toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (formatted !== watchedUei) {
        form.setValue('uei', formatted, { shouldValidate: formatted.length === 12 })
      }
    }
  }, [watchedUei, form])

  useEffect(() => {
    if (watchedDuns !== undefined && watchedDuns !== null) {
      const formatted = watchedDuns.replace(/[^0-9]/g, '')
      if (formatted !== watchedDuns) {
        form.setValue('duns', formatted, { shouldValidate: formatted.length === 9 })
      }
    }
  }, [watchedDuns, form])

  useEffect(() => {
    if (watchedCageCode !== undefined && watchedCageCode !== null) {
      const formatted = watchedCageCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (formatted !== watchedCageCode) {
        form.setValue('cageCode', formatted, { shouldValidate: formatted.length === 5 })
      }
    }
  }, [watchedCageCode, form])

  useEffect(() => {
    if (watchedZipCode !== undefined && watchedZipCode !== null) {
      const formatted = watchedZipCode.replace(/[^0-9-]/g, '')
      if (formatted !== watchedZipCode) {
        form.setValue('zipCode', formatted, { shouldValidate: /^\d{5}(-\d{4})?$/.test(formatted) })
      }
    }
  }, [watchedZipCode, form])

  const handleSubmit = form.handleSubmit(async (data: BasicProfileFormData) => {
    console.log('Profile form submission started:', data)
    
    if (!csrfToken) {
      setApiError('Security token not available. Please refresh the page and try again.')
      return
    }

    setLoading(true)
    setApiError('')

    try {
      console.log('Sending profile update request...')
      const response = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: addToHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(data)
      })

      console.log('Profile update response status:', response.status)
      const result = await response.json()
      console.log('Profile update response data:', result)
      
      if (result.success) {
        console.log('Profile update successful, calling onUpdate...')
        console.log('Updated profile data:', result.data)
        
        // Convert date strings back to Date objects for consistency
        const profileData = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
        }
        
        onUpdate(profileData)
        setLastSaved(new Date())
        onComplete() // Switch back to overview to see saved data
      } else {
        console.error('Profile update failed:', result)
        console.error('Full error response:', JSON.stringify(result, null, 2))
        if (result.details && Array.isArray(result.details)) {
          // Handle validation errors from API
          console.log('Validation errors:', result.details)
          result.details.forEach((detail: any) => {
            if (detail.field) {
              console.log(`Setting field error for ${detail.field}: ${detail.message}`)
              form.setError(detail.field as any, {
                type: 'manual',
                message: detail.message,
              })
            }
          })
        } else {
          setApiError(result.error || 'Failed to update profile')
        }
      }
    } catch (error) {
      console.error('Profile update error:', error)
      setApiError('Failed to update profile')
    } finally {
      setLoading(false)
    }
  })

  // Get current year for validation
  const currentYear = new Date().getFullYear()

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Basic Company Information
        </CardTitle>
        <CardDescription>
          Update your company&apos;s basic information and contact details
          {lastSaved && (
            <div className="text-green-600 text-sm mt-1">
              ✓ Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5" name="company-profile" autoComplete="on">
          {(apiError || csrfError) && (
            <Alert variant="destructive">
              <AlertDescription>{apiError || csrfError}</AlertDescription>
            </Alert>
          )}

          {/* Company Information */}
          <div className="space-y-3">
            <h3 className="font-semibold">Company Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput
                label="Company Name"
                placeholder="Enter company name"
                autoComplete="organization"
                name="companyName"
                required
                {...form.register('companyName')}
                {...getFormFieldState(form, 'companyName')}
              />
              <FormInput
                label="DBA Name"
                placeholder="Doing business as (optional)"
                {...form.register('dbaName')}
                {...getFormFieldState(form, 'dbaName')}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormInput
                label="UEI Number"
                placeholder="12 character UEI"
                maxLength={12}
                description="Unique Entity Identifier"
                {...form.register('uei')}
                {...getFormFieldState(form, 'uei')}
                style={{ textTransform: 'uppercase' }}
              />
              <FormInput
                label="DUNS Number"
                placeholder="9 digit DUNS"
                maxLength={9}
                description="D-U-N-S Number"
                {...form.register('duns')}
                {...getFormFieldState(form, 'duns')}
              />
              <FormInput
                label="CAGE Code"
                placeholder="5 character code"
                maxLength={5}
                description="Commercial and Government Entity Code"
                {...form.register('cageCode')}
                {...getFormFieldState(form, 'cageCode')}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>

          {/* Business Address */}
          <div className="space-y-3">
            <h3 className="font-semibold">Business Address</h3>
            <FormInput
              label="Address Line 1"
              placeholder="Street address"
              autoComplete="address-line1"
              name="address-line1"
              required
              {...form.register('addressLine1')}
              {...getFormFieldState(form, 'addressLine1')}
            />
            <FormInput
              label="Address Line 2"
              placeholder="Apartment, suite, unit, building, floor, etc."
              autoComplete="address-line2"
              name="address-line2"
              {...form.register('addressLine2')}
              {...getFormFieldState(form, 'addressLine2')}
            />
            <SeparateLocationSelector
              value={{
                state: form.watch('state'),
                city: form.watch('city'),
                zipCode: form.watch('zipCode')
              }}
              onChange={(location) => {
                form.setValue('state', location.state || '', { shouldValidate: true })
                form.setValue('city', location.city || '', { shouldValidate: true })
                form.setValue('zipCode', location.zipCode || '', { shouldValidate: true })
              }}
              layout="horizontal"
              required={{
                state: true,
                city: true,
                zipCode: false
              }}
            />
            <FormSelect
              label="Country"
              placeholder="Select country"
              required
              value={form.watch('country')}
              onValueChange={(value) => form.setValue('country', value, { shouldValidate: true })}
              options={COUNTRIES.map(country => ({ value: country, label: country }))}
              {...getFormFieldState(form, 'country')}
            />
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="font-semibold">Primary Contact Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput
                label="Contact Name"
                placeholder="Primary contact person"
                autoComplete="name"
                name="contact-name"
                {...form.register('primaryContactName')}
                {...getFormFieldState(form, 'primaryContactName')}
              />
              <FormInput
                label="Contact Email"
                type="email"
                placeholder="Primary contact email"
                autoComplete="email"
                name="email"
                required
                {...form.register('primaryContactEmail')}
                {...getFormFieldState(form, 'primaryContactEmail')}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormPhoneInput
                label="Contact Phone"
                placeholder="Enter phone number"
                value={form.watch('primaryContactPhone')}
                onChange={(value) => form.setValue('primaryContactPhone', value || '', { shouldValidate: true })}
                {...getFormFieldState(form, 'primaryContactPhone')}
              />
              <FormInput
                label="Website"
                type="url"
                placeholder="https://www.example.com"
                autoComplete="url"
                name="url"
                {...form.register('website')}
                {...getFormFieldState(form, 'website')}
              />
            </div>
          </div>

          {/* Profile Images */}
          <div className="space-y-3">
            <h3 className="font-semibold">Profile Images</h3>
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              <OrganizationImageUpload
                imageType="logo"
                value={form.watch('logoUrl')}
                onChange={(url) => form.setValue('logoUrl', url, { shouldValidate: true })}
              />
              <OrganizationImageUpload
                imageType="banner"
                value={form.watch('bannerUrl')}
                onChange={(url) => form.setValue('bannerUrl', url, { shouldValidate: true })}
              />
              <OrganizationImageUpload
                imageType="contact-profile"
                value={form.watch('contactProfileImageUrl')}
                onChange={(url) => form.setValue('contactProfileImageUrl', url, { shouldValidate: true })}
              />
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-3">
            <h3 className="font-semibold">Business Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <FormSelect
                label="Business Type"
                placeholder="Select business type"
                value={form.watch('businessType') || ''}
                onValueChange={(value) => form.setValue('businessType', value as any, { shouldValidate: true })}
                options={BUSINESS_TYPES.map(type => ({ value: type, label: type }))}
                {...getFormFieldState(form, 'businessType')}
              />
              <FormYearPicker
                label="Year Established"
                placeholder="Select year established"
                value={form.watch('yearEstablished')}
                onChange={(year) => {
                  form.setValue('yearEstablished', year, { shouldValidate: true })
                }}
                fromYear={1800}
                toYear={currentYear}
                {...getFormFieldState(form, 'yearEstablished')}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormSelect
                label="Employee Count"
                placeholder="Select employee count"
                value={form.watch('employeeCount') || ''}
                onValueChange={(value) => form.setValue('employeeCount', value as any, { shouldValidate: true })}
                options={EMPLOYEE_COUNT_RANGES.map(range => ({ value: range, label: range }))}
                {...getFormFieldState(form, 'employeeCount')}
              />
              <FormSelect
                label="Annual Revenue"
                placeholder="Select annual revenue"
                value={form.watch('annualRevenue') || ''}
                onValueChange={(value) => form.setValue('annualRevenue', value as any, { shouldValidate: true })}
                options={REVENUE_RANGES.map(range => ({ value: range, label: range }))}
                {...getFormFieldState(form, 'annualRevenue')}
              />
            </div>
          </div>

          {/* SAM.gov Integration */}
          <div className="space-y-3">
            <h3 className="font-semibold">SAM.gov Integration</h3>
            
            {/* SAM.gov Integration Card */}
            <div className="border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                      SAM.gov Profile Synchronization
                    </h4>
                    <p className="text-blue-700 dark:text-blue-200 text-sm">
                      Automatically import and sync your government registration data
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Auto-import UEI, CAGE Code, DUNS, and entity details</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Sync business certifications and set-aside eligibilities</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Keep registration status and NAICS codes up to date</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 pt-2">
                    {profile.samGovSyncedAt ? (
                      // SAM.gov data already imported - show sync option
                      <Button 
                        type="button" 
                        onClick={() => {
                          console.log('Sync button clicked - dispatching openSamGovModal event')
                          const event = new CustomEvent('openSamGovModal')
                          window.dispatchEvent(event)
                        }}
                        variant="outline"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Sync with SAM.gov
                      </Button>
                    ) : (
                      // No SAM.gov data - show import option
                      <Button 
                        type="button" 
                        onClick={() => {
                          console.log('Import button clicked - dispatching openSamGovModal event')
                          const event = new CustomEvent('openSamGovModal')
                          window.dispatchEvent(event)
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Import from SAM.gov
                      </Button>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm">
                      {profile.samGovSyncedAt ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-green-700 dark:text-green-300">
                            Last synced {new Date(profile.samGovSyncedAt).toLocaleDateString()}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="font-medium text-blue-700 dark:text-blue-300">
                            Available Now
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-blue-600 dark:text-blue-400 pt-2 border-t border-blue-200 dark:border-blue-800">
                    {profile.samGovSyncedAt ? (
                      <span>
                        <strong>Status:</strong> Connected to SAM.gov • <strong>UEI:</strong> {profile.uei || 'Not available'}
                      </span>
                    ) : (
                      <span>
                        <strong>Status:</strong> Active • <strong>Features:</strong> Import company info, NAICS codes, and certifications
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-2 pb-2">
            <Button 
              type="submit" 
              disabled={loading || !form.formState.isValid || csrfLoading || !csrfToken}
              className={(!form.formState.isValid || csrfLoading || !csrfToken) ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : csrfLoading ? 'Loading...' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={onComplete}>
              <X className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}