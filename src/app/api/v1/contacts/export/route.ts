/**
 * @swagger
 * /api/v1/contacts/export:
 *   get:
 *     summary: Export contacts to CSV
 *     description: Export contacts data to CSV format with optional filtering
 *     tags: [Contacts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: contactIds
 *         schema:
 *           type: string
 *         description: Comma-separated list of contact IDs to export (optional)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, xlsx]
 *           default: csv
 *         description: Export format
 *       - in: query
 *         name: includeDetails
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include detailed JSON fields in export
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'

// Helper function to escape CSV fields
function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return ''
  
  const str = String(field)
  // If field contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Helper function to flatten JSON for CSV export
function flattenContactForCsv(contact: any, includeDetails: boolean) {
  const base = {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email || '',
    phone: contact.phone || '',
    title: contact.title || '',
    alternateEmail: contact.alternateEmail || '',
    alternatePhone: contact.alternatePhone || '',
    source: contact.source,
    verified: contact.verified,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt
  }

  if (includeDetails) {
    // Extract key fields from JSON data
    const org = contact.organizationInfo || {}
    const addr = contact.addressInfo || {}
    const prof = contact.professionalInfo || {}
    const prefs = contact.contactPreferences || {}
    const notes = contact.notesAndTags || {}
    const activity = contact.activityTracking || {}

    return {
      ...base,
      // Organization info
      agency: org.agency || '',
      agencyCode: org.agencyCode || '',
      office: org.office || '',
      division: org.division || '',
      website: org.website || '',
      
      // Address info
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      zipCode: addr.zipCode || '',
      country: addr.country || '',
      
      // Professional info
      role: prof.role || '',
      importance: prof.importance || '',
      decisionMaker: prof.decisionMaker || false,
      influenceLevel: prof.influenceLevel || '',
      contractAuthority: prof.contractAuthority || false,
      budgetAuthority: prof.budgetAuthority || false,
      
      // Contact preferences
      preferredContact: prefs.preferredContact || '',
      timeZone: prefs.timeZone || '',
      bestTimeToContact: prefs.bestTimeToContact || '',
      
      // Notes and status
      priority: notes.priority || '',
      status: notes.status || '',
      tags: Array.isArray(notes.tags) ? notes.tags.join('; ') : '',
      notes: notes.notes || '',
      
      // Activity tracking
      lastContactedAt: activity.lastContactedAt || '',
      lastContactedBy: activity.lastContactedBy || '',
      responseRate: activity.responseRate || '',
      totalInteractions: activity.totalInteractions || 0,
      
      // Creator info
      createdByName: contact.createdBy 
        ? `${contact.createdBy.firstName} ${contact.createdBy.lastName}`
        : '',
      updatedByName: contact.updatedBy 
        ? `${contact.updatedBy.firstName} ${contact.updatedBy.lastName}`
        : ''
    }
  }

  return {
    ...base,
    // Basic derived fields
    agency: contact.organizationInfo?.agency || '',
    role: contact.professionalInfo?.role || '',
    importance: contact.professionalInfo?.importance || '',
    status: contact.notesAndTags?.status || '',
    lastContactedAt: contact.activityTracking?.lastContactedAt || '',
    createdByName: contact.createdBy 
      ? `${contact.createdBy.firstName} ${contact.createdBy.lastName}`
      : ''
  }
}

// GET /api/v1/contacts/export - Export contacts to CSV
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResponse = await rateLimit(request, 'contacts:export', 3, 300000) // 3 per 5 minutes
    if (rateLimitResponse) return rateLimitResponse

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const contactIdsParam = searchParams.get('contactIds')
    const format = searchParams.get('format') || 'csv'
    const includeDetails = searchParams.get('includeDetails') === 'true'
    
    // Build where clause
    const where: any = {
      organizationId: user.organizationId,
      deletedAt: null
    }

    // Filter by specific contact IDs if provided
    if (contactIdsParam) {
      const contactIds = contactIdsParam.split(',').filter(Boolean)
      where.id = { in: contactIds }
    }

    // Fetch contacts
    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { lastName: 'asc' },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        updatedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (contacts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No contacts found to export'
      }, { status: 404 })
    }

    // Generate CSV content
    const flattenedContacts = contacts.map(contact => 
      flattenContactForCsv(contact, includeDetails)
    )

    // Generate CSV headers from first contact
    const headers = Object.keys(flattenedContacts[0])
    const csvHeaders = headers.join(',')

    // Generate CSV rows
    const csvRows = flattenedContacts.map(contact => 
      headers.map(header => escapeCsvField(contact[header as keyof typeof contact])).join(',')
    )

    const csvContent = [csvHeaders, ...csvRows].join('\n')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = contactIdsParam 
      ? `contacts-selected-${timestamp}.csv`
      : `contacts-export-${timestamp}.csv`

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Error exporting contacts:', error)
    return handleApiError(error)
  }
}