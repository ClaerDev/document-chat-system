#!/bin/bash

# Setup Production Database Schema
#
# This script pushes your Prisma schema to the production Supabase database
# It uses the DATABASE_URL from Vercel environment variables
#
# Usage:
#   ./scripts/setup-production-db.sh

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Setup Production Database Schema               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# The Supabase production DATABASE_URL with pgbouncer
PROD_DB_URL="postgresql://postgres.gzfzcrecyhmtbuefyvtr:sFmpJcO3fuNVmnJ9@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

echo -e "${BLUE}📊 Database Details:${NC}"
echo "  Host: aws-1-us-east-2.pooler.supabase.com"
echo "  Database: postgres"
echo "  Schema: public"
echo ""

echo -e "${YELLOW}⚠️  This will push your Prisma schema to production${NC}"
echo -e "${YELLOW}⚠️  Make sure you want to proceed!${NC}"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Aborted${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🚀 Pushing schema to production database...${NC}"
echo ""

# Run prisma db push with the production URL
DATABASE_URL="$PROD_DB_URL" npx prisma db push --skip-generate --accept-data-loss

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Database schema pushed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Visit your production app"
    echo "  2. Try uploading a document"
    echo "  3. Check Vercel logs if any errors occur"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Failed to push schema${NC}"
    echo ""
    echo -e "${YELLOW}Alternative: Use Supabase SQL Editor${NC}"
    echo "  1. Go to https://supabase.com/dashboard"
    echo "  2. Select your project"
    echo "  3. Click SQL Editor"
    echo "  4. Run the schema.sql file"
    echo ""
    exit 1
fi
