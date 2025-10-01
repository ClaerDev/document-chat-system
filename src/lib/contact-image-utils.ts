/**
 * Contact Image Management Utilities
 * 
 * Handles upload, deletion, and staging of contact profile images
 * with proper organizational folder structure and cleanup
 */

import type { StagedImage } from '@/components/contacts/ContactImageUpload'

/**
 * Upload a staged image to Supabase storage
 * Path: /{bucket}/{orgId}/images/contact/{filename}
 */
export async function uploadContactImage(stagedImage: StagedImage): Promise<string> {
  const formData = new FormData()
  formData.append('file', stagedImage.file)
  formData.append('type', 'contact') // This will create the correct folder structure

  const response = await fetch('/api/v1/storage/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('Upload response error:', {
      status: response.status,
      statusText: response.statusText,
      body: text
    })
    
    if (response.status === 503) {
      throw new Error('Image upload service is currently unavailable. Please contact support.')
    } else if (response.status === 413) {
      throw new Error('File is too large. Please choose a smaller image.')
    } else if (response.status === 400) {
      const errorData = JSON.parse(text || '{}')
      throw new Error(errorData.error || 'Invalid image file. Please check the file type and size.')
    } else {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }
  }

  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Upload failed')
  }

  return data.data.url
}

/**
 * Delete an image from Supabase storage
 */
export async function deleteContactImage(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/v1/storage/delete?url=${encodeURIComponent(imageUrl)}`, {
      method: 'DELETE',
    })
    
    return response.ok
  } catch (err) {
    console.error('Failed to delete contact image:', err)
    return false
  }
}

/**
 * Process staged image changes during contact save
 * Returns the final profilePhoto URL or null if removed
 */
export async function processContactImageChanges(
  stagedImage: StagedImage | null,
  currentImageUrl?: string
): Promise<string | null> {
  // No staged changes - return current URL
  if (!stagedImage) {
    return currentImageUrl || null
  }

  try {
    // Upload the new image first
    const newImageUrl = await uploadContactImage(stagedImage)

    // If replacing an existing image, delete the old one
    if (stagedImage.originalUrl && stagedImage.originalUrl !== newImageUrl) {
      // Don't await - let it delete in background, prioritize user experience
      deleteContactImage(stagedImage.originalUrl).catch(err => 
        console.warn('Failed to delete old contact image:', err)
      )
    }

    return newImageUrl
  } catch (error) {
    // Clean up the staged image object URL
    if (stagedImage.previewUrl) {
      URL.revokeObjectURL(stagedImage.previewUrl)
    }
    throw error
  }
}

/**
 * Clean up staged image preview URL
 */
export function cleanupStagedImage(stagedImage: StagedImage | null) {
  if (stagedImage?.previewUrl) {
    URL.revokeObjectURL(stagedImage.previewUrl)
  }
}

/**
 * Handle contact deletion with image cleanup
 */
export async function deleteContactWithImage(contactId: string, imageUrl?: string): Promise<boolean> {
  try {
    // Delete contact first
    const response = await fetch(`/api/v1/contacts/${contactId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete contact')
    }

    // Delete associated image if exists (in background)
    if (imageUrl) {
      deleteContactImage(imageUrl).catch(err => 
        console.warn('Failed to delete contact image during contact deletion:', err)
      )
    }

    return true
  } catch (error) {
    console.error('Error deleting contact:', error)
    return false
  }
}