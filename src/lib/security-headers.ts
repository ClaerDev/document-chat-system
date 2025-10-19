import { NextRequest, NextResponse } from 'next/server'
import { security, thirdParty, app } from '@/lib/config/env';

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string
  crossOriginEmbedderPolicy?: string
  crossOriginOpenerPolicy?: string
  crossOriginResourcePolicy?: string
  referrerPolicy?: string
  strictTransportSecurity?: string
  xContentTypeOptions?: string
  xDnsPrefetchControl?: string
  xDownloadOptions?: string
  xFrameOptions?: string
  xPermittedCrossDomainPolicies?: string
  xXssProtection?: string
  permissionsPolicy?: string
}

// Default security headers configuration
export const defaultSecurityHeaders: SecurityHeadersConfig = {
  // Content Security Policy - Strict policy for XSS protection
  contentSecurityPolicy: [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${thirdParty.clerkFrontendApi} https://clerk.dev https://*.clerk.accounts.dev https://supreme-tadpole-66.clerk.accounts.dev ${thirdParty.stripePublishableKeyDomain} ${thirdParty.captchaDomains.join(' ')} https://challenges.cloudflare.com https://assets.turnstile.com https://cdnjs.cloudflare.com https://unpkg.com https://*.cloudflareaccess.com https://va.vercel-scripts.com`, // Allow Clerk, Stripe, CAPTCHA services, Vercel Analytics, and unpkg for PDF.js
    "worker-src 'self' blob:", // Allow web workers from blob URLs (needed for Clerk)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.clerk.accounts.dev https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: https: blob: https://*.ytimg.com https://*.ggpht.com https://*.googleusercontent.com",
    "media-src 'self' blob: data: https: https://www.youtube.com https://youtube.com https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com", // Allow media from blob URLs and YouTube
    `connect-src 'self' ${thirdParty.clerkFrontendApi} https://clerk.dev https://*.clerk.accounts.dev https://supreme-tadpole-66.clerk.accounts.dev https://clerk-telemetry.com https://api.stripe.com https://*.stripe.com wss://clerk.dev wss://*.clerk.accounts.dev ${thirdParty.captchaDomains.join(' ')} https://challenges.cloudflare.com https://assets.turnstile.com https://*.ingest.sentry.io https://www.youtube.com https://youtube.com https://*.youtube.com https://*.youtube-nocookie.com https://*.googlevideo.com https://*.googleapis.com https://*.gstatic.com https://*.ggpht.com https://va.vercel-scripts.com https://vitals.vercel-insights.com`,
    `frame-src 'self' ${thirdParty.stripePublishableKeyDomain} https://checkout.stripe.com https://*.stripe.com https://*.clerk.accounts.dev ${thirdParty.captchaDomains.join(' ')} https://challenges.cloudflare.com https://www.youtube.com https://youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://*.youtube-nocookie.com https://player.vimeo.com https://vimeo.com https://www.dailymotion.com https://dailymotion.com https://fast.wistia.net https://wistia.com https://www.loom.com https://loom.com https://player.twitch.tv https://twitch.tv https://www.instagram.com https://instagram.com https://www.tiktok.com https://tiktok.com https://*.gov https://*.mil https://www.acq.osd.mil https://sam.gov https://www.sam.gov https://www.fbo.gov https://www.gsa.gov https://www.usaspending.gov https://www.fpds.gov https://beta.sam.gov`,
    "object-src 'self' blob: data: https://*.gov https://*.mil",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),

  // Cross-Origin policies - relaxed for Clerk and YouTube compatibility
  crossOriginEmbedderPolicy: 'unsafe-none', // Allow cross-origin resources for Clerk and YouTube
  crossOriginOpenerPolicy: 'same-origin-allow-popups', // Allow popups for OAuth
  crossOriginResourcePolicy: 'cross-origin', // Allow cross-origin resources

  // Referrer policy
  referrerPolicy: 'strict-origin-when-cross-origin',

  // HTTPS enforcement (only in production)
  strictTransportSecurity: app.nodeEnv === 'production' 
    ? `max-age=${security.hstsMaxAge}; includeSubDomains; preload` 
    : undefined,

  // Content type protection
  xContentTypeOptions: 'nosniff',

  // DNS prefetch control
  xDnsPrefetchControl: 'off',

  // Download options for IE
  xDownloadOptions: 'noopen',

  // Frame options - allow same origin for Clerk components
  xFrameOptions: 'SAMEORIGIN',

  // Cross-domain policies
  xPermittedCrossDomainPolicies: 'none',

  // XSS protection for older browsers
  xXssProtection: '1; mode=block',

  // Permissions policy - restrict dangerous APIs but allow YouTube functionality
  permissionsPolicy: [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=*', // Allow payments for Stripe integration
    'usb=()',
    'bluetooth=()',
    'accelerometer=*', // Allow for YouTube video controls and auto-rotation
    'gyroscope=*', // Allow for YouTube video controls and device orientation
    'magnetometer=()',
    'ambient-light-sensor=()',
    'clipboard-read=()',
    'clipboard-write=*', // Allow YouTube share functionality
    'display-capture=()',
    'fullscreen=*', // Already allows fullscreen for YouTube
    'web-share=*', // Allow YouTube video sharing
    'encrypted-media=*', // Required for YouTube premium/protected content
    'picture-in-picture=*' // Allow YouTube picture-in-picture mode
  ].join(', ')
}

// Development-specific headers (more permissive)
export const developmentSecurityHeaders: SecurityHeadersConfig = {
  ...defaultSecurityHeaders,
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.clerk.dev https://clerk.dev https://*.clerk.accounts.dev https://supreme-tadpole-66.clerk.accounts.dev https://js.stripe.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://hcaptcha.com https://*.hcaptcha.com https://challenges.cloudflare.com https://assets.turnstile.com https://cdnjs.cloudflare.com https://unpkg.com https://*.cloudflareaccess.com https://va.vercel-scripts.com",
    "worker-src 'self' blob:", // Allow web workers from blob URLs (needed for Clerk)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.clerk.accounts.dev https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: https: blob: https://*.ytimg.com https://*.ggpht.com https://*.googleusercontent.com",
    "media-src 'self' blob: data: https: https://www.youtube.com https://youtube.com https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com", // Allow media from blob URLs and YouTube
    "connect-src 'self' https://api.clerk.dev https://clerk.dev https://*.clerk.accounts.dev https://supreme-tadpole-66.clerk.accounts.dev https://clerk-telemetry.com https://api.stripe.com https://*.stripe.com wss://clerk.dev wss://*.clerk.accounts.dev ws://localhost:* http://localhost:* https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://hcaptcha.com https://*.hcaptcha.com https://challenges.cloudflare.com https://assets.turnstile.com https://*.ingest.sentry.io https://www.youtube.com https://youtube.com https://*.youtube.com https://*.youtube-nocookie.com https://*.googlevideo.com https://*.googleapis.com https://*.gstatic.com https://*.ggpht.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://*.stripe.com https://*.clerk.accounts.dev https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://hcaptcha.com https://*.hcaptcha.com https://challenges.cloudflare.com https://www.youtube.com https://youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://*.youtube-nocookie.com https://player.vimeo.com https://vimeo.com https://www.dailymotion.com https://dailymotion.com https://fast.wistia.net https://wistia.com https://www.loom.com https://loom.com https://player.twitch.tv https://twitch.tv https://www.instagram.com https://instagram.com https://www.tiktok.com https://tiktok.com https://*.gov https://*.mil https://www.acq.osd.mil https://sam.gov https://www.sam.gov https://www.fbo.gov https://www.gsa.gov https://www.usaspending.gov https://www.fpds.gov https://beta.sam.gov",
    "object-src 'self' blob: data: https://*.gov https://*.mil",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  strictTransportSecurity: undefined, // Don't enforce HTTPS in development
}

// API-specific headers (more permissive for CORS)
export const apiSecurityHeaders: SecurityHeadersConfig = {
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'SAMEORIGIN',
  xXssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  crossOriginResourcePolicy: 'cross-origin', // Allow cross-origin for API
}

// Auth-specific headers (most permissive for Clerk CAPTCHA)
export const authSecurityHeaders: SecurityHeadersConfig = {
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:", // Very permissive for scripts
    "worker-src 'self' blob: data:",
    "style-src 'self' 'unsafe-inline' https: data:",
    "font-src 'self' https: data:",
    "img-src 'self' data: https: blob: https://*.ytimg.com https://*.ggpht.com https://*.googleusercontent.com",
    "media-src 'self' blob: data: https: https://www.youtube.com https://youtube.com https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com", // Allow media from blob URLs and YouTube
    "connect-src 'self' https: wss: ws:",
    "frame-src 'self' https:",
    "object-src 'self' blob: data: https://*.gov https://*.mil",
    "base-uri 'self'",
    "form-action 'self' https:",
    "frame-ancestors 'self'"
  ].join('; '),
  crossOriginEmbedderPolicy: 'unsafe-none',
  crossOriginOpenerPolicy: 'unsafe-none',
  crossOriginResourcePolicy: 'cross-origin',
  referrerPolicy: 'no-referrer-when-downgrade',
  xFrameOptions: 'SAMEORIGIN',
  xContentTypeOptions: 'nosniff',
  xXssProtection: '1; mode=block'
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = defaultSecurityHeaders
): NextResponse {
  // Apply each security header
  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      // Convert camelCase to kebab-case
      const headerName = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      response.headers.set(headerName, value)
    }
  })

  return response
}

/**
 * Middleware function to apply security headers
 */
export function withSecurityHeaders(
  config?: SecurityHeadersConfig
) {
  return (request: NextRequest, response: NextResponse): NextResponse => {
    const isDevelopment = app.nodeEnv === 'development'
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
    
    let headersConfig: SecurityHeadersConfig
    
    if (isApiRoute) {
      headersConfig = { ...apiSecurityHeaders, ...config }
    } else if (isDevelopment) {
      headersConfig = { ...developmentSecurityHeaders, ...config }
    } else {
      headersConfig = { ...defaultSecurityHeaders, ...config }
    }
    
    return applySecurityHeaders(response, headersConfig)
  }
}

/**
 * Create a CSP nonce for inline scripts
 */
export function generateCSPNonce(): string {
  // Generate a cryptographically secure random nonce
  const array = new Uint8Array(security.cspNonceSize)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

/**
 * CSP violation reporting endpoint helper
 */
export interface CSPViolationReport {
  'document-uri': string
  referrer: string
  'violated-directive': string
  'effective-directive': string
  'original-policy': string
  disposition: string
  'blocked-uri': string
  'line-number': number
  'column-number': number
  'source-file': string
  'status-code': number
  'script-sample': string
}

/**
 * Handle CSP violation reports
 */
export function handleCSPViolation(report: CSPViolationReport): void {
  // Log CSP violations for security monitoring
  console.warn('CSP Violation Report:', {
    documentUri: report['document-uri'],
    violatedDirective: report['violated-directive'],
    blockedUri: report['blocked-uri'],
    sourceFile: report['source-file'],
    lineNumber: report['line-number'],
    timestamp: new Date().toISOString()
  })

  // In production, you might want to send this to a security monitoring service
  if (app.nodeEnv === 'production') {
    // Example: Send to monitoring service
    // monitoringService.reportCSPViolation(report)
  }
}

/**
 * Validate and sanitize URLs for CSP
 */
export function sanitizeCSPUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    
    // Only allow https URLs (except localhost in development)
    if (parsedUrl.protocol !== 'https:' && 
        !(app.nodeEnv === 'development' && parsedUrl.hostname === 'localhost')) {
      throw new Error('Only HTTPS URLs are allowed')
    }
    
    // Remove any potential XSS payloads from URLs
    const cleanUrl = parsedUrl.toString().replace(/[<>"']/g, '')
    
    return cleanUrl
  } catch (error) {
    throw new Error(`Invalid URL for CSP: ${url}`)
  }
}

/**
 * Security headers validation
 */
export function validateSecurityHeaders(headers: SecurityHeadersConfig): void {
  // Validate CSP
  if (headers.contentSecurityPolicy) {
    // Check for unsafe directives
    const unsafePatterns = /'unsafe-inline'|'unsafe-eval'|data:/g
    const matches = headers.contentSecurityPolicy.match(unsafePatterns)
    
    if (matches && app.nodeEnv === 'production') {
      console.warn('Potentially unsafe CSP directives detected:', matches)
    }
  }
  
  // Validate HSTS
  if (headers.strictTransportSecurity && app.nodeEnv === 'production') {
    if (!headers.strictTransportSecurity.includes('max-age=')) {
      throw new Error('HSTS header must include max-age directive')
    }
  }
}

/**
 * Get security headers for different contexts
 */
export function getSecurityHeaders(context: 'web' | 'api' | 'webhook' | 'auth' = 'web'): SecurityHeadersConfig {
  switch (context) {
    case 'api':
      return apiSecurityHeaders
    case 'webhook':
      return {
        xContentTypeOptions: 'nosniff',
        xFrameOptions: 'SAMEORIGIN',
        referrerPolicy: 'no-referrer'
      }
    case 'auth':
      return authSecurityHeaders
    case 'web':
    default:
      return app.nodeEnv === 'development' 
        ? developmentSecurityHeaders 
        : defaultSecurityHeaders
  }
}