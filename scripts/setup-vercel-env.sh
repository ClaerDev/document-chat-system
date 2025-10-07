#!/bin/bash

# Vercel Environment Variables Setup Script
# This script adds all required environment variables to your Vercel project

echo "🚀 Setting up Vercel environment variables..."
echo ""
echo "⚠️  IMPORTANT: You need to have the Vercel CLI installed and be logged in"
echo "   Run: npm i -g vercel"
echo "   Then: vercel login"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found. Please create it first with your actual values."
    echo "   Copy from .env.example: cp .env.example .env.local"
    exit 1
fi

echo "📋 Loading variables from .env.local..."
echo ""

# Function to add environment variable to Vercel
add_env_var() {
    local key=$1
    local value=$2
    local environments=${3:-"production,preview,development"}

    if [ -z "$value" ]; then
        echo "⏭️  Skipping $key (empty value)"
        return
    fi

    echo "➕ Adding $key..."
    echo "$value" | vercel env add "$key" $environments --force 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "✅ Added $key"
    else
        echo "⚠️  Failed to add $key (might already exist)"
    fi
}

# Source the .env.local file
set -a
source .env.local
set +a

echo "🔐 Adding environment variables to Vercel..."
echo ""

# Database
add_env_var "DATABASE_URL" "$DATABASE_URL" "production,preview"

# Clerk
add_env_var "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
add_env_var "CLERK_SECRET_KEY" "$CLERK_SECRET_KEY" "production,preview"
add_env_var "NEXT_PUBLIC_CLERK_SIGN_IN_URL" "$NEXT_PUBLIC_CLERK_SIGN_IN_URL"
add_env_var "NEXT_PUBLIC_CLERK_SIGN_UP_URL" "$NEXT_PUBLIC_CLERK_SIGN_UP_URL"
add_env_var "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL" "$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"
add_env_var "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL" "$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"

# Stripe
add_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY" "production,preview"
add_env_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET" "production,preview"
add_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

# Inngest
add_env_var "INNGEST_EVENT_KEY" "$INNGEST_EVENT_KEY" "production,preview"
add_env_var "INNGEST_SIGNING_KEY" "$INNGEST_SIGNING_KEY" "production,preview"

# Pinecone
add_env_var "PINECONE_API_KEY" "$PINECONE_API_KEY" "production,preview"
add_env_var "PINECONE_ENVIRONMENT" "$PINECONE_ENVIRONMENT"
add_env_var "PINECONE_INDEX_NAME" "$PINECONE_INDEX_NAME"

# AI Providers (optional)
add_env_var "OPENAI_API_KEY" "$OPENAI_API_KEY" "production,preview"
add_env_var "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY" "production,preview"
add_env_var "GOOGLE_API_KEY" "$GOOGLE_API_KEY" "production,preview"

# App Configuration
add_env_var "NEXT_PUBLIC_APP_URL" "$NEXT_PUBLIC_APP_URL"
add_env_var "NODE_ENV" "production" "production"

echo ""
echo "✅ Environment variables setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify variables in Vercel Dashboard: vercel env ls"
echo "   2. Redeploy your app: vercel --prod"
echo "   3. Configure Inngest webhook at: app.inngest.com"
echo ""
