'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building2, 
  CheckCircle, 
  ArrowRight, 
  FileText,
  Clock,
  Shield,
  Zap,
  Star
} from 'lucide-react'
import { SamGovIntegrationModal } from './sam-gov-integration-modal'

interface ProfileSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onManualFlow: () => void
  onSetupComplete: (data?: any) => void
}

export function ProfileSetupModal({ 
  isOpen, 
  onClose, 
  onManualFlow,
  onSetupComplete
}: ProfileSetupModalProps) {
  const [showSamGovModal, setShowSamGovModal] = useState(false)

  const handleSamGovChoice = () => {
    setShowSamGovModal(true)
  }

  const handleManualChoice = () => {
    onManualFlow()
    onClose()
  }

  const handleSamGovSuccess = (samGovData: any) => {
    setShowSamGovModal(false)
    onSetupComplete(samGovData)
    onClose()
  }

  const handleSamGovManualFlow = () => {
    setShowSamGovModal(false)
    // Allow user to go back to manual flow from SAM.gov modal
    onManualFlow()
    onClose()
  }

  const handleClose = () => {
    setShowSamGovModal(false)
    onClose()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Setup Your Company Profile</DialogTitle>
          </DialogHeader>
          
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
                className="cursor-pointer border-2 hover:border-primary/50 transition-colors relative"
                onClick={handleSamGovChoice}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 rounded-lg shadow-md">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          SAM.gov Integration
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        </CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                            Recommended
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Fast Setup
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>
                    Automatically import your business information from your existing SAM.gov registration.
                    Perfect for companies already registered for government contracting.
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
                      <span>Stay synced with official government data</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Setup time: ~2 minutes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      <span>Auto-sync available</span>
                    </div>
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
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-lg shadow-md">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Manual Setup</CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Full Control
                          </Badge>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            Flexible
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>
                    Manually enter your business information step by step. Ideal for new companies 
                    or those who prefer to customize their profile details.
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

                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Setup time: ~10-15 minutes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>Step-by-step guidance</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> You can always switch between methods or enable SAM.gov integration 
                later in your profile settings, regardless of which option you choose now.
              </AlertDescription>
            </Alert>

            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="text-muted-foreground"
              >
                I'll set this up later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SAM.gov Integration Modal */}
      <SamGovIntegrationModal
        isOpen={showSamGovModal}
        onClose={() => setShowSamGovModal(false)}
        onManualFlow={handleSamGovManualFlow}
        onSamGovSuccess={handleSamGovSuccess}
      />
    </>
  )
}