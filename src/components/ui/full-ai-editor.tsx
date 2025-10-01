'use client';

import * as React from 'react';
import { usePlateEditor, Plate, PlateContent } from 'platejs/react';
import { CompleteEditorKit } from '@/components/editor/editor-complete-kit';
import { FixedToolbar } from './fixed-toolbar';
// import { FixedToolbarButtons } from './fixed-toolbar-buttons';
import { FloatingToolbar } from './floating-toolbar';
import { cn } from '@/lib/utils';

export interface FullAIEditorProps {
  content?: string;
  placeholder?: string;
  onChange?: (content: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  editable?: boolean;
  className?: string;
  variant?: 'default' | 'demo' | 'fullWidth' | 'ai' | 'select' | 'none';
  minHeight?: string;
  maxHeight?: string;
  
  // Toolbar options
  showFixedToolbar?: boolean;
  showFloatingToolbar?: boolean;
  toolbarClassName?: string;
  
  // Feature flags
  enableAI?: boolean;
  enableComments?: boolean;
  enableMentions?: boolean;
  enableTables?: boolean;
  enableMedia?: boolean;
  enableMath?: boolean;
  enableColumns?: boolean;
  enableDragDrop?: boolean;
  
  // AI-specific props
  aiModel?: string;
  aiProvider?: string;
  
  // Additional props
  readOnly?: boolean;
  autoFocus?: boolean;
  spellCheck?: boolean;
}

export const FullAIEditor = React.memo(function FullAIEditor({
  content = '',
  placeholder = 'Start typing...',
  onChange,
  onFocus,
  onBlur,
  className,
  minHeight = '300px',
  maxHeight,
  readOnly = false,
  autoFocus = false,
  spellCheck = true,
}: FullAIEditorProps) {
  
  // Convert HTML content to Slate.js format
  const initialValue = React.useMemo(() => {
    if (!content || content.trim() === '') {
      return [
        {
          type: 'p',
          children: [{ text: '' }],
        },
      ];
    }

    // Simple HTML to Slate conversion
    try {
      const textContent = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .trim();

      if (!textContent) {
        return [{ type: 'p', children: [{ text: '' }] }];
      }

      // Split by lines and create paragraphs
      const lines = textContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return [{ type: 'p', children: [{ text: '' }] }];
      }

      return lines.map(line => ({
        type: 'p',
        children: [{ text: line.trim() }],
      }));
    } catch (error) {
      console.warn('Error parsing content:', error);
      return [{ type: 'p', children: [{ text: content }] }];
    }
  }, [content]);

  // Handle content change
  const handleChange = React.useCallback((newValue: any) => {
    if (!onChange || !Array.isArray(newValue)) return;

    try {
      // Convert Slate nodes back to HTML
      let htmlContent = '';
      
      for (const node of newValue) {
        if (node.type === 'h1') {
          const text = node.children?.map((child: any) => child.text).join('') || '';
          htmlContent += `<h1>${text}</h1>\n`;
        } else if (node.type === 'h2') {
          const text = node.children?.map((child: any) => child.text).join('') || '';
          htmlContent += `<h2>${text}</h2>\n`;
        } else if (node.type === 'h3') {
          const text = node.children?.map((child: any) => child.text).join('') || '';
          htmlContent += `<h3>${text}</h3>\n`;
        } else if (node.type === 'blockquote') {
          const text = node.children?.map((child: any) => child.text).join('') || '';
          htmlContent += `<blockquote>${text}</blockquote>\n`;
        } else if (node.type === 'ul') {
          // Handle unordered lists
          const listItems = node.children?.map((item: any) => {
            const itemText = item.children?.map((child: any) => child.text).join('') || '';
            return `<li>${itemText}</li>`;
          }).join('') || '';
          htmlContent += `<ul>${listItems}</ul>\n`;
        } else if (node.type === 'ol') {
          // Handle ordered lists
          const listItems = node.children?.map((item: any) => {
            const itemText = item.children?.map((child: any) => child.text).join('') || '';
            return `<li>${itemText}</li>`;
          }).join('') || '';
          htmlContent += `<ol>${listItems}</ol>\n`;
        } else {
          // Default to paragraph
          const text = node.children?.map((child: any) => {
            let childText = child.text || '';
            
            // Handle formatting marks
            if (child.bold) childText = `<strong>${childText}</strong>`;
            if (child.italic) childText = `<em>${childText}</em>`;
            if (child.underline) childText = `<u>${childText}</u>`;
            if (child.strikethrough) childText = `<s>${childText}</s>`;
            if (child.code) childText = `<code>${childText}</code>`;
            
            return childText;
          }).join('') || '';
          
          if (text.trim()) {
            htmlContent += `<p>${text}</p>\n`;
          }
        }
      }

      onChange(htmlContent.trim() || '<p></p>');
    } catch (error) {
      console.warn('Error handling editor change:', error);
    }
  }, [onChange]);

  // Create editor instance
  const editor = usePlateEditor({
    plugins: CompleteEditorKit,
    value: initialValue,
    onChange: handleChange,
  });

  if (!editor) {
    return (
      <div className="border rounded-lg p-4 bg-muted/20 animate-pulse">
        <div className="h-4 bg-muted rounded mb-2"></div>
        <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  const containerStyle = {
    minHeight,
    ...(maxHeight && { maxHeight }),
  };

  return (
    <div className={cn('w-full border rounded-lg', className)} style={containerStyle}>
      <Plate editor={editor}>
        {/* Fixed Toolbar - Always visible when editing */}
        {!readOnly && (
          <FixedToolbar>
            <div className="flex gap-1 p-2">
              <span className="text-sm text-muted-foreground">Rich Text Editing (Basic Mode)</span>
            </div>
          </FixedToolbar>
        )}
        
        {/* Editor Content Area */}
        <div className="relative">
          <PlateContent
            placeholder={placeholder}
            onFocus={onFocus}
            onBlur={onBlur}
            readOnly={readOnly}
            autoFocus={autoFocus}
            spellCheck={spellCheck}
            className="min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none"
            style={{ minHeight }}
          />
          
          {/* Floating Toolbar - Appears on text selection */}
          {!readOnly && <FloatingToolbar />}
        </div>
      </Plate>
    </div>
  );
});

export default FullAIEditor;