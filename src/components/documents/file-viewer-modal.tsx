'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, X, FileIcon } from 'lucide-react'
import { FilePreview } from './file-preview'

interface FileViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: {
    id: string
    name: string
    mimeType?: string
    filePath?: string
    type: string
    size: string | number
    extractedText?: string
    originalFile?: File
  }
}

export function FileViewerModal({ open, onOpenChange, document }: FileViewerModalProps) {
  const [error, setError] = useState<string | null>(null)
  
  const handleDownload = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/v1/documents/${document.id}/download`)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = document.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download file')
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileIcon className="h-5 w-5" />
              {document.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <FilePreview 
            document={document}
            className="w-full h-full min-h-[600px]"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}