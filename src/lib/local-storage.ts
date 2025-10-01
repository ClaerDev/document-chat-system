import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

/**
 * Local file storage utility for development
 * Saves files to public/uploads directory
 */

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export interface LocalStorageUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Initialize upload directory
 */
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Upload file to local storage
 */
export async function uploadToLocal(
  file: File,
  organizationId: string
): Promise<LocalStorageUploadResult> {
  try {
    await ensureUploadDir();

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || '';
    const uniqueFilename = `${organizationId}_${nanoid()}.${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    // Return public URL
    const publicUrl = `/uploads/${uniqueFilename}`;

    return {
      success: true,
      url: publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Local storage upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete file from local storage
 */
export async function deleteFromLocal(filePath: string): Promise<boolean> {
  try {
    // Extract filename from URL or path
    const filename = filePath.includes('/uploads/')
      ? path.basename(filePath)
      : path.basename(filePath);

    const fullPath = path.join(UPLOAD_DIR, filename);
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    console.error('Local storage delete error:', error);
    return false;
  }
}

/**
 * Check if file exists in local storage
 */
export async function existsInLocal(filePath: string): Promise<boolean> {
  try {
    const filename = filePath.includes('/uploads/')
      ? path.basename(filePath)
      : path.basename(filePath);

    const fullPath = path.join(UPLOAD_DIR, filename);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}
