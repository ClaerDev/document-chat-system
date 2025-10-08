// Core types for Document Chat System AI

// Re-export Profile types
export * from './profile'

export interface User {
  id: string
  clerkId: string
  email: string
  firstName?: string
  lastName?: string
  imageUrl?: string
  role: UserRole
  organizationId: string

  // User preferences
  timezone?: string
  emailOptIn?: boolean
  lastActiveAt?: Date

  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: Plan
  stripeCustomerId?: string
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID'
  planType?: string
  billingEmail?: string

  // Settings and features
  settings: Record<string, any>
  features: Record<string, any>

  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// Enums
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
export type Plan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
