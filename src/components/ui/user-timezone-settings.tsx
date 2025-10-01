'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TimezoneSelect, TimezoneDisplay } from '@/components/ui/timezone-select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, Globe, Save, Loader2 } from 'lucide-react'
import { getUserTimezone, DEFAULT_GOVERNMENT_TIMEZONE } from '@/lib/utils/timezones'

interface UserTimezoneSettingsProps {
  currentTimezone?: string
  onSave: (timezone: string) => Promise<void>
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

export function UserTimezoneSettings({
  currentTimezone,
  onSave,
  isLoading = false,
  disabled = false,
  className
}: UserTimezoneSettingsProps) {
  const [selectedTimezone, setSelectedTimezone] = useState(
    currentTimezone || getUserTimezone()
  )
  const [isSaving, setIsSaving] = useState(false)

  const hasChanged = selectedTimezone !== currentTimezone

  const handleSave = async () => {
    if (!hasChanged || isSaving) return

    setIsSaving(true)
    try {
      await onSave(selectedTimezone)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDetectTimezone = () => {
    const detectedTimezone = getUserTimezone()
    setSelectedTimezone(detectedTimezone)
  }

  const handleSetDefaultGovTimezone = () => {
    setSelectedTimezone(DEFAULT_GOVERNMENT_TIMEZONE)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timezone Preferences
        </CardTitle>
        <CardDescription>
          Set your preferred timezone for scheduling, notifications, and time displays throughout the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Timezone Display */}
        {currentTimezone && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Current Timezone
            </Label>
            <div className="p-3 bg-muted rounded-md">
              <TimezoneDisplay timezone={currentTimezone} showTime={true} />
            </div>
          </div>
        )}

        {/* Timezone Selection */}
        <div className="space-y-3">
          <Label htmlFor="timezone-select">Select Timezone</Label>
          <TimezoneSelect
            value={selectedTimezone}
            onChange={setSelectedTimezone}
            placeholder="Choose your timezone..."
            showCurrentTime={true}
            filterType="common"
            disabled={disabled || isLoading}
            className="w-full"
          />
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDetectTimezone}
              disabled={disabled || isLoading}
            >
              <Globe className="h-4 w-4 mr-2" />
              Auto-detect
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSetDefaultGovTimezone}
              disabled={disabled || isLoading}
            >
              <Clock className="h-4 w-4 mr-2" />
              Eastern Time (Government)
            </Button>
          </div>
        </div>

        {/* Preview of Selected Timezone */}
        {selectedTimezone && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Preview
            </Label>
            <div className="p-3 border rounded-md bg-background">
              <TimezoneDisplay 
                timezone={selectedTimezone} 
                showTime={true} 
                className="font-medium" 
              />
              {hasChanged && (
                <Badge variant="secondary" className="mt-2">
                  Unsaved changes
                </Badge>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={!hasChanged || disabled || isLoading || isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Timezone
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-sm text-muted-foreground">
          <p>
            Your timezone setting affects:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Display of deadlines and important dates</li>
            <li>Email notifications and digest timing</li>
            <li>Meeting scheduling and calendar events</li>
            <li>Contact availability indicators</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// Simplified version for embedding in other forms
interface CompactUserTimezoneSelectProps {
  value?: string
  onChange: (timezone: string) => void
  label?: string
  disabled?: boolean
  error?: boolean
  className?: string
}

export function CompactUserTimezoneSelect({
  value,
  onChange,
  label = "Timezone",
  disabled = false,
  error = false,
  className
}: CompactUserTimezoneSelectProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="timezone-compact">{label}</Label>
      <TimezoneSelect
        value={value || getUserTimezone()}
        onChange={onChange}
        placeholder="Select timezone..."
        showCurrentTime={false}
        filterType="government"
        disabled={disabled}
        error={error}
        size="md"
      />
    </div>
  )
}