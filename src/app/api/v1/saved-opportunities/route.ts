/**
 * @swagger
 * /api/v1/saved-opportunities:
 *   get:
 *     summary: Get saved opportunities for organization
 *     description: Retrieve all saved opportunities for the authenticated user's organization with lifecycle tracking
 *     tags: [Saved Opportunities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SAVED, REVIEWING, PURSUING, APPLIED, AWARDED, LOST]
 *         description: Filter by opportunity status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [HIGH, MEDIUM, LOW]
 *         description: Filter by priority level
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user who saved the opportunity
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Successfully retrieved saved opportunities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       agency:
 *                         type: string
 *                       status:
 *                         type: string
 *                       priority:
 *                         type: string
 *                       dueDate:
 *                         type: string
 *                         format: date-time
 *                       estimatedValue:
 *                         type: object
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: string
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Save an opportunity
 *     description: Save an external opportunity for tracking and management
 *     tags: [Saved Opportunities]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - externalOpportunityId
 *               - sourceSystem
 *               - title
 *               - agency
 *               - solicitation
 *               - dueDate
 *             properties:
 *               externalOpportunityId:
 *                 type: string
 *                 description: ID from external source
 *               sourceSystem:
 *                 type: string
 *                 enum: [HIGHERGOV, SAM_GOV, GRANTS_GOV]
 *               sourceUrl:
 *                 type: string
 *                 format: uri
 *               title:
 *                 type: string
 *               agency:
 *                 type: string
 *               solicitation:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               estimatedValue:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *                   currency:
 *                     type: string
 *                     default: USD
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [HIGH, MEDIUM, LOW]
 *                 default: MEDIUM
 *     responses:
 *       201:
 *         description: Opportunity saved successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Opportunity already saved
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { crudAuditLogger } from '@/lib/audit/crud-audit-logger';

const CreateSavedOpportunitySchema = z.object({
  externalOpportunityId: z.string().min(1).describe("External opportunity ID from source system (SAM.gov, HigherGov, etc.)"),
  sourceSystem: z.enum(['HIGHERGOV', 'SAM_GOV', 'GRANTS_GOV']).describe("Source system where opportunity originates"),
  sourceUrl: z.string().url().optional().describe("Direct URL to external opportunity listing"),
  title: z.string().min(1).describe("Opportunity title or solicitation name"),
  agency: z.string().min(1).describe("Government agency or department"),
  solicitation: z.string().min(1).describe("Solicitation number or identifier"),
  dueDate: z.string().datetime().describe("Opportunity response deadline in ISO format"),
  estimatedValue: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().default('USD')
  }).optional().describe("Estimated contract value range and currency"),
  tags: z.array(z.string()).default([]).describe("User-defined tags for categorization"),
  notes: z.string().optional().describe("Initial notes about the opportunity"),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM').describe("Priority level for tracking")
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user and organization
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const filterUserId = url.searchParams.get('userId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build where clause
    const whereClause: any = {
      organizationId: user.organizationId
    };

    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (filterUserId) whereClause.userId = filterUserId;

    // Fetch saved opportunities
    const [savedOpportunities, total] = await Promise.all([
      db.savedOpportunity.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          application: {
            select: {
              id: true,
              status: true,
              submissionDate: true,
              proposalValue: true,
              winProbability: true
            }
          },
          notes: {
            select: {
              id: true,
              content: true,
              type: true,
              createdAt: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      db.savedOpportunity.count({ where: whereClause })
    ]);

    // Log audit trail for saved opportunities access
    try {
      await crudAuditLogger.logOpportunityOperation(
        'READ',
        'bulk-saved-opportunities',
        `Saved Opportunities List (${savedOpportunities.length} items)`,
        'SAVE',
        null,
        { 
          count: savedOpportunities.length, 
          filters: { status, priority, filterUserId } 
        },
        {
          endpoint: '/api/v1/saved-opportunities',
          method: 'GET',
          organizationId: user.organizationId,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
        }
      );
    } catch (auditError) {
      console.error('Failed to create saved opportunities access audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: savedOpportunities,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching saved opportunities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved opportunities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user and organization
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateSavedOpportunitySchema.parse(body);

    // Check if opportunity is already saved
    const existingSavedOpportunity = await db.savedOpportunity.findFirst({
      where: {
        organizationId: user.organizationId,
        externalOpportunityId: validatedData.externalOpportunityId,
        sourceSystem: validatedData.sourceSystem
      }
    });

    if (existingSavedOpportunity) {
      return NextResponse.json(
        { success: false, error: 'Opportunity already saved' },
        { status: 409 }
      );
    }

    // Create saved opportunity
    const savedOpportunity = await db.savedOpportunity.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        externalOpportunityId: validatedData.externalOpportunityId,
        sourceSystem: validatedData.sourceSystem,
        sourceUrl: validatedData.sourceUrl,
        title: validatedData.title,
        agency: validatedData.agency,
        solicitation: validatedData.solicitation,
        dueDate: new Date(validatedData.dueDate),
        estimatedValue: validatedData.estimatedValue || {},
        tags: validatedData.tags,
        notes: validatedData.notes,
        priority: validatedData.priority,
        status: 'SAVED'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Log audit trail for opportunity save
    try {
      await crudAuditLogger.logOpportunityOperation(
        'CREATE',
        savedOpportunity.id,
        savedOpportunity.title,
        'SAVE',
        null,
        savedOpportunity,
        {
          endpoint: '/api/v1/saved-opportunities',
          method: 'POST',
          organizationId: user.organizationId,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          lifecycleAction: 'OPPORTUNITY_SAVED',
          sourceSystem: validatedData.sourceSystem,
          externalId: validatedData.externalOpportunityId
        }
      );
    } catch (auditError) {
      console.error('Failed to create opportunity save audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: savedOpportunity,
      message: 'Opportunity saved successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Error saving opportunity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save opportunity' },
      { status: 500 }
    );
  }
}