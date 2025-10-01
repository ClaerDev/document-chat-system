'use client'

import React from 'react'
import { Calendar, MapPin, Building2, DollarSign, Tag, Users, Phone, Mail, Globe, FileText, Clock, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ContactsSection } from './ContactsSection'
import type { Opportunity } from '@/types'

interface OverviewTabProps {
  opportunity: Opportunity
}

export function OverviewTab({ opportunity }: OverviewTabProps) {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'Not specified'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: value >= 1000000 ? 'compact' : 'standard'
    }).format(value)
  }

  const getValueDisplay = () => {
    if (opportunity.contractValue) {
      return formatCurrency(opportunity.contractValue)
    }
    if (opportunity.contractValueMin && opportunity.contractValueMax) {
      return `${formatCurrency(opportunity.contractValueMin)} - ${formatCurrency(opportunity.contractValueMax)}`
    }
    if (opportunity.contractValueMin) {
      return `${formatCurrency(opportunity.contractValueMin)}+`
    }
    if (opportunity.contractValueMax) {
      return `Up to ${formatCurrency(opportunity.contractValueMax)}`
    }
    return 'Not specified'
  }

  const agencyInfo = typeof opportunity.agency === 'object' ? opportunity.agency : null
  const agencyName = typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name || 'Unknown Agency'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* Description */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Description
          </h3>
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              {opportunity.description || opportunity.summary || 'No description provided for this opportunity.'}
            </p>
            {opportunity.summary && opportunity.description && opportunity.summary !== opportunity.description && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
                <p className="text-blue-800 text-sm">{opportunity.summary}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Important Dates
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunity.postedDate && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Posted Date</div>
                  <div className="font-medium">{formatDate(opportunity.postedDate)}</div>
                </div>
              )}
              {opportunity.deadline && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Response Deadline</div>
                  <div className="font-medium text-orange-600">{formatDate(opportunity.deadline)}</div>
                </div>
              )}
              {opportunity.performanceStartDate && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Performance Start</div>
                  <div className="font-medium">{formatDate(opportunity.performanceStartDate)}</div>
                </div>
              )}
              {opportunity.performanceEndDate && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Performance End</div>
                  <div className="font-medium">{formatDate(opportunity.performanceEndDate)}</div>
                </div>
              )}
            </div>
            {opportunity.lastModifiedDate && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Last modified: {formatDate(opportunity.lastModifiedDate)}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Classification */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Classification & Codes
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Opportunity Type</div>
                <Badge variant="outline">{opportunity.opportunityType || 'Not specified'}</Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Contract Type</div>
                <Badge variant="outline">{opportunity.contractType || 'Not specified'}</Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Set-Aside Type</div>
                <Badge variant="secondary">
                  {opportunity.setAsideType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'None'}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Competition Type</div>
                <Badge variant="outline">{opportunity.competitionType || 'Not specified'}</Badge>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">NAICS Codes</div>
              <div className="flex flex-wrap gap-2">
                {opportunity.naicsCodes && opportunity.naicsCodes.length > 0 ? (
                  opportunity.naicsCodes.map((code, index) => (
                    <Badge key={index} variant="outline" className="font-mono">
                      {code}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">Not specified</span>
                )}
              </div>
            </div>

            {opportunity.pscCodes && opportunity.pscCodes.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">PSC Codes</div>
                <div className="flex flex-wrap gap-2">
                  {opportunity.pscCodes.map((code, index) => (
                    <Badge key={index} variant="outline" className="font-mono">
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {opportunity.cfda && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">CFDA Number</div>
                <Badge variant="outline" className="font-mono">{opportunity.cfda}</Badge>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Financial Information */}
        <Card className="p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Financial Details
          </h4>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Contract Value</div>
              <div className="text-lg font-semibold text-government">{getValueDisplay()}</div>
            </div>
            {opportunity.currency && opportunity.currency !== 'USD' && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Currency</div>
                <div className="font-medium">{opportunity.currency}</div>
              </div>
            )}
            {opportunity.fundingAmount && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Funding Amount</div>
                <div className="font-medium">{formatCurrency(opportunity.fundingAmount)}</div>
              </div>
            )}
            {opportunity.awardCeiling && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Award Ceiling</div>
                <div className="font-medium">{formatCurrency(opportunity.awardCeiling)}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Agency Information */}
        <Card className="p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Agency Details
          </h4>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Agency Name</div>
              <div className="font-medium">{agencyName}</div>
            </div>
            {agencyInfo?.code && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Agency Code</div>
                <div className="font-mono text-sm">{agencyInfo.code}</div>
              </div>
            )}
            {agencyInfo?.type && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Type</div>
                <div className="text-sm">{agencyInfo.type}</div>
              </div>
            )}
            {opportunity.office && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Contracting Office</div>
                <div className="text-sm">{opportunity.office}</div>
              </div>
            )}
            {agencyInfo?.website && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Website</div>
                <a 
                  href={agencyInfo.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                >
                  <Globe className="w-3 h-3" />
                  Visit Website
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* Location Information */}
        <Card className="p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location Details
          </h4>
          <div className="space-y-3">
            {opportunity.placeOfPerformance && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Place of Performance</div>
                <div className="text-sm">
                  {(opportunity.placeOfPerformance as any)?.city && (opportunity.placeOfPerformance as any)?.state ? 
                    `${(opportunity.placeOfPerformance as any).city}, ${(opportunity.placeOfPerformance as any).state}` :
                    opportunity.location || 'Multiple Locations'
                  }
                  {(opportunity.placeOfPerformance as any)?.zipCode && (
                    <div className="text-muted-foreground">ZIP: {(opportunity.placeOfPerformance as any).zipCode}</div>
                  )}
                </div>
              </div>
            )}
            
            {opportunity.contractorLocation && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Contractor Location</div>
                <div className="text-sm">
                  {(opportunity.contractorLocation as any)?.city && (opportunity.contractorLocation as any)?.state ? 
                    `${(opportunity.contractorLocation as any).city}, ${(opportunity.contractorLocation as any).state}` :
                    'Not specified'
                  }
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Requirements Summary */}
        <Card className="p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Key Requirements
          </h4>
          <div className="space-y-3">
            {opportunity.securityClearanceRequired && opportunity.securityClearanceRequired !== 'None' && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm">Security Clearance: {opportunity.securityClearanceRequired}</span>
              </div>
            )}
            {opportunity.smallBusinessSetAside && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm">Small Business Set-Aside</span>
              </div>
            )}
            {opportunity.facilityClearanceReq && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-sm">Facility Clearance Required</span>
              </div>
            )}
            {opportunity.personnelClearanceReq && opportunity.personnelClearanceReq > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm">Personnel Clearance: {opportunity.personnelClearanceReq} required</span>
              </div>
            )}
          </div>
        </Card>

        {/* Solicitation Details */}
        <Card className="p-4">
          <h4 className="font-medium mb-4">Solicitation Information</h4>
          <div className="space-y-3">
            {opportunity.solicitationNumber && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Solicitation Number</div>
                <div className="font-mono text-sm">{opportunity.solicitationNumber}</div>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Source System</div>
              <div className="text-sm">{opportunity.sourceSystem || 'SAM.gov'}</div>
            </div>
            {opportunity.sourceUrl && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Original Source</div>
                <a 
                  href={opportunity.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View on SAM.gov
                </a>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Point of Contact Section */}
      <div className="lg:col-span-2">
        <ContactsSection opportunity={opportunity} />
      </div>
    </div>
  )
}