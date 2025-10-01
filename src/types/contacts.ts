/**
 * Contact/CRM System Types and Interfaces
 *
 * Comprehensive type definitions for the Contact and CRM system,
 * matching the Prisma schema structure with JSON field interfaces.
 */

import { z } from 'zod'

// =============================================
// CONTACT ENUMS (matching Prisma enums)
// =============================================

export const ContactSource = {
  MANUAL: 'MANUAL',
  EXTRACTED: 'EXTRACTED',
  SAM_GOV: 'SAM_GOV',
  LINKEDIN: 'LINKEDIN',
  WEBSITE: 'WEBSITE',
  OPPORTUNITY_DOC: 'OPPORTUNITY_DOC',
  REFERRAL: 'REFERRAL',
  CONFERENCE: 'CONFERENCE',
  COLD_OUTREACH: 'COLD_OUTREACH',
  IMPORT: 'IMPORT',
} as const

// Re-export contact enums from global-enums.ts for backward compatibility
export {
  ContactRole,
  ContactImportance,
  YearsInRole,
  PreferredContactMethod,
  CommunicationFrequency,
} from '@/types/global-enums'

export const InteractionType = {
  EMAIL: 'EMAIL',
  PHONE_CALL: 'PHONE_CALL',
  VIDEO_CALL: 'VIDEO_CALL',
  IN_PERSON_MEETING: 'IN_PERSON_MEETING',
  CONFERENCE: 'CONFERENCE',
  WEBINAR: 'WEBINAR',
  SITE_VISIT: 'SITE_VISIT',
  PROPOSAL_PRESENTATION: 'PROPOSAL_PRESENTATION',
  FOLLOW_UP: 'FOLLOW_UP',
  INTRODUCTION: 'INTRODUCTION',
  NETWORKING: 'NETWORKING',
  CONTRACT_NEGOTIATION: 'CONTRACT_NEGOTIATION',
  KICKOFF_MEETING: 'KICKOFF_MEETING',
  STATUS_UPDATE: 'STATUS_UPDATE',
  OTHER: 'OTHER',
} as const

export const CommunicationStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  SENDING: 'SENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  OPENED: 'OPENED',
  CLICKED: 'CLICKED',
  REPLIED: 'REPLIED',
  FAILED: 'FAILED',
  BOUNCED: 'BOUNCED',
  SPAM: 'SPAM',
  CANCELLED: 'CANCELLED',
} as const

// Import types from global enums
import type {
  ContactRole as ContactRoleEnum,
  ContactImportance as ContactImportanceEnum,
  YearsInRole as YearsInRoleEnum,
  PreferredContactMethod as PreferredContactMethodEnum,
  CommunicationFrequency as CommunicationFrequencyEnum,
} from '@/types/global-enums'

// Type definitions
export type ContactSourceType =
  (typeof ContactSource)[keyof typeof ContactSource]
export type ContactRoleType = ContactRoleEnum
export type ContactImportanceType = ContactImportanceEnum
export type YearsInRoleType = YearsInRoleEnum
export type PreferredContactMethodType = PreferredContactMethodEnum
export type CommunicationFrequencyType = CommunicationFrequencyEnum
export type InteractionTypeType =
  (typeof InteractionType)[keyof typeof InteractionType]
export type CommunicationStatusType =
  (typeof CommunicationStatus)[keyof typeof CommunicationStatus]

// =============================================
// JSON FIELD INTERFACES
// =============================================

// Agency Information (stored as JSON)
export interface ContactAgencyInfo {
  agency?: string
  agencyAbbreviation?: string // Agency abbreviation (e.g., DOD, NASA, EPA)
  agencyCode?: string
  office?: string
  division?: string
  location?: string
  website?: string
  parentAgency?: string
  agencyType?: 'FEDERAL' | 'STATE' | 'LOCAL' | 'MILITARY' | 'INDEPENDENT'
  contractingAuthority?: boolean
  jurisdiction?: string[]
}

// Address Information (stored as JSON)
export interface ContactAddressInfo {
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  mailStop?: string
  building?: string
  room?: string
  poBox?: string
  isPreferredMailing?: boolean
}

// Professional Information (stored as JSON)
export interface ContactProfessionalInfo {
  role?: ContactRoleType
  importance?: ContactImportanceType
  decisionMaker?: boolean
  influenceLevel?: number // 0-100
  contractAuthority?: boolean
  budgetAuthority?: boolean
  directReports?: number
  teamSize?: number
  contractLimits?: {
    micro?: number // Under $10K
    simplified?: number // $10K-$250K
    fullAndOpen?: number // Over $250K
  }
  clearanceLevel?: string
  clearanceType?: string
}

// Contact Preferences (stored as JSON)
export interface ContactPreferences {
  preferredContact?: import('./global-enums').PreferredContactMethod
  communicationFrequency?: import('./global-enums').CommunicationFrequency
  timeZone?: string
  bestTimeToContact?: string
  unavailableTimes?: string[]
  communicationNotes?: string
  language?: string
  meetingPreference?: 'IN_PERSON' | 'VIDEO' | 'PHONE' | 'ANY'
  responseTimeExpectation?: 'IMMEDIATE' | 'SAME_DAY' | 'WEEK' | 'NO_RUSH'
  formalityLevel?: 'FORMAL' | 'BUSINESS' | 'CASUAL'
}

// Professional Background (stored as JSON)
export interface ContactProfessionalBackground {
  yearsInRole?: number
  yearsInAgency?: number
  totalYearsGovernment?: number
  previousAgencies?: string[]
  previousRoles?: string[]
  specialties?: string[]
  naicsExperience?: string[]
  contractTypes?: string[]
  educationLevel?: string
  degrees?: string[]
  institutions?: string[]
  professionalCertifications?: string[]
  licenses?: string[]
}

// Social/Professional Networks (stored as JSON)
export interface ContactSocialNetworks {
  linkedInUrl?: string
  twitterUrl?: string
  personalWebsite?: string
  professionalBio?: string
  publications?: string[]
  speakingEngagements?: string[]
  professionalMemberships?: string[]
  industryRecognition?: string[]
  mediaPresence?: {
    interviews?: string[]
    articles?: string[]
    quotes?: string[]
  }
}

// AI Enhancement Fields (stored as JSON)
export interface ContactAIEnhancements {
  aiAnalysis?: {
    communicationStyle?: string
    decisionMakingStyle?: string
    priorities?: string[]
    painPoints?: string[]
    motivations?: string[]
    personalityTraits?: string[]
    workStyle?: string
  }
  sentimentAnalysis?: {
    overallSentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
    enthusiasm?: number // 0-100
    engagement?: number // 0-100
    professionalism?: number // 0-100
  }
  engagementPrediction?: {
    score?: number // 0-1
    factors?: string[]
    bestApproach?: string
    recommendedTopics?: string[]
  }
  lastAiAnalysis?: string // ISO date
  aiConfidence?: number // 0-1
}

// Activity Tracking (stored as JSON)
export interface ContactActivityTracking {
  lastContactedAt?: string // ISO date
  lastContactedBy?: string // User ID
  lastContactMethod?: string
  lastResponseAt?: string // ISO date
  responseRate?: number // 0-1
  averageResponseTime?: number // hours
  totalInteractions?: number
  interactionFrequency?: {
    daily?: number
    weekly?: number
    monthly?: number
    quarterly?: number
  }
  engagementPattern?: {
    bestDays?: string[]
    bestTimes?: string[]
    preferredChannels?: string[]
  }
  campaignHistory?: {
    campaignId?: string
    campaignName?: string
    participated?: boolean
    response?: string
    date?: string
  }[]
}

// Notes and Tags (stored as JSON)
export interface ContactNotesAndTags {
  notes?: string
  internalNotes?: string
  tags?: string[]
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status?:
    | 'ACTIVE'
    | 'INACTIVE'
    | 'PROSPECT'
    | 'WARM'
    | 'COLD'
    | 'DO_NOT_CONTACT'
  leadScore?: number // 0-100
  opportunityScore?: number // 0-100
  relationship?:
    | 'NEW'
    | 'PROSPECT'
    | 'CONTACT'
    | 'WARM'
    | 'ADVOCATE'
    | 'CHAMPION'
  nextAction?: string
  nextActionDate?: string // ISO date
  customFields?: Record<string, any>
}

// =============================================
// MAIN CONTACT INTERFACE
// =============================================

export interface Contact {
  id: string
  organizationId: string
  createdById: string
  updatedById?: string
  createdAt: Date | string
  updatedAt: Date | string
  deletedAt?: Date | string

  // Basic Contact Information
  firstName: string
  lastName: string
  email: string
  phone?: string
  title?: string
  alternateEmail?: string
  alternatePhone?: string
  profilePhoto?: string // URL to profile photo in Supabase storage

  // JSON Fields
  agencyInfo?: ContactAgencyInfo
  addressInfo?: ContactAddressInfo
  professionalInfo?: ContactProfessionalInfo
  contactPreferences?: ContactPreferences
  professionalBackground?: ContactProfessionalBackground
  socialNetworks?: ContactSocialNetworks
  aiEnhancements?: ContactAIEnhancements
  activityTracking?: ContactActivityTracking
  notesAndTags?: ContactNotesAndTags

  // Contact Source and Validation
  source: ContactSourceType
  sourceUrl?: string
  sourceDocument?: string
  verified: boolean
  verifiedAt?: Date | string
  verifiedBy?: string

  // Computed fields (not in DB)
  fullName?: string
  displayName?: string
  primaryAgency?: string
  importance?: ContactImportanceType
  lastContactDate?: Date | string
}

// =============================================
// RELATED INTERFACES
// =============================================

export interface ContactOpportunity {
  id: string
  contactId: string
  opportunityId: string
  organizationId: string
  relationship: string
  isPrimary: boolean
  notes?: string
  addedBy?: string
  confidence?: number
  createdAt: Date | string
  updatedAt: Date | string
}

export interface ContactInteraction {
  id: string
  contactId: string
  organizationId: string
  userId: string
  type: InteractionTypeType
  subject?: string
  content?: string
  outcome?: string
  followUpDate?: Date | string
  followUpNotes?: string

  // JSON fields
  interactionContext?: {
    opportunityId?: string
    contractValue?: number
    duration?: number // minutes
    location?: string
    meetingLink?: string
    attendees?: string[]
  }
  sentimentAnalysis?: {
    sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
    confidence?: number
    actionItems?: string[]
    nextSteps?: string[]
    concerns?: string[]
    opportunities?: string[]
  }
  attachments?: {
    fileId?: string
    fileName?: string
    fileType?: string
    fileUrl?: string
  }[]

  createdAt: Date | string
  updatedAt: Date | string
}

export interface Communication {
  id: string
  contactId: string
  organizationId: string
  userId: string
  type: string
  direction: string
  subject?: string
  content?: string
  status: CommunicationStatusType
  sentAt?: Date | string

  // JSON fields
  aiGeneration?: {
    aiGenerated?: boolean
    aiModel?: string
    templateUsed?: string
    promptUsed?: string
    generatedAt?: string
    humanEdited?: boolean
    approvedBy?: string
  }
  trackingData?: {
    deliveredAt?: string
    openedAt?: string
    clickedAt?: string
    repliedAt?: string
    bounced?: boolean
    spamReported?: boolean
    unsubscribed?: boolean
  }
  metadata?: {
    campaignId?: string
    campaignName?: string
    attachments?: any[]
    priority?: string
    tags?: string[]
    customFields?: Record<string, any>
  }

  createdAt: Date | string
  updatedAt: Date | string
}

// =============================================
// SEARCH AND FILTER INTERFACES
// =============================================

export interface ContactSearchFilters {
  query?: string
  firstName?: string
  lastName?: string
  email?: string
  title?: string
  agency?: string
  role?: ContactRoleType[]
  importance?: ContactImportanceType[]
  source?: ContactSourceType[]
  verified?: boolean
  tags?: string[]
  status?: string[]
  priority?: string[]
  lastContactedAfter?: string
  lastContactedBefore?: string
  state?: string[]
  city?: string[]
  hasPhone?: boolean
  hasEmail?: boolean
  hasLinkedIn?: boolean
  engagementScore?: {
    min?: number
    max?: number
  }
}

export interface ContactSearchParams extends ContactSearchFilters {
  sort?:
    | 'firstName'
    | 'lastName'
    | 'title'
    | 'agency'
    | 'lastContactedAt'
    | 'createdAt'
    | 'updatedAt'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
  page?: number
}

// =============================================
// ZOD VALIDATION SCHEMAS
// =============================================

// JSON field schemas
export const ContactAgencyInfoSchema = z
  .object({
    agency: z.string().optional(),
    agencyAbbreviation: z
      .string()
      .optional()
      .describe('Agency abbreviation (e.g., DOD, NASA, EPA)'),
    agencyCode: z.string().optional(),
    office: z.string().optional(),
    division: z.string().optional(),
    location: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    parentAgency: z.string().optional(),
    agencyType: z
      .enum(['FEDERAL', 'STATE', 'LOCAL', 'MILITARY', 'INDEPENDENT'])
      .optional(),
    contractingAuthority: z.boolean().optional(),
    jurisdiction: z.array(z.string()).optional(),
  })
  .describe('Agency and government organization information for the contact')

export const ContactAddressInfoSchema = z
  .object({
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default('USA'),
    mailStop: z.string().optional(),
    building: z.string().optional(),
    room: z.string().optional(),
    poBox: z.string().optional(),
    isPreferredMailing: z.boolean().default(false),
  })
  .describe('Complete address information for the contact')

export const ContactProfessionalInfoSchema = z
  .object({
    role: z
      .enum([
        'CONTRACTING_OFFICER',
        'CONTRACTING_SPECIALIST',
        'PROGRAM_MANAGER',
        'PROJECT_MANAGER',
        'TECHNICAL_LEAD',
        'PROCUREMENT_ANALYST',
        'LEGAL_COUNSEL',
        'BUDGET_ANALYST',
        'SMALL_BUSINESS_LIAISON',
        'SECURITY_OFFICER',
        'IT_DIRECTOR',
        'CHIEF_INFORMATION_OFFICER',
        'DEPUTY_DIRECTOR',
        'DIRECTOR',
        'ASSISTANT_SECRETARY',
        'SECRETARY',
        'ADMINISTRATOR',
        'COMMISSIONER',
        'OTHER',
      ])
      .optional(),
    importance: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    decisionMaker: z.boolean().default(false),
    influenceLevel: z.number().min(0).max(100).default(50),
    contractAuthority: z.boolean().default(false),
    budgetAuthority: z.boolean().default(false),
    directReports: z.number().min(0).optional(),
    teamSize: z.number().min(0).optional(),
    contractLimits: z
      .object({
        micro: z.number().optional(),
        simplified: z.number().optional(),
        fullAndOpen: z.number().optional(),
      })
      .optional(),
    clearanceLevel: z.string().optional(),
    clearanceType: z.string().optional(),
  })
  .describe('Professional role and authority information')

export const ContactPreferencesSchema = z
  .object({
    preferredContact: z
      .enum(['EMAIL', 'PHONE', 'MAIL', 'VIDEO', 'TEXT'])
      .default('EMAIL'),
    timeZone: z.string().optional(),
    bestTimeToContact: z.string().optional(),
    unavailableTimes: z.array(z.string()).default([]),
    communicationNotes: z.string().optional(),
    language: z.string().default('English'),
    meetingPreference: z
      .enum(['IN_PERSON', 'VIDEO', 'PHONE', 'ANY'])
      .default('ANY'),
    responseTimeExpectation: z
      .enum(['IMMEDIATE', 'SAME_DAY', 'WEEK', 'NO_RUSH'])
      .default('SAME_DAY'),
    formalityLevel: z
      .enum(['FORMAL', 'BUSINESS', 'CASUAL'])
      .default('BUSINESS'),
  })
  .describe('Communication preferences and contact timing')

// Main Contact schema
export const ContactSchema = z
  .object({
    id: z.string().cuid().optional(),
    organizationId: z
      .string()
      .describe('Organization ID this contact belongs to'),
    createdById: z.string().describe('User ID who created this contact'),
    updatedById: z.string().optional(),

    // Basic Contact Information
    firstName: z
      .string()
      .min(1, 'First name is required')
      .describe("Contact's first name"),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .describe("Contact's last name"),
    email: z
      .string()
      .email()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    phone: z.string().optional(),
    title: z.string().optional().describe('Job title or position'),
    alternateEmail: z
      .string()
      .email()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    alternatePhone: z.string().optional(),
    profilePhoto: z
      .string()
      .url()
      .optional()
      .or(z.literal('').transform(() => undefined))
      .describe(
        'URL to contact profile photo in Supabase storage. Used for contact personalization and relationship building.'
      ),

    // JSON Fields
    agencyInfo: ContactAgencyInfoSchema.optional(),
    addressInfo: ContactAddressInfoSchema.optional(),
    professionalInfo: ContactProfessionalInfoSchema.optional(),
    contactPreferences: ContactPreferencesSchema.optional(),
    professionalBackground: z.any().optional(), // More flexible for complex nested data
    socialNetworks: z.any().optional(),
    aiEnhancements: z.any().optional(),
    activityTracking: z.any().optional(),
    notesAndTags: z.any().optional(),

    // Source and Validation
    source: z.nativeEnum(ContactSource).default('MANUAL'),
    sourceUrl: z.string().url().optional().or(z.literal('')),
    sourceDocument: z.string().optional(),
    verified: z.boolean().default(false),
    verifiedAt: z.date().optional(),
    verifiedBy: z.string().optional(),

    // Timestamps
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
    deletedAt: z.date().optional(),
  })
  .describe('Complete contact information for CRM system')

// Create and Update schemas
export const CreateContactSchema = ContactSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).describe('Schema for creating a new contact')

export const UpdateContactSchema = CreateContactSchema.partial()
  .omit({
    organizationId: true,
    createdById: true,
  })
  .extend({
    updatedById: z.string().optional(),
  })
  .describe('Schema for updating an existing contact')

// Search schema
export const ContactSearchSchema = z
  .object({
    query: z
      .string()
      .optional()
      .describe('Search query across name, email, title, and agency'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    agency: z.string().optional(),
    role: z
      .array(
        z.enum([
          'CONTRACTING_OFFICER',
          'CONTRACTING_SPECIALIST',
          'PROGRAM_MANAGER',
          'PROJECT_MANAGER',
          'TECHNICAL_LEAD',
          'PROCUREMENT_ANALYST',
          'LEGAL_COUNSEL',
          'BUDGET_ANALYST',
          'SMALL_BUSINESS_LIAISON',
          'SECURITY_OFFICER',
          'IT_DIRECTOR',
          'CHIEF_INFORMATION_OFFICER',
          'DEPUTY_DIRECTOR',
          'DIRECTOR',
          'ASSISTANT_SECRETARY',
          'SECRETARY',
          'ADMINISTRATOR',
          'COMMISSIONER',
          'OTHER',
        ])
      )
      .optional(),
    importance: z
      .array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']))
      .optional(),
    source: z.array(z.nativeEnum(ContactSource)).optional(),
    verified: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    status: z.array(z.string()).optional(),
    priority: z.array(z.string()).optional(),
    lastContactedAfter: z.string().datetime().optional(),
    lastContactedBefore: z.string().datetime().optional(),
    state: z.array(z.string()).optional(),
    city: z.array(z.string()).optional(),
    hasPhone: z.boolean().optional(),
    hasEmail: z.boolean().optional(),
    hasLinkedIn: z.boolean().optional(),
    engagementScore: z
      .object({
        min: z.number().min(0).max(1).optional(),
        max: z.number().min(0).max(1).optional(),
      })
      .optional(),

    // Pagination
    sort: z
      .enum([
        'firstName',
        'lastName',
        'title',
        'agency',
        'lastContactedAt',
        'createdAt',
        'updatedAt',
      ])
      .default('lastName'),
    order: z.enum(['asc', 'desc']).default('asc'),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
    page: z.number().min(1).optional(),
  })
  .describe('Schema for contact search and filtering')

// Communication schemas
export const CreateCommunicationSchema = z
  .object({
    contactId: z.string().cuid(),
    type: z.enum(['EMAIL', 'PHONE', 'LETTER', 'IN_PERSON']).default('EMAIL'),
    direction: z.enum(['OUTBOUND', 'INBOUND']).default('OUTBOUND'),
    subject: z.string().optional(),
    content: z.string().optional(),
    aiGeneration: z.any().optional(),
    metadata: z.any().optional(),
  })
  .describe('Schema for creating communications')

export const CreateInteractionSchema = z
  .object({
    contactId: z.string().cuid(),
    type: z.nativeEnum(InteractionType),
    subject: z.string().optional(),
    content: z.string().optional(),
    outcome: z.string().optional(),
    followUpDate: z.date().optional(),
    followUpNotes: z.string().optional(),
    interactionContext: z.any().optional(),
    sentimentAnalysis: z.any().optional(),
    attachments: z.any().optional(),
  })
  .describe('Schema for creating contact interactions')

// Export all types for convenience
export type CreateContactData = z.infer<typeof CreateContactSchema>
export type UpdateContactData = z.infer<typeof UpdateContactSchema>
export type ContactSearchData = z.infer<typeof ContactSearchSchema>
export type CreateCommunicationData = z.infer<typeof CreateCommunicationSchema>
export type CreateInteractionData = z.infer<typeof CreateInteractionSchema>

// =============================================
// GENERIC API RESPONSE TYPES
// =============================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
  error?: string
}
