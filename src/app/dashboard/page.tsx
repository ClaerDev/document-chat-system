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
import { ScrollArea } from '@/components/ui/scroll-area'

import { useCSRF } from '@/hooks/useCSRF'
import {
  FileText,
  MessageSquare,
  FolderOpen,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Upload,
  Settings,
  TrendingUp,
  Search
} from 'lucide-react'
import { Profile } from '@/types'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { DialogTitle } from '@/components/ui/dialog'

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
  const [recentDocuments, setRecentDocuments] = useState<any[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

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

        // Set recent documents (top 5)
        setRecentDocuments(docsData.documents?.slice(0, 5) || [])
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
      setDocumentsLoading(false)
    }
  }, [])

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/profile')
      const data = await response.json()

      if (data.success) {
        setProfile(data.data)
        // Allow access to dashboard regardless of profile completeness
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
          }
        }
      }
      // Allow dashboard access even if profile is not found
    } catch (error) {
      console.error('Error fetching profile:', error)
      // Allow dashboard access even on error
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

  // Search functionality
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const searchDocuments = async () => {
      setSearchLoading(true)
      try {
        const response = await fetch(`/api/v1/documents?search=${encodeURIComponent(searchQuery)}`)
        const data = await response.json()
        if (data.success) {
          setSearchResults(data.documents || [])
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setSearchLoading(false)
      }
    }

    const timeoutId = setTimeout(searchDocuments, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])
  
  // Don't render anything on server-side to prevent hydration mismatch
  if (!isLoaded || !isSignedIn) {
    return null
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Welcome back, {user?.firstName || 'User'}! Here&apos;s your document chat activity overview.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/documents" prefetch={true} className="flex-1 sm:flex-initial">
              <Button variant="outline" className="w-full sm:w-auto">
                View Documents
              </Button>
            </Link>
            <Link href="/chat" prefetch={true} className="flex-1 sm:flex-initial">
              <Button className="w-full sm:w-auto">Start Chat</Button>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Recent Documents */}
          <Card className="col-span-full lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Recent Documents
                  </CardTitle>
                  <CardDescription>
                    Your most recently uploaded or modified documents
                  </CardDescription>
                </div>
                <Link href="/documents">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {documentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                </div>
              ) : recentDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-3">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No documents yet</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Upload your first document to get started</p>
                  <Link href="/documents">
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentDocuments.map((doc) => (
                    <Link key={doc.id} href={`/documents/${doc.id}`}>
                      <div className="flex items-center space-x-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex-shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {doc.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-xs">
                              {doc.type?.toUpperCase() || 'FILE'}
                            </Badge>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          <span>{new Date(doc.uploadDate || doc.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center mt-0.5">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(doc.lastModified || doc.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="col-span-full lg:col-span-1 lg:self-start">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <TrendingUp className="mr-2 h-4 w-4" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-xs">
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              <Link href="/documents" className="block">
                <Button variant="outline" className="w-full justify-start h-9">
                  <Upload className="mr-2 h-4 w-4" />
                  <span className="text-sm">Upload Document</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-start h-9"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                <span className="text-sm">Search Documents</span>
              </Button>
              <Link href="/chat" className="block">
                <Button variant="outline" className="w-full justify-start h-9">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span className="text-sm">Start Chat</span>
                </Button>
              </Link>
              <Link href="/documents" className="block">
                <Button variant="outline" className="w-full justify-start h-9">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span className="text-sm">Manage Folders</span>
                </Button>
              </Link>
              <Link href="/settings" className="block">
                <Button variant="outline" className="w-full justify-start h-9">
                  <Settings className="mr-2 h-4 w-4" />
                  <span className="text-sm">Settings</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Search Modal */}
        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTitle className="sr-only">Search Documents</DialogTitle>
          <CommandInput
            placeholder="Search documents..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {searchLoading ? 'Searching...' : 'No documents found.'}
            </CommandEmpty>
            {searchResults.length > 0 && (
              <CommandGroup heading="Documents">
                {searchResults.map((doc) => (
                  <CommandItem
                    key={doc.id}
                    onSelect={() => {
                      router.push(`/documents/${doc.id}`)
                      setSearchOpen(false)
                      setSearchQuery('')
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <div className="flex-1">
                      <div className="font-medium">{doc.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {doc.type?.toUpperCase()} • {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </CommandDialog>
      </div>
    </AppLayout>
  )
}