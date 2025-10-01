'use client'

import React from 'react'
import { Trash2, AlertTriangle, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FilePreview } from './file-preview'
import { getDocumentIcon, getFileTypeFromMimeType, getFileTypeBadgeClass, formatFileSize } from './file-type-utils'
import type { Document } from '@/types/documents'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  document: Document | null
  isDeleting?: boolean
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  document,
  isDeleting = false
}) => {
  if (!document) return null

  // Get file type for icons and badges from mimeType and name
  const fileType = getFileTypeFromMimeType(document.mimeType, document.name)

  const getFileTypeBadge = (type: string) => {
    const colors = {
      pdf: 'bg-red-100 text-red-700 border-red-200',
      word: 'bg-blue-100 text-blue-700 border-blue-200',
      excel: 'bg-green-100 text-green-700 border-green-200',
      powerpoint: 'bg-orange-100 text-orange-700 border-orange-200',
      image: 'bg-purple-100 text-purple-700 border-purple-200',
      video: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      audio: 'bg-pink-100 text-pink-700 border-pink-200',
      archive: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      code: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      text: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    
    return (
      <Badge className={`text-xs border ${colors[type as keyof typeof colors] || colors.text}`}>
        {type.toUpperCase()}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Document
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this document? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* File Preview */}
            <div className="bg-muted/30 rounded-lg border overflow-hidden flex flex-col">
              <div className="p-3 border-b bg-background/50">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  File Preview
                </h3>
              </div>
              <div className="flex-1 p-3">
                <div className="h-[300px] lg:h-[350px] bg-background rounded border">
                  <FilePreview document={{
                    ...document,
                    type: fileType,
                    size: String(document.size)
                  }} />
                </div>
              </div>
            </div>

            {/* File Details */}
            <div className="space-y-4">
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-destructive mb-1">
                      Permanent Deletion
                    </h3>
                    <p className="text-sm text-destructive/80">
                      This document will be permanently deleted from your system. You will not be able to recover it.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-foreground border-b pb-2">
                  Document Information
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getDocumentIcon(fileType)}
                    <span className="font-medium text-foreground truncate flex-1">
                      {document.name}
                    </span>
                    {getFileTypeBadge(fileType)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <span className="ml-2 font-medium">{formatFileSize(document.size)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 font-medium">{fileType}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <span className="text-muted-foreground">Uploaded:</span>
                    <span className="ml-2 font-medium">{formatDate(document.uploadDate)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 mb-1">
                      Before you delete
                    </h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• Make sure you have a backup if needed</li>
                      <li>• Check if this file is referenced elsewhere</li>
                      <li>• This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isDeleting}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}