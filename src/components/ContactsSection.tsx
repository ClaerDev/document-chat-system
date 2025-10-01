'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Phone, Mail, Building2, MapPin, UserPlus, Contact, Loader2, Check, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotify } from '@/contexts/notification-context'
import { ContactRole } from '@/types/global-enums'
import type { Opportunity } from '@/types'
import type { ExternalContact } from '@/types/external-data'

interface ContactsSectionProps {
  opportunity: Opportunity
  className?: string
}

export function ContactsSection({ opportunity, className = '' }: ContactsSectionProps) {
  // Get point of contact data from the opportunity
  const contacts = opportunity.pointOfContact || []
  
  // Process contacts to ensure firstName/lastName are available and handle data corruption
  const processedContacts = React.useMemo(() => {
    return contacts.map(contact => {
      // If we have firstName and lastName, use them as-is
      if (contact.firstName && contact.lastName) {
        return contact
      }
      
      // Get fullName from multiple possible fields
      let fullNameSource = contact.fullName || contact.fullname || contact.name
      
      // Handle corrupted data where phone number might be in the name field
      if (fullNameSource?.includes('Telephone:') || fullNameSource?.match(/^\d{10}$/) || fullNameSource?.match(/^\d{3}-\d{3}-\d{4}$/)) {
        console.warn('🔧 [ContactsSection] Detected corrupted name field, attempting to extract from email:', fullNameSource)
        
        // Try to extract name from email
        if (contact.email) {
          try {
            const emailParts = contact.email.split('@')[0].split('.')
            if (emailParts.length >= 2) {
              // Format: firstname.lastname@domain.gov -> "Firstname Lastname"
              fullNameSource = emailParts.map(part => 
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
              ).join(' ')
              console.log('✅ [ContactsSection] Extracted name from email:', fullNameSource)
            } else {
              // Single part email, use title or fallback
              fullNameSource = contact.title || 'Government Contact'
            }
          } catch (error) {
            console.warn('Failed to extract name from email:', error)
            fullNameSource = contact.title || 'Government Contact'
          }
        } else {
          // No email available, use title or fallback
          fullNameSource = contact.title || 'Government Contact'
        }
      }
      
      // If we have a valid fullName source, split it into firstName and lastName
      if (fullNameSource && !contact.firstName && !contact.lastName) {
        const nameParts = fullNameSource.trim().split(/\s+/)
        return {
          ...contact,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '', // Everything after first part becomes lastName
          // Also update the fullName fields for consistency
          fullName: fullNameSource,
          fullname: fullNameSource,
          name: fullNameSource
        }
      }
      
      return contact
    })
  }, [contacts])
  
  // Debug: Log contact data to understand structure and detect issues
  React.useEffect(() => {
    if (processedContacts.length > 0) {
      console.log('🔍 [ContactsSection] Contact data structure:', {
        contactsLength: processedContacts.length,
        firstContact: processedContacts[0],
        fieldsAvailable: Object.keys(processedContacts[0] || {}),
        fullNameField: processedContacts[0]?.fullName,
        fullnameField: processedContacts[0]?.fullname,
        nameField: processedContacts[0]?.name,
        firstNameField: processedContacts[0]?.firstName,
        lastNameField: processedContacts[0]?.lastName,
        emailField: processedContacts[0]?.email,
        phoneField: processedContacts[0]?.phone
      })
      
      // Check for potential data corruption issues
      processedContacts.forEach((contact, index) => {
        const fullNameSource = contact.fullName || contact.fullname || contact.name
        if (fullNameSource?.includes('Telephone:') || fullNameSource?.match(/^\d{10}$/) || fullNameSource?.match(/^\d{3}-\d{3}-\d{4}$/)) {
          console.error('🚨 [ContactsSection] Detected corrupted contact name (phone number as name):', {
            contactIndex: index,
            corruptedName: fullNameSource,
            email: contact.email,
            phone: contact.phone,
            fullContact: contact
          })
        }
      })
    }
  }, [processedContacts])
  const [savingContacts, setSavingContacts] = useState(false)
  const [savedContactIds, setSavedContactIds] = useState<Set<string>>(new Set())
  const [existingContactIds, setExistingContactIds] = useState<Set<string>>(new Set())
  const [existingContactData, setExistingContactData] = useState<Record<string, { id: string, name: string }>>({})
  const [checkingExistingContacts, setCheckingExistingContacts] = useState(false)
  const notify = useNotify()

  // Function to check for existing contacts in the database
  const checkExistingContacts = async () => {
    if (processedContacts.length === 0) return
    
    setCheckingExistingContacts(true)
    const foundExistingIds = new Set<string>()
    const foundContactData: Record<string, { id: string, name: string }> = {}
    
    try {
      for (const contact of processedContacts) {
        if (contact.email || contact.phone) {
          // Search for existing contact by email or phone
          const searchParams = new URLSearchParams()
          if (contact.email) searchParams.append('email', contact.email)
          if (contact.phone) searchParams.append('phone', contact.phone)
          searchParams.append('limit', '1')
          
          const response = await fetch(`/api/v1/contacts?${searchParams.toString()}`)
          if (response.ok) {
            const data = await response.json()
            if (data.items && data.items.length > 0) {
              // Contact already exists in CRM
              const existingContact = data.items[0]
              const contactKey = `${contact.firstName}-${contact.lastName}-${processedContacts.indexOf(contact)}`
              foundExistingIds.add(contactKey)
              foundContactData[contactKey] = {
                id: existingContact.id,
                name: `${existingContact.firstName || ''} ${existingContact.lastName || ''}`.trim() || 'Unknown Contact'
              }
              console.log(`Found existing contact: ${contact.email || contact.phone} (ID: ${existingContact.id})`)
            }
          }
        }
      }
      
      setExistingContactIds(foundExistingIds)
      setExistingContactData(foundContactData)
      
      if (foundExistingIds.size > 0) {
        console.log(`Found ${foundExistingIds.size} contacts already in CRM`)
      }
      
    } catch (error) {
      console.error('Error checking existing contacts:', error)
    } finally {
      setCheckingExistingContacts(false)
    }
  }

  // Check for existing contacts on component mount
  React.useEffect(() => {
    checkExistingContacts()
  }, [opportunity.id]) // Re-run when opportunity changes

  // Function to map contact type to valid professional role
  const mapContactTypeToRole = (type?: string): ContactRole => {
    const typeMapping: Record<string, ContactRole> = {
      'PRIMARY_POINT_OF_CONTACT': ContactRole.CONTRACTING_OFFICER,
      'POINT_OF_CONTACT': ContactRole.CONTRACTING_SPECIALIST,
      'CONTRACTING_OFFICER': ContactRole.CONTRACTING_OFFICER,
      'PROGRAM_MANAGER': ContactRole.PROGRAM_MANAGER,
      'TECHNICAL_LEAD': ContactRole.TECHNICAL_LEAD,
      'TECHNICAL_CONTACT': ContactRole.TECHNICAL_LEAD,
      'ADMINISTRATIVE_CONTACT': ContactRole.PROCUREMENT_ANALYST,
      'PROJECT_MANAGER': ContactRole.PROJECT_MANAGER,
      'SECURITY_OFFICER': ContactRole.SECURITY_OFFICER,
      'IT_DIRECTOR': ContactRole.IT_DIRECTOR,
      'DIRECTOR': ContactRole.DIRECTOR,
      'ADMINISTRATOR': ContactRole.ADMINISTRATOR
    }
    return typeMapping[type || ''] || ContactRole.OTHER
  }

  // Function to save a single contact to CRM
  const saveContactToCRM = async (contact: ExternalContact, index: number) => {
    try {
      // Create contact data from ExternalContact
      const mappedRole = mapContactTypeToRole(contact.type)
      console.log('Debug - Contact type mapping:', { 
        originalType: contact.type, 
        mappedRole,
        opportunityOffice: opportunity.office 
      })
      
      const contactData = {
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        title: contact.title || undefined,
        alternateEmail: contact.alternateEmail || undefined,
        alternatePhone: contact.alternatePhone || undefined,
        agencyInfo: {
          agency: typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name,
          department: typeof opportunity.agency === 'object' ? opportunity.agency?.type : undefined,
          office: opportunity.office || undefined  // Use undefined instead of empty string
        },
        addressInfo: contact.address || contact.officeAddress ? {
          addressLine1: contact.address?.addressLine1 || undefined,
          addressLine2: contact.address?.addressLine2 || undefined,
          city: contact.address?.city || contact.officeAddress?.city || undefined,
          state: contact.address?.state || contact.officeAddress?.state || undefined,
          zipCode: contact.address?.zipCode || contact.officeAddress?.zipcode || undefined,
          country: contact.address?.country || (contact.officeAddress?.countryCode === 'USA' ? 'USA' : contact.officeAddress?.countryCode) || 'USA'
        } : undefined,
        professionalInfo: {
          role: mappedRole,
          importance: 'MEDIUM',
          authority: contact.title?.toLowerCase().includes('officer') ? 'HIGH' : 'MEDIUM'
        },
        contactPreferences: {
          preferredMethod: contact.email ? 'EMAIL' : 'PHONE',
          bestTimeToContact: 'BUSINESS_HOURS',
          timezone: 'America/New_York'
        },
        notesAndTags: {
          notes: `Contact extracted from opportunity: ${opportunity.title}`,
          tags: ['GOVERNMENT', 'OPPORTUNITY_CONTACT'],
          priority: contact.type === 'PRIMARY_POINT_OF_CONTACT' ? 'HIGH' : 'MEDIUM',
          status: 'ACTIVE'
        },
        source: 'EXTRACTED' as const,
        sourceUrl: opportunity.sourceUrl || undefined,
        sourceDocument: opportunity.solicitationNumber || undefined,
        verified: contact.confidence ? contact.confidence > 0.8 : false
      }

      console.log('Debug - Complete contact data being sent:', JSON.stringify(contactData, null, 2))

      // Create contact in CRM
      const response = await fetch('/api/v1/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save contact')
      }

      const result = await response.json()
      const createdContact = result.data

      // Map contact type to relationship for opportunity linking
      const mapContactTypeToRelationship = (type?: string): string => {
        const relationshipMapping: Record<string, string> = {
          'PRIMARY_POINT_OF_CONTACT': 'CONTRACTING_OFFICER',
          'POINT_OF_CONTACT': 'POINT_OF_CONTACT',
          'CONTRACTING_OFFICER': 'CONTRACTING_OFFICER',
          'PROGRAM_MANAGER': 'PROGRAM_MANAGER',
          'TECHNICAL_LEAD': 'TECHNICAL_LEAD',
          'TECHNICAL_CONTACT': 'TECHNICAL_LEAD',
          'ADMINISTRATIVE_CONTACT': 'POINT_OF_CONTACT'
        }
        return relationshipMapping[type || ''] || 'POINT_OF_CONTACT'
      }

      const linkData = {
        solicitationNumber: opportunity.solicitationNumber || '',
        opportunityId: String(opportunity.id), // Fallback parameter
        opportunityTitle: opportunity.title,
        opportunityAgency: typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name,
        opportunityStatus: opportunity.status || 'ACTIVE',
        estimatedValue: opportunity.estimatedValue || null,
        responseDeadline: opportunity.responseDeadline || null,
        sourceSystem: opportunity.sourceSystem || 'MANUAL', // Use opportunity's actual source system
        sourceUrl: opportunity.sourceUrl,
        externalId: String(opportunity.id),
        relationship: mapContactTypeToRelationship(contact.type),
        isPrimary: contact.type === 'PRIMARY_POINT_OF_CONTACT',
        notes: `Extracted from ${opportunity.solicitationNumber || opportunity.title || 'opportunity'}`,
        confidence: Math.min(Math.max(parseFloat(String(contact.confidence || 0.8)), 0), 1) // Ensure 0-1 range
      }

      console.log('Debug - Opportunity info for linking:', {
        opportunityId: opportunity.id,
        opportunityIdType: typeof opportunity.id,
        solicitationNumber: opportunity.solicitationNumber || '',
        contactType: contact.type,
        mappedRelationship: mapContactTypeToRelationship(contact.type),
        linkData: linkData
      })

      console.log('Debug - Contact-opportunity link data:', JSON.stringify(linkData, null, 2))

      // Link contact to opportunity
      const linkResponse = await fetch(`/api/v1/contacts/${createdContact.id}/opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(linkData),
      })

      if (!linkResponse.ok) {
        const linkErrorData = await linkResponse.json()
        console.error('❌ OPPORTUNITY LINKING FAILED:', {
          status: linkResponse.status,
          error: linkErrorData.error,
          details: linkErrorData.details,
          sentData: linkData
        })
        
        // Log specific validation errors for debugging
        if (linkErrorData.details && Array.isArray(linkErrorData.details)) {
          console.error('🔍 VALIDATION ERRORS:', linkErrorData.details.map((detail: any, index: number) => ({
            [`Error ${index + 1}`]: {
              path: detail.path,
              code: detail.code,
              message: detail.message,
              expected: detail.expected,
              received: detail.received
            }
          })))
        }
        
        // Continue even if linking fails - contact was still created
        console.warn('⚠️ Contact created but failed to link to opportunity - contact exists in CRM but won\'t show linked opportunities')
      } else {
        console.log('✅ Contact successfully linked to opportunity')
      }

      return createdContact

    } catch (error) {
      console.error('Error saving contact:', error)
      throw error
    }
  }

  // Function to save all contacts
  const saveAllContactsToCRM = async () => {
    if (processedContacts.length === 0) return
    
    setSavingContacts(true)
    const newSavedIds = new Set<string>()
    const newExistingIds = new Set<string>()
    const newExistingData: Record<string, { id: string, name: string }> = {}
    let successCount = 0
    let errorCount = 0

    try {
      for (let i = 0; i < processedContacts.length; i++) {
        const contact = processedContacts[i]
        const contactKey = `${contact.firstName}-${contact.lastName}-${i}`
        
        // Skip if already saved or existing
        if (savedContactIds.has(contactKey) || existingContactIds.has(contactKey)) {
          continue
        }
        
        try {
          const savedContact = await saveContactToCRM(contact, i)
          newSavedIds.add(contactKey)
          
          // IMPORTANT: Track as existing contact so "View Profile" button appears
          newExistingIds.add(contactKey)
          newExistingData[contactKey] = {
            id: savedContact.id,
            name: `${savedContact.firstName || ''} ${savedContact.lastName || ''}`.trim() || 'Unknown Contact'
          }
          
          successCount++
        } catch (error) {
          errorCount++
          console.error(`Failed to save contact ${i + 1}:`, error)
        }
      }

      setSavedContactIds(prev => new Set([...prev, ...newSavedIds]))
      
      // IMPORTANT: Update existing contact tracking for "View Profile" buttons
      setExistingContactIds(prev => new Set([...prev, ...newExistingIds]))
      setExistingContactData(prev => ({ ...prev, ...newExistingData }))

      if (successCount > 0) {
        notify.success(
          "Contacts Added to CRM",
          `Successfully added ${successCount} contact${successCount > 1 ? 's' : ''} to your CRM and linked to this opportunity${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
        )
      }

      if (errorCount > 0 && successCount === 0) {
        notify.error(
          "Save Failed",
          "Failed to save contacts to CRM. Please try again."
        )
      }

    } catch (error) {
      console.error('Error saving contacts:', error)
      notify.error(
        "Save Failed",
        "An error occurred while saving contacts to CRM."
      )
    } finally {
      setSavingContacts(false)
    }
  }

  // Function to save individual contact
  const saveIndividualContact = async (contact: ExternalContact, index: number) => {
    const contactKey = `${contact.firstName}-${contact.lastName}-${index}`
    
    if (savedContactIds.has(contactKey) || existingContactIds.has(contactKey)) {
      notify.info(
        "Already in CRM",
        "This contact is already saved in your CRM."
      )
      return
    }

    try {
      const savedContact = await saveContactToCRM(contact, index)
      setSavedContactIds(prev => new Set([...prev, contactKey]))
      
      // IMPORTANT: Update existingContactIds and existingContactData so "View Profile" button appears
      setExistingContactIds(prev => new Set([...prev, contactKey]))
      setExistingContactData(prev => ({
        ...prev,
        [contactKey]: {
          id: savedContact.id,
          name: `${savedContact.firstName || ''} ${savedContact.lastName || ''}`.trim() || 'Unknown Contact'
        }
      }))
      
      notify.success(
        "Contact Added to CRM",
        `${contact.firstName || ''} ${contact.lastName || ''} has been successfully added to your CRM and linked to this opportunity.`
      )
    } catch (error) {
      console.error('Error saving individual contact:', error)
      notify.error(
        "Save Failed",
        "Failed to save contact to CRM. Please try again."
      )
    }
  }
  
  if (processedContacts.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Contact className="w-5 h-5 text-government" />
          <h3 className="text-lg font-semibold">Point of Contact</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <Contact className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No contact information available</p>
          <p className="text-sm mt-1">Contact details may be added when available from SAM.gov</p>
        </div>
      </Card>
    )
  }

  const formatContactType = (type: string | undefined) => {
    if (!type) return 'Contact'
    
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getContactTypeColor = (type: string | undefined) => {
    switch (type) {
      case 'PRIMARY_POINT_OF_CONTACT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'CONTRACTING_OFFICER':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'TECHNICAL_CONTACT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'PROGRAM_MANAGER':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Contact className="w-4 h-4 text-government" />
          <h4 className="font-medium">Contacts</h4>
          <Badge variant="outline" className="text-xs">
            {processedContacts.length}
          </Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs px-2 py-1 h-7"
          onClick={saveAllContactsToCRM}
          disabled={
            savingContacts || 
            checkingExistingContacts || 
            processedContacts.length === 0 ||
            processedContacts.every((_, index) => 
              savedContactIds.has(`${processedContacts[index].firstName}-${processedContacts[index].lastName}-${index}`) ||
              existingContactIds.has(`${processedContacts[index].firstName}-${processedContacts[index].lastName}-${index}`)
            )
          }
        >
          {savingContacts ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : checkingExistingContacts ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <UserPlus className="w-3 h-3" />
          )}
          <span className="ml-1 hidden sm:inline">
            {savingContacts ? 'Saving...' : 
             checkingExistingContacts ? 'Checking...' :
             processedContacts.every((_, index) => 
               savedContactIds.has(`${processedContacts[index].firstName}-${processedContacts[index].lastName}-${index}`) ||
               existingContactIds.has(`${processedContacts[index].firstName}-${processedContacts[index].lastName}-${index}`)
             ) ? 'All Added' : 'Add All'}
          </span>
        </Button>
      </div>

      <div className="space-y-3">
        {processedContacts.map((contact, index) => (
          <div key={index} className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
            <div className="space-y-2">
              {/* Contact Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-government/10 flex items-center justify-center text-government text-xs font-semibold shrink-0">
                    {contact.firstName?.charAt(0) || contact.fullName?.charAt(0) || contact.fullname?.charAt(0) || contact.name?.charAt(0) || 'C'}
                    {contact.lastName?.charAt(0) || ''}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <h5 className="font-medium text-sm leading-tight">
                        {(contact.firstName || contact.lastName) ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() : 
                         contact.fullName || 
                         contact.fullname || // Fallback to old field name
                         contact.name || // Some data sources use 'name'
                         'Unknown Contact'}
                      </h5>
                      {existingContactIds.has(`${contact.firstName}-${contact.lastName}-${index}`) && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          CRM
                        </Badge>
                      )}
                    </div>
                    {contact.title && (
                      <p className="text-xs text-muted-foreground truncate">{contact.title}</p>
                    )}
                    {contact.type && (
                      <Badge className={`text-xs ${getContactTypeColor(contact.type)} mt-1`}>
                        {formatContactType(contact.type)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Details - Compact */}
              <div className="space-y-1 text-xs">
                {contact.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline truncate"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                    <a 
                      href={`tel:${contact.phone}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}

                {(contact.address || contact.officeAddress) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground truncate">
                      {[
                        contact.address?.city || contact.officeAddress?.city, 
                        contact.address?.state || contact.officeAddress?.state
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons - Horizontal */}
              <div className="flex gap-1 pt-1">
                <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-6 flex-1">
                  Contact
                </Button>
                
                {/* Show View Profile button for existing contacts */}
                {existingContactIds.has(`${contact.firstName}-${contact.lastName}-${index}`) ? (
                  <Link href={`/contacts/${existingContactData[`${contact.firstName}-${contact.lastName}-${index}`]?.id}`} className="flex-1">
                    <Button variant="default" size="sm" className="text-xs px-2 py-1 h-6 w-full">
                      <User className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs px-2 py-1 h-6 flex-1"
                    onClick={() => saveIndividualContact(contact, index)}
                    disabled={
                      savingContacts || 
                      checkingExistingContacts ||
                      savedContactIds.has(`${contact.firstName}-${contact.lastName}-${index}`)
                    }
                  >
                    {savedContactIds.has(`${contact.firstName}-${contact.lastName}-${index}`) ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Saved
                      </>
                    ) : checkingExistingContacts ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}