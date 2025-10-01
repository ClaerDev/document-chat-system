'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, X, Image, ExternalLink, Building2, Palette, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type ImageType = 'logo' | 'banner' | 'contact-profile'

interface OrganizationImageUploadProps {
  imageType: ImageType
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  disabled?: boolean
  className?: string
}

const imageTypeConfig = {
  logo: {
    label: 'Organization Logo',
    description: 'Upload your organization logo (recommended: 200x200px, max 2MB)',
    icon: Building2,
    maxFileSize: 2,
    acceptedTypes: ['image/png', 'image/jpeg', 'image/webp'],
    previewSize: 'md' as const,
    dimensions: 'Recommended: 200x200px or square aspect ratio'
  },
  banner: {
    label: 'Organization Banner',
    description: 'Upload a banner image for your organization profile (recommended: 1200x300px, max 5MB)',
    icon: Palette,
    maxFileSize: 5,
    acceptedTypes: ['image/png', 'image/jpeg', 'image/webp'],
    previewSize: 'lg' as const,
    dimensions: 'Recommended: 1200x300px or 4:1 aspect ratio'
  },
  'contact-profile': {
    label: 'Contact Profile Image',
    description: 'Upload a profile image for the primary contact (recommended: 150x150px, max 1MB)',
    icon: User,
    maxFileSize: 1,
    acceptedTypes: ['image/png', 'image/jpeg', 'image/webp'],
    previewSize: 'md' as const,
    dimensions: 'Recommended: 150x150px or square aspect ratio'
  },
}

export function OrganizationImageUpload({
  imageType,
  value,
  onChange,
  onRemove,
  disabled = false,
  className
}: OrganizationImageUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Skip health check - let actual upload attempts determine availability
  // The authentication requirements make health checks complex
  useEffect(() => {
    // Service is assumed available by default
    // Real errors will be caught during actual upload attempts
    console.log('OrganizationImageUpload component mounted for type:', imageType)
  }, [imageType])

  const config = imageTypeConfig[imageType]
  const IconComponent = config.icon

  const previewSizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',  
    lg: 'w-32 h-20', // Different aspect for banner
  }


  const handleFileUpload = async (file: File) => {
    setError('')
    setIsLoading(true)

    try {
      // Validate file
      if (!config.acceptedTypes.includes(file.type)) {
        throw new Error(
          `Invalid file type. Accepted types: ${config.acceptedTypes.join(', ')}`
        )
      }

      if (file.size > config.maxFileSize * 1024 * 1024) {
        throw new Error(`File size must be less than ${config.maxFileSize}MB`)
      }

      // Create FormData for upload using existing storage endpoint
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', imageType) // This will create the proper folder structure

      // Upload to existing storage endpoint
      const response = await fetch('/api/v1/storage/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const text = await response.text()
        console.error('Upload response error:', {
          status: response.status,
          statusText: response.statusText,
          body: text
        })
        
        // Handle specific error cases with user-friendly messages
        if (response.status === 503) {
          throw new Error('File upload service is currently unavailable. Please contact support.')
        } else if (response.status === 413) {
          throw new Error('File is too large. Please choose a smaller file.')
        } else if (response.status === 400) {
          const errorData = JSON.parse(text || '{}')
          throw new Error(errorData.error || 'Invalid file. Please check the file type and size.')
        } else {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
        }
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        const text = await response.text()
        console.error('JSON parse error:', parseError)
        console.error('Response body:', text)
        throw new Error('Invalid response from server')
      }

      if (data.success) {
        const imageUrl = data.data.url
        onChange(imageUrl)
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleRemove = async () => {
    if (!value) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // Delete the file from storage
      const response = await fetch(`/api/v1/storage/delete?url=${encodeURIComponent(value)}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete file')
      }
      
      // Clear the form state
      onChange('')
      if (onRemove) {
        onRemove()
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      console.log(`${config.label} deleted successfully from storage`)
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file'
      setError(`Delete failed: ${message}`)
      console.error(`Failed to delete ${config.label}:`, err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconComponent className="h-5 w-5" />
          {config.label}
        </CardTitle>
        <CardDescription>
          {config.description}
          <br />
          <span className="text-xs text-muted-foreground">{config.dimensions}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}


        {/* File Upload Area */}
        <div className="space-y-2">
          <Label>Upload File</Label>
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 transition-colors',
              'hover:border-primary/50 hover:bg-muted/50',
              disabled || isLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer',
              error ? 'border-destructive' : 'border-muted-foreground/25'
            )}
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !disabled && !isLoading && fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isLoading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {config.acceptedTypes.map(type => type.split('/')[1]).join(', ').toUpperCase()} up to {config.maxFileSize}MB
                </p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={config.acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isLoading}
          />
        </div>

        {/* Image Preview */}
        {value && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Preview</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isLoading}
              >
                <X className="h-4 w-4" />
                {isLoading ? 'Removing...' : 'Remove'}
              </Button>
            </div>
            <div className="flex items-center space-x-3">
              <div className={cn(
                'relative rounded-lg border overflow-hidden bg-muted',
                previewSizes[config.previewSize],
                imageType === 'banner' ? 'aspect-[4/1]' : 'aspect-square'
              )}>
                <img
                  src={value}
                  alt={`${config.label} preview`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error(`${config.label} image failed to load:`, value)
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.nextElementSibling?.classList.remove('hidden')
                  }}
                  onLoad={() => {
                    console.log(`${config.label} image loaded successfully:`, value)
                  }}
                />
                <div className="hidden absolute inset-0 flex items-center justify-center">
                  <Image className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{config.label} Image</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(value, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Full Size
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}