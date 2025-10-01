'use client'

import React from 'react'
import { Editor } from '@/components/blocks/editor-x/editor'
import { EditorState, SerializedEditorState } from "lexical"
import { cn } from '@/lib/utils'

export interface OfficialPlateAIEditorProps {
  content?: string
  placeholder?: string
  onChange?: (content: string) => void
  onFocus?: () => void
  onBlur?: () => void
  editable?: boolean
  className?: string
  minHeight?: string
  maxHeight?: string
  showToolbar?: boolean
}

export const OfficialPlateAIEditor: React.FC<OfficialPlateAIEditorProps> = ({
  content = '',
  placeholder = 'Start typing...',
  onChange,
  onFocus,
  onBlur,
  editable = true,
  className = '',
  minHeight = '200px',
  maxHeight = '400px',
  showToolbar = true,
}) => {
  const handleChange = React.useCallback((editorState: EditorState) => {
    if (onChange) {
      // Convert Lexical editor state to HTML
      const htmlString = editorState.read(() => {
        // Simple text extraction for now - could be enhanced to proper HTML
        const textContent = editorState.getEditorState()._nodeMap
        return JSON.stringify(textContent) // Basic serialization
      })
      onChange(htmlString)
    }
  }, [onChange])

  const handleSerializedChange = React.useCallback((serialized: SerializedEditorState) => {
    if (onChange) {
      // Convert serialized state to string for onChange
      const htmlString = JSON.stringify(serialized)
      onChange(htmlString)
    }
  }, [onChange])

  return (
    <div className={cn("", className)} style={{ minHeight, maxHeight }}>
      <Editor
        onChange={handleChange}
        onSerializedChange={handleSerializedChange}
      />
    </div>
  )
}

export default OfficialPlateAIEditor