/**
 * Certifications Table Component
 * 
 * Table component for listing all user certifications with activation switches,
 * status indicators, and quick actions. Follows the same pattern as other
 * table components in the application.
 */

"use client"

import { useState, useMemo } from 'react'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  Search,
  Filter,
  Download,
  Plus
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { useCertifications } from '@/hooks/use-certifications'
import {
  type UserCertification,
  type CertificationStatus,
  getCertificationStatusColor,
  formatCertificationName,
  isExpiringSoon,
  isExpired,
} from '@/types/certifications'
import { cn } from '@/lib/utils'

// =============================================
// INTERFACES
// =============================================

interface CertificationsTableProps {
  onCreateCertification?: () => void
  onEditCertification?: (certificationId: string) => void
  onViewCertification?: (certificationId: string) => void
  className?: string
}

interface TableFilters {
  search: string
  status: CertificationStatus | 'all'
  showOnlyActive: boolean
  showExpiringSoon: boolean
}

// =============================================
// MAIN TABLE COMPONENT
// =============================================

export default function CertificationsTable({
  onCreateCertification,
  onEditCertification,
  onViewCertification,
  className
}: CertificationsTableProps) {
  const [filters, setFilters] = useState<TableFilters>({
    search: '',
    status: 'all',
    showOnlyActive: false,
    showExpiringSoon: false,
  })

  const {
    userCertifications,
    stats,
    toggleActivation,
    removeCertification,
    getGovCertification,
    isLoading,
  } = useCertifications()

  // Filter certifications based on current filters
  const filteredCertifications = useMemo(() => {
    let filtered = [...userCertifications]

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(cert => {
        const govCert = getGovCertification(cert.certificationId)
        return (
          cert.name?.toLowerCase().includes(searchTerm) ||
          govCert?.name.toLowerCase().includes(searchTerm) ||
          govCert?.fullName.toLowerCase().includes(searchTerm) ||
          cert.certificationNumber?.toLowerCase().includes(searchTerm) ||
          cert.notes?.toLowerCase().includes(searchTerm)
        )
      })
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(cert => cert.status === filters.status)
    }

    // Active only filter
    if (filters.showOnlyActive) {
      filtered = filtered.filter(cert => cert.isActivated)
    }

    // Expiring soon filter
    if (filters.showExpiringSoon) {
      filtered = filtered.filter(cert => 
        cert.expirationDate && isExpiringSoon(cert)
      )
    }

    return filtered
  }, [userCertifications, filters, getGovCertification])

  // Handle activation toggle
  const handleToggleActivation = async (certificationId: string, isActivated: boolean) => {
    try {
      await toggleActivation(certificationId, isActivated)
    } catch (error) {
      console.error('Failed to toggle certification activation:', error)
      // TODO: Show error toast
    }
  }

  // Handle certification deletion
  const handleDelete = async (certificationId: string) => {
    if (window.confirm('Are you sure you want to delete this certification?')) {
      try {
        await removeCertification(certificationId)
      } catch (error) {
        console.error('Failed to delete certification:', error)
        // TODO: Show error toast
      }
    }
  }

  // Get status icon and color
  const getStatusIndicator = (cert: UserCertification) => {
    if (cert.expirationDate && isExpired(cert)) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (cert.expirationDate && isExpiringSoon(cert)) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
    if (cert.status === 'active') {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (cert.status === 'pending') {
      return <Clock className="h-4 w-4 text-blue-500" />
    }
    return <XCircle className="h-4 w-4 text-gray-400" />
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading certifications...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Certifications ({stats.total})
          </CardTitle>
          {onCreateCertification && (
            <Button 
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCreateCertification()
              }} 
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Certification
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Active: {stats.active}</span>
          <span>Expiring Soon: {stats.expiringSoon}</span>
          <span>Expired: {stats.expired}</span>
          <span>Verified: {stats.verified}</span>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search certifications..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <Select 
            value={filters.status} 
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              status: value as CertificationStatus | 'all' 
            }))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Switch
              id="active-only"
              checked={filters.showOnlyActive}
              onCheckedChange={(checked) => setFilters(prev => ({ 
                ...prev, 
                showOnlyActive: checked 
              }))}
            />
            <label htmlFor="active-only" className="text-sm font-medium">
              Active Only
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="expiring-soon"
              checked={filters.showExpiringSoon}
              onCheckedChange={(checked) => setFilters(prev => ({ 
                ...prev, 
                showExpiringSoon: checked 
              }))}
            />
            <label htmlFor="expiring-soon" className="text-sm font-medium">
              Expiring Soon
            </label>
          </div>
        </div>

        {/* Alerts for important information */}
        {stats.expiringSoon > 0 && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {stats.expiringSoon} certification{stats.expiringSoon === 1 ? '' : 's'} expiring soon. 
              Consider renewing to maintain opportunity matching accuracy.
            </AlertDescription>
          </Alert>
        )}

        {/* Table */}
        {filteredCertifications.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {userCertifications.length === 0 ? 'No certifications added' : 'No certifications match your filters'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {userCertifications.length === 0 
                ? 'Add certifications to improve your opportunity matching and profile completeness.'
                : 'Try adjusting your filters or search terms.'
              }
            </p>
            {userCertifications.length === 0 && onCreateCertification && (
              <Button 
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onCreateCertification()
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Certification
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Obtained</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertifications.map((cert) => {
                  const govCert = getGovCertification(cert.certificationId)
                  const isExpiredCert = cert.expirationDate && isExpired(cert)
                  const isExpiringSoonCert = cert.expirationDate && !isExpiredCert && isExpiringSoon(cert)

                  return (
                    <TableRow key={cert.id} className={cn(
                      isExpiredCert && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30",
                      isExpiringSoonCert && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30"
                    )}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getStatusIndicator(cert)}
                            <span className="font-medium">
                              {cert.name ? formatCertificationName(cert.name) : (govCert ? formatCertificationName(govCert.name) : 'Unknown Certification')}
                            </span>
                          </div>
                          {govCert && (
                            <p className="text-sm text-muted-foreground">
                              {govCert.issuingAgency}
                            </p>
                          )}
                          {cert.certificationNumber && (
                            <p className="text-xs text-muted-foreground">
                              #{cert.certificationNumber}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={cn(
                            `bg-${getCertificationStatusColor(cert.status)}-50 text-${getCertificationStatusColor(cert.status)}-700 border-${getCertificationStatusColor(cert.status)}-200`
                          )}
                        >
                          {cert.status}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="text-sm">
                        {formatDate(cert.obtainedDate)}
                      </TableCell>
                      
                      <TableCell className="text-sm">
                        {cert.expirationDate ? (
                          <span className={cn(
                            isExpiredCert && "text-red-700 dark:text-red-300 font-medium",
                            isExpiringSoonCert && "text-amber-700 dark:text-amber-300 font-medium"
                          )}>
                            {formatDate(cert.expirationDate)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No expiration</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant={cert.verificationStatus === 'verified' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {cert.verificationStatus.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <Switch
                          checked={cert.isActivated}
                          onCheckedChange={(checked) => handleToggleActivation(cert.id!, checked)}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {onViewCertification && (
                              <DropdownMenuItem onClick={() => onViewCertification(cert.id!)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            )}
                            {onEditCertification && (
                              <DropdownMenuItem onClick={() => onEditCertification(cert.id!)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {cert.documentUrl && (
                              <DropdownMenuItem onClick={() => window.open(cert.documentUrl, '_blank')}>
                                <Download className="mr-2 h-4 w-4" />
                                View Document
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(cert.id!)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}