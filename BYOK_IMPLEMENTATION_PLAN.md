# BYOK (Bring Your Own Keys) Implementation Plan

## Overview
Transition from server-side API keys to user-provided keys stored in **localStorage only** (never in database).

## Architecture

### Client-Side
- **Storage**: localStorage (browser-based, never sent to database)
- **Key Manager**: `src/lib/client/api-key-manager.ts` ✅ Created
- **Settings Page**: Primary UI for managing keys
- **Request Headers**: Keys sent via custom headers to API routes

### Server-Side
- **Key Extraction**: `src/lib/server/user-api-keys.ts` ✅ Created
- **Fallback**: Server env keys as fallback (for development/testing)
- **Validation**: Check required keys before operations

## Implementation Steps

### Phase 1: Infrastructure (✅ Complete)
- [x] Create client-side API key manager
- [x] Create server-side key extractor
- [x] Define key validation logic

### Phase 2: Update API Routes
Files that need to be updated to use user-provided keys:

#### Document Analysis
- [ ] `src/app/api/v1/documents/[id]/analyze/route.ts`
- [ ] `src/app/api/v1/documents/[id]/process/route.ts`
- [ ] `src/app/api/v1/documents/upload/route.ts` (analysis part)

**Changes needed:**
```typescript
// Extract user keys from headers
const userKeys = extractUserApiKeys(request);

// Get AI config with user keys
const aiConfig = getAIServiceConfig(userKeys);

// Validate required keys
const validation = validateRequiredKeys(userKeys, { aiService: true });
if (!validation.valid) {
  return NextResponse.json({
    error: 'Missing required API keys',
    missing: validation.missing,
    message: 'Please configure your API keys in Settings'
  }, { status: 400 });
}

// Use user keys in AI service
const aiService = new AIService({
  openrouterApiKey: aiConfig.openrouter.apiKey,
  openaiApiKey: aiConfig.openai.apiKey,
  // ...
});
```

#### Vectorization
- [ ] `src/app/api/v1/documents/[id]/vectorize/route.ts`
- [ ] `src/lib/ai/services/embedding-service.ts`
- [ ] `src/lib/ai/services/vector-index-manager.ts`

**Changes needed:**
```typescript
const userKeys = extractUserApiKeys(request);
const pineconeConfig = getPineconeConfig(userKeys);

const validation = validateRequiredKeys(userKeys, {
  aiService: true,
  pinecone: true
});

// Use pineconeConfig.apiKey, pineconeConfig.environment, etc.
```

#### Chat/AI Features
- [ ] `src/app/api/v1/chat/route.ts` (if exists)
- [ ] Any routes using AI services

### Phase 3: Update Client Components

#### Settings Page
- [ ] Update `src/app/settings/page.tsx` to:
  - Make it clear keys are stored locally only
  - Add "Test Connection" buttons for each service
  - Show which services are configured
  - Add clear warnings about keeping keys secure
  - Add export/import functionality for keys (optional)

#### Document Operations
- [ ] Update document analysis buttons to:
  - Check for required keys before making request
  - Show "Configure Keys" modal if missing
  - Include API key headers in requests

**Example:**
```typescript
import { hasRequiredKeysForAnalysis, createApiKeyHeaders, getMissingKeys } from '@/lib/client/api-key-manager';

async function analyzeDocument(documentId: string) {
  // Check for required keys
  if (!hasRequiredKeysForAnalysis()) {
    const missing = getMissingKeys('analysis');
    toast.error(`Missing API keys: ${missing.join(', ')}. Please configure in Settings.`);
    router.push('/settings');
    return;
  }

  // Include keys in request
  const response = await fetch(`/api/v1/documents/${documentId}/analyze`, {
    method: 'POST',
    headers: {
      ...createApiKeyHeaders(),
      'Content-Type': 'application/json'
    }
  });
}
```

### Phase 4: Add User Guidance

#### Missing Keys Modal
Create `src/components/missing-keys-modal.tsx`:
- Shows when API calls fail due to missing keys
- Lists which keys are missing
- Button to go to Settings page
- Instructions on where to get API keys

#### Settings Page UI Improvements
- Add links to get API keys:
  - OpenRouter: https://openrouter.ai/keys
  - OpenAI: https://platform.openai.com/api-keys
  - Anthropic: https://console.anthropic.com/
  - Pinecone: https://app.pinecone.io/
- Add "Why do I need my own keys?" FAQ
- Show estimated costs per operation

### Phase 5: Remove Server Keys (Production Only)

After full implementation, remove server-side API keys from Vercel production:
```bash
vercel env rm OPENROUTER_API_KEY production
vercel env rm OPENAI_API_KEY production
vercel env rm ANTHROPIC_API_KEY production
vercel env rm PINECONE_API_KEY production
# Keep them in development/preview for testing
```

## Security Considerations

### ✅ Safe
- Keys in localStorage (browser-based, per-user, per-device)
- Keys sent via HTTPS headers (encrypted in transit)
- Never stored in database (no data breach risk)
- User has full control over their keys

### ⚠️ Considerations
- Keys visible in browser DevTools (user's own device)
- Keys sent with every request (normal for API key auth)
- User responsible for key security (standard practice)

## User Experience

### First-Time User Flow
1. Sign up → Dashboard
2. Try to upload/analyze document
3. Get "Missing API Keys" error
4. Redirected to Settings page
5. Configure keys (with helpful links)
6. Return to documents
7. Operations now work

### Returning User Flow
1. Keys persist in localStorage
2. All operations work immediately
3. Can update keys in Settings anytime

## Benefits

### For You (Developer)
- ✅ Zero API costs (users pay their own)
- ✅ No billing system needed
- ✅ No usage tracking needed
- ✅ Simpler infrastructure
- ✅ No liability for API abuse

### For Users
- ✅ Full control over API keys
- ✅ Direct billing relationship with API providers
- ✅ Can use their existing API credits
- ✅ Transparent costs
- ✅ No middleman markup

## Migration Path

1. **Phase 1-2**: Implement infrastructure (✅ Done) and update routes
2. **Phase 3-4**: Update UI and add guidance
3. **Test thoroughly** in development
4. **Deploy to production** with server keys as fallback
5. **Phase 5**: Remove server keys after users have migrated

## Testing Checklist

- [ ] Upload document with user keys
- [ ] Analyze document with user keys
- [ ] Vectorize document with user keys
- [ ] Error handling when keys missing
- [ ] Error handling when keys invalid
- [ ] Settings page saves/loads keys correctly
- [ ] Test connection buttons work
- [ ] Fallback to server keys works (dev only)

## Documentation Needed

- [ ] README: Update deployment instructions
- [ ] README: Add "Getting Started" for users (how to get API keys)
- [ ] Settings page: In-app instructions
- [ ] FAQ: Why BYOK? How much does it cost?

## Timeline Estimate

- **Phase 2** (Update API routes): 4-6 hours
- **Phase 3** (Update UI components): 3-4 hours
- **Phase 4** (User guidance): 2-3 hours
- **Phase 5** (Remove server keys): 1 hour
- **Testing**: 2-3 hours

**Total**: ~15-20 hours of work

## Next Steps

1. Review this plan - any changes needed?
2. Prioritize which routes to update first
3. Start with document upload/analysis (most common operations)
4. Then vectorization
5. Then chat/other features
