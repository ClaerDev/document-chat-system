'use client'

import React, { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Eye, Download } from 'lucide-react'

// Configure PDF.js worker to match the installed version
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

interface PDFViewerProps {
  file: File
  fileName: string
  onDownload: () => void
  onOpenExternal: () => void
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ 
  file, 
  onDownload, 
  onOpenExternal 
}) => {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF loading error:', error)
    setLoading(false)
    setError('Failed to load PDF document')
  }

  const goToPrevPage = () => {
    setPageNumber(page => Math.max(1, page - 1))
  }

  const goToNextPage = () => {
    setPageNumber(page => Math.min(numPages, page + 1))
  }

  const zoomIn = () => {
    setScale(prevScale => Math.min(3.0, prevScale + 0.2))
  }

  const zoomOut = () => {
    setScale(prevScale => Math.max(0.5, prevScale - 0.2))
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600">
        <div className="text-red-500 mb-4">❌ {error}</div>
        <div className="space-x-2">
          <Button variant="default" size="sm" onClick={onOpenExternal}>
            <Eye size={16} className="mr-2" />
            Open Externally
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download size={16} className="mr-2" />
            Download
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* PDF Toolbar */}
      <div className="flex items-center justify-center p-3 border-b bg-background">
        <div className="flex items-center gap-2">
          {/* Page Info Badge */}
          {!loading && (
            <Badge variant="secondary" className="text-xs">
              Page {pageNumber} of {numPages}
            </Badge>
          )}
          
          {/* Navigation Controls */}
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1 || loading}
              className="rounded-r-none border-r-0"
            >
              <ChevronLeft size={16} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages || loading}
              className="rounded-l-none"
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
              disabled={scale <= 0.5 || loading}
              className="rounded-r-none border-r-0"
            >
              <ZoomOut size={16} />
            </Button>
            
            <div className="border border-l-0 border-r-0 border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground">
              {Math.round(scale * 100)}%
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
              disabled={scale >= 3.0 || loading}
              className="rounded-l-none border-l-0"
            >
              <ZoomIn size={16} />
            </Button>
          </div>

          {/* Action Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOpenExternal}
          >
            <Eye size={16} className="mr-2" />
            External
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center pt-8 pb-4 px-4">
        {loading && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-sm text-gray-600">Loading PDF...</p>
          </div>
        )}
        
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            className="shadow-lg"
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  )
}