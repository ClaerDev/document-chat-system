import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { LoadingProvider } from '@/components/providers/loading-provider'
import { NotificationProvider } from '@/contexts/notification-context'
import { BadgeNotificationProvider } from '@/contexts/badge-notification-context'
import { GlobalErrorProvider } from '@/contexts/global-error-context'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Document Chat System - AI-Powered Document Management',
  description: 'Intelligent document management and chat system powered by AI.'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className} suppressHydrationWarning={true}>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              themes={['light', 'dark', 'theme-govmatch', 'system']}
              disableTransitionOnChange
            >
              <LoadingProvider>
                <NotificationProvider>
                  <GlobalErrorProvider>
                    <BadgeNotificationProvider>
                      <div className="min-h-screen bg-background">
                        {children}
                      </div>
                    </BadgeNotificationProvider>
                  </GlobalErrorProvider>
                </NotificationProvider>
              </LoadingProvider>
            </ThemeProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}