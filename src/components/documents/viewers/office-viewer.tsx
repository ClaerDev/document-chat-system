'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OfficeViewerProps {
  file: File
  fileName: string
  fileType: 'docx' | 'xlsx' | 'pptx'
  onDownload: () => void
}

export const OfficeViewer: React.FC<OfficeViewerProps> = ({ 
  file, 
  fileName, 
  fileType,
  onDownload 
}) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [, setContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // For now, show a placeholder message about Office file support
    // In the future, we can implement actual parsing using the installed libraries
    setLoading(false)
    setError(`${fileType.toUpperCase()} preview coming soon - advanced document parsing with docx-preview, SheetJS, and pptxjs libraries`)
  }, [file, fileType])

  const getFileIcon = () => {
    switch (fileType) {
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'xlsx':
        return <FileText className="h-4 w-4 text-green-600" />
      case 'pptx':
        return <FileText className="h-4 w-4 text-orange-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getFileTypeLabel = () => {
    switch (fileType) {
      case 'docx':
        return 'Word Document'
      case 'xlsx':
        return 'Excel Spreadsheet'
      case 'pptx':
        return 'PowerPoint Presentation'
      default:
        return 'Office Document'
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <p className="text-sm">Loading {fileType.toUpperCase()} content...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-background">
        <div className="flex items-center gap-2">
          {getFileIcon()}
          <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              // Open in Office Online (if available)
              const url = URL.createObjectURL(file)
              window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`, '_blank')
            }}
          >
            <ExternalLink size={16} className="mr-2" />
            View Online
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download size={16} className="mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center bg-muted/20 p-8">
        <div className="text-center max-w-md">
          {getFileIcon()}
          <div className="mt-4 mb-6">
            {getFileIcon()}
          </div>
          <h3 className="text-lg font-semibold mb-2">{getFileTypeLabel()}</h3>
          <p className="text-sm text-muted-foreground mb-4">{fileName}</p>
          <p className="text-xs text-muted-foreground mb-6">
            {error || `${fileType.toUpperCase()} preview functionality is being developed using specialized libraries for document parsing and rendering.`}
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => {
                // Try Office Online viewer
                const url = URL.createObjectURL(file)
                window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`, '_blank')
              }}
            >
              <ExternalLink size={16} className="mr-2" />
              View in Office Online
            </Button>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download size={16} className="mr-2" />
              Download File
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}