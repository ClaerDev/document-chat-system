'use client'

import { useMemo, useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { 
  Check, 
  ChevronsUpDown, 
  X, 
  Info, 
  User, 
  Building, 
  Phone, 
  Mail, 
  Star,
  MapPin,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContactStore } from '@/stores/contacts-store'
import type { Contact } from '@/types/contacts'

interface ContactOption {
  id: string
  displayName: string
  fullName: string
  title: string
  agency: string
  email: string
  phone: string
  importance: string
  profileImage?: string
  location?: string
  role?: string
  verified?: boolean
}

interface ContactSelectProps {
  value?: string | string[]
  onChange: (contactId: string | string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  multiple?: boolean
  showProfileImages?: boolean
  maxItems?: number
}

interface ContactLabelWithInfoProps {
  htmlFor?: string
  children: React.ReactNode
  selectedValue?: string | string[]
}

// Generate initials from name for avatar fallback
function getInitials(firstName: string, lastName: string): string {
  const first = firstName.charAt(0).toUpperCase()
  const last = lastName.charAt(0).toUpperCase()
  return `${first}${last}`
}

// Get importance color
function getImportanceColor(importance: string): string {
  switch (importance) {
    case 'CRITICAL': return 'text-red-600 dark:text-red-400'
    case 'HIGH': return 'text-orange-600 dark:text-orange-400'
    case 'MEDIUM': return 'text-yellow-600 dark:text-yellow-400'
    case 'LOW': return 'text-green-600 dark:text-green-400'
    default: return 'text-gray-600 dark:text-gray-400'
  }
}

// Transform contact data to ContactOption format
function contactToOption(contact: Contact): ContactOption {
  const fullName = `${contact.firstName} ${contact.lastName}`
  const title = contact.title || 'No Title'
  const agency = contact.agencyInfo?.agency || 'Unknown Agency'
  const location = contact.addressInfo ? 
    `${contact.addressInfo.city || ''}${contact.addressInfo.city && contact.addressInfo.state ? ', ' : ''}${contact.addressInfo.state || ''}`.trim() || 
    'Unknown Location' : 'Unknown Location'

  return {
    id: contact.id,
    displayName: `${fullName} - ${title}`,
    fullName,
    title,
    agency,
    email: contact.email || '',
    phone: contact.phone || '',
    importance: contact.professionalInfo?.importance || 'MEDIUM',
    profileImage: contact.profilePhoto,
    location,
    role: contact.professionalInfo?.role || '',
    verified: contact.verified
  }
}

// Contact Label with Info Icon Component  
export function ContactLabelWithInfo({ htmlFor, children, selectedValue }: ContactLabelWithInfoProps) {
  const { contacts } = useContactStore()
  
  // Get contact data for selected value(s)
  const selectedData = useMemo(() => {
    if (!selectedValue) return null
    
    if (Array.isArray(selectedValue)) {
      return selectedValue.length > 0 ? contacts.find(contact => contact.id === selectedValue[0]) : null
    }
    
    return contacts.find(contact => contact.id === selectedValue) || null
  }, [selectedValue, contacts])

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {children}
      </label>
      <HoverCard>
        <HoverCardTrigger asChild>
          <button type="button" className="inline-flex items-center justify-center">
            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-96 bg-popover text-popover-foreground border shadow-sm" align="start">
          {selectedValue && selectedData ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  {selectedData.profilePhoto && (
                    <AvatarImage src={selectedData.profilePhoto} alt={`${selectedData.firstName} ${selectedData.lastName}`} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getInitials(selectedData.firstName, selectedData.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium leading-tight">
                      {selectedData.firstName} {selectedData.lastName}
                    </h4>
                    {selectedData.verified && (
                      <Badge variant="secondary" className="text-xs">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                  {selectedData.title && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedData.title}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <Building className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {selectedData.organizationInfo?.agency || 'Unknown Agency'}
                    </p>
                  </div>
                  {selectedData.email && (
                    <div className="flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{selectedData.email}</p>
                    </div>
                  )}
                  {selectedData.phone && (
                    <div className="flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{selectedData.phone}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1 pt-2 border-t border-border/40">
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getImportanceColor(selectedData.professionalInfo?.importance || 'MEDIUM'))}
                >
                  <Star className="h-3 w-3 mr-1" />
                  {selectedData.professionalInfo?.importance || 'MEDIUM'}
                </Badge>
                {selectedData.professionalInfo?.role && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedData.professionalInfo.role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                )}
                {selectedData.addressInfo?.state && (
                  <Badge variant="secondary" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {selectedData.addressInfo.city ? 
                      `${selectedData.addressInfo.city}, ${selectedData.addressInfo.state}` :
                      selectedData.addressInfo.state
                    }
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Contact Selection</h4>
              <p className="text-sm text-muted-foreground">
                Choose from your saved contacts to automatically populate client information with 
                verified contact details, roles, and agency affiliations.
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                💡 Select a contact first to see detailed information here.
              </p>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

export function ContactSelect({ 
  value, 
  onChange, 
  placeholder = "Select contact",
  className = "",
  disabled = false,
  multiple = false,
  showProfileImages = true,
  maxItems = 100
}: ContactSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { contacts, fetchContacts, isLoading } = useContactStore()

  // Fetch contacts when component mounts if not already loaded
  useEffect(() => {
    if (contacts.length === 0 && !isLoading) {
      fetchContacts()
    }
  }, [contacts.length, isLoading, fetchContacts])

  // Transform contacts to options
  const allContactOptions = useMemo(() => {
    return contacts.map(contactToOption).filter(option => option.fullName.trim())
  }, [contacts])

  // Get the selected contact options
  const selectedContacts = useMemo(() => {
    if (!value) return []
    const values = Array.isArray(value) ? value : [value]
    return values.map(val => allContactOptions.find(contact => contact.id === val)).filter(Boolean) as ContactOption[]
  }, [value, allContactOptions])

  const selectedValues = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : []
  }, [value])

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return allContactOptions
    
    const query = searchQuery.toLowerCase().trim()
    return allContactOptions.filter(contact => 
      contact.fullName.toLowerCase().includes(query) ||
      contact.title.toLowerCase().includes(query) ||
      contact.agency.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query) ||
      contact.phone.toLowerCase().includes(query) ||
      contact.location.toLowerCase().includes(query) ||
      (contact.role && contact.role.toLowerCase().includes(query))
    )
  }, [allContactOptions, searchQuery])

  // Sort contacts by importance and name
  const sortedContacts = useMemo(() => {
    const importanceOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 }
    return filteredContacts
      .sort((a, b) => {
        const aImportance = importanceOrder[a.importance as keyof typeof importanceOrder] ?? 4
        const bImportance = importanceOrder[b.importance as keyof typeof importanceOrder] ?? 4
        
        if (aImportance !== bImportance) {
          return aImportance - bImportance
        }
        
        return a.fullName.localeCompare(b.fullName)
      })
      .slice(0, maxItems)
  }, [filteredContacts, maxItems])

  const handleSelect = (contactId: string) => {
    if (multiple) {
      const currentValues = selectedValues
      const isSelected = currentValues.includes(contactId)
      
      if (isSelected) {
        // Remove from selection
        const newValues = currentValues.filter(val => val !== contactId)
        onChange(newValues)
      } else {
        // Add to selection
        const newValues = [...currentValues, contactId]
        onChange(newValues)
      }
      // Don't close dropdown in multi-select mode
      setSearchQuery('')
    } else {
      // Single select mode
      if (contactId === value) {
        onChange('')
      } else {
        onChange(contactId)
      }
      setOpen(false)
      setSearchQuery('')
    }
  }

  const handleClear = () => {
    onChange(multiple ? [] : '')
    setOpen(false)
    setSearchQuery('')
  }

  const handleRemoveItem = (contactId: string) => {
    if (multiple) {
      const newValues = selectedValues.filter(val => val !== contactId)
      onChange(newValues)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between font-normal pr-8 ${selectedContacts.length > 0 && multiple ? 'min-h-10 h-auto py-2' : 'h-10'}`}
            disabled={disabled}
          >
            <div className={`flex gap-2 min-w-0 flex-1 ${selectedContacts.length > 0 && multiple ? 'items-start' : 'items-center'}`}>
              {selectedContacts.length > 0 ? (
                multiple ? (
                  <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                    {selectedContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center gap-2 bg-secondary/50 rounded-md px-2 py-1">
                        {showProfileImages && (
                          <Avatar className="h-5 w-5">
                            {contact.profileImage && (
                              <AvatarImage src={contact.profileImage} alt={contact.fullName} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                              {getInitials(contact.fullName.split(' ')[0], contact.fullName.split(' ')[1] || '')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-xs font-medium truncate max-w-32">{contact.fullName}</span>
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveItem(contact.id)
                          }}
                          className="ml-1 hover:text-destructive cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {showProfileImages && (
                      <Avatar className="h-6 w-6">
                        {selectedContacts[0].profileImage && (
                          <AvatarImage src={selectedContacts[0].profileImage} alt={selectedContacts[0].fullName} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {getInitials(selectedContacts[0].fullName.split(' ')[0], selectedContacts[0].fullName.split(' ')[1] || '')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm truncate">{selectedContacts[0].fullName}</span>
                    </div>
                  </div>
                )
              ) : (
                <span className="text-muted-foreground">
                  {placeholder}
                </span>
              )}
            </div>
            <ChevronsUpDown className={`h-4 w-4 shrink-0 opacity-50 ${selectedContacts.length > 0 && multiple ? 'self-start mt-1' : ''}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search contacts..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-96">
              <CommandEmpty>
                {isLoading ? "Loading contacts..." : "No contacts found."}
              </CommandEmpty>
              
              {/* Group by importance for better organization */}
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(importance => {
                const importanceContacts = sortedContacts.filter(contact => contact.importance === importance)
                if (importanceContacts.length === 0) return null
                
                return (
                  <CommandGroup 
                    key={importance} 
                    heading={`${importance} Priority (${importanceContacts.length})`}
                  >
                    {importanceContacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={`${contact.fullName} ${contact.title} ${contact.agency} ${contact.email}`}
                        onSelect={() => handleSelect(contact.id)}
                        className="flex items-center justify-between gap-2 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {showProfileImages && (
                            <Avatar className="h-8 w-8">
                              {contact.profileImage && (
                                <AvatarImage src={contact.profileImage} alt={contact.fullName} />
                              )}
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                {getInitials(contact.fullName.split(' ')[0], contact.fullName.split(' ')[1] || '')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">{contact.fullName}</span>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs shrink-0", getImportanceColor(contact.importance))}
                              >
                                <Star className="h-2.5 w-2.5 mr-1" />
                                {contact.importance.charAt(0)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                              <p className="text-xs text-muted-foreground truncate">{contact.agency}</p>
                            </div>
                            {contact.phone && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                                <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
                              </div>
                            )}
                            {contact.email && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedValues.includes(contact.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })}
              
              {filteredContacts.length > maxItems && (
                <div className="p-2 text-xs text-muted-foreground text-center border-t">
                  Showing first {maxItems} results. Refine search for more specific results.
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Clear button positioned absolutely */}
      {selectedContacts.length > 0 && (
        <button
          type="button"
          className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}