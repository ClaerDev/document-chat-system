'use client'

import * as React from "react"
import { OfficialPlateAIEditor } from "./official-plate-ai-editor"
import { cn } from "@/lib/utils"

interface SimpleTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  maxLength?: number
  showToolbar?: boolean
  height?: string
}

export function SimpleTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  maxLength,
  showToolbar = true,
  height = "120px"
}: SimpleTextEditorProps) {
  const handleChange = React.useCallback((content: string) => {
    if (maxLength) {
      // Simple text length check - could be enhanced for better HTML handling
      const textContent = content.replace(/<[^>]*>/g, '').trim()
      if (textContent.length > maxLength) {
        return // Don't update if over max length
      }
    }
    onChange(content)
  }, [onChange, maxLength])

  return (
    <OfficialPlateAIEditor
      content={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn("border rounded-lg", className)}
      minHeight={height}
      maxHeight={height}
      showToolbar={showToolbar}
    />
  )
}