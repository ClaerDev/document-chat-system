'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  File as FileIcon,
  Download,
  Eye,
  Code,
  FileImage,
  FileVideo,
  FileAudio,
  Image,
  Video,
  Music,
  Archive
} from 'lucide-react'
import { PDFViewer } from './pdf-viewer'

import { ResponsiveCanvasPreview } from './responsive-canvas-preview'
import { TextViewer } from './viewers/text-viewer'
import { MarkdownViewer } from './viewers/markdown-viewer'
import { OfficeViewer } from './viewers/office-viewer'
import { AuthenticatedImage } from '../ui/authenticated-image'
import { formatFileSize } from './file-type-utils'

interface FilePreviewProps {
  document: {
    id: string
    name: string
    type: string
    size: string
    mimeType?: string
    filePath?: string // Add filePath to interface
    originalFile?: File
  }
  className?: string
  videoFit?: 'cover' | 'contain'
}

// Utility function to get original filename from filePath (for preview stability)
const getOriginalFileName = (docData: any): string => {
  try {
    if (!docData) {
      console.warn('getOriginalFileName: docData is null/undefined');
      return 'unknown-file';
    }
    
    // Try to extract filename from filePath first (most reliable for stored files)
    if (docData.filePath && typeof docData.filePath === 'string') {
      const pathParts = docData.filePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      if (fileName && fileName !== 'unknown-file') {
        return fileName;
      }
    }
    
    // Fallback to docData.name
    if (docData.name && typeof docData.name === 'string') {
      return docData.name;
    }
    
    console.warn('getOriginalFileName: No valid filename found', {
      filePath: docData.filePath,
      name: docData.name,
      id: docData.id
    });
    return 'unknown-file';
  } catch (error) {
    console.error('getOriginalFileName error:', error);
    return 'unknown-file';
  }
}

// Component for handling canvas preview with fetched file content
const CanvasPreviewWithFetch: React.FC<{ document: any; className?: string }> = ({ document: doc, className = '' }) => {
  // TEMPORARY: Simplified version without file fetching to avoid infinite loops
  // TODO: Re-enable full preview after fixing infinite loop issues
  return (
    <div className={`w-full h-full flex items-center justify-center bg-gray-50 ${className}`}>
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-4">📄</div>
        <div className="text-base font-medium mb-2">{getOriginalFileName(doc)}</div>
        <div className="text-sm text-muted-foreground mb-4">
          {doc.mimeType || 'Unknown type'}
        </div>
        {doc.size && (
          <div className="text-sm text-muted-foreground mb-4">
            Size: {typeof doc.size === 'number' ? `${(doc.size / 1024).toFixed(1)} KB` : doc.size}
          </div>
        )}
        <div className="text-xs text-muted-foreground italic">
          Preview temporarily disabled - please use download button to view file
        </div>
      </div>
    </div>
  );
};

/* ORIGINAL CanvasPreviewWithFetch CODE - Disabled due to infinite loop issue:
const CanvasPreviewWithFetch_DISABLED: React.FC<{ document: any; className?: string }> = ({ document: doc, className = '' }) => {
  const [fetchedFile, setFetchedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileContent = async () => {
      try {
        console.log('FilePreview - Starting fetchFileContent for:', {
          docId: doc?.id,
          docName: doc?.name,
          hasDoc: !!doc,
          timestamp: new Date().toISOString()
        });
        
        setLoading(true);
        setError(null);
        
        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        // Determine the correct endpoint based on document source
        let actualUrl = doc?.filePath;
        
        // If filePath is already a proxy URL, extract the original URL
        if (actualUrl?.includes('/api/v1/documents/proxy?url=')) {
          const urlMatch = actualUrl.match(/proxy\?url=(.+)/);
          if (urlMatch) {
            actualUrl = decodeURIComponent(urlMatch[1]);
          }
        }
        
        const isSamGovDoc = actualUrl?.includes('sam.gov');
        const fetchUrl = isSamGovDoc 
          ? `/api/v1/documents/proxy?url=${encodeURIComponent(actualUrl)}`
          : `/api/v1/documents/${doc.id}/download`;
        
        console.log('FilePreview - Fetch URL decision:', {
          docId: doc.id,
          originalFilePath: doc.filePath,
          extractedUrl: actualUrl,
          isSamGovDoc,
          fetchUrl
        });
        
        // Fetch file content from appropriate API endpoint
        const response = await fetch(fetchUrl, {
          method: 'GET',
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Check if this is an expected failure (SAM.gov docs or 404s for external docs)
          const isSamGovDoc = doc?.filePath?.includes('sam.gov');
          const isExpectedFailure = response.status === 404 || response.status === 403 || isSamGovDoc;
          
          if (isExpectedFailure) {
            // Use warning level for expected failures
            console.warn('FilePreview - Expected download failure:', {
              status: response.status,
              statusText: response.statusText,
              docId: doc.id,
              isSamGovDoc,
              url: fetchUrl
            });
          } else {
            // Use error level for unexpected failures
            console.error('FilePreview CanvasPreviewWithFetch - Download failed:');
            console.error('Status:', response.status);
            console.error('Status Text:', response.statusText);
            console.error('Document ID:', doc.id);
            console.error('URL:', fetchUrl);
            console.error('Headers:', Object.fromEntries(response.headers.entries()));
            console.error('Response type:', response.type);
          }
          
          // Get more detailed error information
          let errorMessage = `Failed to fetch file: ${response.statusText}`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = `Failed to fetch file: ${errorData.error}`;
              if (errorData.details) {
                errorMessage += ` - ${errorData.details}`;
              }
            }
          } catch (parseError) {
            console.warn('Could not parse error response as JSON');
          }
          
          throw new Error(errorMessage);
        }
        
        // Get file content as blob
        console.log('FilePreview - Getting blob from response...', {
          responseType: typeof response,
          responseOk: response.ok,
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries())
        });
        
        const blob = await response.blob();
        
        // Enhanced debugging for blob
        console.log('FilePreview - Blob created:', {
          blob: blob,
          blobSize: blob?.size,
          blobType: blob?.type,
          hasBlob: !!blob,
          isValidBlob: blob instanceof Blob
        });
        
        // Debug: Log document object before getting filename
        console.log('Debug - Document object:', {
          id: doc?.id,
          name: doc?.name,
          filePath: doc?.filePath,
          mimeType: doc?.mimeType,
          hasDoc: !!doc
        });
        
        // Create a File object from the blob using original filename
        const originalFileName = getOriginalFileName(doc);
        
        // Debug: Log filename analysis
        const hasExtension = originalFileName.includes('.');
        const extension = hasExtension ? originalFileName.split('.').pop() : null;
        
        console.log('Debug - Filename analysis:', {
          originalFileName,
          hasExtension,
          extension,
          fileNameLength: originalFileName.length,
          isValidName: originalFileName && originalFileName.length > 0
        });
        
        // If the file has no extension but we know the MIME type, add appropriate extension
        let finalFileName = originalFileName;
        if (!hasExtension && doc?.mimeType) {
          const mimeToExt = {
            'application/pdf': '.pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
            'text/plain': '.txt',
            'text/markdown': '.md',
            'text/csv': '.csv',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'video/mp4': '.mp4',
            'audio/mpeg': '.mp3'
          };
          
          const suggestedExt = mimeToExt[doc.mimeType];
          if (suggestedExt) {
            finalFileName = originalFileName + suggestedExt;
            console.log('Debug - Added extension based on MIME type:', {
              original: originalFileName,
              mimeType: doc.mimeType,
              final: finalFileName
            });
          }
        }
        
        // Safety checks before creating File object
        if (!blob || !(blob instanceof Blob)) {
          console.error('FilePreview - Blob is null, undefined, or invalid:', {
            docId: doc?.id,
            docName: doc?.name,
            blobType: typeof blob,
            blobConstructor: blob?.constructor?.name,
            responseOk: true, // We got here so response was ok
            responseStatus: response?.status,
            responseContentType: response?.headers?.get('content-type')
          });
          throw new Error(`Invalid blob: Expected Blob object, got ${typeof blob}`);
        }
        
        if (blob.size === 0) {
          console.warn('FilePreview - Blob is empty (0 bytes):', {
            docId: doc?.id,
            docName: doc?.name,
            blobSize: blob.size,
            blobType: blob.type
          });
          throw new Error('Document is empty (0 bytes)');
        }
        
        if (!finalFileName || finalFileName.length === 0) {
          console.warn('Final filename is empty, using fallback name');
          finalFileName = 'document.pdf'; // Fallback filename
        }
        
        // Use the blob's type if it's been enhanced by our proxy, otherwise fall back to doc.mimeType
        const detectedMimeType = blob.type && blob.type !== 'application/octet-stream' 
          ? blob.type 
          : doc?.mimeType || 'application/pdf'; // Default to PDF for government documents
        
        console.log('FilePreview - MIME type selection:', {
          blobType: blob.type,
          docMimeType: doc?.mimeType,
          finalMimeType: detectedMimeType,
          fileName: finalFileName
        });
        
        // Create File object with enhanced MIME type
        let file;
        try {
          file = new File([blob], finalFileName, {
            type: detectedMimeType,
            lastModified: new Date().getTime(),
          });
        } catch (fileCreationError) {
          console.error('FilePreview - Error creating File object:', {
            error: fileCreationError,
            finalFileName,
            detectedMimeType,
            blobSize: blob?.size,
            blobType: blob?.type
          });
          throw new Error(`Failed to create File object: ${fileCreationError}`);
        }
        
        console.log('Debug - File created successfully:', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          blobSize: blob.size
        });
        
        setFetchedFile(file);
        setLoading(false);
      } catch (err) {
        // Check if this is an expected SAM.gov authentication error
        const isSamGovDoc = doc?.filePath?.includes('sam.gov');
        const isAuthError = err instanceof Error && (
          err.message.includes('Network Error') || 
          err.message.includes('Failed to fetch') ||
          err.message.includes('Unauthorized') ||
          err.message.includes('Forbidden')
        );
        
        if (isSamGovDoc && isAuthError) {
          // For expected SAM.gov auth errors, use warning level logging
          console.warn('FilePreview - SAM.gov document access blocked (expected):', {
            docId: doc.id,
            docName: doc?.name || 'Unknown',
            error: err instanceof Error ? err.message : String(err)
          });
        } else {
          // For unexpected errors, use full error logging
          console.error('FilePreview CanvasPreviewWithFetch - Error fetching file for canvas preview:');
          console.error('Error:', err);
          console.error('Document ID:', doc.id);
          console.error('Document Name:', doc?.name || 'Unknown');
          console.error('MIME Type:', doc?.mimeType || 'Unknown');
          console.error('Timestamp:', new Date().toISOString());
          if (err instanceof Error) {
            console.error('Error name:', err.name);
            console.error('Error message:', err.message);
            console.error('Error stack:', err.stack);
          } else {
            console.error('Non-Error exception:', err);
          }
        }
        
        let errorMessage = 'Failed to fetch file content';
        if (err instanceof Error) {
          errorMessage = err.message;
          // Provide user-friendly error messages
          if (err.name === 'AbortError') {
            errorMessage = 'Request timed out - document may be large or server is busy';
          } else if (err.message.includes('Unauthorized')) {
            errorMessage = 'Authentication required to view this document';
          } else if (err.message.includes('Forbidden')) {
            errorMessage = 'You do not have permission to view this document';
          } else if (err.message.includes('Not Found')) {
            errorMessage = 'Document file not found';
          } else if (err.message.includes('Internal Server Error')) {
            errorMessage = 'Server error while loading document';
          } else if (err.message.includes('Network Error') || err.message.includes('Failed to fetch')) {
            errorMessage = 'Network error - please check your connection';
          }
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    if (!doc.originalFile) {
      fetchFileContent();
    } else {
      setFetchedFile(doc.originalFile);
      setLoading(false);
    }
  }, [doc.id, doc.filePath, doc.mimeType, doc.originalFile]);

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-xs text-gray-500">Loading preview...</div>
        </div>
      </div>
    );
  }

  // Log error state for debugging (only once when error/fetchedFile changes)
  React.useEffect(() => {
    if (error || !fetchedFile) {
      console.error('❌ FilePreview - Preview not available:', {
        error,
        hasFetchedFile: !!fetchedFile,
        documentId: doc.id,
        documentName: doc.name,
        documentType: doc.type,
        filePath: doc.filePath,
        mimeType: doc.mimeType,
        size: doc.size,
        hasOriginalFile: !!doc.originalFile
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, fetchedFile]);

  if (error || !fetchedFile) {
    const debugInfo = {
      ID: doc.id,
      Name: doc.name,
      Type: doc.type || 'none',
      FilePath: doc.filePath || 'none',
      MimeType: doc.mimeType || 'none',
      Size: doc.size || 'none',
      HasOriginalFile: doc.originalFile ? 'yes' : 'no',
      Error: error || 'none'
    };

    return (
      <div className={`w-full h-full flex items-center justify-center text-gray-500 ${className}`}>
        <div className="text-center p-4 max-w-2xl">
          <div className="text-6xl mb-4 text-gray-400">📄</div>
          <div className="text-sm font-medium mb-2">Preview not available</div>
          <div className="text-xs text-gray-600 mb-3">{getOriginalFileName(doc)}</div>
          {error && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-3 max-w-lg mx-auto mb-3 text-left">
              <div className="font-semibold mb-1">Error:</div>
              <div>{error}</div>
            </div>
          )}
          {!error && !fetchedFile && (
            <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 max-w-sm mx-auto mb-3">
              File fetch completed but no file data was returned
            </div>
          )}
          <div className="text-xs text-gray-500 mb-3">
            {doc.filePath ? 'Unable to load file from storage' : 'No file path found'}
          </div>

          {/* Visible debug info box */}
          <div className="text-left text-xs bg-yellow-50 border-2 border-yellow-400 p-3 rounded mt-3 max-w-lg mx-auto">
            <div className="font-bold text-yellow-900 mb-2">🔍 Debug Information:</div>
            <div className="space-y-1 font-mono text-yellow-900">
              <div><strong>ID:</strong> {debugInfo.ID}</div>
              <div><strong>Name:</strong> {debugInfo.Name}</div>
              <div><strong>Type:</strong> {debugInfo.Type}</div>
              <div><strong>FilePath:</strong> {debugInfo.FilePath}</div>
              <div><strong>MimeType:</strong> {debugInfo.MimeType}</div>
              <div><strong>Size:</strong> {debugInfo.Size}</div>
              <div><strong>Has File:</strong> {debugInfo.HasOriginalFile}</div>
              <div><strong>Error:</strong> {debugInfo.Error}</div>
            </div>
            <div className="mt-3 pt-2 border-t border-yellow-300 text-yellow-900">
              <strong>Console:</strong> Check browser DevTools Console (F12) for detailed logs
            </div>
          </div>

          {/* Fallback: Provide link to original document */}
          {doc.filePath && doc.filePath.includes('sam.gov') && (
            <div className="mt-4">
              <button
                onClick={() => {
                  // Extract original URL from proxy path
                  const urlMatch = doc.filePath.match(/proxy\?url=(.+)/);
                  if (urlMatch) {
                    const originalUrl = decodeURIComponent(urlMatch[1]);
                    window.open(originalUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on SAM.gov
              </button>
              <div className="text-xs text-gray-500 mt-2">
                Opens document directly from SAM.gov
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // TEMPORARY: Disable ResponsiveCanvasPreview due to infinite loop issue
  // TODO: Fix infinite loop in ResponsiveCanvasPreview component
  return (
    <div className={`w-full h-full flex items-center justify-center bg-gray-50 ${className}`}>
      <div className="text-center p-8">
        <div className="text-4xl mb-4">📄</div>
        <div className="text-sm font-medium mb-2">{getOriginalFileName(doc)}</div>
        <div className="text-xs text-muted-foreground mb-4">
          File size: {(fetchedFile.size / 1024).toFixed(1)} KB
        </div>
        <div className="text-xs text-muted-foreground">
          Preview temporarily disabled - please download to view
        </div>
      </div>
    </div>
  );

  // Original code - re-enable after fixing infinite loop:
  // return (
  //   <ResponsiveCanvasPreview
  //     file={fetchedFile}
  //     fileName={getOriginalFileName(doc)}
  //     className={className}
  //   />
  // );
};
*/

export const FilePreview: React.FC<FilePreviewProps> = ({ document: doc, className = '', videoFit = 'contain' }) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  
  // Get original filename for all operations (prevents preview breaking on title edits)
  const originalFileName = getOriginalFileName(doc)
  
  // Check if this is a created document (no actual file)
  const isCreatedDocument = doc.filePath?.startsWith('/documents/') || 
    (!doc.originalFile && doc.filePath && !doc.filePath.includes('/api/v1/documents/') && !doc.filePath.includes('supabase'));
  
  // Debug logging for created document detection (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('FilePreview - Created document check:', {
      id: doc.id,
      name: doc.name,
      filePath: doc.filePath,
      hasOriginalFile: !!doc.originalFile,
      startsWithDocuments: doc.filePath?.startsWith('/documents/'),
      includesApiPath: doc.filePath?.includes('/api/v1/documents/'),
      includesSupabase: doc.filePath?.includes('supabase'),
      isCreatedDocument
    });
  }
  
  // If it's a created document, show "No file" message or hide preview
  if (isCreatedDocument) {
    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground h-full">
        <div className="text-4xl mb-3">
          <FileText />
        </div>
        <p className="text-sm">No file</p>
        <p className="text-xs mt-1">Created Document</p>
      </div>
    );
  }
  
  // Removed debug logging to prevent continuous re-render logs

  // Check if file is valid (using duck typing only - no instanceof)
  const isValidFile = useCallback((file: any): file is File => {
    // Simple duck typing check - avoid instanceof completely
    return file && 
           typeof file.name === 'string' && 
           typeof file.size === 'number' &&
           (typeof file.type === 'string' || file.type === undefined) &&
           typeof file.lastModified === 'number';
  }, []);

  // Handle iframe load events
  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);
    setIframeError(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeLoading(false);
    setIframeError(true);
  }, []);

  // Reset iframe states when document changes
  useEffect(() => {
    setIframeLoading(true);
    setIframeError(false);
  }, [doc.id]);

  // Get document icon based on type
  const getDocumentIcon = useCallback((type: string) => {
    switch (type) {
      case 'pdf':
      case 'text':
        return <FileText size={20} />;
      case 'code':
        return <Code size={20} />;
      case 'image':
        return <FileImage size={20} />;
      case 'video':
        return <FileVideo size={20} />;
      case 'audio':
        return <FileAudio size={20} />;
      case 'archive':
        return <Archive size={20} />;
      default:
        return <FileIcon size={20} />;
    }
  }, []);

  // Create object URL for uploaded files or use API endpoint for persisted files
  const getFileUrl = (doc: any) => {
    if (doc.originalFile && isValidFile(doc.originalFile)) {
      return URL.createObjectURL(doc.originalFile);
    }
    return null; // No preview for demo files
  };

  // Enhanced function to get document URL for both new and persisted documents
  const getDocumentUrl = useCallback((document: any) => {
    // For newly uploaded files, use the original file object
    if (document.originalFile && isValidFile(document.originalFile)) {
      return URL.createObjectURL(document.originalFile);
    }
    // For persisted files from database, use the download API
    if (document.id) {
      return `/api/v1/documents/${document.id}/download`;
    }
    return null;
  }, [isValidFile]);


  const createPlaceholder = (text: string) => {
    const svgContent = '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="100%" height="100%" fill="#f3f4f6"/>' +
      '<text x="50%" y="50%" font-family="system-ui" font-size="16" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">' +
      text.replace(/[<>&"']/g, '') + 
      '</text></svg>';
    return `data:image/svg+xml;base64,${btoa(svgContent)}`;
  };

  // Handle image types (both 'image' and specific formats like 'jpeg', 'png', etc.)
  const isImageType = doc.type === 'image' || 
                     doc.mimeType?.startsWith('image/') || 
                     ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(doc.type.toLowerCase());

  if (isImageType) {
      const imageUrl = getFileUrl(doc);
      
      // For persisted images (no originalFile), use AuthenticatedImage
      if (!doc.originalFile) {
        return (
          <div className="w-full h-full bg-black relative">
            <AuthenticatedImage
              document={doc}
              alt={getOriginalFileName(doc)}
              className="w-full h-full object-contain"
              style={{ backgroundColor: 'black' }}
            />
          </div>
        );
      }
      
      // For newly uploaded images with originalFile, use existing logic
      const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.target as HTMLImageElement;
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        
        // Determine object-fit based on aspect ratio
        // If image is square-ish (0.8-1.2) or vertical (< 0.8), use cover
        // If image is horizontal (> 1.2), use contain to show full image
        if (aspectRatio <= 1.2) {
          img.style.objectFit = 'cover';
        } else {
          img.style.objectFit = 'contain';
        }
      };
      
      return (
        <div className="w-full h-full bg-black relative">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={getOriginalFileName(doc)}
                className="w-full h-full object-cover opacity-0"
                onLoad={(e) => {
                  handleImageLoad(e);
                  (e.target as HTMLImageElement).style.opacity = '1';
                }}
                onError={(e) => {
                  const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                  if (fallback) {
                    (e.target as HTMLElement).style.display = 'none';
                    fallback.style.display = 'flex';
                  }
                }}
                style={{ transition: 'opacity 0.3s ease-in-out' }}
              />
              <div className="hidden flex-col items-center justify-center h-full bg-gray-100 text-gray-600">
                <Image size={64} className="mb-4" />
                <p className="text-sm">Failed to load image</p>
                <p className="text-xs mt-1">{getOriginalFileName(doc)}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gray-100 text-gray-600">
              <Image size={64} className="mb-4" />
              <p className="text-sm">Image preview unavailable</p>
              <p className="text-xs mt-1">{originalFileName}</p>
              <p className="text-xs mt-2 text-center px-4">File was uploaded successfully. Preview available during session - not after page refresh.</p>
            </div>
          )}
        </div>
      );
  }

  // Handle video types
  const isVideoType = doc.type === 'video' || 
                     doc.mimeType?.startsWith('video/') || 
                     ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(doc.type.toLowerCase());
  
  // Debug video type detection (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('FilePreview - Video type check:', {
      docName: doc.name,
      originalFileName: originalFileName,
      docType: doc.type,
      mimeType: doc.mimeType,
      isVideoType: isVideoType,
      typeCheck: doc.type === 'video',
      mimeCheck: doc.mimeType?.startsWith('video/'),
      extensionCheck: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(doc.type.toLowerCase())
    });
  }

  if (isVideoType) {
      const videoUrl = getDocumentUrl(doc);
      
      // Debug logging for video URL generation
      console.log('FilePreview - Video debug:', {
        docId: doc.id,
        docName: doc.name,
        originalFileName: originalFileName,
        hasOriginalFile: !!doc.originalFile,
        videoUrl: videoUrl,
        mimeType: doc.mimeType,
        hasValidUrl: !!videoUrl
      });
      
      // Only render video if we have a valid URL (same as main documents page)
      if (!videoUrl) {
        console.log('FilePreview - No video URL available, falling through to default');
        // Fall through to default handling
      } else {
        return (
        <div className="w-full h-full relative bg-black">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              className={`w-full h-full object-${videoFit}`}
              preload="metadata"
              onLoadStart={() => {
                console.log('FilePreview - Video load started:', originalFileName);
              }}
              onLoadedMetadata={() => {
                console.log('FilePreview - Video metadata loaded:', originalFileName);
              }}
              onError={(e) => {
                console.error('FilePreview - Video error:', originalFileName, e);
                const target = e.target as HTMLVideoElement;
                const fallback = target.nextElementSibling as HTMLElement;
                if (target && fallback) {
                  target.style.display = 'none';
                  fallback.style.display = 'flex';
                }
              }}
            >
              <source src={videoUrl} type={doc.mimeType} />
              Your browser does not support the video tag.
            </video>
          ) : null}
          <div className={`${videoUrl ? 'hidden' : 'flex'} absolute inset-0 flex-col items-center justify-center text-white`}>
            <FileVideo size={64} className="mb-4" />
            <p className="text-sm">Video preview unavailable</p>
            <p className="text-xs mt-1">{getOriginalFileName(doc)}</p>
            <p className="text-xs mt-2 text-center px-4">No video content available</p>
          </div>
        </div>
        );
      }
  }

  // Handle audio types
  const isAudioType = doc.type === 'audio' || 
                     doc.mimeType?.startsWith('audio/') || 
                     ['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(doc.type.toLowerCase());
  
  // Debug audio type detection (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('FilePreview - Audio type check:', {
      docName: doc.name,
      originalFileName: originalFileName,
      docType: doc.type,
      mimeType: doc.mimeType,
      isAudioType: isAudioType,
      typeCheck: doc.type === 'audio',
      mimeCheck: doc.mimeType?.startsWith('audio/'),
      extensionCheck: ['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(doc.type.toLowerCase())
    });
  }

  if (isAudioType) {
      const audioUrl = getDocumentUrl(doc);
      
      // Only render audio if we have a valid URL (same as main documents page)
      if (!audioUrl) {
        console.log('FilePreview - No audio URL available, falling through to default');
        // Fall through to default handling
      } else {
        return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
          <FileAudio size={64} className="mb-4 text-pink-500" />
          {audioUrl ? (
            <audio
              controls
              className="mb-4 max-w-full"
              preload="metadata"
              onError={(e) => {
                const target = e.target as HTMLAudioElement;
                const fallback = target.nextElementSibling as HTMLElement;
                if (target && fallback) {
                  target.style.display = 'none';
                  fallback.style.display = 'block';
                }
              }}
            >
              <source src={audioUrl} type={doc.mimeType} />
              Your browser does not support the audio tag.
            </audio>
          ) : null}
          <p className={`text-sm text-center ${audioUrl ? 'hidden' : 'block'}`}>Audio preview unavailable</p>
          <p className="text-sm text-center text-pink-700 font-medium">{getOriginalFileName(doc)}</p>
        </div>
        );
      }
  }

  // Handle PDF files
  const isPdfType = doc.type === 'pdf' || doc.mimeType === 'application/pdf';

  if (isPdfType) {
      // Use CanvasPreviewWithFetch for all PDFs (works with or without originalFile)
      return (
        <div className={`w-full h-full ${className}`}>
          <CanvasPreviewWithFetch document={doc} className="w-full h-full" />
        </div>
      );
  }

  // Handle text files
  const isTextType = doc.type === 'text' || 
                    doc.type === 'plain' || // Handle legacy 'plain' type files
                    doc.mimeType?.startsWith('text/') || 
                    ['txt', 'md', 'csv'].includes(doc.type.toLowerCase());

  if (isTextType) {
      // Check if it's a markdown file using multiple sources (filename, filePath, name)
      const isMarkdown = originalFileName.toLowerCase().endsWith('.md') ||
                        doc.name?.toLowerCase().endsWith('.md') ||
                        doc.filePath?.toLowerCase().endsWith('.md') ||
                        doc.mimeType === 'text/markdown';
      
      // Debug logging for markdown detection
      console.log('FilePreview - Markdown detection:', {
        docId: doc.id,
        docName: doc.name,
        docFilePath: doc.filePath,
        originalFileName,
        docType: doc.type,
        mimeType: doc.mimeType,
        isMarkdown,
        checks: {
          originalFileNameEndsMd: originalFileName.toLowerCase().endsWith('.md'),
          docNameEndsMd: doc.name?.toLowerCase().endsWith('.md'),
          filePathEndsMd: doc.filePath?.toLowerCase().endsWith('.md'),
          mimeTypeMarkdown: doc.mimeType === 'text/markdown'
        }
      });
      
      if (isMarkdown) {
        // Use MarkdownViewer for .md files if we have originalFile
        if (doc.originalFile && isValidFile(doc.originalFile)) {
          return (
            <div className={`w-full h-full ${className}`}>
              <MarkdownViewer
                file={doc.originalFile}
                fileName={originalFileName}
                onDownload={() => {
                  const url = getFileUrl(doc);
                  if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = originalFileName;
                    link.click();
                  }
                }}
              />
            </div>
          );
        } else {
          // Use CanvasPreviewWithFetch for .md files when no originalFile (uploaded/stored files)
          return (
            <div className={`w-full h-full ${className}`}>
              <CanvasPreviewWithFetch document={doc} className="w-full h-full" />
            </div>
          );
        }
      } else {
        // Use CanvasPreviewWithFetch for .txt/.csv files (works with or without originalFile)
        return (
          <div className={`w-full h-full ${className}`}>
            <CanvasPreviewWithFetch document={doc} className="w-full h-full" />
          </div>
        );
      }

      // Fallback for demo files or when FileReader fails
      const textUrl = getFileUrl(doc);
      return (
        <div className="w-full h-full flex flex-col p-4">
          <div className="w-full h-full border border-border rounded-lg bg-card shadow-lg flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-gray-600" />
                <span className="text-sm font-medium">Text Document</span>
                <span className="text-xs text-gray-500">({originalFileName})</span>
              </div>
              <div className="flex gap-2">
                {textUrl && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = textUrl;
                      link.download = originalFileName;
                      link.click();
                    }}
                  >
                    <Download size={16} className="mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText size={64} className="mb-4 text-gray-600" />
                <p className="text-sm font-medium">{originalFileName}</p>
                <p className="text-xs mt-2">{formatFileSize(doc.size)}</p>
                <p className="text-xs mt-4">Demo text file - upload a text file to see inline preview</p>
              </div>
            </div>
          </div>
        </div>
      );
  }

  // Handle code files
  const isCodeType = doc.type === 'code' || 
                    ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt'].includes(doc.type.toLowerCase());

  if (isCodeType) {
      const codeUrl = getFileUrl(doc);
      return (
        <div className="w-full h-full flex flex-col p-4">
          <div className="w-full h-full border rounded-lg bg-gray-900 shadow-lg flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code size={20} className="text-cyan-500" />
                <span className="text-sm font-medium text-white">Code File</span>
                <span className="text-xs text-gray-400">({originalFileName})</span>
              </div>
              <div className="flex gap-2">
                {codeUrl && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = codeUrl;
                      link.download = originalFileName;
                      link.click();
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600"
                  >
                    <Download size={16} className="mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 relative">
              {codeUrl ? (
                <iframe
                  src={codeUrl}
                  className="w-full h-full border-0 rounded-b-lg bg-gray-800"
                  title={`Code Preview: ${originalFileName}`}
                  style={{ fontFamily: 'monospace', color: '#e5e7eb' }}
                  onError={(e) => {
                    const target = e.target as HTMLIFrameElement;
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (target && fallback) {
                      target.style.display = 'none';
                      fallback.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div className={`${codeUrl ? 'hidden' : 'flex'} absolute inset-0 flex-col items-center justify-center text-gray-300`}>
                <Code size={64} className="mb-4 text-cyan-500" />
                <p className="text-sm font-medium">{originalFileName}</p>
                <p className="text-xs mt-2">{formatFileSize(doc.size)}</p>
                {codeUrl ? (
                  <div className="mt-6 space-y-3">
                    <p className="text-xs">Failed to load code preview</p>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = codeUrl;
                        link.download = originalFileName;
                        link.click();
                      }}
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      <Download size={16} className="mr-2" />
                      Download Code
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs mt-4">Demo code file - upload a code file to see inline preview</p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
  }

  // Handle Microsoft Word documents
  const isWordType = doc.type === 'word' || 
                    doc.mimeType?.includes('word') || 
                    doc.mimeType?.includes('document') ||
                    ['doc', 'docx'].includes(doc.type.toLowerCase());

  if (isWordType) {
      // Use CanvasPreviewWithFetch for all Word documents (works with or without originalFile)
      return (
        <div className={`w-full h-full ${className}`}>
          <CanvasPreviewWithFetch document={doc} className="w-full h-full" />
        </div>
      );
  }

  // Handle Microsoft Excel documents  
  const isExcelType = doc.type === 'excel' || 
                     doc.mimeType?.includes('sheet') || 
                     doc.mimeType?.includes('excel') ||
                     ['xls', 'xlsx'].includes(doc.type.toLowerCase());

  if (isExcelType) {
      // Use CanvasPreviewWithFetch for all Excel documents (works with or without originalFile)
      return (
        <div className={`w-full h-full ${className}`}>
          <CanvasPreviewWithFetch document={doc} className="w-full h-full" />
        </div>
      );
  }

  // Handle Microsoft PowerPoint documents
  const isPowerPointType = doc.type === 'powerpoint' || 
                          doc.mimeType?.includes('presentation') || 
                          doc.mimeType?.includes('powerpoint') ||
                          ['ppt', 'pptx'].includes(doc.type.toLowerCase());

  if (isPowerPointType) {
      // Use CanvasPreviewWithFetch for all PowerPoint documents (works with or without originalFile)
      return (
        <div className={`w-full h-full ${className}`}>
          <CanvasPreviewWithFetch document={doc} className="w-full h-full" />
        </div>
      );
  }

  // Default fallback - use CanvasPreviewWithFetch for any other file types
  // This ensures all file types get some kind of preview
  return (
    <div className={`w-full h-full ${className}`}>
      <CanvasPreviewWithFetch document={doc} className="w-full h-full" />
    </div>
  );
}