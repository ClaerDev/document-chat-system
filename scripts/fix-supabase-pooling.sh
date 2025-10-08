#!/bin/bash

# Fix Supabase Connection Pooling Issue
#
# This script updates the DATABASE_URL in Vercel to use pgbouncer mode,
# which fixes the "prepared statement does not exist" error.
#
# Usage:
#   ./scripts/fix-supabase-pooling.sh

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Fix Supabase Connection Pooling Issue             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found${NC}"
    echo ""
    echo "Please install the Vercel CLI first:"
    echo -e "  ${GREEN}npm install -g vercel${NC}"
    exit 1
fi

# Verify Vercel project is linked
if [ ! -d ".vercel" ]; then
    echo -e "${RED}❌ No Vercel project linked${NC}"
    echo ""
    echo "Please link your Vercel project first:"
    echo -e "  ${GREEN}vercel link${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  DATABASE_URL Update Required${NC}"
echo ""
echo "The 'prepared statement does not exist' error occurs when using"
echo "Supabase's connection pooler without the pgbouncer parameter."
echo ""
echo -e "${BLUE}Current DATABASE_URL format:${NC}"
echo "postgresql://postgres.xxx:password@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
echo ""
echo -e "${BLUE}Required format:${NC}"
echo "postgresql://postgres.xxx:password@aws-1-us-east-2.pooler.supabase.com:6543/postgres${GREEN}?pgbouncer=true${NC}"
echo ""

# Get the current DATABASE_URL from local env
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local file not found${NC}"
    echo ""
    echo "Please create .env.local with your DATABASE_URL first"
    exit 1
fi

# Extract DATABASE_URL from .env.local
CURRENT_URL=$(grep "^DATABASE_URL=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$CURRENT_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not found in .env.local${NC}"
    exit 1
fi

echo -e "${BLUE}Current DATABASE_URL from .env.local:${NC}"
# Mask the password in output
MASKED_URL=$(echo "$CURRENT_URL" | sed -E 's/(:[^@]+@)/:*****@/')
echo "$MASKED_URL"
echo ""

# Check if already has pgbouncer parameter
if [[ "$CURRENT_URL" == *"?pgbouncer=true"* ]]; then
    echo -e "${GREEN}✅ DATABASE_URL already has pgbouncer=true${NC}"
    echo ""
    echo "The URL is correctly configured. Let's update Vercel production:"
else
    echo -e "${YELLOW}⚠️  Adding pgbouncer=true to DATABASE_URL${NC}"
    # Add pgbouncer parameter if not present
    if [[ "$CURRENT_URL" == *"?"* ]]; then
        # Already has query params, add with &
        CURRENT_URL="${CURRENT_URL}&pgbouncer=true"
    else
        # No query params, add with ?
        CURRENT_URL="${CURRENT_URL}?pgbouncer=true"
    fi

    MASKED_URL=$(echo "$CURRENT_URL" | sed -E 's/(:[^@]+@)/:*****@/')
    echo -e "${GREEN}Updated URL: $MASKED_URL${NC}"
    echo ""
fi

# Update Vercel production environment
echo -e "${BLUE}📤 Updating Vercel production environment...${NC}"
echo ""

# Remove old DATABASE_URL
echo -e "${YELLOW}Removing old DATABASE_URL from production...${NC}"
vercel env rm DATABASE_URL production --yes 2>&1 || echo "  (Variable might not exist)"

# Add new DATABASE_URL
echo ""
echo -e "${GREEN}Adding updated DATABASE_URL to production...${NC}"
if echo "$CURRENT_URL" | vercel env add DATABASE_URL production &> /dev/null; then
    echo -e "${GREEN}✅ DATABASE_URL updated successfully${NC}"
else
    echo -e "${RED}❌ Failed to update DATABASE_URL${NC}"
    echo ""
    echo "Please update manually using:"
    echo -e "  ${GREEN}vercel env add DATABASE_URL production${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      Summary                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ DATABASE_URL updated with pgbouncer=true${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Redeploy your app: ${GREEN}vercel --prod${NC}"
echo -e "  2. The prepared statement errors should be resolved"
echo ""
echo -e "${YELLOW}💡 Note:${NC} The pgbouncer parameter tells Prisma to use"
echo "   transaction pooling mode, which is compatible with"
echo "   Supabase's connection pooler."
echo ""
