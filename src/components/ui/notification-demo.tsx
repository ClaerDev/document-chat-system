'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useBadgeNotifications } from '@/contexts/badge-notification-context'

export function NotificationDemo() {
  const { addNotification, clearAllNotifications, notifications, unreadCount } = useBadgeNotifications()

  const demoNotifications = [
    {
      type: 'opportunity' as const,
      category: 'new_opportunity' as const,
      title: 'High-Value Opportunity Found',
      message: 'New $2.5M cybersecurity contract matches your profile with 94% compatibility',
      priority: 'high' as const,
      actionUrl: '/opportunities/demo-1'
    },
    {
      type: 'system' as const,
      category: 'match_score' as const,
      title: 'Profile Score Improved',
      message: 'Adding your new certification increased your match scores by 15%',
      priority: 'medium' as const,
      actionUrl: '/profile'
    },
    {
      type: 'success' as const,
      category: 'billing' as const,
      title: 'Payment Successful',
      message: 'Your Professional plan subscription has been renewed',
      priority: 'low' as const,
      actionUrl: '/billing'
    },
    {
      type: 'warning' as const,
      category: 'profile' as const,
      title: 'Profile Incomplete',
      message: 'Complete your past performance section to improve match accuracy',
      priority: 'medium' as const,
      actionUrl: '/profile#past-performance'
    },
    {
      type: 'update' as const,
      category: 'system_update' as const,
      title: 'New Feature Available',
      message: 'Try our new AI-powered proposal assistant in your dashboard',
      priority: 'low' as const,
      actionUrl: '/dashboard'
    }
  ]

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Notification System Demo</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {unreadCount} unread
            </Badge>
            <Badge variant="outline">
              {notifications.length} total
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {demoNotifications.map((demo, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="h-auto p-3 text-left justify-start"
              onClick={() => addNotification(demo)}
            >
              <div className="text-xs">
                <div className="font-medium capitalize mb-1">
                  {demo.type}: {demo.category.replace('_', ' ')}
                </div>
                <div className="text-muted-foreground truncate">
                  {demo.title}
                </div>
              </div>
            </Button>
          ))}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Click the notification bell in the header to view notifications
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllNotifications}
            disabled={notifications.length === 0}
          >
            Clear All
          </Button>
        </div>
        
        <div className="bg-muted p-3 rounded-lg text-sm">
          <div className="font-medium mb-2">Features Included:</div>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Smart categorization (opportunity, system, update, warning, success)</li>
            <li>• Priority levels (high, medium, low)</li>
            <li>• Unread count badge with 99+ overflow</li>
            <li>• Click-to-dismiss and mark as read</li>
            <li>• Action URLs for navigation</li>
            <li>• Responsive dropdown design</li>
            <li>• Timestamp formatting (relative time)</li>
            <li>• Mark all as read functionality</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}