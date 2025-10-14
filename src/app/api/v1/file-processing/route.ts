import { NextRequest, NextResponse } from 'next/server';
import { fileProcessor } from '@/lib/file-processing';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Process with server-side file processor
    const result = await fileProcessor.processFileWithFallback(
      buffer,
      file.type || 'application/octet-stream',
      {
        maxTextLength: 2000000, // 2M chars max - enough for large PDFs
        extractMetadata: true,
        timeout: 60000 // Increase timeout for large files
      }
    );

    return NextResponse.json({
      success: result.success,
      text: result.text,
      metadata: result.metadata,
      processing: result.processing,
      error: result.error
    });

  } catch (error) {
    console.error('File processing API error:', error);
    return NextResponse.json(
      { 
        error: 'File processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}