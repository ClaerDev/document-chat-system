'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X, User, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContactImageUploadProps {
  value?: string // Current saved image URL
  onChange: (stagedImage: StagedImage | null) => void // Pass staged image data
  onRemove?: () => void
  disabled?: boolean
  className?: string
  contactName?: string
  size?: 'sm' | 'md' | 'lg'
  stagedImage?: StagedImage | null // Currently staged image
  isLoading?: boolean // Add isLoading prop
}

export interface StagedImage {
  file: File
  previewUrl: string // Object URL for preview
  isNew: boolean // true for new images, false for replacements
  originalUrl?: string // Original URL being replaced (for updates)
}

const sizeClasses = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-24 w-24'
}

// Generate initials from name for avatar fallback
function getInitials(name: string): string {
  if (!name) return 'C'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function ContactImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  className,
  contactName = 'Contact',
  size = 'md',
  stagedImage,
  isLoading = false // Add isLoading as a prop with default value
}: ContactImageUploadProps) {
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // Determine what to display: staged image preview, existing value, or fallback
  const displayImageUrl = stagedImage?.previewUrl || value
  const hasChanges = stagedImage !== null

  const handleFileSelection = async (file: File) => {
    setError('')

    try {
      // Validate file
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Please select a PNG, JPEG, or WebP image file')
      }

      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 2MB')
      }

      // Create preview URL for immediate display
      const previewUrl = URL.createObjectURL(file)

      // Create staged image object
      const newStagedImage: StagedImage = {
        file,
        previewUrl,
        isNew: !value, // true if no existing image, false if replacing
        originalUrl: value // store original URL for cleanup during save
      }

      // Clean up previous staged image if exists
      if (stagedImage?.previewUrl) {
        URL.revokeObjectURL(stagedImage.previewUrl)
      }

      onChange(newStagedImage)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'File selection failed'
      setError(message)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelection(files[0])
    }
    // Clear the input so the same file can be selected again
    e.target.value = ''
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  const handleRemove = () => {
    // Clean up staged image if exists
    if (stagedImage?.previewUrl) {
      URL.revokeObjectURL(stagedImage.previewUrl)
    }
    
    // Clear staged image (removal will be handled during save)
    onChange(null)
    
    if (onRemove) {
      onRemove()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {error && (
        <Alert variant="destructive" className="w-full">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        {/* Avatar Display */}
        <div
          className={cn(
            'relative cursor-pointer transition-all duration-200',
            sizeClasses[size],
            dragOver && 'ring-2 ring-primary ring-offset-2',
            isLoading && 'opacity-50 cursor-not-allowed',
            disabled && 'opacity-50 cursor-not-allowed',
            'group hover:shadow-lg'
          )}
          onClick={() => {
            if (!disabled && !isLoading) {
              document.getElementById('contact-image-upload')?.click()
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleFileDrop}
        >
          <Avatar className={cn(
            sizeClasses[size], 
            'border-2',
            hasChanges ? 'border-orange-500 border-dashed' : 'border-border'
          )}>
            {displayImageUrl ? (
              <AvatarImage 
                src={displayImageUrl} 
                alt={`${contactName} profile`}
                className="object-cover"
              />
            ) : (
              <AvatarFallback className="bg-muted text-muted-foreground">
                {getInitials(contactName)}
              </AvatarFallback>
            )}
          </Avatar>

          {/* Upload Overlay */}
          <div className={cn(
            'absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 transition-opacity duration-200',
            'group-hover:opacity-100',
            dragOver && 'opacity-100'
          )}>
            <Upload className="h-6 w-6 text-white" />
          </div>

          {/* Changes Indicator */}
          {hasChanges && (
            <div className="absolute -top-1 -left-1 h-6 w-6 bg-orange-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-3 w-3 text-white" />
            </div>
          )}

          {/* Remove Button */}
          {(displayImageUrl || hasChanges) && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Hidden File Input */}
        <Input
          id="contact-image-upload"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isLoading}
        />
      </div>

      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {displayImageUrl ? 'Click to change' : 'Click to upload'} profile image
        </p>
        {hasChanges && (
          <p className="text-xs text-orange-600 font-medium">
            Changes staged - save contact to upload
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          PNG, JPEG, or WebP up to 2MB
        </p>
      </div>
    </div>
  )
}