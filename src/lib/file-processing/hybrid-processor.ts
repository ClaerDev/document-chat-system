/**
 * Hybrid file processor: Server-side processing with browser fallback
 */

import { browserFileProcessor } from './browser-adapter';
import { FileProcessingOptions, FileProcessingResult } from './types';

export class HybridFileProcessor {
  private static instance: HybridFileProcessor;

  static getInstance(): HybridFileProcessor {
    if (!HybridFileProcessor.instance) {
      HybridFileProcessor.instance = new HybridFileProcessor();
    }
    return HybridFileProcessor.instance;
  }

  /**
   * Get supported file types (combines server and browser support)
   */
  getSupportedTypes(): string[] {
    return browserFileProcessor.getSupportedTypes();
  }

  /**
   * Check if a file type is supported
   */
  isSupported(mimeType: string): boolean {
    return browserFileProcessor.isSupported(mimeType);
  }

  /**
   * Process file with hybrid approach: server-side first, browser fallback
   */
  async processFileWithFallback(
    file: File,
    options: Partial<FileProcessingOptions> = {}
  ): Promise<FileProcessingResult> {
    const startTime = Date.now();
    
    console.log(`🔄 Starting hybrid processing for ${file.name} (${file.type})`);

    // Try server-side processing first for better quality
    if (this.shouldUseServerProcessing(file.type, file.size)) {
      console.log(`📡 Attempting server-side processing for ${file.type} (${file.size} bytes)...`);
      console.log(`🔧 shouldUseServerProcessing returned: true`);
      
      try {
        const serverResult = await this.processOnServer(file, options);
        
        if (serverResult.success && serverResult.text.trim().length > 0) {
          console.log(`✅ Server processing successful: ${serverResult.text.length} characters`);
          return {
            ...serverResult,
            processing: {
              ...serverResult.processing,
              warnings: [...(serverResult.processing.warnings || []), 'Processed on server']
            }
          };
        } else {
          console.log(`⚠️ Server processing failed or empty result, trying browser...`);
        }
      } catch (error) {
        console.log(`⚠️ Server processing error, falling back to browser:`, error);
      }
    }

    // Fallback to browser processing
    console.log(`🌐 Using browser processing...`);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await browserFileProcessor.processFileWithFallback(
        arrayBuffer,
        file.type,
        options
      );

      const totalDuration = Date.now() - startTime;
      
      return {
        ...result,
        processing: {
          ...result.processing,
          duration: totalDuration,
          warnings: [...(result.processing.warnings || []), 'Processed in browser']
        }
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        metadata: {
          size: file.size,
          mimeType: file.type,
        },
        processing: {
          duration: Date.now() - startTime,
          method: 'hybrid_failed' as any,
          confidence: 0,
        },
        error: {
          code: 'HYBRID_PROCESSING_ERROR',
          message: `Both server and browser processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

  /**
   * Determine if we should try server-side processing
   */
  private shouldUseServerProcessing(mimeType: string, fileSize: number): boolean {
    // For now, focus on browser processing until server endpoint is stable
    // Server processing will be re-enabled after testing
    
    // Use server for complex formats that benefit from server-side libraries
    const serverBeneficialTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'application/msword', // DOC
      'application/vnd.ms-excel', // XLS
      'application/vnd.ms-powerpoint', // PPT
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
      'application/zip',
      'application/x-rar-compressed',
    ];

    // Allow larger files for server processing - server has more capabilities
    const maxServerFileSize = 50 * 1024 * 1024; // 50MB (increased for better PDF processing)
    
    // Try server for PDFs up to 50MB - server processing is much better for large PDFs
    const shouldTryServer = mimeType === 'application/pdf' && 
                           fileSize <= maxServerFileSize && 
                           fileSize >= 1024; // Skip tiny files
    
    return shouldTryServer;
  }

  /**
   * Process file on server
   */
  private async processOnServer(
    file: File,
    options: Partial<FileProcessingOptions> = {}
  ): Promise<FileProcessingResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    const controller = new AbortController();
    // Longer timeout for large PDFs - processing can take more time
    const timeoutMs = file.size > 20 * 1024 * 1024 ? 60000 : 30000; // 60s for large files, 30s for smaller
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('/api/v1/file-processing', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Server processing failed: ${response.status} ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Server processing timeout (${timeoutMs/1000}s limit exceeded)`);
      }
      throw error;
    }
  }
}

// Export singleton instance
export const hybridFileProcessor = HybridFileProcessor.getInstance();