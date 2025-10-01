'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface StableEditorProps {
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
  showToolbar?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
}

export const StableEditor = React.memo(function StableEditor({
  content = '',
  placeholder = 'Start typing...',
  onChange,
  onFocus,
  onBlur,
  editable = true,
  className,
  variant = 'default',
  minHeight = '200px',
  maxHeight,
  showToolbar = true,
  readOnly = false,
  autoFocus = false,
}: StableEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [currentContent, setCurrentContent] = React.useState(content);

  // Handle content changes
  const handleInput = React.useCallback(() => {
    if (!editorRef.current || !onChange) return;
    
    const newContent = editorRef.current.innerHTML;
    setCurrentContent(newContent);
    onChange(newContent);
  }, [onChange]);

  // Update content when prop changes
  React.useEffect(() => {
    if (editorRef.current && currentContent !== content) {
      editorRef.current.innerHTML = content || '';
      setCurrentContent(content);
    }
  }, [content, currentContent]);

  const containerStyle = {
    minHeight,
    ...(maxHeight && { maxHeight }),
  };

  return (
    <div className={cn('w-full max-w-full', className)} style={containerStyle}>
      {/* Simple Toolbar - Only show when editing and showToolbar is true */}
      {editable && showToolbar && (
        <div className="border border-b-0 rounded-t-lg bg-muted/30">
          <div className="overflow-x-auto max-w-full">
            <div className="flex items-center gap-1 p-2 w-max min-w-full">
              <button
                onClick={() => document.execCommand('bold')}
                className="flex-shrink-0 p-1.5 rounded text-sm font-bold hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Bold"
              >
                B
              </button>
              <button
                onClick={() => document.execCommand('italic')}
                className="flex-shrink-0 p-1.5 rounded text-sm italic hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Italic"
              >
                I
              </button>
              <button
                onClick={() => document.execCommand('underline')}
                className="flex-shrink-0 p-1.5 rounded text-sm underline hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Underline"
              >
                U
              </button>
              <div className="h-4 w-px bg-border mx-1 flex-shrink-0" />
              <button
                onClick={() => document.execCommand('formatBlock', false, 'h1')}
                className="flex-shrink-0 px-2 py-1.5 rounded text-sm font-bold hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Heading 1"
              >
                H1
              </button>
              <button
                onClick={() => document.execCommand('formatBlock', false, 'h2')}
                className="flex-shrink-0 px-2 py-1.5 rounded text-sm font-bold hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Heading 2"
              >
                H2
              </button>
              <button
                onClick={() => document.execCommand('formatBlock', false, 'h3')}
                className="flex-shrink-0 px-2 py-1.5 rounded text-sm font-bold hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Heading 3"
              >
                H3
              </button>
              <button
                onClick={() => document.execCommand('formatBlock', false, 'p')}
                className="flex-shrink-0 px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Paragraph"
              >
                P
              </button>
              <div className="h-4 w-px bg-border mx-1 flex-shrink-0" />
              <button
                onClick={() => document.execCommand('insertUnorderedList')}
                className="flex-shrink-0 px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Bullet List"
              >
                •
              </button>
              <button
                onClick={() => document.execCommand('insertOrderedList')}
                className="flex-shrink-0 px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Numbered List"
              >
                1.
              </button>
              <div className="h-4 w-px bg-border mx-1 flex-shrink-0" />
              <button
                onClick={() => document.execCommand('justifyLeft')}
                className="flex-shrink-0 px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Align Left"
              >
                ⌊
              </button>
              <button
                onClick={() => document.execCommand('justifyCenter')}
                className="flex-shrink-0 px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Align Center"
              >
                ≡
              </button>
              <button
                onClick={() => document.execCommand('justifyRight')}
                className="flex-shrink-0 px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors text-muted-foreground"
                title="Align Right"
              >
                ⌋
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Editor Content */}
      <div className={cn(
        'w-full max-w-full overflow-hidden',
        editable && showToolbar ? 'border border-t-0 rounded-b-lg' : 'border rounded-lg'
      )}>
        <div
          ref={editorRef}
          contentEditable={editable && !readOnly}
          onInput={handleInput}
          onFocus={onFocus}
          onBlur={onBlur}
          className={cn(
            'w-full max-w-full p-4 focus:outline-none overflow-x-hidden break-words',
            'prose prose-sm max-w-none',
            'min-h-[200px]',
            !editable && 'cursor-default',
            readOnly && 'cursor-not-allowed opacity-50'
          )}
          style={{ 
            minHeight,
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
          suppressContentEditableWarning={true}
          data-placeholder={!content ? placeholder : undefined}
        />
      </div>
    </div>
  );
});

export default StableEditor;