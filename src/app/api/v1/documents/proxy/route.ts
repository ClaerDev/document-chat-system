/**
 * Document Proxy API
 * 
 * Proxies document requests to SAM.gov to bypass CSP restrictions.
 * This allows secure document access without exposing external URLs to CSP violations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

const ProxySchema = z.object({
  url: z.string().url().describe("Document URL to proxy")
});

/**
 * @swagger
 * /api/v1/documents/proxy:
 *   get:
 *     summary: Proxy document requests to external sources
 *     description: Bypasses CSP restrictions by proxying document requests through our server
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: Document URL to proxy
 *     responses:
 *       200:
 *         description: Document content
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request - invalid URL
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - URL not allowed
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const rawUrl = searchParams.get('url');
    
    console.log('🔗 Proxy request received:', {
      rawUrl,
      hasUrl: !!rawUrl,
      urlLength: rawUrl?.length,
      requestUrl: request.url
    });
    
    const { url } = ProxySchema.parse({
      url: rawUrl
    });

    // Security: Only allow specific domains for document proxying
    const allowedDomains = [
      'sam.gov',
      'api.sam.gov',
      'beta.sam.gov'
    ];

    const urlObj = new URL(url);
    const isAllowed = allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Domain not allowed' },
        { status: 403 }
      );
    }

    // Enhanced headers for SAM.gov compatibility
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/pdf,application/octet-stream,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
    };

    // Add referrer for SAM.gov requests
    if (urlObj.hostname.includes('sam.gov')) {
      fetchHeaders['Referer'] = 'https://sam.gov/';
      fetchHeaders['Origin'] = 'https://sam.gov';
    }

    console.log(`🔗 Proxying request to: ${url}`);
    console.log(`📋 Request headers:`, fetchHeaders);

    // Fetch the document from the external source
    const response = await fetch(url, {
      headers: fetchHeaders,
      method: 'GET',
      redirect: 'follow',
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 seconds
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // Enhanced error logging for debugging
      const responseText = await response.text().catch(() => 'Could not read response body');
      console.error(`❌ Proxy request failed:`, {
        url,
        status: response.status,
        statusText: response.statusText,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBody: responseText.substring(0, 500) // First 500 chars for debugging
      });

      if (response.status === 404) {
        return NextResponse.json(
          { success: false, error: 'Document not found' },
          { status: 404 }
        );
      }
      
      if (response.status === 403) {
        return NextResponse.json(
          { success: false, error: 'Access denied by remote server' },
          { status: 403 }
        );
      }
      
      if (response.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Authentication required by remote server' },
          { status: 401 }
        );
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${responseText.substring(0, 100)}`);
    }

    // Get the content type from the response
    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // SAM.gov often returns application/octet-stream for PDF files
    // Enhance MIME type detection based on URL and actual content
    if (contentType === 'application/octet-stream' || contentType === 'application/binary') {
      // Extract file extension from URL
      const urlPath = urlObj.pathname.toLowerCase();
      
      if (urlPath.includes('.pdf') || urlPath.includes('pdf')) {
        contentType = 'application/pdf';
        console.log('📄 Enhanced MIME type detection: Detected PDF from URL pattern');
      } else if (urlPath.includes('.doc') || urlPath.includes('.docx')) {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        console.log('📄 Enhanced MIME type detection: Detected Word document from URL pattern');
      } else if (urlPath.includes('.xls') || urlPath.includes('.xlsx')) {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        console.log('📄 Enhanced MIME type detection: Detected Excel document from URL pattern');
      } else if (urlPath.includes('.txt')) {
        contentType = 'text/plain';
        console.log('📄 Enhanced MIME type detection: Detected text file from URL pattern');
      }
      
      // Check if the URL contains common SAM.gov PDF indicators
      if (contentType === 'application/octet-stream' && (
        urlPath.includes('solicitation') || 
        urlPath.includes('attachment') || 
        urlPath.includes('document') ||
        urlObj.hostname.includes('sam.gov')
      )) {
        // Most SAM.gov documents are PDFs, default to PDF for government documents
        contentType = 'application/pdf';
        console.log('📄 Enhanced MIME type detection: Defaulting to PDF for SAM.gov document');
      }
    }
    
    const contentLength = response.headers.get('content-length');

    // Stream the response body
    const body = response.body;
    
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Empty response body' },
        { status: 500 }
      );
    }

    // Create response with appropriate headers
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*',
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    // Add content disposition for downloads
    if (contentType.includes('pdf') || contentType.includes('application/')) {
      const filename = url.split('/').pop() || 'document';
      headers['Content-Disposition'] = `inline; filename="${filename}"`;
    }

    return new NextResponse(body, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Document proxy error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid URL parameter',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}