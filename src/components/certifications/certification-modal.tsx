/**
 * Certification Modal Component (Profile Store Version)
 * 
 * Modal component for creating, editing, and viewing user certifications.
 * Uses the profile store and useCertifications hook following the same
 * pattern as set-asides.
 */

"use client"

import { useState, useEffect, useMemo } from 'react'
import { Search, CheckCircle, Calendar, Building, Shield, Tag, Loader2, CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useCertifications } from '@/hooks/use-certifications'

import {
  type CertificationFormData,
  type GovCertificationDefinition,
  type UserCertification,
  getCertificationStatusColor,
  getPriorityColor,
  formatCertificationName,
} from '@/types/certifications'

import { CertificationFormDataSchema } from '@/lib/validations/certifications'
import { cn } from '@/lib/utils'

// =============================================
// INTERFACES
// =============================================

interface CertificationModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit' | 'view'
  certificationId?: string
  className?: string
}

interface CertificationSelectProps {
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

interface DatePickerFieldProps {
  value?: string
  onChange: (date: string) => void
  placeholder?: string
  disabled?: boolean
}

// Date Picker Component using shadcn pattern
function DatePickerField({ value, onChange, placeholder = "Pick a date", disabled }: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedDate = value ? new Date(value) : undefined

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'))
    } else {
      onChange('')
    }
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}


// =============================================
// CERTIFICATION SELECTION COMPONENT
// =============================================

function CertificationSelect({ value, onValueChange, disabled }: CertificationSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const {
    allGovCertifications,
    govDatabaseLoading,
    ensureGovDatabase,
    getGovCertification,
  } = useCertifications()

  // Load government database on mount if not already loaded
  useEffect(() => {
    ensureGovDatabase()
  }, [ensureGovDatabase])

  // Filter and rank certifications based on search query with enhanced fuzzy matching
  const filteredCertifications = useMemo(() => {
    if (!searchQuery) return allGovCertifications

    const query = searchQuery.toLowerCase().trim()
    if (!query) return allGovCertifications

    // Helper function to escape regex special characters
    const escapeRegex = (str: string) => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    // Split query into individual words for better matching
    const queryWords = query.split(/\s+/).filter(word => word.length > 0)

    const searchResults = allGovCertifications
      .map(cert => {
        let score = 0
        const name = cert.name.toLowerCase()
        const fullName = cert.fullName.toLowerCase()
        const description = cert.description.toLowerCase()
        const agency = cert.issuingAgency.toLowerCase()
        const tags = cert.tags.map(tag => tag.toLowerCase())

        // Check for exact query match first (highest priority)
        if (name === query) score += 100
        else if (name.startsWith(query)) score += 80
        else if (name.includes(query)) score += 60

        // Check for full name matches
        if (fullName === query) score += 90
        else if (fullName.includes(query)) score += 40

        // Agency exact/partial matches
        if (agency === query) score += 70
        else if (agency.includes(query)) score += 30

        // Tag exact/partial matches
        if (tags.some(tag => tag === query)) score += 50
        else if (tags.some(tag => tag.includes(query))) score += 20

        // Word-based matching for better search experience
        queryWords.forEach(word => {
          if (word.length < 2) return // Skip very short words

          // Name word matches
          if (name.includes(word)) score += 15
          if (fullName.includes(word)) score += 12
          if (agency.includes(word)) score += 8
          if (tags.some(tag => tag.includes(word))) score += 6
          if (description.includes(word)) score += 3

          // Fuzzy matching for common abbreviations and typos
          if (word.length >= 3) {
            // Check if word appears as part of a larger word (for abbreviations)
            // Escape the word to handle special regex characters like parentheses in "8(a)"
            const escapedWord = escapeRegex(word)
            const regex = new RegExp(`\\b\\w*${escapedWord}\\w*\\b`, 'i')
            if (regex.test(name)) score += 8
            if (regex.test(fullName)) score += 6
            if (regex.test(agency)) score += 4
          }
        })

        // Bonus for multiple word matches
        if (queryWords.length > 1) {
          const matchedWords = queryWords.filter(word => 
            name.includes(word) || fullName.includes(word) || agency.includes(word)
          )
          if (matchedWords.length > 1) {
            score += matchedWords.length * 10
          }
        }

        // Description matches (lowest priority)
        if (description.includes(query)) score += 10

        return { cert, score }
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.cert)

    return searchResults
  }, [allGovCertifications, searchQuery])

  // Get selected certification details
  const selectedCertification = value ? getGovCertification(value) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground"
          )}
          disabled={disabled || govDatabaseLoading}
        >
          {govDatabaseLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading certifications...
            </>
          ) : selectedCertification ? (
            <>
              <div className="flex items-center gap-2 truncate">
                <Badge variant="outline" className="text-xs">
                  {selectedCertification.issuingAgency}
                </Badge>
                <span className="truncate">{selectedCertification.name}</span>
              </div>
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Select certification...
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[700px] p-0" align="start" style={{ maxHeight: '500px' }}>
        {/* Search Header */}
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            type="text"
            placeholder="Search by name, agency, keywords, or abbreviations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-50 hover:opacity-100"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Results Header */}
        <div className="border-b px-3 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {searchQuery 
                ? `${filteredCertifications.length} certification${filteredCertifications.length !== 1 ? 's' : ''} found`
                : `${filteredCertifications.length} certification${filteredCertifications.length !== 1 ? 's' : ''} available`
              }
            </span>
            {searchQuery && (
              <span className="text-xs">
                Sorted by relevance
              </span>
            )}
          </div>
        </div>
        
        {/* Scrollable Results */}
        <div 
          className="overflow-y-scroll p-1" 
          style={{ 
            maxHeight: '400px',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
          onWheel={(e) => {
            e.stopPropagation()
            const container = e.currentTarget
            container.scrollTop += e.deltaY
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {filteredCertifications.length === 0 ? (
            <div className="px-4 py-6">
              {govDatabaseLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading certifications...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                  <div className="p-3 rounded-full bg-muted mb-3">
                    <Search className="h-6 w-6" />
                  </div>
                  <p className="font-medium">No certifications found</p>
                  {searchQuery ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">No results for "{searchQuery}"</p>
                      <p className="text-xs">Try searching for:</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        <Badge variant="outline" className="text-xs">SBA</Badge>
                        <Badge variant="outline" className="text-xs">GSA</Badge>
                        <Badge variant="outline" className="text-xs">Small Business</Badge>
                        <Badge variant="outline" className="text-xs">8(a)</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm mt-1">Start typing to search certifications</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            filteredCertifications.map((cert, index) => (
              <div
                key={cert.id}
                className="relative rounded-md p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors border-b border-border/50 last:border-b-0"
                onClick={() => {
                  onValueChange(cert.id)
                  setOpen(false)
                  setSearchQuery('')
                }}
              >
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-medium text-sm leading-tight">
                        {cert.name}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs shrink-0",
                          `bg-${getPriorityColor(cert.priority)}-50 text-${getPriorityColor(cert.priority)}-700 border-${getPriorityColor(cert.priority)}-200`
                        )}
                      >
                        {cert.priority}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {cert.issuingAgency}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {cert.description}
                  </p>
                  
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {cert.categoryName}
                    </Badge>
                    {cert.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {cert.tags.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{cert.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}


// =============================================
// MAIN MODAL COMPONENT
// =============================================

export default function CertificationModal({ 
  isOpen, 
  onClose, 
  mode, 
  certificationId, 
  className 
}: CertificationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const {
    getCertificationById,
    getGovCertification,
    createCertification,
    editCertification,
  } = useCertifications()

  // Get existing certification for edit mode
  const existingCertification = certificationId ? getCertificationById(certificationId) : null

  // Form setup
  const form = useForm({
    resolver: zodResolver(CertificationFormDataSchema),
    defaultValues: {
      certificationId: '',
      name: '',
      certificationNumber: '',
      obtainedDate: '',
      expirationDate: '',
      status: 'active',
      verificationStatus: 'not_required',
      documentUrl: '',
      issuingOffice: '',
      notes: '',
      isActivated: true,
      reminderSettings: {
        enabled: false,
        reminderDays: [30, 60, 90],
      },
    },
  })

  // Load form data when modal opens in edit/view mode
  useEffect(() => {
    if (isOpen && (mode === 'edit' || mode === 'view') && existingCertification) {
      form.reset({
        certificationId: existingCertification.certificationId,
        name: existingCertification.name || '',
        certificationNumber: existingCertification.certificationNumber || '',
        obtainedDate: existingCertification.obtainedDate.split('T')[0], // Convert to YYYY-MM-DD
        expirationDate: existingCertification.expirationDate?.split('T')[0] || '',
        status: existingCertification.status,
        verificationStatus: existingCertification.verificationStatus,
        documentUrl: existingCertification.documentUrl || '',
        issuingOffice: existingCertification.issuingOffice || '',
        notes: existingCertification.notes || '',
        isActivated: existingCertification.isActivated,
        reminderSettings: existingCertification.reminderSettings || {
          enabled: false,
          reminderDays: [30, 60, 90],
        },
      })
    } else if (isOpen && mode === 'create') {
      form.reset({
        certificationId: '',
        name: '',
        certificationNumber: '',
        obtainedDate: '',
        expirationDate: '',
        status: 'active',
        verificationStatus: 'not_required',
        documentUrl: '',
        issuingOffice: '',
        notes: '',
        isActivated: true,
        reminderSettings: {
          enabled: false,
          reminderDays: [30, 60, 90],
        },
      })
    }
  }, [isOpen, mode, existingCertification, form])

  // Get selected certification details
  const selectedCertification = form.watch('certificationId')
    ? getGovCertification(form.watch('certificationId'))
    : null

  // Handle form submission
  const handleSubmit = async (data: CertificationFormData) => {
    console.log('🔄 Form submission started:', data)
    setIsSubmitting(true)
    try {
      // Data is already in the correct format (YYYY-MM-DD) from the form
      // No need to convert to ISO format as validation expects YYYY-MM-DD
      if (mode === 'create') {
        console.log('📝 Creating certification...')
        const result = await createCertification(data)
        console.log('✅ Certification created:', result)
      } else if (mode === 'edit' && certificationId) {
        console.log('📝 Updating certification...')
        const result = await editCertification(certificationId, data)
        console.log('✅ Certification updated:', result)
      }

      console.log('🚪 Closing modal...')
      onClose()
    } catch (error) {
      console.error('❌ Form submission error:', error)
      // Error handling - could show toast notification
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  if (!isOpen) return null

  const isEdit = mode === 'edit'
  const isView = mode === 'view'
  const title = isEdit ? 'Edit Certification' : isView ? 'Certification Details' : 'Add Certification'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {isView 
              ? "View certification details and status information."
              : isEdit 
                ? "Update certification information and settings."
                : "Add a new certification to your profile to improve opportunity matching."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* All content in one screen - no tabs */}
            <div className="space-y-6">
              {/* Certification Selection */}
              <FormField
                control={form.control}
                name="certificationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certification Type *</FormLabel>
                    <FormControl>
                      <CertificationSelect
                        value={field.value}
                        onValueChange={(certificationId) => {
                          field.onChange(certificationId)
                          // Also set the certification name when selection changes
                          const govCert = getGovCertification(certificationId)
                          if (govCert) {
                            form.setValue('name', govCert.name)
                          }
                        }}
                        disabled={isView}
                      />
                    </FormControl>
                    <FormDescription>
                      Search and select the certification type from the government database.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden name field - automatically populated from certification selection */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <input type="hidden" {...field} />
                )}
              />

              {/* Selected Certification Details */}
              {selectedCertification && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {selectedCertification.fullName}
                      <Badge 
                        variant="outline"
                        className={cn(
                          `bg-${getPriorityColor(selectedCertification.priority)}-50 text-${getPriorityColor(selectedCertification.priority)}-700 border-${getPriorityColor(selectedCertification.priority)}-200`
                        )}
                      >
                        {selectedCertification.priority} priority
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {selectedCertification.issuingAgency}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {selectedCertification.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {selectedCertification.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {selectedCertification.expirationPeriod && (
                      <Alert>
                        <Calendar className="h-4 w-4" />
                        <AlertDescription>
                          This certification expires after {selectedCertification.expirationPeriod} {selectedCertification.expirationUnit}
                          {selectedCertification.renewalRequired && ' and requires renewal'}
                          {selectedCertification.expirationNotes && `. ${selectedCertification.expirationNotes}`}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                {/* Certification Number */}
                <FormField
                  control={form.control}
                  name="certificationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certification Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your certification number (optional)"
                          {...field}
                          disabled={isView}
                        />
                      </FormControl>
                      <FormDescription>
                        Your specific certification number or identifier, if applicable.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="obtainedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Obtained *</FormLabel>
                        <FormControl>
                          <DatePickerField
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select date obtained"
                            disabled={isView}
                          />
                        </FormControl>
                        <FormDescription>
                          When you obtained this certification
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expirationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Date</FormLabel>
                        <FormControl>
                          <DatePickerField
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select expiration date (optional)"
                            disabled={isView}
                          />
                        </FormControl>
                        <FormDescription>
                          When this certification expires (if applicable)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Status Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isView}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full bg-green-500")} />
                                Active
                              </div>
                            </SelectItem>
                            <SelectItem value="pending">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full bg-yellow-500")} />
                                Pending
                              </div>
                            </SelectItem>
                            <SelectItem value="expired">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full bg-red-500")} />
                                Expired
                              </div>
                            </SelectItem>
                            <SelectItem value="suspended">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full bg-orange-500")} />
                                Suspended
                              </div>
                            </SelectItem>
                            <SelectItem value="revoked">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full bg-red-600")} />
                                Revoked
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Current status of your certification
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="verificationStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isView}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select verification status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="not_required">Not Required</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="verified">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                Verified
                              </div>
                            </SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Document verification status
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Details & Documents Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Details & Documents</h3>

                {/* Document URL */}
                <FormField
                  control={form.control}
                  name="documentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document URL (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/my-certification.pdf"
                          type="url"
                          {...field}
                          disabled={isView}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Link to your certification document (e.g., cloud storage, website).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Issuing Office */}
                <FormField
                  control={form.control}
                  name="issuingOffice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issuing Office</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Specific office or location that issued the certification"
                          {...field}
                          disabled={isView}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Specific office or location details
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about this certification..."
                          className="min-h-[100px]"
                          {...field}
                          disabled={isView}
                        />
                      </FormControl>
                      <FormDescription>
                        Any additional information or special conditions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Settings & Reminders Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Settings & Reminders</h3>

                {/* Activation Toggle */}
                <FormField
                  control={form.control}
                  name="isActivated"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Use for Opportunity Matching
                        </FormLabel>
                        <FormDescription>
                          Include this certification when calculating profile scores and matching opportunities.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isView}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Reminder Settings */}
                <FormField
                  control={form.control}
                  name="reminderSettings.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Expiration Reminders
                        </FormLabel>
                        <FormDescription>
                          Receive notifications before this certification expires.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isView || !form.watch('expirationDate')}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Reminder Days */}
                {form.watch('reminderSettings.enabled') && (
                  <FormField
                    control={form.control}
                    name="reminderSettings.reminderDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reminder Schedule</FormLabel>
                        <FormDescription>
                          Days before expiration to send reminders (comma-separated)
                        </FormDescription>
                        <FormControl>
                          <Input
                            placeholder="30, 60, 90"
                            value={field.value?.join(', ') || ''}
                            onChange={(e) => {
                              const days = e.target.value
                                .split(',')
                                .map(d => parseInt(d.trim()))
                                .filter(d => !isNaN(d) && d > 0)
                              field.onChange(days)
                            }}
                            disabled={isView}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <Separator />

            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                {isView ? 'Close' : 'Cancel'}
              </Button>
              
              {!isView && (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => {
                    console.log('🔘 Submit button clicked')
                    console.log('📋 Form values:', form.getValues())
                    console.log('❌ Form errors:', form.formState.errors)
                    console.log('✅ Form valid:', form.formState.isValid)
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEdit ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>
                      {isEdit ? 'Update Certification' : 'Add Certification'}
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}