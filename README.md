# Document Chat System - AI-Powered Document Analysis & Intelligent Conversations

<div align="center">

![Document Chat System](https://img.shields.io/badge/Document%20Chat-System-blue?style=for-the-badge)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://github.com/watat83/document-chat-system/blob/main/LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

**Transform documents into intelligent conversations with AI. Open-source document chat platform with semantic search, RAG (Retrieval Augmented Generation), and multi-provider AI support (OpenRouter, OpenAI, Anthropic).**

> 🚀 **Production-ready** • 🔍 **Semantic search with vector embeddings** • 💬 **Natural language Q&A** • 📄 **Multi-format support** • 🎨 **Beautiful modern UI** • 🔐 **Enterprise security**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwatat83%2Fdocument-chat-system&env=DATABASE_URL,NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,CLERK_SECRET_KEY,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,INNGEST_EVENT_KEY,INNGEST_SIGNING_KEY&envDescription=Required%20environment%20variables%20for%20Document%20Chat%20System&envLink=https%3A%2F%2Fgithub.com%2Fwatat83%2Fdocument-chat-system%2Fblob%2Fmain%2F.env.example&project-name=document-chat-system&repository-name=document-chat-system)

[![Join our Discord](https://img.shields.io/badge/Discord-Join%20Community-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/ubWcC2PS)

[Features](#features) •
[Quick Start](#quick-start) •
[Documentation](#documentation) •
[Contributing](#contributing) •
[License](#license) •
[Discord](#community)

---

## 🎥 Demo & Walkthrough

<div align="center">

[![Document Chat System Demo](https://img.youtube.com/vi/P42nlCmicVM/maxresdefault.jpg)](https://www.youtube.com/watch?v=P42nlCmicVM)

*Click the thumbnail above to watch the complete walkthrough - from document upload to AI-powered conversations*

</div>

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

**Document Chat System** is a full-stack, production-ready application that combines intelligent document management with AI-powered conversations. Upload documents in multiple formats, automatically process and index them, then have natural language conversations about your content using advanced AI models.

### Key Features

- **🆓 100% Free & Open Source** - MIT licensed. Deploy your own instance, modify as needed, or monetize as a SaaS.
- **🤖 Multi-Provider AI** - Supports OpenRouter (100+ models), OpenAI, Anthropic, and ImageRouter. Uses gpt-4o-mini by default for cost-effective responses.
- **📄 Full Document Support** - PDFs, DOCX, TXT, images with OCR, and more. Automatic text extraction and intelligent processing.
- **🔍 Semantic Search** - Vector search with Pinecone or pgvector finds relevant content beyond simple keyword matching.
- **👥 Multi-Tenant Ready** - Built-in organization isolation with complete data separation between users/organizations.
- **💳 Optional SaaS Billing** - Integrated Stripe billing system with customizable pricing plans for monetization.
- **⚡ Background Processing** - Inngest handles document processing, vectorization, and AI analysis asynchronously.
- **🎨 Modern UI** - Beautiful, responsive interface with dark mode built using shadcn/ui and Tailwind CSS.
- **🔐 Enterprise Security** - AES-256 encryption, Row-Level Security (RLS), and Clerk authentication.
- **🐳 Production Ready** - Dockerfile included, deploy to Vercel/Railway/Render in minutes with one-click setup.

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
Thanks to enterprise-grade security with encryption and authentication:
- **Personal Finance**: Upload financial statements and documents knowing your data stays secure
- **Confidential Projects**: Maintain sensitive business information with Row-Level Security (RLS)
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

### ⚡ Background Processing

- **Inngest Integration**: Event-driven serverless functions
- **Document Processing Queue**: Scalable batch processing
- **Automatic Retries**: Built-in error handling and retries
- **Real-Time Notifications**: Progress updates via webhooks
- **Job Monitoring**: Track job status and logs

---

## Tech Stack

### Frontend

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Re-usable components built with Radix UI
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management
- **[Framer Motion](https://www.framer.com/motion/)** - Animation library
- **[React PDF](https://react-pdf.org/)** - PDF rendering
- **[Lexical](https://lexical.dev/)** - Rich text editor framework

### Backend

- **[Next.js 15 API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)** - Serverless API endpoints
- **[Prisma ORM](https://www.prisma.io/)** - Type-safe database client with PostgreSQL
- **[PostgreSQL 14+](https://www.postgresql.org/)** - Primary database
- **[Clerk](https://clerk.com/)** - Authentication & user management
- **[Zod](https://zod.dev/)** - Runtime schema validation
- **[Inngest](https://www.inngest.com/)** - Background job processing & workflows

### AI & Machine Learning

- **[OpenRouter](https://openrouter.ai/)** - Unified access to 100+ AI models (GPT-4, Claude, Llama, Mistral, etc.)
- **[OpenAI](https://openai.com/)** - Direct GPT-4 Turbo integration and text embeddings
- **[ImageRouter](https://imagerouter.com/)** - Image generation with 50+ models
- **[Pinecone](https://www.pinecone.io/)** - Vector database for semantic search
- **[pgvector](https://github.com/pgvector/pgvector)** - PostgreSQL vector extension (alternative to Pinecone)

### File Processing

- **[pdf-parse](https://www.npmjs.com/package/pdf-parse)** - PDF text extraction
- **[mammoth](https://www.npmjs.com/package/mammoth)** - DOCX to HTML conversion
- **[Sharp](https://sharp.pixelplumbing.com/)** - Image processing and optimization

### Infrastructure & Services

- **[Supabase](https://supabase.com/)** - File storage and PostgreSQL database hosting
- **[Upstash Redis](https://upstash.com/)** - Serverless Redis for caching (optional)
- **[Stripe](https://stripe.com/)** - Payment processing and subscription management (optional)
- **[Docker](https://www.docker.com/)** - Containerization for deployment
- **[Vercel](https://vercel.com/)** - Recommended deployment platform

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

**Ready to deploy?** Use our automated Vercel deployment script:
```bash
./scripts/setup-vercel.sh --all && vercel --prod
```
See the [Deployment](#deployment) section for details.

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
│   ├── migrations/             # Database migration history
│   ├── schema.prisma           # Database schema with all models
│   ├── seed.ts                 # Database seeding script
│   └── rls-policies.sql        # Row-level security policies
├── public/                     # Static assets (images, fonts, etc.)
├── scripts/
│   ├── README.md               # Scripts documentation
│   └── setup-vercel.sh         # Automated Vercel deployment script
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── api/               # API routes
│   │   │   ├── ai/           # AI-related endpoints
│   │   │   ├── inngest/      # Inngest webhook endpoint
│   │   │   └── v1/           # Versioned REST APIs
│   │   ├── billing/          # Billing & subscription pages
│   │   ├── chat/             # AI chat interface
│   │   ├── dashboard/        # Main dashboard & analytics
│   │   ├── documents/        # Document management UI
│   │   ├── logs/             # Audit logs viewer
│   │   ├── profile/          # User profile pages
│   │   ├── sign-in/          # Authentication pages
│   │   ├── sign-up/          # Registration pages
│   │   ├── layout.tsx        # Root layout with providers
│   │   └── page.tsx          # Landing page
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── documents/        # Document-specific components
│   │   ├── chat/             # Chat UI components
│   │   ├── billing/          # Billing UI components
│   │   ├── ai/               # AI configuration components
│   │   ├── layout/           # Layout components
│   │   └── profile/          # Profile management components
│   ├── lib/                  # Core library code
│   │   ├── ai/              # AI service integrations
│   │   │   ├── providers/   # OpenRouter, OpenAI, ImageRouter adapters
│   │   │   ├── services/    # AI processing & routing services
│   │   │   ├── monitoring/  # AI usage tracking & metrics
│   │   │   ├── config/      # AI configuration management
│   │   │   └── __tests__/   # AI service tests
│   │   ├── inngest/         # Background job processing
│   │   │   └── functions/   # Inngest function definitions
│   │   ├── documents/       # Document management logic
│   │   ├── file-processing/ # File type handlers (PDF, DOCX, etc.)
│   │   ├── audit/           # Audit logging system
│   │   ├── auth/            # Authentication utilities
│   │   ├── cache/           # Caching layer (Redis)
│   │   ├── config/          # Environment configuration
│   │   ├── db/              # Database utilities
│   │   ├── errors/          # Error handling framework
│   │   ├── storage/         # File storage (Supabase)
│   │   ├── supabase/        # Supabase client setup
│   │   └── validation/      # Input validation schemas
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand state management
│   ├── contexts/             # React context providers
│   ├── types/                # TypeScript type definitions
│   ├── data/                 # Static data files
│   ├── styles/               # Global styles
│   └── middleware.ts         # Next.js middleware (auth, CORS)
├── .env.example              # Environment variables template
├── .env.local               # Your local config (git-ignored)
├── .gitignore               # Git ignore rules
├── Dockerfile               # Production Docker image
├── docker-compose.yml       # Local development setup
├── next.config.mjs          # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies and npm scripts
└── README.md                # This file
```

---

## Using the Application

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

<!-- ## Monetization (Optional)

### For Developers Who Want to Charge Users

The platform includes **optional Stripe integration** that allows you to:

- Create subscription plans with custom pricing
- Set usage limits per plan (AI credits, document pages, seats)
- Automatically enforce limits
- Handle payments, invoices, and billing

### 💰 Customizing Pricing Tiers

Pricing plans are stored in the database and can be managed through the admin API or directly in the database.

#### Creating/Updating Pricing Plans

You can create pricing plans by inserting them into the `PricingPlan` table in your database. Here's an example plan configuration:

```typescript
// Example pricing plan structure
{
  planType: "STARTER",           // Unique identifier (STARTER, PROFESSIONAL, AGENCY, ENTERPRISE)
  displayName: "Starter",        // Display name shown to users
  description: "Perfect for individuals and small teams",
  monthlyPrice: 2900,            // Price in cents ($29.00)
  yearlyPrice: 29000,            // Yearly price in cents ($290.00, ~17% discount)
  currency: "usd",               // Currency code

  // Features array (displayed on pricing page)
  features: [
    "3 user seats",
    "500 AI credits per month",
    "1,000 documents per month",
    "10 GB storage",
    "Priority email support",
    "All document formats",
    "Vector search & semantic indexing",
    "Basic API access",
  ],

  // Usage limits (enforced by the application)
  limits: {
    seats: 3,                     // Number of users per organization
    documentsPerMonth: 1000,      // Documents that can be uploaded monthly
    aiCreditsPerMonth: 500,       // AI API usage credits
    storageGB: 10,                // File storage limit in gigabytes
    apiCallsPerMonth: 10000,      // API rate limit per month
    maxFileSize: 50,              // Max file size in MB
    folders: 50,                  // Number of folders allowed
    chatHistory: 100,             // Chat conversation history limit
  },

  // Display settings
  isActive: true,                 // Show in pricing table
  isPopular: true,                // Display "Most Popular" badge
  displayOrder: 1,                // Order in pricing table (lower = first)
}
```

#### Managing Plans via Database

**Option 1: Direct Database Insert**

```sql
INSERT INTO "PricingPlan" (
  id, "planType", "displayName", description,
  "monthlyPrice", "yearlyPrice", currency,
  features, limits,
  "isActive", "isPopular", "displayOrder"
) VALUES (
  'cuid_here',
  'STARTER',
  'Starter',
  'Perfect for individuals and small teams',
  2900,
  29000,
  'usd',
  '["3 user seats", "500 AI credits/month", "1,000 documents/month"]'::jsonb,
  '{"seats": 3, "documentsPerMonth": 1000, "aiCreditsPerMonth": 500}'::jsonb,
  true,
  true,
  1
);
```

**Option 2: Admin API Endpoint**

```bash
# Create/update pricing plan via API
curl -X POST http://localhost:3000/api/v1/admin/pricing-plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "planType": "STARTER",
    "displayName": "Starter",
    "monthlyPrice": 2900,
    "features": [...],
    "limits": {...}
  }'
```

**Option 3: Using Prisma Client**

```typescript
// In your seed script or admin tool
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

await prisma.pricingPlan.create({
  data: {
    planType: 'STARTER',
    displayName: 'Starter',
    description: 'Perfect for individuals and small teams',
    monthlyPrice: 2900,
    yearlyPrice: 29000,
    currency: 'usd',
    features: [...],
    limits: {...},
    isActive: true,
    isPopular: true,
    displayOrder: 1,
  }
})
```

### Available Limit Options

You can customize these limits for each plan:

| Limit | Description | Example Values |
|-------|-------------|----------------|
| `seats` | Number of user seats per organization | 3, 10, 50, unlimited |
| `documentsPerMonth` | Documents that can be uploaded monthly | 100, 1000, 10000 |
| `aiCreditsPerMonth` | AI API usage quota (tokens/requests) | 500, 5000, 50000 |
| `storageGB` | File storage quota in gigabytes | 10, 50, 500 |
| `apiCallsPerMonth` | API rate limits per month | 1000, 10000, 100000 |
| `maxFileSize` | Maximum file size in MB | 10, 50, 200 |
| `folders` | Number of folders allowed | 10, 100, unlimited |
| `chatHistory` | Chat conversation history retention | 50, 500, unlimited |

These limits are automatically enforced throughout the application via usage tracking middleware.

### Disabling Billing Completely

Don't want to charge users? Simply:

1. Remove Stripe keys from `.env.local`
2. Set `DISABLE_BILLING=true` in environment variables
3. The app will work perfectly without any billing features

-->

---

## Deployment

This guide covers deploying your Document Chat System to production. We provide an **automated Vercel deployment script** that syncs all environment variables in one command.

### 🚀 Quick Deploy to Vercel

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Link your project
vercel link

# 4. Sync all environment variables (automated!)
./scripts/setup-vercel.sh --all

# 5. Deploy to production
vercel --prod
```

**That's it!** The automated script reads your `.env.local` file and syncs all variables to Vercel. See [scripts/setup-vercel.sh](scripts/setup-vercel.sh) for advanced options like `--dry-run`, `--prod`, `--preview`, etc.

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

We've provided an automated script to sync your environment variables to Vercel:

```bash
# Option 1: Automated Script (Recommended)
./scripts/setup-vercel.sh --all

# This will:
# - Read your .env.local file
# - Add all variables to Vercel (production, preview, development)
# - Skip placeholder values automatically
# - Handle sensitive variables securely

# For production only:
./scripts/setup-vercel.sh --prod

# To preview what would be added without making changes:
./scripts/setup-vercel.sh --dry-run

# See all options:
./scripts/setup-vercel.sh --help
```

```bash
# Option 2: Manual CLI (Alternative)
vercel env add NEXT_PUBLIC_APP_URL
# Enter: https://your-app.vercel.app
# Select: Production

# Repeat for all environment variables...
```

```bash
# Option 3: Via Dashboard (Alternative)
# 1. Go to: https://vercel.com/your-username/document-chat-system
# 2. Click "Settings" → "Environment Variables"
# 3. Add all variables from your .env.local file
# 4. Select appropriate environments for each
```

📖 **For detailed deployment instructions, see [scripts/README.md](scripts/README.md)**

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

## Community

Join our growing community of developers and users!

[![Discord](https://img.shields.io/badge/Discord-Join%20Chat-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/ubWcC2PS)

- 💬 **Discord**: Get help, share ideas, and connect with other users
- 🐛 **GitHub Issues**: Report bugs and request features
- 🌟 **GitHub Discussions**: Ask questions and share your projects
- 🐦 **Twitter/X**: Follow [@watat83](https://twitter.com/watat83) for updates

We're building something great together. Your feedback and contributions make this project better for everyone!

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
