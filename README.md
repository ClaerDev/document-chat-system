# Document Chat System

<div align="center">

![Document Chat System](https://img.shields.io/badge/Document%20Chat-System-blue?style=for-the-badge)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://github.com/watat83/document-chat-system/blob/main/LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

**Production-ready, open-source platform for intelligent document management and AI conversations**

[Features](#features) •
[Quick Start](#quick-start) •
[Documentation](#documentation) •
[Contributing](#contributing) •
[License](#license)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Use Cases](#use-cases)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup Guide](#detailed-setup-guide)
- [Architecture](#architecture)
- [Using the Application](#using-the-application)
  - [Configuring Your API Keys (Settings Page)](#configuring-your-api-keys-settings-page)
  - [Uploading and Managing Documents](#uploading-and-managing-documents)
- [API Documentation](#api-documentation)
- [Monetization (Optional)](#monetization-optional)
- [Deployment](#deployment)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Document Chat System** is a full-stack, production-ready application that combines intelligent document management with AI-powered conversations. Upload documents in 10+ formats, automatically process and index them, then have natural language conversations about your content.

### Key Highlights

- **🆓 100% Free & Open Source** - MIT licensed with no restrictions
- **🤖 Multi-Provider AI** - OpenRouter (100+ models), OpenAI, ImageRouter
- **📄 10+ File Formats** - PDFs, Office documents, images, and more
- **🔍 Vector Search** - Semantic search with Pinecone or pgvector
- **👥 Multi-Tenant** - Enterprise-grade organization isolation
- **🔐 Enterprise Security** - Clerk auth, encrypted API keys, audit logs
- **💳 Optional Billing** - Built-in Stripe integration for SaaS monetization
- **🐳 Docker Ready** - Production Dockerfile included
- **⚡ Background Jobs** - Scalable processing with Inngest
- **🎨 Modern UI** - Beautiful, responsive interface with dark mode

---

## Use Cases

Document Chat System is perfect for a variety of applications and industries:

### 📚 **Knowledge Management**
- **Internal Wikis & Documentation**: Build a searchable knowledge base where teams can ask questions and get instant answers from company documentation
- **Research Libraries**: Organize and chat with research papers, technical documents, and academic materials
- **Personal Knowledge Base**: Create your own "second brain" by uploading notes, articles, and PDFs for AI-powered recall

### 👨‍💼 **Business & Enterprise**
- **Customer Support**: Train support teams by uploading product manuals, policies, and FAQs for instant AI-powered answers
- **Legal Document Analysis**: Upload contracts, agreements, and legal documents for quick reference and analysis
- **HR & Onboarding**: Create an interactive employee handbook where new hires can ask questions about policies and procedures
- **Compliance & Regulations**: Maintain regulatory documents and get instant answers about compliance requirements

### 🎓 **Education & Learning**
- **Study Assistant**: Upload textbooks, lecture notes, and course materials for AI-powered tutoring
- **Course Management**: Create interactive course materials where students can ask questions about readings
- **Research Assistant**: Organize and query research papers, journals, and academic resources

### 💼 **Professional Services**
- **Client Portal**: Provide clients with a secure portal to access and query project documents, reports, and deliverables
- **Proposal Management**: Store RFPs, proposals, and past projects for quick reference during bidding
- **Case Management**: Organize case files, evidence, and documentation with intelligent search and retrieval

### 🏥 **Healthcare & Medical**
- **Medical Literature**: Organize medical journals, research papers, and clinical guidelines for healthcare professionals
- **Patient Education**: Create an interactive resource where patients can learn about conditions and treatments
- **Clinical Documentation**: Maintain clinical protocols and treatment guidelines with AI-powered search

### 🔬 **Research & Development**
- **Lab Notebooks**: Digitize and make searchable lab notes, experiment results, and research findings
- **Patent Research**: Upload and analyze patent documents, prior art, and technical specifications
- **Literature Reviews**: Organize and query scientific papers, journals, and research publications

### 🏗️ **Real Estate & Property**
- **Property Documentation**: Manage contracts, inspection reports, and property disclosures
- **Tenant Resources**: Create a knowledge base for tenants with lease agreements, maintenance guides, and community rules
- **Development Projects**: Organize architectural plans, permits, and project documentation

### 💻 **SaaS & Startups**
- **Product Documentation**: Build an AI-powered help center where customers can ask questions about your product
- **Developer Documentation**: Create interactive API docs and technical guides
- **White-Label Solutions**: Deploy as a white-labeled document management platform for your customers

### 🌐 **Content Creation**
- **Content Library**: Organize blog posts, articles, and creative works with AI-powered search
- **Writing Assistant**: Upload research materials and reference documents for content creation
- **Media Archives**: Manage scripts, transcripts, and multimedia documentation

### 🔒 **Privacy-Focused Applications**
Thanks to client-side encryption and BYOK (Bring Your Own Key) architecture:
- **Personal Finance**: Upload financial statements and documents knowing your data stays secure
- **Confidential Projects**: Maintain sensitive business information with enterprise-grade security
- **Private Research**: Keep proprietary research and development documentation secure

---

## Features

### 📁 Document Management

- **Multi-Format Support**: PDF, DOCX, TXT, MD, images, and more formats will be supported soon
- **Intelligent Processing**: Automatic text extraction, OCR, metadata analysis
- **Folder Organization**: Hierarchical folder structure with drag-and-drop
- **Batch Operations**: Upload and process multiple files simultaneously
- **Real-Time Progress**: Live updates on document processing status
- **Version Control**: Track document versions and changes
- **File Sharing**: Secure document sharing with permission controls

### 🤖 AI-Powered Chat

- **Multiple AI Providers**:
  - **OpenRouter**: Access to 100+ models (GPT-4, Claude, Llama, Mistral, etc.)
  - **OpenAI**: Direct integration with GPT-4 Turbo and GPT-3.5
  - **ImageRouter**: Visual AI for image analysis and OCR
- **Document Context**: AI understands and references your uploaded documents
- **Source Citations**: Responses include references to source documents
- **Streaming Responses**: Real-time token streaming for faster interactions

### 🔍 Advanced Search

- **Vector Search**: Semantic search powered by Pinecone or PostgreSQL pgvector
- **Hybrid Search**: Combines semantic similarity with keyword matching
- **Full-Text Search**: Fast text search across all documents
- **Filters**: Filter by date, type, folder, tags, and more

### 👥 Multi-Tenant Architecture

- **Organization Isolation**: Complete data separation between organizations
- **Per-Org Resource Limits**: Customizable limits per organization
- **Activity Tracking**: Audit logs for compliance and security

### 🔐 Enterprise Security

- **Clerk Authentication**: OAuth, SSO, multi-factor authentication
- **Client-Side Key Encryption**: API keys are encrypted with AES-256 and stored in browser localStorage - **never sent to remote servers**
- **Settings Page Configuration**: Users configure their AI provider keys via the Settings page (`/settings`)
- **BYOK (Bring Your Own Key)**: Users manage their own AI provider keys with full control
- **Privacy-First Design**: Your API keys stay on your device, encrypted and secure
- **Audit Logging**: Comprehensive activity tracking
- **Row-Level Security**: Database-level access controls
- **GDPR & SOC2 Ready**: Compliance-ready data handling

### 📊 Usage Tracking & Analytics

- **AI Credit Tracking**: Monitor AI model usage and costs
- **Document Analytics**: Track document views, downloads, and processing
- **User Activity**: Monitor user engagement and feature adoption
- **Real-Time Dashboards**: Live metrics and visualizations
- **Usage Reports**: Export analytics data to CSV/JSON
- **Billing Integration**: Automatic usage-based billing (optional)

### ⚡ Background Processing

- **Inngest Integration**: Event-driven serverless functions
- **Document Processing Queue**: Scalable batch processing
- **Automatic Retries**: Built-in error handling and retries
- **Scheduled Jobs**: Cron-based maintenance tasks
- **Real-Time Notifications**: Progress updates via webhooks
- **Job Monitoring**: Track job status and logs

---

## Tech Stack

### Frontend

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management
- **[Framer Motion](https://www.framer.com/motion/)** - Animation library

### Backend

- **[Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)** - Serverless API endpoints
- **[Prisma ORM](https://www.prisma.io/)** - Type-safe database client
- **[PostgreSQL](https://www.postgresql.org/)** - Primary database
- **[Clerk](https://clerk.com/)** - Authentication & user management
- **[Zod](https://zod.dev/)** - Schema validation
- **[tRPC](https://trpc.io/)** - End-to-end type safety

### AI & Machine Learning

- **[OpenRouter](https://openrouter.ai/)** - Access to 100+ AI models
- **[OpenAI](https://openai.com/)** - GPT-4 Turbo and embeddings
- **[ImageRouter](https://imagerouter.com/)** - for Image Generation with over 50+ models to choose from
- **[Pinecone](https://www.pinecone.io/)** - Vector database for semantic search
- **[pgvector](https://github.com/pgvector/pgvector)** - PostgreSQL vector extension
- **[LangChain](https://www.langchain.com/)** - AI workflow orchestration

### Infrastructure

- **[Supabase](https://supabase.com/)** - File storage and database hosting
- **[Upstash Redis](https://upstash.com/)** - Serverless Redis for caching
- **[Inngest](https://www.inngest.com/)** - Background job processing
- **[Stripe](https://stripe.com/)** - Payment processing (optional)
- **[Sentry](https://sentry.io/)** - Error tracking and monitoring
- **[Docker](https://www.docker.com/)** - Containerization

---

## Prerequisites

Before you begin, ensure you have the following installed and configured:

### Required

- **Node.js 18+** and **npm 8+** ([Download](https://nodejs.org/))
- **PostgreSQL 14+** ([Download](https://www.postgresql.org/download/)) OR [Supabase account](https://supabase.com/) (free tier available)
- **Clerk account** for authentication ([Sign up free](https://clerk.com/))
- **AI Provider API key** - At least one of:
  - [OpenRouter API key](https://openrouter.ai/) (recommended - access to 100+ models)
  - [OpenAI API key](https://platform.openai.com/api-keys)
  - [ImageRouter API key](https://imagerouter.com/)

### Recommended (for full feature set)

- **Supabase account** for file storage ([Sign up free](https://supabase.com/))
- **Pinecone account** for vector search ([Sign up free](https://www.pinecone.io/))
- **Upstash Redis account** for caching ([Sign up free](https://upstash.com/))
- **Inngest account** for background jobs ([Sign up free](https://www.inngest.com/))

### Optional (for monetization)

- **Stripe account** - Only if you want to charge users ([Sign up](https://stripe.com/))

---

## Quick Start

Get up and running in 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/watat83/document-chat-system.git
cd document-chat-system

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys (see Configuration section below)

# 4. Set up the database
npx prisma generate
npx prisma db push
npm run db:seed

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Detailed Setup Guide

### Step 1: Clone and Install

```bash
git clone https://github.com/watat83/document-chat-system.git
cd document-chat-system
npm install
```

**Expected Output:**

```
added 1247 packages, and audited 1248 packages in 45s
```

### Step 2: Database Setup

You have two options: **Local PostgreSQL** or **Supabase** (cloud-hosted).

#### Option A: Local PostgreSQL

1. Install PostgreSQL 14+ on your machine
2. Create a database:
   ```bash
   createdb document_chat_db
   ```
3. Your `DATABASE_URL` will be:
   ```
   postgresql://username:password@localhost:5432/document_chat_db
   ```

#### Option B: Supabase (Recommended)

1. Create a free account at [supabase.com](https://supabase.com/)
2. Create a new project
3. Go to **Project Settings** → **Database** → **Connection String**
4. Copy the **connection pooling** URL (starts with `postgresql://`)
5. Use this as your `DATABASE_URL`

### Step 3: Clerk Authentication Setup

1. Create a free account at [clerk.com](https://clerk.com/)
2. Create a new application
3. Go to **API Keys** in the dashboard
4. Copy your keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_`)
   - `CLERK_SECRET_KEY` (starts with `sk_`)

### Step 4: Supabase File Storage Setup

1. In your Supabase project, go to **Storage**
2. Create a new bucket called `documents`
3. Set the bucket to **Private**
4. Go to **Project Settings** → **API**
5. Copy:
   - `NEXT_PUBLIC_SUPABASE_URL` (your project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (your anon/public key)

### Step 5: AI Provider Setup

Choose at least one AI provider:

#### OpenRouter (Recommended - 100+ Models)

1. Create account at [openrouter.ai](https://openrouter.ai/)
2. Go to **Keys** → **Create Key**
3. Copy your API key
4. Add to `.env.local`:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-...
   ```

#### OpenAI (Direct Access)

1. Create account at [platform.openai.com](https://platform.openai.com/)
2. Go to **API Keys** → **Create new secret key**
3. Add to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-...
   ```

#### ImageRouter (Visual AI)

1. Create account at [imagerouter.com](https://imagerouter.com/)
2. Get your API key
3. Add to `.env.local`:
   ```env
   IMAGEROUTER_API_KEY=...
   ```

### Step 6: Configure Environment Variables

Create `.env.local` file with the following:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/document_chat_db"

# Clerk Authentication (Required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Supabase File Storage (Required)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."

# AI Providers (At least one required)
OPENROUTER_API_KEY="sk-or-v1-..."  # Recommended: 100+ models
OPENAI_API_KEY="sk-..."            # Optional: Direct OpenAI access
IMAGEROUTER_API_KEY="..."          # Optional: Visual AI

# Pinecone Vector Search (Recommended)
PINECONE_API_KEY="..."
PINECONE_ENVIRONMENT="us-west1-gcp"
PINECONE_INDEX_NAME="document-embeddings"

# Upstash Redis Caching (Recommended)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Inngest Background Jobs (Recommended)
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."

# Stripe Billing (Optional - only if you want to charge users)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Encryption (Generate with: openssl rand -base64 32)
ENCRYPTION_KEY="your-32-character-encryption-key-here"
```

### Step 7: Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial data
npm run db:seed
```

**Expected Output:**

```
✅ Database schema pushed successfully
✅ Seeded 4 pricing plans
✅ Created sample organization and user
```

### Step 8: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**First-time setup:**

1. Click "Sign Up" to create an account
2. You'll be redirected to Clerk's hosted sign-up page
3. After signing up, you'll be redirected back to the app
4. Complete your profile setup
5. **Configure your API keys** (Important):
   - Navigate to **Settings** (`/settings`) in the app
   - Enter your AI provider API keys (OpenRouter, OpenAI, ImageRouter)
   - Keys are **encrypted with AES-256** and stored in your browser's localStorage
   - **Your keys never leave your device** - they are not sent to any remote server
   - This ensures maximum privacy and security for your API credentials
6. Start uploading documents and chatting with AI!

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Next.js    │  │  React 19    │  │   Zustand    │         │
│  │   Frontend   │  │  Components  │  │     Store    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Document   │  │   AI Chat    │  │    User      │         │
│  │     API      │  │     API      │  │     API      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Core Services                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Prisma     │  │  AI Service  │  │   Vector     │         │
│  │     ORM      │  │   Manager    │  │   Search     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       External Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  PostgreSQL  │  │   OpenRouter │  │   Pinecone   │         │
│  │   Database   │  │   AI Models  │  │    Vectors   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Supabase   │  │     Clerk    │  │   Inngest    │         │
│  │    Storage   │  │     Auth     │  │     Jobs     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Document Upload Flow

```
User uploads file → Supabase Storage → Document record created
                                              ↓
                                       Inngest job triggered
                                              ↓
                                     Background processing
                                              ↓
                    ┌──────────────────┬──────────────────┐
                    ↓                  ↓                  ↓
             Text extraction    Metadata analysis   Generate embeddings
                    ↓                  ↓                  ↓
                PostgreSQL         PostgreSQL         Pinecone
                    ↓                  ↓                  ↓
                    └──────────────────┴──────────────────┘
                                      ↓
                          Document ready for chat!
```

#### AI Chat Flow

```
User sends message → Retrieve relevant docs (Vector Search)
                                              ↓
                                    Build context with chunks
                                              ↓
                                    Send to AI provider
                                              ↓
                                Stream response tokens
                                              ↓
                                  Display with citations
```

### Directory Structure

```
document-chat-system/
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Database seeding
├── public/                     # Static assets
├── scripts/
│   └── seed-pricing-plans.ts   # Pricing tier configuration
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   └── v1/           # Versioned APIs
│   │   ├── documents/        # Document management pages
│   │   ├── chat/             # Chat interface pages
│   │   ├── billing/          # Billing pages (optional)
│   │   └── layout.tsx        # Root layout
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── documents/        # Document components
│   │   ├── chat/             # Chat components
│   │   ├── billing/          # Billing components
│   │   └── layout/           # Layout components
│   ├── lib/                  # Core libraries
│   │   ├── ai/              # AI service integrations
│   │   │   ├── providers/   # AI provider adapters
│   │   │   └── services/    # AI processing services
│   │   ├── inngest/         # Background job functions
│   │   ├── documents/       # Document processing
│   │   ├── file-processing/ # File type handlers
│   │   └── db.ts            # Database client
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand state stores
│   ├── types/                # TypeScript types
│   └── middleware.ts         # Next.js middleware
├── .env.example              # Environment variables template
├── .env.local               # Your configuration (git-ignored)
├── Dockerfile               # Production Docker image
├── docker-compose.yml       # Local development with Docker
├── next.config.mjs          # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

---

## Using the Application

### Configuring Your API Keys (Settings Page)

After signing up, you'll need to configure your AI provider API keys to use the chat features:

1. **Navigate to Settings**:
   - Click on your profile icon in the top navigation
   - Select **Settings** or go directly to `/settings`

2. **Add Your API Keys**:
   - Enter your OpenRouter API key (recommended - access to 100+ models)
   - Optionally add OpenAI API key for direct GPT access
   - Optionally add ImageRouter API key for visual AI capabilities

3. **How Your Keys Are Secured**:
   - **AES-256 Encryption**: All API keys are encrypted before storage
   - **Local Storage Only**: Keys are stored in your browser's localStorage
   - **Never Transmitted**: Your keys are **never sent to remote servers**
   - **Client-Side Only**: Encryption and decryption happen entirely in your browser
   - **Full Privacy**: Only you have access to your API credentials

4. **Key Benefits of This Approach**:
   - ✅ **Maximum Security**: No server-side storage means no data breach risk
   - ✅ **Full Control**: You own and manage your own API keys
   - ✅ **Cost Transparency**: You see your actual usage on your AI provider dashboard
   - ✅ **No Middleman**: Direct API calls to your chosen provider
   - ✅ **Privacy First**: Your conversations and keys stay completely private

5. **Testing Your Configuration**:
   - After adding keys, navigate to the Chat page
   - Try sending a message to verify the connection
   - Check your AI provider dashboard to confirm API calls

### Uploading and Managing Documents

1. **Upload Documents**:
   - Click **Upload** in the Documents page
   - Drag and drop files or click to browse
   - Supported formats: PDF, DOCX, TXT, MD, and more
   - Documents are automatically processed and indexed

2. **Organize with Folders**:
   - Create folders to organize your documents
   - Use drag-and-drop to move documents between folders
   - Set permissions for team collaboration

3. **Chat with Documents**:
   - Select one or more documents
   - Click **Chat** to start an AI conversation
   - AI has full context of your selected documents
   - Get answers with source citations

---

## API Documentation

### Documents API

#### Upload Document

```http
POST /api/v1/documents/upload
Content-Type: multipart/form-data
Authorization: Bearer {clerk_token}

{
  "file": File,
  "folderId": "optional_folder_id",
  "organizationId": "org_xxx"
}
```

**Response:**

```json
{
  "success": true,
  "document": {
    "id": "doc_xxx",
    "title": "example.pdf",
    "status": "PROCESSING",
    "url": "https://..."
  }
}
```

#### List Documents

```http
GET /api/v1/documents?organizationId=org_xxx&folderId=folder_xxx
Authorization: Bearer {clerk_token}
```

**Response:**

```json
{
  "documents": [
    {
      "id": "doc_xxx",
      "title": "example.pdf",
      "status": "COMPLETED",
      "createdAt": "2024-01-01T00:00:00Z",
      "processingMetadata": {
        "pages": 10,
        "wordCount": 5000
      }
    }
  ],
  "total": 42
}
```

### AI Chat API

#### Send Message

```http
POST /api/v1/ai/chat
Content-Type: application/json
Authorization: Bearer {clerk_token}

{
  "message": "What are the key points in document X?",
  "documentIds": ["doc_xxx"],
  "stream": true,
  "provider": "openrouter",
  "model": "anthropic/claude-3.5-sonnet"
}
```

**Response (streaming):**

```
data: {"type":"token","content":"The key"}
data: {"type":"token","content":" points"}
data: {"type":"token","content":" are..."}
data: {"type":"citation","documentId":"doc_xxx","page":5}
data: {"type":"done"}
```

### Full API Reference

View the complete API documentation at `/api/docs` when running the application locally.

---

## Monetization (Optional)

### For Developers Who Want to Charge Users

The platform includes **optional Stripe integration** that allows you to:

- Create subscription plans with custom pricing
- Set usage limits per plan (AI credits, document pages, seats)
- Automatically enforce limits
- Handle payments, invoices, and billing

### 💰 Customizing Pricing Tiers

It's incredibly easy to customize pricing - just edit one file and run one command!

#### Step 1: Edit the Pricing Configuration

Open `scripts/seed-pricing-plans.ts` and customize the plans:

```typescript
const plans = [
  {
    id: "starter-plan",
    planType: "STARTER",
    displayName: "Starter",
    monthlyPrice: 2900, // $29 in cents
    yearlyPrice: 29000, // $290/year (save ~17%)
    features: {
      list: [
        "3 user seats",
        "500 AI credits per month",
        "1,000 pages processed per month",
        "Priority email support",
        "All document formats",
        "Vector search",
      ],
    },
    limits: {
      seats: 3,
      savedFilters: 10,
      aiCreditsPerMonth: 500,
      pagesPerMonth: 1000,
    },
    isActive: true,
    isPopular: true,
    displayOrder: 1,
  },
  // Add more plans here...
];
```

#### Step 2: Run the Seed Command

```bash
npx tsx scripts/seed-pricing-plans.ts
```

This will:

1. ✅ Create/update plans in your database
2. ✅ Automatically sync products to Stripe
3. ✅ Create price objects in Stripe
4. ✅ Set up subscription logic

#### Step 3: Profit!

That's it! Your new pricing plans are live and Stripe is configured automatically.

### Available Limit Options

You can customize these limits for each plan:

- `seats`: Number of user seats per organization
- `documentsPerMonth`: Documents that can be uploaded per month
- `aiCreditsPerMonth`: AI API usage quota
- `storageGB`: File storage quota in gigabytes
- `apiCallsPerMonth`: API rate limits

### Disabling Billing Completely

Don't want to charge users? Simply:

1. Remove Stripe keys from `.env.local`
2. Set `DISABLE_BILLING=true` in environment variables
3. The app will work perfectly without any billing features

---

## Deployment

This guide covers deploying your Document Chat System to production, including configuration for all services (Database, Authentication, File Storage, AI Providers, and Background Jobs).

---

### Pre-Deployment Checklist

Before deploying, ensure you have:

- ✅ PostgreSQL database (Supabase recommended for free hosting)
- ✅ Clerk account with production keys
- ✅ Supabase project for file storage
- ✅ AI provider API keys (OpenRouter/OpenAI/ImageRouter)
- ✅ Inngest account for background jobs
- ✅ (Optional) Pinecone for vector search
- ✅ (Optional) Upstash Redis for caching
- ✅ (Optional) Stripe for billing

---

### Step 1: Prepare Production Environment Variables

Create a production `.env` file with these values:

```env
# ============================================
# REQUIRED: Core Configuration
# ============================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-actual-domain.com  # ⚠️ Update with your real domain

# ============================================
# REQUIRED: Database
# ============================================
DATABASE_URL="postgresql://user:password@host:5432/dbname"
# Get from Supabase: Project Settings → Database → Connection String → URI

# ============================================
# REQUIRED: Authentication (Clerk)
# ============================================
# ⚠️ Use PRODUCTION keys (pk_live_... and sk_live_...)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxxxx"
CLERK_SECRET_KEY="sk_live_xxxxx"
# Get from: https://dashboard.clerk.com → Your App → API Keys → Production

# ============================================
# REQUIRED: File Storage (Supabase)
# ============================================
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# Get from: Supabase Project → Settings → API

# ============================================
# REQUIRED: AI Providers (At least one)
# ============================================
# Option 1: OpenRouter (Recommended - 100+ models)
OPENROUTER_API_KEY="sk-or-v1-xxxxx"
# Get from: https://openrouter.ai/keys

# Option 2: OpenAI (Direct access)
OPENAI_API_KEY="sk-xxxxx"
# Get from: https://platform.openai.com/api-keys

# Option 3: ImageRouter (Visual AI)
IMAGEROUTER_API_KEY="xxxxx"
# Get from: https://imagerouter.com/

# ============================================
# REQUIRED: Inngest Background Jobs
# ============================================
INNGEST_EVENT_KEY="your-inngest-event-key"
# Get from: Inngest Dashboard → Your App → Keys → Event Key

INNGEST_SIGNING_KEY="signkey_prod_xxxxx"
# Get from: Inngest Dashboard → Your App → Keys → Signing Key

# ⚠️ IMPORTANT: See "Step 4: Configure Inngest" below for complete setup

# ============================================
# REQUIRED: Security
# ============================================
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY="your-secure-32-char-encryption-key-here"

# ============================================
# RECOMMENDED: Vector Search (Pinecone)
# ============================================
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="us-west1-gcp"
PINECONE_INDEX_NAME="document-embeddings"
# Get from: https://app.pinecone.io/ → API Keys

# ============================================
# RECOMMENDED: Caching (Upstash Redis)
# ============================================
UPSTASH_REDIS_REST_URL="https://xxxxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxxxx"
# Get from: https://console.upstash.com/ → Your Redis → REST API

# ============================================
# OPTIONAL: Billing (Stripe)
# ============================================
# ⚠️ Use PRODUCTION keys (sk_live_... and pk_live_...)
STRIPE_SECRET_KEY="sk_live_xxxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
# Get from: https://dashboard.stripe.com/apikeys

# To disable billing entirely:
# DISABLE_BILLING=true
```

---

### Step 2: Choose Your Deployment Platform

#### Option A: Vercel (Recommended - Easiest)

**1. Install Vercel CLI:**

```bash
npm install -g vercel
```

**2. Login to Vercel:**

```bash
vercel login
```

**3. Deploy:**

```bash
# From your project directory
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (Select your account)
# - Link to existing project? No
# - Project name? document-chat-system
# - Directory? ./
# - Override settings? No
```

**4. Add Environment Variables:**

```bash
# Option 1: Via CLI
vercel env add NEXT_PUBLIC_APP_URL
# Enter: https://your-app.vercel.app
# Select: Production

# Repeat for all environment variables...

# Option 2: Via Dashboard (Easier)
# 1. Go to: https://vercel.com/your-username/document-chat-system
# 2. Click "Settings" → "Environment Variables"
# 3. Add all variables from your .env file
# 4. Select "Production" for each
```

**5. Configure Clerk Redirect URLs:**

```bash
# In Clerk Dashboard:
# 1. Go to: https://dashboard.clerk.com
# 2. Select your app → "Paths"
# 3. Add these URLs:
#    - Sign-in URL: https://your-app.vercel.app/sign-in
#    - Sign-up URL: https://your-app.vercel.app/sign-up
#    - After sign-in: https://your-app.vercel.app/documents
#    - After sign-up: https://your-app.vercel.app/documents
```

**6. Redeploy with Environment Variables:**

```bash
vercel --prod
```

**7. Your app is live at:** `https://your-app.vercel.app`

---

#### Option B: Railway

**1. Install Railway CLI:**

```bash
npm install -g @railway/cli
```

**2. Login:**

```bash
railway login
```

**3. Initialize Project:**

```bash
railway init
# Project name: document-chat-system
```

**4. Add Environment Variables:**

```bash
# Add all variables from your .env file
railway variables set NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
railway variables set DATABASE_URL="postgresql://..."
railway variables set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
# ... repeat for all variables
```

**5. Deploy:**

```bash
railway up
```

**6. Get your URL:**

```bash
railway domain
# Your app: https://your-app.up.railway.app
```

---

#### Option C: Render

**1. Create New Web Service:**

- Go to: https://dashboard.render.com/
- Click "New" → "Web Service"
- Connect your GitHub repository

**2. Configure Service:**

```yaml
Name: document-chat-system
Environment: Node
Region: (Choose closest to users)
Branch: main
Build Command: npm install && npm run build
Start Command: npm start
```

**3. Add Environment Variables:**

- Click "Environment" tab
- Add all variables from your .env file
- Click "Save Changes"

**4. Deploy:**

- Click "Create Web Service"
- Wait for deployment (~5-10 minutes)

**5. Your app is live at:** `https://your-app.onrender.com`

---

#### Option D: Docker (Self-Hosted)

**For AWS, GCP, Azure, DigitalOcean, or any VPS:**

**1. Install Docker on Server:**

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

**2. Clone Repository:**

```bash
git clone https://github.com/watat83/document-chat-system.git
cd document-chat-system
```

**3. Create Production Environment File:**

```bash
cp .env.example .env.production
nano .env.production
# Add all production environment variables
```

**4. Build Docker Image:**

```bash
docker build -t document-chat-system .
```

**5. Run Container:**

```bash
docker run -d \
  --name document-chat-system \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  document-chat-system
```

**6. Set Up Reverse Proxy (Nginx):**

```bash
# Install Nginx
sudo apt update && sudo apt install nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/document-chat-system
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and start:

```bash
sudo ln -s /etc/nginx/sites-available/document-chat-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

### Step 3: Configure Clerk for Production

**1. Update Redirect URLs in Clerk Dashboard:**

Go to: [Clerk Dashboard](https://dashboard.clerk.com) → Your App → "Paths"

Add these URLs (replace with your actual domain):

```
Sign-in URL: https://your-domain.com/sign-in
Sign-up URL: https://your-domain.com/sign-up
After sign-in: https://your-domain.com/documents
After sign-up: https://your-domain.com/documents
Home URL: https://your-domain.com
```

**2. Add Allowed Origins:**

Go to: "Settings" → "Advanced" → "Allowed origins"

```
https://your-domain.com
```

**3. Switch to Production Keys:**

Make sure you're using **Production** API keys (not Test keys):

- `pk_live_...` (not `pk_test_...`)
- `sk_live_...` (not `sk_test_...`)

---

### Step 4: Configure Inngest for Background Jobs

**⚠️ CRITICAL: Without this, document processing will not work!**

Inngest handles all background jobs (document processing, vectorization, AI analysis). Follow these steps carefully:

#### Understanding Inngest in Production

In production, Inngest Cloud needs to:

1. **Discover your functions** by calling your `/api/inngest` endpoint
2. **Execute functions** when events are triggered
3. **Monitor and retry** failed jobs automatically

---

#### Step 4.1: Get Your Inngest Keys

1. **Go to Inngest Dashboard:** [app.inngest.com](https://app.inngest.com)
2. **Sign in** or create a free account
3. **Select your app** (or create one named "document-chat-system")
4. **Go to "Keys" section**
5. **Copy these two keys:**
   - **Event Key**: Used to send events TO Inngest (format: `inngest_event_key_xxx`)
   - **Signing Key**: Used to verify requests FROM Inngest (format: `signkey_prod_xxx`)

---

#### Step 4.2: Add Keys to Your Environment

In your deployment platform (Vercel/Railway/Render/Docker), add:

```env
INNGEST_EVENT_KEY="your-event-key-from-step-4.1"
INNGEST_SIGNING_KEY="signkey_prod_from-step-4.1"
```

**Redeploy** your app after adding these variables.

---

#### Step 4.3: Sync Your Functions with Inngest

After deployment, you need to tell Inngest about your app:

1. **Go to Inngest Dashboard:** [app.inngest.com](https://app.inngest.com)
2. **Select your app**
3. **Click "Apps" tab** in the sidebar
4. **Click "Sync" or "Create App Sync"**
5. **Enter your deployed app URL:**

   ```
   https://your-actual-domain.com/api/inngest
   ```

   **Important:** Must be the full URL with `/api/inngest` endpoint

6. **Click "Sync Now"**

**What happens:**

- Inngest makes a GET request to your app
- Your app returns a list of all available functions
- Inngest registers these functions

**You should see 7 functions appear:**

- ✅ `process-document-basic` - Extract text from documents
- ✅ `process-document-full` - Complete document analysis
- ✅ `vectorize-document` - Create embeddings for search
- ✅ `score-document` - Calculate document scores
- ✅ `batch-process-documents` - Process multiple documents
- ✅ `analyze-document` - AI-powered analysis
- ✅ `cancel-document-processing` - Cancel running jobs

---

#### Step 4.4: Verify Inngest Integration

**Test the integration:**

1. **Upload a document** in your deployed app
2. **Go to Inngest Dashboard** → "Runs" tab
3. **You should see:**
   - Event: `document/process-basic.requested`
   - Status: Running or Completed
   - Duration: ~2-10 seconds
   - Result: Success

**If you DON'T see any runs:**

- ❌ Check that `INNGEST_EVENT_KEY` is set correctly
- ❌ Verify you synced functions in Step 4.3
- ❌ Check browser console for errors
- ❌ Verify app URL is correct and publicly accessible

---

#### Step 4.5: How Inngest Works in Production

**Event Flow:**

```
1. User uploads document
   ↓
2. Your app sends event to Inngest Cloud:
   inngest.send({ name: "document/process-basic.requested", ... })
   ↓
3. Inngest Cloud receives event
   ↓
4. Inngest makes POST request to your app:
   POST https://your-domain.com/api/inngest
   ↓
5. Your app processes document and returns result
   ↓
6. Inngest logs completion in dashboard
```

**Security:**

- All requests from Inngest are signed with `INNGEST_SIGNING_KEY`
- Your app automatically verifies the signature
- Only Inngest can trigger your functions

---

#### Troubleshooting Inngest

**Problem:** Functions not showing up after sync

**Solution:**

1. Verify `/api/inngest` endpoint is publicly accessible:
   ```bash
   curl https://your-domain.com/api/inngest
   # Should return JSON with function definitions
   ```
2. Check `INNGEST_SIGNING_KEY` is set in environment variables
3. Re-sync in Inngest Dashboard

**Problem:** Events sent but functions not executing

**Solution:**

1. Check Inngest Dashboard → "Runs" → Look for errors
2. Verify `NEXT_PUBLIC_APP_URL` matches your actual domain
3. Check app logs for errors
4. Ensure app is not behind authentication that blocks Inngest

**Problem:** "Function execution failed" errors

**Solution:**

1. Check app logs for detailed error messages
2. Verify all required environment variables are set (database, AI keys, etc.)
3. Test locally first with Inngest Dev Server

---

### Step 5: Set Up Stripe Webhooks (Optional - Only if Using Billing)

If you're using Stripe for billing:

**1. Configure Webhook in Stripe Dashboard:**

- Go to: [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
- Click "Add endpoint"
- URL: `https://your-domain.com/api/v1/webhooks/stripe`
- Events to send:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

**2. Get Webhook Secret:**

- After creating webhook, copy the "Signing secret" (starts with `whsec_...`)
- Add to environment variables:
  ```env
  STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
  ```

**3. Redeploy your app**

---

### Step 6: Initialize Database

After deployment, initialize your database:

```bash
# If using Vercel
vercel env pull .env.local
npx prisma generate
npx prisma db push
npm run db:seed

# If using Railway
railway run npx prisma generate
railway run npx prisma db push
railway run npm run db:seed

# If using Docker
docker exec -it document-chat-system npx prisma generate
docker exec -it document-chat-system npx prisma db push
docker exec -it document-chat-system npm run db:seed
```

---

### Step 7: Post-Deployment Verification

**Verify everything is working:**

1. ✅ **App loads:** Visit `https://your-domain.com`
2. ✅ **Sign up works:** Create a new account
3. ✅ **Authentication works:** Sign in with your account
4. ✅ **Upload works:** Upload a test document
5. ✅ **Processing works:** Check Inngest Dashboard for successful runs
6. ✅ **Chat works:** Try chatting with a document
7. ✅ **Settings work:** Configure API keys in Settings page

---

### Step 8: Configure Custom Domain (Optional)

#### Vercel:

```bash
vercel domains add your-custom-domain.com
# Follow DNS instructions to add CNAME record
```

#### Railway:

1. Go to Railway Dashboard → Your Project → Settings
2. Click "Custom Domain"
3. Add your domain and follow DNS instructions

#### Render:

1. Go to Dashboard → Your Service → Settings
2. Click "Custom Domain"
3. Add your domain and follow DNS instructions

---

### Production Monitoring

**Monitor your app with:**

1. **Inngest Dashboard:** [app.inngest.com](https://app.inngest.com)
   - View function execution metrics
   - Monitor failed jobs
   - Track processing times

2. **Vercel Analytics:** (if using Vercel)
   - Real-time traffic
   - Performance metrics
   - Error tracking

3. **Supabase Dashboard:**
   - Database performance
   - API usage
   - Storage usage

4. **Clerk Dashboard:**
   - User registrations
   - Authentication metrics
   - Active sessions

5. **Stripe Dashboard:** (if using billing)
   - Revenue tracking
   - Subscription metrics
   - Payment failures

---

### Scaling Considerations

**As your app grows:**

1. **Database:**
   - Upgrade Supabase plan for more connections
   - Enable connection pooling
   - Add database indexes for common queries

2. **Background Jobs:**
   - Inngest auto-scales automatically
   - No configuration needed

3. **File Storage:**
   - Supabase storage auto-scales
   - Consider CDN for faster file delivery

4. **Vercel/Railway:**
   - Auto-scales with traffic
   - Upgrade plan for higher limits

---

### Security Checklist

Before going live:

- ✅ Use production API keys (not test keys)
- ✅ Enable HTTPS (automatic on Vercel/Railway/Render)
- ✅ Set strong `ENCRYPTION_KEY` (32+ characters)
- ✅ Enable Clerk MFA for admin accounts
- ✅ Set up Stripe webhook signature verification
- ✅ Configure CORS if using custom domain
- ✅ Review and limit database permissions
- ✅ Enable rate limiting (built-in with Next.js)
- ✅ Set up monitoring and alerts
- ✅ Regular backups of database (Supabase auto-backups)

---

### Deployment Costs (Estimated Monthly)

**Free Tier (Fully Functional):**

- Vercel: Free (Hobby plan)
- Supabase: Free (2 projects, 500MB database, 1GB storage)
- Clerk: Free (10,000 monthly active users)
- Inngest: Free (5,000 function runs/month)
- **Total: $0/month** ✨

**Production Tier (Recommended):**

- Vercel: $20/month (Pro plan)
- Supabase: $25/month (Pro plan)
- Clerk: $25/month (Pro plan)
- Inngest: $20/month (Pro plan)
- Pinecone: $70/month (Standard plan)
- **Total: ~$160/month**

**Enterprise Tier:**

- Custom pricing based on usage
- Contact providers for quotes

---

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checks

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:studio        # Open Prisma Studio (GUI)
npm run db:seed          # Seed database with sample data
npm run db:reset         # Reset database (⚠️ deletes all data)

# Background Jobs
npx inngest-cli dev      # Run Inngest dev server (http://localhost:8288)

# Pricing
npx tsx scripts/seed-pricing-plans.ts  # Update pricing tiers
```

### Code Style

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting (coming soon)
- **TypeScript strict mode** for type safety

Run before committing:

```bash
npm run lint
npm run type-check
```

### Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## Troubleshooting

### Common Issues

#### Database Connection Issues

**Problem:** `Can't reach database server`

**Solution:**

1. Make sure PostgreSQL is running: `pg_isready`
2. Check your `DATABASE_URL` in `.env.local`
3. Verify network connectivity if using Supabase

#### Prisma Issues

**Problem:** `Prisma Client not generated`

**Solution:**

```bash
npx prisma generate
npm run dev
```

#### Build Errors

**Problem:** `Module not found` or type errors

**Solution:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### File Upload Failures

**Problem:** Files not uploading or processing

**Solution:**

1. Check Supabase bucket permissions (should be private)
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Check file size limits in Supabase settings
4. Monitor Inngest jobs at `http://localhost:8288` (in development)

#### AI Chat Not Working

**Problem:** Chat responses failing or empty

**Solution:**

1. Verify you have at least one AI provider API key configured
2. Check API key permissions and billing status
3. Monitor browser console for errors
4. Check that documents are fully processed (status: COMPLETED)

#### Vector Search Issues

**Problem:** Semantic search not finding relevant documents

**Solution:**

1. Ensure Pinecone index is created and configured
2. Check that embeddings are being generated (inspect document metadata)
3. Verify `PINECONE_INDEX_NAME` matches your Pinecone dashboard
4. Try hybrid search as a fallback

### Getting Help

- **Documentation**: [GitHub Wiki](https://github.com/watat83/document-chat-system/wiki)
- **Issues**: [GitHub Issues](https://github.com/watat83/document-chat-system/issues)
- **Discussions**: [GitHub Discussions](https://github.com/watat83/document-chat-system/discussions)

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Quick Start for Contributors

```bash
# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_USERNAME/document-chat-system.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes
# ...

# Run tests and linting
npm run lint
npm run type-check
npm test

# Commit with conventional commits
git commit -m "feat: add amazing feature"

# Push to your fork
git push origin feature/amazing-feature

# Open a Pull Request
```

### Development Guidelines

- Write tests for new features
- Follow existing code style
- Update documentation
- Use conventional commits
- Keep PRs focused and small

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What this means:

✅ Commercial use allowed  
✅ Modification allowed  
✅ Distribution allowed  
✅ Private use allowed  
❌ No liability  
❌ No warranty

---

## Acknowledgments

Built with amazing open-source technologies:

- [Next.js](https://nextjs.org/) - The React Framework
- [Clerk](https://clerk.com/) - Authentication Made Simple
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Radix UI](https://www.radix-ui.com/) - Accessible Components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-First CSS
- [Supabase](https://supabase.com/) - Open Source Firebase Alternative
- [Inngest](https://www.inngest.com/) - Durable Workflows
- [Pinecone](https://www.pinecone.io/) - Vector Database
- [OpenRouter](https://openrouter.ai/) - Unified AI API

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ by the open source community

[Report Bug](https://github.com/watat83/document-chat-system/issues) •
[Request Feature](https://github.com/watat83/document-chat-system/issues) •
[View Demo](https://document-chat-demo.vercel.app)

</div>
