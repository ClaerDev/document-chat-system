# File Processing Library

A comprehensive, non-AI file processing library for extracting text from various file formats including PDFs, Office documents, images, text files, and archives.

## Features

- **Multi-format support**: PDF, Word, Excel, PowerPoint, images, text files, HTML, Markdown, JSON, XML, ZIP archives
- **OCR capabilities**: Extract text from images using Tesseract.js
- **No AI dependency**: Pure library-based text extraction
- **Flexible configuration**: Customizable processing options
- **Error handling**: Comprehensive error handling and fallback mechanisms
- **TypeScript support**: Full TypeScript definitions with Zod schemas
- **Security**: Built-in file validation and security checks
- **Performance**: Optimized for large files with configurable limits

## Supported File Types

### Documents
- **PDF** (`.pdf`) - Using pdf-parse
- **Word** (`.docx`, `.doc`) - Using mammoth
- **Excel** (`.xlsx`, `.xls`) - Using xlsx
- **PowerPoint** (`.pptx`, `.ppt`) - Basic support
- **CSV** (`.csv`) - Using xlsx

### Images (OCR)
- **JPEG** (`.jpg`, `.jpeg`)
- **PNG** (`.png`)
- **GIF** (`.gif`)
- **WebP** (`.webp`)
- **BMP** (`.bmp`)
- **TIFF** (`.tif`, `.tiff`)

### Text Files
- **Plain Text** (`.txt`)
- **HTML** (`.html`, `.htm`)
- **Markdown** (`.md`)
- **JSON** (`.json`)
- **XML** (`.xml`)

### Archives
- **ZIP** (`.zip`) - Extract and process contained files

## Installation

The required dependencies are already installed in the project:

```bash
npm install pdf-parse mammoth tesseract.js jszip xlsx cheerio
```

## Basic Usage

### Simple Text Extraction

```typescript
import { fileProcessor } from '@/lib/file-processing';

// Extract text from a file
const buffer = fs.readFileSync('document.pdf');
const result = await fileProcessor.processFile(buffer, 'application/pdf');

if (result.success) {
  console.log('Extracted text:', result.text);
  console.log('Metadata:', result.metadata);
} else {
  console.error('Error:', result.error);
}
```

### With Custom Options

```typescript
import { fileProcessor, FileProcessingOptions } from '@/lib/file-processing';

const options: Partial<FileProcessingOptions> = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  ocrLanguage: 'eng+fra', // English and French
  preserveFormatting: true,
  maxTextLength: 500000, // 500KB
  timeout: 60000, // 60 seconds
  processEmbeddedFiles: true, // For archives
};

const result = await fileProcessor.processFile(buffer, mimeType, options);
```

### With Fallback Processing

```typescript
// Automatically try different processors if the first one fails
const result = await fileProcessor.processFileWithFallback(buffer, mimeType, options);
```

## Advanced Usage

### Using Individual Processors

```typescript
import { PDFProcessor, OCRProcessor } from '@/lib/file-processing';

// Use specific processors directly
const pdfProcessor = new PDFProcessor();
const ocrProcessor = new OCRProcessor();

if (pdfProcessor.canProcess(mimeType)) {
  const result = await pdfProcessor.extractText(buffer, options);
}
```

### Custom Processor Implementation

```typescript
import { IFileProcessor, FileProcessingOptions, FileProcessingResult } from '@/lib/file-processing';

class CustomProcessor implements IFileProcessor {
  canProcess(mimeType: string): boolean {
    return mimeType === 'application/custom';
  }

  getName(): string {
    return 'CustomProcessor';
  }

  getSupportedTypes(): string[] {
    return ['application/custom'];
  }

  async extractText(buffer: Buffer, options: FileProcessingOptions): Promise<FileProcessingResult> {
    // Custom implementation
    return {
      success: true,
      text: 'extracted text',
      metadata: { size: buffer.length, mimeType: 'application/custom' },
      processing: { duration: 100, method: 'custom', confidence: 0.95 },
    };
  }
}
```

## API Reference

### FileProcessingAdapter

#### Methods

##### `processFile(buffer: Buffer, mimeType: string, options?: Partial<FileProcessingOptions>): Promise<FileProcessingResult>`

Process a file and extract text.

- **Parameters:**
  - `buffer`: File content as Buffer
  - `mimeType`: MIME type of the file
  - `options`: Optional processing options
- **Returns:** Promise resolving to FileProcessingResult

##### `processFileWithFallback(buffer: Buffer, mimeType: string, options?: Partial<FileProcessingOptions>): Promise<FileProcessingResult>`

Process a file with automatic fallback to other processors if the primary one fails.

##### `getSupportedTypes(): string[]`

Get all supported MIME types.

##### `isSupported(mimeType: string): boolean`

Check if a MIME type is supported.

##### `getProcessingStats(): object`

Get processing statistics and supported types.

### FileProcessingOptions

```typescript
interface FileProcessingOptions {
  maxFileSize: number;          // Maximum file size in bytes (default: 50MB)
  ocrLanguage: string;          // OCR language (default: 'eng')
  extractMetadata: boolean;     // Extract file metadata (default: true)
  preserveFormatting: boolean;  // Preserve text formatting (default: false)
  maxTextLength: number;        // Maximum text length (default: 1MB)
  timeout: number;              // Processing timeout in ms (default: 30s)
  processEmbeddedFiles: boolean; // Process files in archives (default: false)
}
```

### FileProcessingResult

```typescript
interface FileProcessingResult {
  success: boolean;
  text: string;
  metadata: {
    size: number;
    mimeType: string;
    filename?: string;
    created?: Date;
    modified?: Date;
    document?: {
      title?: string;
      author?: string;
      subject?: string;
      keywords?: string;
      pages?: number;
      words?: number;
      characters?: number;
    };
    image?: {
      width?: number;
      height?: number;
      colorSpace?: string;
      hasAlpha?: boolean;
      dpi?: number;
      exif?: Record<string, any>;
    };
  };
  processing: {
    duration: number;
    method: string;
    confidence?: number;
    warnings?: string[];
  };
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}
```

## Utility Functions

### File Type Detection

```typescript
import { getMimeTypeFromExtension, isSupportedFileType } from '@/lib/file-processing';

const mimeType = getMimeTypeFromExtension('document.pdf'); // 'application/pdf'
const isSupported = isSupportedFileType(mimeType); // true
```

### File Validation

```typescript
import { validateFileBuffer, sanitizeFilename } from '@/lib/file-processing';

const validation = validateFileBuffer(buffer);
if (!validation.valid) {
  console.error(validation.error);
}

const safeFilename = sanitizeFilename('unsafe file name!.pdf'); // 'unsafe_file_name.pdf'
```

### Text Processing

```typescript
import { cleanExtractedText, isValidText } from '@/lib/file-processing';

const cleanedText = cleanExtractedText(rawText, false);
const isValid = isValidText(cleanedText);
```

## Error Handling

The library provides comprehensive error handling with specific error codes:

- `PDF_PARSING_ERROR`: PDF processing failed
- `OFFICE_PROCESSING_ERROR`: Office document processing failed
- `OCR_PROCESSING_ERROR`: OCR processing failed
- `TEXT_PROCESSING_ERROR`: Text processing failed
- `ARCHIVE_PROCESSING_ERROR`: Archive processing failed
- `ADAPTER_ERROR`: General adapter error

```typescript
const result = await fileProcessor.processFile(buffer, mimeType);

if (!result.success) {
  switch (result.error?.code) {
    case 'PDF_PARSING_ERROR':
      console.error('PDF parsing failed:', result.error.message);
      break;
    case 'OCR_PROCESSING_ERROR':
      console.error('OCR processing failed:', result.error.message);
      break;
    default:
      console.error('Unknown error:', result.error?.message);
  }
}
```

## Performance Considerations

1. **File Size Limits**: Configure appropriate limits based on your needs
2. **OCR Processing**: Image OCR can be slow; consider using appropriate timeouts
3. **Memory Usage**: Large files may consume significant memory during processing
4. **Archive Processing**: Processing embedded files in archives can be resource-intensive

## Security Considerations

1. **File Validation**: Always validate file buffers before processing
2. **Size Limits**: Enforce reasonable file size limits
3. **Sanitization**: Sanitize filenames and extracted text
4. **Error Handling**: Don't expose sensitive information in error messages

## Integration with Existing Codebase

The library is designed to integrate seamlessly with the existing GovMatch AI file processing system:

```typescript
// In your API route
import { fileProcessor } from '@/lib/file-processing';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await fileProcessor.processFile(buffer, file.type);
  
  return Response.json(result);
}
```

## Testing

Basic tests can be created using Jest:

```typescript
import { fileProcessor } from '@/lib/file-processing';

describe('File Processing', () => {
  it('should extract text from PDF', async () => {
    const buffer = fs.readFileSync('test.pdf');
    const result = await fileProcessor.processFile(buffer, 'application/pdf');
    
    expect(result.success).toBe(true);
    expect(result.text).toBeDefined();
    expect(result.metadata.mimeType).toBe('application/pdf');
  });
});
```

## Contributing

To add support for new file types:

1. Create a new processor implementing `IFileProcessor`
2. Add it to the `FileProcessingAdapter` constructor
3. Update the supported types documentation
4. Add appropriate tests

## License

This library is part of the GovMatch AI project and follows the same license terms.