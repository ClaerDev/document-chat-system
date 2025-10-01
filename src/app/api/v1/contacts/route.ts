/**
 * @swagger
 * /api/v1/contacts:
 *   get:
 *     summary: Search and retrieve contacts
 *     description: Get a paginated list of contacts with advanced search and filtering capabilities
 *     tags: [Contacts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query across name, email, title, and agency
 *       - in: query
 *         name: firstName
 *         schema:
 *           type: string
 *         description: Filter by first name
 *       - in: query
 *         name: lastName
 *         schema:
 *           type: string
 *         description: Filter by last name
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email address
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by job title
 *       - in: query
 *         name: agency
 *         schema:
 *           type: string
 *         description: Filter by agency name
 *       - in: query
 *         name: role
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [CONTRACTING_OFFICER, PROGRAM_MANAGER, TECHNICAL_LEAD, OTHER]
 *         description: Filter by contact role
 *       - in: query
 *         name: importance
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         description: Filter by contact importance
 *       - in: query
 *         name: source
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [MANUAL, EXTRACTED, SAM_GOV, LINKEDIN, WEBSITE]
 *         description: Filter by contact source
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by tags
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [firstName, lastName, title, agency, lastContactedAt, createdAt, updatedAt]
 *           default: lastName
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of contacts per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of contacts to skip
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Paginated list of contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 *       400:
 *         description: Invalid search parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create a new contact
 *     description: Create a new contact in the CRM system
 *     tags: [Contacts]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateContact'
 *     responses:
 *       201:
 *         description: Contact created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 *                 message:
 *                   type: string
 *                   example: Contact created successfully
 *       400:
 *         description: Invalid contact data
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Contact already exists
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'
import { ContactSearchSchema, CreateContactSchema, type ContactSearchData } from '@/types/contacts'
import { z } from 'zod'

// GET /api/v1/contacts - Search and retrieve contacts
export async function GET(request: NextRequest) {
  try {
    const authResult = await auth()
    const userId = authResult?.userId
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 100, windowMs: 60000 }, 'contacts:read')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: rateLimitResult.error || 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        },
        { status: 429 }
      )
    }

    // Parse and validate search parameters
    const searchParams = request.nextUrl.searchParams
    const params: Record<string, any> = {}
    
    // Extract and parse parameters
    for (const [key, value] of searchParams.entries()) {
      if (value) {
        // Handle array parameters
        if (['role', 'importance', 'source', 'tags', 'status', 'priority', 'state', 'city'].includes(key)) {
          params[key] = value.split(',').filter(Boolean)
        } 
        // Handle boolean parameters
        else if (['verified', 'hasPhone', 'hasEmail', 'hasLinkedIn'].includes(key)) {
          params[key] = value === 'true'
        }
        // Handle numeric parameters
        else if (['limit', 'offset', 'page'].includes(key)) {
          params[key] = parseInt(value, 10)
        }
        // Handle date parameters
        else if (key.includes('After') || key.includes('Before') || key.includes('At')) {
          params[key] = value
        }
        // Handle nested objects
        else if (key === 'engagementScore') {
          try {
            params[key] = JSON.parse(value)
          } catch {
            // Ignore invalid JSON
          }
        }
        // Regular string parameters
        else {
          params[key] = value
        }
      }
    }

    // Validate search parameters
    const validatedParams = ContactSearchSchema.parse(params)

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { 
        id: true,
        clerkId: true,
        organizationId: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build where clause for Prisma query
    const where: any = {
      organizationId: user.organizationId,
      deletedAt: null
    }

    // Text search across multiple fields
    if (validatedParams.query) {
      where.OR = [
        { firstName: { contains: validatedParams.query, mode: 'insensitive' } },
        { lastName: { contains: validatedParams.query, mode: 'insensitive' } },
        { email: { contains: validatedParams.query, mode: 'insensitive' } },
        { title: { contains: validatedParams.query, mode: 'insensitive' } },
        { 
          agencyInfo: { 
            path: ['agency'], 
            string_contains: validatedParams.query 
          } 
        }
      ]
    }

    // Individual field filters
    if (validatedParams.firstName) {
      where.firstName = { contains: validatedParams.firstName, mode: 'insensitive' }
    }
    
    if (validatedParams.lastName) {
      where.lastName = { contains: validatedParams.lastName, mode: 'insensitive' }
    }
    
    if (validatedParams.email) {
      where.email = { contains: validatedParams.email, mode: 'insensitive' }
    }
    
    if (validatedParams.title) {
      where.title = { contains: validatedParams.title, mode: 'insensitive' }
    }

    // Agency filter (JSON field)
    if (validatedParams.agency) {
      where.agencyInfo = {
        path: ['agency'],
        string_contains: validatedParams.agency
      }
    }

    // Source filter
    if (validatedParams.source && validatedParams.source.length > 0) {
      where.source = { in: validatedParams.source }
    }

    // Verification filter
    if (validatedParams.verified !== undefined) {
      where.verified = validatedParams.verified
    }

    // Date filters
    if (validatedParams.lastContactedAfter) {
      where.activityTracking = {
        path: ['lastContactedAt'],
        gte: validatedParams.lastContactedAfter
      }
    }

    if (validatedParams.lastContactedBefore) {
      where.activityTracking = {
        path: ['lastContactedAt'],
        lte: validatedParams.lastContactedBefore
      }
    }

    // Contact method filters
    if (validatedParams.hasEmail !== undefined) {
      if (validatedParams.hasEmail) {
        where.email = { not: null }
      } else {
        where.email = null
      }
    }

    if (validatedParams.hasPhone !== undefined) {
      if (validatedParams.hasPhone) {
        where.phone = { not: null }
      } else {
        where.phone = null
      }
    }

    // Build order by clause
    const orderBy: any = {}
    if (validatedParams.sort) {
      // Handle JSON field sorting
      if (validatedParams.sort === 'agency') {
        orderBy.agencyInfo = { sort: { agency: validatedParams.order || 'asc' } }
      } else {
        orderBy[validatedParams.sort] = validatedParams.order || 'asc'
      }
    } else {
      orderBy.lastName = 'asc'
    }

    // Execute query with pagination
    const [contacts, totalContacts] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy,
        take: validatedParams.limit,
        skip: validatedParams.offset,
        include: {
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          updatedBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      prisma.contact.count({ where })
    ])

    // Calculate pagination metadata
    const limit = validatedParams.limit || 20
    const page = validatedParams.page || Math.floor((validatedParams.offset || 0) / limit) + 1
    const totalPages = Math.ceil(totalContacts / limit)
    const hasMore = page < totalPages

    return NextResponse.json({
      items: contacts,
      total: totalContacts,
      page,
      limit,
      totalPages,
      hasMore
    })

  } catch (error) {
    console.error('Error fetching contacts:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid search parameters',
        details: error.errors
      }, { status: 400 })
    }
    
    return handleApiError(error)
  }
}

// POST /api/v1/contacts - Create new contact
export async function POST(request: NextRequest) {
  try {
    const authResult = await auth()
    const userId = authResult?.userId
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 10, windowMs: 60000 }, 'contacts:create')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: rateLimitResult.error || 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        },
        { status: 429 }
      )
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { 
        id: true,
        clerkId: true,
        organizationId: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    
    const dataToValidate = {
      ...body,
      organizationId: user.organizationId,
      createdById: user.id
    }
    
    const validatedData = CreateContactSchema.parse(dataToValidate)

    // Check for duplicate contact (email or phone)
    if (validatedData.email) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          organizationId: user.organizationId,
          email: validatedData.email,
          deletedAt: null
        }
      })

      if (existingContact) {
        return NextResponse.json({
          success: false,
          error: 'A contact with this email address already exists'
        }, { status: 409 })
      }
    }

    // Create the contact
    const contact = await prisma.contact.create({
      data: validatedData,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: contact,
      message: 'Contact created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating contact:', error)
    
    if (error instanceof z.ZodError) {
      console.error('POST /api/v1/contacts - Zod validation error:', error.errors)
      return NextResponse.json({
        success: false,
        error: 'Invalid contact data',
        details: error.errors
      }, { status: 400 })
    }
    
    return handleApiError(error)
  }
}