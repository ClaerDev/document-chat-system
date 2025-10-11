import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { AuditQueryService } from '@/lib/audit/query-service';
import { AuditEventType, AuditCategory, AuditSeverity } from '@prisma/client';

const searchParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  sortBy: z.enum(['createdAt', 'severity', 'eventType']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  eventTypes: z.string().optional().transform(val => 
    val ? val.split(',').map(t => t.trim() as AuditEventType) : undefined
  ),
  categories: z.string().optional().transform(val => 
    val ? val.split(',').map(c => c.trim() as AuditCategory) : undefined
  ),
  severities: z.string().optional().transform(val => 
    val ? val.split(',').map(s => s.trim() as AuditSeverity) : undefined
  ),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
  ipAddress: z.string().optional(),
  searchTerm: z.string().optional(),
  correlationId: z.string().optional(),
});

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     summary: Retrieve current user's audit logs with filtering and pagination
 *     description: Get audit logs for the authenticated user with comprehensive filtering options
 *     tags:
 *       - Audit Logs
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of logs per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, severity, eventType]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date
 *       - in: query
 *         name: eventTypes
 *         schema:
 *           type: string
 *         description: Comma-separated list of event types to filter
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated list of categories to filter
 *       - in: query
 *         name: severities
 *         schema:
 *           type: string
 *         description: Comma-separated list of severities to filter
 *       - in: query
 *         name: resourceId
 *         schema:
 *           type: string
 *         description: Filter by specific resource ID
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *         description: Filter by resource type
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Search term for description, user email, or resource type
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 hasNext:
 *                   type: boolean
 *                 hasPrev:
 *                   type: boolean
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    
    const validatedParams = searchParamsSchema.parse(params);

    const queryService = new AuditQueryService();
    const result = await queryService.queryLogs(
      {
        userId, // Always filter by current authenticated user
        startDate: validatedParams.startDate,
        endDate: validatedParams.endDate,
        eventTypes: validatedParams.eventTypes,
        categories: validatedParams.categories,
        severities: validatedParams.severities,
        resourceId: validatedParams.resourceId,
        resourceType: validatedParams.resourceType,
        ipAddress: validatedParams.ipAddress,
        searchTerm: validatedParams.searchTerm,
        correlationId: validatedParams.correlationId,
      },
      {
        page: validatedParams.page,
        limit: validatedParams.limit,
        sortBy: validatedParams.sortBy,
        sortOrder: validatedParams.sortOrder,
      }
    );

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}