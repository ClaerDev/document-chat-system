"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SimpleCalendarProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
  toDate?: Date
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const monthsShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]

export function SimpleCalendar({ selected, onSelect, className, toDate }: SimpleCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected?.getMonth() ?? new Date().getMonth())
  const [currentYear, setCurrentYear] = React.useState(selected?.getFullYear() ?? new Date().getFullYear())
  
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i)
  
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }
  
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }
  
  const handleDateClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day)
    onSelect?.(newDate)
  }
  
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }
  
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }
  
  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
  const today = new Date()
  
  // Create array of days for the calendar grid
  const calendarDays = []
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <div className={cn("p-3", className)}>
      {/* Header with month/year dropdowns and navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-1">
          <Select
            value={currentMonth.toString()}
            onValueChange={(value) => setCurrentMonth(parseInt(value))}
          >
            <SelectTrigger className="h-8 w-auto min-w-0 px-3 py-2 text-sm font-normal">
              <SelectValue>
                {monthsShort[currentMonth]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={currentYear.toString()}
            onValueChange={(value) => setCurrentYear(parseInt(value))}
          >
            <SelectTrigger className="h-8 w-auto min-w-0 px-3 py-2 text-sm font-normal">
              <SelectValue>
                {currentYear}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Calendar grid */}
      <div className="space-y-1">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div
              key={day}
              className="h-9 w-9 text-center text-sm font-normal text-muted-foreground flex items-center justify-center"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={index} className="h-9 w-9" />
            }
            
            const date = new Date(currentYear, currentMonth, day)
            const isSelected = selected && 
              date.getDate() === selected.getDate() &&
              date.getMonth() === selected.getMonth() &&
              date.getFullYear() === selected.getFullYear()
            const isToday = 
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear()
            const isDisabled = toDate && date > toDate
            
            return (
              <Button
                key={`day-${index}`}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                onClick={() => !isDisabled && handleDateClick(day)}
                disabled={isDisabled}
                className={cn(
                  "h-9 w-9 p-0 font-normal",
                  isToday && !isSelected && "bg-accent text-accent-foreground",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {day}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}