/**
 * Validation Utilities Unit Tests
 * 
 * Tests core validation functions including data sanitization,
 * format validation, and security checks.
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateEmail,
  validateUEI,
  validateNAICS,
  validateZipCode,
  validatePhoneNumber,
  sanitizeInput,
  validateContractValue,
  validateDateRange,
  isValidURL,
  normalizeNAICS,
  type ValidationResult,
} from './validation';

describe('validateEmail', () => {
  it('should accept valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'first+last@company.gov',
      'admin@sub.domain.org',
    ];

    validEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      'invalid-email',
      '@domain.com',
      'user@',
      'user..name@domain.com',
      'user@domain',
      '',
      'user name@domain.com',
    ];

    invalidEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  it('should reject potentially malicious emails', () => {
    const maliciousEmails = [
      'user@domain.com<script>alert("xss")</script>',
      'user+<script>@domain.com',
      'test@domain.com\x00',
    ];

    maliciousEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
    });
  });
});

describe('validateUEI', () => {
  it('should accept valid UEI format', () => {
    const validUEIs = [
      'ABCD1234EFGH',
      '1234567890AB',
      'ZXYZVWUTSR12',
    ];

    validUEIs.forEach(uei => {
      const result = validateUEI(uei);
      expect(result.isValid).toBe(true);
    });
  });

  it('should reject invalid UEI format', () => {
    const invalidUEIs = [
      'ABC123', // Too short
      'ABCD1234EFGHIJ', // Too long
      'ABCD-1234-EFGH', // Contains hyphens
      'abcd1234efgh', // Lowercase
      '1234 5678 90AB', // Contains spaces
      '',
    ];

    invalidUEIs.forEach(uei => {
      const result = validateUEI(uei);
      expect(result.isValid).toBe(false);
    });
  });

  it('should sanitize and normalize UEI input', () => {
    const inputs = [
      { input: '  ABCD1234EFGH  ', expected: 'ABCD1234EFGH' },
      { input: 'abcd1234efgh', expected: 'ABCD1234EFGH' },
      { input: 'ABCD-1234-EFGH', expected: 'ABCD1234EFGH' },
    ];

    inputs.forEach(({ input, expected }) => {
      const result = validateUEI(input, { normalize: true });
      if (result.isValid) {
        expect(result.normalized).toBe(expected);
      }
    });
  });
});

describe('validateNAICS', () => {
  it('should accept valid NAICS codes', () => {
    const validCodes = [
      '541511', // 6-digit
      '5415', // 4-digit
      '54', // 2-digit
    ];

    validCodes.forEach(code => {
      const result = validateNAICS(code);
      expect(result.isValid).toBe(true);
    });
  });

  it('should reject invalid NAICS codes', () => {
    const invalidCodes = [
      '5415111', // 7 digits
      '1', // 1 digit
      '54A511', // Contains letter
      '', // Empty
      '99', // Invalid range
    ];

    invalidCodes.forEach(code => {
      const result = validateNAICS(code);
      expect(result.isValid).toBe(false);
    });
  });

  it('should provide NAICS code information', () => {
    const result = validateNAICS('541511');
    expect(result.isValid).toBe(true);
    expect(result.info?.title).toContain('Computer Programming');
    expect(result.info?.sector).toBeDefined();
  });
});

describe('validateZipCode', () => {
  it('should accept valid US zip codes', () => {
    const validZips = [
      '12345',
      '12345-6789',
      '90210',
      '00501',
    ];

    validZips.forEach(zip => {
      const result = validateZipCode(zip);
      expect(result.isValid).toBe(true);
    });
  });

  it('should reject invalid zip codes', () => {
    const invalidZips = [
      '1234', // Too short
      '123456', // Too long without hyphen
      '12345-678', // Invalid extended format
      'ABCDE', // Letters
      '', // Empty
    ];

    invalidZips.forEach(zip => {
      const result = validateZipCode(zip);
      expect(result.isValid).toBe(false);
    });
  });
});

describe('validatePhoneNumber', () => {
  it('should accept valid phone number formats', () => {
    const validPhones = [
      '+1-555-123-4567',
      '(555) 123-4567',
      '555.123.4567',
      '5551234567',
      '+15551234567',
    ];

    validPhones.forEach(phone => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(true);
    });
  });

  it('should reject invalid phone numbers', () => {
    const invalidPhones = [
      '123', // Too short
      '123-456-78901', // Too long
      'ABC-DEF-GHIJ', // Letters
      '', // Empty
    ];

    invalidPhones.forEach(phone => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(false);
    });
  });

  it('should normalize phone numbers', () => {
    const result = validatePhoneNumber('+1 (555) 123-4567', { normalize: true });
    expect(result.isValid).toBe(true);
    expect(result.normalized).toBe('+15551234567');
  });
});

describe('sanitizeInput', () => {
  it('should remove dangerous characters', () => {
    const dangerous = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(dangerous);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
  });

  it('should preserve safe content', () => {
    const safe = 'This is a normal business description.';
    const sanitized = sanitizeInput(safe);
    expect(sanitized).toBe(safe);
  });

  it('should handle SQL injection attempts', () => {
    const malicious = "'; DROP TABLE users; --";
    const sanitized = sanitizeInput(malicious);
    expect(sanitized).not.toContain('DROP TABLE');
  });

  it('should normalize whitespace', () => {
    const messy = '  Multiple   spaces\n\nand  \t\t tabs  ';
    const sanitized = sanitizeInput(messy);
    expect(sanitized).toBe('Multiple spaces and tabs');
  });
});

describe('validateContractValue', () => {
  it('should accept valid contract values', () => {
    const validValues = [
      { min: 100000, max: 500000 },
      { min: 0, max: 1000000 },
      { min: 5000000, max: 10000000 },
    ];

    validValues.forEach(value => {
      const result = validateContractValue(value);
      expect(result.isValid).toBe(true);
    });
  });

  it('should reject invalid contract values', () => {
    const invalidValues = [
      { min: -100, max: 500000 }, // Negative minimum
      { min: 500000, max: 100000 }, // Min > Max
      { min: 0, max: 0 }, // Zero range
    ];

    invalidValues.forEach(value => {
      const result = validateContractValue(value);
      expect(result.isValid).toBe(false);
    });
  });

  it('should validate reasonable business ranges', () => {
    const unreasonable = { min: 1, max: 999999999999 }; // $1 to $1T
    const result = validateContractValue(unreasonable);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Contract value range seems unrealistic');
  });
});

describe('validateDateRange', () => {
  it('should accept valid date ranges', () => {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const result = validateDateRange(now, future);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid date ranges', () => {
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const result = validateDateRange(now, past);
    expect(result.isValid).toBe(false);
  });

  it('should enforce business rules for date ranges', () => {
    const now = new Date();
    const farFuture = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years

    const result = validateDateRange(now, farFuture);
    expect(result.warnings).toContain('Date range exceeds typical contract duration');
  });
});

describe('isValidURL', () => {
  it('should accept valid URLs', () => {
    const validURLs = [
      'https://example.com',
      'http://subdomain.example.org/path',
      'https://example.gov/page?param=value',
    ];

    validURLs.forEach(url => {
      expect(isValidURL(url)).toBe(true);
    });
  });

  it('should reject invalid URLs', () => {
    const invalidURLs = [
      'not-a-url',
      'http://',
      'https://invalid url with spaces',
      'javascript:alert("xss")',
    ];

    invalidURLs.forEach(url => {
      expect(isValidURL(url)).toBe(false);
    });
  });

  it('should reject potentially dangerous protocols', () => {
    const dangerousURLs = [
      'javascript:alert("xss")',
      'data:text/html,<script>alert("xss")</script>',
      'file:///etc/passwd',
    ];

    dangerousURLs.forEach(url => {
      expect(isValidURL(url)).toBe(false);
    });
  });
});

describe('normalizeNAICS', () => {
  it('should normalize NAICS codes consistently', () => {
    const inputs = [
      { input: '541511', expected: '541511' },
      { input: '54-15-11', expected: '541511' },
      { input: '541511 ', expected: '541511' },
      { input: ' 541511', expected: '541511' },
    ];

    inputs.forEach(({ input, expected }) => {
      expect(normalizeNAICS(input)).toBe(expected);
    });
  });

  it('should handle partial NAICS codes', () => {
    expect(normalizeNAICS('54')).toBe('54');
    expect(normalizeNAICS('5415')).toBe('5415');
    expect(normalizeNAICS('541511')).toBe('541511');
  });
});

describe('Validation Performance', () => {
  it('should validate emails quickly', () => {
    const emails = Array.from({ length: 1000 }, (_, i) => `user${i}@example.com`);
    
    const startTime = Date.now();
    emails.forEach(email => validateEmail(email));
    const duration = Date.now() - startTime;
    
    // Should validate 1000 emails in under 100ms
    expect(duration).toBeLessThan(100);
  });

  it('should sanitize input efficiently', () => {
    const inputs = Array.from({ length: 100 }, (_, i) => 
      `<script>alert("${i}")</script>This is test content ${i}`
    );
    
    const startTime = Date.now();
    inputs.forEach(input => sanitizeInput(input));
    const duration = Date.now() - startTime;
    
    // Should sanitize 100 inputs in under 50ms
    expect(duration).toBeLessThan(50);
  });
});

describe('Security Validation', () => {
  it('should detect and reject XSS attempts', () => {
    const xssAttempts = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("xss")',
      '<svg onload="alert(1)">',
    ];

    xssAttempts.forEach(attempt => {
      const sanitized = sanitizeInput(attempt);
      expect(sanitized).not.toContain('script');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onload');
    });
  });

  it('should detect and reject SQL injection attempts', () => {
    const sqlAttempts = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; INSERT INTO users VALUES ('hacker'); --",
      "' UNION SELECT * FROM passwords --",
    ];

    sqlAttempts.forEach(attempt => {
      const sanitized = sanitizeInput(attempt);
      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('INSERT INTO');
      expect(sanitized).not.toContain('UNION SELECT');
      expect(sanitized).not.toContain("'1'='1");
    });
  });

  it('should handle null byte injection', () => {
    const nullByteAttempt = 'legitimate.txt\x00malicious.exe';
    const sanitized = sanitizeInput(nullByteAttempt);
    expect(sanitized).not.toContain('\x00');
  });
});