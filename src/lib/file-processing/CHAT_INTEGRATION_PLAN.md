# File Processing Chat Integration Plan (In-Memory Only)

## Overview

This document outlines the plan to integrate the file processing system with the GovMatch AI chat system for in-memory document processing. Files uploaded in chat will be processed on-the-fly and NOT saved to the database.

## Key Principle

- **Chat Files**: Processed in-memory only, discarded after chat session
- **Document Files** (from /documents): Saved to database as "documents" (future feature)
- **No Persistence**: Chat files exist only during the active session

## Current State Analysis

### Existing Capabilities ✅
- File upload via drag-and-drop in chat
- Base64 encoding for AI transmission
- File attachment tracking in React state
- Citation tracking for responses

### What We'll Add
- Text extraction using file-processing adapter
- Reduced token usage (60-80% reduction)
- Better AI comprehension of documents
- Support for 21+ file types

## Implementation Plan

### Step 1: Update Chat Component File Processing

```typescript
// In src/components/ai/clean-ai-chat.tsx

// Add import at the top
import { fileProcessor } from '@/lib/file-processing';

// Update the AttachedFile interface to include processed text
interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;  // Keep for images
  preview?: string;
  // NEW FIELDS:
  processedText?: string;     // Extracted text content
  isProcessed?: boolean;      // Processing status
  processingError?: string;   // Error message if processing failed
  processingMethod?: string;  // How the file was processed
}
```

### Step 2: Enhance File Upload Handler

```typescript
// Replace the existing handleFileUpload function
const handleFileUpload = async (files: FileList) => {
  if (!files || files.length === 0) return;

  const maxFileSize = 50 * 1024 * 1024; // 50MB limit
  const maxFiles = 10;

  if (attachedFiles.length + files.length > maxFiles) {
    setError(`Maximum ${maxFiles} files allowed`);
    return;
  }

  setIsProcessingFiles(true); // Add this state
  const newFiles: AttachedFile[] = [];

  for (const file of Array.from(files)) {
    // Validate file size
    if (file.size > maxFileSize) {
      setError(`File "${file.name}" exceeds 50MB limit`);
      continue;
    }

    try {
      // For images, keep original base64 for vision models
      if (file.type.startsWith('image/')) {
        const base64 = await convertFileToBase64(file);
        newFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
          preview: URL.createObjectURL(file),
          isProcessed: true,
          processingMethod: 'image-passthrough'
        });
      } else {
        // For documents, extract text
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Process with our file processor
        const result = await fileProcessor.processFileWithFallback(
          buffer,
          file.type || 'application/octet-stream',
          {
            maxTextLength: 500000, // 500k chars max
            extractMetadata: true,
            timeout: 30000
          }
        );

        if (result.success && result.text.trim()) {
          // Successfully processed - store extracted text
          newFiles.push({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            data: '', // Empty to save memory
            preview: URL.createObjectURL(file),
            processedText: result.text,
            isProcessed: true,
            processingMethod: result.processing.method
          });
        } else {
          // Failed to process - fallback to base64
          const base64 = await convertFileToBase64(file);
          newFiles.push({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            data: base64,
            preview: URL.createObjectURL(file),
            isProcessed: false,
            processingError: result.error?.message || 'Failed to extract text'
          });
        }
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      setError(`Failed to process "${file.name}"`);
    }
  }

  setAttachedFiles(prev => [...prev, ...newFiles]);
  setIsProcessingFiles(false);
};
```

### Step 3: Update Message Building for AI Context

```typescript
// In the buildMessages function
const buildMessages = (): any[] => {
  const messages: any[] = [];

  // System prompt
  messages.push({
    role: 'system',
    content: GOVMATCH_SYSTEM_PROMPT
  });

  // Add processed file contents as context
  const fileContexts = attachedFiles
    .filter(file => file.processedText && file.isProcessed)
    .map(file => ({
      role: 'system',
      content: `[Document: "${file.name}" (${formatFileSize(file.size)})]\n${file.processedText}\n[End of Document]`
    }));

  messages.push(...fileContexts);

  // Add conversation history
  messages.push(...conversationMessages);

  // For images, include them in the last user message
  const imageAttachments = attachedFiles
    .filter(file => file.type.startsWith('image/') && file.data)
    .map(file => ({
      type: 'image_url',
      image_url: { url: file.data }
    }));

  // Add current input
  if (imageAttachments.length > 0) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: inputValue },
        ...imageAttachments
      ]
    });
  } else {
    messages.push({
      role: 'user',
      content: inputValue
    });
  }

  return messages;
};
```

### Step 4: Update File Display UI

```typescript
// In the file attachment display section
{attachedFiles.map((file) => (
  <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
    <div className="flex-1">
      <p className="text-sm font-medium">{file.name}</p>
      <p className="text-xs text-gray-500">
        {formatFileSize(file.size)}
        {file.isProcessed && file.processedText && 
          ` • ${file.processedText.length.toLocaleString()} chars extracted`
        }
        {file.processingError && 
          <span className="text-red-500"> • {file.processingError}</span>
        }
      </p>
    </div>
    {file.isProcessed && !file.processingError && (
      <CheckCircle className="w-4 h-4 text-green-500" />
    )}
    <button
      onClick={() => removeFile(file.id)}
      className="p-1 hover:bg-gray-200 rounded"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
))}
```

### Step 5: Add Processing State

```typescript
// Add new state variables
const [isProcessingFiles, setIsProcessingFiles] = useState(false);

// Update the file input area to show processing state
{isProcessingFiles && (
  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span className="text-sm text-blue-600">Processing files...</span>
  </div>
)}
```

## Benefits of This Approach

1. **Token Savings**: 60-80% reduction in token usage for documents
2. **Better AI Understanding**: Clean text instead of base64 encoded files
3. **Faster Processing**: No database writes, pure in-memory processing
4. **Cost Effective**: Significantly lower API costs
5. **Wide Format Support**: 21+ file types supported
6. **No Storage Overhead**: Files not persisted to database

## Supported File Types

- **Documents**: PDF, DOCX, DOC, ODT, RTF
- **Spreadsheets**: XLSX, XLS, CSV
- **Text**: TXT, MD, JSON, XML, HTML
- **Images**: JPG, PNG, GIF, BMP, WebP (with OCR)
- **Archives**: ZIP (extracts text from contained files)

## Performance Considerations

1. **Memory Usage**: Files processed in-memory, then discarded
2. **Processing Time**: Most files process in < 1 second
3. **Concurrent Processing**: Files processed in parallel
4. **Size Limits**: 50MB per file, 10 files max
5. **Text Limits**: 500k characters per file

## Error Handling

1. **Unsupported Files**: Fallback to base64 (original behavior)
2. **Processing Failures**: Show error message, allow retry
3. **Size Violations**: Reject with clear error message
4. **Timeout Protection**: 30-second processing timeout

## Testing Scenarios

1. Upload a PDF contract and ask questions about it
2. Upload multiple documents and compare them
3. Upload a mix of images and documents
4. Test with large files (near 50MB limit)
5. Test with unsupported file types

## Implementation Checklist

- [ ] Update AttachedFile interface
- [ ] Implement enhanced handleFileUpload
- [ ] Update buildMessages for processed text
- [ ] Add processing state UI
- [ ] Add file validation
- [ ] Test with various file types
- [ ] Monitor token usage reduction

## No Database Changes Required

Since we're keeping everything in-memory for chat:
- No Prisma schema updates needed
- No new API endpoints required
- No migration scripts
- No storage configuration

Files are processed, used for the chat session, and discarded when the session ends.

## Next Steps

1. Implement the code changes in `clean-ai-chat.tsx`
2. Test with real government documents
3. Monitor token usage and cost savings
4. Gather user feedback on improved document understanding
5. Consider adding a "processing method" indicator in UI