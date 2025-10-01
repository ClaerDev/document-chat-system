import React, { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface EditableBadgeProps {
  label: string
  onDelete: () => void
  onEdit: (newLabel: string) => void
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
}

const EditableBadge: React.FC<EditableBadgeProps> = ({ 
  label, 
  onDelete, 
  onEdit, 
  variant = 'secondary',
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    const trimmedValue = editValue.trim()
    if (trimmedValue && trimmedValue !== label) {
      onEdit(trimmedValue)
    }
    setIsEditing(false)
    setEditValue(trimmedValue || label)
  }

  const handleCancel = () => {
    setEditValue(label)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 min-w-[60px]"
        style={{ width: `${Math.max(editValue.length * 8 + 16, 60)}px` }}
      />
    )
  }

  return (
    <Badge 
      variant={variant} 
      className={`cursor-pointer select-none flex items-center gap-1 ${className}`}
    >
      <span onClick={handleEdit}>
        {label}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="rounded-sm hover:bg-destructive/20 p-0.5"
        type="button"
        title={`Remove "${label}"`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
}

interface EditableBadgeItem {
  id: string | number
  label: string
}

interface EditableBadgeInputProps {
  items: EditableBadgeItem[]
  onItemsChange: (items: EditableBadgeItem[]) => void
  placeholder?: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
  maxItems?: number
  allowDuplicates?: boolean
}

export const EditableBadgeInput: React.FC<EditableBadgeInputProps> = ({
  items = [],
  onItemsChange,
  placeholder = "Type and press Enter to add...",
  variant = 'secondary',
  className = '',
  maxItems,
  allowDuplicates = false
}) => {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDelete = (id: string | number) => {
    const updatedItems = items.filter(item => item.id !== id)
    onItemsChange(updatedItems)
  }

  const handleEdit = (id: string | number, newLabel: string) => {
    const updatedItems = items.map(item => 
      item.id === id ? { ...item, label: newLabel } : item
    )
    onItemsChange(updatedItems)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      
      const trimmedValue = inputValue.trim()
      
      // Check for duplicates if not allowed
      if (!allowDuplicates && items.some(item => 
        item.label.toLowerCase() === trimmedValue.toLowerCase()
      )) {
        setInputValue('')
        return
      }

      // Check max items limit
      if (maxItems && items.length >= maxItems) {
        setInputValue('')
        return
      }

      // Generate new ID
      const newId = items.length > 0 
        ? Math.max(...items.map(item => typeof item.id === 'number' ? item.id : 0)) + 1
        : 1

      const newItems = [...items, { id: newId, label: trimmedValue }]
      onItemsChange(newItems)
      setInputValue('')
    } else if (e.key === 'Backspace' && inputValue === '' && items.length > 0) {
      // Delete last item when backspace is pressed on empty input
      e.preventDefault()
      const updatedItems = items.slice(0, -1)
      onItemsChange(updatedItems)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div 
      onClick={handleContainerClick}
      className={`flex flex-wrap items-center gap-1 p-2 border border-input rounded-md bg-background cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:border-ring transition-all duration-200 min-h-[36px] ${className}`}
    >
      {items.map((item) => (
        <EditableBadge
          key={item.id}
          label={item.label}
          variant={variant}
          onDelete={() => handleDelete(item.id)}
          onEdit={(newLabel) => handleEdit(item.id, newLabel)}
        />
      ))}
      
      <input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        placeholder={items.length === 0 ? placeholder : ""}
        className="flex-1 outline-none bg-transparent text-sm min-w-[120px] placeholder:text-muted-foreground"
        disabled={maxItems ? items.length >= maxItems : false}
      />

      {maxItems && (
        <div className="text-xs text-muted-foreground ml-auto">
          {items.length}/{maxItems}
        </div>
      )}
    </div>
  )
}

export default EditableBadgeInput