'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  Plus, 
  Download, 
  Trash2, 
  BarChart3, 
  Brain, 
  X,
  CheckSquare,
  Square
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface EnhancedDocumentsToolbarProps {
  // Upload functionality
  onUploadClick: () => void
  onCreateDocumentClick: () => void
  
  // Batch selection
  selectedDocuments: string[]
  totalDocuments: number
  onSelectAll: () => void
  onClearSelection: () => void
  
  // Batch operations
  onBatchScore: () => void
  onBatchAnalyze: () => void
  onBatchDownload: () => void
  onBatchDelete: () => void
  
  // Loading states
  isBatchProcessing: boolean
  isUploading: boolean
}

export function EnhancedDocumentsToolbar({
  onUploadClick,
  onCreateDocumentClick,
  selectedDocuments,
  totalDocuments,
  onSelectAll,
  onClearSelection,
  onBatchScore,
  onBatchAnalyze,
  onBatchDownload,
  onBatchDelete,
  isBatchProcessing,
  isUploading
}: EnhancedDocumentsToolbarProps) {
  const hasSelection = selectedDocuments.length > 0
  const isAllSelected = selectedDocuments.length === totalDocuments && totalDocuments > 0

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      {/* Left side - Batch selection controls */}
      <div className="flex items-center gap-3">
        {totalDocuments > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={isAllSelected ? onClearSelection : onSelectAll}
              className="flex items-center gap-2"
            >
              {isAllSelected ? (
                <CheckSquare size={16} className="text-primary" />
              ) : (
                <Square size={16} />
              )}
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>
            
            {hasSelection && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {selectedDocuments.length} selected
                <button
                  onClick={onClearSelection}
                  className="ml-1 hover:bg-secondary-foreground/10 rounded-sm p-0.5"
                >
                  <X size={12} />
                </button>
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Center - Batch actions (shown when documents are selected) */}
      {hasSelection && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBatchScore}
            disabled={isBatchProcessing}
            className="flex items-center gap-2"
          >
            <BarChart3 size={16} />
            Score Selected ({selectedDocuments.length})
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onBatchAnalyze}
            disabled={isBatchProcessing}
            className="flex items-center gap-2"
          >
            <Brain size={16} />
            Analyze
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isBatchProcessing}>
                More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Batch Operations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onBatchDownload}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Download Selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onBatchDelete}
                className="flex items-center gap-2 text-destructive"
              >
                <Trash2 size={16} />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Right side - Create and Upload buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateDocumentClick}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Create Document
        </Button>
        
        <Button
          onClick={onUploadClick}
          size="sm"
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <Upload size={16} />
          {isUploading ? 'Uploading...' : 'Upload Files'}
        </Button>
      </div>
      
      {/* Processing indicator */}
      {isBatchProcessing && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Processing documents...
          </div>
        </div>
      )}
    </div>
  )
}