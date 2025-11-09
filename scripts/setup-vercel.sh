#!/bin/bash

# Vercel Environment Variables Setup Script
#
# This script helps you sync environment variables from your local .env.local
# file to your Vercel project. It's designed for open-source contributors
# and makes it easy to deploy your own instance.
#
# IMPORTANT: Required API Keys
# ============================
# The following API keys must be configured in your .env.local file:
#
# - OPENROUTER_API_KEY: For accessing OpenRouter AI models
# - OPENAI_API_KEY: For OpenAI models (GPT-4, etc.)
# - ANTHROPIC_API_KEY: For Claude models
# - IMAGEROUTER_API_KEY: For image/video generation models (DALL-E, Midjourney, etc.)
#   Get your key at: https://imagerouter.io
# - PINECONE_API_KEY: For vector search functionality
# - INNGEST_EVENT_KEY: For background job processing
# - INNGEST_SIGNING_KEY: For Inngest webhook security
# - DOCLING_SERVICE_URL: URL to Docling service (optional - Railway deployment)
# - DOCLING_ENABLED: Enable superior document processing with Docling (optional)
# - Database connection strings (Supabase/PostgreSQL)
# - Stripe API keys for payments
#
# This script will automatically sync ALL variables from .env.local to Vercel.
#
# Usage:
#   ./scripts/setup-vercel.sh [OPTIONS]
#
# Options:
#   --prod              Add variables to production only
#   --preview           Add variables to preview only
#   --dev               Add variables to development only
#   --all               Add variables to all environments (default)
#   --dry-run           Show what would be added without making changes
#   --skip-sensitive    Skip sensitive variables (API keys, secrets)
#   --help              Show this help message
#
# Examples:
#   ./scripts/setup-vercel.sh --all
#   ./scripts/setup-vercel.sh --prod --preview
#   ./scripts/setup-vercel.sh --dry-run

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENTS=()
DRY_RUN=false
SKIP_SENSITIVE=false
ENV_FILE=".env.local"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --prod)
            ENVIRONMENTS+=("production")
            shift
            ;;
        --preview)
            ENVIRONMENTS+=("preview")
            shift
            ;;
        --dev)
            ENVIRONMENTS+=("development")
            shift
            ;;
        --all)
            ENVIRONMENTS=("production" "preview" "development")
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-sensitive)
            SKIP_SENSITIVE=true
            shift
            ;;
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --help)
            grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# //' | sed 's/^#//'
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Run with --help for usage information"
            exit 1
            ;;
    esac
done

# Default to all environments if none specified
if [ ${#ENVIRONMENTS[@]} -eq 0 ]; then
    ENVIRONMENTS=("production" "preview" "development")
fi

# Print header
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Vercel Environment Variables Setup Script         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found${NC}"
    echo ""
    echo "Please install the Vercel CLI first:"
    echo -e "  ${GREEN}npm install -g vercel${NC}"
    echo ""
    echo "Then login to your account:"
    echo -e "  ${GREEN}vercel login${NC}"
    exit 1
fi

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file not found: $ENV_FILE${NC}"
    echo ""
    echo "Please create your environment file first:"
    echo -e "  ${GREEN}cp .env.example $ENV_FILE${NC}"
    echo ""
    echo "Then edit it with your actual values."
    exit 1
fi

# Verify Vercel project is linked
if [ ! -d ".vercel" ]; then
    echo -e "${YELLOW}⚠️  No Vercel project linked${NC}"
    echo ""
    echo "Please link your Vercel project first:"
    echo -e "  ${GREEN}vercel link${NC}"
    echo ""
    read -p "Press Enter to run 'vercel link' now, or Ctrl+C to exit..."
    vercel link
    echo ""
fi

# Show configuration
echo -e "${BLUE}Configuration:${NC}"
echo -e "  Environment file: ${GREEN}$ENV_FILE${NC}"
echo -e "  Target environments: ${GREEN}${ENVIRONMENTS[*]}${NC}"
echo -e "  Dry run: ${GREEN}$DRY_RUN${NC}"
echo -e "  Skip sensitive: ${GREEN}$SKIP_SENSITIVE${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

# List of sensitive variable patterns (will prompt before adding)
SENSITIVE_VARS=(
    "*_SECRET_KEY"
    "*_API_KEY"
    "*_PRIVATE_KEY"
    "DATABASE_URL"
    "*_WEBHOOK_SECRET"
    "JWT_SECRET"
    "NEXTAUTH_SECRET"
)

# List of variables to skip (placeholders, examples, etc.)
SKIP_PATTERNS=(
    "your-*"
    "sk_test_*example*"
    "pk_test_*example*"
)

# Function to check if variable name matches sensitive pattern
is_sensitive() {
    local var_name=$1
    for pattern in "${SENSITIVE_VARS[@]}"; do
        if [[ $var_name == $pattern ]]; then
            return 0
        fi
    done
    return 1
}

# Function to check if value should be skipped
should_skip_value() {
    local value=$1
    for pattern in "${SKIP_PATTERNS[@]}"; do
        if [[ $value == $pattern ]]; then
            return 0
        fi
    done
    return 1
}

# Function to add environment variable to Vercel
add_env_var() {
    local name=$1
    local value=$2
    local env=$3

    # Skip if value is empty
    if [ -z "$value" ]; then
        echo -e "  ${YELLOW}⏭️  Skipping $name (empty value)${NC}"
        return
    fi

    # Skip if value matches skip patterns
    if should_skip_value "$value"; then
        echo -e "  ${YELLOW}⏭️  Skipping $name (placeholder value)${NC}"
        return
    fi

    # Check if sensitive and skip if flag is set
    if [ "$SKIP_SENSITIVE" = true ] && is_sensitive "$name"; then
        echo -e "  ${YELLOW}⏭️  Skipping $name (sensitive variable)${NC}"
        return
    fi

    # Truncate long values for display
    local display_value="$value"
    if [ ${#value} -gt 50 ]; then
        display_value="${value:0:47}..."
    fi

    if [ "$DRY_RUN" = true ]; then
        echo -e "  ${BLUE}[DRY RUN]${NC} Would add ${GREEN}$name${NC} to ${YELLOW}$env${NC}"
        echo -e "            Value: ${display_value}"
    else
        echo -e "  ${GREEN}➕${NC} Adding ${GREEN}$name${NC} to ${YELLOW}$env${NC}..."

        # Use echo to pipe value to vercel env add
        if echo "$value" | vercel env add "$name" "$env" &> /dev/null; then
            echo -e "     ${GREEN}✅ Added successfully${NC}"
        else
            # Variable might already exist, which is fine
            echo -e "     ${YELLOW}⚠️  Already exists or failed to add${NC}"
        fi
    fi
}

# Counter for statistics
total_vars=0
added_vars=0
skipped_vars=0

# Read and process .env.local file
echo -e "${BLUE}📋 Processing environment variables...${NC}"
echo ""

# Load the environment file and process each variable
while IFS='=' read -r name value || [ -n "$name" ]; do
    # Skip empty lines and comments
    [[ -z "$name" || "$name" =~ ^[[:space:]]*# ]] && continue

    # Remove leading/trailing whitespace
    name=$(echo "$name" | xargs)
    value=$(echo "$value" | xargs)

    # Remove quotes from value if present
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"

    total_vars=$((total_vars + 1))

    echo -e "${BLUE}Processing: ${GREEN}$name${NC}"

    # Add to each specified environment
    for env in "${ENVIRONMENTS[@]}"; do
        add_env_var "$name" "$value" "$env"
    done

    echo ""
done < "$ENV_FILE"

# Print summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      Summary                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total variables processed: ${GREEN}$total_vars${NC}"
echo -e "  Environments: ${GREEN}${ENVIRONMENTS[*]}${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}This was a dry run. No changes were made.${NC}"
    echo -e "Run without ${GREEN}--dry-run${NC} to actually add the variables."
else
    echo -e "${GREEN}✅ Environment variables have been synced to Vercel!${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Verify variables: ${GREEN}vercel env ls${NC}"
echo -e "  2. Deploy your app: ${GREEN}vercel --prod${NC}"
echo ""
echo -e "${YELLOW}💡 Tip:${NC} You can update individual variables at any time using:"
echo -e "   ${GREEN}vercel env add VARIABLE_NAME${NC}"
echo ""
