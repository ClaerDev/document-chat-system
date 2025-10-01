'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  FileText, 
  Search,
  Upload,
  ArrowRight,
  Users,
  Sparkles,
  Shield,
  Zap,
  Files,
  Bot
} from 'lucide-react'

export function LandingPageClient() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="/">
          <Files className="h-6 w-6 mr-2" />
          <span className="font-bold">Document Chat System</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="/sign-in">
            <Button variant="outline">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Get Started</Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Chat with Your Documents Using AI
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                Upload, organize, and have intelligent conversations with your documents. Get instant answers, summaries, and insights powered by AI.
              </p>
            </div>
            <div className="space-x-4">
              <Link href="/sign-up">
                <Button size="lg">
                  Start Chatting for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Shield className="h-4 w-4" />
              <span>Open source • Self-hosted • Privacy-first</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Powerful Features</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Everything you need to manage and interact with your documents intelligently
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <MessageCircle className="h-8 w-8 text-blue-600" />
                <CardTitle>AI-Powered Chat</CardTitle>
                <CardDescription>
                  Have natural conversations with your documents. Ask questions and get accurate answers with source citations.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="h-8 w-8 text-green-600" />
                <CardTitle>Multi-Format Support</CardTitle>
                <CardDescription>
                  Upload PDF, Word, Excel, PowerPoint, text files, and images. All formats are processed intelligently.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Search className="h-8 w-8 text-purple-600" />
                <CardTitle>Advanced Search</CardTitle>
                <CardDescription>
                  Full-text search with semantic understanding. Find exactly what you're looking for across all documents.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">How It Works</h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Get started in minutes with our simple three-step process
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-3">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white">
                <Upload className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">1. Upload Documents</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Drag and drop your files or browse to upload. Organize them in folders for easy management.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white">
                <Bot className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">2. AI Processing</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Our AI automatically processes and understands your documents, creating searchable content.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-white">
                <MessageCircle className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">3. Start Chatting</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Ask questions, get summaries, and have intelligent conversations about your document content.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-4">
            <div className="flex flex-col items-center space-y-2">
              <Files className="h-12 w-12 text-blue-600" />
              <div className="text-4xl font-bold">50+</div>
              <p className="text-gray-500 dark:text-gray-400">File Formats</p>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Zap className="h-12 w-12 text-green-600" />
              <div className="text-4xl font-bold">99.9%</div>
              <p className="text-gray-500 dark:text-gray-400">Uptime</p>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Users className="h-12 w-12 text-purple-600" />
              <div className="text-4xl font-bold">10k+</div>
              <p className="text-gray-500 dark:text-gray-400">Documents Processed</p>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Sparkles className="h-12 w-12 text-orange-600" />
              <div className="text-4xl font-bold">95%</div>
              <p className="text-gray-500 dark:text-gray-400">Accuracy Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Ready to Transform Your Documents?</h2>
              <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Join the open-source revolution in document management and AI-powered conversations.
              </p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              <Link href="/sign-up" className="w-full">
                <Button size="lg" className="w-full">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Open source • No vendor lock-in • Self-hosted option
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">© 2024 Document Chat System. MIT Licensed.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="https://github.com/your-org/document-chat-system">
            GitHub
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Documentation
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}