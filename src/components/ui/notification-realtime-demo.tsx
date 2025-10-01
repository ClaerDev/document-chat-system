'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Bell, Zap, Users, Loader2 } from 'lucide-react'
import { useBadgeNotifications } from '@/contexts/badge-notification-context'
import { SignInPrompt } from '@/components/ui/sign-in-prompt'
import { useAuth } from '@clerk/nextjs'

export function NotificationRealtimeDemo() {
  const [message, setMessage] = useState('This is a test real-time notification!')
  const [notificationType, setNotificationType] = useState('USER')
  const [loading, setLoading] = useState(false)
  const [lastSent, setLastSent] = useState<string | null>(null)
  
  const { isSignedIn } = useAuth()
  const { unreadCount, isConnected, isConnecting } = useBadgeNotifications()

  // Show sign-in prompt if user is not authenticated
  if (!isSignedIn) {
    return (
      <SignInPrompt 
        title="Real-time Notifications" 
        description="Sign in to test the real-time notification system"
        feature="real-time notifications"
      />
    )
  }

  const sendTestNotification = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/v1/notifications/test-realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: notificationType,
          message,
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setLastSent(new Date().toLocaleTimeString())
      } else {
        console.error('Failed to send test notification:', data.error)
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      alert('Failed to send test notification')
    } finally {
      setLoading(false)
    }
  }

  const getConnectionStatus = () => {
    if (isConnecting) return { status: 'Connecting...', color: 'warning', icon: Loader2 }
    if (isConnected) return { status: 'Connected', color: 'success', icon: Zap }
    return { status: 'Disconnected', color: 'destructive', icon: Bell }
  }

  const connectionInfo = getConnectionStatus()
  const Icon = connectionInfo.icon

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Real-time Notification Demo
        </CardTitle>
        <CardDescription>
          Test the real-time notification system using Server-Sent Events (SSE)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${isConnecting ? 'animate-spin' : ''}`} />
            <span className="font-medium">Connection Status:</span>
          </div>
          <Badge variant={connectionInfo.color as any}>
            {connectionInfo.status}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
            <div className="text-sm text-blue-600">Unread Notifications</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {lastSent || 'None'}
            </div>
            <div className="text-sm text-green-600">Last Test Sent</div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="message" className="text-sm font-medium">
              Test Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter test notification message..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Notification Type</Label>
            <RadioGroup
              value={notificationType}
              onValueChange={setNotificationType}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="USER" id="user" />
                <Label htmlFor="user" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  User-specific notification
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ORGANIZATION" id="org" />
                <Label htmlFor="org" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Organization-wide notification
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            onClick={sendTestNotification}
            disabled={loading || !isConnected || !message.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Send Test Notification
              </>
            )}
          </Button>

          {!isConnected && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              ⚠️ Real-time connection is not active. Notifications will still be saved but won't appear instantly.
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">How it works:</h4>
          <ul className="space-y-1 text-xs">
            <li>• Real-time notifications use Server-Sent Events (SSE)</li>
            <li>• User-specific notifications only appear for you</li>
            <li>• Organization-wide notifications appear for all users in your org</li>
            <li>• Check the notification bell in the header to see new notifications</li>
            <li>• Connection automatically reconnects if lost</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}