import DocumentsPage from '@/components/documents/documents-page'

export const dynamic = 'force-dynamic'

export default function Documents() {
  return <DocumentsPage />
}

export const metadata = {
  title: 'Documents | Document Chat System',
  description: 'Manage your documents with AI-powered chat and analysis.',
}