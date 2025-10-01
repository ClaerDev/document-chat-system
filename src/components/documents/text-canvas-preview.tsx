'use client';

import React, { useCallback } from 'react';

interface TextCanvasPreviewProps {
  document: {
    id: string;
    name: string;
  };
  className?: string;
  maxLines?: number;
  showTitle?: boolean;
  showPageNumber?: boolean;
  compact?: boolean;
}

export const TextCanvasPreview: React.FC<TextCanvasPreviewProps> = ({ 
  document: doc, 
  className = "",
  maxLines = 25,
  showTitle = true,
  showPageNumber = true,
  compact = false
}) => {
  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    
    const renderTextPreview = async () => {
      try {
        console.log('🔍 TextCanvasPreview: Starting render for', {
          id: doc.id,
          name: doc.name
        });
        
        // Fetch text content from the API
        const response = await fetch(`/api/v1/documents/${doc.id}/download`, {
          credentials: 'include'
        });
        
        console.log('📡 TextCanvasPreview: API response', {
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
          url: `/api/v1/documents/${doc.id}/download`
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch text content: ${response.status} ${response.statusText}`);
        }
        
        const textContent = await response.text();
        
        // Set up canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Style the canvas like a document page
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Add subtle shadow/border
        ctx.strokeStyle = compact ? '#f3f4f6' : '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
        
        // Document margins
        const margin = compact ? 12 : 20;
        const lineHeight = compact ? 12 : 16;
        const maxWidth = width - (margin * 2);
        const titleHeight = showTitle ? (compact ? 25 : 35) : 0;
        const availableHeight = height - (margin * 2) - titleHeight;
        const actualMaxLines = Math.min(maxLines, Math.floor(availableHeight / lineHeight));
        
        let yPos = margin;
        
        // Add document title
        if (showTitle) {
          ctx.fillStyle = '#1f2937';
          ctx.font = `bold ${compact ? '10px' : '14px'} system-ui, -apple-system, sans-serif`;
          const title = doc.name.length > 40 ? doc.name.substring(0, 37) + '...' : doc.name;
          ctx.fillText(title, margin, yPos);
          
          // Add separator line
          if (!compact) {
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(margin, yPos + 16);
            ctx.lineTo(width - margin, yPos + 16);
            ctx.stroke();
          }
          
          yPos += titleHeight;
        }
        
        // Set text styles for content
        ctx.fillStyle = '#374151';
        ctx.font = `${compact ? '9px' : '11px'} system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = 'top';
        
        // Process and render text content
        const lines = textContent.split('\n');
        let currentLine = 0;
        
        for (const line of lines) {
          if (currentLine >= actualMaxLines - 3) break; // Save space for "..." indicator
          
          if (line.trim() === '') {
            // Empty line - add small space
            yPos += lineHeight * 0.5;
            continue;
          }
          
          // Word wrap long lines
          const words = line.split(' ');
          let currentLineText = '';
          
          for (const word of words) {
            const testLine = currentLineText + (currentLineText ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLineText !== '') {
              // Render current line and start new one
              ctx.fillText(currentLineText, margin, yPos);
              yPos += lineHeight;
              currentLine++;
              currentLineText = word;
              
              if (currentLine >= actualMaxLines - 3) break;
            } else {
              currentLineText = testLine;
            }
          }
          
          // Render remaining text
          if (currentLineText && currentLine < actualMaxLines - 3) {
            ctx.fillText(currentLineText, margin, yPos);
            yPos += lineHeight;
            currentLine++;
          }
        }
        
        // Add "..." indicator if content is truncated
        if (currentLine >= actualMaxLines - 3 || lines.length > actualMaxLines) {
          ctx.fillStyle = '#9ca3af';
          ctx.font = `${compact ? '8px' : '10px'} system-ui, -apple-system, sans-serif`;
          ctx.fillText('...', margin, yPos + 5);
          
          // Add content info
          if (!compact) {
            const contentInfo = `${lines.length} lines • ${textContent.length} characters`;
            ctx.fillText(contentInfo, margin, height - 25);
          }
        }
        
        // Add page indicator
        if (showPageNumber && !compact) {
          ctx.fillStyle = '#d1d5db';
          ctx.font = '9px system-ui, -apple-system, sans-serif';
          ctx.fillText('Page 1', width - 60, height - 10);
        }
        
      } catch (error) {
        console.error('❌ TextCanvasPreview: Error', {
          error: error.message,
          documentId: doc.id,
          documentName: doc.name
        });
        
        // Render error state
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        ctx.fillStyle = compact ? '#fafafa' : '#fef2f2';
        ctx.fillRect(0, 0, width, height);
        
        ctx.strokeStyle = compact ? '#e5e7eb' : '#fecaca';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
        
        ctx.fillStyle = compact ? '#6b7280' : '#dc2626';
        ctx.font = `${compact ? '10px' : '12px'} system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(compact ? 'Preview unavailable' : 'Failed to load text preview', width / 2, height / 2 - (compact ? 5 : 10));
        
        if (!compact) {
          ctx.fillStyle = '#991b1b';
          ctx.font = '10px system-ui, -apple-system, sans-serif';
          ctx.fillText(doc.name, width / 2, height / 2 + 10);
        }
      }
    };
    
    renderTextPreview();
  }, [doc, maxLines, showTitle, showPageNumber, compact]);

  return (
    <div className={`bg-gray-50 flex items-center justify-center ${className}`}>
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};