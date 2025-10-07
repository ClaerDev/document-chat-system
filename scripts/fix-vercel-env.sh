#!/bin/bash

# Fix Vercel Environment Variables with Supabase
cd "/Users/chris/Downloads/Projects/Business/NZOUAT/GovMatch AI/Project Docs/✅ V2/md/document-chat-system"

echo "🔧 Fixing Vercel environment variables with Supabase configuration..."
source .env.local

# Extract Supabase project ref from URL
SUPABASE_PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's/https:\/\/([^.]+).*/\1/')

# Construct Supabase DATABASE_URL
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
echo ""
echo "⚠️  IMPORTANT: You need to get your Supabase database password"
echo "   Go to: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/settings/database"
echo "   Copy the 'Connection string' under 'Connection pooling'"
echo ""
read -p "Paste your Supabase DATABASE_URL here: " SUPABASE_DATABASE_URL

if [ -z "$SUPABASE_DATABASE_URL" ]; then
    echo "❌ No DATABASE_URL provided. Exiting."
    exit 1
fi

echo ""
echo "🗑️  Removing old DATABASE_URL..."
vercel env rm DATABASE_URL production -y 2>/dev/null

echo "➕ Adding Supabase DATABASE_URL to production..."
echo "$SUPABASE_DATABASE_URL" | vercel env add DATABASE_URL production

echo "➕ Adding Supabase DATABASE_URL to preview..."
echo "$SUPABASE_DATABASE_URL" | vercel env add DATABASE_URL preview

# Add Supabase variables
echo ""
echo "➕ Adding Supabase configuration..."
echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Add NEXTAUTH_URL (important for production)
echo ""
echo "➕ Adding production URLs..."
echo "https://document-chat-system-watat83s-projects.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production
echo "https://document-chat-system-watat83s-projects.vercel.app" | vercel env add NEXTAUTH_URL production

# Add ImageRouter variables
echo ""
echo "➕ Adding ImageRouter configuration..."
echo "$IMAGEROUTER_API_KEY" | vercel env add IMAGEROUTER_API_KEY production
echo "$IMAGEROUTER_BASE_URL" | vercel env add IMAGEROUTER_BASE_URL production

echo ""
echo "✅ All critical environment variables updated!"
echo ""
echo "📋 Verify with: vercel env ls"
echo "🚀 Deploy with: vercel --prod"
