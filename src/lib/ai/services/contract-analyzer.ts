import { simpleAIClient } from './simple-ai-client'
import { ContractAnalysis } from '@/types/documents'

/**
 * Service for analyzing contract documents and extracting contract-specific insights
 */
export class ContractAnalyzer {
  constructor() {
    // No initialization needed for simple client
  }

  /**
   * Analyze document for contract-specific information
   */
  async analyzeContract(
    extractedText: string,
    documentName: string,
    documentType: string,
    organizationId: string
  ): Promise<{
    success: boolean
    analysis?: ContractAnalysis
    error?: string
  }> {
    try {
      const prompt = `Analyze this business document for key information, requirements, and strategic insights.

Document Name: ${documentName}
Document Type: ${documentType}

Provide comprehensive analysis including:

1. contractType - Identify the document type (Agreement, Proposal, RFP, SOW, Contract, Requirements Doc, etc.)
2. estimatedValue - Extract budget, estimated value, or financial information if mentioned
3. timeline - Extract timeline, duration, key dates, milestones, and deadlines
4. requirements - List key requirements, specifications, deliverables, and obligations
5. risks - Identify potential risks, challenges, constraints, and concerns
6. opportunities - Identify opportunities, benefits, advantages, and positive aspects

EXTRACT KEY INFORMATION:
- Technical requirements and specifications
- Performance requirements and success criteria
- Compliance requirements and standards
- Deliverables and milestones
- Qualifications and capabilities needed
- Dependencies and constraints
- Success factors and evaluation criteria

Return as JSON:
{
  "contractType": "Service Agreement",
  "estimatedValue": "$250K over 12 months",
  "timeline": "Start date: Q2 2024, Duration: 12 months, Key milestones: Monthly deliverables",
  "requirements": [
    "Proven experience with cloud platforms",
    "ISO 27001 compliance required",
    "24/7 support capability"
  ],
  "risks": [
    "Tight timeline for initial deliverables",
    "Complex integration requirements",
    "Multiple stakeholder dependencies"
  ],
  "opportunities": [
    "Long-term partnership potential",
    "Opportunity to showcase innovative solutions",
    "Expandable scope for additional services"
  ]
}

Document Text:
${extractedText}`

      console.log(`🔍 [CONTRACT ANALYZER] Starting contract analysis for document: ${documentName}`);
      console.log(`🔍 [CONTRACT ANALYZER] Text length: ${extractedText.length} characters`);
      
      const result = await simpleAIClient.generateCompletion({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business analyst specializing in contract analysis, risk assessment, and opportunity identification. Provide actionable insights for business decision-making. Focus on generic business context applicable to any industry.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        maxTokens: 4000, // 4k tokens max for GPT-4o output
        temperature: 0.1 // Low temperature for consistent analysis
      })

      console.log(`🔍 [CONTRACT ANALYZER] AI service responded with content length: ${result.content?.length || 0}`);
      console.log(`🔍 [CONTRACT ANALYZER] Raw AI response:`, result.content?.substring(0, 500) + '...');

      if (!result.content) {
        throw new Error('No response from AI service')
      }

      const analysis = this.parseContractAnalysis(result.content, extractedText)
      console.log(`🔍 [CONTRACT ANALYZER] Parsed analysis:`, {
        contractType: analysis.contractType,
        estimatedValue: analysis.estimatedValue,
        requirementsCount: analysis.requirements.length,
        risksCount: analysis.risks.length,
        opportunitiesCount: analysis.opportunities.length
      });
      
      return { success: true, analysis }

    } catch (error) {
      console.error('Contract analysis error:', error)
      
      // Fallback analysis with basic contract patterns
      const fallbackAnalysis = this.generateFallbackContractAnalysis(extractedText, documentType)
      return { success: true, analysis: fallbackAnalysis }
    }
  }

  private parseContractAnalysis(response: string, originalText: string): ContractAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON object found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        contractType: this.validateString(parsed.contractType) || 'Other',
        estimatedValue: this.validateString(parsed.estimatedValue),
        timeline: this.validateString(parsed.timeline),
        requirements: this.validateStringArray(parsed.requirements || []),
        risks: this.validateStringArray(parsed.risks || []),
        opportunities: this.validateStringArray(parsed.opportunities || [])
      }

    } catch (error) {
      console.error('Failed to parse contract analysis:', error)
      return this.generateFallbackContractAnalysis(originalText, 'Unknown')
    }
  }

  private validateString(value: any): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
  }

  private validateStringArray(arr: any[]): string[] {
    if (!Array.isArray(arr)) return []
    
    return arr
      .filter(item => typeof item === 'string' && item.trim().length > 0)
      .map(item => item.trim())
      .slice(0, 20) // Limit to 20 items
  }

  private generateFallbackContractAnalysis(text: string, documentType: string): ContractAnalysis {
    const lowerText = text.toLowerCase()
    const requirements: string[] = []
    const risks: string[] = []
    const opportunities: string[] = []
    
    let contractType = 'Other'
    let estimatedValue: string | undefined
    let timeline: string | undefined

    // Detect contract type based on keywords
    if (lowerText.includes('request for proposal') || lowerText.includes('rfp')) {
      contractType = 'RFP'
    } else if (lowerText.includes('invitation for bid') || lowerText.includes('ifb')) {
      contractType = 'IFB'
    } else if (lowerText.includes('request for quote') || lowerText.includes('rfq')) {
      contractType = 'RFQ'
    } else if (lowerText.includes('task order')) {
      contractType = 'Task Order'
    } else if (lowerText.includes('idiq') || lowerText.includes('indefinite delivery')) {
      contractType = 'IDIQ'
    } else if (lowerText.includes('blanket purchase agreement') || lowerText.includes('bpa')) {
      contractType = 'BPA'
    }

    // Extract value patterns
    const valuePatterns = [
      /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|thousand|M|B|K))?/gi,
      /\b\d+\s*(?:million|billion|thousand)\s*dollars?\b/gi
    ]

    for (const pattern of valuePatterns) {
      const match = text.match(pattern)
      if (match) {
        estimatedValue = match[0]
        break
      }
    }

    // Extract timeline patterns
    const timelinePatterns = [
      /\b\d+\s*(?:days?|weeks?|months?|years?)\b/gi,
      /due\s+(?:date|by)\s*:?\s*[^\n]+/gi,
      /deadline\s*:?\s*[^\n]+/gi
    ]

    for (const pattern of timelinePatterns) {
      const match = text.match(pattern)
      if (match) {
        timeline = match[0]
        break
      }
    }

    // Common business requirements
    if (lowerText.includes('experience') || lowerText.includes('expertise')) {
      requirements.push('Relevant experience and expertise required')
    }
    if (lowerText.includes('certification') || lowerText.includes('compliance')) {
      requirements.push('Compliance and certification requirements specified')
    }
    if (lowerText.includes('deliverable') || lowerText.includes('milestone')) {
      requirements.push('Specific deliverables and milestones defined')
    }
    if (lowerText.includes('support') || lowerText.includes('maintenance')) {
      requirements.push('Support and maintenance requirements included')
    }

    // Common business risks
    if (lowerText.includes('complex') || lowerText.includes('challenging')) {
      risks.push('Technical or operational complexity indicated')
    }
    if (lowerText.includes('tight') || lowerText.includes('aggressive') || lowerText.includes('urgent')) {
      risks.push('Potentially challenging timeline')
    }
    if (lowerText.includes('dependency') || lowerText.includes('integration')) {
      risks.push('Third-party dependencies or integration requirements')
    }

    // Common business opportunities
    if (lowerText.includes('option') || lowerText.includes('renewal') || lowerText.includes('extension')) {
      opportunities.push('Contract includes renewal or extension options')
    }
    if (lowerText.includes('partnership') || lowerText.includes('relationship')) {
      opportunities.push('Potential for long-term partnership')
    }
    if (lowerText.includes('expand') || lowerText.includes('scale') || lowerText.includes('growth')) {
      opportunities.push('Opportunity for expansion or additional services')
    }

    // Ensure we have some basic content
    if (requirements.length === 0) {
      requirements.push('Review document for specific requirements')
    }
    if (risks.length === 0) {
      risks.push('Assess technical and timeline risks')
    }
    if (opportunities.length === 0) {
      opportunities.push('Evaluate strategic fit and potential value')
    }

    return {
      contractType,
      estimatedValue,
      timeline,
      requirements,
      risks,
      opportunities
    }
  }
}

export const contractAnalyzer = new ContractAnalyzer()