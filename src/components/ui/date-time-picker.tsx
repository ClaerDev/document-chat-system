"use client"

import * as React from "react"
import { ChevronDownIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SimpleCalendar } from "@/components/ui/simple-calendar"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Date range type for range picker mode
export interface DateRange {
  from?: Date
  to?: Date
}

// Mode configuration
export type DateTimePickerMode = 'single' | 'range' | 'datetime'

// Main component props
export interface DateTimePickerProps {
  mode?: DateTimePickerMode
  value?: Date | DateRange
  onChange?: (value: Date | DateRange | undefined) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  compact?: boolean
  enableClearButton?: boolean
  fromDate?: Date
  toDate?: Date
  // Custom labels for range mode
  fromLabel?: string
  toLabel?: string
  fromPlaceholder?: string
  toPlaceholder?: string
}

// Single Date Picker Component (EXACT implementation from your code)
function SingleDateInput({ 
  value, 
  onChange, 
  label, 
  placeholder = "Select date", 
  disabled = false,
  className = "",
  id = "date",
  toDate
}: {
  value?: Date
  onChange: (date: Date | undefined) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  toDate?: Date
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {label && (
        <Label htmlFor={id} className="px-1">
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            className="w-40 justify-between font-normal text-sm"
            disabled={disabled}
          >
            {value ? value.toLocaleDateString() : placeholder}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <SimpleCalendar
            selected={value}
            onSelect={(date) => {
              onChange(date)
              setOpen(false)
            }}
            toDate={toDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Main DateTimePicker Component
export function DateTimePicker({
  mode = 'single',
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  className,
  compact = false,
  enableClearButton = true,
  fromDate,
  toDate,
  fromLabel = "From Date",
  toLabel = "To Date",
  fromPlaceholder = "Select start date",
  toPlaceholder = "Select end date"
}: DateTimePickerProps) {

  const handleClear = () => {
    onChange?.(undefined)
  }

  // Single Date Mode - Uses EXACT Calendar22 implementation
  if (mode === 'single') {
    return (
      <div className={cn("relative", className)}>
        <SingleDateInput
          value={value instanceof Date ? value : undefined}
          onChange={onChange as (date: Date | undefined) => void}
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          className={compact ? "w-full" : "w-48"}
          toDate={toDate}
        />
        {enableClearButton && value && !disabled && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-8 top-[42px] h-6 w-6 p-0"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  // Date Range Mode - Two separate Calendar22 implementations
  if (mode === 'range') {
    const range = value as DateRange
    return (
      <div className={cn("space-y-4", className)}>
        {label && (
          <Label className="px-1 text-sm font-medium">{label}</Label>
        )}
        <div className="flex items-start gap-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
            <div className="relative">
              <SingleDateInput
                value={range?.from}
                onChange={(date) => {
                  const newRange = { ...range, from: date }
                  onChange?.(newRange)
                }}
                label={fromLabel}
                placeholder={fromPlaceholder}
                disabled={disabled}
                id="from-date"
                className="w-full"
                toDate={toDate}
              />
            </div>
            <div className="relative">
              <SingleDateInput
                value={range?.to}
                onChange={(date) => {
                  const newRange = { ...range, to: date }
                  onChange?.(newRange)
                }}
                label={toLabel}
                placeholder={toPlaceholder}
                disabled={disabled}
                id="to-date"
                className="w-full"
                toDate={toDate}
              />
            </div>
          </div>
          {enableClearButton && (range?.from || range?.to) && !disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="mt-8 h-9 w-9 p-0 flex-shrink-0"
              title="Clear date range"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // DateTime Mode - Calendar22 + Time selector
  if (mode === 'datetime') {
    return (
      <div className={cn("space-y-4", className)}>
        {label && (
          <Label className="px-1 text-sm font-medium">{label}</Label>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SingleDateInput
            value={value instanceof Date ? value : undefined}
            onChange={onChange as (date: Date | undefined) => void}
            label="Date"
            placeholder="Select date"
            disabled={disabled}
            id="datetime-date"
            className="w-full"
          />
          <div className="flex flex-col gap-3">
            <Label className="px-1">Time</Label>
            <input
              type="time"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={value instanceof Date ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}` : '09:00'}
              onChange={(e) => {
                if (value instanceof Date) {
                  const [hours, minutes] = e.target.value.split(':')
                  const newDate = new Date(value)
                  newDate.setHours(parseInt(hours), parseInt(minutes))
                  onChange?.(newDate)
                }
              }}
              disabled={disabled}
            />
          </div>
        </div>
        {enableClearButton && value && !disabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="w-full"
          >
            Clear Date & Time
          </Button>
        )}
      </div>
    )
  }

  return null
}

// Convenience wrapper components
export function SingleDatePicker(props: Omit<DateTimePickerProps, 'mode'>) {
  return <DateTimePicker {...props} mode="single" />
}

export function DateRangePicker(props: Omit<DateTimePickerProps, 'mode'>) {
  return <DateTimePicker {...props} mode="range" />
}

export function DateTimePickerComponent(props: Omit<DateTimePickerProps, 'mode'>) {
  return <DateTimePicker {...props} mode="datetime" />
}

// Preset configurations for common use cases
export const DateTimePickerPresets = {
  postedDate: (): Partial<DateTimePickerProps> => ({
    mode: 'single',
    label: 'Posted Date',
    placeholder: 'Select posted date',
    compact: true
  }),

  dateRange: (): Partial<DateTimePickerProps> => ({
    mode: 'range',
    label: 'Date Range',
    placeholder: 'Select date range',
    compact: true
  }),

  dateTime: (): Partial<DateTimePickerProps> => ({
    mode: 'datetime',
    label: 'Date & Time',
    placeholder: 'Select date and time'
  }),

  deadline: (): Partial<DateTimePickerProps> => ({
    mode: 'single',
    fromDate: new Date(),
    label: 'Deadline',
    placeholder: 'Select deadline'
  }),

  historical: (): Partial<DateTimePickerProps> => ({
    mode: 'range',
    toDate: new Date(),
    label: 'Historical Period',
    placeholder: 'Select historical date range',
    compact: true
  })
}