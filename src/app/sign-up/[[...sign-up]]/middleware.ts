import { NextRequest, NextResponse } from 'next/server'
import { authSecurityHeaders } from '@/lib/security-headers'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Apply very permissive security headers for Clerk auth
  Object.entries(authSecurityHeaders).forEach(([key, value]) => {
    if (value) {
      const headerName = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      response.headers.set(headerName, value)
    }
  })
  
  return response
}

export const config = {
  matcher: '/sign-up/:path*'
}