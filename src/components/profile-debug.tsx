'use client'

import { useCurrentProfile, useFetchProfile, useResetStore } from '@/stores/profile-store'
import { useCertifications } from '@/hooks/use-certifications'
import { Button } from '@/components/ui/button'

export function ProfileDebug() {
  const profile = useCurrentProfile()
  const { userCertifications, stats, govDatabase, govDatabaseLoading } = useCertifications()
  const fetchProfile = useFetchProfile()
  const resetStore = useResetStore()

  const handleClearCache = async () => {
    try {
      // Clear localStorage
      localStorage.removeItem('profile-store')
      
      // Reset Zustand store
      resetStore()
      
      // Fetch fresh profile from database
      await fetchProfile()
      
      alert('Cache cleared! Profile refreshed from database.')
    } catch (error) {
      console.error('Error clearing cache:', error)
      alert('Error clearing cache. Check console for details.')
    }
  }

  const handleTestApiDirectly = async () => {
    try {
      console.log('🧪 Testing API directly...')
      
      const testPayload = {
        certifications: {
          certifications: [],
          setAsides: ['SBA', 'TEST']
        }
      }
      
      console.log('🧪 Sending test payload:', testPayload)
      
      const response = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      })
      
      console.log('🧪 Response status:', response.status)
      const result = await response.json()
      console.log('🧪 Response result:', result)
      
      if (result.success) {
        alert(`API test successful! Updated setAsides: ${JSON.stringify(result.data.certifications?.setAsides)}`)
        await fetchProfile() // Refresh profile
      } else {
        alert(`API test failed: ${result.error}`)
      }
    } catch (error) {
      console.error('API test failed:', error)
      alert('API test failed. Check console for details.')
    }
  }

  if (!profile) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 space-y-2">
        <h3 className="font-bold text-red-800">❌ No profile loaded</h3>
        <p className="text-red-600">Profile is null or undefined</p>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg bg-yellow-50 space-y-4">
      <h3 className="font-bold text-yellow-800">🐛 Profile Debug Info</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-blue-800">Profile Basic Info:</h4>
          <ul className="text-sm">
            <li>ID: {profile.id}</li>
            <li>Company: {profile.companyName}</li>
            <li>Has Certifications: {profile.certifications ? '✅' : '❌'}</li>
            <li>Certifications Type: {typeof profile.certifications}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-green-800">Hook Results:</h4>
          <ul className="text-sm">
            <li>User Certs Count: {userCertifications.length}</li>
            <li>Stats Total: {stats.total}</li>
            <li>Gov DB Loading: {govDatabaseLoading ? '⏳' : '✅'}</li>
            <li>Gov DB Available: {govDatabase ? '✅' : '❌'}</li>
          </ul>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold text-purple-800">Raw Certifications Object:</h4>
        <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-32 border">
          {JSON.stringify(profile.certifications, null, 2)}
        </pre>
      </div>

      <div>
        <h4 className="font-semibold text-orange-800">Processed User Certifications:</h4>
        {userCertifications.length === 0 ? (
          <p className="text-red-600">❌ No certifications found by useCertifications hook</p>
        ) : (
          <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-32 border">
            {JSON.stringify(userCertifications, null, 2)}
          </pre>
        )}
      </div>

      <div>
        <h4 className="font-semibold text-indigo-800">Stats Object:</h4>
        <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-20 border">
          {JSON.stringify(stats, null, 2)}
        </pre>
      </div>

      <div className="bg-red-100 p-3 rounded border border-red-300">
        <h4 className="font-semibold text-red-800 mb-2">🚨 Data Mismatch Detected</h4>
        <div className="text-sm space-y-1">
          <p><strong>Issue:</strong> UI shows certifications but database has empty array</p>
          <p><strong>Cause:</strong> Likely cached data in browser localStorage</p>
          <p><strong>Fix:</strong></p>
          <ol className="list-decimal list-inside ml-2 space-y-1">
            <li>Open browser DevTools (F12)</li>
            <li>Go to Console tab</li>
            <li>Run: <code className="bg-white px-1 rounded">localStorage.removeItem(&apos;profile-store&apos;)</code></li>
            <li>Refresh page to clear Zustand persistence cache</li>
            <li>Certifications should disappear (matching database)</li>
          </ol>
          <p className="mt-2"><strong>Expected Result:</strong> After cache clear, UI should show empty certifications array</p>
          <div className="mt-3 space-x-2">
            <Button 
              onClick={handleClearCache}
              variant="destructive" 
              size="sm"
              className="text-xs"
            >
              🗑️ Clear Cache & Refresh Profile
            </Button>
            <Button 
              onClick={handleTestApiDirectly}
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              🧪 Test API Directly
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}