/**
 * Global Enums - Shared across the entire application
 * 
 * This file contains enums that are used across opportunities, profiles, contacts,
 * and all other data structures. These enums ensure consistency and provide a 
 * single source of truth for shared fields with comprehensive metadata.
 */

// Re-export shared enums from opportunity-enums.ts for consistency
export { SecurityClearanceLevel, ContractType, SetAsideType, OpportunityType } from './opportunity-enums'

// =============================================
// DATA SOURCES (Global)
// =============================================

/**
 * Global data source enum with comprehensive metadata
 * Used for contacts, opportunities, and all external data sources
 */
export const DATA_SOURCE = {
  // Primary External Sources
  SAM_GOV: {
    id: 'SAM_GOV',
    name: 'SAM.gov',
    description: 'System for Award Management - Official U.S. Government contracting platform providing comprehensive federal contracting opportunities, entity registration, and exclusions data',
    category: 'government',
    isExternal: true,
    isRealTime: true,
    logoUrl: '/images/sources/sam-gov.png',
    website: 'https://sam.gov',
    reliability: 95,
    // API Configuration
    apiConfig: {
      baseUrl: 'https://api.sam.gov',
      versions: ['v1', 'v2', 'v3', 'v4'],
      primaryEndpoints: {
        opportunities: 'https://api.sam.gov/prod/opportunities/v2/search',
        entities: 'https://api.sam.gov/entity-information/v2/entities',
        exclusions: 'https://api.sam.gov/entity-information/v4/exclusions',
        hierarchy: 'https://api.sam.gov/prod/federalHierarchy/v1/api',
      },
      testEndpoints: {
        opportunities: 'https://api-alpha.sam.gov/prodlike/opportunities/v2/search',
        entities: 'https://api-alpha.sam.gov/entity-information/v2/entities',
      },
      authentication: {
        type: 'api_key',
        keyLocation: 'query_parameter',
        keyName: 'api_key',
        requiresRegistration: true,
        additionalAuth: 'basic_auth_for_sensitive_data',
      },
      rateLimit: {
        requestsPerHour: 1000, // Estimated based on government API standards
        burstLimit: 100,
        resetPeriod: '1 hour',
      },
      documentation: 'https://open.gsa.gov/api/',
      supportEmail: 'api.support@gsa.gov',
      statusPage: 'https://sam.gov/help',
    },
    dataTypes: ['opportunities', 'entities', 'exclusions', 'hierarchy', 'awards'],
    coverage: 'All U.S. federal government opportunities and registrations',
    updateFrequency: 'Real-time',
    costPerRequest: 0, // Free government API
  },
  GRANTS_GOV: {
    id: 'GRANTS_GOV',
    name: 'Grants.gov',
    description: 'Official federal grants repository managed by HHS, providing comprehensive federal grant opportunities and application services',
    category: 'government',
    isExternal: true,
    isRealTime: true,
    logoUrl: '/images/sources/grants-gov.png',
    website: 'https://grants.gov',
    reliability: 92,
    // API Configuration
    apiConfig: {
      baseUrl: 'https://www.grants.gov/grantsws',
      versions: ['v2'],
      primaryEndpoints: {
        search: 'https://www.grants.gov/grantsws/rest/opportunities/search',
        details: 'https://www.grants.gov/grantsws/rest/opportunity/details',
        totals: 'https://www.grants.gov/grantsws/rest/opportunities/totals',
      },
      authentication: {
        type: 'api_key', // For system-to-system APIs
        keyLocation: 'header',
        keyName: 'Authorization',
        keyFormat: 'APIKEY=your-api-key',
        publicEndpoints: true, // Some endpoints don't require auth
        requiresRegistration: true,
      },
      rateLimit: {
        requestsPerHour: 1000, // Estimated
        burstLimit: 100,
        resetPeriod: '1 hour',
      },
      documentation: 'https://grants.gov/api/api-guide',
      supportEmail: 'support@grants.gov',
      statusPage: 'https://grants.gov',
    },
    dataTypes: ['grants', 'funding_opportunities', 'cfda_numbers'],
    coverage: 'All U.S. federal grant opportunities',
    updateFrequency: 'Daily',
    costPerRequest: 0, // Free government API
  },
  HIGHERGOV: {
    id: 'HIGHERGOV',
    name: 'HigherGov',
    description: 'Private government market intelligence platform providing comprehensive contract and grant opportunity data from 300+ fields across federal, state, and local levels',
    category: 'commercial',
    isExternal: true,
    isRealTime: true,
    logoUrl: '/images/sources/highergov.png',
    website: 'https://highergov.com',
    reliability: 88,
    // API Configuration
    apiConfig: {
      baseUrl: 'https://www.highergov.com/api',
      versions: ['v1'],
      primaryEndpoints: {
        contracts: 'https://www.highergov.com/api/contract/',
        opportunities: 'https://www.highergov.com/api-external/opportunity/',
        documents: 'https://www.highergov.com/api/document/',
      },
      authentication: {
        type: 'api_key',
        keyLocation: 'parameter',
        keyName: 'api_key',
        requiresRegistration: true,
        inviteOnly: true,
      },
      rateLimit: {
        requestsPerHour: 500, // Estimated based on commercial API standards
        burstLimit: 50,
        resetPeriod: '1 hour',
      },
      documentation: 'https://www.highergov.com/api-external/docs/',
      supportEmail: 'api@highergov.com',
      supportMethods: ['email', 'chat', 'phone'],
    },
    dataTypes: ['contracts', 'opportunities', 'awards', 'market_intelligence'],
    coverage: 'Federal, state, and local government opportunities with 300+ data fields',
    updateFrequency: 'Real-time',
    costPerRequest: 0.001, // Estimated based on commercial pricing
    pricing: {
      freeRequests: 1000, // Generous free tier
      plans: [
        { name: 'Starter', price: 500, period: 'year', users: 1 },
        { name: 'Standard', price: 2500, period: 'year', users: 10 },
      ],
    },
  },
  FPDS_NG: {
    id: 'FPDS_NG',
    name: 'FPDS-NG',
    description: 'Federal Procurement Data System - Next Generation, providing comprehensive federal contract award data and procurement analytics through SOAP/XML web services',
    category: 'government',
    isExternal: true,
    isRealTime: false,
    logoUrl: '/images/sources/fpds-ng.png',
    website: 'https://fpds.gov',
    reliability: 90,
    // API Configuration
    apiConfig: {
      baseUrl: 'https://www.fpds.gov/fpdsng_cms',
      versions: ['v1.3', 'v1.5'],
      primaryEndpoints: {
        awards: 'https://www.fpds.gov/ezsearch/FEEDS/ATOM',
        webService: 'https://www.fpds.gov/fpdsng_cms/index.php/en/reports.html',
      },
      authentication: {
        type: 'basic_auth',
        requiresRegistration: true,
        userIdRequired: true,
        passwordRequired: true,
      },
      protocol: 'SOAP/XML',
      rateLimit: {
        requestsPerHour: 200, // Conservative estimate for SOAP services
        burstLimit: 20,
        resetPeriod: '1 hour',
      },
      documentation: 'https://www.fpds.gov/downloads/FPDS-Specifications-WebServices_Integration_Specifications_V1.5.doc',
      supportEmail: 'fpds.support@gsa.gov',
    },
    dataTypes: ['contract_awards', 'idvs', 'procurement_data'],
    coverage: 'All U.S. federal contract awards and procurement data',
    updateFrequency: 'Daily',
    costPerRequest: 0, // Free government API
  },
  USA_SPENDING: {
    id: 'USA_SPENDING',
    name: 'USASpending.gov',
    description: 'Federal spending transparency platform providing comprehensive government spending data including contracts, grants, loans, and financial assistance',
    category: 'government',
    isExternal: true,
    isRealTime: false,
    logoUrl: '/images/sources/usaspending.png',
    website: 'https://usaspending.gov',
    reliability: 93,
    // API Configuration
    apiConfig: {
      baseUrl: 'https://api.usaspending.gov',
      versions: ['v2'],
      primaryEndpoints: {
        awards: 'https://api.usaspending.gov/api/v2/awards/',
        spending: 'https://api.usaspending.gov/api/v2/spending/',
        search: 'https://api.usaspending.gov/api/v2/search/',
        download: 'https://api.usaspending.gov/api/v2/download/',
      },
      authentication: {
        type: 'none',
        requiresRegistration: false,
        publicAccess: true,
      },
      rateLimit: {
        requestsPerHour: 'unlimited', // No documented limits
        note: 'No current rate limiting',
      },
      documentation: 'https://api.usaspending.gov/docs/endpoints',
      githubRepo: 'https://github.com/fedspendingtransparency/usaspending-api',
      supportEmail: 'usaspending.help@fiscal.treasury.gov',
    },
    dataTypes: ['awards', 'contracts', 'grants', 'loans', 'financial_assistance'],
    coverage: 'All U.S. federal government spending data',
    updateFrequency: 'Daily',
    costPerRequest: 0, // Free government API
  },
  
  // Internal Sources
  MANUAL: {
    id: 'MANUAL',
    name: 'Manual Entry',
    description: 'Manually entered by users',
    category: 'internal',
    isExternal: false,
    isRealTime: true,
    logoUrl: '/images/sources/manual.png',
    website: null,
    reliability: 100,
  },
  EXTRACTED: {
    id: 'EXTRACTED',
    name: 'Document Extraction',
    description: 'Extracted from uploaded documents',
    category: 'internal',
    isExternal: false,
    isRealTime: true,
    logoUrl: '/images/sources/extracted.png',
    website: null,
    reliability: 85,
  },
  IMPORT: {
    id: 'IMPORT',
    name: 'Data Import',
    description: 'Imported from external files or APIs',
    category: 'internal',
    isExternal: false,
    isRealTime: false,
    logoUrl: '/images/sources/import.png',
    website: null,
    reliability: 80,
  },
  
  // Additional Sources
  LINKEDIN: {
    id: 'LINKEDIN',
    name: 'LinkedIn',
    description: 'Professional networking platform',
    category: 'commercial',
    isExternal: true,
    isRealTime: false,
    logoUrl: '/images/sources/linkedin.png',
    website: 'https://linkedin.com',
    reliability: 75,
  },
  WEBSITE: {
    id: 'WEBSITE',
    name: 'Website Scraping',
    description: 'Scraped from organization websites',
    category: 'commercial',
    isExternal: true,
    isRealTime: false,
    logoUrl: '/images/sources/website.png',
    website: null,
    reliability: 70,
  },
  OPPORTUNITY_DOC: {
    id: 'OPPORTUNITY_DOC',
    name: 'Opportunity Documents',
    description: 'Extracted from opportunity documentation',
    category: 'internal',
    isExternal: false,
    isRealTime: true,
    logoUrl: '/images/sources/documents.png',
    website: null,
    reliability: 85,
  },
  REFERRAL: {
    id: 'REFERRAL',
    name: 'Referral',
    description: 'Provided through professional referrals',
    category: 'internal',
    isExternal: false,
    isRealTime: true,
    logoUrl: '/images/sources/referral.png',
    website: null,
    reliability: 95,
  },
  CONFERENCE: {
    id: 'CONFERENCE',
    name: 'Conference/Event',
    description: 'Met at conferences or industry events',
    category: 'internal',
    isExternal: false,
    isRealTime: true,
    logoUrl: '/images/sources/conference.png',
    website: null,
    reliability: 90,
  },
  COLD_OUTREACH: {
    id: 'COLD_OUTREACH',
    name: 'Cold Outreach',
    description: 'Initial cold contact outreach',
    category: 'internal',
    isExternal: false,
    isRealTime: true,
    logoUrl: '/images/sources/outreach.png',
    website: null,
    reliability: 60,
  },
} as const

export type DataSourceId = keyof typeof DATA_SOURCE
export type DataSourceInfo = typeof DATA_SOURCE[DataSourceId]

// =============================================
// LINK TYPES (Global)
// =============================================

/**
 * Global link type enum with metadata for UI display
 * Used for opportunity links, resources, and references
 */
export const LINK_TYPE = {
  ATTACHMENT: {
    id: 'ATTACHMENT',
    name: 'Attachment',
    description: 'Downloadable file attachment',
    icon: '📎',
    color: 'blue',
    category: 'document',
  },
  RESOURCE: {
    id: 'RESOURCE',
    name: 'Resource',
    description: 'External resource or reference',
    icon: '🔗',
    color: 'green',
    category: 'external',
  },
  ADDITIONAL_LINK: {
    id: 'ADDITIONAL_LINK',
    name: 'Additional Information',
    description: 'Additional information or details',
    icon: 'ℹ️',
    color: 'purple',
    category: 'information',
  },
  OPPORTUNITY_PAGE: {
    id: 'OPPORTUNITY_PAGE',
    name: 'Opportunity Page',
    description: 'Direct link to opportunity page',
    icon: '🎯',
    color: 'orange',
    category: 'opportunity',
  },
  API_SELF: {
    id: 'API_SELF',
    name: 'API Reference',
    description: 'API self-referential link',
    icon: '⚙️',
    color: 'gray',
    category: 'api',
  },
  DESCRIPTION_LINK: {
    id: 'DESCRIPTION_LINK',
    name: 'Description',
    description: 'Link to detailed description',
    icon: '📄',
    color: 'indigo',
    category: 'document',
  },
  SOLICITATION_DOC: {
    id: 'SOLICITATION_DOC',
    name: 'Solicitation Document',
    description: 'Official solicitation document',
    icon: '📋',
    color: 'red',
    category: 'document',
  },
  AMENDMENT: {
    id: 'AMENDMENT',
    name: 'Amendment',
    description: 'Solicitation amendment document',
    icon: '📝',
    color: 'yellow',
    category: 'document',
  },
  QA_DOCUMENT: {
    id: 'QA_DOCUMENT',
    name: 'Q&A Document',
    description: 'Questions and answers document',
    icon: '❓',
    color: 'teal',
    category: 'document',
  },
  OTHER: {
    id: 'OTHER',
    name: 'Other',
    description: 'Other type of link',
    icon: '🔗',
    color: 'gray',
    category: 'other',
  },
} as const

export type LinkTypeId = keyof typeof LINK_TYPE
export type LinkTypeInfo = typeof LINK_TYPE[LinkTypeId]

// =============================================
// NOTIFICATION CHANNELS (Global)
// =============================================

/**
 * Global notification channel enum with comprehensive metadata
 * Used for all notification settings throughout the application
 */
export const NOTIFICATION_CHANNEL = {
  EMAIL: {
    id: 'EMAIL',
    name: 'Email',
    description: 'Email notifications',
    icon: '📧',
    color: 'blue',
    isRealTime: false,
    requiresSetup: true,
    configFields: ['emailAddress', 'frequency'],
  },
  IN_APP: {
    id: 'IN_APP',
    name: 'In-App',
    description: 'In-application notifications',
    icon: '🔔',
    color: 'purple',
    isRealTime: true,
    requiresSetup: false,
    configFields: ['showToasts', 'playSounds'],
  },
  SLACK: {
    id: 'SLACK',
    name: 'Slack',
    description: 'Slack workspace notifications',
    icon: '💬',
    color: 'green',
    isRealTime: true,
    requiresSetup: true,
    configFields: ['webhookUrl', 'channel'],
  },
  TEAMS: {
    id: 'TEAMS',
    name: 'Microsoft Teams',
    description: 'Microsoft Teams notifications',
    icon: '🔷',
    color: 'blue',
    isRealTime: true,
    requiresSetup: true,
    configFields: ['webhookUrl', 'channel'],
  },
  WEBHOOK: {
    id: 'WEBHOOK',
    name: 'Custom Webhook',
    description: 'Custom webhook endpoint',
    icon: '🔗',
    color: 'orange',
    isRealTime: true,
    requiresSetup: true,
    configFields: ['webhookUrl', 'authToken'],
  },
  SMS: {
    id: 'SMS',
    name: 'SMS',
    description: 'Text message notifications',
    icon: '📱',
    color: 'green',
    isRealTime: true,
    requiresSetup: true,
    configFields: ['phoneNumber'],
  },
  PUSH: {
    id: 'PUSH',
    name: 'Push Notifications',
    description: 'Browser push notifications',
    icon: '🔔',
    color: 'red',
    isRealTime: true,
    requiresSetup: true,
    configFields: ['enabled'],
  },
} as const

export type NotificationChannelId = keyof typeof NOTIFICATION_CHANNEL
export type NotificationChannelInfo = typeof NOTIFICATION_CHANNEL[NotificationChannelId]

// =============================================
// COMMUNICATION ENUMS
// =============================================

export enum PreferredContactMethod {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE', 
  MAIL = 'MAIL',
  VIDEO = 'VIDEO',
  TEXT = 'TEXT'
}

export enum CommunicationFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  AS_NEEDED = 'AS_NEEDED'
}

// =============================================
// CONTACT/CRM ENUMS
// =============================================

export enum ContactRole {
  CONTRACTING_OFFICER = 'CONTRACTING_OFFICER',
  CONTRACTING_SPECIALIST = 'CONTRACTING_SPECIALIST',
  PROGRAM_MANAGER = 'PROGRAM_MANAGER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  TECHNICAL_LEAD = 'TECHNICAL_LEAD',
  PROCUREMENT_ANALYST = 'PROCUREMENT_ANALYST',
  LEGAL_COUNSEL = 'LEGAL_COUNSEL',
  BUDGET_ANALYST = 'BUDGET_ANALYST',
  SMALL_BUSINESS_LIAISON = 'SMALL_BUSINESS_LIAISON',
  SECURITY_OFFICER = 'SECURITY_OFFICER',
  IT_DIRECTOR = 'IT_DIRECTOR',
  CHIEF_INFORMATION_OFFICER = 'CHIEF_INFORMATION_OFFICER',
  DEPUTY_DIRECTOR = 'DEPUTY_DIRECTOR',
  DIRECTOR = 'DIRECTOR',
  ASSISTANT_SECRETARY = 'ASSISTANT_SECRETARY',
  SECRETARY = 'SECRETARY',
  ADMINISTRATOR = 'ADMINISTRATOR',
  COMMISSIONER = 'COMMISSIONER',
  OTHER = 'OTHER'
}

export enum ContactImportance {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum YearsInRole {
  LESS_THAN_1 = 'LESS_THAN_1',
  ONE_TO_THREE = 'ONE_TO_THREE',
  THREE_TO_FIVE = 'THREE_TO_FIVE',
  FIVE_TO_TEN = 'FIVE_TO_TEN',
  MORE_THAN_TEN = 'MORE_THAN_TEN'
}

// =============================================
// BUSINESS CLASSIFICATION ENUMS
// =============================================

export enum BusinessType {
  CORPORATION = 'Corporation',
  LLC = 'LLC',
  PARTNERSHIP = 'Partnership',
  SOLE_PROPRIETORSHIP = 'Sole Proprietorship',
  NON_PROFIT = 'Non-Profit',
  GOVERNMENT_ENTITY = 'Government Entity',
  OTHER = 'Other'
}

export enum EmployeeCount {
  RANGE_1_5 = '1-5',
  RANGE_6_10 = '6-10', 
  RANGE_11_25 = '11-25',
  RANGE_26_50 = '26-50',
  RANGE_51_100 = '51-100',
  RANGE_101_250 = '101-250',
  RANGE_251_500 = '251-500',
  RANGE_501_1000 = '501-1000',
  RANGE_1000_PLUS = '1000+'
}

export enum AnnualRevenue {
  UNDER_100K = 'Less than $100K',
  RANGE_100K_500K = '$100K - $500K',
  RANGE_500K_1M = '$500K - $1M',
  RANGE_1M_5M = '$1M - $5M',
  RANGE_5M_10M = '$5M - $10M',
  RANGE_10M_25M = '$10M - $25M',
  RANGE_25M_50M = '$25M - $50M',
  RANGE_50M_100M = '$50M - $100M',
  RANGE_100M_PLUS = '$100M+'
}

export enum CustomerType {
  FEDERAL = 'Federal',
  STATE = 'State',
  LOCAL = 'Local',
  COMMERCIAL = 'Commercial'
}

// =============================================
// DISPLAY MAPPINGS
// =============================================

export const BUSINESS_TYPE_DISPLAY = {
  [BusinessType.CORPORATION]: {
    label: 'Corporation',
    description: 'C-Corp, S-Corp, or other incorporated business entity'
  },
  [BusinessType.LLC]: {
    label: 'Limited Liability Company (LLC)',
    description: 'Limited liability company structure'
  },
  [BusinessType.PARTNERSHIP]: {
    label: 'Partnership',
    description: 'General partnership, limited partnership, or LLP'
  },
  [BusinessType.SOLE_PROPRIETORSHIP]: {
    label: 'Sole Proprietorship',
    description: 'Individual business owner'
  },
  [BusinessType.NON_PROFIT]: {
    label: 'Non-Profit Organization',
    description: '501(c)(3) or other non-profit entity'
  },
  [BusinessType.GOVERNMENT_ENTITY]: {
    label: 'Government Entity',
    description: 'Government agency or public entity'
  },
  [BusinessType.OTHER]: {
    label: 'Other',
    description: 'Other business structure'
  }
} as const

export const EMPLOYEE_COUNT_DISPLAY = {
  [EmployeeCount.RANGE_1_5]: {
    label: '1-5 employees',
    description: 'Very small business'
  },
  [EmployeeCount.RANGE_6_10]: {
    label: '6-10 employees',
    description: 'Small team'
  },
  [EmployeeCount.RANGE_11_25]: {
    label: '11-25 employees',
    description: 'Small business'
  },
  [EmployeeCount.RANGE_26_50]: {
    label: '26-50 employees',
    description: 'Medium-small business'
  },
  [EmployeeCount.RANGE_51_100]: {
    label: '51-100 employees',
    description: 'Medium business'
  },
  [EmployeeCount.RANGE_101_250]: {
    label: '101-250 employees',
    description: 'Medium-large business'
  },
  [EmployeeCount.RANGE_251_500]: {
    label: '251-500 employees',
    description: 'Large business'
  },
  [EmployeeCount.RANGE_501_1000]: {
    label: '501-1000 employees',
    description: 'Large enterprise'
  },
  [EmployeeCount.RANGE_1000_PLUS]: {
    label: '1000+ employees',
    description: 'Large enterprise'
  }
} as const

export const ANNUAL_REVENUE_DISPLAY = {
  [AnnualRevenue.UNDER_100K]: {
    label: 'Less than $100K',
    description: 'Micro business'
  },
  [AnnualRevenue.RANGE_100K_500K]: {
    label: '$100K - $500K',
    description: 'Small business'
  },
  [AnnualRevenue.RANGE_500K_1M]: {
    label: '$500K - $1M',
    description: 'Small business'
  },
  [AnnualRevenue.RANGE_1M_5M]: {
    label: '$1M - $5M',
    description: 'Medium business'
  },
  [AnnualRevenue.RANGE_5M_10M]: {
    label: '$5M - $10M',
    description: 'Medium business'
  },
  [AnnualRevenue.RANGE_10M_25M]: {
    label: '$10M - $25M',
    description: 'Medium-large business'
  },
  [AnnualRevenue.RANGE_25M_50M]: {
    label: '$25M - $50M',
    description: 'Large business'
  },
  [AnnualRevenue.RANGE_50M_100M]: {
    label: '$50M - $100M',
    description: 'Large business'
  },
  [AnnualRevenue.RANGE_100M_PLUS]: {
    label: '$100M+',
    description: 'Large enterprise'
  }
} as const

export const CUSTOMER_TYPE_DISPLAY = {
  [CustomerType.FEDERAL]: {
    label: 'Federal Government',
    emoji: '🏛️',
    description: 'Federal agencies and departments'
  },
  [CustomerType.STATE]: {
    label: 'State Government', 
    emoji: '🏢',
    description: 'State-level agencies and departments'
  },
  [CustomerType.LOCAL]: {
    label: 'Local Government',
    emoji: '🏘️', 
    description: 'Cities, counties, municipalities'
  },
  [CustomerType.COMMERCIAL]: {
    label: 'Commercial',
    emoji: '🏪',
    description: 'Private sector companies'
  }
} as const

export const CONTACT_ROLE_DISPLAY = {
  [ContactRole.CONTRACTING_OFFICER]: {
    label: 'Contracting Officer',
    description: 'Government official with authority to enter into contracts'
  },
  [ContactRole.CONTRACTING_SPECIALIST]: {
    label: 'Contracting Specialist',
    description: 'Specialist who assists in contract development and administration'
  },
  [ContactRole.PROGRAM_MANAGER]: {
    label: 'Program Manager',
    description: 'Oversees program implementation and execution'
  },
  [ContactRole.PROJECT_MANAGER]: {
    label: 'Project Manager',
    description: 'Manages specific projects within programs'
  },
  [ContactRole.TECHNICAL_LEAD]: {
    label: 'Technical Lead',
    description: 'Subject matter expert providing technical guidance'
  },
  [ContactRole.PROCUREMENT_ANALYST]: {
    label: 'Procurement Analyst',
    description: 'Analyzes procurement processes and requirements'
  },
  [ContactRole.LEGAL_COUNSEL]: {
    label: 'Legal Counsel',
    description: 'Provides legal advice on contracts and compliance'
  },
  [ContactRole.BUDGET_ANALYST]: {
    label: 'Budget Analyst',
    description: 'Analyzes budgets and financial requirements'
  },
  [ContactRole.SMALL_BUSINESS_LIAISON]: {
    label: 'Small Business Liaison',
    description: 'Facilitates small business participation'
  },
  [ContactRole.SECURITY_OFFICER]: {
    label: 'Security Officer',
    description: 'Oversees security requirements and clearances'
  },
  [ContactRole.IT_DIRECTOR]: {
    label: 'IT Director',
    description: 'Director of Information Technology'
  },
  [ContactRole.CHIEF_INFORMATION_OFFICER]: {
    label: 'Chief Information Officer',
    description: 'Senior executive responsible for IT strategy'
  },
  [ContactRole.DEPUTY_DIRECTOR]: {
    label: 'Deputy Director',
    description: 'Second in command of agency or department'
  },
  [ContactRole.DIRECTOR]: {
    label: 'Director',
    description: 'Head of agency, department, or division'
  },
  [ContactRole.ASSISTANT_SECRETARY]: {
    label: 'Assistant Secretary',
    description: 'Senior government official below Secretary level'
  },
  [ContactRole.SECRETARY]: {
    label: 'Secretary',
    description: 'Cabinet-level government official'
  },
  [ContactRole.ADMINISTRATOR]: {
    label: 'Administrator',
    description: 'Head of administrative agency'
  },
  [ContactRole.COMMISSIONER]: {
    label: 'Commissioner',
    description: 'Member of government commission or board'
  },
  [ContactRole.OTHER]: {
    label: 'Other',
    description: 'Other government role not listed'
  }
} as const

export const CONTACT_IMPORTANCE_DISPLAY = {
  [ContactImportance.CRITICAL]: {
    label: 'Critical',
    description: 'Highest priority contact with significant influence',
    color: 'red'
  },
  [ContactImportance.HIGH]: {
    label: 'High',
    description: 'Important contact with moderate influence',
    color: 'orange'
  },
  [ContactImportance.MEDIUM]: {
    label: 'Medium',
    description: 'Regular contact with some influence',
    color: 'yellow'
  },
  [ContactImportance.LOW]: {
    label: 'Low',
    description: 'Occasional contact with limited influence',
    color: 'gray'
  }
} as const

export const YEARS_IN_ROLE_DISPLAY = {
  [YearsInRole.LESS_THAN_1]: {
    label: 'Less than 1 year',
    description: 'New to current role'
  },
  [YearsInRole.ONE_TO_THREE]: {
    label: '1-3 years',
    description: 'Gaining experience in role'
  },
  [YearsInRole.THREE_TO_FIVE]: {
    label: '3-5 years',
    description: 'Experienced in current role'
  },
  [YearsInRole.FIVE_TO_TEN]: {
    label: '5-10 years',
    description: 'Very experienced in current role'
  },
  [YearsInRole.MORE_THAN_TEN]: {
    label: 'More than 10 years',
    description: 'Veteran in current role'
  }
} as const

export const PREFERRED_CONTACT_METHOD_DISPLAY = {
  [PreferredContactMethod.EMAIL]: {
    label: 'Email',
    description: 'Prefer email communication',
    icon: '✉️'
  },
  [PreferredContactMethod.PHONE]: {
    label: 'Phone',
    description: 'Prefer phone calls',
    icon: '📞'
  },
  [PreferredContactMethod.MAIL]: {
    label: 'Mail',
    description: 'Prefer postal mail',
    icon: '📬'
  },
  [PreferredContactMethod.VIDEO]: {
    label: 'Video Call',
    description: 'Prefer video conferencing',
    icon: '📹'
  },
  [PreferredContactMethod.TEXT]: {
    label: 'Text/SMS',
    description: 'Prefer text messages',
    icon: '💬'
  }
} as const

export const COMMUNICATION_FREQUENCY_DISPLAY = {
  [CommunicationFrequency.DAILY]: {
    label: 'Daily',
    description: 'Daily updates and communication'
  },
  [CommunicationFrequency.WEEKLY]: {
    label: 'Weekly',
    description: 'Weekly check-ins and updates'
  },
  [CommunicationFrequency.BIWEEKLY]: {
    label: 'Bi-weekly',
    description: 'Every two weeks'
  },
  [CommunicationFrequency.MONTHLY]: {
    label: 'Monthly',
    description: 'Monthly updates'
  },
  [CommunicationFrequency.QUARTERLY]: {
    label: 'Quarterly',
    description: 'Quarterly reviews and updates'
  },
  [CommunicationFrequency.AS_NEEDED]: {
    label: 'As Needed',
    description: 'Only when necessary'
  }
} as const

// =============================================
// UTILITY FUNCTIONS
// =============================================

export function getBusinessTypeDisplay(type: BusinessType | string) {
  return BUSINESS_TYPE_DISPLAY[type as BusinessType] || {
    label: type,
    description: 'Custom business type'
  }
}

export function getEmployeeCountDisplay(count: EmployeeCount | string) {
  return EMPLOYEE_COUNT_DISPLAY[count as EmployeeCount] || {
    label: count,
    description: 'Custom employee count'
  }
}

export function getAnnualRevenueDisplay(revenue: AnnualRevenue | string) {
  return ANNUAL_REVENUE_DISPLAY[revenue as AnnualRevenue] || {
    label: revenue,
    description: 'Custom revenue range'
  }
}

export function getCustomerTypeDisplay(type: CustomerType | string) {
  return CUSTOMER_TYPE_DISPLAY[type as CustomerType] || {
    label: type,
    emoji: '❓',
    description: 'Custom customer type'
  }
}

// Array helpers for UI dropdowns
export const BUSINESS_TYPE_OPTIONS = Object.entries(BUSINESS_TYPE_DISPLAY).map(([value, display]) => ({
  value: value as BusinessType,
  label: display.label,
  description: display.description
}))

export const EMPLOYEE_COUNT_OPTIONS = Object.entries(EMPLOYEE_COUNT_DISPLAY).map(([value, display]) => ({
  value: value as EmployeeCount,
  label: display.label,
  description: display.description
}))

export const ANNUAL_REVENUE_OPTIONS = Object.entries(ANNUAL_REVENUE_DISPLAY).map(([value, display]) => ({
  value: value as AnnualRevenue,
  label: display.label,
  description: display.description
}))

export const CUSTOMER_TYPE_OPTIONS = Object.entries(CUSTOMER_TYPE_DISPLAY).map(([value, display]) => ({
  value: value as CustomerType,
  label: display.label,
  emoji: display.emoji,
  description: display.description
}))

export const CONTACT_ROLE_OPTIONS = Object.entries(CONTACT_ROLE_DISPLAY).map(([value, display]) => ({
  value: value as ContactRole,
  label: display.label,
  description: display.description
}))

export const CONTACT_IMPORTANCE_OPTIONS = Object.entries(CONTACT_IMPORTANCE_DISPLAY).map(([value, display]) => ({
  value: value as ContactImportance,
  label: display.label,
  description: display.description,
  color: display.color
}))

export const YEARS_IN_ROLE_OPTIONS = Object.entries(YEARS_IN_ROLE_DISPLAY).map(([value, display]) => ({
  value: value as YearsInRole,
  label: display.label,
  description: display.description
}))

export const PREFERRED_CONTACT_METHOD_OPTIONS = Object.entries(PREFERRED_CONTACT_METHOD_DISPLAY).map(([value, display]) => ({
  value: value as PreferredContactMethod,
  label: display.label,
  description: display.description,
  icon: display.icon
}))

export const COMMUNICATION_FREQUENCY_OPTIONS = Object.entries(COMMUNICATION_FREQUENCY_DISPLAY).map(([value, display]) => ({
  value: value as CommunicationFrequency,
  label: display.label,
  description: display.description
}))

// Type guards
export function isBusinessType(value: string): value is BusinessType {
  return Object.values(BusinessType).includes(value as BusinessType)
}

export function isEmployeeCount(value: string): value is EmployeeCount {
  return Object.values(EmployeeCount).includes(value as EmployeeCount)
}

export function isAnnualRevenue(value: string): value is AnnualRevenue {
  return Object.values(AnnualRevenue).includes(value as AnnualRevenue)
}

export function isCustomerType(value: string): value is CustomerType {
  return Object.values(CustomerType).includes(value as CustomerType)
}

export function isContactRole(value: string): value is ContactRole {
  return Object.values(ContactRole).includes(value as ContactRole)
}

export function isContactImportance(value: string): value is ContactImportance {
  return Object.values(ContactImportance).includes(value as ContactImportance)
}

export function isYearsInRole(value: string): value is YearsInRole {
  return Object.values(YearsInRole).includes(value as YearsInRole)
}

export function isPreferredContactMethod(value: string): value is PreferredContactMethod {
  return Object.values(PreferredContactMethod).includes(value as PreferredContactMethod)
}

export function isCommunicationFrequency(value: string): value is CommunicationFrequency {
  return Object.values(CommunicationFrequency).includes(value as CommunicationFrequency)
}

// Display helper functions
export function getContactRoleDisplay(role: ContactRole | string) {
  return CONTACT_ROLE_DISPLAY[role as ContactRole] || {
    label: role,
    description: 'Custom contact role'
  }
}

export function getContactImportanceDisplay(importance: ContactImportance | string) {
  return CONTACT_IMPORTANCE_DISPLAY[importance as ContactImportance] || {
    label: importance,
    description: 'Custom importance level',
    color: 'gray'
  }
}

export function getYearsInRoleDisplay(years: YearsInRole | string) {
  return YEARS_IN_ROLE_DISPLAY[years as YearsInRole] || {
    label: years,
    description: 'Custom years in role'
  }
}

export function getPreferredContactMethodDisplay(method: PreferredContactMethod | string) {
  return PREFERRED_CONTACT_METHOD_DISPLAY[method as PreferredContactMethod] || {
    label: method,
    description: 'Custom contact method',
    icon: '❓'
  }
}

export function getCommunicationFrequencyDisplay(frequency: CommunicationFrequency | string) {
  return COMMUNICATION_FREQUENCY_DISPLAY[frequency as CommunicationFrequency] || {
    label: frequency,
    description: 'Custom communication frequency'
  }
}

// =============================================
// GLOBAL UTILITY FUNCTIONS
// =============================================

/**
 * Get data source information by ID
 */
export function getDataSourceInfo(id: DataSourceId): DataSourceInfo {
  return DATA_SOURCE[id]
}

/**
 * Get all data sources by category
 */
export function getDataSourcesByCategory(category: 'government' | 'commercial' | 'internal'): DataSourceInfo[] {
  return Object.values(DATA_SOURCE).filter(source => source.category === category)
}

/**
 * Get external data sources only
 */
export function getExternalDataSources(): DataSourceInfo[] {
  return Object.values(DATA_SOURCE).filter(source => source.isExternal)
}

/**
 * Get real-time data sources only
 */
export function getRealTimeDataSources(): DataSourceInfo[] {
  return Object.values(DATA_SOURCE).filter(source => source.isRealTime)
}

/**
 * Get link type information by ID
 */
export function getLinkTypeInfo(id: LinkTypeId): LinkTypeInfo {
  return LINK_TYPE[id]
}

/**
 * Get link types by category
 */
export function getLinkTypesByCategory(category: 'document' | 'external' | 'information' | 'opportunity' | 'api' | 'other'): LinkTypeInfo[] {
  return Object.values(LINK_TYPE).filter(type => type.category === category)
}

/**
 * Get notification channel information by ID
 */
export function getNotificationChannelInfo(id: NotificationChannelId): NotificationChannelInfo {
  return NOTIFICATION_CHANNEL[id]
}

/**
 * Get notification channels that require setup
 */
export function getNotificationChannelsRequiringSetup(): NotificationChannelInfo[] {
  return Object.values(NOTIFICATION_CHANNEL).filter(channel => channel.requiresSetup)
}

/**
 * Get real-time notification channels
 */
export function getRealTimeNotificationChannels(): NotificationChannelInfo[] {
  return Object.values(NOTIFICATION_CHANNEL).filter(channel => channel.isRealTime)
}

// =============================================
// DROPDOWN/SELECT OPTIONS
// =============================================

/**
 * Arrays for use in dropdowns, selects, and other UI components
 */
export const DATA_SOURCE_OPTIONS = Object.values(DATA_SOURCE).map(source => ({
  value: source.id,
  label: source.name,
  description: source.description,
  category: source.category,
  icon: source.logoUrl,
  reliability: source.reliability,
  isExternal: source.isExternal,
  isRealTime: source.isRealTime,
}))

export const LINK_TYPE_OPTIONS = Object.values(LINK_TYPE).map(type => ({
  value: type.id,
  label: type.name,
  description: type.description,
  icon: type.icon,
  color: type.color,
  category: type.category,
}))

export const NOTIFICATION_CHANNEL_OPTIONS = Object.values(NOTIFICATION_CHANNEL).map(channel => ({
  value: channel.id,
  label: channel.name,
  description: channel.description,
  icon: channel.icon,
  color: channel.color,
  requiresSetup: channel.requiresSetup,
  isRealTime: channel.isRealTime,
  configFields: channel.configFields,
}))

// =============================================
// LEGACY COMPATIBILITY MAPPINGS
// =============================================

/**
 * Legacy string mappings for backward compatibility
 * Maps old ContactSource enum values to new DATA_SOURCE
 */
export const LEGACY_CONTACT_SOURCE_MAPPING = {
  'MANUAL': 'MANUAL',
  'EXTRACTED': 'EXTRACTED', 
  'SAM_GOV': 'SAM_GOV',
  'LINKEDIN': 'LINKEDIN',
  'WEBSITE': 'WEBSITE',
  'OPPORTUNITY_DOC': 'OPPORTUNITY_DOC',
  'REFERRAL': 'REFERRAL',
  'CONFERENCE': 'CONFERENCE',
  'COLD_OUTREACH': 'COLD_OUTREACH',
  'IMPORT': 'IMPORT',
} as const

/**
 * Legacy notification channel mappings
 */
export const LEGACY_NOTIFICATION_MAPPING = {
  'email': 'EMAIL',
  'slack': 'SLACK',
  'webhook': 'WEBHOOK',
  'teams': 'TEAMS',
  'sms': 'SMS',
  'push': 'PUSH',
  'in-app': 'IN_APP',
} as const