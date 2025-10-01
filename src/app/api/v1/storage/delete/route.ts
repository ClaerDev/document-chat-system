/**
 * Storage Delete API Endpoint
 * 
 * Handles deletion of files from Supabase Storage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrganizationId } from '@/lib/auth/get-organization-id'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeFilePath } from '@/lib/storage/path-utils'

/**
 * DELETE /api/v1/storage/delete
 * 
 * Delete files from Supabase Storage
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Storage service not available' },
        { status: 503 }
      )
    }

    // Get user's organization ID
    const orgId = await getOrganizationId(userId)
    
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'No organization found for user' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('url')
    
    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: 'File URL is required' },
        { status: 400 }
      )
    }

    // Extract file path from the URL
    // URL format: https://domain/storage/v1/object/public/bucket/path
    // or: https://domain/storage/v1/object/sign/bucket/path?token=...
    let filePath: string
    
    try {
      const url = new URL(fileUrl)
      const pathParts = url.pathname.split('/')
      
      // Handle both old and new URL formats
      const bucketIndex = pathParts.findIndex(part => part === 'documents')
      if (bucketIndex !== -1) {
        // Old format: /storage/v1/object/public/documents/path
        filePath = pathParts.slice(bucketIndex + 1).join('/')
      } else {
        // New format or other format: extract path after /public/ or /sign/
        const publicIndex = pathParts.findIndex(part => part === 'public' || part === 'sign')
        if (publicIndex !== -1 && pathParts.length > publicIndex + 2) {
          // Skip 'public' and bucket name, get the rest
          filePath = pathParts.slice(publicIndex + 2).join('/')
        } else {
          throw new Error('Invalid file URL format')
        }
      }
      
      if (!filePath) {
        throw new Error('Could not extract file path from URL')
      }

      // Normalize the path to handle different formats
      const normalizedPath = normalizeFilePath(filePath, orgId)
      
      // Security check: ensure the file belongs to the user's organization
      if (!normalizedPath.startsWith(orgId)) {
        return NextResponse.json(
          { success: false, error: 'Access denied: file does not belong to your organization' },
          { status: 403 }
        )
      }
      
      // Use the normalized path for deletion
      filePath = normalizedPath
      
    } catch (error) {
      console.error('Error parsing file URL:', error)
      return NextResponse.json(
        { success: false, error: 'Invalid file URL format' },
        { status: 400 }
      )
    }

    console.log('Attempting to delete file:', filePath)

    // Delete from Supabase Storage
    const { error } = await supabaseAdmin.storage
      .from('documents')
      .remove([filePath])

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete file' },
        { status: 500 }
      )
    }

    console.log('Successfully deleted file:', filePath)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    })

  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}