/**
 * Storage Path Utilities
 * 
 * Handles backward compatibility for document path formats during migration
 */

import { supabaseAdmin } from '@/lib/supabase'

/**
 * Normalize a file path to the correct standardized format
 * Note: Bucket is named "documents", so paths should NOT include "documents/" prefix
 * 
 * Handles these conversions:
 * - documents/{orgId}/{file} -> {orgId}/docs/{file}
 * - documents/{orgId}/docs/{file} -> {orgId}/docs/{file} (remove redundant prefix)
 * - {orgId}/{file} -> {orgId}/docs/{file} (if not already in docs/)
 * - {orgId}/images/{type}/{file} -> {orgId}/images/{type}/{file} (no change)
 */
export function normalizeFilePath(currentPath: string, orgId?: string): string {
  // Remove redundant documents/ prefix (since bucket is already named documents)
  if (currentPath.startsWith('documents/')) {
    currentPath = currentPath.replace('documents/', '')
  }
  
  // Already in correct format
  if (currentPath.includes('/docs/') || currentPath.includes('/images/')) {
    return currentPath
  }

  // Old format: {orgId}/{file} -> {orgId}/docs/{file}
  const pathParts = currentPath.split('/')
  if (pathParts.length >= 2) {
    const orgId = pathParts[0]
    const fileName = pathParts.slice(1).join('/')
    return `${orgId}/docs/${fileName}`
  }

  // If we have an orgId parameter and a simple filename
  if (orgId && pathParts.length === 1) {
    return `${orgId}/docs/${currentPath}`
  }

  // Return as-is if we can't normalize
  return currentPath
}

/**
 * Try to download a file, attempting both new and old path formats
 * Returns the file data and the actual path that worked
 */
export async function downloadFileWithFallback(filePath: string, orgId?: string): Promise<{
  data: Blob | null
  actualPath: string
  error?: any
}> {
  if (!supabaseAdmin) {
    return { data: null, actualPath: filePath, error: new Error('Supabase not available') }
  }

  // Try the provided path first
  const { data, error } = await supabaseAdmin.storage
    .from('documents')
    .download(filePath)

  if (!error && data) {
    return { data, actualPath: filePath }
  }

  console.log(`File not found at ${filePath}, trying alternative paths...`)

  // Generate alternative paths to try
  const pathsToTry: string[] = []

  // If it's an old format, try normalized format
  const normalizedPath = normalizeFilePath(filePath, orgId)
  if (normalizedPath !== filePath) {
    pathsToTry.push(normalizedPath)
  }

  // If it's new format, try old formats for backward compatibility
  if (filePath.includes('/docs/') || filePath.includes('/images/')) {
    const pathParts = filePath.split('/')
    if (pathParts.length >= 2) {
      const orgId = pathParts[0]
      const subPath = pathParts.slice(1).join('/')
      
      // Try with documents/ prefix (migration issue we're fixing)
      pathsToTry.push(`documents/${orgId}/${subPath}`)
      pathsToTry.push(`documents/${filePath}`)
      
      // Try without docs/ subfolder (old format)
      if (filePath.includes('/docs/')) {
        const fileName = pathParts.slice(2).join('/')
        pathsToTry.push(`${orgId}/${fileName}`)
        pathsToTry.push(`documents/${orgId}/${fileName}`)
      }
    }
  }

  // Try each alternative path
  for (const altPath of pathsToTry) {
    console.log(`Trying alternative path: ${altPath}`)
    const { data: altData, error: altError } = await supabaseAdmin.storage
      .from('documents')
      .download(altPath)

    if (!altError && altData) {
      console.log(`✅ File found at alternative path: ${altPath}`)
      return { data: altData, actualPath: altPath }
    }
  }

  // All paths failed
  return { data: null, actualPath: filePath, error }
}

/**
 * Check if a file exists at the given path, with fallback to alternative paths
 */
export async function fileExistsWithFallback(filePath: string, orgId?: string): Promise<{
  exists: boolean
  actualPath: string
}> {
  if (!supabaseAdmin) {
    return { exists: false, actualPath: filePath }
  }

  // Try to list the file (faster than download for existence check)
  const pathParts = filePath.split('/')
  const fileName = pathParts[pathParts.length - 1]
  const folderPath = pathParts.slice(0, -1).join('/')

  const { data, error } = await supabaseAdmin.storage
    .from('documents')
    .list(folderPath, {
      limit: 100,
      search: fileName
    })

  if (!error && data && data.some(file => file.name === fileName)) {
    return { exists: true, actualPath: filePath }
  }

  // Try alternative paths
  const normalizedPath = normalizeFilePath(filePath, orgId)
  if (normalizedPath !== filePath) {
    const normalizedParts = normalizedPath.split('/')
    const normalizedFileName = normalizedParts[normalizedParts.length - 1]
    const normalizedFolder = normalizedParts.slice(0, -1).join('/')

    const { data: normalizedData, error: normalizedError } = await supabaseAdmin.storage
      .from('documents')
      .list(normalizedFolder, {
        limit: 100,
        search: normalizedFileName
      })

    if (!normalizedError && normalizedData && normalizedData.some(file => file.name === normalizedFileName)) {
      return { exists: true, actualPath: normalizedPath }
    }
  }

  return { exists: false, actualPath: filePath }
}