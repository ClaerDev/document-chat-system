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
  Activity, 
  Target, 
  FileText, 
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react'
import { Profile } from '@/types'

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const { token: csrfToken, addToHeaders } = useCSRF()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

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
      }, 0)
    }
  }, [isLoaded, isSignedIn, fetchProfile])
  
  // Early loading state
  if (!isLoaded) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-government"></div>
        </div>
      </AppLayout>
    )
  }

  if (!isSignedIn) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please sign in to access the dashboard</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    )
  }



  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName || 'User'}! Here&apos;s what&apos;s happening with your government contracting opportunities.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/components-showcase" prefetch={true}>
              <Button variant="outline">
                Test Notifications
              </Button>
            </Link>
            <Button>Download Report</Button>
          </div>
        </div>

        {/* Quick Stats with proper shadcn/ui components */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +0% from last month
              </p>
              <Progress value={0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Match Scores</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 inline-flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  High matches
                </span>
              </p>
              <Progress value={0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proposals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                0 in progress
              </p>
              <Progress value={0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">
                No data yet
              </p>
              <Progress value={0} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Alert for Beta Status */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Welcome to GovMatch AI Beta</AlertTitle>
          <AlertDescription>
            Your AI-powered government contracting platform is ready to help you discover opportunities and win more contracts.
          </AlertDescription>
        </Alert>


        {/* Main Content Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Activity Overview - Now using the UserActivity component */}
          <UserActivity />

          {/* Right Side - Profile and Progress */}
          <div className="col-span-3 space-y-4">
            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
                <CardDescription>
                  Your account information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Profile Completion</span>
                      <span className="text-sm text-muted-foreground">
                        {profileLoading ? 'Loading...' : `${profile?.profileCompleteness || 0}%`}
                      </span>
                    </div>
                    <Progress value={profile?.profileCompleteness || 0} />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{user?.firstName} {user?.lastName || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium truncate max-w-[180px]">{user?.emailAddresses?.[0]?.emailAddress}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Member Since</span>
                      <span className="font-medium">
                        {user ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <Link href="/profile" prefetch={true} className="w-full">
                    <Button 
                      className="w-full" 
                      variant="outline"
                    >
                      {profile?.profileCompleteness === 100 ? 'View Profile' : 'Complete Profile'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Implementation Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Implementation Progress</CardTitle>
                <CardDescription>
                  Phase 1: Foundation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                        <span>Next.js Setup</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">Complete</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                        <span>Database Setup</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">Complete</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                        <span>Authentication</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">Complete</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                        <span>Design System</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">Complete</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                        <span>Opportunity Search</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">Complete</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                        <span>Profile Management</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">Complete</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <div className="mr-2 h-4 w-4 rounded-full border-2 border-blue-600 animate-pulse" />
                        <span>Match Score Algorithm</span>
                      </div>
                      <Badge>Next</Badge>
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Overall Progress</span>
                      <span>60%</span>
                    </div>
                    <Progress value={60} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}