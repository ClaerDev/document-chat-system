'use client'

import React from 'react'
import { CheckCircle, AlertCircle, Clock, Users, Shield, Zap, Building, Calendar, MapPin, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Opportunity } from '@/types'

interface RequirementsTabProps {
  opportunity: Opportunity
}

export function RequirementsTab({ opportunity }: RequirementsTabProps) {
  // Extract requirements from description or use defaults
  const technicalRequirements = [
    'Must possess current security clearance or ability to obtain clearance',
    'Minimum 5 years experience in relevant industry',
    'Demonstrated capability in project management',
    'Compliance with federal regulations and standards',
    'Quality assurance and control processes',
    'Established past performance record'
  ]

  const eligibilityCriteria = [
    'Small Business Enterprise (SBE) certification preferred',
    'Active SAM.gov registration required',
    'No debarment or suspension records',
    'Financial stability and capability',
    'Insurance requirements met',
    'Bonding capacity if applicable'
  ]

  const submissionRequirements = [
    'Technical proposal (maximum 25 pages)',
    'Cost/Price proposal with detailed breakdown',
    'Past performance references (minimum 3)',
    'Key personnel resumes and qualifications',
    'Subcontracting plan if applicable',
    'Completed SF-33 (Solicitation, Offer and Award)'
  ]

  // Parse set-asides for this opportunity
  const setAsides = opportunity.setAsides || []
  const hasSetAsides = setAsides.length > 0

  // Parse NAICS code information
  const naicsCode = opportunity.naicsCode
  const naicsDescription = opportunity.naicsDescription

  return (
    <div className="space-y-6">
      {/* Set-Aside Information */}
      {hasSetAsides && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Set-Aside Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {setAsides.map((setAside, index) => (
                <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {setAside}
                </Badge>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              <p>This opportunity is set aside for specific business classifications. Ensure your business meets the requirements for at least one of the set-aside categories listed above.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            Technical Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {technicalRequirements.map((requirement, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{requirement}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Eligibility Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Eligibility Criteria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {eligibilityCriteria.map((criteria, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{criteria}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submission Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Submission Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {submissionRequirements.map((requirement, index) => (
              <div key={index} className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{requirement}</span>
              </div>
            ))}
          </div>
          
          <Separator className="my-4" />
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-1">Important Deadline Information</h4>
                <p className="text-sm text-yellow-800">
                  All submissions must be received by the specified deadline. Late submissions will not be considered. 
                  Electronic submissions through SAM.gov are strongly encouraged.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Requirements Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-medium text-blue-900 mb-2">Important Notice</h4>
              <p className="text-blue-800 mb-2">
                The requirements listed above are general guidelines. Always refer to the complete solicitation document 
                for detailed and authoritative requirements, evaluation criteria, and submission instructions.
              </p>
              <p className="text-blue-800">
                Questions regarding requirements should be submitted through the designated communication channels 
                specified in the solicitation document.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}