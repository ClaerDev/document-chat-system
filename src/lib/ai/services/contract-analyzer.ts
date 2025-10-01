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
      const prompt = `Analyze this government contracting document for contract-specific information and risks.

Document Name: ${documentName}
Document Type: ${documentType}

Provide comprehensive contract analysis including:

1. contractType - Identify the type of contract (RFP, IFB, RFQ, Task Order, IDIQ, BPA, etc.)
2. estimatedValue - Extract contract value, budget, or estimated amount if mentioned
3. timeline - Extract timeline, duration, key dates, and deadlines
4. requirements - List key requirements, specifications, and deliverables
5. risks - Identify potential risks, challenges, and concerns
6. opportunities - Identify opportunities, advantages, and positive aspects

FOCUS ON GOVERNMENT CONTRACTING CONTEXT:
- Look for NAICS codes, set-aside types, security clearance requirements
- Identify compliance requirements (DFARS, FAR, etc.)
- Extract technical specifications and performance requirements
- Identify evaluation criteria and scoring factors
- Look for past performance requirements
- Identify subcontracting opportunities

Return as JSON:
{
  "contractType": "RFP",
  "estimatedValue": "$2.5M over 3 years",
  "timeline": "Proposal due: 30 days, Performance period: 36 months",
  "requirements": [
    "Security clearance required",
    "AWS cloud infrastructure experience",
    "FISMA compliance"
  ],
  "risks": [
    "Aggressive timeline for deliverables",
    "Complex security requirements",
    "Limited past performance examples"
  ],
  "opportunities": [
    "Large contract value with renewal options",
    "Direct access to end users",
    "Potential for follow-on work"
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
            content: 'You are an expert government contracting analyst specializing in contract analysis, risk assessment, and opportunity identification. Focus on actionable insights for government contractors.'
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

    // Common government contracting requirements
    if (lowerText.includes('security clearance') || lowerText.includes('clearance')) {
      requirements.push('Security clearance may be required')
    }
    if (lowerText.includes('fisma') || lowerText.includes('compliance')) {
      requirements.push('Compliance requirements specified')
    }
    if (lowerText.includes('past performance')) {
      requirements.push('Past performance evaluation required')
    }
    if (lowerText.includes('small business') || lowerText.includes('set-aside')) {
      requirements.push('Set-aside requirements may apply')
    }

    // Common risks
    if (lowerText.includes('complex') || lowerText.includes('challenging')) {
      risks.push('Technical complexity indicated')
    }
    if (lowerText.includes('tight') || lowerText.includes('aggressive')) {
      risks.push('Potentially aggressive timeline')
    }
    if (lowerText.includes('security') || lowerText.includes('classified')) {
      risks.push('Security requirements may add complexity')
    }

    // Common opportunities
    if (lowerText.includes('option') || lowerText.includes('renewal')) {
      opportunities.push('Contract includes option periods')
    }
    if (lowerText.includes('large') || lowerText.includes('significant')) {
      opportunities.push('Significant contract opportunity')
    }
    if (lowerText.includes('follow-on') || lowerText.includes('subsequent')) {
      opportunities.push('Potential for follow-on work')
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