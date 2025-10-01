'use client'

import React from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface DocumentChatToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  isLoading: boolean
  documentCount: number
}

export function DocumentChatToggle({ 
  enabled, 
  onToggle, 
  isLoading, 
  documentCount 
}: DocumentChatToggleProps) {
  const hasDocuments = documentCount > 0

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-md">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="font-medium flex items-center gap-2">
            Document Chat
            {enabled && hasDocuments && (
              <Badge variant="outline" className="text-xs">
                {documentCount} docs available
              </Badge>
            )}
            {!hasDocuments && (
              <Badge variant="secondary" className="text-xs">
                No documents
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {!hasDocuments 
              ? 'Upload documents to enable AI search'
              : enabled 
                ? 'Chat with your documents using AI search' 
                : 'Enable to search and chat with your documents'
            }
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Switch 
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={isLoading || !hasDocuments}
          aria-label="Toggle document chat"
        />
      </div>
    </div>
  )
}