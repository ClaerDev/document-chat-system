/**
 * Prompt Library Demo Component
 * 
 * Demonstrates the new prompt library system with clear distinctions
 * between extraction, summarization, and analysis operations.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, FileText, Search, BarChart3, Shield, CheckCircle, AlertCircle } from 'lucide-react'

type PromptOperation = 
  | 'full_text_extraction'
  | 'executive_summary'
  | 'structured_extraction'
  | 'compliance_analysis'

interface PromptLibraryDemoProps {
  organizationId?: string
  organizationName?: string
  className?: string
}

interface MockExecutionResult {
  requestId: string
  operation: PromptOperation
  response: string
  provider: string
  model: string
  latency: number
  cost: number
  tokensUsed: {
    prompt: number
    completion: number
    total: number
  }
  success: boolean
  error?: string
  timestamp: Date
  qualityScore?: number
}

export function PromptLibraryDemo({ 
  organizationId, 
  organizationName = 'Demo Organization',
  className = '' 
}: PromptLibraryDemoProps) {
  const [documentContent, setDocumentContent] = useState('')
  const [selectedOperation, setSelectedOperation] = useState<PromptOperation>('full_text_extraction')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<MockExecutionResult | null>(null)

  // Operation definitions with clear descriptions
  const operations = [
    {
      id: 'full_text_extraction' as const,
      name: 'Full Text Extraction',
      description: 'Extract 100% of document text without any summarization',
      icon: FileText,
      color: 'blue',
      example: 'Use when you need the complete, unmodified text from a document'
    },
    {
      id: 'executive_summary' as const,
      name: 'Executive Summary',
      description: 'Create concise summary for decision-makers',
      icon: BarChart3,
      color: 'green',
      example: 'Use when you need strategic overview for leadership'
    },
    {
      id: 'structured_extraction' as const,
      name: 'Structured Data Extraction',
      description: 'Extract specific data elements in organized format',
      icon: Search,
      color: 'purple',
      example: 'Use when you need specific data points organized by category'
    },
    {
      id: 'compliance_analysis' as const,
      name: 'Compliance Requirements',
      description: 'Extract regulatory and compliance requirements',
      icon: Shield,
      color: 'orange',
      example: 'Use when you need to identify FAR/DFARS and regulatory requirements'
    }
  ]

  const selectedOperationInfo = operations.find(op => op.id === selectedOperation)

  // Mock prompt library functions
  const mockProcessDocument = useCallback(async (operation: PromptOperation, content: string): Promise<MockExecutionResult> => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000))

    const mockResponses = {
      full_text_extraction: `COMPLETE TEXT EXTRACTION (No Summarization):

${content}

[Note: This would be the complete, unmodified text from the document. The prompt library ensures that LLMs extract 100% of the content without any summarization, condensation, or paraphrasing.]`,

      executive_summary: `EXECUTIVE SUMMARY:

**Opportunity Overview:**
This document represents a strategic government contracting opportunity for ${organizationName}.

**Key Business Points:**
• Contract Value: Estimated $2.5M - $15M over 3-5 years
• Primary Focus: Technology services and consulting
• Competitive Landscape: Open competition with small business considerations
• Strategic Fit: High alignment with organizational capabilities

**Critical Decision Factors:**
• Proposal deadline: 45 days from solicitation release
• Past performance requirements: 3 similar contracts within 5 years
• Technical capability demonstration required
• Security clearance requirements for key personnel

**Recommendations:**
• Proceed with bid/no-bid analysis
• Assemble cross-functional proposal team
• Initiate capability gap assessment
• Consider teaming partnerships for enhanced competitiveness`,

      structured_extraction: `STRUCTURED DATA EXTRACTION:

**Document Identifiers:**
• Solicitation Number: [Extracted from document]
• Agency: [Agency name]
• NAICS Code: [Industry classification]

**Key Dates:**
• Release Date: [Date extracted]
• Proposal Due: [Deadline extracted]
• Questions Due: [Q&A deadline]

**Financial Information:**
• Estimated Value: [Contract value range]
• Performance Period: [Contract duration]
• Option Periods: [Extension details]

**Technical Requirements:**
• Primary Services: [Core requirements]
• Technical Standards: [Compliance requirements]
• Deliverables: [Expected outputs]

**Contact Information:**
• Contracting Officer: [Name and contact]
• Technical POC: [Technical contact]
• Administrative: [Admin contact]`,

      compliance_analysis: `COMPLIANCE REQUIREMENTS ANALYSIS:

**Federal Acquisition Regulation (FAR) Requirements:**
• FAR 52.204-10: Reporting Executive Compensation
• FAR 52.225-1: Buy American Act—Supplies
• FAR 52.219-8: Utilization of Small Business Concerns

**Defense Federal Acquisition Regulation (DFARS) Requirements:**
• DFARS 252.204-7012: Safeguarding Covered Defense Information
• DFARS 252.225-7001: Buy American and Balance of Payments Program

**Security Requirements:**
• NIST SP 800-171: Protecting Controlled Unclassified Information
• FISMA Compliance: Federal Information Security Management Act
• Personnel Security: Background investigation requirements

**Industry Standards:**
• ISO 9001: Quality Management Systems
• CMMI Level 3: Process Improvement
• Section 508: Accessibility Standards

**Small Business Requirements:**
• Set-aside type: [If applicable]
• Subcontracting plan requirements
• Mentor-protégé opportunities`
    }

    return {
      requestId: `req_${Date.now()}`,
      operation,
      response: mockResponses[operation],
      provider: 'openrouter',
      model: operation === 'full_text_extraction' ? 'gpt-4o-mini' : 'claude-3.5-sonnet',
      latency: 1500 + Math.random() * 2000,
      cost: 0.02 + Math.random() * 0.08,
      tokensUsed: {
        prompt: Math.floor(500 + Math.random() * 1000),
        completion: Math.floor(800 + Math.random() * 2000),
        total: Math.floor(1300 + Math.random() * 3000)
      },
      success: true,
      timestamp: new Date(),
      qualityScore: 0.85 + Math.random() * 0.15
    }
  }, [organizationName])

  const handleProcessDocument = useCallback(async () => {
    if (!documentContent.trim()) {
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      const executionResult = await mockProcessDocument(selectedOperation, documentContent)
      setResult(executionResult)
    } catch (error) {
      console.error('Error processing document:', error)
      setResult({
        requestId: 'error',
        operation: selectedOperation,
        response: '',
        provider: 'error',
        model: 'error',
        latency: 0,
        cost: 0,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      })
    } finally {
      setIsProcessing(false)
    }
  }, [documentContent, selectedOperation, mockProcessDocument])

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(cost)
  }

  const getSuccessIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <AlertCircle className="h-5 w-5 text-red-500" />
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Prompt Library Demo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Demonstrate the new prompt library with clear distinctions between extraction, 
            summarization, and analysis operations. Select an operation to see how different 
            prompts produce different types of outputs.
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Operation Type
                </label>
                <Select value={selectedOperation} onValueChange={(value) => setSelectedOperation(value as PromptOperation)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operations.map((op) => {
                      const Icon = op.icon
                      return (
                        <SelectItem key={op.id} value={op.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {op.name}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedOperationInfo && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {React.createElement(selectedOperationInfo.icon, { className: "h-4 w-4" })}
                    <span className="font-medium">{selectedOperationInfo.name}</span>
                    <Badge variant="outline" className={`text-${selectedOperationInfo.color}-600`}>
                      {selectedOperationInfo.color}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedOperationInfo.description}
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    {selectedOperationInfo.example}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Document Content
                </label>
                <Textarea
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  placeholder="Paste your government document content here (RFP, solicitation, contract, etc.)..."
                  className="min-h-[200px] resize-none"
                />
              </div>

              <Button 
                onClick={handleProcessDocument}
                disabled={!documentContent.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Document...
                  </>
                ) : (
                  <>
                    {selectedOperationInfo?.icon && React.createElement(selectedOperationInfo.icon, { className: "mr-2 h-4 w-4" })}
                    {selectedOperationInfo?.name || 'Process Document'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getSuccessIcon(result.success)}
                  Processing Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Performance Metrics */}
                <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Latency</div>
                    <div className="font-medium">{Math.round(result.latency)}ms</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Cost</div>
                    <div className="font-medium">{formatCost(result.cost)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Tokens</div>
                    <div className="font-medium">{result.tokensUsed.total}</div>
                  </div>
                </div>

                {/* Provider Info */}
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {result.provider}
                  </Badge>
                  <Badge variant="outline">
                    {result.model}
                  </Badge>
                  {result.qualityScore && (
                    <Badge variant="outline">
                      Quality: {(result.qualityScore * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Response Content */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    AI Response
                  </label>
                  <ScrollArea className="h-[300px] w-full border rounded-md p-3">
                    {result.success ? (
                      <div className="whitespace-pre-wrap text-sm">
                        {result.response}
                      </div>
                    ) : (
                      <div className="text-red-600 text-sm">
                        <p className="font-medium mb-2">Error occurred:</p>
                        <p>{result.error}</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Templates Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prompt Library Features</CardTitle>
              <p className="text-sm text-muted-foreground">
                Advanced prompt management system capabilities
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Clear distinction between extraction and summarization</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Government contracting specialized prompts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Smart routing with existing OpenRouter integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Configurable token limits (now 16,000 vs. hardcoded 1,000)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Built-in quality monitoring and cost optimization</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">10+ specialized templates for different operations</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Available Template Categories:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Document Processing (extraction, summarization, analysis)</li>
                  <li>Government Contracting (RFP analysis, compliance, capabilities)</li>
                  <li>Compliance Management (FAR/DFARS, regulatory requirements)</li>
                  <li>Strategic Analysis (gap assessment, competitive positioning)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}