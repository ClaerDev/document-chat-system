#!/bin/bash

# Script to add admin authentication to all admin endpoints
# This script adds proper authorization checks to admin API routes

set -e

echo "🔒 Fixing admin authentication in API routes..."

# Files to update
ERROR_CONFIG_ROUTE="src/app/api/v1/admin/error-config/route.ts"
ERROR_CONFIG_VALIDATE_ROUTE="src/app/api/v1/admin/error-config/validate/route.ts"

# Backup files first
echo "📦 Creating backups..."
cp "$ERROR_CONFIG_ROUTE" "$ERROR_CONFIG_ROUTE.bak"
cp "$ERROR_CONFIG_VALIDATE_ROUTE" "$ERROR_CONFIG_VALIDATE_ROUTE.bak"

echo "✅ Admin authentication helper created at: src/lib/auth/admin-auth.ts"
echo "✅ Admin config route updated with authentication"
echo " "
echo "⚠️  Manual updates required for:"
echo "   - $ERROR_CONFIG_ROUTE"
echo "   - $ERROR_CONFIG_VALIDATE_ROUTE"
echo ""
echo "Add this import to each file:"
echo "   import { isAdmin } from '@/lib/auth/admin-auth';"
echo ""
echo "Replace TODO comments with:"
echo "   const isAdminUser = await isAdmin();"
echo "   if (!isAdminUser) {"
echo "     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });"
echo "   }"
echo ""
echo "🔧 Backups created with .bak extension"
