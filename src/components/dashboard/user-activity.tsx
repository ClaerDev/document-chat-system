'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileText, 
  MessageCircle, 
  Upload, 
  Clock, 
  Eye,
  Search
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'document_upload' | 'chat' | 'document_view' | 'search'
  title: string
  description: string
  timestamp: Date
  metadata?: {
    documentName?: string
    chatMessages?: number
    searchQuery?: string
  }
}

// Mock data for demonstration
const mockActivityData: ActivityItem[] = [
  {
    id: '1',
    type: 'document_upload',
    title: 'Document Uploaded',
    description: 'annual_report_2024.pdf',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    metadata: { documentName: 'annual_report_2024.pdf' }
  },
  {
    id: '2',
    type: 'chat',
    title: 'AI Chat Session',
    description: 'Asked 5 questions about quarterly results',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    metadata: { chatMessages: 5, documentName: 'quarterly_results.pdf' }
  },
  {
    id: '3',
    type: 'search',
    title: 'Document Search',
    description: 'Searched for "revenue growth"',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    metadata: { searchQuery: 'revenue growth' }
  },
  {
    id: '4',
    type: 'document_view',
    title: 'Document Viewed',
    description: 'project_proposal.docx',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    metadata: { documentName: 'project_proposal.docx' }
  },
  {
    id: '5',
    type: 'chat',
    title: 'AI Chat Session',
    description: 'Asked 3 questions about technical specifications',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    metadata: { chatMessages: 3, documentName: 'technical_specs.pdf' }
  }
]

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'document_upload':
      return <Upload className="h-4 w-4" />
    case 'chat':
      return <MessageCircle className="h-4 w-4" />
    case 'document_view':
      return <Eye className="h-4 w-4" />
    case 'search':
      return <Search className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

function getActivityColor(type: ActivityItem['type']) {
  switch (type) {
    case 'document_upload':
      return 'text-blue-600'
    case 'chat':
      return 'text-green-600'
    case 'document_view':
      return 'text-purple-600'
    case 'search':
      return 'text-orange-600'
    default:
      return 'text-gray-600'
  }
}

function getActivityBadge(type: ActivityItem['type']) {
  switch (type) {
    case 'document_upload':
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Upload</Badge>
    case 'chat':
      return <Badge variant="outline" className="text-green-600 border-green-600">Chat</Badge>
    case 'document_view':
      return <Badge variant="outline" className="text-purple-600 border-purple-600">View</Badge>
    case 'search':
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Search</Badge>
    default:
      return <Badge variant="outline">Activity</Badge>
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString()
}

export function UserActivity() {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Your recent document interactions and AI conversations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {mockActivityData.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0 dark:border-gray-800">
                <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-800 ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {activity.title}
                    </p>
                    {getActivityBadge(activity.type)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {activity.description}
                  </p>
                  <div className="flex items-center mt-1">
                    <Clock className="h-3 w-3 mr-1 text-gray-400" />
                    <p className="text-xs text-gray-400">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}