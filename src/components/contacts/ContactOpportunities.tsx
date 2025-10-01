'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { OpportunitySearch } from '@/components/ui/opportunity-search'
import { useContactStore } from '@/stores/contacts-store'
import { 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink,
  Building,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { format } from 'date-fns'

interface ContactOpportunitiesProps {
  contactId: string
}

interface OpportunityFormData {
  opportunityId: string
  relationship: string
  isPrimary: boolean
  notes: string
  confidence: number
}

interface SelectedOpportunity {
  id: string
  solicitationNumber: string
  title: string
  agency?: import('@/types').AgencyInfo | string
  description?: string
  estimatedValue?: number
  responseDeadline?: string | Date
  location?: string
  naicsCodes?: string[]
  status?: string
}

const relationshipOptions = [
  { value: 'POINT_OF_CONTACT', label: 'Point of Contact' },
  { value: 'CONTRACTING_OFFICER', label: 'Contracting Officer' },
  { value: 'PROGRAM_MANAGER', label: 'Program Manager' },
  { value: 'TECHNICAL_LEAD', label: 'Technical Lead' }
]

// Helper function to get relationship badge variant
function getRelationshipBadgeVariant(relationship: string) {
  switch (relationship) {
    case 'CONTRACTING_OFFICER': return 'destructive'
    case 'PROGRAM_MANAGER': return 'default'
    case 'TECHNICAL_LEAD': return 'secondary'
    case 'POINT_OF_CONTACT': 
    default: return 'outline'
  }
}

// Helper function to format relationship text
function formatRelationship(relationship: string): string {
  return relationship.split('_').map(word => 
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ')
}

// Helper function to format currency
function formatCurrency(amount?: number): string {
  if (!amount) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function ContactOpportunities({ contactId }: ContactOpportunitiesProps) {
  // Store state
  const { 
    contactOpportunities,
    error,
    loadContactOpportunities,
    linkContactToOpportunity,
    updateContactOpportunity,
    unlinkContactFromOpportunity
  } = useContactStore()

  // Local state
  const [isLoading, setIsLoading] = useState(true)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [editingOpportunity, setEditingOpportunity] = useState<any>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<SelectedOpportunity | null>(null)
  const [formData, setFormData] = useState<OpportunityFormData>({
    opportunityId: '',
    relationship: 'POINT_OF_CONTACT',
    isPrimary: false,
    notes: '',
    confidence: 0.8
  })

  // Get opportunities for this contact
  const opportunities = contactOpportunities.get(contactId) || []

  // Load contact opportunities on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await loadContactOpportunities(contactId)
      setIsLoading(false)
    }
    loadData()
  }, [contactId, loadContactOpportunities])

  // Handle opportunity selection from search
  const handleOpportunitySelect = (opportunity: SelectedOpportunity | null) => {
    setSelectedOpportunity(opportunity)
    if (opportunity) {
      setFormData(prev => ({
        ...prev,
        opportunityId: opportunity.id
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        opportunityId: ''
      }))
    }
  }

  // Reset form state
  const resetForm = () => {
    setSelectedOpportunity(null)
    setFormData({
      opportunityId: '',
      relationship: 'POINT_OF_CONTACT',
      isPrimary: false,
      notes: '',
      confidence: 0.8
    })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate opportunity selection
    if (!formData.opportunityId || !selectedOpportunity) {
      alert('Please select an opportunity')
      return
    }
    
    // Validate solicitation number
    if (!selectedOpportunity.solicitationNumber) {
      alert('Selected opportunity is missing solicitation number')
      return
    }
    
    if (editingOpportunity) {
      // Update existing relationship
      const updateData = {
        relationship: formData.relationship,
        isPrimary: formData.isPrimary,
        notes: formData.notes,
        confidence: formData.confidence
      }
      
      // If opportunity was changed, include the new opportunity data
      if (selectedOpportunity && selectedOpportunity.id !== editingOpportunity.opportunityId) {
        Object.assign(updateData, {
          opportunityId: selectedOpportunity.id,
          solicitationNumber: selectedOpportunity.solicitationNumber,
          opportunityTitle: selectedOpportunity.title,
          opportunityAgency: typeof selectedOpportunity.agency === 'string' 
            ? selectedOpportunity.agency 
            : selectedOpportunity.agency?.name || selectedOpportunity.agency?.abbreviation,
          opportunityStatus: selectedOpportunity.status || 'ACTIVE',
          estimatedValue: selectedOpportunity.estimatedValue,
          responseDeadline: selectedOpportunity.responseDeadline 
            ? new Date(selectedOpportunity.responseDeadline).toISOString() 
            : undefined
        })
      }
      
      const success = await updateContactOpportunity(
        contactId,
        editingOpportunity.opportunityId,
        updateData
      )
      
      if (success) {
        setEditingOpportunity(null)
        resetForm()
      }
    } else {
      // Create new relationship
      const contactOpportunityData = {
        ...formData,
        solicitationNumber: selectedOpportunity?.solicitationNumber || '',
        opportunityTitle: selectedOpportunity?.title,
        opportunityAgency: typeof selectedOpportunity?.agency === 'string' 
          ? selectedOpportunity.agency 
          : selectedOpportunity?.agency?.name || selectedOpportunity?.agency?.abbreviation,
        opportunityStatus: selectedOpportunity?.status || 'ACTIVE',
        estimatedValue: selectedOpportunity?.estimatedValue,
        responseDeadline: selectedOpportunity?.responseDeadline 
          ? new Date(selectedOpportunity.responseDeadline).toISOString() 
          : undefined
      }
      
      console.log('🔍 Submitting contact opportunity data:', contactOpportunityData)
      
      const success = await linkContactToOpportunity(contactId, contactOpportunityData)
      
      if (success) {
        setShowLinkDialog(false)
        resetForm()
      }
    }
  }

  // Handle edit opportunity
  const handleEditOpportunity = (opportunity: any) => {
    setFormData({
      opportunityId: opportunity.opportunityId,
      relationship: opportunity.relationship,
      isPrimary: opportunity.isPrimary,
      notes: opportunity.notes || '',
      confidence: opportunity.confidence || 0.8
    })
    
    // Set the selected opportunity for the search component
    setSelectedOpportunity({
      id: opportunity.opportunityId,
      solicitationNumber: opportunity.solicitationNumber || '',
      title: opportunity.opportunityTitle || 'Unknown Title',
      agency: opportunity.opportunityAgency || 'Unknown Agency',
      description: opportunity.description,
      estimatedValue: opportunity.estimatedValue,
      responseDeadline: opportunity.responseDeadline,
      location: opportunity.location,
      naicsCodes: opportunity.naicsCodes,
      status: opportunity.opportunityStatus
    })
    
    setEditingOpportunity(opportunity)
  }

  // Handle unlink opportunity
  const handleUnlinkOpportunity = async (opportunityId: string) => {
    console.log('🔍 Frontend Debug - Unlinking opportunity:', {
      contactId,
      opportunityId,
      typeof: typeof opportunityId
    })
    
    if (confirm('Are you sure you want to remove this opportunity relationship?')) {
      await unlinkContactFromOpportunity(contactId, opportunityId)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Linked Opportunities ({opportunities.length})
            </CardTitle>
            <CardDescription>
              Government contracting opportunities this contact is associated with
            </CardDescription>
          </div>
          <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Link Opportunity
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Link Contact to Opportunity</DialogTitle>
                <DialogDescription>
                  Associate this contact with a government contracting opportunity.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <OpportunitySearch
                    label="Select Opportunity"
                    value={selectedOpportunity}
                    onSelect={handleOpportunitySelect}
                    placeholder="Search by Solicitation ID or title..."
                    showDetails={true}
                    searchByTitle={true}
                    allowClear={true}
                  />
                  
                  <div className="grid gap-2">
                    <Label htmlFor="relationship">Relationship Type</Label>
                    <Select
                      value={formData.relationship}
                      onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {relationshipOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isPrimary">Primary Contact</Label>
                    <Switch
                      id="isPrimary"
                      checked={formData.isPrimary}
                      onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="confidence">Confidence Level</Label>
                    <Input
                      id="confidence"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.confidence}
                      onChange={(e) => setFormData({ ...formData, confidence: parseFloat(e.target.value) })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes about this relationship"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowLinkDialog(false)
                    resetForm()
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!selectedOpportunity}>
                    Link Opportunity
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No opportunities linked</h3>
            <p className="text-muted-foreground mb-4">
              This contact is not yet associated with any opportunities.
            </p>
            <Button onClick={() => setShowLinkDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Link First Opportunity
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opportunity) => (
                <TableRow key={opportunity.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{opportunity.opportunityTitle || 'Unknown Title'}</div>
                      {opportunity.solicitationNumber && (
                        <div className="text-sm text-muted-foreground">
                          {opportunity.solicitationNumber}
                        </div>
                      )}
                      {opportunity.opportunityAgency && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {opportunity.opportunityAgency}
                        </div>
                      )}
                      {opportunity.sourceSystem && (
                        <div className="text-xs text-muted-foreground">
                          Source: {opportunity.sourceSystem}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRelationshipBadgeVariant(opportunity.relationship)}>
                        {formatRelationship(opportunity.relationship)}
                      </Badge>
                      {opportunity.isPrimary && (
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                          Primary
                        </Badge>
                      )}
                    </div>
                    {opportunity.confidence && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Confidence: {Math.round(opportunity.confidence * 100)}%
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {opportunity.opportunityStatus ? (
                      <Badge variant="outline">
                        {opportunity.opportunityStatus}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(opportunity.estimatedValue ? Number(opportunity.estimatedValue) : undefined)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {opportunity.responseDeadline ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(opportunity.responseDeadline), 'MMM d, yyyy')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No deadline</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditOpportunity(opportunity)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkOpportunity(opportunity.opportunityId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
      {editingOpportunity && (
        <Dialog open={!!editingOpportunity} onOpenChange={() => setEditingOpportunity(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Opportunity Relationship</DialogTitle>
              <DialogDescription>
                Update the relationship between this contact and the opportunity.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <OpportunitySearch
                  label="Change Opportunity (Optional)"
                  value={selectedOpportunity}
                  onSelect={handleOpportunitySelect}
                  placeholder="Search for a different opportunity..."
                  showDetails={true}
                  searchByTitle={true}
                  allowClear={true}
                />
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-relationship">Relationship Type</Label>
                  <Select
                    value={formData.relationship}
                    onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-isPrimary">Primary Contact</Label>
                  <Switch
                    id="edit-isPrimary"
                    checked={formData.isPrimary}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-confidence">Confidence Level</Label>
                  <Input
                    id="edit-confidence"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.confidence}
                    onChange={(e) => setFormData({ ...formData, confidence: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    placeholder="Additional notes about this relationship"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setEditingOpportunity(null)
                  resetForm()
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Relationship
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}