import { IFileProcessor, FileProcessingOptions, FileProcessingResult, ProcessingMethod } from '../types';

// Dynamic import to avoid pdf-parse initialization issues
let pdfParse: any = null;

async function getPdfParse() {
  if (!pdfParse) {
    try {
      // Import the core library directly to bypass the problematic index.js
      const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
      pdfParse = pdfParseModule.default || pdfParseModule;
    } catch (error) {
      throw new Error(`PDF parser not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  return pdfParse;
}

/**
 * PDF file processor using pdf-parse library
 */
export class PDFProcessor implements IFileProcessor {
  private readonly supportedTypes = [
    'application/pdf',
  ];

  canProcess(mimeType: string): boolean {
    return this.supportedTypes.includes(mimeType);
  }

  getName(): string {
    return 'PDFProcessor';
  }

  getSupportedTypes(): string[] {
    return [...this.supportedTypes];
  }

  async extractText(buffer: Buffer, options: FileProcessingOptions): Promise<FileProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Validate file size
      if (buffer.length > options.maxFileSize) {
        throw new Error(`File size ${buffer.length} exceeds maximum allowed size ${options.maxFileSize}`);
      }

      // Get pdf-parse dynamically
      const pdfParseFunction = await getPdfParse();

      // Parse PDF - remove artificial page limit that was truncating text
      const pdfData = await pdfParseFunction(buffer, {
        // Let pdf-parse extract all text without artificial page limits
        // The maxTextLength option will be applied after extraction
      });

      let extractedText = pdfData.text;
      
      // Intelligent text formatting - preserve structure while fixing common PDF issues
      console.log(`📄 [PDF] Raw text length: ${extractedText.length} chars`);
      
      // Fix common PDF extraction issues while preserving formatting
      extractedText = extractedText
        // Fix words that are concatenated (add space between lowercase and uppercase)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // Fix concatenated words with common patterns
        .replace(/([a-z])(and|or|the|of|in|to|for|with|on|at|by|from)([A-Z])/g, '$1 $2 $3')
        // Fix missing spaces after periods, commas, semicolons
        .replace(/([.,:;])([A-Za-z])/g, '$1 $2')
        // Fix missing spaces after closing parentheses/brackets
        .replace(/([)\]])([A-Za-z])/g, '$1 $2')
        // Fix missing spaces before opening parentheses/brackets
        .replace(/([A-Za-z])([(\[])/g, '$1 $2')
        // Preserve paragraph breaks (double newlines)
        .replace(/\n\s*\n/g, '\n\n')
        // Preserve single line breaks for list items and structured content
        .replace(/\n(?!\n)/g, '\n')
        // Remove excessive spaces (but not all whitespace)
        .replace(/ {2,}/g, ' ')
        // Preserve tabs for indentation
        .replace(/\t/g, '    ')
        // Trim each line but preserve overall structure
        .split('\n')
        .map((line: string) => line.trim())
        .join('\n')
        // Remove excessive blank lines (more than 2)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      console.log(`📄 [PDF] Formatted text length: ${extractedText.length} chars`);
      
      // Only trim if exceeds max length (and log a warning)
      if (extractedText.length > options.maxTextLength) {
        console.warn(`⚠️ [PDF] Text exceeds max length (${extractedText.length} > ${options.maxTextLength}), trimming...`);
        extractedText = extractedText.substring(0, options.maxTextLength);
      }

      const processingDuration = Date.now() - startTime;
      
      // Extract metadata
      const metadata = {
        size: buffer.length,
        mimeType: 'application/pdf',
        document: {
          pages: pdfData.numpages,
          characters: extractedText.length,
          words: extractedText.split(/\s+/).length,
          title: pdfData.info?.Title || undefined,
          author: pdfData.info?.Author || undefined,
          subject: pdfData.info?.Subject || undefined,
          keywords: pdfData.info?.Keywords || undefined,
        },
      };

      return {
        success: true,
        text: extractedText,
        metadata,
        processing: {
          duration: processingDuration,
          method: ProcessingMethod.PARSER,
          confidence: 0.95, // PDF parsing is generally very reliable
        },
      };

    } catch (error) {
      const processingDuration = Date.now() - startTime;
      
      return {
        success: false,
        text: '',
        metadata: {
          size: buffer.length,
          mimeType: 'application/pdf',
        },
        processing: {
          duration: processingDuration,
          method: ProcessingMethod.PARSER,
          confidence: 0,
        },
        error: {
          code: 'PDF_PARSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred while parsing PDF',
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }
}