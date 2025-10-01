import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays}d ago`
  }

  return formatDate(d)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidUEI(uei: string): boolean {
  // UEI format: 12 alphanumeric characters
  const ueiRegex = /^[A-Z0-9]{12}$/
  return ueiRegex.test(uei.toUpperCase())
}

export function getMatchScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-600 bg-emerald-50'
  if (score >= 70) return 'text-blue-600 bg-blue-50'
  if (score >= 50) return 'text-amber-600 bg-amber-50'
  return 'text-gray-600 bg-gray-50'
}

export function getMatchScoreBadgeClasses(score: number): string {
  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
  const colorClasses = getMatchScoreColor(score)
  return `${baseClasses} ${colorClasses}`
}

export function formatMimeType(mimeType: string): string {
  if (!mimeType) return 'Unknown'

  // Common MIME type mappings for display
  const mimeTypeMap: { [key: string]: string } = {
    // Images
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WebP',
    'image/svg+xml': 'SVG',
    'image/bmp': 'BMP',

    // Documents
    'application/pdf': 'PDF',
    'text/plain': 'Text',
    'text/csv': 'CSV',
    'application/json': 'JSON',
    'text/markdown': 'Markdown',
    'application/xml': 'XML',
    'text/xml': 'XML',

    // Microsoft Office
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'Word Document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      'PowerPoint',
    'application/msword': 'Word Document',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.ms-powerpoint': 'PowerPoint',

    // Google Docs
    'application/vnd.google-apps.document': 'Google Doc',
    'application/vnd.google-apps.spreadsheet': 'Google Sheet',
    'application/vnd.google-apps.presentation': 'Google Slides',

    // Archives
    'application/zip': 'ZIP Archive',
    'application/x-rar-compressed': 'RAR Archive',
    'application/x-tar': 'TAR Archive',

    // Other common types
    'video/mp4': 'MP4 Video',
    'audio/mpeg': 'MP3 Audio',
    'audio/wav': 'WAV Audio',
  }

  // Check for exact match first
  if (mimeTypeMap[mimeType.toLowerCase()]) {
    return mimeTypeMap[mimeType.toLowerCase()]
  }

  // Try to extract meaningful parts for unknown types
  const parts = mimeType.split('/')
  if (parts.length === 2) {
    const [category, subtype] = parts

    // Handle common patterns
    if (category === 'image') {
      return subtype.toUpperCase()
    }

    if (category === 'text') {
      return `${subtype.charAt(0).toUpperCase()}${subtype.slice(1)} Text`
    }

    if (category === 'application') {
      // Handle specific application subtypes
      if (subtype.includes('pdf')) return 'PDF'
      if (subtype.includes('word') || subtype.includes('msword'))
        return 'Word Document'
      if (subtype.includes('excel') || subtype.includes('sheet'))
        return 'Excel Spreadsheet'
      if (subtype.includes('powerpoint') || subtype.includes('presentation'))
        return 'PowerPoint'
      if (subtype.includes('zip')) return 'ZIP Archive'
      if (subtype.includes('json')) return 'JSON'
      if (subtype.includes('xml')) return 'XML'

      // For other application types, clean up the subtype
      const cleanSubtype = subtype
        .replace(/^vnd\./, '') // Remove vendor prefix
        .replace(/^x-/, '') // Remove experimental prefix
        .replace(/-/g, ' ') // Replace hyphens with spaces
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      return cleanSubtype
    }

    if (category === 'video') {
      return `${subtype.toUpperCase()} Video`
    }

    if (category === 'audio') {
      return `${subtype.toUpperCase()} Audio`
    }
  }

  // Fallback: return the original MIME type but shortened
  if (mimeType.length > 20) {
    return mimeType.substring(0, 17) + '...'
  }

  return mimeType
}

/**
 * Get organization ID from user ID
 * This utility function fetches the organization ID for a given user from the database
 */
export async function getUserOrganizationId(
  userId: string
): Promise<string | null> {
  if (!userId) {
    return null
  }

  try {
    // Import db here to avoid circular dependencies
    const { db } = await import('@/lib/db')

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    })

    return user?.organizationId || null
  } catch (error) {
    console.error('Error fetching user organization ID:', error)
    return null
  }
}
