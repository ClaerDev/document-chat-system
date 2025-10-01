import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, UseFormProps, UseFormReturn } from "react-hook-form"
import { z } from "zod"
import { useEffect } from "react"

export function useZodForm<TSchema extends z.ZodType>(
  props: Omit<UseFormProps<TSchema["_input"]>, "resolver"> & {
    schema: TSchema
  }
): UseFormReturn<TSchema["_input"]> {
  const form = useForm<TSchema["_input"]>({
    ...props,
    resolver: zodResolver(props.schema),
    mode: "onBlur", // Validate when field loses focus
    reValidateMode: "onBlur", // Re-validate on blur after first validation
    shouldFocusError: true,
  })

  return form
}

// Helper to get form validation state with improved responsiveness
export function getFormFieldState(
  form: UseFormReturn<any>,
  name: string
): {
  error?: string
  success?: boolean
  touched?: boolean
} {
  const fieldState = form.getFieldState(name)
  const value = form.watch(name)
  const formState = form.formState
  
  // Check if this field has been interacted with
  const isFieldTouched = fieldState.isTouched || fieldState.isDirty
  
  // Only show validation states after user interaction
  if (!isFieldTouched) {
    return {
      touched: false
    }
  }
  
  // If there's an error, show it immediately
  if (fieldState.error) {
    return {
      error: fieldState.error.message,
      touched: isFieldTouched,
    }
  }
  
  // Show success state for valid, non-empty values
  const hasValue = value !== undefined && value !== null && value !== ""
  const isValid = !fieldState.error && hasValue
  
  return {
    success: isValid,
    touched: isFieldTouched,
  }
}

// Helper to validate a single field immediately
export function validateField<TSchema extends z.ZodType>(
  schema: TSchema,
  fieldName: string,
  value: any
): { error?: string; success?: boolean } {
  try {
    // Create a partial schema for just this field
    const fieldSchema = (schema as any).shape?.[fieldName]
    if (!fieldSchema) return {}
    
    fieldSchema.parse(value)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message }
    }
    return {}
  }
}