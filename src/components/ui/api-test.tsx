'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@clerk/nextjs'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export function ApiTest() {
  const { isSignedIn, getToken } = useAuth()
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const testEndpoint = async (name: string, url: string) => {
    setLoading(prev => ({ ...prev, [name]: true }))
    
    try {
      const token = await getToken()
      console.log(`Testing ${name} with token:`, token ? 'Available' : 'None')
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      const data = await response.json()
      
      setResults(prev => ({
        ...prev,
        [name]: {
          status: response.status,
          ok: response.ok,
          data: data,
          error: null
        }
      }))
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [name]: {
          status: 'ERROR',
          ok: false,
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }))
    }
  }

  const testEndpoints = [
    { name: 'Auth Test', url: '/api/v1/auth-test' },
    { name: 'Profile API', url: '/api/v1/profile' },
    { name: 'User API', url: '/api/v1/user' },
    { name: 'Notifications API', url: '/api/v1/notifications?limit=5' },
    { name: 'Health Check', url: '/api/v1/health' },
  ]

  const getStatusIcon = (result: any) => {
    if (!result) return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    if (result.ok) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (result: any) => {
    if (!result) return <Badge variant="secondary">Not tested</Badge>
    if (result.ok) return <Badge variant="success">Success</Badge>
    return <Badge variant="destructive">{result.status}</Badge>
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>API Endpoint Testing</CardTitle>
        <CardDescription>
          Test API endpoints to diagnose authentication issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Authentication Status */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-medium">Authentication Status:</span>
            <Badge variant={isSignedIn ? "success" : "destructive"}>
              {isSignedIn ? "Signed In" : "Not Signed In"}
            </Badge>
          </div>
        </div>

        {/* Test All Button */}
        <div className="flex gap-2">
          <Button 
            onClick={() => testEndpoints.forEach(ep => testEndpoint(ep.name, ep.url))}
            disabled={!isSignedIn}
            className="flex-1"
          >
            Test All Endpoints
          </Button>
          <Button 
            variant="outline"
            onClick={() => setResults({})}
          >
            Clear Results
          </Button>
        </div>

        {/* Individual Tests */}
        <div className="space-y-4">
          {testEndpoints.map(endpoint => (
            <div key={endpoint.name} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(results[endpoint.name])}
                <div>
                  <div className="font-medium">{endpoint.name}</div>
                  <div className="text-sm text-muted-foreground">{endpoint.url}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {getStatusBadge(results[endpoint.name])}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testEndpoint(endpoint.name, endpoint.url)}
                  disabled={!isSignedIn || loading[endpoint.name]}
                >
                  {loading[endpoint.name] ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Results Details */}
        {Object.keys(results).length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Detailed Results</h3>
            {Object.entries(results).map(([name, result]) => (
              <div key={name} className="p-4 border rounded-lg">
                <div className="font-medium mb-2">{name}</div>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}

        {!isSignedIn && (
          <div className="text-center text-muted-foreground">
            Please sign in to test API endpoints
          </div>
        )}
      </CardContent>
    </Card>
  )
}