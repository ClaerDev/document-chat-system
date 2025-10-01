'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { PhoneNumberInput } from '@/components/ui/phone-input'
import { AgencySelector, AgencyLabelWithInfo, getAgencyByCode } from '@/components/agency'
import { SeparateLocationSelector } from '@/components/location'
import { PSCSelector, PSCLabelWithInfo } from '@/components/psc'
import { CertificationModal } from '@/components/certifications'
import { TimezoneSelect } from '@/components/ui/timezone-select'
import { ContactImageUpload, StagedImage } from '@/components/contacts/ContactImageUpload'
import { processContactImageChanges, cleanupStagedImage } from '@/lib/contact-image-utils'
import { useContactStore } from '@/stores/contacts-store'
import { useNotifications } from '@/contexts/notification-context'
import { SecurityClearanceLevel } from '@/lib/security-clearance'
import { SecurityClearanceSelector } from '@/components/security-clearance/SecurityClearanceSelector'
import certificationsData from '@/data/government/certifications/certifications.json'
import {
  Contact,
  ContactSource,
  ContactRole,
  ContactImportance,
  CreateContactData,
  UpdateContactData
} from '@/types/contacts'
import {
  YearsInRole,
  PreferredContactMethod,
  CommunicationFrequency,
  CONTACT_ROLE_OPTIONS,
  CONTACT_IMPORTANCE_OPTIONS,
  YEARS_IN_ROLE_OPTIONS,
  PREFERRED_CONTACT_METHOD_OPTIONS,
  COMMUNICATION_FREQUENCY_OPTIONS
} from '@/types/global-enums'
import {
  User,
  Building,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Globe,
  Calendar,
  Star,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  X,
  ExternalLink
} from 'lucide-react'

// Helper to get all certifications for dropdown
const getAllCertifications = () => {
  const certifications: Array<{id: string, name: string, fullName: string, category: string}> = []
  
  certificationsData.certificationCategories.forEach(category => {
    category.certifications.forEach(cert => {
      if (cert.isActive) {
        certifications.push({
          id: cert.id,
          name: cert.name,
          fullName: cert.fullName,
          category: category.name
        })
      }
    })
  })
  
  return certifications.sort((a, b) => a.name.localeCompare(b.name))
}

interface ContactFormProps {
  mode: 'create' | 'edit'
  contact?: Contact
  onSuccess?: (contact: Contact) => void
  onCancel?: () => void
}

interface SocialLink {
  id: string
  type: string
  url: string
  label: string
}

interface FormData {
  // Basic Information
  firstName: string
  lastName: string
  email: string
  phone: string
  title: string
  alternateEmail: string
  alternatePhone: string
  profilePhoto: string
  
  // Organization Information
  agency: string
  agencyAbbreviation: string
  agencyCode: string
  office: string
  division: string
  website: string
  
  // Address Information  
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  zipCode: string
  country: string
  
  // Professional Information
  role: string
  importance: string
  decisionMaker: boolean
  influenceLevel: number
  contractAuthority: boolean
  budgetAuthority: boolean
  yearsInRole: string
  securityClearance: string
  
  // Contact Preferences
  preferredContact: string
  timeZone: string
  bestTimeToContact: string
  communicationFrequency: string
  
  // Professional Background
  education: string
  previousRoles: string
  expertise: string[]
  certifications: string[]
  
  // Social/Professional Networks
  socialLinks: SocialLink[]
  
  // Notes and Tags
  priority: string
  status: string
  tags: string[]
  notes: string
  
  // Metadata
  source: string
  verified: boolean
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  title: '',
  alternateEmail: '',
  alternatePhone: '',
  profilePhoto: '',
  agency: '',
  agencyAbbreviation: '',
  agencyCode: '',
  office: '',
  division: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'United States',
  role: 'OTHER',
  importance: 'MEDIUM',
  decisionMaker: false,
  influenceLevel: 25,
  contractAuthority: false,
  budgetAuthority: false,
  yearsInRole: YearsInRole.ONE_TO_THREE,
  securityClearance: SecurityClearanceLevel.NONE,
  preferredContact: PreferredContactMethod.EMAIL,
  timeZone: 'America/New_York',
  bestTimeToContact: 'BUSINESS_HOURS',
  communicationFrequency: CommunicationFrequency.WEEKLY,
  education: '',
  previousRoles: '',
  expertise: [],
  certifications: [],
  socialLinks: [],
  priority: 'MEDIUM',
  status: 'ACTIVE',
  tags: [],
  notes: '',
  source: 'MANUAL',
  verified: false
}

// Helper function to convert Contact to FormData
function contactToFormData(contact: Contact): FormData {
  const org = contact.agencyInfo || {}
  const addr = contact.addressInfo || {}
  const prof = contact.professionalInfo || {}
  const prefs = contact.contactPreferences || {}
  const bg = contact.professionalBackground || {}
  const social = contact.socialNetworks || {}
  const notes = contact.notesAndTags || {}

  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email || '',
    phone: contact.phone || '',
    title: contact.title || '',
    alternateEmail: contact.alternateEmail || '',
    alternatePhone: contact.alternatePhone || '',
    profilePhoto: contact.profilePhoto || '',
    agency: org.agency || '',
    agencyAbbreviation: org.agencyAbbreviation || '',
    agencyCode: org.agencyCode || '',
    office: org.office || '',
    division: org.division || '',
    website: org.website || '',
    addressLine1: addr.addressLine1 || '',
    addressLine2: addr.addressLine2 || '',
    city: addr.city || '',
    state: addr.state || '',
    zipCode: addr.zipCode || '',
    country: addr.country || 'United States',
    role: prof.role || 'OTHER',
    importance: prof.importance || 'MEDIUM',
    decisionMaker: prof.decisionMaker || false,
    influenceLevel: prof.influenceLevel || 25,
    contractAuthority: prof.contractAuthority || false,
    budgetAuthority: prof.budgetAuthority || false,
    yearsInRole: prof.yearsInRole || YearsInRole.ONE_TO_THREE,
    securityClearance: prof.clearanceLevel || SecurityClearanceLevel.NONE,
    preferredContact: prefs.preferredContact || PreferredContactMethod.EMAIL,
    timeZone: prefs.timeZone || 'America/New_York',
    bestTimeToContact: prefs.bestTimeToContact || 'BUSINESS_HOURS',
    communicationFrequency: prefs.communicationFrequency || CommunicationFrequency.WEEKLY,
    education: bg.education || '',
    previousRoles: bg.previousRoles || '',
    expertise: bg.expertise || [],
    certifications: bg.certifications || [],
    socialLinks: [
      ...(social.linkedinUrl ? [{ id: 'linkedin', type: 'linkedin', url: social.linkedinUrl, label: 'LinkedIn' }] : []),
      ...(social.twitterUrl ? [{ id: 'twitter', type: 'twitter', url: social.twitterUrl, label: 'Twitter' }] : []),
      ...(social.personalWebsite ? [{ id: 'website', type: 'website', url: social.personalWebsite, label: 'Website' }] : [])
    ],
    priority: notes.priority || 'MEDIUM',
    status: notes.status || 'ACTIVE',
    tags: notes.tags || [],
    notes: notes.notes || '',
    source: contact.source,
    verified: contact.verified
  }
}

// Helper function to convert FormData to API format
function formDataToApiFormat(formData: FormData): CreateContactData | UpdateContactData {
  return {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email || undefined,
    phone: formData.phone || undefined,
    title: formData.title || undefined,
    alternateEmail: formData.alternateEmail || undefined,
    alternatePhone: formData.alternatePhone || undefined,
    profilePhoto: formData.profilePhoto || undefined,
    agencyInfo: {
      agency: formData.agency || undefined,
      agencyAbbreviation: formData.agencyAbbreviation || undefined,
      agencyCode: formData.agencyCode || undefined,
      office: formData.office || undefined,
      division: formData.division || undefined,
      website: formData.website || undefined
    },
    addressInfo: {
      addressLine1: formData.addressLine1 || undefined,
      addressLine2: formData.addressLine2 || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      zipCode: formData.zipCode || undefined,
      country: formData.country || undefined
    },
    professionalInfo: {
      role: formData.role as any,
      importance: formData.importance as any,
      decisionMaker: formData.decisionMaker,
      influenceLevel: formData.influenceLevel,
      contractAuthority: formData.contractAuthority,
      budgetAuthority: formData.budgetAuthority,
      yearsInRole: formData.yearsInRole,
      clearanceLevel: formData.securityClearance && formData.securityClearance !== SecurityClearanceLevel.NONE ? formData.securityClearance : undefined
    },
    contactPreferences: {
      preferredContact: formData.preferredContact as any,
      timeZone: formData.timeZone || undefined,
      bestTimeToContact: formData.bestTimeToContact || undefined,
      communicationFrequency: formData.communicationFrequency || undefined
    },
    professionalBackground: {
      education: formData.education || undefined,
      previousRoles: formData.previousRoles || undefined,
      expertise: formData.expertise.length > 0 ? formData.expertise : undefined,
      certifications: formData.certifications.length > 0 ? formData.certifications : undefined
    },
    socialNetworks: {
      // Convert socialLinks array to individual fields for backward compatibility
      linkedinUrl: formData.socialLinks.find(link => link.type === 'linkedin')?.url || undefined,
      twitterUrl: formData.socialLinks.find(link => link.type === 'twitter')?.url || undefined,
      personalWebsite: formData.socialLinks.find(link => link.type === 'website')?.url || undefined
    },
    notesAndTags: {
      priority: formData.priority,
      status: formData.status,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      notes: formData.notes || undefined
    },
    source: formData.source as any,
    verified: formData.verified
  }
}

export function ContactForm({ mode, contact, onSuccess, onCancel }: ContactFormProps) {
  // Store actions
  const { createContact, updateContact, isCreating, isUpdating, error, fieldErrors } = useContactStore()
  
  // Notifications
  const { success, error: notifyError } = useNotifications()
  
  // Form state
  const [formData, setFormData] = useState<FormData>(
    mode === 'edit' && contact ? contactToFormData(contact) : initialFormData
  )
  const [currentSection, setCurrentSection] = useState(0)
  const [newTag, setNewTag] = useState('')
  const [availableCertifications] = useState(() => getAllCertifications())
  const [stagedImage, setStagedImage] = useState<StagedImage | null>(null)

  // Clean up staged image on unmount
  React.useEffect(() => {
    return () => {
      cleanupStagedImage(stagedImage)
    }
  }, [])

  // Form sections
  const sections = [
    { 
      id: 'basic', 
      title: 'Basic Information', 
      icon: User,
      description: 'Name, contact details, and position'
    },
    { 
      id: 'organization', 
      title: 'Organization', 
      icon: Building,
      description: 'Agency, office, and organizational details'
    },
    { 
      id: 'address', 
      title: 'Address', 
      icon: MapPin,
      description: 'Physical location and mailing address'
    },
    { 
      id: 'professional', 
      title: 'Professional Info', 
      icon: Briefcase,
      description: 'Role, authority, and importance level'
    },
    { 
      id: 'preferences', 
      title: 'Contact Preferences', 
      icon: Phone,
      description: 'Communication preferences and timing'
    },
    { 
      id: 'background', 
      title: 'Background', 
      icon: Star,
      description: 'Education, experience, and expertise'
    },
    { 
      id: 'social', 
      title: 'Social Networks', 
      icon: Globe,
      description: 'LinkedIn, websites, and social presence'
    },
    { 
      id: 'notes', 
      title: 'Notes & Tags', 
      icon: Calendar,
      description: 'Additional notes and categorization'
    }
  ]

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Process staged image if present
      let profilePhotoUrl = formData.profilePhoto
      if (stagedImage) {
        try {
          profilePhotoUrl = await processContactImageChanges(stagedImage, formData.profilePhoto) || undefined
          // Update formData with the new image URL
          setFormData(prev => ({ ...prev, profilePhoto: profilePhotoUrl }))
        } catch (imageError) {
          console.error('Image upload failed:', imageError)
          notifyError('Image Upload Failed', imageError instanceof Error ? imageError.message : 'Failed to upload image')
          return // Stop form submission if image upload fails
        }
      }

      // Prepare API data with the updated image URL
      const apiData = formDataToApiFormat({ ...formData, profilePhoto: profilePhotoUrl })
      console.log('ContactForm handleSubmit - formData:', formData)
      console.log('ContactForm handleSubmit - apiData:', apiData)
      let result: Contact | null = null

      if (mode === 'create') {
        result = await createContact(apiData as CreateContactData)
        if (result) {
          // Clean up staged image after successful save
          cleanupStagedImage(stagedImage)
          setStagedImage(null)
          success('Contact Created', `Successfully created contact for ${result.firstName} ${result.lastName}`)
        }
      } else if (mode === 'edit' && contact) {
        result = await updateContact(contact.id, apiData as UpdateContactData)
        if (result) {
          // Clean up staged image after successful save
          cleanupStagedImage(stagedImage)
          setStagedImage(null)
          success('Contact Updated', `Successfully updated contact for ${result.firstName} ${result.lastName}`)
        }
      }

      if (result && onSuccess) {
        onSuccess(result)
      }
    } catch (error) {
      console.error('Form submission error:', error)
      // Show error notification
      const errorMessage = error instanceof Error ? error.message : 'Failed to save contact'
      notifyError('Error', errorMessage)
      // Error is already handled in the store and displayed via error state
      // The form will remain open so the user can see the error and try again
    }
  }

  // Handle array field operations
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      })
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    })
  }


  // Handle agency selection
  const handleAgencyChange = (agencyCode: string) => {
    const agency = getAgencyByCode(agencyCode)
    if (agency) {
      setFormData({
        ...formData,
        agencyCode: agency.code,
        agency: agency.name,
        agencyAbbreviation: agency.abbreviation || '',
        website: agency.website || formData.website
      })
    } else {
      setFormData({
        ...formData,
        agencyCode: '',
        agency: '',
        agencyAbbreviation: '',
        website: formData.website
      })
    }
  }

  // Handle location changes
  const handleLocationChange = (location: { state?: string; city?: string; zipCode?: string }) => {
    setFormData({
      ...formData,
      state: location.state || '',
      city: location.city || '',
      zipCode: location.zipCode || ''
    })
  }

  // Handle PSC code changes
  const handlePSCChange = (pscCodes: string | string[]) => {
    const codes = Array.isArray(pscCodes) ? pscCodes : (pscCodes ? [pscCodes] : [])
    setFormData({
      ...formData,
      expertise: codes
    })
  }

  // Handle certification changes
  const addCertification = (certificationId: string) => {
    const cert = availableCertifications.find(c => c.id === certificationId)
    if (cert && !formData.certifications.includes(cert.name)) {
      setFormData({
        ...formData,
        certifications: [...formData.certifications, cert.name]
      })
    }
  }

  const removeCertificationById = (certificationName: string) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter(cert => cert !== certificationName)
    })
  }

  // Handle social media link operations
  const addSocialLink = () => {
    const newLink: SocialLink = {
      id: Date.now().toString(),
      type: 'website',
      url: '',
      label: 'Website'
    }
    setFormData({
      ...formData,
      socialLinks: [...formData.socialLinks, newLink]
    })
  }

  const updateSocialLink = (id: string, field: keyof SocialLink, value: string) => {
    setFormData({
      ...formData,
      socialLinks: formData.socialLinks.map(link =>
        link.id === id ? { ...link, [field]: value } : link
      )
    })
  }

  const removeSocialLink = (id: string) => {
    setFormData({
      ...formData,
      socialLinks: formData.socialLinks.filter(link => link.id !== id)
    })
  }

  const isLoading = isCreating || isUpdating

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {mode === 'create' ? 'Add New Contact' : 'Edit Contact'}
        </h2>
        <p className="text-muted-foreground">
          {mode === 'create' 
            ? 'Create a new government contracting contact with comprehensive details.'
            : 'Update contact information and relationship details.'
          }
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section, index) => {
          const Icon = section.icon
          return (
            <Button
              key={section.id}
              variant={currentSection === index ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentSection(index)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {section.title}
            </Button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {React.createElement(sections[currentSection].icon, { className: "h-5 w-5" })}
              <CardTitle>{sections[currentSection].title}</CardTitle>
            </div>
            <CardDescription>
              {sections[currentSection].description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Basic Information Section */}
            {currentSection === 0 && (
              <div className="grid gap-4">
                {/* Profile Image Upload */}
                <div className="flex justify-center mb-6">
                  <ContactImageUpload
                    value={formData.profilePhoto}
                    onChange={setStagedImage}
                    stagedImage={stagedImage}
                    contactName={`${formData.firstName} ${formData.lastName}`.trim() || 'Contact'}
                    size="lg"
                    disabled={isLoading}
                    isLoading={isLoading}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      className={fieldErrors.firstName ? 'border-red-500' : ''}
                    />
                    {fieldErrors.firstName && (
                      <p className="text-sm text-red-600">{fieldErrors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                      className={fieldErrors.lastName ? 'border-red-500' : ''}
                    />
                    {fieldErrors.lastName && (
                      <p className="text-sm text-red-600">{fieldErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Contracting Officer, Program Manager"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Primary Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={fieldErrors.email ? 'border-red-500' : ''}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-red-600">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <PhoneNumberInput
                      label="Primary Phone"
                      value={formData.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                      placeholder="Enter primary phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alternateEmail">Alternate Email</Label>
                    <Input
                      id="alternateEmail"
                      type="email"
                      value={formData.alternateEmail}
                      onChange={(e) => setFormData({ ...formData, alternateEmail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <PhoneNumberInput
                      label="Alternate Phone"
                      value={formData.alternatePhone}
                      onChange={(value) => setFormData({ ...formData, alternatePhone: value || '' })}
                      placeholder="Enter alternate phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">Contact Source</Label>
                    <Select
                      value={formData.source}
                      onValueChange={(value) => setFormData({ ...formData, source: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ContactSource).map(([key, value]) => (
                          <SelectItem key={value} value={value}>
                            {key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="verified">Verified Contact</Label>
                    <Switch
                      id="verified"
                      checked={formData.verified}
                      onCheckedChange={(checked) => setFormData({ ...formData, verified: checked })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Organization Section */}
            {currentSection === 1 && (
              <div className="grid gap-4">
                <div className="space-y-2">
                  <AgencyLabelWithInfo selectedValue={formData.agencyCode}>
                    Agency/Department *
                  </AgencyLabelWithInfo>
                  <AgencySelector
                    value={formData.agencyCode}
                    onChange={handleAgencyChange}
                    placeholder="Select government agency"
                    onlyContractingAgencies={true}
                    showBusinessAreas={true}
                  />
                  {fieldErrors?.agency && (
                    <p className="text-sm text-destructive">{fieldErrors.agency}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agencyAbbreviation">Agency Abbreviation</Label>
                    <Input
                      id="agencyAbbreviation"
                      value={formData.agencyAbbreviation}
                      placeholder="Auto-populated from agency"
                      disabled={true}
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agencyCode">Agency Code</Label>
                    <Input
                      id="agencyCode"
                      value={formData.agencyCode}
                      onChange={(e) => setFormData({ ...formData, agencyCode: e.target.value })}
                      placeholder="e.g., DOD, GSA"
                      disabled={true}
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agency">Agency Name</Label>
                    <Input
                      id="agency"
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      placeholder="Selected agency will appear here"
                      disabled={true}
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="office">Office/Bureau</Label>
                    <Input
                      id="office"
                      value={formData.office}
                      onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                      placeholder="e.g., Office of the Secretary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="division">Division/Branch</Label>
                    <Input
                      id="division"
                      value={formData.division}
                      onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                      placeholder="e.g., Acquisition Division"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Agency Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://agency.gov"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Address Section */}
            {currentSection === 2 && (
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input
                    id="addressLine1"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    placeholder="Street address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>State → City → ZIP Code</Label>
                    <SeparateLocationSelector
                      value={{
                        state: formData.state,
                        city: formData.city,
                        zipCode: formData.zipCode
                      }}
                      onChange={handleLocationChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Professional Info Section */}
            {currentSection === 3 && (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Professional Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="importance">Importance Level</Label>
                    <Select
                      value={formData.importance}
                      onValueChange={(value) => setFormData({ ...formData, importance: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_IMPORTANCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="influenceLevel">Influence Level: {formData.influenceLevel}%</Label>
                    <Slider
                      id="influenceLevel"
                      min={0}
                      max={100}
                      step={5}
                      value={[formData.influenceLevel]}
                      onValueChange={(value) => setFormData({ ...formData, influenceLevel: value[0] })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low (0%)</span>
                      <span>Medium (50%)</span>
                      <span>High (100%)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="yearsInRole">Years in Current Role</Label>
                    <Select
                      value={formData.yearsInRole}
                      onValueChange={(value) => setFormData({ ...formData, yearsInRole: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select years in role" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS_IN_ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="securityClearance">Security Clearance</Label>
                  <SecurityClearanceSelector
                    value={formData.securityClearance as SecurityClearanceLevel}
                    onChange={(clearance) => setFormData({ ...formData, securityClearance: clearance as string })}
                    multiple={false}
                    placeholder="Select clearance level"
                    className="w-full"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="decisionMaker">Decision Maker</Label>
                    <Switch
                      id="decisionMaker"
                      checked={formData.decisionMaker}
                      onCheckedChange={(checked) => setFormData({ ...formData, decisionMaker: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="contractAuthority">Contract Authority</Label>
                    <Switch
                      id="contractAuthority"
                      checked={formData.contractAuthority}
                      onCheckedChange={(checked) => setFormData({ ...formData, contractAuthority: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="budgetAuthority">Budget Authority</Label>
                    <Switch
                      id="budgetAuthority"
                      checked={formData.budgetAuthority}
                      onCheckedChange={(checked) => setFormData({ ...formData, budgetAuthority: checked })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Contact Preferences Section */}
            {currentSection === 4 && (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferredContact">Preferred Contact Method</Label>
                    <Select
                      value={formData.preferredContact}
                      onValueChange={(value) => setFormData({ ...formData, preferredContact: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFERRED_CONTACT_METHOD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.icon} {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeZone">Time Zone</Label>
                    <TimezoneSelect
                      value={formData.timeZone}
                      onChange={(value) => setFormData({ ...formData, timeZone: value })}
                      placeholder="Select time zone..."
                      filterType="government"
                      showCurrentTime={true}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bestTimeToContact">Best Time to Contact</Label>
                    <Select
                      value={formData.bestTimeToContact}
                      onValueChange={(value) => setFormData({ ...formData, bestTimeToContact: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EARLY_MORNING">Early Morning (8-10 AM)</SelectItem>
                        <SelectItem value="BUSINESS_HOURS">Business Hours (10 AM-4 PM)</SelectItem>
                        <SelectItem value="LATE_AFTERNOON">Late Afternoon (4-6 PM)</SelectItem>
                        <SelectItem value="ANYTIME">Anytime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="communicationFrequency">Communication Frequency</Label>
                    <Select
                      value={formData.communicationFrequency}
                      onValueChange={(value) => setFormData({ ...formData, communicationFrequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMUNICATION_FREQUENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Background Section */}
            {currentSection === 5 && (
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="education">Education Background</Label>
                  <Textarea
                    id="education"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    placeholder="Degrees, institutions, relevant education..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="previousRoles">Previous Roles</Label>
                  <Textarea
                    id="previousRoles"
                    value={formData.previousRoles}
                    onChange={(e) => setFormData({ ...formData, previousRoles: e.target.value })}
                    placeholder="Previous positions and responsibilities..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <PSCLabelWithInfo selectedValue={formData.expertise[0]}>
                    Areas of Expertise
                  </PSCLabelWithInfo>
                  <PSCSelector
                    value={formData.expertise}
                    onChange={handlePSCChange}
                    placeholder="Select PSC codes for areas of expertise"
                    multiple={true}
                  />
                  {fieldErrors?.expertise && (
                    <p className="text-sm text-destructive">{fieldErrors.expertise}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Professional Certifications</Label>
                  <Select
                    onValueChange={addCertification}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select certification to add" />
                    </SelectTrigger>
                    <SelectContent className="max-h-96">
                      {availableCertifications
                        .filter(cert => !formData.certifications.includes(cert.name))
                        .map((cert) => (
                          <SelectItem key={cert.id} value={cert.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{cert.name}</span>
                              <span className="text-xs text-muted-foreground">{cert.category}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.certifications.map((cert, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeCertificationById(cert)}>
                        {cert} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Social Networks Section */}
            {currentSection === 6 && (
              <div className="grid gap-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Social Media & Professional Networks</Label>
                    <Button type="button" onClick={addSocialLink} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </div>

                  {formData.socialLinks.length === 0 && (
                    <div className="text-center p-6 border border-dashed rounded-lg">
                      <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No social media links added yet.</p>
                      <p className="text-xs text-muted-foreground">Click "Add Link" to get started.</p>
                    </div>
                  )}

                  {formData.socialLinks.map((link) => (
                    <div key={link.id} className="flex gap-2 p-4 border rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                        <div className="space-y-1">
                          <Label className="text-xs">Platform</Label>
                          <Select
                            value={link.type}
                            onValueChange={(value) => updateSocialLink(link.id, 'type', value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="website">Website</SelectItem>
                              <SelectItem value="linkedin">LinkedIn</SelectItem>
                              <SelectItem value="twitter">Twitter/X</SelectItem>
                              <SelectItem value="facebook">Facebook</SelectItem>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="github">GitHub</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                              <SelectItem value="blog">Blog</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input
                            className="h-8"
                            value={link.label}
                            onChange={(e) => updateSocialLink(link.id, 'label', e.target.value)}
                            placeholder="e.g., Company LinkedIn"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">URL</Label>
                          <Input
                            className="h-8"
                            type="url"
                            value={link.url}
                            onChange={(e) => updateSocialLink(link.id, 'url', e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 self-end"
                        onClick={() => removeSocialLink(link.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes & Tags Section */}
            {currentSection === 7 && (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Contact Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="WARM">Warm</SelectItem>
                        <SelectItem value="COLD">Cold</SelectItem>
                        <SelectItem value="DO_NOT_CONTACT">Do Not Contact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional information about this contact..."
                    rows={4}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-between pt-6">
          <div className="flex gap-2">
            {currentSection > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentSection(currentSection - 1)}
              >
                Previous
              </Button>
            )}
            {currentSection < sections.length - 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentSection(currentSection + 1)}
              >
                Next
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Create Contact' : 'Update Contact'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}