#!/bin/bash

# Vercel Environment Variables Deployment Script
# Adds all required environment variables to Vercel

cd "/Users/chris/Downloads/Projects/Business/NZOUAT/GovMatch AI/Project Docs/✅ V2/md/document-chat-system"

echo "🚀 Deploying environment variables to Vercel..."
source .env.local

# Function to add environment variable to both production and preview
add_env() {
    local name=$1
    local value=$2

    if [ -z "$value" ] || [ "$value" == "your-"* ] || [ "$value" == "\"your-"* ]; then
        echo "⏭️  Skipping $name (not configured)"
        return
    fi

    echo "➕ Adding $name to production..."
    echo "$value" | vercel env add "$name" production 2>&1 | grep -q "Added" && echo "  ✅ Production"

    echo "➕ Adding $name to preview..."
    echo "$value" | vercel env add "$name" preview 2>&1 | grep -q "Added" && echo "  ✅ Preview"
}

# Clerk Authentication
add_env "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
add_env "CLERK_SECRET_KEY" "$CLERK_SECRET_KEY"
add_env "CLERK_WEBHOOK_SECRET" "$CLERK_WEBHOOK_SECRET"
add_env "NEXT_PUBLIC_CLERK_SIGN_IN_URL" "$NEXT_PUBLIC_CLERK_SIGN_IN_URL"
add_env "NEXT_PUBLIC_CLERK_SIGN_UP_URL" "$NEXT_PUBLIC_CLERK_SIGN_UP_URL"
add_env "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL" "$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"
add_env "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL" "$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"

# Security Keys
add_env "INTERNAL_API_KEY" "$INTERNAL_API_KEY"
add_env "CRON_SECRET" "$CRON_SECRET"
add_env "JWT_SECRET" "$JWT_SECRET"
add_env "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"

# Inngest Background Jobs
add_env "INNGEST_EVENT_KEY" "$INNGEST_EVENT_KEY"
add_env "INNGEST_SIGNING_KEY" "$INNGEST_SIGNING_KEY"

# OpenRouter
add_env "OPENROUTER_API_KEY" "$OPENROUTER_API_KEY"
add_env "OPENROUTER_APP_NAME" "$OPENROUTER_APP_NAME"
add_env "OPENROUTER_SITE_URL" "$OPENROUTER_SITE_URL"
add_env "OPENROUTER_COST_OPTIMIZATION" "$OPENROUTER_COST_OPTIMIZATION"
add_env "OPENROUTER_FALLBACK_STRATEGY" "$OPENROUTER_FALLBACK_STRATEGY"

# AI Provider Keys
add_env "OPENAI_API_KEY" "$OPENAI_API_KEY"
add_env "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY"
add_env "GOOGLE_GENERATIVE_AI_API_KEY" "$GOOGLE_GENERATIVE_AI_API_KEY"

# ImageRouter
add_env "IMAGEROUTER_API_KEY" "$IMAGEROUTER_API_KEY"

# Pinecone Vector Database
add_env "PINECONE_API_KEY" "$PINECONE_API_KEY"
add_env "PINECONE_ENVIRONMENT" "$PINECONE_ENVIRONMENT"
add_env "PINECONE_INDEX_NAME" "$PINECONE_INDEX_NAME"

# Stripe Billing
add_env "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
add_env "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
add_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

# SAM.gov API
add_env "SAM_GOV_API_KEY" "$SAM_GOV_API_KEY"

# Prompt Caching
add_env "OPENROUTER_PROMPT_CACHE_ENABLED" "$OPENROUTER_PROMPT_CACHE_ENABLED"
add_env "OPENROUTER_PROMPT_CACHE_TTL" "$OPENROUTER_PROMPT_CACHE_TTL"
add_env "OPENROUTER_PROMPT_CACHE_MIN_TOKENS" "$OPENROUTER_PROMPT_CACHE_MIN_TOKENS"

echo ""
echo "✅ All environment variables deployed!"
echo ""
echo "📋 Verify with: vercel env ls"
echo "🚀 Deploy with: vercel --prod"
