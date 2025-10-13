'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, X } from 'lucide-react'

interface DonationBannerProps {
  email?: string
  itemName?: string
  currency?: string
}

export function DonationBanner({
  email = process.env.NEXT_PUBLIC_PAYPAL_EMAIL || '',
  itemName = 'Support Document Chat - Free AI Models',
  currency = 'USD'
}: DonationBannerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Don't render if no email is configured
  if (!email) {
    return null
  }

  useEffect(() => {
    setIsMounted(true)
    // Check if banner was dismissed
    const dismissed = localStorage.getItem('donation-banner-dismissed')
    if (!dismissed) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem('donation-banner-dismissed', 'true')
  }

  const handleDonate = () => {
    const donateUrl = `https://www.paypal.com/donate/?business=${encodeURIComponent(email)}&item_name=${encodeURIComponent(itemName)}&currency_code=${currency}`
    window.open(donateUrl, '_blank')
  }

  // Prevent SSR mismatch by not rendering until mounted
  if (!isMounted || !isVisible) {
    return null
  }

  return (
    <div className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
          {/* Message Section */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Heart className="h-5 w-5 flex-shrink-0 text-red-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                <span className="hidden sm:inline">Help us keep AI models free for everyone! </span>
                <span className="sm:hidden">Support free AI access </span>
                <span className="text-blue-100">Your donations cover API costs.</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleDonate}
              size="sm"
              variant="secondary"
              className="bg-white text-blue-700 hover:bg-blue-50 font-medium whitespace-nowrap"
            >
              <Heart className="h-3.5 w-3.5 mr-1.5" />
              Donate
            </Button>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-blue-800/50 h-8 w-8 p-0"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
