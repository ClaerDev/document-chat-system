/**
 * Global Opportunity Enums - Comprehensive data source definitions
 * 
 * IMPORTANT: These enums are the single source of truth for opportunity-related
 * classifications. They support all major government data sources:
 * - SAM.gov (Active opportunities and contractor validation)
 * - HigherGov (Primary opportunity aggregator)
 * - USA Spending (Historical awards and contract data)
 * - FPDS-NG (Contract awards and performance data)
 * - Grants.gov (Federal grant opportunities)
 * 
 * Design Principles:
 * 1. Align with existing frontend enums where they exist
 * 2. Support all major procurement data sources
 * 3. Maintain compatibility with current Profile matching system
 * 4. Use consistent naming conventions across the platform
 */

// Import global security clearance enum from its source
import { SecurityClearanceLevel } from '@/lib/security-clearance'

// =============================================
// DATA SOURCE ENUMS
// =============================================

export enum SourceSystem {
  SAM_GOV      = 'SAM_GOV',      // SAM.gov - Real-time federal contracting opportunities and entity management
  HIGHERGOV    = 'HIGHERGOV',    // HigherGov - Primary opportunity aggregator and intelligence platform
  USA_SPENDING = 'USA_SPENDING', // USA Spending - Federal spending transparency and award history
  FPDS_NG      = 'FPDS_NG',      // FPDS-NG - Federal procurement data system (contract reporting)
  GRANTS_GOV   = 'GRANTS_GOV',   // Grants.gov - Federal discretionary funding opportunities
  MANUAL       = 'MANUAL',       // Manually created opportunities
  IMPORT       = 'IMPORT',       // Imported from other sources
}

// =============================================
// OPPORTUNITY CLASSIFICATION ENUMS
// =============================================

// Extended from existing src/types/index.ts but comprehensive - based on government provider research
export enum OpportunityType {
  // === SAM.gov Notice Types (with official codes) ===
  SOLICITATION      = 'SOLICITATION',      // Active solicitation (o) - Most common procurement type
  PRESOLICITATION   = 'PRESOLICITATION',   // Pre-solicitation notice (p) - Early market research
  AWARD_NOTICE      = 'AWARD_NOTICE',      // Award notice (a) - Contract awarded
  SOURCES_SOUGHT    = 'SOURCES_SOUGHT',    // Sources sought notice (r) - Market research
  SPECIAL_NOTICE    = 'SPECIAL_NOTICE',    // Special notice (s) - Administrative notices
  JUSTIFICATION     = 'JUSTIFICATION',     // Justification and approval (u) - J&A documents
  SALE_OF_SURPLUS   = 'SALE_OF_SURPLUS',   // Sale of surplus property (g) - Asset disposition
  COMBINED_SYNOPSIS = 'COMBINED_SYNOPSIS', // Combined synopsis/solicitation (k) - Streamlined process
  INTENT_TO_BUNDLE  = 'INTENT_TO_BUNDLE',  // Intent to bundle requirements (i) - Bundling notice
  
  // === Request Types (SAM.gov solicitation subtypes) ===
  RFP               = 'RFP',               // Request for Proposals - Complex procurement
  RFQ               = 'RFQ',               // Request for Quotations - Price-based competition
  RFI               = 'RFI',               // Request for Information - Information gathering
  IFB               = 'IFB',               // Invitation for Bids - Sealed bidding
  
  // === Amendment and Modification Types ===
  AMENDMENT         = 'AMENDMENT',         // Amendment to existing opportunity
  MODIFICATION      = 'MODIFICATION',      // Contract modification
  NOTICE            = 'NOTICE',            // General notice of intent
  
  // === Grants.gov Types (5 main categories) ===
  GRANT_DISCRETIONARY = 'GRANT_DISCRETIONARY',  // Discretionary grant (most common)
  GRANT_CONTINUATION  = 'GRANT_CONTINUATION',   // Continuation of existing grant
  GRANT_MANDATORY     = 'GRANT_MANDATORY',      // Mandatory/formula grant
  GRANT_EARMARK       = 'GRANT_EARMARK',        // Congressional earmark
  GRANT_OTHER         = 'GRANT_OTHER',          // Other grant types
  COOPERATIVE_AGREEMENT = 'COOPERATIVE_AGREEMENT', // Cooperative agreement
  
  // === FPDS-NG Contract Award Types ===
  CONTRACT_AWARD    = 'CONTRACT_AWARD',    // FPDS-NG contract award
  DELIVERY_ORDER    = 'DELIVERY_ORDER',    // Delivery order against IDIQ
  TASK_ORDER        = 'TASK_ORDER',        // Task order against IDIQ
  BPA_CALL          = 'BPA_CALL',          // BPA call order
  PURCHASE_ORDER    = 'PURCHASE_ORDER',    // Simple purchase order
  
  // === USASpending.gov Transaction Types ===
  CONTRACT_NEW      = 'CONTRACT_NEW',      // New contract (Type A)
  CONTRACT_CONTINUE = 'CONTRACT_CONTINUE', // Continuing contract (Type B)
  CONTRACT_MODIFY   = 'CONTRACT_MODIFY',   // Contract modification (Type C)
  ASSISTANCE_BLOCK_GRANT    = 'ASSISTANCE_BLOCK_GRANT',    // Block grant (Type 02)
  ASSISTANCE_FORMULA_GRANT  = 'ASSISTANCE_FORMULA_GRANT',  // Formula grant (Type 03)
  ASSISTANCE_PROJECT_GRANT  = 'ASSISTANCE_PROJECT_GRANT',  // Project grant (Type 04)
  ASSISTANCE_COOP_AGREEMENT = 'ASSISTANCE_COOP_AGREEMENT', // Cooperative agreement (Type 05)
  
  // === Special Procurement Types ===
  GSA_SCHEDULE      = 'GSA_SCHEDULE',      // GSA Schedule procurement
  OASIS             = 'OASIS',             // OASIS contract vehicle
  SEWP              = 'SEWP',              // SEWP contract vehicle
  CIO_SP3           = 'CIO_SP3',           // CIO-SP3 contract vehicle
  MICRO_PURCHASE    = 'MICRO_PURCHASE',    // Micro-purchase (<$10K)
  
  // === Legacy and Generic Types ===
  GRANT             = 'GRANT',             // Generic grant (backward compatibility)
  OTHER             = 'OTHER',             // Other opportunity types
}

// Enhanced ContractType - extends existing documents.ts but focused on opportunities
export enum ContractType {
  // Fixed Price Types
  FFP              = 'FFP',              // Firm Fixed Price
  FPI              = 'FPI',              // Fixed Price Incentive
  
  // Cost Types
  CPFF             = 'CPFF',             // Cost Plus Fixed Fee
  CPIF             = 'CPIF',             // Cost Plus Incentive Fee
  CPAF             = 'CPAF',             // Cost Plus Award Fee
  
  // Time-based Types
  TIME_AND_MATERIALS = 'TIME_AND_MATERIALS', // Time and Materials
  LABOR_HOUR       = 'LABOR_HOUR',       // Labor Hour
  
  // Contract Vehicle Types (extends documents.ts)
  IDIQ             = 'IDIQ',             // Indefinite Delivery/Indefinite Quantity
  GSA_SCHEDULE     = 'GSA_SCHEDULE',     // GSA Schedule
  BPA              = 'BPA',              // Blanket Purchase Agreement
  OASIS            = 'OASIS',            // OASIS contract vehicle
  CIO_SP3          = 'CIO_SP3',          // CIO-SP3 contract vehicle
  SEWP             = 'SEWP',             // SEWP contract vehicle
  
  // Special Types
  DEFINITIVE       = 'DEFINITIVE',       // Definitive Contract
  REQUIREMENTS     = 'REQUIREMENTS',     // Requirements Contract
  GRANT            = 'GRANT',            // Grant
  COOPERATIVE_AGREEMENT = 'COOPERATIVE_AGREEMENT', // Cooperative agreement
  
  // Legacy support
  FIXED_PRICE      = 'FIXED_PRICE',      // Fixed price legacy support
  COST_PLUS        = 'COST_PLUS',        // Cost plus legacy support
  INDEFINITE_DELIVERY = 'INDEFINITE_DELIVERY', // IDIQ legacy support
  BLANKET_PURCHASE = 'BLANKET_PURCHASE', // BPA legacy support
  OTHER            = 'OTHER',            // Other contract types
}

// Uses existing set-aside codes from src/types/set-asides.ts but as enums
export enum SetAsideType {
  // No Set-aside
  NONE             = 'NONE',             // No set-aside (Full and Open Competition)
  
  // Small Business Set-asides (from set-asides.json)
  SBA              = 'SBA',              // Total Small Business Set-Aside
  SBP              = 'SBP',              // Partial Small Business Set-Aside
  
  // 8(a) Program
  SBA_8A           = '8A',               // 8(a) Competitive
  SBA_8AN          = '8AN',              // 8(a) Non-competitive
  
  // HUBZone
  HUBZONE_COMPETITIVE = 'HZC',           // HUBZone Competitive
  HUBZONE_SOLE_SOURCE = 'HZS',           // HUBZone Sole Source
  
  // Service-Disabled Veteran-Owned
  SDVOSB_COMPETITIVE = 'SDVOSBC',        // SDVOSB Competitive
  SDVOSB_SOLE_SOURCE = 'SDVOSBS',        // SDVOSB Sole Source
  
  // Women-Owned Small Business
  WOSB             = 'WOSB',             // Women-Owned Small Business
  WOSB_SOLE_SOURCE = 'WOSBSS',           // WOSB Sole Source
  EDWOSB           = 'EDWOSB',           // Economically Disadvantaged WOSB
  EDWOSB_SOLE_SOURCE = 'EDWOSBSS',       // EDWOSB Sole Source
  
  // Geographic/Special Programs
  LOCAL_AREA       = 'LAS',              // Local Area Set-aside
  INDIAN_ECONOMIC  = 'IEE',              // Indian Economic Enterprise
  INDIAN_SMALL     = 'ISBEE',            // Indian Small Business Economic Enterprise
  
  // VA-Specific (from set-asides.json)
  VOSB_COMPETITIVE = 'VSA',              // VA Veteran-Owned Small Business
  VOSB_SOLE_SOURCE = 'VSS',              // VA VOSB Sole Source
  
  // Legacy/Other
  ABILITY_ONE      = 'ABILITY_ONE',      // AbilityOne (formerly JWOD)
  ANE              = 'ANE',              // Alaska Native Enterprise
  HIE              = 'HIE',              // Hawaiian Organization
  HBCU             = 'HBCU',             // Historically Black Colleges and Universities
  MI               = 'MI',               // Minority Institution
}

export enum CompetitionType {
  FULL_AND_OPEN                    = 'FULL_AND_OPEN',
  FULL_AND_OPEN_AFTER_EXCLUSION    = 'FULL_AND_OPEN_AFTER_EXCLUSION',
  SET_ASIDE_ONLY                   = 'SET_ASIDE_ONLY',
  SOLE_SOURCE                      = 'SOLE_SOURCE',
  LIMITED_SOURCES                  = 'LIMITED_SOURCES',
  FOLLOW_ON                        = 'FOLLOW_ON',
  BRAND_NAME                       = 'BRAND_NAME',
  ARCHITECT_ENGINEER               = 'ARCHITECT_ENGINEER',
  GSA_FEDERAL_SUPPLY              = 'GSA_FEDERAL_SUPPLY',
}

// Re-export existing SecurityClearanceLevel from lib/security-clearance.ts
// This maintains compatibility while making it available globally
export { SecurityClearanceLevel }

export enum ProcurementMethod {
  SEALED_BID       = 'SEALED_BID',       // Sealed bidding
  COMPETITIVE_PROPOSALS = 'COMPETITIVE_PROPOSALS', // Competitive proposals
  GSA_SCHEDULE     = 'GSA_SCHEDULE',     // GSA Schedule
  OASIS            = 'OASIS',            // OASIS contract vehicle
  SEWP             = 'SEWP',             // SEWP contract vehicle
  CIO_SP3          = 'CIO_SP3',          // CIO-SP3 contract vehicle
  NITAAC           = 'NITAAC',           // NITAAC contract vehicle
  MICRO_PURCHASE   = 'MICRO_PURCHASE',   // Micro-purchase
  SIMPLIFIED_ACQUISITION = 'SIMPLIFIED_ACQUISITION', // Simplified acquisition procedures
  COMMERCIAL_ITEM  = 'COMMERCIAL_ITEM',  // Commercial item procedures
  EMERGENCY        = 'EMERGENCY',        // Emergency procurement
  BRIDGE_CONTRACT  = 'BRIDGE_CONTRACT',  // Bridge contract
  GRANT_APPLICATION = 'GRANT_APPLICATION', // Grant application process
}

export enum ContractDuration {
  UNDER_1_YEAR     = 'UNDER_1_YEAR',     // Under 1 year
  ONE_YEAR         = '1_YEAR',           // 1 year
  TWO_YEARS        = '2_YEARS',          // 2 years
  THREE_YEARS      = '3_YEARS',          // 3 years
  FOUR_YEARS       = '4_YEARS',          // 4 years
  FIVE_YEARS       = '5_YEARS',          // 5 years
  OVER_5_YEARS     = 'OVER_5_YEARS',     // Over 5 years
  INDEFINITE       = 'INDEFINITE',       // Indefinite duration
  OPTION_YEARS     = 'OPTION_YEARS',     // Base + option years
}

// =============================================
// AWARD AND STATUS ENUMS
// =============================================

export enum AwardType {
  CONTRACT         = 'CONTRACT',         // Contract award
  GRANT            = 'GRANT',            // Grant award
  COOPERATIVE_AGREEMENT = 'COOPERATIVE_AGREEMENT', // Cooperative agreement
  PURCHASE_ORDER   = 'PURCHASE_ORDER',   // Purchase order
  DELIVERY_ORDER   = 'DELIVERY_ORDER',   // Delivery order
  TASK_ORDER       = 'TASK_ORDER',       // Task order
  BPA_CALL         = 'BPA_CALL',         // BPA call order
  MODIFICATION     = 'MODIFICATION',     // Contract modification
}

// Enhanced OpportunityStatus - extends existing prisma enum with SAM.gov requirements
export enum OpportunityStatus {
  ACTIVE           = 'ACTIVE',           // Active opportunity
  INACTIVE         = 'INACTIVE',         // Inactive opportunity
  CLOSED           = 'CLOSED',           // Closed opportunity
  CANCELLED        = 'CANCELLED',        // Cancelled opportunity
  AWARDED          = 'AWARDED',          // Successfully awarded
  DRAFT            = 'DRAFT',            // Draft opportunity
  ARCHIVED         = 'ARCHIVED',         // Archived opportunity
  DELETED          = 'DELETED',          // Deleted opportunity
  // Extended statuses for comprehensive tracking
  PENDING          = 'PENDING',          // Award pending
  TERMINATED       = 'TERMINATED',       // Contract terminated
  COMPLETED        = 'COMPLETED',        // Contract completed
  SUSPENDED        = 'SUSPENDED',        // Contract suspended
}

export enum AwardStatus {
  PENDING          = 'PENDING',          // Award pending
  AWARDED          = 'AWARDED',          // Successfully awarded
  CANCELLED        = 'CANCELLED',        // Award cancelled
  TERMINATED       = 'TERMINATED',       // Contract terminated
  COMPLETED        = 'COMPLETED',        // Contract completed
  ACTIVE           = 'ACTIVE',           // Active contract
  CLOSED           = 'CLOSED',           // Contract closed
  SUSPENDED        = 'SUSPENDED',        // Contract suspended
}

// =============================================
// DISPLAY MAPPINGS AND UTILITIES
// =============================================

export const SOURCE_SYSTEM_LABELS: Record<SourceSystem, string> = {
  [SourceSystem.SAM_GOV]: 'SAM.gov',
  [SourceSystem.HIGHERGOV]: 'HigherGov',
  [SourceSystem.USA_SPENDING]: 'USASpending.gov',
  [SourceSystem.FPDS_NG]: 'FPDS-NG',
  [SourceSystem.GRANTS_GOV]: 'Grants.gov',
  [SourceSystem.MANUAL]: 'Manual Entry',
  [SourceSystem.IMPORT]: 'Imported Data',
}

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  // SAM.gov Notice Types
  [OpportunityType.SOLICITATION]: 'Solicitation',
  [OpportunityType.PRESOLICITATION]: 'Pre-Solicitation',
  [OpportunityType.AWARD_NOTICE]: 'Award Notice',
  [OpportunityType.SOURCES_SOUGHT]: 'Sources Sought',
  [OpportunityType.SPECIAL_NOTICE]: 'Special Notice',
  [OpportunityType.JUSTIFICATION]: 'Justification & Approval',
  [OpportunityType.SALE_OF_SURPLUS]: 'Sale of Surplus Property',
  [OpportunityType.COMBINED_SYNOPSIS]: 'Combined Synopsis/Solicitation',
  [OpportunityType.INTENT_TO_BUNDLE]: 'Intent to Bundle Requirements',
  
  // Request Types
  [OpportunityType.RFP]: 'Request for Proposals',
  [OpportunityType.RFQ]: 'Request for Quotations',
  [OpportunityType.RFI]: 'Request for Information',
  [OpportunityType.IFB]: 'Invitation for Bids',
  
  // Amendment Types
  [OpportunityType.AMENDMENT]: 'Amendment',
  [OpportunityType.MODIFICATION]: 'Modification',
  [OpportunityType.NOTICE]: 'Notice',
  
  // Grants.gov Types
  [OpportunityType.GRANT_DISCRETIONARY]: 'Discretionary Grant',
  [OpportunityType.GRANT_CONTINUATION]: 'Continuation Grant',
  [OpportunityType.GRANT_MANDATORY]: 'Mandatory Grant',
  [OpportunityType.GRANT_EARMARK]: 'Earmark Grant',
  [OpportunityType.GRANT_OTHER]: 'Other Grant',
  [OpportunityType.COOPERATIVE_AGREEMENT]: 'Cooperative Agreement',
  
  // FPDS-NG Contract Types
  [OpportunityType.CONTRACT_AWARD]: 'Contract Award',
  [OpportunityType.DELIVERY_ORDER]: 'Delivery Order',
  [OpportunityType.TASK_ORDER]: 'Task Order',
  [OpportunityType.BPA_CALL]: 'BPA Call Order',
  [OpportunityType.PURCHASE_ORDER]: 'Purchase Order',
  
  // USASpending Transaction Types
  [OpportunityType.CONTRACT_NEW]: 'New Contract',
  [OpportunityType.CONTRACT_CONTINUE]: 'Continuing Contract',
  [OpportunityType.CONTRACT_MODIFY]: 'Contract Modification',
  [OpportunityType.ASSISTANCE_BLOCK_GRANT]: 'Block Grant',
  [OpportunityType.ASSISTANCE_FORMULA_GRANT]: 'Formula Grant',
  [OpportunityType.ASSISTANCE_PROJECT_GRANT]: 'Project Grant',
  [OpportunityType.ASSISTANCE_COOP_AGREEMENT]: 'Assistance Cooperative Agreement',
  
  // Special Procurement Types
  [OpportunityType.GSA_SCHEDULE]: 'GSA Schedule',
  [OpportunityType.OASIS]: 'OASIS',
  [OpportunityType.SEWP]: 'SEWP',
  [OpportunityType.CIO_SP3]: 'CIO-SP3',
  [OpportunityType.MICRO_PURCHASE]: 'Micro Purchase',
  
  // Legacy Types
  [OpportunityType.GRANT]: 'Grant',
  [OpportunityType.OTHER]: 'Other',
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  [ContractType.FFP]: 'Firm Fixed Price',
  [ContractType.FPI]: 'Fixed Price Incentive',
  [ContractType.CPFF]: 'Cost Plus Fixed Fee',
  [ContractType.CPIF]: 'Cost Plus Incentive Fee',
  [ContractType.CPAF]: 'Cost Plus Award Fee',
  [ContractType.TIME_AND_MATERIALS]: 'Time & Materials',
  [ContractType.LABOR_HOUR]: 'Labor Hour',
  [ContractType.IDIQ]: 'IDIQ',
  [ContractType.GSA_SCHEDULE]: 'GSA Schedule',
  [ContractType.BPA]: 'Blanket Purchase Agreement',
  [ContractType.OASIS]: 'OASIS',
  [ContractType.CIO_SP3]: 'CIO-SP3',
  [ContractType.SEWP]: 'SEWP',
  [ContractType.DEFINITIVE]: 'Definitive Contract',
  [ContractType.REQUIREMENTS]: 'Requirements Contract',
  [ContractType.GRANT]: 'Grant',
  [ContractType.COOPERATIVE_AGREEMENT]: 'Cooperative Agreement',
  [ContractType.OTHER]: 'Other',
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Check if a source system supports real-time data
 */
export function isRealTimeSource(source: SourceSystem): boolean {
  return [
    SourceSystem.SAM_GOV,
    SourceSystem.HIGHERGOV,
    SourceSystem.GRANTS_GOV
  ].includes(source)
}

/**
 * Check if an opportunity type is procurement-related (vs grants)
 */
export function isProcurementOpportunity(type: OpportunityType): boolean {
  return ![
    OpportunityType.GRANT,
    OpportunityType.COOPERATIVE_AGREEMENT
  ].includes(type)
}

/**
 * Get all enum values as arrays (useful for dropdowns)
 */
export const OPPORTUNITY_ENUM_VALUES = {
  sourceSystem: Object.values(SourceSystem),
  opportunityType: Object.values(OpportunityType),
  contractType: Object.values(ContractType),
  setAsideType: Object.values(SetAsideType),
  competitionType: Object.values(CompetitionType),
  securityClearanceLevel: Object.values(SecurityClearanceLevel),
  procurementMethod: Object.values(ProcurementMethod),
  contractDuration: Object.values(ContractDuration),
  awardType: Object.values(AwardType),
  opportunityStatus: Object.values(OpportunityStatus),
  awardStatus: Object.values(AwardStatus),
} as const

/**
 * Backward compatibility mappings for existing code
 */
export const LEGACY_MAPPINGS = {
  // Map document ContractType to opportunity ContractType
  documentToOpportunityContractType: {
    'FIXED_PRICE': ContractType.FFP,
    'COST_PLUS': ContractType.CPFF,
    'TIME_AND_MATERIALS': ContractType.TIME_AND_MATERIALS,
    'INDEFINITE_DELIVERY': ContractType.IDIQ,
    'BLANKET_PURCHASE': ContractType.BPA,
    'GSA_SCHEDULE': ContractType.GSA_SCHEDULE,
    'OASIS': ContractType.OASIS,
    'CIO_SP3': ContractType.CIO_SP3,
    'SEWP': ContractType.SEWP,
    'OTHER': ContractType.OTHER,
  },
  
  // Map set-aside codes to enum values
  setAsideCodeToEnum: {
    'SBA': SetAsideType.SBA,
    'SBP': SetAsideType.SBP,
    '8A': SetAsideType.SBA_8A,
    '8AN': SetAsideType.SBA_8AN,
    'HZC': SetAsideType.HUBZONE_COMPETITIVE,
    'HZS': SetAsideType.HUBZONE_SOLE_SOURCE,
    'SDVOSBC': SetAsideType.SDVOSB_COMPETITIVE,
    'SDVOSBS': SetAsideType.SDVOSB_SOLE_SOURCE,
    'WOSB': SetAsideType.WOSB,
    'WOSBSS': SetAsideType.WOSB_SOLE_SOURCE,
    'EDWOSB': SetAsideType.EDWOSB,
    'EDWOSBSS': SetAsideType.EDWOSB_SOLE_SOURCE,
    'LAS': SetAsideType.LOCAL_AREA,
    'IEE': SetAsideType.INDIAN_ECONOMIC,
    'ISBEE': SetAsideType.INDIAN_SMALL,
    'VSA': SetAsideType.VOSB_COMPETITIVE,
    'VSS': SetAsideType.VOSB_SOLE_SOURCE,
  },

  // Map SAM.gov procurement type codes to OpportunityType enum
  samGovTypeToEnum: {
    'u': OpportunityType.JUSTIFICATION,     // Justification (J&A)
    'p': OpportunityType.PRESOLICITATION,   // Pre solicitation
    'a': OpportunityType.AWARD_NOTICE,      // Award Notice
    'r': OpportunityType.SOURCES_SOUGHT,    // Sources Sought
    's': OpportunityType.SPECIAL_NOTICE,    // Special Notice
    'o': OpportunityType.SOLICITATION,      // Solicitation
    'g': OpportunityType.SALE_OF_SURPLUS,   // Sale of Surplus Property
    'k': OpportunityType.COMBINED_SYNOPSIS, // Combined Synopsis/Solicitation
    'i': OpportunityType.INTENT_TO_BUNDLE,  // Intent to Bundle Requirements (DoD-Funded)
    // Retired types (for backward compatibility)
    'f': OpportunityType.SPECIAL_NOTICE,    // Foreign Government Standard (retired, map to Special Notice)
    'l': OpportunityType.SOURCES_SOUGHT,    // Fair Opportunity / Limited Sources (retired, map to Sources Sought)
  },

  // Map Grants.gov opportunity categories to OpportunityType enum
  grantsGovTypeToEnum: {
    'Discretionary': OpportunityType.GRANT,
    'Continuation': OpportunityType.GRANT,
    'Mandatory': OpportunityType.GRANT,
    'Earmark': OpportunityType.GRANT,
    'Other': OpportunityType.COOPERATIVE_AGREEMENT,
  },

  // Map USASpending.gov award type codes to OpportunityType/AwardType enums
  usaSpendingAwardTypeToEnum: {
    // Contract Award Types
    'A': OpportunityType.AWARD_NOTICE,      // Contract award
    'B': OpportunityType.AWARD_NOTICE,      // Contract award
    'C': OpportunityType.AWARD_NOTICE,      // Contract award
    'D': OpportunityType.AWARD_NOTICE,      // Contract award
    '02': OpportunityType.AWARD_NOTICE,     // Block Grant
    '03': OpportunityType.AWARD_NOTICE,     // Formula Grant
    '04': OpportunityType.GRANT,            // Project Grant
    '05': OpportunityType.COOPERATIVE_AGREEMENT, // Cooperative Agreement
    '06': OpportunityType.GRANT,            // Fellowship
    '07': OpportunityType.GRANT,            // Scholarship
    '08': OpportunityType.GRANT,            // Training Grant
    '09': OpportunityType.GRANT,            // Construction Grant
    '10': OpportunityType.GRANT,            // Food Commodities
    '11': OpportunityType.GRANT,            // Sale/Exchange of Property
    // IDV Types
    'IDV_A': OpportunityType.SOLICITATION,  // Indefinite Delivery Vehicle
    'IDV_B': OpportunityType.SOLICITATION,  // Federal Supply Schedule
    'IDV_B_A': OpportunityType.SOLICITATION, // BPA under FSS
    'IDV_B_B': OpportunityType.SOLICITATION, // BPA under FSS
    'IDV_B_C': OpportunityType.SOLICITATION, // BPA under FSS
    'IDV_C': OpportunityType.SOLICITATION,  // Government Wide Acquisition Contract
    'IDV_D': OpportunityType.SOLICITATION,  // Multi-Agency Contract
    'IDV_E': OpportunityType.SOLICITATION,  // Study and Analysis
  }
} as const