/**
 * Certifications Management Page
 * 
 * Complete page component that combines the certifications table and modal
 * for managing user certifications. Provides a unified interface for
 * viewing, adding, editing, and managing certifications.
 */

"use client"

import { useState } from 'react'
import { Shield, Plus, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

import CertificationsTable from './certifications-table'
import CertificationModal from './certification-modal'
import { useCertifications } from '@/hooks/use-certifications'

// =============================================
// INTERFACES
// =============================================

interface CertificationsPageProps {
  className?: string
}

interface ModalState {
  isOpen: boolean
  mode: 'create' | 'edit' | 'view'
  certificationId?: string
}

// =============================================
// MAIN PAGE COMPONENT
// =============================================

export default function CertificationsPage({ className }: CertificationsPageProps) {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  })

  const {
    stats,
    hasExpiringSoon,
    hasExpired,
    getRecommendations,
    isLoading,
  } = useCertifications()

  const recommendations = getRecommendations()

  // Modal handlers
  const handleCreateCertification = () => {
    setModalState({
      isOpen: true,
      mode: 'create',
    })
  }

  const handleEditCertification = (certificationId: string) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      certificationId,
    })
  }

  const handleViewCertification = (certificationId: string) => {
    setModalState({
      isOpen: true,
      mode: 'view',
      certificationId,
    })
  }

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      mode: 'create',
    })
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Certifications
          </h1>
          <p className="text-muted-foreground">
            Manage your government certifications to improve opportunity matching and profile completeness.
          </p>
        </div>
        <Button 
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleCreateCertification()
          }} 
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Certification
        </Button>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certifications</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verified}</div>
            <p className="text-xs text-muted-foreground">
              Document verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completeness</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.completenessScore)}%</div>
            <Progress value={stats.completenessScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Profile strength
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {hasExpired && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {stats.expired} expired certification{stats.expired === 1 ? '' : 's'}. 
            Update or renew them to maintain accurate opportunity matching.
          </AlertDescription>
        </Alert>
      )}

      {hasExpiringSoon && !hasExpired && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {stats.expiringSoon} certification{stats.expiringSoon === 1 ? '' : 's'} expiring soon. 
            Set up reminders to renew before expiration.
          </AlertDescription>
        </Alert>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommended Certifications</CardTitle>
            <CardDescription>
              Based on your profile and industry trends, consider pursuing these certifications:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">{rec.certification.fullName}</h4>
                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Issued by: {rec.certification.issuingAgency}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Pre-fill modal with this certification
                      setModalState({
                        isOpen: true,
                        mode: 'create',
                      })
                      // TODO: Pass certification ID to pre-select in modal
                    }}
                  >
                    Add This
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Table */}
      <CertificationsTable
        onCreateCertification={handleCreateCertification}
        onEditCertification={handleEditCertification}
        onViewCertification={handleViewCertification}
      />

      {/* Modal */}
      <CertificationModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        mode={modalState.mode}
        certificationId={modalState.certificationId}
      />
    </div>
  )
}