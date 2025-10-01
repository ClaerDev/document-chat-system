'use client';

import React, { useCallback } from 'react';
import { FileText } from 'lucide-react';

interface PdfCanvasPreviewProps {
  document: {
    id: string;
    name: string;
  };
  className?: string;
  compact?: boolean;
}

export const PdfCanvasPreview: React.FC<PdfCanvasPreviewProps> = ({ 
  document: doc, 
  className = "",
  compact = false
}) => {
  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    
    const renderPdfPreview = async () => {
      try {
        // Set up canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Create PDF-like document preview
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Add document border
        ctx.strokeStyle = compact ? '#e5e7eb' : '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
        
        // Add shadow effect for document look
        if (!compact) {
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(2, 2, width-2, height-2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width-2, height-2);
          ctx.strokeRect(0, 0, width-2, height-2);
        }
        
        const margin = compact ? 8 : 12;
        const lineHeight = compact ? 8 : 12;
        
        // Add PDF icon and title
        ctx.fillStyle = '#dc2626'; // PDF red color
        ctx.font = `bold ${compact ? '10px' : '12px'} system-ui, -apple-system, sans-serif`;
        
        if (!compact) {
          ctx.fillText('PDF', margin, margin + 12);
          
          // Add document title
          ctx.fillStyle = '#374151';
          ctx.font = `${compact ? '8px' : '10px'} system-ui, -apple-system, sans-serif`;
          const title = doc.name.length > 20 ? doc.name.substring(0, 17) + '...' : doc.name;
          ctx.fillText(title, margin, margin + 28);
        }
        
        // Simulate PDF content with lines
        ctx.fillStyle = '#6b7280';
        ctx.font = `${compact ? '6px' : '8px'} system-ui, -apple-system, sans-serif`;
        
        const startY = compact ? margin + 8 : margin + 45;
        const maxLines = compact ? Math.floor((height - startY - margin) / lineHeight) : 8;
        
        // Create realistic PDF content lines
        const contentLines = [
          '████████████ ████ ███████',
          '██████ ████████ ██████████',
          '',
          '████████ ███████ ██████',
          '██████████ ████ ███████████',
          '████ ██████████ █████████',
          '',
          '████████████ ████████ ███',
          '██████ ████████ ███████',
          '████████ ██████ ████████'
        ];
        
        for (let i = 0; i < Math.min(maxLines, contentLines.length); i++) {
          if (contentLines[i] === '') {
            continue; // Skip empty lines
          }
          ctx.fillText(contentLines[i], margin, startY + (i * lineHeight));
        }
        
        // Add page number if not compact
        if (!compact) {
          ctx.fillStyle = '#9ca3af';
          ctx.font = '8px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('1', width / 2, height - 8);
        }
        
      } catch (error) {
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
        ctx.font = `${compact ? '8px' : '10px'} system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(compact ? 'PDF' : 'PDF Preview', width / 2, height / 2);
      }
    };
    
    renderPdfPreview();
  }, [doc, compact]);

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