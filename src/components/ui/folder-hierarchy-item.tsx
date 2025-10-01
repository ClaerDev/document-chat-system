import React from 'react'
import { Folder } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FolderHierarchyItemProps {
  folder: {
    id: string
    name: string
    color?: string
    level?: number
  }
  onClick?: () => void
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

export function FolderHierarchyItem({ 
  folder, 
  onClick, 
  disabled = false, 
  className,
  children 
}: FolderHierarchyItemProps) {
  return (
    <div 
      className={cn(
        "flex items-center w-full cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-sm transition-colors",
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
        className
      )}
      onClick={disabled ? undefined : onClick}
      style={{ paddingLeft: `${8 + (folder.level || 0) * 16}px` }}
    >
      {/* Hierarchy Connector */}
      {(folder.level || 0) > 0 && (
        <div className="flex items-center mr-1">
          <div 
            className="w-3 h-3 border-l-2 border-b-2 border-gray-300 mr-1"
            style={{ 
              borderBottomLeftRadius: '3px',
              marginTop: '-6px',
              marginBottom: '6px'
            }}
          />
        </div>
      )}
      
      {/* Folder Icon */}
      <Folder 
        size={14} 
        className="mr-2 flex-shrink-0" 
        style={{ color: folder.color || '#6b7280' }}
      />
      
      {/* Folder Name */}
      <span className="truncate">{folder.name}</span>
      
      {/* Additional Content */}
      {children}
    </div>
  )
}

// Hook to build folder hierarchy with levels
export function useFolderHierarchy(folders: Array<{ id: string; parentId: string | null }>) {
  return React.useMemo(() => {
    const buildHierarchy = (parentId: string | null = null, level: number = 0): Array<any> => {
      const result: Array<any> = []
      const children = folders.filter(f => f.parentId === parentId)
      
      children.forEach(folder => {
        result.push({ ...folder, level })
        const subFolders = buildHierarchy(folder.id, level + 1)
        result.push(...subFolders)
      })
      
      return result
    }
    
    return buildHierarchy()
  }, [folders])
}