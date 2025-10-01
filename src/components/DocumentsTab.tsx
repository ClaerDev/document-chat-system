'use client'

import React, { useState, useEffect } from 'react'
import { Download, FileText, ExternalLink, Calendar, Eye, AlertCircle, Search, Filter, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { FileViewerModal } from '@/components/documents/file-viewer-modal'
import { useToast } from '@/hooks/use-toast'
import type { Opportunity } from '@/types'

interface DocumentsTabProps {
  opportunity: Opportunity
}

interface Document {
  id: string
  name: string
  type: string
  size: string
  lastModified: string
  url: string
  description?: string
  category: 'solicitation' | 'amendment' | 'attachment' | 'reference'
  // Enhanced metadata from prefetching
  isAccessible?: boolean
  actualSize?: number
  contentType?: string
  previewUrl?: string
  downloadUrl?: string
  metadata?: {
    pages?: number
    author?: string
    title?: string
    subject?: string
  }
}

interface DocumentMetadata {
  isAccessible: boolean
  actualSize?: number
  contentType?: string
  metadata?: {
    pages?: number
    author?: string
    title?: string
    subject?: string
  }
}

export function DocumentsTab({ opportunity }: DocumentsTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [documentMetadata, setDocumentMetadata] = useState<Map<string, DocumentMetadata>>(new Map())
  const [prefetchingDocs, setPrefetchingDocs] = useState<Set<string>>(new Set())
  const [downloadingDocs, setDownloadingDocs] = useState<Set<string>>(new Set())
  
  // State for document viewer modal
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  
  const { toast } = useToast()

  // NO MOCK DATA - Only show actual attachments from opportunity data
  const documents = opportunity.attachments && Array.isArray(opportunity.attachments) && opportunity.attachments.length > 0
    ? opportunity.attachments.map((attachment, index) => {
        const docId = `att_${index}`
        const metadata = documentMetadata.get(docId)
        
        return {
          id: docId,
          name: attachment.name || `Document ${index + 1}`,
          type: attachment.type || 'PDF',
          size: attachment.size || 'Unknown',
          lastModified: attachment.lastModified || new Date().toISOString().split('T')[0],
          url: attachment.url || '#',
          description: attachment.description || '',
          category: attachment.category || 'attachment',
          // Enhanced metadata from prefetching
          isAccessible: metadata?.isAccessible,
          actualSize: metadata?.actualSize,
          contentType: metadata?.contentType,
          metadata: metadata?.metadata
        } as Document
      })
    : [] // Empty array - no misleading mock documents

  // Document prefetching function
  const prefetchDocumentMetadata = async (document: Document) => {
    if (!document.url || document.url === '#' || prefetchingDocs.has(document.id)) return

    setPrefetchingDocs(prev => new Set(prev.add(document.id)))

    try {
      // Use proxy for external document URLs to avoid CSP issues
      const proxyUrl = `/api/v1/documents/proxy?url=${encodeURIComponent(document.url)}`
      const response = await fetch(proxyUrl, { 
        method: 'HEAD',
        credentials: 'include' // Include auth credentials for our proxy
      })

      const metadata: DocumentMetadata = {
        isAccessible: response.ok,
        actualSize: response.headers.get('content-length') 
          ? parseInt(response.headers.get('content-length')!) 
          : undefined,
        contentType: response.headers.get('content-type') || undefined
      }

      setDocumentMetadata(prev => new Map(prev.set(document.id, metadata)))

      console.log(`✅ Prefetched metadata for ${document.name}:`, metadata)
    } catch (error) {
      console.warn(`⚠️ Failed to prefetch ${document.name}:`, error)
      
      // Mark as not accessible
      const metadata: DocumentMetadata = {
        isAccessible: false
      }
      setDocumentMetadata(prev => new Map(prev.set(document.id, metadata)))
    } finally {
      setPrefetchingDocs(prev => {
        const next = new Set(prev)
        next.delete(document.id)
        return next
      })
    }
  }

  // Prefetch metadata for all documents on component mount
  useEffect(() => {
    documents.forEach(doc => {
      if (doc.url && doc.url !== '#') {
        prefetchDocumentMetadata(doc)
      }
    })
  }, [documents.length]) // Re-run when documents change

  // Document action handlers
  const handlePreview = async (document: Document) => {
    if (!document.url || document.url === '#') {
      toast({
        title: "Preview unavailable",
        description: "This document doesn't have a valid URL for preview.",
        variant: "destructive"
      })
      return
    }

    // Open the document in our built-in viewer modal using proxy URL
    const proxyUrl = `/api/v1/documents/proxy?url=${encodeURIComponent(document.url)}`
    
    // Enhanced MIME type detection for better preview experience
    let detectedMimeType = document.contentType || document.type || 'application/pdf';
    
    // If we got the generic application/octet-stream, try to detect from filename
    if (detectedMimeType === 'application/octet-stream' || detectedMimeType === 'application/binary') {
      const fileName = document.name?.toLowerCase() || '';
      if (fileName.includes('.pdf') || fileName.includes('pdf')) {
        detectedMimeType = 'application/pdf';
      } else if (fileName.includes('.doc')) {
        detectedMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (fileName.includes('.xls')) {
        detectedMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else {
        // Most SAM.gov documents are PDFs, so default to PDF
        detectedMimeType = 'application/pdf';
      }
    }
    
    console.log('📄 Document preview MIME type detection:', {
      originalType: document.contentType || document.type,
      fileName: document.name,
      detectedType: detectedMimeType
    });
    
    setSelectedDocument({
      ...document,
      mimeType: detectedMimeType,
      filePath: proxyUrl // Use the proxy URL for the viewer
    })
    setViewerOpen(true)
    
    toast({
      title: "Opening preview",
      description: `Previewing ${document.name} in document viewer. If preview fails, use the external link button.`
    })
  }

  const handleDownload = async (document: Document) => {
    if (!document.url || document.url === '#') {
      toast({
        title: "Download unavailable", 
        description: "This document doesn't have a valid URL for download.",
        variant: "destructive"
      })
      return
    }

    if (downloadingDocs.has(document.id)) return

    setDownloadingDocs(prev => new Set(prev.add(document.id)))

    try {
      // Create a temporary anchor element to trigger download
      // Use global document object, not the function parameter
      const link = globalThis.document.createElement('a')
      link.href = document.url
      link.download = document.name
      link.target = '_blank'
      
      // Add to DOM temporarily and click
      globalThis.document.body.appendChild(link)
      link.click()
      globalThis.document.body.removeChild(link)

      toast({
        title: "Download started",
        description: `Downloading ${document.name}...`
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Download failed",
        description: "Unable to download this document. Try the external link.",
        variant: "destructive"
      })
    } finally {
      setDownloadingDocs(prev => {
        const next = new Set(prev)
        next.delete(document.id)
        return next
      })
    }
  }

  const handleExternalLink = (document: Document) => {
    if (!document.url || document.url === '#') {
      toast({
        title: "Link unavailable",
        description: "This document doesn't have a valid external URL.",
        variant: "destructive"
      })
      return
    }

    window.open(document.url, '_blank', 'noopener,noreferrer')
    
    toast({
      title: "Opening external link",
      description: `Opening ${document.name} in a new tab.`
    })
  }

  const handleDownloadAll = async () => {
    const validDocuments = documents.filter(doc => doc.url && doc.url !== '#')
    
    if (validDocuments.length === 0) {
      toast({
        title: "No downloadable documents",
        description: "There are no documents available for download.",
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Downloading all documents",
      description: `Starting download of ${validDocuments.length} documents...`
    })

    // Download each document with a small delay to avoid overwhelming the browser
    for (let i = 0; i < validDocuments.length; i++) {
      setTimeout(() => {
        handleDownload(validDocuments[i])
      }, i * 1000) // 1 second delay between downloads
    }
  }

  // Filter documents based on search and category
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'solicitation':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'amendment':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800'
      case 'attachment':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'reference':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'solicitation':
        return <FileText className="w-4 h-4" />
      case 'amendment':
        return <AlertCircle className="w-4 h-4" />
      case 'attachment':
        return <Download className="w-4 h-4" />
      case 'reference':
        return <Eye className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const formatFileSize = (document: Document) => {
    // Use actual size from prefetching if available
    const actualSize = document.actualSize
    if (actualSize && actualSize > 0) {
      if (actualSize < 1024) return `${actualSize} B`
      if (actualSize < 1024 * 1024) return `${(actualSize / 1024).toFixed(1)} KB`
      if (actualSize < 1024 * 1024 * 1024) return `${(actualSize / (1024 * 1024)).toFixed(1)} MB`
      return `${(actualSize / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }
    
    // Fall back to original size string
    const size = document.size
    if (size.includes('MB') || size.includes('KB') || size.includes('GB')) {
      return size
    }
    
    // If size is just a number, assume bytes and convert
    const sizeNum = parseInt(size)
    if (isNaN(sizeNum)) return size
    
    if (sizeNum < 1024) return `${sizeNum} B`
    if (sizeNum < 1024 * 1024) return `${(sizeNum / 1024).toFixed(1)} KB`
    if (sizeNum < 1024 * 1024 * 1024) return `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`
    return `${(sizeNum / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="solicitation">Solicitation</SelectItem>
                  <SelectItem value="amendment">Amendments</SelectItem>
                  <SelectItem value="attachment">Attachments</SelectItem>
                  <SelectItem value="reference">References</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Count */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Documents ({filteredDocuments.length})
        </h3>
        {filteredDocuments.length > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownloadAll}
          >
            <Download className="w-4 h-4 mr-2" />
            Download All
          </Button>
        )}
      </div>

      {/* No Documents Message */}
      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Documents Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterCategory !== 'all' 
                  ? 'No documents match your search criteria.'
                  : 'No documents are currently available for this opportunity.'
                }
              </p>
              {(searchTerm || filterCategory !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('')
                    setFilterCategory('all')
                  }}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {filteredDocuments.length > 0 && (
        <div className="space-y-4">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        {getCategoryIcon(document.category)}
                      </div>
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <h4 className="font-medium text-lg truncate">{document.name}</h4>
                        <Badge variant="outline" className={getCategoryBadgeColor(document.category)}>
                          {document.category}
                        </Badge>
                      </div>
                      
                      {document.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {document.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {document.contentType || document.type}
                        </span>
                        <span>{formatFileSize(document)}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(document.lastModified).toLocaleDateString()}
                        </span>
                        {document.isAccessible === false && (
                          <span className="flex items-center gap-1 text-red-500">
                            <AlertCircle className="w-3 h-3" />
                            Not accessible
                          </span>
                        )}
                        {prefetchingDocs.has(document.id) && (
                          <span className="flex items-center gap-1 text-blue-500">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Loading metadata
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePreview(document)}
                      disabled={!document.url || document.url === '#'}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(document)}
                      disabled={!document.url || document.url === '#' || downloadingDocs.has(document.id)}
                    >
                      {downloadingDocs.has(document.id) ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {downloadingDocs.has(document.id) ? 'Downloading...' : 'Download'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleExternalLink(document)}
                      disabled={!document.url || document.url === '#'}
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Important Notes */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Document Access Notes</h4>
              <ul className="space-y-1 text-blue-800 dark:text-blue-300">
                <li>• All documents are official government publications</li>
                <li>• Check for amendments that may modify original requirements</li>
                <li>• Some documents may require Adobe Reader or Microsoft Office</li>
                <li>• Contact the contracting officer for document access issues</li>
                <li>• Always reference the latest version of each document</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* External Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-muted-foreground" />
            External Resources
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            If document previews fail to load, use these external links to access documents directly from the source.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
              <div>
                <h4 className="font-medium text-foreground">SAM.gov Opportunity Page</h4>
                <p className="text-sm text-muted-foreground">View this opportunity on the official SAM.gov website</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const samUrl = opportunity.sourceUrl || opportunity.uiLink || `https://sam.gov/opp/${opportunity.solicitationNumber}/view`
                  window.open(samUrl, '_blank', 'noopener,noreferrer')
                  toast({
                    title: "Opening SAM.gov",
                    description: "Opening the official opportunity page..."
                  })
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
              <div>
                <h4 className="font-medium text-foreground">FedConnect Portal</h4>
                <p className="text-sm text-muted-foreground">Submit questions and view responses</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const fedConnectUrl = `https://www.fedconnect.net/FedConnect/?doc=${opportunity.solicitationNumber}`
                  window.open(fedConnectUrl, '_blank', 'noopener,noreferrer')
                  toast({
                    title: "Opening FedConnect",
                    description: "Opening the FedConnect portal..."
                  })
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Document Viewer Modal */}
      {selectedDocument && (
        <FileViewerModal
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          document={selectedDocument}
        />
      )}
    </div>
  )
}