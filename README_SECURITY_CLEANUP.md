# 🔒 Security Cleanup Guide

## Current Status

✅ **Immediate protection implemented:**
- Updated `.gitignore` to prevent future commits
- Removed sensitive files from git tracking
- Created cleanup scripts and documentation

⚠️ **Still required:**
- Rotate all exposed API keys
- Clean git history to remove exposed secrets
- Force push cleaned history to GitHub

---

## 📋 Step-by-Step Instructions

### Step 1: Rotate API Keys (REQUIRED - Do this FIRST)

1. Open [KEYS_TO_ROTATE.md](./KEYS_TO_ROTATE.md)
2. Go through each service and rotate the keys
3. Update Vercel environment variables with new keys
4. Test that everything still works

**Estimated time**: 30-45 minutes

---

### Step 2: Clean Git History (OPTIONAL but RECOMMENDED)

This removes the exposed secrets from git history so they can't be accessed by anyone with repo access.

#### Option A: Using the Automated Script

```bash
# Make sure you're on the main branch
git checkout main

# Run the cleanup script
./scripts/cleanup-git-secrets.sh

# Follow the prompts and instructions
```

The script will:
- Create a backup branch automatically
- Install BFG Repo-Cleaner if needed
- Remove all sensitive files from entire git history
- Clean up the repository
- Provide next steps

#### Option B: Manual Cleanup (Advanced)

If you prefer manual control:

1. **Install BFG Repo-Cleaner:**
   ```bash
   brew install bfg
   ```

2. **Create backup:**
   ```bash
   git branch backup-before-cleanup-$(date +%Y%m%d)
   ```

3. **Remove files from history:**
   ```bash
   bfg --delete-files .env.production
   bfg --delete-files .env.production.local
   bfg --delete-files .env.production.check
   bfg --delete-files .env.vercel
   bfg --delete-files .env.vercel.production
   bfg --delete-files .env.vercel.check
   bfg --delete-files .env.local
   ```

4. **Clean up:**
   ```bash
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

5. **Force push:**
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

---

### Step 3: After History Cleanup

⚠️ **Important**: If you cleaned git history, all collaborators must:

1. Delete their local repository
2. Clone fresh from GitHub

---

## 📝 Files Created

1. **[KEYS_TO_ROTATE.md](./KEYS_TO_ROTATE.md)** - Complete list of exposed keys and rotation instructions
2. **[scripts/cleanup-git-secrets.sh](./scripts/cleanup-git-secrets.sh)** - Automated history cleanup script
3. **[README_SECURITY_CLEANUP.md](./README_SECURITY_CLEANUP.md)** - This file

---

## ⚠️ Important Notes

### About Git History Cleanup

**Pros:**
- ✅ Removes secrets from git history completely
- ✅ Prevents future accidental exposure
- ✅ Best security practice

**Cons:**
- ⚠️ Rewrites git history (breaks existing clones)
- ⚠️ All collaborators must re-clone
- ⚠️ Cannot be undone easily

### You Can Skip History Cleanup If:

- You rotate all the API keys (making old ones useless)
- Your repository is private
- You have very few collaborators
- You trust your current access controls

### You Should Clean History If:

- Repository might become public in the future
- You have many collaborators
- You want to follow security best practices
- You're concerned about compliance/audits

---

## 🆘 Troubleshooting

### Script fails with "BFG not found"

Install manually:
```bash
brew install bfg
```

Or download from: https://rtyley.github.io/bfg-repo-cleaner/

### "Repository size is still large"

The removed files may still be in packfiles. Wait a few minutes and run:
```bash
git gc --prune=now --aggressive
```

### Need to restore backup

```bash
git checkout backup-before-cleanup-YYYYMMDD
git branch -D main
git checkout -b main
```

### Vercel deployment fails after key rotation

1. Verify all environment variables are set in Vercel dashboard
2. Check for typos in variable names
3. Redeploy: `vercel --prod`

---

## ✅ Verification Checklist

After completing all steps:

- [ ] All API keys rotated in their respective dashboards
- [ ] All new keys updated in Vercel environment variables
- [ ] Tested application - all features working
- [ ] Git history cleaned (optional)
- [ ] Collaborators notified to re-clone (if history cleaned)
- [ ] `.gitignore` updated (already done)
- [ ] Sensitive files removed from tracking (already done)
- [ ] No `.env.production*` or `.env.vercel*` files in `git status`

---

## 📞 Support

If you have questions or run into issues:
1. Check the troubleshooting section above
2. Review the individual tool documentation
3. Contact your team lead or DevOps

---

**Created**: 2025-10-14
**Priority**: 🔴 HIGH
**Status**: ⚠️ ACTION REQUIRED
