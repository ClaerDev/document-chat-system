import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LandingPageClient } from '@/components/landing-page-client'
import type { Metadata } from 'next'

// Cache the landing page for 5 minutes
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Document Chat - AI-Powered Document Analysis & Intelligent Chat',
  description: 'Transform your documents into intelligent conversations. Upload PDFs, Word documents, images, and more. Chat with AI, extract insights, and analyze content with advanced semantic search powered by OpenRouter, OpenAI, and Anthropic.',
  keywords: [
    'document chat',
    'AI document analysis',
    'PDF chat',
    'document AI',
    'semantic search',
    'intelligent document processing',
    'OpenAI document analysis',
    'Anthropic Claude documents',
    'OpenRouter AI',
    'document Q&A',
    'AI-powered document understanding',
    'document management system',
    'RAG (Retrieval Augmented Generation)',
    'vector search documents',
    'document intelligence'
  ],
  authors: [{ name: 'Document Chat' }],
  creator: 'Document Chat',
  publisher: 'Document Chat',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://document-chat-system.vercel.app',
    title: 'Document Chat - AI-Powered Document Analysis & Intelligent Chat',
    description: 'Transform your documents into intelligent conversations. Upload PDFs, Word documents, images, and more. Chat with AI, extract insights, and analyze content with advanced semantic search.',
    siteName: 'Document Chat',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Document Chat - AI-Powered Document Analysis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Document Chat - AI-Powered Document Analysis & Intelligent Chat',
    description: 'Transform your documents into intelligent conversations. Upload PDFs, Word documents, images, and more. Chat with AI using OpenRouter, OpenAI, and Anthropic.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://document-chat-system.vercel.app',
  },
}

export default async function HomePage() {
  const { userId } = await auth()

  // If user is authenticated, redirect to dashboard
  if (userId) {
    redirect('/dashboard')
  }

  return <LandingPageClient />
}