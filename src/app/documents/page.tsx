import DocumentsPage from '@/components/documents/documents-page'

export const dynamic = 'force-dynamic'

export default function Documents() {
  return <DocumentsPage />
}

export const metadata = {
  title: 'Documents | GovMatch AI',
  description: 'Manage your government contracting documents, proposals, and compliance files.',
}