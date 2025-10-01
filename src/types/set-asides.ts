import { z } from 'zod';

// Enums
export const SetAsideType = z.enum(['competitive', 'sole_source', 'partial']);
export type SetAsideType = z.infer<typeof SetAsideType>;

export const SetAsideCode = z.enum([
  'SBA',
  'SBP',
  '8A',
  '8AN',
  'HZC',
  'HZS',
  'SDVOSBC',
  'SDVOSBS',
  'WOSB',
  'WOSBSS',
  'EDWOSB',
  'EDWOSBSS',
  'LAS',
  'IEE',
  'ISBEE',
  'BICiv',
  'VSA',
  'VSS'
]);
export type SetAsideCode = z.infer<typeof SetAsideCode>;

export const AgencyCode = z.enum(['SBA', 'DOI', 'HHS/IHS', 'VA']);
export type AgencyCode = z.infer<typeof AgencyCode>;

// Procurement Threshold Schema
export const ProcurementThresholdSchema = z.object({
  min: z.number().nullable().describe('Minimum dollar threshold for this set-aside type'),
  max: z.number().nullable().describe('Maximum dollar threshold for this set-aside type'),
  currency: z.string().default('USD').describe('Currency for threshold amounts'),
  notes: z.string().optional().describe('Additional notes about thresholds'),
});
export type ProcurementThreshold = z.infer<typeof ProcurementThresholdSchema>;

// Main Set-Aside Schema
export const SetAsideSchema = z.object({
  id: z.string().describe('Unique identifier for the set-aside'),
  code: SetAsideCode.describe('Official set-aside code used in procurement systems'),
  name: z.string().describe('Short display name for the set-aside'),
  fullName: z.string().describe('Full official name including FAR reference'),
  description: z.string().describe('Detailed description of the set-aside program'),
  farReference: z.string().describe('Federal Acquisition Regulation reference'),
  type: SetAsideType.describe('Type of set-aside: competitive, sole_source, or partial'),
  
  eligibilityRequirements: z.array(z.string()).describe('List of eligibility requirements for this set-aside'),
  procurementThreshold: ProcurementThresholdSchema.describe('Dollar thresholds for using this set-aside'),
  
  certificationRequired: z.boolean().describe('Whether formal certification is required'),
  selfCertificationAllowed: z.boolean().describe('Whether self-certification is allowed'),
  
  priority: z.number().min(1).max(20).describe('Display priority order (1 = highest)'),
  isActive: z.boolean().default(true).describe('Whether this set-aside is currently active'),
  
  agencySpecific: AgencyCode.optional().describe('If set-aside is specific to an agency'),
  tags: z.array(z.string()).describe('Tags for filtering and searching'),
  relatedCertifications: z.array(z.string()).describe('Related certification IDs from certifications.json'),
});
export type SetAside = z.infer<typeof SetAsideSchema>;

// Collection Schema
export const SetAsidesCollectionSchema = z.object({
  setAsides: z.array(SetAsideSchema),
  metadata: z.object({
    version: z.string(),
    lastUpdated: z.string(),
    totalSetAsides: z.number(),
    dataSource: z.string(),
    notes: z.string().optional(),
  }),
  enums: z.object({
    setAsideTypes: z.array(z.string()),
    agencies: z.array(z.string()),
    farReferences: z.array(z.string()),
    priorities: z.record(z.string(), z.string()),
  }).optional(),
});
export type SetAsidesCollection = z.infer<typeof SetAsidesCollectionSchema>;

// Profile Integration Schema - for storing user's eligible set-asides
export const UserSetAsideEligibilitySchema = z.object({
  setAsideCode: SetAsideCode.describe('Set-aside code the user is eligible for'),
  eligibilityDate: z.string().datetime().describe('Date when eligibility was determined'),
  expirationDate: z.string().datetime().optional().describe('Date when eligibility expires (if applicable)'),
  certificationIds: z.array(z.string()).describe('Related certification IDs that qualify for this set-aside'),
  notes: z.string().optional().describe('Additional notes about eligibility'),
  autoDetected: z.boolean().default(false).describe('Whether eligibility was auto-detected based on certifications'),
});
export type UserSetAsideEligibility = z.infer<typeof UserSetAsideEligibilitySchema>;

// Helper type for opportunity matching
export const OpportunitySetAsideMatchSchema = z.object({
  opportunityId: z.string(),
  setAsideCode: SetAsideCode,
  isEligible: z.boolean(),
  eligibilityReason: z.string().optional(),
  matchScore: z.number().min(0).max(100).describe('Match score based on set-aside priority and fit'),
});
export type OpportunitySetAsideMatch = z.infer<typeof OpportunitySetAsideMatchSchema>;

// Utility functions types
export interface SetAsideUtils {
  getSetAsideByCode: (code: SetAsideCode) => SetAside | undefined;
  getEligibleSetAsides: (certifications: string[]) => SetAside[];
  checkSetAsideEligibility: (setAsideCode: SetAsideCode, userCertifications: string[]) => boolean;
  getSetAsidePriority: (code: SetAsideCode) => number;
  getSoleSourceThreshold: (code: SetAsideCode, isManufacturing: boolean) => number | null;
  getAgencySpecificSetAsides: (agency: AgencyCode) => SetAside[];
}

// Constants for common thresholds
export const SET_ASIDE_THRESHOLDS = {
  MICRO_PURCHASE: 10000,
  SIMPLIFIED_ACQUISITION: 250000,
  SOLE_SOURCE_OTHER: 4500000,
  SOLE_SOURCE_MANUFACTURING: 7000000,
  VA_VOSB_SOLE_SOURCE: 5000000,
} as const;

// Mapping of certifications to eligible set-asides
export const CERTIFICATION_TO_SET_ASIDES: Record<string, SetAsideCode[]> = {
  'sb': ['SBA', 'SBP'],
  '8a_program': ['8A', '8AN', 'SBA', 'SBP'],
  'hubzone': ['HZC', 'HZS', 'SBA', 'SBP'],
  'sdvosb': ['SDVOSBC', 'SDVOSBS', 'SBA', 'SBP'],
  'vosb': ['VSA', 'VSS', 'SBA', 'SBP'], // VA specific
  'wosb': ['WOSB', 'WOSBSS', 'SBA', 'SBP'],
  'edwosb': ['EDWOSB', 'EDWOSBSS', 'WOSB', 'WOSBSS', 'SBA', 'SBP'],
};

// Display helpers
export const SET_ASIDE_DISPLAY_GROUPS = {
  'Small Business': ['SBA', 'SBP'],
  '8(a) Program': ['8A', '8AN'],
  'HUBZone': ['HZC', 'HZS'],
  'Service-Disabled Veteran': ['SDVOSBC', 'SDVOSBS'],
  'Women-Owned': ['WOSB', 'WOSBSS', 'EDWOSB', 'EDWOSBSS'],
  'Geographic/Local': ['LAS'],
  'Native American/Indian': ['IEE', 'ISBEE', 'BICiv'],
  'VA Veteran Programs': ['VSA', 'VSS'],
} as const;

// Validation helper for opportunity notices
export const validateSetAsideCode = (code: string): code is SetAsideCode => {
  try {
    SetAsideCode.parse(code);
    return true;
  } catch {
    return false;
  }
};