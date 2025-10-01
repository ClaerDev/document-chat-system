/**
 * Timezone utility functions and data
 * Provides comprehensive timezone support for government contracting applications
 */

import timezonesData from '@/data/timezones/timezones.json'

export interface Timezone {
  value: string // IANA timezone identifier (e.g., "America/New_York")
  label: string // Human-readable label (e.g., "Eastern Time (ET)")
  offset: string // Standard time offset (e.g., "-05:00")
  offsetDST: string // Daylight saving time offset (e.g., "-04:00")
  region: string // Geographic region (e.g., "North America")
  cities: string[] // Major cities in this timezone
  abbreviation: string // Standard abbreviation (e.g., "EST/EDT")
}

export interface TimezoneGroup {
  region: string
  timezones: Timezone[]
}

// Get all timezones
export function getAllTimezones(): Timezone[] {
  return timezonesData.timezones
}

// Get timezones grouped by region
export function getTimezonesByRegion(): TimezoneGroup[] {
  const timezones = getAllTimezones()
  const regions = [...new Set(timezones.map(tz => tz.region))]
  
  return regions.map(region => ({
    region,
    timezones: timezones.filter(tz => tz.region === region)
  }))
}

// Get US timezones (commonly used for government contracting)
export function getUSTimezones(): Timezone[] {
  return getAllTimezones().filter(tz => 
    tz.region === 'North America' && 
    (tz.value.startsWith('America/') && !tz.value.includes('Mexico') && !tz.value.includes('Toronto') && !tz.value.includes('Vancouver')) ||
    tz.value.startsWith('Pacific/Honolulu')
  )
}

// Find timezone by IANA identifier
export function findTimezone(value: string): Timezone | undefined {
  return getAllTimezones().find(tz => tz.value === value)
}

// Search timezones by label, city, or abbreviation
export function searchTimezones(query: string): Timezone[] {
  const searchTerm = query.toLowerCase()
  return getAllTimezones().filter(tz =>
    tz.label.toLowerCase().includes(searchTerm) ||
    tz.abbreviation.toLowerCase().includes(searchTerm) ||
    tz.cities.some(city => city.toLowerCase().includes(searchTerm))
  )
}

// Get current offset for a timezone (accounting for DST)
export function getCurrentOffset(timezone: string): string {
  try {
    const now = new Date()
    const timeInTimezone = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).formatToParts(now)
    
    const utcTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).formatToParts(now)
    
    const timezoneHours = parseInt(timeInTimezone.find(part => part.type === 'hour')?.value || '0')
    const timezoneMinutes = parseInt(timeInTimezone.find(part => part.type === 'minute')?.value || '0')
    const utcHours = parseInt(utcTime.find(part => part.type === 'hour')?.value || '0')
    const utcMinutes = parseInt(utcTime.find(part => part.type === 'minute')?.value || '0')
    
    const timezoneTotal = timezoneHours * 60 + timezoneMinutes
    const utcTotal = utcHours * 60 + utcMinutes
    const offsetMinutes = timezoneTotal - utcTotal
    
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
    const offsetMins = Math.abs(offsetMinutes) % 60
    const sign = offsetMinutes >= 0 ? '+' : '-'
    
    return `${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`
  } catch (error) {
    // Fallback to stored offset if dynamic calculation fails
    const tz = findTimezone(timezone)
    return tz?.offset || '+00:00'
  }
}

// Check if timezone observes daylight saving time
export function observesDST(timezone: string): boolean {
  const tz = findTimezone(timezone)
  return tz ? tz.offset !== tz.offsetDST : false
}

// Format timezone for display with current offset
export function formatTimezoneDisplay(timezone: string): string {
  const tz = findTimezone(timezone)
  if (!tz) return timezone
  
  const currentOffset = getCurrentOffset(timezone)
  const dstIndicator = observesDST(timezone) ? ' (DST)' : ''
  
  return `${tz.label} (UTC${currentOffset})${dstIndicator}`
}

// Get timezone options formatted for UI dropdowns
export function getTimezoneOptions(): Array<{
  value: string
  label: string
  region: string
  offset: string
  abbreviation: string
}> {
  return getAllTimezones().map(tz => ({
    value: tz.value,
    label: `${tz.label} (UTC${tz.offset})`,
    region: tz.region,
    offset: tz.offset,
    abbreviation: tz.abbreviation
  }))
}

// Get common government contracting timezones (US government often uses these)
export function getCommonGovTimezones(): Timezone[] {
  const commonValues = [
    'America/New_York',    // Eastern Time (most federal agencies)
    'America/Chicago',     // Central Time
    'America/Denver',      // Mountain Time
    'America/Los_Angeles', // Pacific Time
    'America/Anchorage',   // Alaska Time
    'Pacific/Honolulu',    // Hawaii Time
    'UTC'                  // Universal Time (for international contracts)
  ]
  
  return commonValues.map(value => findTimezone(value)).filter(Boolean) as Timezone[]
}

// Validate timezone string
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

// Convert time between timezones
export function convertTime(
  time: Date,
  fromTimezone: string,
  toTimezone: string
): { time: string; date: string; full: string } {
  const timeInTargetTZ = new Intl.DateTimeFormat('en-US', {
    timeZone: toTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(time)
  
  const [date, timeStr] = timeInTargetTZ.split(', ')
  
  return {
    time: timeStr,
    date: date,
    full: timeInTargetTZ
  }
}

// Get user's detected timezone
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/New_York' // Fallback to Eastern Time
  }
}

// Default timezone for government contracting (Eastern Time - where most federal agencies are located)
export const DEFAULT_GOVERNMENT_TIMEZONE = 'America/New_York'

// Most common business timezones in order of usage
export const COMMON_BUSINESS_TIMEZONES = [
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'UTC',
  'Europe/London',
  'Europe/Paris'
]