import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LandingPageClient } from '@/components/landing-page-client'

// Cache the landing page for 5 minutes
export const revalidate = 300

export default async function HomePage() {
  const { userId } = await auth()
  
  // If user is authenticated, redirect to dashboard
  if (userId) {
    redirect('/dashboard')
  }

  return <LandingPageClient />
}