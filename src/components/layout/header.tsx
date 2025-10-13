'use client'

import React from 'react'
import { UserButton, useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { HeaderSearch } from './header-search'
import { NotificationBadge } from '@/components/ui/notification-badge'
import { Menu } from 'lucide-react'

interface HeaderProps {
  onMobileMenuToggle?: () => void
  showNavigation?: boolean
}

export function Header({ onMobileMenuToggle, showNavigation = true }: HeaderProps) {
  const { isSignedIn } = useAuth()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-[52px] z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo and mobile menu */}
          <div className="flex items-center gap-4">
            {onMobileMenuToggle && showNavigation && (
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={onMobileMenuToggle}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            )}
            
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-government to-government/80 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">DC</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-government to-government/80 bg-clip-text text-transparent">
                  Document Chat
                </h1>
              </div>
            </div>
          </div>

          {/* Search */}
          <HeaderSearch />

          {/* Right side - Actions and user menu */}
          <div className="flex items-center gap-3">

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <NotificationBadge />

            {/* User menu */}
            {mounted && isSignedIn && (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-9 h-9 rounded-full',
                  },
                }}
                afterSignOutUrl="/"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}