'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { FolderPlus, Upload } from 'lucide-react'

interface DocumentsHeaderProps {
  currentDocuments: any[]
  isBulkActionMode: boolean
  stats: {
    totalSize: string
  }
  onCreateFolder: () => void
  onOpenUploadModal: () => void
}

export function DocumentsHeader({
  currentDocuments,
  isBulkActionMode,
  stats,
  onCreateFolder,
  onOpenUploadModal
}: DocumentsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Organize and manage your documents with AI-powered analysis
          {!isBulkActionMode && currentDocuments.length > 0 && (
            <span className="ml-2 text-sm">
              • {currentDocuments.length} {currentDocuments.length === 1 ? 'document' : 'documents'}
            </span>
          )}
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>{stats.totalSize}</span>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={onCreateFolder}
        >
          <FolderPlus size={16} className="mr-2" />
          New Folder
        </Button>
        <Button 
          size="sm"
          onClick={onOpenUploadModal}
        >
          <Upload size={16} className="mr-2" />
          Upload
        </Button>
      </div>
    </div>
  )
}