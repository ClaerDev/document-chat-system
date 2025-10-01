'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ALLOWED_FILE_TYPES } from '@/lib/constants'

export function FileTypeDetector() {
  const [fileInfo, setFileInfo] = useState<{
    name: string
    type: string
    size: number
    isSupported: boolean
  } | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isSupported = ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])
    
    setFileInfo({
      name: file.name,
      type: file.type,
      size: file.size,
      isSupported
    })

    console.log('File Debug Info:', {
      name: file.name,
      type: file.type,
      size: file.size,
      isSupported,
      allowedTypes: ALLOWED_FILE_TYPES
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>File Type Detector</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            type="file"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        
        {fileInfo && (
          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">File Information:</h3>
            <p><strong>Name:</strong> {fileInfo.name}</p>
            <p><strong>MIME Type:</strong> <code className="bg-gray-200 px-1 rounded">{fileInfo.type}</code></p>
            <p><strong>Size:</strong> {(fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Supported:</strong> 
              <span className={`ml-2 px-2 py-1 rounded text-sm font-semibold ${
                fileInfo.isSupported 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {fileInfo.isSupported ? 'YES' : 'NO'}
              </span>
            </p>
          </div>
        )}

        <div className="text-xs text-gray-600">
          <p className="font-semibold mb-1">Supported Video MIME Types:</p>
          <ul className="space-y-1">
            <li>• video/mp4</li>
            <li>• video/quicktime (.mov standard)</li>
            <li>• video/x-quicktime (.mov alternative)</li>
            <li>• application/x-quicktime (.mov alternative)</li>
            <li>• video/x-msvideo (.avi)</li>
            <li>• video/webm</li>
            <li>• And more...</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}