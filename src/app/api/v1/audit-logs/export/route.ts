import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { z } from 'zod';
import { AuditQueryService } from '@/lib/audit/query-service';
import { AuditEventType, AuditCategory, AuditSeverity } from '@prisma/client';

const exportParamsSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
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
  userId: z.string().optional(),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
  searchTerm: z.string().optional(),
});

/**
 * @swagger
 * /api/v1/audit-logs/export:
 *   post:
 *     summary: Export audit logs
 *     description: Export audit logs in JSON or CSV format with filtering options
 *     tags:
 *       - Audit Logs
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [json, csv]
 *                 default: json
 *                 description: Export format
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Filter logs from this date
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Filter logs until this date
 *               eventTypes:
 *                 type: string
 *                 description: Comma-separated list of event types
 *               categories:
 *                 type: string
 *                 description: Comma-separated list of categories
 *               severities:
 *                 type: string
 *                 description: Comma-separated list of severities
 *               userId:
 *                 type: string
 *                 description: Filter by specific user ID
 *               resourceId:
 *                 type: string
 *                 description: Filter by specific resource ID
 *               resourceType:
 *                 type: string
 *                 description: Filter by resource type
 *               searchTerm:
 *                 type: string
 *                 description: Search term for filtering
 *     responses:
 *       200:
 *         description: Export file generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 downloadUrl:
 *                   type: string
 *                 filename:
 *                   type: string
 *                 format:
 *                   type: string
 *                 recordCount:
 *                   type: integer
 *           text/csv:
 *             schema:
 *               type: string
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedParams = exportParamsSchema.parse(body);

    const queryService = new AuditQueryService();
    const exportResult = await queryService.exportLogs(
      {
        startDate: validatedParams.startDate,
        endDate: validatedParams.endDate,
        eventTypes: validatedParams.eventTypes,
        categories: validatedParams.categories,
        severities: validatedParams.severities,
        userId: validatedParams.userId,
        resourceId: validatedParams.resourceId,
        resourceType: validatedParams.resourceType,
        searchTerm: validatedParams.searchTerm,
      },
      validatedParams.format
    );

    // For direct download
    const response = new Response(exportResult.data, {
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

    return response;
  } catch (error) {
    console.error('Failed to export audit logs:', error);
    
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