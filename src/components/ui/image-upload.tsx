'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X, Image, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  label: string
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  disabled?: boolean
  required?: boolean
  className?: string
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
  placeholder?: string
  description?: string
  previewSize?: 'sm' | 'md' | 'lg'
}

export function ImageUpload({
  label,
  value,
  onChange,
  onRemove,
  disabled = false,
  required = false,
  className,
  maxFileSize = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  placeholder = 'Enter image URL or upload file',
  description,
  previewSize = 'md',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [urlInput, setUrlInput] = useState(value || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewSizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  const handleUrlChange = (url: string) => {
    setUrlInput(url)
    setError('')
    if (url.trim()) {
      onChange(url.trim())
    }
  }

  const handleFileUpload = async (file: File) => {
    setError('')
    setIsUploading(true)

    try {
      // Validate file
      if (!acceptedTypes.includes(file.type)) {
        throw new Error(
          `Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`
        )
      }

      if (file.size > maxFileSize * 1024 * 1024) {
        throw new Error(`File size must be less than ${maxFileSize}MB`)
      }

      // Create FormData for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'profile-image')

      // Upload to your file storage service
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
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
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
        setUrlInput(imageUrl)
        onChange(imageUrl)
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
    } finally {
      setIsUploading(false)
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
    
    setIsUploading(true)
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
      setUrlInput('')
      onChange('')
      if (onRemove) {
        onRemove()
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      console.log('Image deleted successfully from storage')
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file'
      setError(`Delete failed: ${message}`)
      console.error('Failed to delete image:', err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={`image-upload-${label}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {/* URL Input */}
        <div className="space-y-2">
          <Input
            id={`image-upload-${label}`}
            type="url"
            value={urlInput}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isUploading}
          />
        </div>

        {/* File Upload Area */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 transition-colors',
            'hover:border-primary/50 hover:bg-muted/50',
            disabled || isUploading
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer',
            error ? 'border-destructive' : 'border-muted-foreground/25'
          )}
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-muted-foreground">
                {acceptedTypes.map(type => type.split('/')[1]).join(', ').toUpperCase()} up to {maxFileSize}MB
              </p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </div>

      {/* Image Preview */}
      {value && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Preview</Label>
          <div className="flex items-center space-x-3">
            <div className={cn(
              'relative rounded-lg border overflow-hidden bg-muted',
              previewSizes[previewSize]
            )}>
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Image failed to load:', value)
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', value)
                }}
              />
              <div className="hidden absolute inset-0 flex items-center justify-center">
                <Image className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{value}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(value, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}