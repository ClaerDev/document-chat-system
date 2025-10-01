'use client'

import { Calendar, DollarSign, Building2, MapPin, FileText, Briefcase, Clock, Eye, EyeOff } from "lucide-react"
import { Card } from "./card"
import { Badge } from "./badge"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface PublicOpportunityCardProps {
  title: string
  agency: string
  deadline: Date
  value?: number
  valueMin?: number
  valueMax?: number
  onClick?: () => void
  className?: string
  solicitationNumber?: string
  location?: string
  setAsideType?: string
  contractType?: string
  naicsCodes?: string[]
  postedDate?: Date
  description?: string
  onSignUpClick?: () => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyRange(min?: number, max?: number, value?: number) {
  if (value) return formatCurrency(value)
  if (min && max) return `${formatCurrency(min)} - ${formatCurrency(max)}`
  if (min) return `${formatCurrency(min)}+`
  if (max) return `Up to ${formatCurrency(max)}`
  return 'Not specified'
}

function formatDeadline(date: Date) {
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'Expired'
  if (diffDays === 0) return 'Due Today'
  if (diffDays === 1) return 'Due Tomorrow'
  if (diffDays < 7) return `Due in ${diffDays} days`
  if (diffDays < 30) return `Due in ${Math.ceil(diffDays / 7)} weeks`
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

function getDeadlineUrgency(date: Date) {
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'text-destructive'
  if (diffDays <= 3) return 'text-warning'
  if (diffDays <= 7) return 'text-government'
  return 'text-muted-foreground'
}

export function PublicOpportunityCard({
  title,
  agency,
  deadline,
  value,
  valueMin,
  valueMax,
  onClick,
  className,
  solicitationNumber,
  location,
  setAsideType,
  contractType,
  naicsCodes,
  postedDate,
  description,
  onSignUpClick
}: PublicOpportunityCardProps) {
  const deadlineText = formatDeadline(deadline)
  const deadlineUrgency = getDeadlineUrgency(deadline)
  const valueText = formatCurrencyRange(valueMin, valueMax, value)

  // Calculate days until deadline
  const daysUntilDeadline = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  
  // Format posted date
  const postedText = postedDate ? new Date(postedDate).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  }) : ''

  return (
    <Card 
      className={cn(
        "p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.005] border relative",
        "min-h-[180px]",
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-4">
          <div className="flex items-start gap-2 mb-1">
            <h3 className="font-semibold text-base leading-tight line-clamp-2">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
            <div className="flex items-center">
              <Building2 className="w-4 h-4 mr-1" />
              {agency}
            </div>
            {location && (
              <div className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {location}
              </div>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {description}
            </p>
          )}
        </div>
        
        {/* Blurred Match Score Section */}
        <div className="shrink-0 relative">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-bold relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-sm opacity-60"></div>
            <div className="relative text-xs">
              <EyeOff className="w-4 h-4 mb-1" />
              <span className="text-xs">??</span>
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs bg-background border-2 border-primary hover:bg-primary hover:text-primary-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onSignUpClick?.()
              }}
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
          </div>
        </div>
      </div>

      {/* Middle Section - Key Details */}
      <div className="flex flex-wrap gap-2 mb-3">
        {solicitationNumber && (
          <Badge variant="outline" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            {solicitationNumber}
          </Badge>
        )}
        {setAsideType && (
          <Badge variant="secondary" className="text-xs">
            {setAsideType}
          </Badge>
        )}
        {contractType && (
          <Badge variant="outline" className="text-xs">
            <Briefcase className="w-3 h-3 mr-1" />
            {contractType}
          </Badge>
        )}
        {naicsCodes && naicsCodes.length > 0 && (
          <Badge variant="outline" className="text-xs">
            NAICS: {naicsCodes[0]}{naicsCodes.length > 1 && ` +${naicsCodes.length - 1}`}
          </Badge>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={cn("flex items-center text-sm font-medium", deadlineUrgency)}>
            <Calendar className="w-4 h-4 mr-1" />
            <span>{deadlineText}</span>
            {daysUntilDeadline >= 0 && daysUntilDeadline <= 30 && (
              <Badge variant={daysUntilDeadline <= 7 ? "destructive" : "outline"} className="ml-2 text-xs">
                {daysUntilDeadline}d left
              </Badge>
            )}
          </div>
          
          <div className="flex items-center text-sm font-medium text-foreground">
            <DollarSign className="w-4 h-4 mr-1" />
            {valueText}
          </div>

          {postedDate && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              Posted {postedText}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Preview
          </Badge>
        </div>
      </div>
    </Card>
  )
}