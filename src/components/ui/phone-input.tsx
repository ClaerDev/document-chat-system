'use client'

import React from 'react'
import PhoneInput from 'react-phone-number-input'
import { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

interface PhoneNumberInputProps {
  value?: string
  onChange?: (value: string | undefined) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  error?: string
  helperText?: string
}

export function PhoneNumberInput({
  value,
  onChange,
  label,
  placeholder = "Enter phone number",
  required = false,
  disabled = false,
  className,
  error,
  helperText,
}: PhoneNumberInputProps) {
  // Convert database value to display value for initial load
  const getDisplayValue = React.useCallback((dbValue: string | undefined) => {
    if (!dbValue) return undefined
    if (dbValue.startsWith('+')) return dbValue
    
    const digits = dbValue.replace(/[^\d]/g, '')
    
    // Handle US numbers - ensure we always get a clean 10-digit US number
    if (digits.length === 11 && digits.startsWith('1')) {
      // Database has: 14155710544
      // Extract: 4155710544 (10 digits)
      // Result: +14155710544 (country code + 10 digits)
      const usNumber = digits.substring(1) // Get "4155710544"
      
      // Validate it's a proper 10-digit US number (3-digit area code + 7-digit number)
      if (usNumber.length === 10 && /^[2-9]\d{2}[2-9]\d{6}$/.test(usNumber)) {
        return `+1${usNumber}`
      } else {
        return undefined
      }
    }
    
    if (digits.length === 10 && /^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) {
      return `+1${digits}`
    }
    
    return undefined
  }, [])

  // Simple onChange handler
  const handleChange = React.useCallback((phoneValue: string | undefined) => {
    console.log('PhoneInput handleChange - received:', phoneValue)
    
    if (!onChange) return
    
    if (!phoneValue) {
      onChange(undefined)
      return
    }
    
    // Extract digits only for storage
    const digits = phoneValue.replace(/[^\d]/g, '')
    console.log('PhoneInput handleChange - storing:', digits)
    onChange(digits || undefined)
  }, [onChange])

  // Check if valid for visual feedback
  const isValid = React.useMemo(() => {
    const displayVal = getDisplayValue(value)
    if (!displayVal) return true
    try {
      return isValidPhoneNumber(displayVal)
    } catch {
      return false
    }
  }, [value, getDisplayValue])

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
          {label}
        </Label>
      )}
      <PhoneInput
        placeholder={placeholder}
        value={getDisplayValue(value)}
        onChange={handleChange}
        defaultCountry="US"
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          !isValid && value && !error && "border-yellow-500 focus-visible:ring-yellow-500",
          "[&_input]:border-0 [&_input]:bg-transparent [&_input]:outline-none [&_input]:ring-0 [&_input]:ring-offset-0 [&_input]:focus-visible:ring-0 [&_input]:focus-visible:ring-offset-0",
          "[&_.PhoneInputCountrySelect]:mr-2 [&_.PhoneInputCountrySelect]:border-0 [&_.PhoneInputCountrySelect]:bg-transparent [&_.PhoneInputCountrySelect]:outline-none",
          "[&_.PhoneInputCountrySelectArrow]:ml-1 [&_.PhoneInputCountrySelectArrow]:opacity-50",
          "[&_.PhoneInputCountryIcon]:w-5 [&_.PhoneInputCountryIcon]:h-auto"
        )}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {!error && !isValid && value && (
        <p className="text-sm text-yellow-600">
          Please complete the phone number for the selected country
        </p>
      )}
      {helperText && !error && isValid && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}