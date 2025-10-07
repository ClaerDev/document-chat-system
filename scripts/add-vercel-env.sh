#!/bin/bash

# Better Vercel Environment Variables Setup
# Uses proper CLI syntax with echo piping

cd "/Users/chris/Downloads/Projects/Business/NZOUAT/GovMatch AI/Project Docs/✅ V2/md/document-chat-system"

echo "🚀 Adding environment variables to Vercel..."

# Load environment variables
source .env.local

# Function to add environment variable
add_var() {
    local name=$1
    local value=$2

    if [ -z "$value" ] || [ "$value" == "your-"* ]; then
        echo "⏭️  Skipping $name (not configured)"
        return
    fi

    echo "➕ Adding $name..."
    echo -e "$value\nproduction\npreview\ndevelopment" | vercel env add "$name" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "✅ Added $name"
    fi
}

# Database
add_var "DATABASE_URL" "$DATABASE_URL"

# Clerk
add_var "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
add_var "CLERK_SECRET_KEY" "$CLERK_SECRET_KEY"
add_var "CLERK_WEBHOOK_SECRET" "$CLERK_WEBHOOK_SECRET"
add_var "NEXT_PUBLIC_CLERK_SIGN_IN_URL" "$NEXT_PUBLIC_CLERK_SIGN_IN_URL"
add_var "NEXT_PUBLIC_CLERK_SIGN_UP_URL" "$NEXT_PUBLIC_CLERK_SIGN_UP_URL"
add_var "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL" "$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"
add_var "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL" "$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"

# Security
add_var "INTERNAL_API_KEY" "$INTERNAL_API_KEY"
add_var "CRON_SECRET" "$CRON_SECRET"
add_var "JWT_SECRET" "$JWT_SECRET"
add_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"

# Inngest
add_var "INNGEST_EVENT_KEY" "$INNGEST_EVENT_KEY"
add_var "INNGEST_SIGNING_KEY" "$INNGEST_SIGNING_KEY"

# OpenRouter
add_var "OPENROUTER_API_KEY" "$OPENROUTER_API_KEY"
add_var "OPENROUTER_APP_NAME" "$OPENROUTER_APP_NAME"
add_var "OPENROUTER_SITE_URL" "$OPENROUTER_SITE_URL"
add_var "OPENROUTER_COST_OPTIMIZATION" "$OPENROUTER_COST_OPTIMIZATION"
add_var "OPENROUTER_FALLBACK_STRATEGY" "$OPENROUTER_FALLBACK_STRATEGY"

# AI Providers
add_var "OPENAI_API_KEY" "$OPENAI_API_KEY"
add_var "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY"
add_var "GOOGLE_GENERATIVE_AI_API_KEY" "$GOOGLE_GENERATIVE_AI_API_KEY"

# ImageRouter
add_var "IMAGEROUTER_API_KEY" "$IMAGEROUTER_API_KEY"

# Pinecone
add_var "PINECONE_API_KEY" "$PINECONE_API_KEY"
add_var "PINECONE_ENVIRONMENT" "$PINECONE_ENVIRONMENT"
add_var "PINECONE_INDEX_NAME" "$PINECONE_INDEX_NAME"

# Stripe
add_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
add_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
add_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

# SAM.gov
add_var "SAM_GOV_API_KEY" "$SAM_GOV_API_KEY"

# Prompt Caching
add_var "OPENROUTER_PROMPT_CACHE_ENABLED" "$OPENROUTER_PROMPT_CACHE_ENABLED"
add_var "OPENROUTER_PROMPT_CACHE_TTL" "$OPENROUTER_PROMPT_CACHE_TTL"
add_var "OPENROUTER_PROMPT_CACHE_MIN_TOKENS" "$OPENROUTER_PROMPT_CACHE_MIN_TOKENS"

echo ""
echo "✅ Done! Check variables with: vercel env ls"
