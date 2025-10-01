import { z } from 'zod'

// Simplified Certification form validation schema - Only set-asides
export const SimpleCertificationFormSchema = z
  .object({
    // Set-aside selections - only field needed now
    selectedSetAsides: z
      .array(z.string())
      .default([])
      .describe(
        'Array of set-aside codes that the company wants to pursue. These are independent of certifications and represent contracting opportunities the company is eligible for or wants to target.'
      ),
  })
  .describe(
    'Simplified schema for set-aside selection only. Detailed certifications are managed through the comprehensive certification system.'
  )

export type SimpleCertificationFormData = z.infer<typeof SimpleCertificationFormSchema>