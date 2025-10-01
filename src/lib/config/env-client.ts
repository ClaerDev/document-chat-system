/**
 * Client-safe environment configuration
 * 
 * This file exports only the environment variables that are safe to use in the browser.
 * It includes only NEXT_PUBLIC_* variables and other client-safe configurations.
 */

// Client-safe environment variables
export const clientEnv = {
  // Clerk public configuration
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  clerkSignInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
  clerkSignUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up',
  clerkAfterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/dashboard',
  clerkAfterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/onboarding',
  
  // App configuration
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Any other NEXT_PUBLIC_* variables can be added here
} as const

// Type-safe client environment
export type ClientEnv = typeof clientEnv

// Helper to check if we're in production
export const isProduction = clientEnv.nodeEnv === 'production'

// Helper to check if we're in development
export const isDevelopment = clientEnv.nodeEnv === 'development'

// Helper to check if we're in test
export const isTest = clientEnv.nodeEnv === 'test'