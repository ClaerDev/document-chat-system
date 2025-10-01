"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TextEditor } from "@/components/ui/text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker, DatePickerProps, YearPicker, YearPickerProps } from "@/components/ui/date-picker"
import { PhoneNumberInput } from "@/components/ui/phone-input"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export interface FormFieldProps {
  label?: string
  error?: string
  success?: boolean
  required?: boolean
  description?: string
  className?: string
  children?: React.ReactNode
}

export function FormField({
  label,
  error,
  success,
  required,
  description,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className={cn(error && "text-red-500")}>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </Label>
      )}
      {children}
      {description && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && !error && (
        <div className="flex items-center gap-2 text-sm text-green-500">
          <CheckCircle2 className="h-4 w-4" />
          Valid
        </div>
      )}
    </div>
  )
}

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: boolean
  required?: boolean
  description?: string
  touched?: boolean // Add this to the interface but don't pass to DOM
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, success, required, description, className, touched, ...props }, ref) => {
    return (
      <FormField
        label={label}
        error={error}
        success={success}
        required={required}
        description={description}
      >
        <Input
          ref={ref}
          className={cn(
            error && "border-red-500 focus:ring-red-500",
            success && "border-green-500 focus:ring-green-500",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />
      </FormField>
    )
  }
)
FormInput.displayName = "FormInput"

export interface FormTextareaProps {
  label?: string
  error?: string
  success?: boolean
  required?: boolean
  description?: string
  touched?: boolean
  value?: string
  onChange?: ((value: string) => void) | ((e: React.ChangeEvent<HTMLTextAreaElement>) => void)
  placeholder?: string
  className?: string
  maxLength?: number
  showToolbar?: boolean
  rows?: number // For backward compatibility
}

export function FormTextarea({
  label,
  error,
  success,
  required,
  description,
  className,
  value = '',
  onChange,
  placeholder,
  maxLength,
  showToolbar = true,
  ...props
}: FormTextareaProps) {
  
  // Handle both string onChange (new) and event onChange (legacy)
  const handleChange = (newValue: string) => {
    if (onChange) {
      // For TypeScript compatibility, we need to handle both patterns
      // Try the new pattern first (string parameter)
      try {
        (onChange as (value: string) => void)(newValue)
      } catch (error) {
        // If that fails, try the legacy pattern (event object)
        try {
          const mockEvent = {
            target: { value: newValue }
          } as React.ChangeEvent<HTMLTextAreaElement>
          ;(onChange as (e: React.ChangeEvent<HTMLTextAreaElement>) => void)(mockEvent)
        } catch (legacyError) {
          // Log errors in development only
          if (process.env.NODE_ENV === 'development') {
            console.error('FormTextarea onChange compatibility error:', error, legacyError)
          }
        }
      }
    }
  }

  return (
    <FormField
      label={label}
      error={error}
      success={success}
      required={required}
      description={description}
    >
      <TextEditor
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          error && "border-red-500",
          success && "border-green-500",
          className
        )}
        maxLength={maxLength}
        showToolbar={showToolbar}
      />
    </FormField>
  )
}

export interface FormSelectProps {
  label?: string
  error?: string
  success?: boolean
  required?: boolean
  description?: string
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  options: Array<{ value: string; label: string }>
  className?: string
  disabled?: boolean
  touched?: boolean // Add this to the interface but don't pass to DOM
}

export function FormSelect({
  label,
  error,
  success,
  required,
  description,
  placeholder = "Select an option",
  touched, // Extract this so it doesn't get spread to Select
  value,
  onValueChange,
  options,
  className,
  disabled,
}: FormSelectProps) {
  return (
    <FormField
      label={label}
      error={error}
      success={success}
      required={required}
      description={description}
    >
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            error && "border-red-500 focus:ring-red-500",
            success && "border-green-500 focus:ring-green-500",
            className
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

export interface FormDatePickerProps extends DatePickerProps {
  label?: string
  error?: string
  success?: boolean
  required?: boolean
  description?: string
  touched?: boolean // Add this to the interface but don't pass to DatePicker
}

export function FormDatePicker({
  label,
  error,
  success,
  required,
  description,
  className,
  touched, // Extract this so it doesn't get spread to DatePicker
  ...props
}: FormDatePickerProps) {
  return (
    <FormField
      label={label}
      error={error}
      success={success}
      required={required}
      description={description}
    >
      <DatePicker
        error={!!error}
        className={cn(
          success && "border-green-500 focus:ring-green-500",
          className
        )}
        {...props}
      />
    </FormField>
  )
}

export interface FormYearPickerProps extends YearPickerProps {
  label?: string
  error?: string
  success?: boolean
  required?: boolean
  description?: string
  touched?: boolean // Add this to the interface but don't pass to YearPicker
}

export function FormYearPicker({
  label,
  error,
  success,
  required,
  description,
  className,
  touched, // Extract this so it doesn't get spread to YearPicker
  ...props
}: FormYearPickerProps) {
  return (
    <FormField
      label={label}
      error={error}
      success={success}
      required={required}
      description={description}
    >
      <YearPicker
        error={!!error}
        className={cn(
          success && "border-green-500 focus:ring-green-500",
          className
        )}
        {...props}
      />
    </FormField>
  )
}

export interface FormPhoneInputProps {
  label?: string
  error?: string
  success?: boolean
  required?: boolean
  description?: string
  className?: string
  value?: string
  onChange?: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function FormPhoneInput({
  label,
  error,
  success,
  required,
  description,
  className,
  value,
  onChange,
  placeholder,
  disabled,
}: FormPhoneInputProps) {
  return (
    <FormField
      label={label}
      error={error}
      success={success}
      required={required}
      description={description}
      className={className}
    >
      <PhoneNumberInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
      />
    </FormField>
  )
}

// Validation state helper
export function getValidationState(
  value: any,
  touched: boolean,
  error?: string
): { error?: string; success?: boolean } {
  if (!touched) return {}
  if (error) return { error }
  if (value !== undefined && value !== "") return { success: true }
  return {}
}