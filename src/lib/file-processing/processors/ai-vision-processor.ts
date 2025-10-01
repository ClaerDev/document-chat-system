import { IFileProcessor, FileProcessingOptions, FileProcessingResult, ProcessingMethod } from '../types';
import OpenAI from 'openai';

/**
 * AI-powered vision processor that uses multimodal AI models for OCR
 * Much more accurate than traditional OCR for complex documents
 */
export class AIVisionProcessor implements IFileProcessor {
  private readonly supportedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ];

  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  canProcess(mimeType: string): boolean {
    return this.supportedTypes.includes(mimeType);
  }

  getName(): string {
    return 'AIVisionProcessor';
  }

  getSupportedTypes(): string[] {
    return [...this.supportedTypes];
  }

  async extractText(buffer: Buffer, options: FileProcessingOptions): Promise<FileProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log('[AI Vision] Starting AI-powered OCR processing...');
      console.log('[AI Vision] Using GPT-4 Vision model');
      
      // Validate file size
      if (buffer.length > options.maxFileSize) {
        throw new Error(`File size ${buffer.length} exceeds maximum allowed size ${options.maxFileSize}`);
      }

      const mimeType = this.detectMimeType(buffer);
      const base64Image = buffer.toString('base64');
      
      console.log('[AI Vision] Image prepared for AI analysis:', {
        size: buffer.length,
        mimeType
      });

      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o', // GPT-4o has better vision capabilities and higher context
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are an expert OCR system. Extract ALL text from this image with high accuracy. 

Instructions:
1. Extract every piece of text visible in the image
2. Preserve the original formatting and structure
3. If there are tables, maintain their structure using appropriate formatting
4. If there are multiple columns, process them in reading order (left to right, top to bottom)
5. Include headers, footers, and any fine print
6. For handwritten text, do your best to interpret it accurately
7. If parts are unclear, indicate with [unclear] but still attempt extraction
8. For government documents, pay special attention to:
   - Contract numbers, dates, and deadlines
   - Agency names and contact information
   - Requirements and specifications
   - Dollar amounts and quantities
   - Legal terms and conditions

Return ONLY the extracted text, no explanations or metadata.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 8000, // Increased from 4000 to 8000
          temperature: 0.1
        });

        const extractedText = response.choices[0]?.message?.content?.trim() || '';
        
        if (!extractedText || extractedText.length === 0) {
          console.error('[AI Vision] No text extracted from image');
          throw new Error('AI Vision OCR returned no text content');
        }
        
        console.log(`[AI Vision] Successfully extracted ${extractedText.length} characters`);

        // Also get document structure analysis
        const structureResponse = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze the structure and type of this document image. Provide a JSON response with:
{
  "documentType": "type of document (e.g., contract, invoice, proposal, form)",
  "sections": ["list", "of", "main", "sections"],
  "hasTables": true/false,
  "hasSignatures": true/false,
  "quality": "high/medium/low",
  "language": "detected language",
  "confidence": 0.0-1.0
}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: 'auto'
                  }
                }
              ]
            }
          ],
          max_tokens: 2000, // Increased for better structure analysis
          temperature: 0.1
        });

        let documentMetadata = {};
        try {
          const structureContent = structureResponse.choices[0]?.message?.content || '{}';
          documentMetadata = JSON.parse(structureContent);
        } catch (e) {
          console.warn('[AI Vision] Could not parse structure analysis as JSON');
          documentMetadata = { 
            documentType: 'unknown',
            confidence: 0.8
          };
        }

        const processingDuration = Date.now() - startTime;

        return {
          success: true,
          text: extractedText,
          metadata: {
            size: buffer.length,
            mimeType,
            ...documentMetadata,
            processingMethod: 'AI Vision OCR',
            model: 'gpt-4o',
            confidence: documentMetadata.confidence || 0.95,
            usage: response.usage
          },
          processing: {
            duration: processingDuration,
            method: ProcessingMethod.AI_VISION,
            confidence: documentMetadata.confidence || 0.95,
            warnings: extractedText.includes('[unclear]') ? ['Some text was unclear but attempted'] : []
          }
        };

      } catch (aiError) {
        console.error('[AI Vision] AI Vision processing failed:', aiError);
        return this.fallbackProcessing(buffer, mimeType, startTime, aiError);
      }

    } catch (error) {
      const processingDuration = Date.now() - startTime;
      console.error('[AI Vision] Processing failed:', error);
      
      return {
        success: false,
        text: '',
        metadata: {
          size: buffer.length,
          mimeType: this.detectMimeType(buffer),
        },
        processing: {
          duration: processingDuration,
          method: ProcessingMethod.AI_VISION,
          confidence: 0,
        },
        error: {
          code: 'AI_VISION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  private fallbackProcessing(
    buffer: Buffer, 
    mimeType: string, 
    startTime: number,
    originalError: any
  ): FileProcessingResult {
    const processingDuration = Date.now() - startTime;
    
    // Return success: false so the file processing adapter can try other OCR methods
    return {
      success: false,
      text: '',
      metadata: {
        size: buffer.length,
        mimeType,
        processingMethod: 'AI Vision OCR (Failed)',
        fallbackReason: originalError?.message || 'AI service temporarily unavailable'
      },
      processing: {
        duration: processingDuration,
        method: ProcessingMethod.AI_VISION,
        confidence: 0,
        warnings: ['AI Vision OCR failed - will try traditional OCR fallback']
      },
      error: {
        code: 'AI_VISION_FAILED',
        message: `AI Vision OCR failed: ${originalError?.message || 'Unknown error'}`,
        stack: originalError?.stack
      }
    };
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
}