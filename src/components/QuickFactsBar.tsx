'use client'

import React from 'react'
import { DollarSign, Calendar, MapPin, Tag, Users, Shield, FileText, ExternalLink, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Opportunity } from '@/types'

interface QuickFactsBarProps {
  opportunity: Opportunity
}

export function QuickFactsBar({ opportunity }: QuickFactsBarProps) {
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

  const getDaysLeft = () => {
    if (!opportunity.deadline) return null
    
    const deadline = new Date(opportunity.deadline)
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Due Today'
    if (diffDays === 1) return '1 day left'
    return `${diffDays} days left`
  }

  const daysLeft = getDaysLeft()
  const isUrgent = daysLeft && (daysLeft === 'Due Today' || daysLeft.includes('1 day') || daysLeft.includes('2 day') || daysLeft.includes('3 day'))
  const isExpired = daysLeft === 'Expired'

  return (
    <div className="bg-muted/30 border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-8 flex-wrap">
          {/* Contract Value - Only show if not "Not specified" */}
          {getValueDisplay() !== 'Not specified' && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-government" />
              <span className="font-semibold text-foreground">
                {getValueDisplay()}
              </span>
            </div>
          )}

          {/* Deadline */}
          {daysLeft && (
            <div className="flex items-center gap-2">
              <Calendar className={`w-5 h-5 ${isExpired ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-blue-500'}`} />
              <span className={`font-semibold ${isExpired ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-foreground'}`}>
                {daysLeft}
              </span>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-500" />
            <span className="text-foreground">
              {opportunity.location || 
               (opportunity.placeOfPerformance ? 
                 `${(opportunity.placeOfPerformance as any)?.state || 'Multiple States'}` : 
                 'Nationwide')
              }
            </span>
          </div>

          {/* NAICS Codes */}
          {opportunity.naicsCodes && opportunity.naicsCodes.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-green-500" />
              <span className="text-foreground">
                NAICS: {opportunity.naicsCodes.slice(0, 2).join(', ')}
                {opportunity.naicsCodes.length > 2 && <span className="text-muted-foreground"> +{opportunity.naicsCodes.length - 2} more</span>}
              </span>
            </div>
          )}

          {/* PSC Codes */}
          {opportunity.pscCodes && opportunity.pscCodes.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-500" />
              <span className="text-foreground">
                PSC: {opportunity.pscCodes.slice(0, 2).join(', ')}
                {opportunity.pscCodes.length > 2 && <span className="text-muted-foreground"> +{opportunity.pscCodes.length - 2} more</span>}
              </span>
            </div>
          )}

          {/* Set-Aside Type */}
          {opportunity.setAsideType && opportunity.setAsideType !== 'NONE' && (
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <Badge variant="secondary" className="font-medium">
                {opportunity.setAsideType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
          )}

          {/* Security Clearance */}
          {opportunity.securityClearanceRequired && opportunity.securityClearanceRequired !== 'None' && (
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              <Badge variant="outline" className="font-medium border-red-200 text-red-700">
                🔒 {opportunity.securityClearanceRequired}
              </Badge>
            </div>
          )}

          {/* Opportunity Type */}
          {opportunity.type && (
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              <Badge variant="outline" className="font-medium">
                {opportunity.type === 'SOLICITATION' ? 'Solicitation' : opportunity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
          )}

          {/* Status */}
          {opportunity.status && (
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              <Badge variant="secondary" className="font-medium">
                {opportunity.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
          )}

          {/* Solicitation Number */}
          {opportunity.solicitationNumber && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">Sol #:</span>
              <span className="font-mono">{opportunity.solicitationNumber}</span>
            </div>
          )}

          {/* Recipient Name (if available) */}
          {(opportunity as any).recipientName && (
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              <div>
                <span className="text-xs text-muted-foreground mr-1">Recipient:</span>
                {(opportunity as any).recipientId ? (
                  <a 
                    href={`https://www.usaspending.gov/recipient/${(opportunity as any).recipientId}/latest`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-cyan-600 hover:text-cyan-800 underline"
                  >
                    {(opportunity as any).recipientName}
                  </a>
                ) : (
                  <span className="font-medium text-foreground">{(opportunity as any).recipientName}</span>
                )}
              </div>
            </div>
          )}

          {/* Recipient UEI (if available) */}
          {(opportunity as any).recipientUei && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">UEI:</span>
              <span className="font-mono">{(opportunity as any).recipientUei}</span>
            </div>
          )}

          {/* Source URL */}
          {opportunity.sourceUrl && (
            <div className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-cyan-500" />
              <a 
                href={opportunity.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-600 hover:text-cyan-800 underline text-sm font-medium"
              >
                View Source
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}