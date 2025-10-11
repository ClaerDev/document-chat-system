'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Share2,
  ExternalLink,
  ArrowRight
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'document_upload' | 'chat' | 'document_view' | 'search' | 'document_edit' | 'document_delete' | 'document_share'
  title: string
  description: string
  timestamp: Date
  resourceId?: string
  resourceType?: string
  action?: string
  metadata?: {
    documentName?: string
    chatMessages?: number
    searchQuery?: string
    [key: string]: any
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

function getActivityBadgeText(type: ActivityItem['type']): string {
  switch (type) {
    case 'document_upload':
      return 'Uploaded'
    case 'chat':
      return 'Chat'
    case 'document_view':
      return 'Viewed'
    case 'search':
      return 'Search'
    case 'document_edit':
      return 'Edited'
    case 'document_delete':
      return 'Deleted'
    case 'document_share':
      return 'Shared'
    default:
      return 'Activity'
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
  const resourceName = log.resource || log.metadata?.documentName || log.description || 'Unknown item'

  let title = ''
  let description = ''

  switch (activityType) {
    case 'document_upload':
      title = 'Document Uploaded'
      description = resourceName
      break
    case 'document_view':
      title = 'Document Viewed'
      description = resourceName
      break
    case 'document_edit':
      title = 'Document Updated'
      description = resourceName
      break
    case 'document_delete':
      title = 'Document Deleted'
      description = resourceName
      break
    case 'document_share':
      title = 'Document Shared'
      description = resourceName
      break
    case 'chat':
      title = 'AI Chat Session'
      description = log.message || log.description || 'Started a conversation'
      break
    case 'search':
      title = 'Document Search'
      description = log.metadata?.query || log.message || 'Performed a search'
      break
    default:
      title = log.eventType?.replace(/_/g, ' ') || 'Activity'
      description = log.message || log.description || resourceName
  }

  return {
    id: log.id,
    type: activityType,
    title,
    description,
    timestamp: new Date(log.createdAt),
    resourceId: log.resourceId,
    resourceType: log.resource,
    action: log.action,
    metadata: log.metadata
  }
}

export function UserActivity() {
  const router = useRouter()
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

  const handleViewActivity = (activity: ActivityItem) => {
    // Navigate based on activity type
    if (activity.type === 'chat') {
      router.push('/chat')
    } else if (activity.resourceId && (activity.type === 'document_view' || activity.type === 'document_upload' || activity.type === 'document_edit')) {
      router.push(`/documents?id=${activity.resourceId}`)
    } else if (activity.type === 'search') {
      router.push('/documents')
    } else {
      router.push('/documents')
    }
  }

  return (
    <Card className="col-span-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Your recent document interactions and AI conversations
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/logs')}
            className="hidden sm:flex"
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-4">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">No activity yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Start uploading documents to see your activity here</p>
              <Button
                variant="outline"
                onClick={() => router.push('/documents')}
                className="mt-2"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="group flex items-start space-x-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => activity.type !== 'document_delete' && handleViewActivity(activity)}
                >
                  <div className={`p-2.5 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 ${getActivityColor(activity.type)} flex-shrink-0`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {activity.description}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {getActivityBadgeText(activity.type)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3 mr-1.5" />
                        {formatRelativeTime(activity.timestamp)}
                      </div>
                      {activity.type !== 'document_delete' && (
                        <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="mr-1">View</span>
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      )}
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