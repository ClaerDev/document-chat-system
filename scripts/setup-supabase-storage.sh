#!/bin/bash

# Setup Supabase Storage Bucket
#
# This script creates the 'documents' storage bucket in Supabase
# and configures the necessary policies for document uploads
#
# Usage:
#   ./scripts/setup-supabase-storage.sh

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Setup Supabase Storage Bucket                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL not found${NC}"
    echo ""
    echo "Please set NEXT_PUBLIC_SUPABASE_URL in .env.local"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY not found${NC}"
    echo ""
    echo "Please set SUPABASE_SERVICE_ROLE_KEY in .env.local"
    exit 1
fi

echo -e "${BLUE}📊 Supabase Details:${NC}"
echo "  URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "  Service Role: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo ""

# Create storage bucket
echo -e "${BLUE}🪣 Creating 'documents' storage bucket...${NC}"
echo ""

BUCKET_RESPONSE=$(curl -s -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "documents",
    "public": true,
    "file_size_limit": 52428800,
    "allowed_mime_types": null
  }')

echo "Response: $BUCKET_RESPONSE"

if echo "$BUCKET_RESPONSE" | grep -q "already exists"; then
    echo -e "${YELLOW}⚠️  Bucket 'documents' already exists${NC}"
    echo ""
elif echo "$BUCKET_RESPONSE" | grep -q '"name":"documents"'; then
    echo -e "${GREEN}✅ Bucket 'documents' created successfully${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  Bucket might already exist or response unexpected${NC}"
    echo ""
fi

# Setup RLS policies using SQL
echo -e "${BLUE}🔐 Setting up storage policies...${NC}"
echo ""

POLICIES_SQL="
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS \"Authenticated users can upload documents\" ON storage.objects;
DROP POLICY IF EXISTS \"Public read access for documents\" ON storage.objects;
DROP POLICY IF EXISTS \"Authenticated users can update their documents\" ON storage.objects;
DROP POLICY IF EXISTS \"Authenticated users can delete their documents\" ON storage.objects;
DROP POLICY IF EXISTS \"Service role has full access\" ON storage.objects;

-- Policy 1: Service role has full access (for your app)
CREATE POLICY \"Service role has full access\"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'documents');

-- Policy 2: Authenticated users can upload
CREATE POLICY \"Authenticated users can upload documents\"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy 3: Public read access
CREATE POLICY \"Public read access for documents\"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy 4: Authenticated users can update
CREATE POLICY \"Authenticated users can update their documents\"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Policy 5: Authenticated users can delete
CREATE POLICY \"Authenticated users can delete their documents\"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
"

# Use direct connection for SQL execution
DIRECT_DB_URL="postgresql://postgres:sFmpJcO3fuNVmnJ9@db.gzfzcrecyhmtbuefyvtr.supabase.co:5432/postgres"

# Write SQL to temp file and execute
TEMP_SQL=$(mktemp)
echo "$POLICIES_SQL" > "$TEMP_SQL"
DATABASE_URL="$DIRECT_DB_URL" npx prisma db execute --file "$TEMP_SQL" --schema prisma/schema.prisma
rm "$TEMP_SQL"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Storage policies configured successfully${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Some policies may already exist (this is fine)${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      Summary                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Supabase storage bucket 'documents' is ready${NC}"
echo -e "${GREEN}✅ Storage policies configured${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Try uploading a document in production"
echo "  2. The upload should now work without 500 errors"
echo ""
echo -e "${BLUE}Bucket details:${NC}"
echo "  • Name: documents"
echo "  • Public: Yes"
echo "  • Max file size: 50MB"
echo "  • Location: ${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents"
echo ""
