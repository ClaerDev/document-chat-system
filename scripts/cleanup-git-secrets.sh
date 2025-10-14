#!/bin/bash

# Git History Secret Cleanup Script
# This script removes sensitive .env files from the entire git history
#
# WARNING: This rewrites git history and requires force push
# All collaborators will need to re-clone the repository

set -e

echo "🔒 Git History Secret Cleanup Script"
echo "===================================="
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  All collaborators must re-clone after this operation"
echo "⚠️  This cannot be undone easily"
echo ""
echo "Files to be removed from history:"
echo "  - .env.production"
echo "  - .env.production.local"
echo "  - .env.production.check"
echo "  - .env.vercel"
echo "  - .env.vercel.production"
echo "  - .env.vercel.check"
echo "  - .env.local"
echo ""
read -p "Do you want to continue? (type 'YES' to proceed): " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "❌ Aborted by user"
    exit 1
fi

echo ""
echo "📋 Creating backup of current branch..."
BACKUP_BRANCH="backup-before-history-cleanup-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH"
echo "✅ Backup created: $BACKUP_BRANCH"

echo ""
echo "🔍 Checking for BFG Repo-Cleaner..."
if ! command -v bfg &> /dev/null; then
    echo "⚠️  BFG Repo-Cleaner not found. Installing via brew..."
    if command -v brew &> /dev/null; then
        brew install bfg
    else
        echo "❌ Homebrew not found. Please install BFG manually:"
        echo "   brew install bfg"
        echo "   OR download from: https://rtyley.github.io/bfg-repo-cleaner/"
        exit 1
    fi
fi

echo ""
echo "📝 Creating file list for BFG..."
cat > /tmp/env-files-to-delete.txt << EOF
.env.production
.env.production.local
.env.production.check
.env.vercel
.env.vercel.production
.env.vercel.check
.env.local
EOF

echo ""
echo "🗑️  Removing files from git history..."
echo "   This may take a few minutes..."

# Use BFG to remove the files from history
bfg --delete-files .env.production
bfg --delete-files .env.production.local
bfg --delete-files .env.production.check
bfg --delete-files .env.vercel
bfg --delete-files .env.vercel.production
bfg --delete-files .env.vercel.check
bfg --delete-files .env.local

echo ""
echo "🧹 Cleaning up repository..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Git history cleaned successfully!"
echo ""
echo "📌 Next Steps:"
echo ""
echo "1. Review the changes:"
echo "   git log --oneline --all --graph"
echo ""
echo "2. If everything looks good, force push to remote:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "3. ⚠️  CRITICAL: Rotate ALL exposed API keys immediately!"
echo "   See KEYS_TO_ROTATE.md for the list"
echo ""
echo "4. Notify all collaborators to:"
echo "   - Delete their local repository"
echo "   - Clone fresh from GitHub"
echo ""
echo "5. If something went wrong, restore from backup:"
echo "   git checkout $BACKUP_BRANCH"
echo ""
echo "📊 Repository size comparison:"
du -sh .git
echo ""
