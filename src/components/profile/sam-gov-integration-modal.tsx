'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { z } from 'zod'
import { 
  Building2, 
  CheckCircle, 
  ArrowRight, 
  ExternalLink, 
  AlertTriangle,
  FileText,
  Clock,
  Shield,
  Zap
} from 'lucide-react'

const ueiSchema = z.object({
  uei: z.string()
    .min(12, 'UEI must be exactly 12 characters')
    .max(12, 'UEI must be exactly 12 characters')
    .regex(/^[A-Z0-9]{12}$/, 'UEI must contain only uppercase letters and numbers')
    .describe('Unique Entity Identifier from SAM.gov registration')
})

type UeiFormData = z.infer<typeof ueiSchema>

interface SamGovIntegrationModalProps {
  isOpen: boolean
  onClose: () => void
  onManualFlow: () => void
  onSamGovSuccess: (samGovData: any) => void
}

export function SamGovIntegrationModal({ 
  isOpen, 
  onClose, 
  onManualFlow, 
  onSamGovSuccess 
}: SamGovIntegrationModalProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<'choice' | 'uei-entry' | 'fetching' | 'preview' | 'importing' | 'success'>('choice')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<UeiFormData>({ uei: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof UeiFormData, string>>>({})
  const [importedData, setImportedData] = useState<any>(null)
  const [previewData, setPreviewData] = useState<any>(null)

  const handleInputChange = (field: keyof UeiFormData, value: string) => {
    // Auto-format UEI: uppercase and remove non-alphanumeric
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
    setFormData(prev => ({ ...prev, [field]: formatted }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSamGovChoice = () => {
    setStep('uei-entry')
  }

  const handleManualChoice = () => {
    onManualFlow()
    onClose()
  }

  const handleUeiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const validatedData = ueiSchema.parse(formData)
      setStep('fetching')
      
      // Use our API endpoint to fetch from SAM.gov (server-side)
      const samGovResponse = await fetch('/api/v1/sam-gov/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uei: validatedData.uei
        })
      })

      if (!samGovResponse.ok) {
        const errorData = await samGovResponse.json()
        if (samGovResponse.status === 404) {
          throw new Error(`No entity found with UEI: ${validatedData.uei}`)
        }
        if (samGovResponse.status === 401) {
          throw new Error('Invalid API key. Please contact support.')
        }
        throw new Error(errorData.error || `Failed to fetch from SAM.gov: ${samGovResponse.statusText}`)
      }

      const result = await samGovResponse.json()
      const samGovData = result.data
      
      // Extract and transform the data for preview
      const entity = samGovData.entityData?.[0]
      if (!entity) {
        throw new Error('No entity data found for this UEI')
      }

      const entityRegistration = entity.entityRegistration
      const coreData = entity.coreData
      const repsAndCerts = entity.repsAndCerts
      const pointsOfContact = entity.pointsOfContact

      console.log('Entity registration data:', entityRegistration)
      console.log('Core data:', coreData)
      console.log('Reps and Certs data:', repsAndCerts)
      console.log('Points of Contact data:', pointsOfContact)

      // Extract NAICS codes from goodsAndServices section
      const naicsCodes = repsAndCerts?.goodsAndServices?.naics || []
      console.log(`Found ${naicsCodes.length} NAICS codes:`, naicsCodes)
      
      // Extract certifications from repsAndCerts
      const certifications = repsAndCerts?.certifications || []
      console.log(`Found ${certifications.length} certifications:`, certifications)

      const preview = {
        uei: validatedData.uei,
        entityName: entityRegistration?.legalBusinessName || 'N/A',
        dbaName: entityRegistration?.dbaName || null,
        cageCode: entityRegistration?.cageCode || null,
        registrationStatus: entityRegistration?.registrationStatus || 'Unknown',
        address: coreData?.physicalAddress || {},
        naicsCodes: naicsCodes,
        businessTypes: coreData?.businessTypes?.businessTypeList || [],
        certifications: certifications,
        registrationDates: {
          registrationDate: entityRegistration?.registrationDate,
          lastUpdateDate: entityRegistration?.lastUpdateDate,
          registrationExpirationDate: entityRegistration?.registrationExpirationDate
        },
        pointOfContact: pointsOfContact?.[0] || {},
        rawData: samGovData // Keep raw data for full import
      }

      setPreviewData(preview)
      setStep('preview')
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof UeiFormData, string>> = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof UeiFormData] = err.message
          }
        })
        setErrors(fieldErrors)
        setStep('uei-entry')
      } else {
        toast({
          title: 'Fetch Failed',
          description: error instanceof Error ? error.message : 'Failed to fetch from SAM.gov. Please try again.',
          variant: 'destructive'
        })
        setStep('uei-entry')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!previewData) return
    
    setIsSubmitting(true)
    setStep('importing')
    
    try {
      // Now import the data into the profile
      const response = await fetch('/api/v1/sam-gov/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uei: previewData.uei,
          samGovData: previewData.rawData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to import data')
      }

      const result = await response.json()
      
      if (result.success) {
        setImportedData(result.data)
        setStep('success')
        onSamGovSuccess(result.data)
      } else {
        throw new Error(result.message || 'Failed to import SAM.gov data')
      }
      
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import data. Please try again.',
        variant: 'destructive'
      })
      setStep('preview')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep('choice')
    setFormData({ uei: '' })
    setErrors({})
    setImportedData(null)
    onClose()
  }

  const handleCompleteSetup = () => {
    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'choice' && 'Setup Your Company Profile'}
            {step === 'uei-entry' && 'Enter Your UEI Number'}
            {step === 'fetching' && 'Fetching Data from SAM.gov'}
            {step === 'preview' && 'Review Your Information'}
            {step === 'importing' && 'Importing to Your Profile'}
            {step === 'success' && 'Profile Successfully Imported!'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'choice' && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Welcome to GovMatch AI!</h3>
              <p className="text-muted-foreground">
                Choose how you'd like to set up your company profile for government contracting opportunities.
              </p>
            </div>

            <div className="grid gap-4">
              {/* SAM.gov Integration Option */}
              <Card 
                className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
                onClick={handleSamGovChoice}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">SAM.gov Integration</CardTitle>
                        <Badge variant="secondary" className="mt-1">Recommended</Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>
                    Automatically import your business information from your existing SAM.gov registration.
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Instant setup with verified business data</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>NAICS codes and certifications automatically populated</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>UEI and CAGE code validation</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Sync with official government data</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                    <Clock className="h-4 w-4" />
                    <span>Setup time: ~2 minutes</span>
                  </div>
                </CardContent>
              </Card>

              {/* Manual Integration Option */}
              <Card 
                className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
                onClick={handleManualChoice}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">GovMatch Integration</CardTitle>
                        <Badge variant="outline" className="mt-1">Manual</Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>
                    Manually enter your business information step by step.
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Full control over your profile data</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Add custom competencies and capabilities</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Detailed past performance tracking</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>SAM.gov integration available later</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                    <Clock className="h-4 w-4" />
                    <span>Setup time: ~10-15 minutes</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> You can always enable SAM.gov integration later in your profile settings,
                even if you choose manual setup now.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'uei-entry' && (
          <form onSubmit={handleUeiSubmit} className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Import from SAM.gov</h3>
              <p className="text-muted-foreground">
                Enter your Unique Entity Identifier (UEI) to import your business information.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="uei">UEI (Unique Entity Identifier) *</Label>
                <Input
                  id="uei"
                  type="text"
                  value={formData.uei}
                  onChange={(e) => handleInputChange('uei', e.target.value)}
                  placeholder="ABC123DEF456"
                  className={errors.uei ? 'border-red-500' : ''}
                  maxLength={12}
                />
                {errors.uei && <p className="text-sm text-red-500 mt-1">{errors.uei}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Your 12-character UEI from your SAM.gov registration (replaces DUNS number)
                </p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Need your UEI?</strong> You can find it in your SAM.gov account or on your registration confirmation.
                  <Button 
                    variant="link" 
                    className="p-0 ml-2" 
                    onClick={() => window.open('https://sam.gov/content/entity-registration', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Visit SAM.gov
                  </Button>
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('choice')}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.uei.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Importing...' : 'Import from SAM.gov'}
                <Zap className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        )}

        {step === 'fetching' && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 rounded-full flex items-center justify-center shadow-md">
                  <Building2 className="w-8 h-8 text-white animate-pulse" />
                </div>
                <div className="absolute inset-0 mx-auto w-16 h-16 bg-green-500 dark:bg-green-400 rounded-full animate-ping opacity-20"></div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Fetching Data</h3>
                <p className="text-muted-foreground">
                  Retrieving your business information from SAM.gov...
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Connecting to SAM.gov API</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Validating UEI: {formData.uei}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Fetching entity registration data</span>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && previewData && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Review Your Information</h3>
              <p className="text-muted-foreground">
                Please review the data retrieved from SAM.gov before importing.
              </p>
            </div>

            {/* Preview Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Information</CardTitle>
                <CardDescription>
                  Data retrieved from your SAM.gov registration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Legal Business Name</Label>
                    <div className="font-medium">{previewData.entityName || 'N/A'}</div>
                  </div>
                  {previewData.dbaName && (
                    <div>
                      <Label className="text-muted-foreground">DBA Name</Label>
                      <div className="font-medium">{previewData.dbaName}</div>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">UEI</Label>
                    <div className="font-mono text-sm">{previewData.uei}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CAGE Code</Label>
                    <div className="font-mono text-sm">{previewData.cageCode || 'N/A'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Registration Status</Label>
                    <Badge variant={previewData.registrationStatus === 'Active' ? 'success' : 'secondary'}>
                      {previewData.registrationStatus}
                    </Badge>
                  </div>
                </div>

                {previewData.address && (previewData.address.addressLine1 || previewData.address.city) && (
                  <div>
                    <Label className="text-muted-foreground">Address</Label>
                    <div className="text-sm space-y-1">
                      {previewData.address.addressLine1 && <div>{previewData.address.addressLine1}</div>}
                      {previewData.address.addressLine2 && <div>{previewData.address.addressLine2}</div>}
                      {(previewData.address.city || previewData.address.stateOrProvinceCode || previewData.address.zipCode) && (
                        <div>
                          {previewData.address.city && `${previewData.address.city}, `}
                          {previewData.address.stateOrProvinceCode} {previewData.address.zipCode}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {previewData.naicsCodes && previewData.naicsCodes.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">NAICS Codes</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {previewData.naicsCodes.map((naics: any, index: number) => (
                        <Badge key={index} variant="outline">
                          {naics.naicsCode}
                          {naics.isPrimary && ' (Primary)'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {previewData.businessTypes && previewData.businessTypes.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Business Types</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {previewData.businessTypes.map((type: any, index: number) => (
                        <Badge key={index} variant="secondary">
                          {type.businessTypeDesc || type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {previewData.certifications && previewData.certifications.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Certifications</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {previewData.certifications.map((cert: any, index: number) => (
                        <Badge key={index} variant="secondary">
                          {cert.provisionId || cert.certificationName || cert.name || cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                This data will be used to populate your GovMatch profile. You can edit or add additional information after import.
              </AlertDescription>
            </Alert>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('uei-entry')
                  setPreviewData(null)
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Importing...' : 'Confirm & Import'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <Building2 className="w-8 h-8 text-white animate-pulse" />
                </div>
                <div className="absolute inset-0 mx-auto w-16 h-16 bg-blue-500 dark:bg-blue-400 rounded-full animate-ping opacity-20"></div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Importing Your Profile</h3>
                <p className="text-muted-foreground">
                  Saving your business information to GovMatch...
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Creating your company profile</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Importing NAICS codes and certifications</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Updating profile completeness score</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Finalizing import</span>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && importedData && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 rounded-full flex items-center justify-center shadow-md">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div className="absolute inset-0 mx-auto w-16 h-16 bg-green-500 dark:bg-green-400 rounded-full animate-ping opacity-20"></div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-green-600 dark:text-green-400">Import Successful!</h3>
                <p className="text-muted-foreground">
                  Your profile has been automatically populated with data from SAM.gov.
                </p>
              </div>
            </div>

            {/* Import Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import Summary</CardTitle>
                <CardDescription>
                  The following information was imported from your SAM.gov registration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Company Name:</span>
                    <div className="font-medium">{importedData.entityName || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">UEI:</span>
                    <div className="font-mono text-sm">{importedData.uei || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CAGE Code:</span>
                    <div className="font-mono text-sm">{importedData.cageCode || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Registration Status:</span>
                    <div className="font-medium">
                      <Badge variant={importedData.registrationStatus === 'Active' ? 'success' : 'secondary'}>
                        {importedData.registrationStatus || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {importedData.naicsCodes && importedData.naicsCodes.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-sm">NAICS Codes:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {importedData.naicsCodes.slice(0, 3).map((naics: any, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {naics.naicsCode}
                          {naics.isPrimary && ' (Primary)'}
                        </Badge>
                      ))}
                      {importedData.naicsCodes.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{importedData.naicsCodes.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your profile is now ready! You can review and customize your information in the Profile section.
              </AlertDescription>
            </Alert>

            <div className="flex justify-center pt-2">
              <Button
                onClick={handleCompleteSetup}
                className="bg-green-600 hover:bg-green-700"
              >
                Complete Setup
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}