import { DocumentImage } from '@/types/documents'

// Dynamic imports for Node.js modules to avoid issues in browser environment
let PDFDocument: any
let fromBuffer: any
let fs: any
let path: any

async function loadDependencies() {
  if (typeof window === 'undefined') {
    // Only load these in Node.js environment
    try {
      const pdfLib = await import('pdf-lib')
      PDFDocument = pdfLib.PDFDocument
      
      const pdf2pic = await import('pdf2pic')
      fromBuffer = pdf2pic.fromBuffer
      
      fs = await import('fs/promises')
      path = await import('path')
    } catch (error) {
      console.warn('Failed to load image extraction dependencies:', error)
    }
  }
}

/**
 * Service for extracting images from PDF documents
 */
export class ImageExtractor {
  private initialized = false

  constructor() {
    // Initialization will happen on first use
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await loadDependencies()
      this.initialized = true
    }
  }

  /**
   * Extract embedded images from PDF buffer
   */
  async extractImagesFromPDF(
    pdfBuffer: Buffer,
    documentId: string,
    documentName: string
  ): Promise<{
    success: boolean
    images?: Partial<DocumentImage>[]
    error?: string
  }> {
    try {
      await this.ensureInitialized()
      
      if (!PDFDocument || !fromBuffer) {
        console.warn('🖼️ Image extraction dependencies not available, skipping image extraction')
        return { success: true, images: [] }
      }
      
      console.log(`🖼️ Starting image extraction for document: ${documentName}`)
      
      const extractedImages: Partial<DocumentImage>[] = []
      
      // Method 1: Extract embedded images using pdf-lib
      const embeddedImages = await this.extractEmbeddedImages(pdfBuffer, documentId)
      extractedImages.push(...embeddedImages)
      
      // Method 2: Convert pages to images for visual elements (charts, diagrams)
      const pageImages = await this.convertPagesToImages(pdfBuffer, documentId, documentName)
      extractedImages.push(...pageImages)
      
      console.log(`✅ Extracted ${extractedImages.length} images from ${documentName}`)
      
      return {
        success: true,
        images: extractedImages
      }
      
    } catch (error) {
      console.error('❌ Image extraction failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during image extraction'
      }
    }
  }

  /**
   * Extract embedded images (PNG, JPEG) from PDF
   */
  private async extractEmbeddedImages(
    pdfBuffer: Buffer,
    documentId: string
  ): Promise<Partial<DocumentImage>[]> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer)
      const images: Partial<DocumentImage>[] = []
      const imageOrder = 1

      // Get embedded images from PDF
      const embeddedImages = pdfDoc.getPages().flatMap((page, pageIndex) => {
        // This is a simplified approach - pdf-lib doesn't directly expose embedded images
        // In a full implementation, you'd need a more sophisticated PDF parser
        return []
      })

      return images
    } catch (error) {
      console.error('Failed to extract embedded images:', error)
      return []
    }
  }

  /**
   * Convert PDF pages to images as base64 data
   */
  private async convertPagesToImages(
    pdfBuffer: Buffer,
    documentId: string,
    documentName: string
  ): Promise<Partial<DocumentImage>[]> {
    try {
      const images: Partial<DocumentImage>[] = []
      
      // Configure pdf2pic for high quality image conversion
      const convert = fromBuffer(pdfBuffer, {
        density: 300,           // High DPI for quality
        saveFilename: "temp_page",
        savePath: "/tmp",       // Temporary path (files will be deleted after conversion)
        format: "png",
        width: 2000,
        height: 2000
      })

      // Convert first 3 pages to images (to avoid excessive processing and storage)
      const maxPages = 3
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          console.log(`🖼️ Converting page ${pageNum} to image...`)
          const result = await convert(pageNum, { responseType: "buffer" })
          
          if (result && result.buffer && result.buffer.length > 0) {
            console.log(`🖼️ Page ${pageNum} converted, buffer size: ${result.buffer.length} bytes`)
            
            // Convert buffer to base64
            const base64Image = result.buffer.toString('base64')
            
            // Verify base64 is not empty
            if (!base64Image || base64Image.length < 100) {
              console.warn(`⚠️ Page ${pageNum} base64 conversion failed or too small: ${base64Image.length} chars`)
              continue
            }
            
            const base64DataUri = `data:image/png;base64,${base64Image}`
            console.log(`✅ Page ${pageNum} base64 created: ${base64Image.length} chars`)
            
            const imageData: Partial<DocumentImage> = {
              description: `Page ${pageNum} of ${documentName}`,
              altText: `Visual content from page ${pageNum}`,
              imageType: 'page_capture',
              pageNumber: pageNum,
              imageOrder: pageNum,
              filePath: '', // No file path needed since we store base64 directly
              mimeType: 'image/png',
              width: 2000,
              height: 2000,
              quality: 'high',
              isOcrProcessed: false,
              fileSize: Buffer.byteLength(base64Image, 'base64'),
              // Store base64 directly in extractedData
              extractedData: {
                base64: base64DataUri,
                format: 'png',
                source: 'pdf2pic',
                extractedAt: new Date().toISOString()
              }
            }
            
            images.push(imageData)
            console.log(`✅ Page ${pageNum} stored with ${imageData.fileSize} bytes`)
          } else {
            console.warn(`⚠️ Page ${pageNum} conversion failed - no buffer or empty buffer`)
          }
        } catch (pageError) {
          console.error(`❌ Could not convert page ${pageNum}:`, pageError)
          // Continue with other pages
        }
      }
      
      return images
      
    } catch (error) {
      console.error('Failed to convert pages to images:', error)
      return []
    }
  }

  /**
   * Analyze extracted image with AI to generate description and extract data
   */
  async analyzeImageWithAI(
    imagePath: string,
    imageType?: string
  ): Promise<{
    description?: string
    altText?: string
    extractedText?: string
    extractedData?: any
  }> {
    try {
      // This would integrate with your AI service (OpenAI Vision, Claude Vision, etc.)
      // For now, return placeholder data
      
      const imageBuffer = await fs.readFile(imagePath)
      
      // TODO: Integrate with AI vision model
      // const analysis = await aiVisionService.analyzeImage(imageBuffer, {
      //   prompt: `Analyze this ${imageType || 'image'} from a government document. 
      //            Provide a detailed description, accessible alt text, and extract any visible text or data.`
      // })
      
      return {
        description: `AI-generated description for ${path.basename(imagePath)}`,
        altText: `Accessible description for ${path.basename(imagePath)}`,
        extractedText: '', // OCR results would go here
        extractedData: null // Structured data would go here
      }
      
    } catch (error) {
      console.error('Failed to analyze image with AI:', error)
      return {}
    }
  }

}

export const imageExtractor = new ImageExtractor()