export * from './types';
export * from './file-processing-adapter';

// Export individual processors for advanced usage
export { PDFProcessor } from './processors/pdf-processor';
export { OfficeProcessor } from './processors/office-processor';
export { OCRProcessor } from './processors/ocr-processor';
export { TextProcessor } from './processors/text-processor';
export { ArchiveProcessor } from './processors/archive-processor';

// Export utility functions
export * from './utils';

// Create a default instance for easy usage
import { FileProcessingAdapter } from './file-processing-adapter';
export const fileProcessor = new FileProcessingAdapter();