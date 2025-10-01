'use client'

import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export function BillingStatusDebug() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  const isSignedIn = !!user
  const userEmail = user?.emailAddresses[0]?.emailAddress
  const userOrgs = user?.organizationMemberships

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Debug Information
        </CardTitle>
        <CardDescription>
          Current authentication and organization status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Signed In:</span>
              {isSignedIn ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Yes
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  <XCircle className="h-3 w-3 mr-1" />
                  No
                </Badge>
              )}
            </div>
            
            {userEmail && (
              <div className="flex items-center justify-between">
                <span>Email:</span>
                <span className="text-gray-600 text-xs">{userEmail}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span>User ID:</span>
              <span className="text-gray-600 text-xs font-mono">
                {user?.id ? `${user.id.substring(0, 8)}...` : 'None'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Organizations:</span>
              <span className="text-gray-600">{userOrgs?.length || 0}</span>
            </div>
            
            {userOrgs && userOrgs.length > 0 && (
              <div className="text-xs space-y-1">
                {userOrgs.map((org, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span>Role:</span>
                    <Badge variant="outline" className="text-xs">
                      {org.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!isSignedIn && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Not Signed In</strong> - You need to sign in to access billing features.
            </AlertDescription>
          </Alert>
        )}

        {isSignedIn && (!userOrgs || userOrgs.length === 0) && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>No Organization</strong> - You may need to be part of an organization to access billing.
            </AlertDescription>
          </Alert>
        )}

        {isSignedIn && userOrgs && userOrgs.length > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Authentication OK</strong> - You should be able to access billing features.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}