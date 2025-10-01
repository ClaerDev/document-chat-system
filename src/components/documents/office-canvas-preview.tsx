'use client';

import React, { useCallback } from 'react';

interface OfficeCanvasPreviewProps {
  document: {
    id: string;
    name: string;
    type: string;
    mimeType?: string;
  };
  className?: string;
  compact?: boolean;
}

const getOfficeType = (mimeType?: string, filename?: string) => {
  if (mimeType?.includes('word') || filename?.toLowerCase().includes('.doc')) {
    return { type: 'word', color: '#2563eb', icon: 'W', bgColor: '#dbeafe' };
  }
  if (mimeType?.includes('sheet') || mimeType?.includes('excel') || filename?.toLowerCase().includes('.xls')) {
    return { type: 'excel', color: '#16a34a', icon: 'X', bgColor: '#dcfce7' };
  }
  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint') || filename?.toLowerCase().includes('.ppt')) {
    return { type: 'powerpoint', color: '#ea580c', icon: 'P', bgColor: '#fed7aa' };
  }
  return { type: 'office', color: '#6b7280', icon: 'O', bgColor: '#f3f4f6' };
};

export const OfficeCanvasPreview: React.FC<OfficeCanvasPreviewProps> = ({ 
  document: doc, 
  className = "",
  compact = false
}) => {
  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    
    const renderOfficePreview = async () => {
      try {
        const officeInfo = getOfficeType(doc.mimeType, doc.name);
        
        // Set up canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Create document background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Add document border
        ctx.strokeStyle = compact ? '#e5e7eb' : '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
        
        const margin = compact ? 6 : 10;
        
        // Add Office app header bar (like ribbon)
        if (!compact) {
          ctx.fillStyle = officeInfo.bgColor;
          ctx.fillRect(0, 0, width, 16);
          
          ctx.fillStyle = officeInfo.color;
          ctx.font = 'bold 8px system-ui, -apple-system, sans-serif';
          ctx.fillText(officeInfo.type.toUpperCase(), margin, 12);
        }
        
        // Add app icon
        ctx.fillStyle = officeInfo.color;
        ctx.font = `bold ${compact ? '14px' : '18px'} system-ui, -apple-system, sans-serif`;
        ctx.textAlign = compact ? 'center' : 'left';
        ctx.fillText(
          officeInfo.icon, 
          compact ? width / 2 : margin, 
          compact ? height / 2 - 8 : 35
        );
        
        // Add document type
        if (!compact) {
          ctx.fillStyle = '#374151';
          ctx.font = '9px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          const docType = officeInfo.type === 'word' ? 'Document' : 
                         officeInfo.type === 'excel' ? 'Spreadsheet' : 
                         officeInfo.type === 'powerpoint' ? 'Presentation' : 'Document';
          ctx.fillText(docType, margin, 50);
        }
        
        // Simulate content based on office type
        if (!compact) {
          ctx.fillStyle = '#6b7280';
          ctx.font = '7px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          
          if (officeInfo.type === 'word') {
            // Simulate document text
            const textLines = [
              '████████████████████████',
              '████████ ██████████ ████',
              '██████████████ █████████',
              '████ ██████████████ ████',
              '',
              '████████████ ███████████',
              '██████ ████████████ ████'
            ];
            textLines.forEach((line, i) => {
              if (line) ctx.fillText(line, margin, 65 + (i * 8));
            });
          } else if (officeInfo.type === 'excel') {
            // Simulate spreadsheet grid
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 4; i++) {
              for (let j = 0; j < 3; j++) {
                const cellX = margin + (j * 20);
                const cellY = 60 + (i * 12);
                ctx.strokeRect(cellX, cellY, 18, 10);
                ctx.fillText('██', cellX + 2, cellY + 7);
              }
            }
          } else if (officeInfo.type === 'powerpoint') {
            // Simulate slide layout
            ctx.strokeStyle = '#d1d5db';
            ctx.strokeRect(margin, 65, width - (margin * 2), 40);
            ctx.fillText('████████████', margin + 5, 75);
            ctx.fillText('████████ ██████████', margin + 5, 85);
          }
        }
        
        // Add compact type indicator
        if (compact) {
          ctx.fillStyle = '#9ca3af';
          ctx.font = '6px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(officeInfo.type.toUpperCase(), width / 2, height - 4);
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
        ctx.fillText('Office', width / 2, height / 2);
      }
    };
    
    renderOfficePreview();
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