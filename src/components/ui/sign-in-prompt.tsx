'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignInButton } from '@clerk/nextjs'
import { LogIn, Shield } from 'lucide-react'
import { useTheme } from 'next-themes'

interface SignInPromptProps {
  title?: string
  description?: string
  feature?: string
}

export function SignInPrompt({ 
  title = "Authentication Required",
  description = "Please sign in to access government contracting features",
  feature = "this feature"
}: SignInPromptProps) {
  const { theme } = useTheme()

  return (
    <Card className="w-full max-w-md mx-auto border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg bg-white dark:bg-gray-900">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-6 transition-colors duration-150">
          <Shield className="h-8 w-8 text-primary dark:text-primary-400" />
        </div>
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <SignInButton mode="modal" forceRedirectUrl="/dashboard">
          <Button 
            className="w-full bg-primary-700 hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-700 text-white font-medium transition-all duration-150 hover:shadow-lg" 
            size="lg"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign In to GovMatch AI
          </Button>
        </SignInButton>
        
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          New to government contracting?{' '}
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            <button className="text-primary-700 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded">
              Start your free trial
            </button>
          </SignInButton>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            Secure access to federal contracting opportunities with enterprise-grade authentication.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}