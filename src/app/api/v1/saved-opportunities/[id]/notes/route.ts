/**
 * @swagger
 * /api/v1/saved-opportunities/{id}/notes:
 *   get:
 *     summary: Get opportunity notes
 *     description: Retrieve all notes for a specific saved opportunity
 *     tags: [Opportunity Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved opportunity ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [GENERAL, STRATEGY, CONTACT, REQUIREMENT]
 *         description: Filter by note type
 *       - in: query
 *         name: includePrivate
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include private notes (only for note author)
 *     responses:
 *       200:
 *         description: Successfully retrieved notes
 *       404:
 *         description: Saved opportunity not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Add opportunity note
 *     description: Add a new note to a saved opportunity
 *     tags: [Opportunity Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved opportunity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Note content
 *               type:
 *                 type: string
 *                 enum: [GENERAL, STRATEGY, CONTACT, REQUIREMENT]
 *                 default: GENERAL
 *                 description: Type of note
 *               isPrivate:
 *                 type: boolean
 *                 default: false
 *                 description: Whether note is private to author
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Note tags for categorization
 *     responses:
 *       201:
 *         description: Note created successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Saved opportunity not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { crudAuditLogger } from '@/lib/audit/crud-audit-logger';

const CreateNoteSchema = z.object({
  content: z.string().min(1).describe("Note content - cannot be empty"),
  type: z.enum(['GENERAL', 'STRATEGY', 'CONTACT', 'REQUIREMENT']).default('GENERAL')
    .describe("Type of note for categorization"),
  isPrivate: z.boolean().default(false)
    .describe("Whether note is private to author or shared with organization"),
  tags: z.array(z.string()).default([])
    .describe("Tags for note categorization and search")
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id: savedOpportunityId } = params;

    // Check if saved opportunity exists and user has access
    const savedOpportunity = await db.savedOpportunity.findFirst({
      where: {
        id: savedOpportunityId,
        organizationId: user.organizationId
      }
    });

    if (!savedOpportunity) {
      return NextResponse.json(
        { success: false, error: 'Saved opportunity not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const includePrivate = url.searchParams.get('includePrivate') !== 'false';

    // Build where clause for notes
    const whereClause: any = {
      savedOpportunityId
    };

    if (type) {
      whereClause.type = type;
    }

    // Handle private notes visibility
    if (!includePrivate) {
      whereClause.isPrivate = false;
    } else {
      // Include public notes + private notes created by current user
      whereClause.OR = [
        { isPrivate: false },
        { isPrivate: true, userId: user.id }
      ];
    }

    // Fetch notes
    const notes = await db.opportunityNote.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Log audit trail for notes access
    try {
      await crudAuditLogger.logOpportunityOperation(
        'READ',
        savedOpportunityId,
        savedOpportunity.title,
        'NOTE',
        null,
        { notesCount: notes.length, type, includePrivate },
        {
          endpoint: `/api/v1/saved-opportunities/${savedOpportunityId}/notes`,
          method: 'GET',
          organizationId: user.organizationId,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          lifecycleAction: 'NOTES_ACCESSED'
        }
      );
    } catch (auditError) {
      console.error('Failed to create notes access audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: notes,
      total: notes.length
    });

  } catch (error) {
    console.error('Error fetching opportunity notes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { id: savedOpportunityId } = params;

    // Check if saved opportunity exists and user has access
    const savedOpportunity = await db.savedOpportunity.findFirst({
      where: {
        id: savedOpportunityId,
        organizationId: user.organizationId
      }
    });

    if (!savedOpportunity) {
      return NextResponse.json(
        { success: false, error: 'Saved opportunity not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateNoteSchema.parse(body);

    // Create note
    const note = await db.opportunityNote.create({
      data: {
        savedOpportunityId,
        userId: user.id,
        content: validatedData.content,
        type: validatedData.type,
        isPrivate: validatedData.isPrivate,
        tags: validatedData.tags
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Log audit trail for note creation
    try {
      await crudAuditLogger.logOpportunityOperation(
        'CREATE',
        note.id,
        savedOpportunity.title,
        'NOTE',
        null,
        note,
        {
          endpoint: `/api/v1/saved-opportunities/${savedOpportunityId}/notes`,
          method: 'POST',
          organizationId: user.organizationId,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          lifecycleAction: 'NOTE_CREATED',
          noteType: validatedData.type,
          isPrivate: validatedData.isPrivate,
          contentLength: validatedData.content.length
        }
      );
    } catch (auditError) {
      console.error('Failed to create note creation audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: note,
      message: 'Note created successfully'
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

    console.error('Error creating opportunity note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create note' },
      { status: 500 }
    );
  }
}