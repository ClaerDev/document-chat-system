import { createWorker } from 'tesseract.js';
import { IFileProcessor, FileProcessingOptions, FileProcessingResult, ProcessingMethod } from '../types';

/**
 * OCR processor for images using Tesseract.js
 */
export class OCRProcessor implements IFileProcessor {
  private readonly supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ];

  canProcess(mimeType: string): boolean {
    return this.supportedTypes.includes(mimeType);
  }

  getName(): string {
    return 'OCRProcessor';
  }

  getSupportedTypes(): string[] {
    return [...this.supportedTypes];
  }

  async extractText(buffer: Buffer, options: FileProcessingOptions): Promise<FileProcessingResult> {
    const startTime = Date.now();
    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    
    try {
      // Validate file size
      if (buffer.length > options.maxFileSize) {
        throw new Error(`File size ${buffer.length} exceeds maximum allowed size ${options.maxFileSize}`);
      }

      // Create Tesseract worker with specified language
      worker = await createWorker(options.ocrLanguage);
      
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('OCR processing timeout')), options.timeout);
      });

      // Perform OCR
      const ocrPromise = worker.recognize(buffer);
      const result = await Promise.race([ocrPromise, timeoutPromise]);

      let extractedText = result.data.text;
      const confidence = result.data.confidence / 100; // Convert to 0-1 range

      // Trim text to max length if needed
      if (extractedText.length > options.maxTextLength) {
        extractedText = extractedText.substring(0, options.maxTextLength);
      }

      // Clean up text if not preserving formatting
      if (!options.preserveFormatting) {
        extractedText = extractedText
          .replace(/\s+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      const processingDuration = Date.now() - startTime;
      
      // Extract image metadata
      const imageMetadata = await this.extractImageMetadata(buffer);
      
      const metadata = {
        size: buffer.length,
        mimeType: this.detectMimeType(buffer),
        document: {
          characters: extractedText.length,
          words: extractedText.split(/\s+/).filter(word => word.length > 0).length,
        },
        image: imageMetadata,
      };

      return {
        success: true,
        text: extractedText,
        metadata,
        processing: {
          duration: processingDuration,
          method: ProcessingMethod.OCR,
          confidence,
          warnings: confidence < 0.5 ? ['Low confidence OCR result'] : undefined,
        },
      };

    } catch (error) {
      const processingDuration = Date.now() - startTime;
      
      return {
        success: false,
        text: '',
        metadata: {
          size: buffer.length,
          mimeType: this.detectMimeType(buffer),
        },
        processing: {
          duration: processingDuration,
          method: ProcessingMethod.OCR,
          confidence: 0,
        },
        error: {
          code: 'OCR_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred during OCR processing',
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    } finally {
      // Clean up worker
      if (worker) {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.warn('Failed to terminate OCR worker:', terminateError);
        }
      }
    }
  }

  private detectMimeType(buffer: Buffer): string {
    // Simple magic number detection
    const header = buffer.subarray(0, 12);
    
    // PNG
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
      return 'image/png';
    }
    
    // JPEG
    if (header[0] === 0xFF && header[1] === 0xD8) {
      return 'image/jpeg';
    }
    
    // GIF
    if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
      return 'image/gif';
    }
    
    // WebP
    if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
        header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
      return 'image/webp';
    }
    
    // BMP
    if (header[0] === 0x42 && header[1] === 0x4D) {
      return 'image/bmp';
    }
    
    // TIFF
    if ((header[0] === 0x49 && header[1] === 0x49 && header[2] === 0x2A && header[3] === 0x00) ||
        (header[0] === 0x4D && header[1] === 0x4D && header[2] === 0x00 && header[3] === 0x2A)) {
      return 'image/tiff';
    }
    
    return 'image/unknown';
  }

  private async extractImageMetadata(buffer: Buffer): Promise<Record<string, unknown>> {
    try {
      // Basic metadata extraction
      const metadata: Record<string, unknown> = {};
      
      const mimeType = this.detectMimeType(buffer);
      metadata.mimeType = mimeType;
      
      // For PNG, we can extract basic dimensions
      if (mimeType === 'image/png') {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        metadata.width = width;
        metadata.height = height;
      }
      
      // For JPEG, basic dimensions extraction
      if (mimeType === 'image/jpeg') {
        const dimensions = this.extractJPEGDimensions(buffer);
        if (dimensions) {
          metadata.width = dimensions.width;
          metadata.height = dimensions.height;
        }
      }
      
      return metadata;
    } catch {
      console.warn('Failed to extract image metadata');
      return {};
    }
  }

  private extractJPEGDimensions(buffer: Buffer): { width: number; height: number } | null {
    try {
      let offset = 2; // Skip SOI marker
      
      while (offset < buffer.length) {
        const marker = buffer.readUInt16BE(offset);
        
        if (marker === 0xFFC0 || marker === 0xFFC1 || marker === 0xFFC2) {
          // Start of Frame marker
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
      
      return null;
    } catch {
      return null;
    }
  }
}