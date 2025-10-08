/**
 * Example usage of vision capabilities with CleanOpenRouterAdapter
 * 
 * This file demonstrates how to use the vision/multimodal functionality
 * for image analysis tasks in government contracting scenarios.
 */

import { CleanOpenRouterAdapter } from '../providers/clean-openrouter-adapter';
import { UnifiedCompletionRequest } from '../interfaces';

// Example configuration
const config = {
  apiKey: process.env.OPENROUTER_API_KEY!,
  appName: 'Document Chat System',
  siteUrl: 'https://document-chat-system.vercel.app',
  enableSmartRouting: true,
  costOptimization: 'balanced' as const,
  maxRetries: 3,
  timeout: 30000
};

/**
 * Example 1: Document Analysis
 * Analyze a government contract document with image/PDF processing
 */
export async function analyzeContractDocument(imagePath: string): Promise<string> {
  const adapter = new CleanOpenRouterAdapter(config);
  await adapter.initialize();

  const visionMessage = CleanOpenRouterAdapter.createVisionMessage(
    "Analyze this government contract document. Extract key information including: contract value, requirements, deadlines, and compliance requirements. Provide a structured summary.",
    imagePath,
    'high' // High detail for document analysis
  );

  const request: UnifiedCompletionRequest = {
    model: 'openai/gpt-4o', // Vision-enabled model
    messages: [visionMessage],
    temperature: 0.1, // Low temperature for factual analysis
    maxTokens: 2000,
  };

  const response = await adapter.generateCompletion(request);
  return response.content;
}

/**
 * Example 2: Site Survey Analysis
 * Analyze construction site photos for compliance and requirements
 */
export async function analyzeSiteSurvey(imageBuffer: Buffer): Promise<string> {
  const adapter = new CleanOpenRouterAdapter(config);
  await adapter.initialize();

  const visionMessage = CleanOpenRouterAdapter.createVisionMessageWithBuffer(
    "Analyze this construction site photo. Identify: safety compliance issues, progress status, equipment present, and potential concerns for government contract requirements.",
    imageBuffer,
    'image/jpeg',
    'high'
  );

  const request: UnifiedCompletionRequest = {
    model: 'anthropic/claude-3.5-sonnet', // Excellent for detailed analysis
    messages: [visionMessage],
    temperature: 0.2,
    maxTokens: 1500,
    hints: {
      taskType: 'document_analysis',
      complexity: 'medium',
      qualityRequirement: 'high'
    }
  };

  const response = await adapter.generateCompletion(request);
  return response.content;
}

/**
 * Example 3: Multi-Image Comparison
 * Compare multiple images for progress tracking
 */
export async function compareProgressImages(beforePath: string, afterPath: string): Promise<string> {
  const adapter = new CleanOpenRouterAdapter(config);
  await adapter.initialize();

  const message = {
    role: 'user' as const,
    content: "Compare these two construction site images - before and after. Analyze the progress made, identify completed tasks, and note any compliance or quality issues.",
    attachments: [
      {
        type: 'image' as const,
        path: beforePath,
        detail: 'high' as const,
        description: 'Before image'
      },
      {
        type: 'image' as const,
        path: afterPath,
        detail: 'high' as const,
        description: 'After image'
      }
    ]
  };

  const request: UnifiedCompletionRequest = {
    model: 'google/gemini-2.5-flash', // Fast and cost-effective for comparisons
    messages: [message],
    temperature: 0.1,
    maxTokens: 1000,
    hints: {
      taskType: 'document_analysis',
      complexity: 'medium',
      qualityRequirement: 'standard'
    }
  };

  const response = await adapter.generateCompletion(request);
  return response.content;
}

/**
 * Example 4: Base64 Image Analysis
 * Analyze image from base64 data (common for web uploads)
 */
export async function analyzeUploadedImage(base64Data: string): Promise<string> {
  const adapter = new CleanOpenRouterAdapter(config);
  await adapter.initialize();

  const visionMessage = CleanOpenRouterAdapter.createVisionMessageWithData(
    "Analyze this uploaded image for government contract compliance. Identify any issues or requirements that need attention.",
    base64Data,
    'image/jpeg',
    'auto'
  );

  const request: UnifiedCompletionRequest = {
    model: 'openai/gpt-4o-mini', // Cost-effective for general analysis
    messages: [visionMessage],
    temperature: 0.3,
    maxTokens: 800,
    hints: {
      taskType: 'classification',
      complexity: 'medium',
      qualityRequirement: 'standard'
    }
  };

  const response = await adapter.generateCompletion(request);
  return response.content;
}

/**
 * Example 5: Cost Estimation for Vision Tasks
 * Estimate costs before processing images
 */
export async function estimateVisionCosts(imagePaths: string[]): Promise<void> {
  const adapter = new CleanOpenRouterAdapter(config);
  await adapter.initialize();

  const messages = imagePaths.map(path => 
    CleanOpenRouterAdapter.createVisionMessage(
      "Analyze this image for compliance issues.",
      path,
      'auto'
    )
  );

  const request: UnifiedCompletionRequest = {
    model: 'openai/gpt-4o',
    messages,
    temperature: 0.1,
    maxTokens: 1000,
    hints: {
      taskType: 'document_analysis',
      complexity: 'medium',
      qualityRequirement: 'high'
    }
  };

  const costEstimate = await adapter.estimateCost(request);
  
  console.log('Vision Analysis Cost Estimate:');
  console.log(`- Total Cost: $${costEstimate.estimatedCost.toFixed(4)}`);
  console.log(`- Text Processing: $${costEstimate.breakdown.promptCost?.toFixed(4) || 0}`);
  console.log(`- Image Processing: $${costEstimate.breakdown.imageCost?.toFixed(4) || 0}`);
  console.log(`- Images Count: ${imagePaths.length}`);
  console.log(`- Has Images: ${costEstimate.metadata?.hasImages}`);
}

/**
 * Example 6: Get Vision-Capable Models
 * List available models that support image analysis
 */
export function getAvailableVisionModels(): string[] {
  const visionModels = CleanOpenRouterAdapter.getVisionModels();
  
  console.log('Available Vision Models:');
  visionModels.forEach((model, index) => {
    const isVision = CleanOpenRouterAdapter.isVisionModel(model);
    console.log(`${index + 1}. ${model} - Vision: ${isVision}`);
  });
  
  return visionModels;
}

/**
 * Example 7: Batch Image Processing
 * Process multiple images efficiently
 */
export async function batchProcessImages(imagePaths: string[], analysisPrompt: string): Promise<string[]> {
  const adapter = new CleanOpenRouterAdapter(config);
  await adapter.initialize();

  const results: string[] = [];
  
  for (const imagePath of imagePaths) {
    const visionMessage = CleanOpenRouterAdapter.createVisionMessage(
      analysisPrompt,
      imagePath,
      'auto'
    );

    const request: UnifiedCompletionRequest = {
      model: 'google/gemini-2.5-flash', // Fast processing for batch jobs
      messages: [visionMessage],
      temperature: 0.1,
      maxTokens: 500,
      hints: {
        taskType: 'document_analysis',
        complexity: 'low',
        qualityRequirement: 'standard'
      }
    };

    const response = await adapter.generateCompletion(request);
    results.push(response.content);
    
    // Add delay between requests to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}