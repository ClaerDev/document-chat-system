'use client'

import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  maxLength?: number
  showToolbar?: boolean
  minHeight?: string
  minimal?: boolean
  advanced?: boolean
}

export function TextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  maxLength,
  showToolbar = true,
  minHeight = "100px",
  minimal = false,
  advanced = false
}: TextEditorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const currentLength = value.length

  return (
    <div className={cn("space-y-2", className)}>
      <Textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{ minHeight: minHeight }}
        className="resize-y"
      />
      {maxLength && (
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Plain text</span>
          <span className={cn(
            currentLength > maxLength * 0.9 ? 'text-orange-600' : '',
            currentLength >= maxLength ? 'text-red-600 font-medium' : ''
          )}>
            {currentLength.toLocaleString()}/{maxLength.toLocaleString()} characters
          </span>
        </div>
      )}
    </div>
  )
}