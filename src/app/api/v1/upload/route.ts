/**
 * @swagger
 * /api/v1/upload:
 *   post:
 *     summary: Upload files (images) to storage
 *     description: Upload files to secure cloud storage and return the public URL
 *     tags: [File Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *               type:
 *                 type: string
 *                 enum: [profile-image, document, attachment]
 *                 description: Type of file being uploaded
 *                 default: profile-image
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       format: uri
 *                       description: Public URL of the uploaded file
 *                       example: "https://storage.example.com/files/profile-images/abc123.jpg"
 *                     filename:
 *                       type: string
 *                       description: Original filename
 *                       example: "company-logo.jpg"
 *                     size:
 *                       type: number
 *                       description: File size in bytes
 *                       example: 1024000
 *                     contentType:
 *                       type: string
 *                       description: MIME type of the file
 *                       example: "image/jpeg"
 *       400:
 *         description: Bad request - invalid file or parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid file type. Only images are allowed."
 *                 code:
 *                   type: string
 *                   example: "INVALID_FILE_TYPE"
 *       401:
 *         description: Unauthorized - missing or invalid authentication
 *       413:
 *         description: File too large
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// File upload validation schema
const FileUploadSchema = z.object({
  type: z.enum(['profile-image', 'document', 'attachment']).default('profile-image'),
})

// Initialize Supabase client for storage (lazy initialization)
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  }

  return createClient(supabaseUrl, supabaseKey)
}

// File type validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB for images

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized', 
          code: 'UNAUTHORIZED' 
        },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'profile-image'

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No file provided', 
          code: 'NO_FILE' 
        },
        { status: 400 }
      )
    }

    // Validate file type and size
    if (type === 'profile-image') {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`, 
            code: 'INVALID_FILE_TYPE' 
          },
          { status: 400 }
        )
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { 
            success: false, 
            error: `File too large. Maximum size: ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`, 
            code: 'FILE_TOO_LARGE' 
          },
          { status: 413 }
        )
      }
    } else {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { 
            success: false, 
            error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`, 
            code: 'FILE_TOO_LARGE' 
          },
          { status: 413 }
        )
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase()
    const uniqueFilename = `${timestamp}-${sanitizedName}`

    // Determine storage path based on type
    const storagePath = `${orgId || userId}/${type}s/${uniqueFilename}`

    // Convert File to ArrayBuffer for upload
    const fileBuffer = await file.arrayBuffer()

    // Get Supabase client
    const supabase = getSupabaseClient()

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('govmatch-files')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to upload file',
          code: 'UPLOAD_FAILED',
          details: uploadError.message
        },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('govmatch-files')
      .getPublicUrl(storagePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to generate public URL', 
          code: 'URL_GENERATION_FAILED' 
        },
        { status: 500 }
      )
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        filename: file.name,
        size: file.size,
        contentType: file.type,
        path: storagePath,
      },
    })

  } catch (error) {
    console.error('Upload API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR' 
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}