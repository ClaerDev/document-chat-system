# AI Endpoints Rate Limiting Implementation

## Status

✅ **Implemented** - `/api/v1/ai/chat`

## Critical AI Endpoints Requiring Rate Limiting

### High Priority (Cost-Sensitive)
- [ ] `/api/v1/ai/document-chat` - Document analysis with AI
- [ ] `/api/v1/ai/enhanced-chat` - Enhanced chat features
- [ ] `/api/v1/ai/generate-content` - Content generation
- [ ] `/api/v1/ai/media` - Media generation (ImageRouter)
- [ ] `/api/ai/copilot` - AI copilot features
- [ ] `/api/ai/command` - AI command execution

### Medium Priority (Moderate Cost)
- [ ] `/api/v1/ai/ab-testing/execute` - A/B test execution
- [ ] `/api/v1/documents/[id]/analyze` - Document analysis

### Low Priority (Analytics/Config)
- `/api/v1/ai/analytics` - Already read-only
- `/api/v1/ai/config` - Config endpoints (low frequency)
- `/api/v1/ai/health` - Health checks (low cost)

## Implementation Pattern

```typescript
// 1. Add import
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit';

// 2. Add rate limiting check after authentication
const rateLimitResult = await checkRateLimit(request, rateLimitConfigs.ai, 'ai-[endpoint]');
if (!rateLimitResult.success) {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: rateLimitConfigs.ai.message,
      limit: rateLimitResult.limit,
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
      }
    }
  );
}
```

## Rate Limit Configuration

From `src/lib/rate-limit.ts`:

```typescript
ai: {
  windowMs: 60000,           // 1 minute window
  maxRequests: 10,           // 10 requests per minute (dev: 100)
  message: 'Too many AI requests. Please wait before trying again.'
}
```

## Testing

```bash
# Test rate limit
for i in {1..15}; do
  curl -X POST https://your-app.com/api/v1/ai/chat \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"test"}]}'
  echo "\nRequest $i"
done

# Should see 429 errors after 10 requests within 1 minute
```

## Deployment Checklist

- [x] Add rate limiting to `/api/v1/ai/chat`
- [ ] Add rate limiting to other high-priority AI endpoints
- [ ] Test rate limits in development
- [ ] Monitor rate limit hits in production
- [ ] Adjust limits based on usage patterns
- [ ] Document rate limits in API documentation

## Monitoring

Track rate limit hits with:
- Redis metrics for rate limit counters
- Security monitoring logs for exceeded limits
- Cost tracking per endpoint to validate effectiveness
