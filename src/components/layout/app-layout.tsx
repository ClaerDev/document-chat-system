'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { FloatingChat } from '@/components/chat/floating-chat'
import { DonationBanner } from '@/components/donation/donation-banner'

interface AppLayoutProps {
  children: React.ReactNode
  showNavigation?: boolean
}

export function AppLayout({ children, showNavigation = true }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Temporarily disable FloatingChat on documents page to test interference
  const shouldShowFloatingChat = mounted && showNavigation && !pathname.startsWith('/documents')

  if (!showNavigation) {
    return (
      <div className="min-h-screen bg-background">
        <main className="flex-1">
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        showNavigation={showNavigation}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          onMobileMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          showNavigation={showNavigation}
        />

        {/* Donation Banner */}
        <DonationBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Chat - Temporarily disabled on documents page to test interference */}
      {shouldShowFloatingChat && <FloatingChat />}
    </div>
  )
}