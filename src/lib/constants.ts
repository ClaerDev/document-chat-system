// Application constants

export const APP_NAME = 'Document Chat System AI'
export const APP_DESCRIPTION = 'AI-powered document management platform'

// Tree and Document Operations
export const TREE_OPERATIONS = {
  // Folder operations
  CREATE_FOLDER: 'CREATE_FOLDER',
  UPDATE_FOLDER: 'UPDATE_FOLDER',
  DELETE_FOLDER: 'DELETE_FOLDER',
  MOVE_FOLDER: 'MOVE_FOLDER',

  // Document operations
  CREATE_DOCUMENT: 'CREATE_DOCUMENT',
  UPDATE_DOCUMENT: 'UPDATE_DOCUMENT',
  UPDATE_DOCUMENT_METADATA: 'UPDATE_DOCUMENT_METADATA',
  DELETE_DOCUMENT: 'DELETE_DOCUMENT',
  MOVE_DOCUMENT: 'MOVE_DOCUMENT',

  // File operations
  UPLOAD_FILE: 'UPLOAD_FILE',

  // Drag & Drop operations
  DRAG_DROP_DOCUMENT: 'DRAG_DROP_DOCUMENT',
  DRAG_DROP_FOLDER: 'DRAG_DROP_FOLDER',
  DRAG_DROP_BLOCKED: 'DRAG_DROP_BLOCKED',

  // Component lifecycle operations
  COMPONENT_MOUNT: 'COMPONENT_MOUNT',

  // UI state operations
  EXPAND: 'EXPAND',
  COLLAPSE: 'COLLAPSE',
  SELECT: 'SELECT',
  TOGGLE: 'TOGGLE',

  // Navigation operations
  NAVIGATE_TO_FOLDER: 'NAVIGATE_TO_FOLDER',
  NAVIGATE_TO_ROOT: 'NAVIGATE_TO_ROOT',
} as const

export const DOCUMENT_OPERATIONS = {
  CREATE: TREE_OPERATIONS.CREATE_DOCUMENT,
  UPDATE: TREE_OPERATIONS.UPDATE_DOCUMENT,
  UPDATE_METADATA: TREE_OPERATIONS.UPDATE_DOCUMENT_METADATA,
  DELETE: TREE_OPERATIONS.DELETE_DOCUMENT,
  MOVE: TREE_OPERATIONS.MOVE_DOCUMENT,
} as const

export const FOLDER_OPERATIONS = {
  CREATE: TREE_OPERATIONS.CREATE_FOLDER,
  UPDATE: TREE_OPERATIONS.UPDATE_FOLDER,
  DELETE: TREE_OPERATIONS.DELETE_FOLDER,
  MOVE: TREE_OPERATIONS.MOVE_FOLDER,
} as const

// UI Constants for hardcoded state values
export const UI_CONSTANTS = {
  ROOT_FOLDER_ID: 'root',
  ALL_FILTER: 'all',

  // Drag operations
  DRAG_EFFECT_MOVE: 'move',
  DRAG_EFFECT_COPY: 'copy',

  // Sort options
  SORT_NEWEST: 'newest',
  SORT_OLDEST: 'oldest',
  SORT_NAME_ASC: 'name-asc',
  SORT_NAME_DESC: 'name-desc',
  SORT_SIZE_ASC: 'size-asc',
  SORT_SIZE_DESC: 'size-desc',
  SORT_TYPE: 'type',
} as const

// Document file types for UI display
export const DOCUMENT_TYPES = {
  PDF: 'pdf',
  WORD: 'word',
  EXCEL: 'excel',
  POWERPOINT: 'powerpoint',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  ARCHIVE: 'archive',
  CODE: 'code',
  TEXT: 'text',
  MARKDOWN: 'markdown',
} as const

// Editor keywords
export const EDITOR_KEYWORDS = {
  COLLAPSE: ['collapse', 'collapsible', 'toggle'],
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  OPPORTUNITIES: '/opportunities',
  PROFILES: '/profiles',
  SETTINGS: '/settings',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
} as const

// Plans and pricing - REMOVED
// 
// ⚠️  PLANS constant has been removed to eliminate pricing redundancy
// ⚠️  Use PricingService.getActivePlans() for dynamic pricing data
// ⚠️  Or use /api/v1/pricing/plans API endpoint
//
// If you need pricing data:
// - For server-side: import { PricingService } from '@/lib/pricing-service'
// - For client-side: fetch('/api/v1/pricing/plans')
// - For fallback only: import { DEFAULT_PLANS } from '@/lib/config/default-plans'

// NAICS codes (subset for initial implementation)
export const NAICS_CODES = [
  { code: '541511', title: 'Custom Computer Programming Services' },
  { code: '541512', title: 'Computer Systems Design Services' },
  { code: '541513', title: 'Computer Facilities Management Services' },
  { code: '541519', title: 'Other Computer Related Services' },
  {
    code: '541611',
    title:
      'Administrative Management and General Management Consulting Services',
  },
  { code: '541612', title: 'Human Resources Consulting Services' },
  { code: '541613', title: 'Marketing Consulting Services' },
  {
    code: '541614',
    title: 'Process, Physical Distribution, and Logistics Consulting Services',
  },
  { code: '541618', title: 'Other Management Consulting Services' },
  {
    code: '541690',
    title: 'Other Scientific and Technical Consulting Services',
  },
  {
    code: '238220',
    title: 'Plumbing, Heating, and Air-Conditioning Contractors',
  },
  { code: '238910', title: 'Site Preparation Contractors' },
  {
    code: '237110',
    title: 'Water and Sewer Line and Related Structures Construction',
  },
  { code: '237310', title: 'Highway, Street, and Bridge Construction' },
] as const


// Organization types / Client categories
export const CLIENT_TYPES = [
  'Enterprise',
  'Small Business',
  'Startup',
  'Non-Profit',
  'Healthcare',
  'Financial Services',
  'Technology',
  'Manufacturing',
  'Retail',
  'Education',
  'Consulting',
  'Other',
] as const

// States
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
] as const

// Document access levels
export const ACCESS_LEVELS = [
  'Public',
  'Internal',
  'Confidential',
  'Restricted',
  'Not Specified',
] as const

// Procurement methods/approaches
export const PROCUREMENT_METHODS = [
  'Direct Purchase',
  'Request for Proposal (RFP)',
  'Request for Quote (RFQ)',
  'Request for Information (RFI)',
  'Competitive Bidding',
  'Sole Source',
  'Framework Agreement',
  'Master Service Agreement',
  'Standing Purchase Order',
  'E-Procurement Platform',
  'Reverse Auction',
  'Vendor Marketplace',
] as const

// IT industry subcategories
export const IT_SUBCATEGORIES = [
  'Cybersecurity',
  'Cloud Computing',
  'Software Development',
  'Data Analytics',
  'Artificial Intelligence/Machine Learning',
  'Network Infrastructure',
  'Help Desk/IT Support',
  'Database Management',
  'System Integration',
  'Mobile Development',
  'Web Development',
  'DevOps/CI/CD',
  'Legacy System Modernization',
  'Enterprise Architecture',
] as const

// Opportunity status types
export const OPPORTUNITY_STATUS = [
  'Active',
  'Closing Soon',
  'Recently Posted',
  'Cancelled',
  'Awarded',
] as const

// Contract duration types
export const CONTRACT_DURATION = [
  'Short-term (< 1 year)',
  '1-2 years',
  '3-5 years',
  'Multi-year (5+ years)',
  'Ongoing/Indefinite',
] as const

// API Configuration
export const API_ENDPOINTS = {
  OPPORTUNITIES: '/api/opportunities',
  PROFILES: '/api/profiles',
  MATCH_SCORES: '/api/match-scores',
  USERS: '/api/users',
  AUTH: '/api/auth',
} as const

// File types (business logic - keep as constants)
export const ALLOWED_FILE_TYPES = [
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
  'text/plain', // .txt
  
  // Images
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  
  // Videos
  'video/mp4',
  'video/mpeg',
  'video/quicktime', // .mov files (standard)
  'video/x-quicktime', // .mov files (alternative)
  'application/x-quicktime', // .mov files (alternative)
  'video/x-msvideo', // .avi files
  'video/x-ms-wmv', // .wmv files
  'video/webm',
  'video/x-flv',
  'video/x-matroska', // .mkv files
  
  // Audio files
  'audio/mpeg', // .mp3
  'audio/wav', // .wav
  'audio/ogg', // .ogg
  'audio/aac', // .aac
  'audio/mp4', // .m4a
  'audio/flac', // .flac
  'audio/x-ms-wma', // .wma
  
  // Archive files
  'application/zip', // .zip
  'application/x-rar-compressed', // .rar
  'application/x-7z-compressed', // .7z
  'application/x-tar', // .tar
  'application/gzip', // .gz
  
  // Code files
  'text/javascript', // .js
  'text/typescript', // .ts
  'text/jsx', // .jsx
  'text/tsx', // .tsx
  'text/html', // .html
  'text/css', // .css
  'application/json', // .json
  'application/xml', // .xml
  'text/markdown', // .md
  'text/x-python', // .py
  'text/x-java', // .java
  'text/x-c++src', // .cpp
  'text/x-csrc', // .c
  'text/x-php', // .php
] as const

// Note: Pagination and file upload limits moved to environment configuration
// See src/lib/config/env.ts for configurable values
