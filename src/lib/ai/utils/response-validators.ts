import { DocumentType, SecurityClassification } from '@/types/documents'

/**
 * Common validation utilities for AI analyzer responses
 */
export class ResponseValidators {
  /**
   * Validate and sanitize string arrays
   */
  static validateStringArray(
    arr: any,
    minItems: number = 0,
    maxItems: number = 20,
    defaultItems: string[] = []
  ): string[] {
    if (!Array.isArray(arr)) {
      console.warn(`Expected array but got ${typeof arr}, using defaults`);
      return defaultItems;
    }
    
    const filtered = arr
      .filter(item => typeof item === 'string' && item.trim().length > 0)
      .map(item => item.trim())
      .slice(0, maxItems);
    
    // Ensure we have at least minItems
    if (filtered.length < minItems && defaultItems.length > 0) {
      const needed = minItems - filtered.length;
      return [...filtered, ...defaultItems.slice(0, needed)];
    }
    
    return filtered;
  }

  /**
   * Validate and clamp numeric scores
   */
  static validateScore(
    score: any, 
    defaultScore: number = 70, 
    min: number = 0, 
    max: number = 100
  ): number {
    console.log(`🔍 [RESPONSE VALIDATOR] validateScore called with:`, { 
      score, 
      scoreType: typeof score, 
      defaultScore,
      isNaN: isNaN(Number(score)),
      isUndefined: score === undefined,
      isNull: score === null,
      isEmpty: score === '',
      actualValue: JSON.stringify(score)
    });

    // Handle null, undefined, or empty string cases explicitly
    if (score === null || score === undefined || score === '') {
      console.warn(`⚠️ [RESPONSE VALIDATOR] Score is null/undefined/empty, using default ${defaultScore}. Original value:`, score);
      return defaultScore;
    }

    const numScore = Number(score);
    
    if (isNaN(numScore)) {
      console.warn(`⚠️ [RESPONSE VALIDATOR] Score is NaN after Number() conversion, using default ${defaultScore}. Original value:`, score, `Number result:`, numScore);
      return defaultScore;
    }
    
    // Ensure score is within valid range
    const clampedScore = Math.max(min, Math.min(max, Math.round(numScore)));
    
    if (clampedScore !== numScore) {
      console.log(`🔧 [RESPONSE VALIDATOR] Score clamped from ${numScore} to ${clampedScore} (min: ${min}, max: ${max})`);
    }
    
    console.log(`✅ [RESPONSE VALIDATOR] Final validated score: ${clampedScore} (from original: ${score})`);
    return clampedScore;
  }

  /**
   * Validate sentiment values
   */
  static validateSentiment(sentiment: any): 'positive' | 'negative' | 'neutral' {
    const validSentiments = ['positive', 'negative', 'neutral'] as const;
    const lowerSentiment = typeof sentiment === 'string' ? sentiment.toLowerCase() : '';
    
    return validSentiments.includes(lowerSentiment as any) 
      ? lowerSentiment as 'positive' | 'negative' | 'neutral'
      : 'neutral';
  }

  /**
   * Validate document type
   */
  static validateDocumentType(type: any): DocumentType {
    const validTypes = Object.values(DocumentType);
    const upperType = typeof type === 'string' ? type.toUpperCase() : '';
    
    return validTypes.includes(upperType as DocumentType) 
      ? upperType as DocumentType 
      : DocumentType.OTHER;
  }

  /**
   * Validate security classification
   */
  static validateSecurityClassification(classification: any): SecurityClassification {
    const validClassifications = Object.values(SecurityClassification);
    const upperClassification = typeof classification === 'string' ? classification.toUpperCase() : '';
    
    return validClassifications.includes(upperClassification as SecurityClassification)
      ? upperClassification as SecurityClassification
      : SecurityClassification.INTERNAL;
  }

  /**
   * Validate urgency level
   */
  static validateUrgencyLevel(level: any): 'low' | 'medium' | 'high' | 'critical' {
    const validLevels = ['low', 'medium', 'high', 'critical'] as const;
    const lowerLevel = typeof level === 'string' ? level.toLowerCase() : '';
    
    return validLevels.includes(lowerLevel as any) 
      ? lowerLevel as 'low' | 'medium' | 'high' | 'critical'
      : 'medium';
  }

  /**
   * Validate NAICS codes
   */
  static validateNaicsCodes(codes: any): string[] {
    if (!Array.isArray(codes)) return [];
    
    return codes
      .filter(code => typeof code === 'string' && /^\d{6}$/.test(code))
      .slice(0, 10); // Limit to 10 codes
  }


  /**
   * Parse JSON from AI response with error handling
   */
  static parseJsonFromResponse(response: string, context: string = 'AI response'): any {
    try {
      console.log(`🔍 [${context}] Parsing response, length: ${response.length}`);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`❌ [${context}] No JSON object found in response`);
        console.error(`❌ [${context}] Response preview:`, response.substring(0, 200));
        throw new Error('No JSON object found in response');
      }

      console.log(`🔍 [${context}] Found JSON match:`, jsonMatch[0].substring(0, 300) + '...');
      const parsed = JSON.parse(jsonMatch[0]);
      
      console.log(`🔍 [${context}] Successfully parsed JSON with keys:`, Object.keys(parsed));
      return parsed;

    } catch (error) {
      console.error(`❌ [${context}] Failed to parse JSON response:`, error);
      console.error(`❌ [${context}] Response that failed to parse:`, response.substring(0, 500));
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract tags from text using pattern matching and content analysis
   */
  static extractTags(text: string, documentType?: string): string[] {
    const lowerText = text.toLowerCase()
    const tags: string[] = []
    
    // Add document type-based tag
    if (documentType) {
      if (documentType === 'PROPOSAL') tags.push('Proposal')
      else if (documentType === 'CONTRACT') tags.push('Contract')
      else if (documentType === 'SOLICITATION') tags.push('Solicitation')
      else if (documentType === 'CERTIFICATION') tags.push('Certification')
      else tags.push('Document')
    }
    
    // Industry/service tags based on content
    if (lowerText.includes('it ') || lowerText.includes('software') || lowerText.includes('technology')) {
      tags.push('IT Services')
    }
    if (lowerText.includes('cyber') || lowerText.includes('security')) {
      tags.push('Cybersecurity')
    }
    if (lowerText.includes('cloud') || lowerText.includes('aws') || lowerText.includes('azure')) {
      tags.push('Cloud Computing')
    }
    if (lowerText.includes('professional services') || lowerText.includes('consulting')) {
      tags.push('Professional Services')
    }
    if (lowerText.includes('defense') || lowerText.includes('dod') || lowerText.includes('military')) {
      tags.push('Defense')
    }
    if (lowerText.includes('healthcare') || lowerText.includes('medical')) {
      tags.push('Healthcare')
    }
    if (lowerText.includes('8(a)') || lowerText.includes('small business') || lowerText.includes('hubzone')) {
      tags.push('Small Business')
    }
    if (lowerText.includes('rfp') || lowerText.includes('request for proposal')) {
      tags.push('RFP')
    }
    if (lowerText.includes('rfq') || lowerText.includes('request for quote')) {
      tags.push('RFQ')
    }
    if (lowerText.includes('compliance') || lowerText.includes('fisma') || lowerText.includes('nist')) {
      tags.push('Compliance')
    }
    if (lowerText.includes('gsa schedule') || lowerText.includes('gsa')) {
      tags.push('GSA Schedule')
    }
    if (lowerText.includes('idiq') || lowerText.includes('indefinite delivery')) {
      tags.push('IDIQ')
    }
    if (lowerText.includes('task order')) {
      tags.push('Task Order')
    }
    
    // Ensure we have at least 3 tags by adding generic relevant tags
    if (tags.length < 3) {
      const keywords = this.extractKeywords(text, 5)
      tags.push(...keywords.filter(k => !tags.includes(k)))
    }
    
    // Add a fallback government tag if we still don't have enough
    if (tags.length < 2) {
      tags.push('Government', 'Federal')
    }
    
    // Limit to 8 tags and ensure uniqueness
    return Array.from(new Set(tags)).slice(0, 8)
  }

  /**
   * Extract keywords from text using frequency analysis
   */
  static extractKeywords(text: string, maxKeywords: number = 20): string[] {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 
      'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 
      'could', 'may', 'might', 'must', 'can', 'shall', 'this', 'that', 'these', 
      'those', 'they', 'them', 'their', 'there', 'then', 'than', 'when', 'where'
    ]);
    
    const words = text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
    
    // Count word frequency
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Sort by frequency and return top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Generate text summary from content
   */
  static generateSummary(text: string, maxSentences: number = 3): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, maxSentences).join('. ').trim();
    return summary || 'Document content analysis pending.';
  }

  /**
   * Validate tags array and provide fallback if needed
   */
  static validateTags(tags: any, text?: string, documentType?: string): string[] {
    // If tags are valid, return them
    if (Array.isArray(tags) && tags.length > 0) {
      const validTags = tags
        .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
        .map(tag => tag.trim())
        .slice(0, 8);
      
      if (validTags.length >= 2) {
        return validTags;
      }
    }
    
    // Fallback to pattern-based extraction
    console.log(`🔄 [RESPONSE VALIDATORS] Tags invalid or empty, using pattern-based extraction`);
    return text ? this.extractTags(text, documentType) : ['Document', 'Government'];
  }

  /**
   * Generate description from text
   */
  static generateDescription(text: string, maxLength: number = 200): string {
    const firstParagraph = text.split('\n').find(line => line.trim().length > 50);
    return firstParagraph 
      ? firstParagraph.substring(0, maxLength).trim() + '...'
      : 'Government contracting document';
  }
}