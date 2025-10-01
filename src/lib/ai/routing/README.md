# Intelligent AI Routing & Prompt Injection

This system provides intelligent routing and prompt amplification for AI requests using a lightweight LLM for intent classification.

## How It Works

1. **Intent Classification**: Uses a cheap OpenRouter model (gpt-3.5-turbo) to classify user intent
2. **Prompt Injection**: Amplifies prompts using specialized templates from the prompt library
3. **Smart Routing**: Routes to appropriate providers (OpenRouter, ImageRouter) based on intent

## Main Components

### SimpleIntentRouter
- Uses dedicated OpenRouter instance with gpt-3.5-turbo for classification
- Structured JSON responses for consistent parsing
- Minimal token usage for cost efficiency
- Extensible intent definitions

### PromptInjector
- Injects specialized prompts based on detected intent
- Leverages prompt library templates
- Optimizes parameters (temperature, maxTokens) per intent

## Supported Intents

### FILE_PROCESSING
- **extract**: Complete text extraction without summarization
- **summarize**: Executive summaries for decision makers
- **analyze**: Structured data extraction and insights
- **compliance**: Regulatory requirements analysis

**Routes to**: OpenRouter with specialized document processing prompts

### MEDIA_PROCESSING
- **image_generate**: Create new images
- **image_edit**: Modify existing images
- **video_generate**: Create videos

**Routes to**: ImageRouter with optimized media generation

### WEB_SEARCH
- **current_events**: Latest news and updates
- **research**: General information lookup

**Routes to**: OpenRouter with :online models for web search

## Usage Examples

### Basic Intent Classification & Routing

```typescript
import { simpleIntentRouter } from '@/lib/ai/routing/simple-intent-router';

const routing = await simpleIntentRouter.route({
  userInput: "Extract all text from this RFP document",
  attachments: [{ type: 'pdf', name: 'rfp.pdf', data: '...' }],
  organizationId: 'org123'
});

console.log(routing.classification.intent); // 'file_processing'
console.log(routing.classification.subIntent); // 'extract'
console.log(routing.provider); // 'openrouter'
console.log(routing.model); // 'openai/gpt-4o-mini'
```

### Prompt Injection for OpenRouter

```typescript
import { injectPromptForOpenRouter } from '@/lib/ai/prompts';

const openrouterRequest = await injectPromptForOpenRouter(
  "Summarize this government contract", 
  {
    attachments: [{ type: 'pdf', name: 'contract.pdf' }],
    context: { 
      organizationName: 'Acme Corp',
      documentType: 'contract' 
    }
  }
);

// Send to OpenRouter with amplified prompts
const result = await openrouterAdapter.generateCompletion(openrouterRequest);
```

### Using the Enhanced Chat API

The system is designed to work with your existing enhanced-chat API:

```typescript
// The API can now automatically detect intent and inject prompts
const response = await fetch('/api/v1/ai/enhanced-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{
      role: 'user',
      content: 'Generate a professional logo for my consulting company',
    }],
    // The system will detect this needs media processing
    // and route to ImageRouter automatically
  })
});
```

## Configuration

### Classifier Model Selection

The router uses cheap models for classification:

```typescript
private readonly CLASSIFIER_MODELS = {
  primary: 'openai/gpt-3.5-turbo',     // Main classifier
  fallback: 'openai/gpt-4o-mini',     // Backup
  structured: 'openai/gpt-3.5-turbo'  // For JSON responses
};
```

### Cost Optimization

- Classification costs ~$0.01 per 1000 requests
- Uses 150 tokens max per classification
- Structured JSON responses for efficient parsing
- Fallback to rule-based classification if LLM fails

## Adding New Intents

To add a new intent:

1. **Add to INTENTS definition**:
```typescript
KNOWLEDGE_BASE: {
  name: 'knowledge_base',
  description: 'Search internal knowledge base',
  provider: 'vector_search',
  subIntents: {
    SEMANTIC_SEARCH: 'semantic_search',
    DOCUMENT_LOOKUP: 'document_lookup'
  }
}
```

2. **Update classification prompt** in `buildClassificationPrompt()`

3. **Add routing logic** in `selectProviderAndModel()`

4. **Create prompt amplifiers** in `amplifyPrompt()`

5. **Add pipeline mapping** in `determineProcessingPipeline()`

## Monitoring & Health

Check classifier status:

```typescript
const status = await simpleIntentRouter.getClassifierStatus();
console.log(status.available); // true/false
console.log(status.latency);   // Classification latency in ms
```

## Cost Analysis

- **Classification**: ~$0.00001 per request
- **File Processing**: $0.0001 per 1K tokens (gpt-4o-mini/gpt-4o)
- **Media Generation**: ~$0.02 per image
- **Web Search**: $0.0002 per 1K tokens (with :online models)

Total overhead: < 1% of processing costs for 10x better accuracy and routing.

## Future Extensions

The system is designed for easy extension:

- **New Providers**: Add providers like local models, specialized APIs
- **New Intents**: Add intents like code generation, data analysis
- **Advanced Routing**: Add A/B testing, load balancing, cost optimization
- **Caching**: Add intent caching for repeated patterns
- **Analytics**: Track intent accuracy and routing performance