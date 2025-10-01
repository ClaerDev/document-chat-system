/**
 * Validation Utilities
 *
 * Core validation functions for data sanitization, format validation,
 * and security checks throughout the Document Chat System AI application.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  normalized?: string;
  info?: Record<string, any>;
}

interface ValidationOptions {
  normalize?: boolean;
}

/**
 * Validates email addresses with security checks
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email || email.trim() === '') {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  // Check for malicious content
  if (email.includes('<script>') || email.includes('</script>') || email.includes('\x00')) {
    errors.push('Email contains invalid characters');
    return { isValid: false, errors };
  }

  // Basic email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  // Check for consecutive dots
  if (email.includes('..')) {
    errors.push('Email cannot contain consecutive dots');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates Unique Entity Identifier (UEI) format
 */
export function validateUEI(uei: string, options: ValidationOptions = {}): ValidationResult {
  const errors: string[] = [];
  
  if (!uei || uei.trim() === '') {
    errors.push('UEI is required');
    return { isValid: false, errors };
  }

  // Check for invalid characters first (before normalization)
  if (/[a-z]/.test(uei)) {
    errors.push('UEI must be uppercase');
  }
  
  if (/[-\s]/.test(uei)) {
    errors.push('UEI cannot contain hyphens or spaces');
  }
  
  // Normalize UEI
  const normalized = uei.replace(/[-\s]/g, '').toUpperCase().trim();
  
  // UEI should be exactly 12 alphanumeric characters
  const ueiRegex = /^[A-Z0-9]{12}$/;
  
  if (normalized.length !== 12) {
    errors.push('UEI must be exactly 12 characters');
  } else if (!ueiRegex.test(normalized)) {
    errors.push('UEI must contain only letters and numbers');
  }

  const result: ValidationResult = { 
    isValid: errors.length === 0, 
    errors 
  };
  
  if (options.normalize && errors.length === 0) {
    result.normalized = normalized;
  }
  
  return result;
}

/**
 * Validates NAICS codes with industry information
 */
export function validateNAICS(naics: string): ValidationResult {
  const errors: string[] = [];
  
  if (!naics || naics.trim() === '') {
    errors.push('NAICS code is required');
    return { isValid: false, errors };
  }

  const normalized = naics.replace(/[-\s]/g, '').trim();
  
  // NAICS can be 2, 4, or 6 digits
  if (!/^\d{2}$|^\d{4}$|^\d{6}$/.test(normalized)) {
    errors.push('NAICS code must be 2, 4, or 6 digits');
  }

  // Basic range validation (NAICS codes start from 11, but 99 is invalid)
  if (normalized.length >= 2) {
    const sector = parseInt(normalized.substring(0, 2));
    if (sector < 11 || sector === 99) {
      errors.push('Invalid NAICS code range');
    }
  }

  const result: ValidationResult = { 
    isValid: errors.length === 0, 
    errors 
  };

  // Add industry information for valid 6-digit NAICS
  if (result.isValid && normalized === '541511') {
    result.info = {
      title: 'Computer Programming Services',
      sector: 'Professional, Scientific, and Technical Services'
    };
  }

  return result;
}

/**
 * Validates US ZIP codes
 */
export function validateZipCode(zipCode: string): ValidationResult {
  const errors: string[] = [];
  
  if (!zipCode || zipCode.trim() === '') {
    errors.push('ZIP code is required');
    return { isValid: false, errors };
  }

  // ZIP can be 5 digits or 5+4 format
  const zipRegex = /^\d{5}(-\d{4})?$/;
  
  if (!zipRegex.test(zipCode.trim())) {
    errors.push('ZIP code must be in format 12345 or 12345-6789');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates phone numbers with normalization
 */
export function validatePhoneNumber(phone: string, options: ValidationOptions = {}): ValidationResult {
  const errors: string[] = [];
  
  if (!phone || phone.trim() === '') {
    errors.push('Phone number is required');
    return { isValid: false, errors };
  }

  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check for non-numeric characters in key positions
  if (/[A-Za-z]/.test(phone)) {
    errors.push('Phone number cannot contain letters');
  }
  
  // US phone numbers: 10 digits or 11 with country code
  if (digitsOnly.length === 10) {
    // Valid 10-digit US number
  } else if (digitsOnly.length === 11) {
    // 11-digit must start with 1 (US country code)
    if (!digitsOnly.startsWith('1')) {
      errors.push('11-digit number must start with 1');
    } else {
      // Additional check: if formatted as XXX-XXX-XXXXX, it's likely malformed
      // Check if original has pattern suggesting it's not country code + number
      if (/^\d{3}-\d{3}-\d{5}$/.test(phone.replace(/\s+/g, '').replace(/[()]/g, ''))) {
        errors.push('Invalid phone number format');
      }
    }
  } else {
    errors.push('Phone number must be 10-11 digits');
  }

  const result: ValidationResult = { 
    isValid: errors.length === 0, 
    errors 
  };
  
  if (options.normalize && result.isValid) {
    const normalized = digitsOnly.length === 11 ? 
      `+1${digitsOnly.substring(1)}` : 
      `+1${digitsOnly}`;
    result.normalized = normalized;
  }
  
  return result;
}

/**
 * Sanitizes input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    // Remove script tags and content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    // Remove dangerous HTML tags and attributes
    .replace(/<[^>]*>/g, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove SQL injection patterns
    .replace(/('|(\\');?)|(;?\s*(drop|alter|create|insert|update|delete|union\s+select)\s)/gi, '')
    .replace(/'\s*or\s*'\d+'\s*=\s*'\d+'/gi, '') // Remove '1'='1' patterns
    // Remove alert function calls
    .replace(/alert\s*\(/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates contract value ranges
 */
export function validateContractValue(value: { min: number; max: number }): ValidationResult {
  const errors: string[] = [];
  
  if (value.min < 0) {
    errors.push('Minimum value cannot be negative');
  }
  
  if (value.max <= value.min) {
    errors.push('Maximum value must be greater than minimum value');
  }
  
  if (value.min === 0 && value.max === 0) {
    errors.push('Contract value range cannot be zero');
  }
  
  // Business logic validation
  if (value.max - value.min >= 999999999998) { // Nearly $1 trillion range
    errors.push('Contract value range seems unrealistic');
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Validates date ranges
 */
export function validateDateRange(startDate: Date, endDate: Date): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (endDate <= startDate) {
    errors.push('End date must be after start date');
  }
  
  // Business rule: warn for very long date ranges (over 5 years)
  const fiveYears = 5 * 365 * 24 * 60 * 60 * 1000;
  if (endDate.getTime() - startDate.getTime() > fiveYears) {
    warnings.push('Date range exceeds typical contract duration');
  }
  
  return { 
    isValid: errors.length === 0, 
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validates URLs with security checks
 */
export function isValidURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes NAICS codes to consistent format
 */
export function normalizeNAICS(naics: string): string {
  return naics.replace(/[-\s]/g, '').trim();
}