import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { IFileProcessor, FileProcessingOptions, FileProcessingResult, ProcessingMethod } from '../types';

/**
 * Office document processor using mammoth and xlsx libraries
 */
export class OfficeProcessor implements IFileProcessor {
  private readonly supportedTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
  ];

  canProcess(mimeType: string): boolean {
    return this.supportedTypes.includes(mimeType);
  }

  getName(): string {
    return 'OfficeProcessor';
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

      const mimeType = await this.detectMimeType(buffer);
      let extractedText = '';
      let documentMetadata: Record<string, unknown> = {};

      if (this.isWordDocument(mimeType)) {
        const result = await this.extractFromWordDocument(buffer, options);
        extractedText = result.text;
        documentMetadata = result.metadata;
      } else if (this.isExcelDocument(mimeType)) {
        const result = await this.extractFromExcelDocument(buffer, options);
        extractedText = result.text;
        documentMetadata = result.metadata;
      } else {
        throw new Error(`Unsupported office document type: ${mimeType}`);
      }

      // Trim text to max length if needed
      if (extractedText.length > options.maxTextLength) {
        extractedText = extractedText.substring(0, options.maxTextLength);
      }

      const processingDuration = Date.now() - startTime;
      
      const metadata = {
        size: buffer.length,
        mimeType,
        document: {
          characters: extractedText.length,
          words: extractedText.split(/\s+/).length,
          ...documentMetadata,
        },
      };

      return {
        success: true,
        text: extractedText,
        metadata,
        processing: {
          duration: processingDuration,
          method: ProcessingMethod.CONVERTER,
          confidence: 0.9,
        },
      };

    } catch (error) {
      const processingDuration = Date.now() - startTime;
      
      return {
        success: false,
        text: '',
        metadata: {
          size: buffer.length,
          mimeType: 'application/octet-stream',
        },
        processing: {
          duration: processingDuration,
          method: ProcessingMethod.CONVERTER,
          confidence: 0,
        },
        error: {
          code: 'OFFICE_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred while processing office document',
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  private async detectMimeType(buffer: Buffer): Promise<string> {
    // Simple magic number detection
    const header = buffer.subarray(0, 4);
    
    // ZIP-based formats (docx, xlsx)
    if (header[0] === 0x50 && header[1] === 0x4B) {
      // Check for docx/xlsx by looking for specific content
      const bufferString = buffer.toString('ascii', 0, 1000);
      if (bufferString.includes('word/')) {
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (bufferString.includes('xl/')) {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
    }
    
    // Legacy Word documents
    if (header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0) {
      return 'application/msword';
    }
    
    // CSV detection (simple heuristic)
    const text = buffer.toString('utf8', 0, 1000);
    if (text.includes(',') && text.includes('\n')) {
      return 'text/csv';
    }
    
    return 'application/octet-stream';
  }

  private isWordDocument(mimeType: string): boolean {
    return [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ].includes(mimeType);
  }

  private isExcelDocument(mimeType: string): boolean {
    return [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ].includes(mimeType);
  }

  private async extractFromWordDocument(buffer: Buffer, options: FileProcessingOptions): Promise<{ text: string; metadata: Record<string, unknown> }> {
    try {
      console.log(`📄 [OfficeProcessor] Starting Word document extraction, buffer size: ${buffer.length} bytes`);

      const result = await mammoth.extractRawText({ buffer });
      let text = result.value;

      console.log(`📄 [OfficeProcessor] Raw text extracted, length: ${text.length} chars`);
      console.log(`📄 [OfficeProcessor] First 200 chars: "${text.substring(0, 200)}"`);

      // ALWAYS clean up text to preserve document structure properly
      // This is essential for vectorization and chat functionality regardless of preserveFormatting flag
      // The flag is meant for visual formatting (bold, italics), not for text structure
      text = text
        // First normalize line endings
        .replace(/\r\n/g, '\n')
        // Preserve paragraph breaks (double newlines)
        .replace(/\n\s*\n/g, '\n\n')
        // Fix excessive blank lines (more than 2)
        .replace(/\n{3,}/g, '\n\n')
        // Fix multiple spaces within lines (but preserve newlines)
        .replace(/[ \t]+/g, ' ')
        // Trim each line individually to remove leading/trailing spaces
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0) // Remove empty lines
        .join('\n')
        .trim();

      console.log(`📄 [OfficeProcessor] Cleaned text length: ${text.length} chars`);
      console.log(`📄 [OfficeProcessor] Text has ${text.split('\n').length} lines`);
      console.log(`📄 [OfficeProcessor] First 200 chars after cleaning: "${text.substring(0, 200)}"`);

      const metadata = {
        title: undefined, // mammoth doesn't extract document properties
        author: undefined,
        subject: undefined,
        keywords: undefined,
      };

      return { text, metadata };
    } catch (error) {
      console.error(`❌ [OfficeProcessor] Word extraction failed:`, error);
      throw new Error(`Failed to extract text from Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractFromExcelDocument(buffer: Buffer, options: FileProcessingOptions): Promise<{ text: string; metadata: Record<string, unknown> }> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const texts: string[] = [];
      
      // Process each worksheet
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        
        if (csvData.trim()) {
          texts.push(`=== ${sheetName} ===\n${csvData}`);
        }
      });

      let text = texts.join('\n\n');
      
      // Clean up text if not preserving formatting
      if (!options.preserveFormatting) {
        text = text
          .replace(/,+/g, ', ') // Clean up multiple commas
          .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
          .trim();
      }

      const metadata = {
        title: workbook.Props?.Title || undefined,
        author: workbook.Props?.Author || undefined,
        subject: workbook.Props?.Subject || undefined,
        keywords: workbook.Props?.Keywords || undefined,
        pages: workbook.SheetNames.length, // Number of sheets
      };

      return { text, metadata };
    } catch (error) {
      throw new Error(`Failed to extract text from Excel document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}