# 🔑 API Keys That Must Be Rotated

**Status**: ⚠️ EXPOSED IN GIT HISTORY - ACTION REQUIRED

The following API keys were exposed in the git repository and must be rotated immediately:

## 1. Clerk Authentication

**Where**: https://dashboard.clerk.com/

- **CLERK_SECRET_KEY**: `sk_test_bJDA6Bys0Ce46QLOeTQ2hcLcSYoflKxrhDXgldkpst`
- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**: `pk_test_c3BlY2lhbC1wdXAtNDEuY2xlcmsuYWNjb3VudHMuZGV2JA`
- **CLERK_WEBHOOK_SECRET**: `whsec_your_clerk_webhook_secret` (if real)

**Actions**:
1. Go to Clerk Dashboard → API Keys
2. Delete or rotate the secret key
3. Update in Vercel environment variables
4. Update webhook secret if configured

---

## 2. OpenAI

**Where**: https://platform.openai.com/api-keys

- **OPENAI_API_KEY**: `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`

**Actions**:
1. Go to OpenAI Platform → API Keys
2. Revoke the exposed key
3. Create new key
4. Update in Vercel: `vercel env add OPENAI_API_KEY production`

---

## 3. Anthropic (Claude)

**Where**: https://console.anthropic.com/settings/keys

- **ANTHROPIC_API_KEY**: `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`

**Actions**:
1. Go to Anthropic Console → API Keys
2. Revoke the exposed key
3. Create new key
4. Update in Vercel: `vercel env add ANTHROPIC_API_KEY production`

---

## 4. OpenRouter

**Where**: https://openrouter.ai/keys

- **OPENROUTER_API_KEY**: `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`

**Actions**:
1. Go to OpenRouter → Keys
2. Revoke the exposed key
3. Create new key
4. Update in Vercel: `vercel env add OPENROUTER_API_KEY production`

---

## 5. ImageRouter

**Where**: https://imagerouter.io/ (or contact support)

- **IMAGEROUTER_API_KEY**: `60cffce6e8238c207fd972ee141c93b62afc3fc029f67e47c2aa64d7bfee0750`

**Actions**:
1. Log in to ImageRouter dashboard
2. Revoke/regenerate API key
3. Update in Vercel: `vercel env add IMAGEROUTER_API_KEY production`

---

## 6. Pinecone

**Where**: https://app.pinecone.io/

- **PINECONE_API_KEY**: `pcsk_3LxUGD_5oQDgGgUFPnbJ1ZXtBFQPa7qxrJoA5bR95hcuzYsvvvt7t3ZyWUA396sUvFgB1m`

**Actions**:
1. Go to Pinecone → API Keys
2. Revoke the exposed key
3. Create new key
4. Update in Vercel: `vercel env add PINECONE_API_KEY production`

---

## 7. Supabase

**Where**: https://supabase.com/dashboard/project/gzfzcrecyhmtbuefyvtr/settings/api

- **DATABASE_URL**: Contains password `sFmpJcO3fuNVmnJ9`
- **SUPABASE_SERVICE_ROLE_KEY**: JWT token exposed
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: JWT token exposed
- **SUPABASE_PASSWORD**: `sFmpJcO3fuNVmnJ9`

**Actions**:
1. Go to Supabase Dashboard → Settings → Database
2. **Reset database password**
3. Go to Settings → API → Regenerate service role key
4. Update all in Vercel:
   ```bash
   vercel env add DATABASE_URL production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   ```
5. Update `.env.local` for local development

---

## 8. Inngest

**Where**: https://app.inngest.com/

- **INNGEST_EVENT_KEY**: `YUz8KAk1hhE2Ut5tIzmwiOXRexOm0zouQVtmqOOYT9LsqfvojFS5LYQHZgh7Ez-crYj_QDpoiRL1vvRssOviRw`
- **INNGEST_SIGNING_KEY**: `signkey-prod-a4847bddc3f81cba399579460f949bd1c9856f57c34b0399369043093baaa8f5`

**Actions**:
1. Go to Inngest Dashboard → Keys
2. Revoke both keys
3. Generate new keys
4. Update in Vercel:
   ```bash
   vercel env add INNGEST_EVENT_KEY production
   vercel env add INNGEST_SIGNING_KEY production
   ```

---

## 9. Stripe (Test Mode)

**Where**: https://dashboard.stripe.com/test/apikeys

- **STRIPE_SECRET_KEY**: `sk_test_51RgkzJQEGVp7c1lxMr8425u9BH0ZMNo2rZDUwQ2gi4Q9pOw5CuNj6xsBeco5poAe3MNHT9YfVB2KfgBfbIWNt5hf00tXFAIikp`
- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: `pk_test_51RgkzJQEGVp7c1lxRyPHUQaFspFh2FOqHUBr7olRrIQwRJemjcirwmWu2XWtFAu2pKyj3up5mr77sNdhNCMAQQ2E00SFHSX588`

**Actions**:
1. Go to Stripe Dashboard → Developers → API Keys
2. Roll (regenerate) the secret key
3. Update in Vercel:
   ```bash
   vercel env add STRIPE_SECRET_KEY production
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
   ```

---

## 10. Vercel OIDC Tokens

**Status**: These expire automatically (12 hours) but are in git history

- **VERCEL_OIDC_TOKEN**: Multiple tokens in various .env.vercel files

**Actions**:
- No action needed - these tokens expire automatically
- They should never be committed (now prevented by .gitignore)

---

## 🔄 Quick Rotation Script

After rotating keys in their respective dashboards, update Vercel with:

```bash
# Navigate to project directory
cd /path/to/document-chat-system

# Update all production environment variables
vercel env add OPENAI_API_KEY production
vercel env add ANTHROPIC_API_KEY production
vercel env add OPENROUTER_API_KEY production
vercel env add IMAGEROUTER_API_KEY production
vercel env add PINECONE_API_KEY production
vercel env add DATABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add INNGEST_EVENT_KEY production
vercel env add INNGEST_SIGNING_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production

# Redeploy to pick up new environment variables
vercel --prod
```

---

## ✅ After Rotation

1. Test your application thoroughly
2. Update local `.env.local` with new keys
3. Verify all features work:
   - Authentication (Clerk)
   - AI chat (OpenAI, Anthropic, OpenRouter)
   - Image generation (ImageRouter)
   - File storage (Supabase)
   - Vector search (Pinecone)
   - Background jobs (Inngest)
   - Payments (Stripe)

---

## 📝 Notes

- Test keys (sk_test_*, pk_test_*) are less critical than production keys but should still be rotated
- After rotation, the exposed keys become useless
- Monitor your API usage dashboards for any suspicious activity
- Set up usage alerts in each service to detect unauthorized use

---

**Priority**: 🔴 HIGH - Complete within 24 hours
**Estimated Time**: 30-45 minutes
