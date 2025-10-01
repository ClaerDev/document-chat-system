/**
 * SAM.gov API Client
 * Handles integration with SAM.gov Entity Management API
 */

import { z } from 'zod'
import type { SamGovRegistration } from '@/types/profile'

// Validation schemas
const samGovEntitySchema = z.object({
  entityRegistration: z.object({
    entityEVSMonitoring: z.object({
      legalBusinessName: z.string().describe('Legal business name from SAM.gov registration'),
      dbaName: z.string().optional().describe('Doing Business As name'),
      purposeOfRegistrationCode: z.string().optional().describe('Purpose of registration code'),
      registrationStatus: z.enum(['Active', 'Inactive', 'Expired']).describe('Current registration status'),
      evsSource: z.string().optional().describe('EVS monitoring source'),
      cageCode: z.string().optional().describe('CAGE code assigned to entity'),
      dodaac: z.string().optional().describe('DoDAAC code if applicable'),
      legalBusinessNameEntered: z.string().optional().describe('Legal business name as entered'),
      dbaNameEntered: z.string().optional().describe('DBA name as entered')
    }).describe('Entity EVS monitoring information'),
    coreData: z.object({
      entityHierarchyInformation: z.object({
        immediateParentEntity: z.object({
          ueiSAM: z.string().optional().describe('Parent entity UEI'),
          legalBusinessName: z.string().optional().describe('Parent entity name'),
          physicalAddress: z.object({
            addressLine1: z.string().optional().describe('Parent address line 1'),
            addressLine2: z.string().optional().describe('Parent address line 2'),
            city: z.string().optional().describe('Parent city'),
            stateOrProvinceCode: z.string().optional().describe('Parent state code'),
            zipCode: z.string().optional().describe('Parent ZIP code'),
            countryCode: z.string().optional().describe('Parent country code')
          }).optional().describe('Parent entity physical address')
        }).optional().describe('Immediate parent entity information'),
        ultimateParentEntity: z.object({
          ueiSAM: z.string().optional().describe('Ultimate parent entity UEI'),
          legalBusinessName: z.string().optional().describe('Ultimate parent entity name')
        }).optional().describe('Ultimate parent entity information')
      }).optional().describe('Entity hierarchy information'),
      mailingAddress: z.object({
        addressLine1: z.string().optional().describe('Mailing address line 1'),
        addressLine2: z.string().optional().describe('Mailing address line 2'),
        city: z.string().optional().describe('Mailing city'),
        stateOrProvinceCode: z.string().optional().describe('Mailing state code'),
        zipCode: z.string().optional().describe('Mailing ZIP code'),
        countryCode: z.string().describe('Mailing country code')
      }).optional().describe('Entity mailing address'),
      physicalAddress: z.object({
        addressLine1: z.string().optional().describe('Physical address line 1'),
        addressLine2: z.string().optional().describe('Physical address line 2'),
        city: z.string().optional().describe('Physical city'),
        stateOrProvinceCode: z.string().optional().describe('Physical state code'),
        zipCode: z.string().optional().describe('Physical ZIP code'),
        countryCode: z.string().describe('Physical country code')
      }).optional().describe('Entity physical address'),
      generalInformation: z.object({
        entityStartDate: z.string().optional().describe('Entity start date'),
        fiscalYearEndCloseDate: z.string().optional().describe('Fiscal year end date'),
        submissionDate: z.string().optional().describe('Registration submission date')
      }).optional().describe('General entity information'),
      businessTypes: z.object({
        businessTypeList: z.array(z.object({
          businessTypeCode: z.string().describe('Business type code'),
          businessTypeDesc: z.string().describe('Business type description')
        })).optional().describe('List of business types')
      }).optional().describe('Business type classifications'),
      naicsInformation: z.object({
        naicsDetails: z.array(z.object({
          naicsCode: z.string().describe('NAICS code'),
          naicsDescription: z.string().describe('NAICS description'),
          isPrimary: z.boolean().optional().describe('Whether this is the primary NAICS code')
        })).optional().describe('NAICS code details')
      }).optional().describe('NAICS classification information (legacy location, may not be used in v4)')
    }).describe('Core entity data'),
    repsAndCerts: z.object({
      goodsAndServices: z.object({
        naics: z.array(z.object({
          naicsCode: z.string().describe('NAICS code'),
          naicsDescription: z.string().optional().describe('NAICS description'),
          isPrimary: z.boolean().optional().describe('Whether this is the primary NAICS code')
        })).optional().describe('NAICS codes for goods and services')
      }).optional().describe('Goods and services information'),
      certifications: z.union([
        z.array(z.any()).optional().describe('Direct certifications array'),
        z.object({
          fARResponses: z.array(z.object({
            provisionId: z.string().describe('FAR provision ID'),
            listOfAnswers: z.array(z.object({
              answerText: z.string().describe('Answer text'),
              section: z.string().optional().describe('Section reference'),
              questionText: z.string().optional().describe('Question text')
            })).describe('List of answers to FAR questions')
          })).optional().describe('FAR responses and certifications')
        }).optional().describe('Certifications object with FAR responses')
      ]).optional().describe('Certifications and representations')
    }).optional().describe('Representations and certifications')
  }).describe('Complete entity registration data')
}).describe('SAM.gov entity response structure')

// API Response type
type SamGovEntityResponse = z.infer<typeof samGovEntitySchema>

export class SamGovApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message)
    this.name = 'SamGovApiError'
  }
}

export class SamGovClient {
  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl = process.env.SAM_API_BASE_URL || 'https://api.sam.gov'
    this.apiKey = process.env.SAM_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('SAM.gov API key not configured. Set SAM_API_KEY environment variable.')
    }
  }

  /**
   * Fetches entity data from SAM.gov using UEI
   */
  async getEntityByUei(uei: string): Promise<SamGovRegistration> {
    if (!this.apiKey) {
      throw new SamGovApiError('SAM.gov API key not configured')
    }

    try {
      const url = `${this.baseUrl}/entity-information/v4/entities?api_key=${this.apiKey}&ueiSAM=[${uei}]&includeSections=entityRegistration,coreData,repsAndCerts,pointsOfContact`
      
      console.log(`SAM.gov client: Fetching from v4 API with sections: entityRegistration,coreData,repsAndCerts,pointsOfContact`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GovMatchAI/1.0'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new SamGovApiError(`Entity with UEI ${uei} not found in SAM.gov`, 404)
        }
        if (response.status === 401) {
          throw new SamGovApiError('Invalid SAM.gov API key', 401)
        }
        if (response.status === 429) {
          throw new SamGovApiError('SAM.gov API rate limit exceeded', 429)
        }
        
        throw new SamGovApiError(`SAM.gov API error: ${response.status} ${response.statusText}`, response.status)
      }

      const data = await response.json()
      
      // Validate response structure
      const validatedData = samGovEntitySchema.parse(data)
      
      // Transform to our profile format
      return this.transformToProfileFormat(validatedData, uei)
      
    } catch (error) {
      if (error instanceof SamGovApiError) {
        throw error
      }
      if (error instanceof z.ZodError) {
        console.error('SAM.gov response validation error:', error.errors)
        throw new SamGovApiError('Invalid response format from SAM.gov')
      }
      
      console.error('SAM.gov API error:', error)
      throw new SamGovApiError('Failed to fetch entity data from SAM.gov')
    }
  }

  /**
   * Transforms SAM.gov API response to our SamGovRegistration format
   */
  private transformToProfileFormat(data: any, uei: string): SamGovRegistration {
    // Handle v4 API structure
    const entity = data.entityData?.[0]
    const entityRegistration = entity?.entityRegistration
    const coreData = entity?.coreData
    
    // Use physical address as primary, fall back to mailing address
    const address = coreData?.physicalAddress || coreData?.mailingAddress || {}
    
    // Extract NAICS codes from repsAndCerts.goodsAndServices.naics
    const repsAndCerts = entity?.repsAndCerts
    const naicsCodes = repsAndCerts?.goodsAndServices?.naics || []
    
    console.log(`SAM.gov client: Found ${naicsCodes.length} NAICS codes in repsAndCerts.goodsAndServices.naics`)

    // Extract business types
    const businessTypes = coreData?.businessTypes?.businessTypeList?.map((bt: any) => bt.businessTypeDesc) || []

    // Extract certifications from repsAndCerts.certifications
    const certifications = this.extractCertifications(repsAndCerts)
    console.log(`SAM.gov client: Extracted certifications:`, certifications)

    return {
      uei,
      entityName: entityRegistration?.legalBusinessName || 'Unknown',
      dbaName: entityRegistration?.dbaName,
      cageCode: entityRegistration?.cageCode,
      address: {
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        stateOrProvinceCode: address.stateOrProvinceCode,
        zipCode: address.zipCode,
        countryCode: address.countryCode || 'USA'
      },
      businessTypes,
      naicsCodes,
      certifications: certifications.length > 0 ? certifications : undefined,
      registrationStatus: entityRegistration?.registrationStatus || 'Unknown',
      registrationDate: entityRegistration?.registrationDate,
      lastUpdateDate: entityRegistration?.lastUpdateDate || new Date().toISOString(),
      businessStartDate: coreData?.entityInformation?.entityStartDate,
      fiscalYearEndCloseDate: coreData?.entityInformation?.fiscalYearEndCloseDate,
      purposeOfRegistration: entityRegistration?.purposeOfRegistrationCode ? [entityRegistration.purposeOfRegistrationCode] : undefined
    }
  }

  /**
   * Extracts certification information from repsAndCerts section
   */
  private extractCertifications(repsAndCerts?: any): any[] {
    const certifications: any[] = []
    
    // Check direct certifications array
    if (repsAndCerts?.certifications && Array.isArray(repsAndCerts.certifications)) {
      certifications.push(...repsAndCerts.certifications)
    }
    
    // Check FAR responses for certification information
    if (repsAndCerts?.certifications?.fARResponses) {
      // Map common FAR provision IDs to certification names
      const farMappings = {
        'FAR 52.219-1': '8(a) Small Disadvantaged Business',
        'FAR 52.219-3': 'HUBZone Small Business',
        'FAR 52.219-27': 'Service-Disabled Veteran-Owned Small Business',
        'FAR 52.219-29': 'Women-Owned Small Business',
        'FAR 52.219-30': 'Economically Disadvantaged Women-Owned Small Business',
        'FAR 52.219-14': 'Small Disadvantaged Business'
      }

      for (const response of repsAndCerts.certifications.fARResponses) {
        const certificationName = farMappings[response.provisionId as keyof typeof farMappings]
        
        if (certificationName && response.listOfAnswers) {
          const answer = response.listOfAnswers[0]
          const isCertified = answer?.answerText?.toLowerCase().includes('yes') || 
                             answer?.answerText?.toLowerCase().includes('certified')
          
          if (isCertified) {
            certifications.push({
              provisionId: response.provisionId,
              name: certificationName,
              certified: true,
              answerText: answer.answerText
            })
          }
        }
      }
    }

    console.log(`Extracted ${certifications.length} certifications from SAM.gov data`)
    return certifications
  }

  /**
   * Validates UEI format
   */
  static validateUei(uei: string): { isValid: boolean; error?: string } {
    if (!uei) {
      return { isValid: false, error: 'UEI is required' }
    }

    if (uei.length !== 12) {
      return { isValid: false, error: 'UEI must be exactly 12 characters' }
    }

    if (!/^[A-Z0-9]{12}$/.test(uei)) {
      return { isValid: false, error: 'UEI must contain only uppercase letters and numbers' }
    }

    return { isValid: true }
  }

  /**
   * Gets SAM.gov entity status by UEI (lightweight check)
   */
  async getEntityStatus(uei: string): Promise<{ status: string; isActive: boolean }> {
    try {
      const entity = await this.getEntityByUei(uei)
      return {
        status: entity.registrationStatus,
        isActive: entity.registrationStatus === 'Active'
      }
    } catch (error) {
      if (error instanceof SamGovApiError && error.statusCode === 404) {
        return {
          status: 'Not Found',
          isActive: false
        }
      }
      throw error
    }
  }
}

// Export singleton instance
export const samGovClient = new SamGovClient()

// Export utilities
export type { SamGovEntityResponse }