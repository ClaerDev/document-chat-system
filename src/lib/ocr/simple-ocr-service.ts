import { createWorker } from 'tesseract.js';
import { DocumentSectionsAnalyzer } from '@/lib/ai/services/document-sections-analyzer';
import { DocumentMetadataAnalyzer } from '@/lib/ai/services/document-metadata-analyzer';
import { EntityExtractor } from '@/lib/ai/services/entity-extractor';
import { prisma } from '@/lib/db';

/**
 * Enhanced OCR Service - Extracts text and populates document fields for full analysis
 * TypeScript equivalent of Python PIL + pytesseract with document processing
 */
export class SimpleOCRService {
  private worker: any = null;

  /**
   * Initialize the OCR worker
   * @param language - OCR language (default: 'eng')
   */
  async initialize(language: string = 'eng'): Promise<void> {
    if (this.worker) {
      return; // Already initialized
    }

    try {
      // Use minimal configuration that works in all environments
      console.log('🔄 Initializing OCR worker with minimal configuration...');
      
      this.worker = await createWorker(language);
      
      console.log('✅ OCR worker initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OCR worker:', error);
      
      // Since OCR is failing consistently, throw a specific error
      // This will trigger the fallback processing in the upload handler
      throw new Error(`OCR_WORKER_UNAVAILABLE: ${error.message}`);
    }
  }

  /**
   * Extract text from image - equivalent to pytesseract.image_to_string()
   * @param imagePath - Path to image file or File object or Buffer
   * @returns Extracted text string
   */
  async extractText(imagePath: string | File | Buffer): Promise<string> {
    if (!this.worker) {
      await this.initialize();
    }

    try {
      console.log('🔍 Starting OCR text extraction...');
      
      // Handle different input types
      let imageInput: string | File | Buffer;
      
      if (typeof imagePath === 'string') {
        // File path - load the image
        imageInput = imagePath;
      } else if (imagePath instanceof File) {
        // File object
        imageInput = imagePath;
      } else if (Buffer.isBuffer(imagePath)) {
        // Buffer
        imageInput = imagePath;
      } else {
        throw new Error('Unsupported image input type');
      }

      // Extract text using Tesseract
      const { data: { text } } = await this.worker.recognize(imageInput);
      
      console.log('✅ OCR text extraction completed');
      console.log('📄 Extracted text length:', text.length, 'characters');
      
      return text.trim();

    } catch (error) {
      console.error('❌ OCR text extraction failed:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text with additional options and metadata
   * @param imagePath - Path to image file or File object or Buffer
   * @param options - OCR options
   * @returns OCR result with text and metadata
   */
  async extractTextWithMetadata(
    imagePath: string | File | Buffer,
    options: {
      language?: string;
      pageSegMode?: number;
      ocrEngineMode?: number;
    } = {}
  ): Promise<{
    text: string;
    confidence: number;
    words: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
    metadata: {
      processingTime: number;
      imageSize?: { width: number; height: number };
    };
  }> {
    const startTime = Date.now();
    
    if (!this.worker) {
      await this.initialize(options.language);
    }

    try {
      console.log('🔍 Starting OCR with metadata extraction...');

      // Configure worker options if provided
      if (options.pageSegMode !== undefined) {
        await this.worker.setParameters({
          tessedit_pageseg_mode: options.pageSegMode
        });
      }

      if (options.ocrEngineMode !== undefined) {
        await this.worker.setParameters({
          tessedit_ocr_engine_mode: options.ocrEngineMode
        });
      }

      // Perform OCR
      const result = await this.worker.recognize(imagePath);
      const processingTime = Date.now() - startTime;

      // Extract words with confidence and bounding boxes
      const words = result.data.words.map((word: any) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1
        }
      }));

      console.log('✅ OCR with metadata completed');
      console.log('📊 Results:', {
        textLength: result.data.text.length,
        confidence: result.data.confidence,
        wordCount: words.length,
        processingTime: `${processingTime}ms`
      });

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence,
        words,
        metadata: {
          processingTime,
          imageSize: result.data.imageSize || undefined
        }
      };

    } catch (error) {
      console.error('❌ OCR with metadata failed:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text and populate document fields for full analysis
   * This is the main method that processes images and prepares them for analysis
   * @param documentId - Database document ID
   * @param imagePath - Image file path, File object, or Buffer
   * @param organizationId - Organization ID for context
   * @returns Complete document processing result
   */
  async processImageDocument(
    documentId: string,
    imagePath: string | File | Buffer,
    organizationId: string
  ): Promise<{
    success: boolean;
    extractedText: string;
    sections: any[];
    metadata: any;
    entities: any;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Starting complete image document processing for: ${documentId}`);

      // Step 1: Extract text using OCR
      console.log('📄 Step 1: Extracting text from image...');
      const ocrResult = await this.extractTextWithMetadata(imagePath);
      const extractedText = ocrResult.text;
      
      if (!extractedText || extractedText.length < 10) {
        throw new Error('Insufficient text extracted from image. Image may be too blurry or contain no readable text.');
      }

      console.log(`✅ OCR completed - extracted ${extractedText.length} characters`);

      // Step 2: Analyze document sections
      console.log('📑 Step 2: Analyzing document sections...');
      const sectionsAnalyzer = new DocumentSectionsAnalyzer();
      const sections = await sectionsAnalyzer.analyzeDocumentSections(extractedText, {
        documentType: 'UNKNOWN', // Will be determined by metadata analysis
        includeMetadata: true
      });

      console.log(`✅ Sections analysis completed - found ${sections.length} sections`);

      // Step 3: Extract metadata and document type
      console.log('🏷️ Step 3: Extracting document metadata...');
      const metadataAnalyzer = new DocumentMetadataAnalyzer();
      const metadata = await metadataAnalyzer.analyzeDocumentMetadata(extractedText, {
        includeKeywords: true,
        includeClassification: true,
        includeSummary: true
      });

      console.log('✅ Metadata analysis completed');

      // Step 4: Extract entities (companies, dates, amounts, etc.)
      console.log('🏢 Step 4: Extracting entities...');
      const entityExtractor = new EntityExtractor();
      const entities = await entityExtractor.extractEntities(extractedText, {
        includeCompanies: true,
        includeDates: true,
        includeAmounts: true,
        includeLocations: true,
        includePersons: true
      });

      console.log(`✅ Entity extraction completed - found ${Object.keys(entities).length} entity types`);

      // Step 5: Update document in database with all extracted information
      console.log('💾 Step 5: Updating document in database...');
      
      const updatedDocument = await prisma.document.update({
        where: { id: documentId },
        data: {
          // Basic extracted text
          extractedText: extractedText,
          
          // Update processing status
          processing: {
            currentStatus: 'COMPLETED',
            startedAt: new Date(),
            completedAt: new Date(),
            error: null,
            note: 'OCR and document analysis completed successfully',
            progress: 100,
            currentStep: 'Analysis Complete'
          },
          
          // Document content with sections
          content: {
            sections: sections,
            tables: [], // OCR doesn't extract tables yet
            images: [], // Source was an image
            rawText: extractedText,
            wordCount: extractedText.split(/\s+/).length,
            characterCount: extractedText.length
          },
          
          // Enhanced metadata
          metadata: {
            ...metadata,
            ocrConfidence: ocrResult.confidence,
            processingMethod: 'OCR',
            imageProcessed: true,
            extractedAt: new Date().toISOString()
          },
          
          // Extracted entities
          entities: entities,
          
          // Analysis results
          analysis: {
            documentType: metadata.documentType || 'OTHER',
            keywords: metadata.keywords || [],
            summary: metadata.summary || '',
            confidence: metadata.confidence || 0,
            language: 'en', // Could be detected from OCR
            readabilityScore: this.calculateReadabilityScore(extractedText),
            complexity: this.analyzeComplexity(extractedText)
          },
          
          // Update document type if detected
          documentType: this.mapDocumentType(metadata.documentType),
          
          // Update last processed timestamp
          lastProcessedAt: new Date()
        }
      });

      const processingTime = Date.now() - startTime;

      console.log(`✅ Document processing completed successfully in ${processingTime}ms`);
      console.log('📊 Processing summary:', {
        documentId,
        textLength: extractedText.length,
        sectionsFound: sections.length,
        entitiesFound: Object.keys(entities).length,
        ocrConfidence: ocrResult.confidence,
        documentType: metadata.documentType
      });

      return {
        success: true,
        extractedText,
        sections,
        metadata,
        entities,
        processingTime
      };

    } catch (error) {
      console.error('❌ Image document processing failed:', error);
      
      // Update document with error status
      try {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            processing: {
              currentStatus: 'FAILED',
              startedAt: new Date(),
              completedAt: new Date(),
              error: error.message,
              note: 'OCR processing failed',
              progress: 0,
              currentStep: 'OCR Failed'
            }
          }
        });
      } catch (dbError) {
        console.error('❌ Failed to update document with error currentStatus:', dbError);
      }

      throw error;
    }
  }

  /**
   * Calculate basic readability score
   */
  private calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => {
      return count + this.countSyllables(word);
    }, 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    // Simplified Flesch Reading Ease
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    const vowels = word.match(/[aeiouy]+/g);
    let syllableCount = vowels ? vowels.length : 1;
    
    if (word.endsWith('e')) syllableCount--;
    if (syllableCount === 0) syllableCount = 1;
    
    return syllableCount;
  }

  /**
   * Analyze text complexity
   */
  private analyzeComplexity(text: string): any {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const longWords = words.filter(w => w.length > 6);
    
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0,
      longWordPercentage: words.length > 0 ? (longWords.length / words.length) * 100 : 0,
      avgWordLength: words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0
    };
  }

  /**
   * Map AI-detected document type to database enum
   */
  private mapDocumentType(aiDocumentType: string): string {
    const typeMapping: Record<string, string> = {
      'contract': 'CONTRACT',
      'proposal': 'PROPOSAL',
      'certification': 'CERTIFICATION',
      'compliance': 'COMPLIANCE',
      'template': 'TEMPLATE',
      'solicitation': 'SOLICITATION',
      'amendment': 'AMENDMENT',
      'capability_statement': 'CAPABILITY_STATEMENT',
      'past_performance': 'PAST_PERFORMANCE'
    };

    const normalizedType = aiDocumentType?.toLowerCase() || 'other';
    return typeMapping[normalizedType] || 'OTHER';
  }

  /**
   * Clean up resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
        this.worker = null;
        console.log('✅ OCR worker terminated successfully');
      } catch (error) {
        console.error('❌ Error terminating OCR worker:', error);
      }
    }
  }
}

// Create a singleton instance for easy usage
export const simpleOCR = new SimpleOCRService();

// Usage examples (equivalent to Python code):
/*
// Basic usage - equivalent to:
// from PIL import Image
// import pytesseract
// image = Image.open(image_path)
// extracted_text = pytesseract.image_to_string(image)

const imagePath = "/path/to/image.png";
const extractedText = await simpleOCR.extractText(imagePath);
console.log('Extracted text:', extractedText);

// With File object
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
const file = fileInput.files[0];
const extractedText = await simpleOCR.extractText(file);

// With additional metadata
const result = await simpleOCR.extractTextWithMetadata(imagePath, {
  language: 'eng',
  pageSegMode: 6 // Assume a single uniform block of text
});
console.log('Text:', result.text);
console.log('Confidence:', result.confidence);
console.log('Word count:', result.words.length);
*/