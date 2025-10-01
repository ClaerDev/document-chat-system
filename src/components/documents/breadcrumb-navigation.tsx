'use client'

import React from 'react'
import { ChevronRight, Home, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BreadcrumbItem {
  id: string | null
  name: string
  color?: string
}

interface BreadcrumbNavigationProps {
  path: BreadcrumbItem[]
  onNavigate: (folderId: string | null) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, targetFolderId: string | null) => void
  className?: string
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  path,
  onNavigate,
  onDragOver,
  onDrop,
  className = ''
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver?.(e)
  }

  const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    onDrop?.(e, targetFolderId)
  }

  return (
    <nav className={`flex items-center gap-1 text-sm ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        onClick={() => onNavigate(null)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, null)}
      >
        <Home size={16} className="mr-1" />
        Documents
      </Button>
      
      {path.length > 0 && (
        <ChevronRight size={16} className="text-gray-400" />
      )}
      
      {path.map((item, index) => (
        <React.Fragment key={item.id || 'root'}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => onNavigate(item.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, item.id)}
          >
            <Folder 
              size={16} 
              className="mr-1" 
              style={{ color: item.color || '#6b7280' }}
            />
            <span className="truncate max-w-32">{item.name}</span>
          </Button>
          
          {index < path.length - 1 && (
            <ChevronRight size={16} className="text-gray-400" />
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
