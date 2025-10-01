'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  MessageCircle,
  Upload,
  Clock,
  Eye,
  Search,
  Edit,
  Trash2,
  Share2
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'document_upload' | 'chat' | 'document_view' | 'search' | 'document_edit' | 'document_delete' | 'document_share'
  title: string
  description: string
  timestamp: Date
  metadata?: {
    documentName?: string
    chatMessages?: number
    searchQuery?: string
  }
}

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
    case 'document_edit':
      return <Edit className="h-4 w-4" />
    case 'document_delete':
      return <Trash2 className="h-4 w-4" />
    case 'document_share':
      return <Share2 className="h-4 w-4" />
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
    case 'document_edit':
      return 'text-yellow-600'
    case 'document_delete':
      return 'text-red-600'
    case 'document_share':
      return 'text-indigo-600'
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
    case 'document_edit':
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Edit</Badge>
    case 'document_delete':
      return <Badge variant="outline" className="text-red-600 border-red-600">Delete</Badge>
    case 'document_share':
      return <Badge variant="outline" className="text-indigo-600 border-indigo-600">Share</Badge>
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

// Map audit log event types to activity types
function mapAuditEventToActivityType(eventType: string): ActivityItem['type'] {
  const eventMap: Record<string, ActivityItem['type']> = {
    'DOCUMENT_CREATED': 'document_upload',
    'DOCUMENT_UPLOADED': 'document_upload',
    'DOCUMENT_VIEWED': 'document_view',
    'DOCUMENT_UPDATED': 'document_edit',
    'DOCUMENT_DELETED': 'document_delete',
    'DOCUMENT_SHARED': 'document_share',
    'CHAT_MESSAGE': 'chat',
    'SEARCH_PERFORMED': 'search',
  }

  return eventMap[eventType] || 'document_view'
}

function transformAuditLogToActivity(log: any): ActivityItem {
  const eventType = log.eventType || 'UNKNOWN'
  const activityType = mapAuditEventToActivityType(eventType)
  const resourceName = log.resourceName || log.metadata?.documentName || 'Unknown'

  let title = ''
  let description = resourceName

  switch (activityType) {
    case 'document_upload':
      title = 'Document Uploaded'
      break
    case 'document_view':
      title = 'Document Viewed'
      break
    case 'document_edit':
      title = 'Document Updated'
      break
    case 'document_delete':
      title = 'Document Deleted'
      break
    case 'document_share':
      title = 'Document Shared'
      break
    case 'chat':
      title = 'AI Chat Session'
      description = log.description || 'Chat interaction'
      break
    case 'search':
      title = 'Document Search'
      description = log.metadata?.query || 'Search performed'
      break
    default:
      title = log.eventType?.replace(/_/g, ' ') || 'Activity'
  }

  return {
    id: log.id,
    type: activityType,
    title,
    description,
    timestamp: new Date(log.createdAt),
    metadata: log.metadata
  }
}

export function UserActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch('/api/v1/audit-logs?limit=10&sortBy=createdAt&sortOrder=desc')
        const data = await response.json()

        if (data.success && data.logs) {
          const transformedLogs = data.logs.map(transformAuditLogToActivity)
          setActivities(transformedLogs)
        }
      } catch (error) {
        console.error('Error fetching activity:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [])

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
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet</p>
              <p className="text-xs text-gray-400 mt-1">Start uploading documents to see your activity here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
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
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}