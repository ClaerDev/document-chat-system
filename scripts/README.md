# Deployment Scripts

This directory contains scripts to help you deploy the Document Chat System to various platforms.

## Available Scripts

### `setup-vercel.sh`

Syncs environment variables from your local `.env.local` file to your Vercel project.

#### Prerequisites

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Create your environment file**:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your actual values (API keys, database URLs, etc.)

#### Usage

**Basic usage** (syncs to all environments):
```bash
./scripts/setup-vercel.sh
```

**Sync to specific environments**:
```bash
# Production only
./scripts/setup-vercel.sh --prod

# Production and preview
./scripts/setup-vercel.sh --prod --preview

# All environments
./scripts/setup-vercel.sh --all
```

**Preview changes before applying** (dry run):
```bash
./scripts/setup-vercel.sh --dry-run
```

**Skip sensitive variables** (useful for testing):
```bash
./scripts/setup-vercel.sh --skip-sensitive
```

**Use a different environment file**:
```bash
./scripts/setup-vercel.sh --env-file .env.production
```

#### Options

| Option | Description |
|--------|-------------|
| `--prod` | Add variables to production environment only |
| `--preview` | Add variables to preview environment only |
| `--dev` | Add variables to development environment only |
| `--all` | Add variables to all environments (default) |
| `--dry-run` | Show what would be added without making changes |
| `--skip-sensitive` | Skip sensitive variables (API keys, secrets) |
| `--env-file <file>` | Use a different environment file (default: `.env.local`) |
| `--help` | Show help message |

#### Examples

**Test what would be added**:
```bash
./scripts/setup-vercel.sh --dry-run
```

**Add only non-sensitive variables first**:
```bash
./scripts/setup-vercel.sh --skip-sensitive --all
```

**Add all variables to production**:
```bash
./scripts/setup-vercel.sh --prod
```

#### Important Notes

1. **Sensitive Variables**: The script will detect sensitive variables (API keys, secrets, database URLs) and handle them carefully.

2. **Existing Variables**: If a variable already exists in Vercel, the script will report it but won't overwrite it. You'll need to manually remove and re-add variables to update them.

3. **Placeholder Values**: Variables with placeholder values (like `your-api-key`) will be automatically skipped.

4. **Vercel Project Linking**: The script will prompt you to link a Vercel project if you haven't already done so.

#### Manually Managing Variables

You can also manage individual variables using Vercel CLI:

**Add a single variable**:
```bash
vercel env add VARIABLE_NAME
```

**List all variables**:
```bash
vercel env ls
```

**Remove a variable**:
```bash
vercel env rm VARIABLE_NAME
```

**Pull variables from Vercel**:
```bash
vercel env pull .env.vercel
```

## Troubleshooting

### Script won't run

Make sure the script is executable:
```bash
chmod +x scripts/setup-vercel.sh
```

### Variables not being added

1. Check that your `.env.local` file exists and has the correct format
2. Verify you're logged in to Vercel: `vercel whoami`
3. Ensure your Vercel project is linked: `vercel link`
4. Try running with `--dry-run` to see what would be added

### Need to update existing variables

Vercel CLI doesn't overwrite existing variables. To update:
```bash
# Remove the old value
vercel env rm VARIABLE_NAME production

# Add the new value
vercel env add VARIABLE_NAME production
```

Or use the Vercel dashboard: https://vercel.com/dashboard

## Deployment Workflow

1. **Set up your environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

2. **Link to Vercel**:
   ```bash
   vercel link
   ```

3. **Sync environment variables**:
   ```bash
   ./scripts/setup-vercel.sh --all
   ```

4. **Deploy**:
   ```bash
   vercel --prod
   ```

## Security Best Practices

- ✅ **Never commit** `.env.local` or any file containing real credentials
- ✅ **Use different credentials** for development, preview, and production
- ✅ **Rotate secrets regularly**, especially after team member changes
- ✅ **Review Vercel logs** to ensure no secrets are being logged
- ✅ **Use environment-specific** database instances

## Need Help?

- 📖 [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- 💬 [Open an issue](../../issues) if you encounter problems
- 🔧 Check the [main README](../README.md) for project setup instructions
