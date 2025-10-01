/**
 * Data Masking Utilities for Sensitive Information in Audit Logs
 * Implements SOC 2 compliant data protection for audit trails
 */

/**
 * Mask sensitive data in an object based on field names
 */
export function maskSensitiveData(
  data: any,
  sensitiveFields: string[]
): any {
  if (!data) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, sensitiveFields));
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const masked = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in masked) {
        masked[field] = maskValue(masked[field], field);
      }
      
      // Handle nested fields (e.g., "address.street")
      if (field.includes('.')) {
        const parts = field.split('.');
        let current = masked;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (current[parts[i]]) {
            current = current[parts[i]];
          }
        }
        
        const lastPart = parts[parts.length - 1];
        if (current && lastPart in current) {
          current[lastPart] = maskValue(current[lastPart], field);
        }
      }
    }
    
    return masked;
  }
  
  return data;
}

/**
 * Mask a single value based on its type and field name
 */
function maskValue(value: any, fieldName: string): string {
  if (value === null || value === undefined) {
    return value;
  }
  
  const valueStr = String(value);
  
  // Email masking: show first letter and domain
  if (fieldName.toLowerCase().includes('email')) {
    const parts = valueStr.split('@');
    if (parts.length === 2) {
      const localPart = parts[0];
      const domain = parts[1];
      return `${localPart[0]}${'*'.repeat(Math.min(localPart.length - 1, 6))}@${domain}`;
    }
  }
  
  // Phone masking: show area code and last 2 digits
  if (fieldName.toLowerCase().includes('phone')) {
    const digits = valueStr.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `(${digits.slice(0, 3)}) ***-**${digits.slice(-2)}`;
    }
  }
  
  // SSN/Tax ID masking: show last 4 digits
  if (
    fieldName.toLowerCase().includes('ssn') ||
    fieldName.toLowerCase().includes('tax') ||
    fieldName.toLowerCase().includes('ein') ||
    fieldName.toLowerCase().includes('duns') ||
    fieldName.toLowerCase().includes('cage')
  ) {
    if (valueStr.length >= 4) {
      return `${'*'.repeat(valueStr.length - 4)}${valueStr.slice(-4)}`;
    }
  }
  
  // Credit card masking: show last 4 digits
  if (
    fieldName.toLowerCase().includes('card') ||
    fieldName.toLowerCase().includes('account')
  ) {
    const digits = valueStr.replace(/\D/g, '');
    if (digits.length >= 8) {
      return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
    }
  }
  
  // API key/token masking: show first 4 and last 4 characters
  if (
    fieldName.toLowerCase().includes('key') ||
    fieldName.toLowerCase().includes('token') ||
    fieldName.toLowerCase().includes('secret') ||
    fieldName.toLowerCase().includes('password')
  ) {
    if (valueStr.length > 8) {
      return `${valueStr.slice(0, 4)}...[REDACTED]...${valueStr.slice(-4)}`;
    }
    return '[REDACTED]';
  }
  
  // Revenue/financial data: show range
  if (
    fieldName.toLowerCase().includes('revenue') ||
    fieldName.toLowerCase().includes('income') ||
    fieldName.toLowerCase().includes('salary')
  ) {
    const num = parseFloat(valueStr.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num)) {
      return getFinancialRange(num);
    }
  }
  
  // Address masking: show city and state only
  if (
    fieldName.toLowerCase().includes('address') ||
    fieldName.toLowerCase().includes('street')
  ) {
    return '[ADDRESS REDACTED]';
  }
  
  // Default masking for other sensitive fields
  if (valueStr.length <= 4) {
    return '*'.repeat(valueStr.length);
  }
  
  return `${valueStr[0]}${'*'.repeat(Math.min(valueStr.length - 2, 10))}${valueStr[valueStr.length - 1]}`;
}

/**
 * Get financial range for revenue masking
 */
function getFinancialRange(amount: number): string {
  if (amount < 1000000) {
    return '<$1M';
  } else if (amount < 5000000) {
    return '$1M-$5M';
  } else if (amount < 10000000) {
    return '$5M-$10M';
  } else if (amount < 25000000) {
    return '$10M-$25M';
  } else if (amount < 50000000) {
    return '$25M-$50M';
  } else if (amount < 100000000) {
    return '$50M-$100M';
  } else {
    return '>$100M';
  }
}

/**
 * Check if a field should be considered sensitive based on common patterns
 */
export function isSensitiveField(fieldName: string): boolean {
  const sensitivePatterns = [
    'password',
    'secret',
    'token',
    'key',
    'ssn',
    'tax',
    'ein',
    'duns',
    'cage',
    'card',
    'account',
    'email',
    'phone',
    'address',
    'street',
    'revenue',
    'income',
    'salary',
    'dob',
    'birth',
    'medical',
    'health'
  ];
  
  const lowerFieldName = fieldName.toLowerCase();
  return sensitivePatterns.some(pattern => lowerFieldName.includes(pattern));
}

/**
 * Automatically detect and mask sensitive fields in an object
 */
export function autoMaskSensitiveData(data: any): any {
  if (!data) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => autoMaskSensitiveData(item));
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const masked: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveField(key)) {
        masked[key] = maskValue(value, key);
      } else if (typeof value === 'object') {
        masked[key] = autoMaskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }
  
  return data;
}

/**
 * Compare two objects and return only the differences with masking
 */
export function getMaskedDifferences(
  oldData: any,
  newData: any,
  sensitiveFields: string[] = []
): { old: any; new: any; changes: string[] } {
  const changes: string[] = [];
  const maskedOld: any = {};
  const maskedNew: any = {};
  
  // Get all unique keys
  const allKeys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {})
  ]);
  
  for (const key of allKeys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push(key);
      
      // Mask if sensitive
      if (sensitiveFields.includes(key) || isSensitiveField(key)) {
        maskedOld[key] = maskValue(oldValue, key);
        maskedNew[key] = maskValue(newValue, key);
      } else {
        maskedOld[key] = oldValue;
        maskedNew[key] = newValue;
      }
    }
  }
  
  return {
    old: maskedOld,
    new: maskedNew,
    changes
  };
}