'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { UserActivity } from '@/components/dashboard/user-activity'

import { useCSRF } from '@/hooks/useCSRF'
import {
  FileText,
  MessageSquare,
  FolderOpen,
  Clock,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react'
import { Profile } from '@/types'

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const { token: csrfToken, addToHeaders } = useCSRF()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [stats, setStats] = useState({
    totalDocuments: 0,
    chatSessions: 0,
    folders: 0,
    lastActivity: null as string | null
  })
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      // Fetch documents count
      const docsResponse = await fetch('/api/v1/documents')
      const docsData = await docsResponse.json()

      // Fetch folders count
      const foldersResponse = await fetch('/api/v1/folders')
      const foldersData = await foldersResponse.json()

      if (docsData.success && foldersData.success) {
        // Get last activity from most recent document
        const lastDoc = docsData.documents?.[0]
        const lastActivity = lastDoc?.lastModified || lastDoc?.createdAt || null

        setStats({
          totalDocuments: docsData.count || 0,
          chatSessions: 0, // Chat sessions not implemented yet
          folders: foldersData.count || 0,
          lastActivity
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/profile')
      const data = await response.json()

      if (data.success) {
        setProfile(data.data)

        // Check if profile is incomplete and redirect to profile page
        if (!data.data || data.data.profileCompleteness < 20) {
          console.log('Incomplete profile detected, redirecting to profile page')
          router.replace('/profile')
          return
        }
      } else if (data.needsUserCreation) {
        // User doesn't exist, try to sync from Clerk
        if (!csrfToken) {
          console.error('CSRF token not available for user sync')
          return
        }

        const syncResponse = await fetch('/api/v1/user/sync', {
          method: 'POST',
          headers: addToHeaders({})
        })
        const syncData = await syncResponse.json()

        if (syncData.success) {
          // Retry fetching profile after user creation
          const retryResponse = await fetch('/api/v1/profile')
          const retryData = await retryResponse.json()

          if (retryData.success) {
            setProfile(retryData.data)
            // Redirect to profile page for new users to complete setup
            router.replace('/profile')
            return
          }
        }
      } else {
        // No profile found, redirect to profile page
        console.log('No profile found, redirecting to profile page')
        router.replace('/profile')
        return
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      // On error, redirect to profile page as fallback
      router.replace('/profile')
    } finally {
      setProfileLoading(false)
    }
  }, [router, csrfToken, addToHeaders])

  // All hooks must be called before any conditional logic
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Defer API calls to not block navigation
      setTimeout(() => {
        fetchProfile()
        fetchStats()
      }, 0)
    }
  }, [isLoaded, isSignedIn, fetchProfile, fetchStats])
  
  // Don't render anything on server-side to prevent hydration mismatch
  if (!isLoaded || !isSignedIn) {
    return null
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName || 'User'}! Here&apos;s your document chat activity overview.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/documents" prefetch={true}>
              <Button variant="outline">
                View Documents
              </Button>
            </Link>
            <Link href="/chat" prefetch={true}>
              <Button>Start Chat</Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats with proper shadcn/ui components */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats.totalDocuments}
              </div>
              <p className="text-xs text-muted-foreground">
                Documents uploaded
              </p>
              <Progress value={stats.totalDocuments > 0 ? 100 : 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats.chatSessions}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 inline-flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  Active conversations
                </span>
              </p>
              <Progress value={stats.chatSessions > 0 ? 100 : 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Folders</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats.folders}
              </div>
              <p className="text-xs text-muted-foreground">
                Document collections
              </p>
              <Progress value={stats.folders > 0 ? 100 : 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats.lastActivity ? new Date(stats.lastActivity).toLocaleDateString() : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                Last interaction
              </p>
              <Progress value={stats.lastActivity ? 100 : 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Alert for Beta Status */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Welcome to Document Chat</AlertTitle>
          <AlertDescription>
            Your AI-powered document analysis platform is ready to help you understand and interact with your documents.
          </AlertDescription>
        </Alert>


        {/* Main Content Grid */}
        <div className="grid gap-4 md:grid-cols-1">
          {/* Activity Overview - Now using the UserActivity component */}
          <UserActivity />
        </div>
      </div>
    </AppLayout>
  )
}