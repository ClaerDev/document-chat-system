'use client'

import React, { useState } from 'react'
import { FileText, Folder, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

export interface DocumentChatScope {
  mode: 'all-documents' | 'current-folder' | 'selected-documents'
  folderId?: string
  folderName?: string
  documentIds?: string[]
  documentCount?: number
}

interface DocumentScopeSelectorProps {
  currentScope: DocumentChatScope
  onScopeChange: (scope: DocumentChatScope) => void
  availableDocuments: Array<{id: string, name: string, folderId?: string, documentType?: string, folderName?: string, createdAt: string}>
  availableFolders: Array<{id: string, name: string}>
}

export function DocumentScopeSelector({ 
  currentScope, 
  onScopeChange, 
  availableDocuments, 
  availableFolders 
}: DocumentScopeSelectorProps) {
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [showDocumentDialog, setShowDocumentDialog] = useState(false)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>(
    currentScope.documentIds || []
  )
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    currentScope.folderId || ''
  )

  const scopeOptions = [
    { 
      value: 'all-documents', 
      label: `All Documents (${availableDocuments.length})`, 
      icon: FileText,
      description: 'Search across all your documents'
    },
    ...(availableFolders.length > 0 ? [{
      value: 'folder-select',
      label: currentScope.mode === 'current-folder' 
        ? `Folder: ${currentScope.folderName}` 
        : 'Select Folder',
      icon: Folder,
      description: 'Chat with documents in a specific folder'
    }] : []),
    { 
      value: 'document-select', 
      label: currentScope.mode === 'selected-documents'
        ? `${currentScope.documentIds?.length} Selected Documents`
        : 'Select Documents', 
      icon: CheckSquare,
      description: 'Chat with specific documents'
    }
  ]

  const handleScopeChange = (value: string) => {
    switch (value) {
      case 'all-documents':
        onScopeChange({
          mode: 'all-documents',
          documentCount: availableDocuments.length
        })
        break
      
      case 'folder-select':
        setShowFolderDialog(true)
        break
      
      case 'document-select':
        setShowDocumentDialog(true)
        break
    }
  }

  const handleFolderSelection = () => {
    const folder = availableFolders.find(f => f.id === selectedFolderId)
    if (folder) {
      const folderDocs = availableDocuments.filter(d => d.folderId === folder.id)
      onScopeChange({
        mode: 'current-folder',
        folderId: folder.id,
        folderName: folder.name,
        documentCount: folderDocs.length
      })
      setShowFolderDialog(false)
    }
  }

  const handleDocumentSelection = () => {
    if (selectedDocumentIds.length > 0) {
      onScopeChange({
        mode: 'selected-documents',
        documentIds: selectedDocumentIds,
        documentCount: selectedDocumentIds.length
      })
      setShowDocumentDialog(false)
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Select 
          value={currentScope.mode} 
          onValueChange={handleScopeChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(() => {
                const option = scopeOptions.find(
                  o => o.value === currentScope.mode || 
                       (o.value === 'folder-select' && currentScope.mode === 'current-folder') ||
                       (o.value === 'document-select' && currentScope.mode === 'selected-documents')
                )
                if (option) {
                  const Icon = option.icon
                  return (
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </div>
                  )
                }
                return null
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {scopeOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <option.icon className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {currentScope.documentCount !== undefined && (
          <div className="text-xs text-muted-foreground px-1">
            Searching {currentScope.documentCount} document{currentScope.documentCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Folder Selection Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Folder</DialogTitle>
            <DialogDescription>
              Choose a folder to search documents within
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <div className="space-y-2">
              {availableFolders.map(folder => {
                const folderDocCount = availableDocuments.filter(
                  d => d.folderId === folder.id
                ).length
                
                return (
                  <div
                    key={folder.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent",
                      selectedFolderId === folder.id && "bg-accent"
                    )}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{folder.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {folderDocCount} document{folderDocCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={selectedFolderId === folder.id}
                      onChange={() => setSelectedFolderId(folder.id)}
                      className="h-4 w-4"
                    />
                  </div>
                )
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleFolderSelection} disabled={!selectedFolderId}>
              Select Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Selection Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Documents</DialogTitle>
            <DialogDescription>
              Choose specific documents to include in your chat context
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <div className="space-y-2">
              {availableDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent"
                >
                  <Checkbox
                    id={doc.id}
                    checked={selectedDocumentIds.includes(doc.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDocumentIds([...selectedDocumentIds, doc.id])
                      } else {
                        setSelectedDocumentIds(
                          selectedDocumentIds.filter(id => id !== doc.id)
                        )
                      }
                    }}
                  />
                  <label
                    htmlFor={doc.id}
                    className="flex-1 cursor-pointer space-y-1"
                  >
                    <div className="font-medium">{doc.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {doc.documentType}
                      </Badge>
                      {doc.folderName && (
                        <span className="flex items-center gap-1">
                          <Folder className="h-3 w-3" />
                          {doc.folderName}
                        </span>
                      )}
                      <span>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {selectedDocumentIds.length} document{selectedDocumentIds.length !== 1 ? 's' : ''} selected
              </span>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setShowDocumentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleDocumentSelection} 
                  disabled={selectedDocumentIds.length === 0}
                >
                  Select Documents
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}