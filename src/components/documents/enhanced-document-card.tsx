'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Download,
  Eye,
  Edit3,
  Move,
  Trash2,
  BarChart3,
  Brain,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import {
  getDocumentIcon,
  getFileTypeBadgeClass,
  formatDateOnly,
  formatFileSize
} from './file-type-utils'
import { DocumentThumbnail } from './document-thumbnail'

interface DocumentScore {
  overallScore: number
  confidence: number
  scoredAt: Date
}

interface EnhancedDocumentCardProps {
  document: {
    id: string
    name: string
    type: string
    size: string
    folderId: string | null
    uploadDate: string
    lastModified: string
    mimeType?: string
    filePath?: string
    extractedText?: string
    originalFile?: File
    metadata?: {
      tags?: string[]
      aiScore?: DocumentScore
      aiAnalysis?: any
      lastScoredAt?: string
      isCreatedDocument?: boolean
    }
    isEditable?: boolean
  }
  
  // Selection state
  isSelected: boolean
  onSelect: (docId: string, selected: boolean) => void
  showSelection: boolean
  
  // Actions
  onView: (doc: any) => void
  onEdit: (doc: any) => void
  onMove: (docId: string) => void
  onDelete: (docId: string) => void
  onDownload: (doc: any) => void
  onScore: (docId: string) => void
  onAnalyze: (docId: string) => void
  
  // View mode
  viewMode: 'grid' | 'list'
  
  // Drag and drop
  onDragStart?: (e: React.DragEvent, doc: any) => void
  onDragEnd?: () => void
}

export function EnhancedDocumentCard({
  document,
  isSelected,
  onSelect,
  showSelection,
  onView,
  onEdit,
  onMove,
  onDelete,
  onDownload,
  onScore,
  onAnalyze,
  viewMode,
  onDragStart,
  onDragEnd
}: EnhancedDocumentCardProps) {
  const documentIcon = getDocumentIcon(document.type)
  const badgeClass = getFileTypeBadgeClass(document.type)
  const aiScore = (document as any).analysis?.qualityScore || 0
  const hasAnalysis = !!(document as any).analysis
  const isCreatedDoc = document.isEditable // Documents created in platform are editable

  // Get score status
  const getScoreStatus = () => {
    if (!aiScore) return { status: 'unscored', color: 'text-muted-foreground', icon: Clock }
    if (aiScore >= 8) return { status: 'excellent', color: 'text-green-600', icon: CheckCircle }
    if (aiScore >= 6) return { status: 'good', color: 'text-blue-600', icon: CheckCircle }
    if (aiScore >= 4) return { status: 'fair', color: 'text-yellow-600', icon: AlertCircle }
    return { status: 'poor', color: 'text-red-600', icon: XCircle }
  }

  const scoreStatus = getScoreStatus()
  const ScoreIcon = scoreStatus.icon

  if (viewMode === 'list') {
    return (
      <div 
        className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors group ${
          isSelected ? 'border-primary bg-primary/5' : ''
        }`}
        draggable
        onDragStart={(e) => onDragStart?.(e, document)}
        onDragEnd={onDragEnd}
      >
        {/* Selection checkbox */}
        {showSelection && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(document.id, Boolean(checked))}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        {/* Document icon */}
        <div className="flex-shrink-0">
          {documentIcon}
        </div>
        
        {/* Document info */}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onView(document)}
        >
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{document.name}</h3>
            <Badge className={badgeClass}>
              {document.type}
            </Badge>
            {isCreatedDoc && (
              <Badge variant="outline" className="text-xs">
                Created
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{formatFileSize(document.size)}</span>
            <span>{formatDateOnly(document.uploadDate)}</span>
            
            {/* AI Score indicator */}
            <div className={`flex items-center gap-1 ${scoreStatus.color}`}>
              <ScoreIcon size={12} />
              {aiScore ? (
                <span>{Math.round(aiScore)}/10</span>
              ) : (
                <span>Not scored</span>
              )}
            </div>
            
            {hasAnalysis && (
              <Badge variant="secondary" className="text-xs">
                <Brain size={10} className="mr-1" />
                Analyzed
              </Badge>
            )}
          </div>
        </div>
        
        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {document.tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {document.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{document.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
        
        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(document)}>
              <Eye size={16} className="mr-2" />
              View
            </DropdownMenuItem>
            
            {document.isEditable && (
              <DropdownMenuItem onClick={() => onEdit(document)}>
                <Edit3 size={16} className="mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => onScore(document.id)}>
              <BarChart3 size={16} className="mr-2" />
              Score Document
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onAnalyze(document.id)}>
              <Brain size={16} className="mr-2" />
              AI Analysis
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => onDownload(document)}>
              <Download size={16} className="mr-2" />
              Download
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onMove(document.id)}>
              <Move size={16} className="mr-2" />
              Move
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => onDelete(document.id)}
              className="text-destructive"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Grid view
  return (
    <div 
      className={`group relative border rounded-lg p-4 hover:bg-accent/50 transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : ''
      }`}
      draggable
      onDragStart={(e) => onDragStart?.(e, document)}
      onDragEnd={onDragEnd}
    >
      {/* Selection checkbox */}
      {showSelection && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(document.id, Boolean(checked))}
            onClick={(e) => e.stopPropagation()}
            className="bg-background border-2"
          />
        </div>
      )}
      
      {/* Actions button */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(document)}>
              <Eye size={16} className="mr-2" />
              View
            </DropdownMenuItem>
            
            {document.isEditable && (
              <DropdownMenuItem onClick={() => onEdit(document)}>
                <Edit3 size={16} className="mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => onScore(document.id)}>
              <BarChart3 size={16} className="mr-2" />
              Score Document
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onAnalyze(document.id)}>
              <Brain size={16} className="mr-2" />
              AI Analysis
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => onDownload(document)}>
              <Download size={16} className="mr-2" />
              Download
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onMove(document.id)}>
              <Move size={16} className="mr-2" />
              Move
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => onDelete(document.id)}
              className="text-destructive"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Document icon and score indicator */}
      <div 
        className="flex flex-col items-center text-center cursor-pointer"
        onClick={() => onView(document)}
      >
        <div className="relative mb-3">
          <DocumentThumbnail 
            document={document}
            size={80}
            className="mx-auto"
          />
          
          {/* Score overlay */}
          {aiScore && (
            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center ${
              scoreStatus.status === 'excellent' ? 'bg-green-500' :
              scoreStatus.status === 'good' ? 'bg-blue-500' :
              scoreStatus.status === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              <span className="text-xs font-bold text-white">
                {Math.round(aiScore / 10)}
              </span>
            </div>
          )}
        </div>
        
        <div className="w-full">
          <div className="flex flex-col items-center gap-1 mb-2">
            <h3 className="font-medium text-sm line-clamp-2 text-center">
              {document.name}
            </h3>
            
            <div className="flex items-center gap-1">
              <Badge className={badgeClass}>
                {document.type}
              </Badge>
              {isCreatedDoc && (
                <Badge variant="outline" className="text-xs">
                  Created
                </Badge>
              )}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center mb-2">
            <div>{formatFileSize(document.size)}</div>
            <div>{formatDateOnly(document.uploadDate)}</div>
          </div>
          
          {/* AI indicators */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`flex items-center gap-1 text-xs ${scoreStatus.color}`}>
              <ScoreIcon size={12} />
              {aiScore ? (
                <span>{Math.round(aiScore)}</span>
              ) : (
                <span>-</span>
              )}
            </div>
            
            {hasAnalysis && (
              <Brain size={12} className="text-primary" />
            )}
          </div>
          
          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1">
              {document.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {document.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{document.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}