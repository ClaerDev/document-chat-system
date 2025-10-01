'use client'

import * as React from "react"
import { OfficialPlateAIEditor } from "./official-plate-ai-editor"

export interface RichTextEditorProps {
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
  toolbarClassName?: string
}

export const RichTextEditor: React.FC<RichTextEditorProps> = (props) => {
  return <OfficialPlateAIEditor {...props} />
}

export default RichTextEditor