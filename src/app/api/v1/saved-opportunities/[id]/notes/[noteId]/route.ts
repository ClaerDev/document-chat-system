/**
 * @swagger
 * /api/v1/saved-opportunities/{id}/notes/{noteId}:
 *   patch:
 *     summary: Update opportunity note
 *     description: Update content, type, privacy, or tags of an existing note
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
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Note ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Updated note content
 *               type:
 *                 type: string
 *                 enum: [GENERAL, STRATEGY, CONTACT, REQUIREMENT]
 *                 description: Updated note type
 *               isPrivate:
 *                 type: boolean
 *                 description: Updated privacy setting
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Updated tags
 *     responses:
 *       200:
 *         description: Note updated successfully
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Cannot edit note (not author)
 *       404:
 *         description: Note not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete opportunity note
 *     description: Delete an existing note (only by author or admin)
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
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *       403:
 *         description: Cannot delete note (not author or admin)
 *       404:
 *         description: Note not found
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

const UpdateNoteSchema = z.object({
  content: z.string().min(1).optional().describe("Updated note content"),
  type: z.enum(['GENERAL', 'STRATEGY', 'CONTACT', 'REQUIREMENT']).optional()
    .describe("Updated note type"),
  isPrivate: z.boolean().optional()
    .describe("Updated privacy setting"),
  tags: z.array(z.string()).optional()
    .describe("Updated tags for categorization")
});

interface RouteParams {
  params: {
    id: string;
    noteId: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
      select: { id: true, organizationId: true, role: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: savedOpportunityId, noteId } = params;

    // Check if note exists and user has access
    const existingNote = await db.opportunityNote.findFirst({
      where: {
        id: noteId,
        savedOpportunityId,
        savedOpportunity: {
          organizationId: user.organizationId
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        savedOpportunity: {
          select: {
            title: true
          }
        }
      }
    });

    if (!existingNote) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    // Check if user can edit this note (author or admin/owner)
    const canEdit = existingNote.userId === user.id || ['ADMIN', 'OWNER'].includes(user.role);
    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit note - insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateNoteSchema.parse(body);

    // Update note
    const updatedNote = await db.opportunityNote.update({
      where: { id: noteId },
      data: {
        ...validatedData,
        updatedAt: new Date()
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

    // Log audit trail for note update
    try {
      await crudAuditLogger.logOpportunityOperation(
        'UPDATE',
        noteId,
        existingNote.savedOpportunity.title,
        'NOTE',
        existingNote,
        updatedNote,
        {
          endpoint: `/api/v1/saved-opportunities/${savedOpportunityId}/notes/${noteId}`,
          method: 'PATCH',
          organizationId: user.organizationId,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          lifecycleAction: 'NOTE_UPDATED',
          changedFields: Object.keys(validatedData),
          isOwnNote: existingNote.userId === user.id
        }
      );
    } catch (auditError) {
      console.error('Failed to create note update audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: updatedNote,
      message: 'Note updated successfully'
    });

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

    console.error('Error updating opportunity note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
      select: { id: true, organizationId: true, role: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: savedOpportunityId, noteId } = params;

    // Check if note exists and user has access
    const existingNote = await db.opportunityNote.findFirst({
      where: {
        id: noteId,
        savedOpportunityId,
        savedOpportunity: {
          organizationId: user.organizationId
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        savedOpportunity: {
          select: {
            title: true
          }
        }
      }
    });

    if (!existingNote) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    // Check if user can delete this note (author or admin/owner)
    const canDelete = existingNote.userId === user.id || ['ADMIN', 'OWNER'].includes(user.role);
    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete note - insufficient permissions' },
        { status: 403 }
      );
    }

    // Delete note
    await db.opportunityNote.delete({
      where: { id: noteId }
    });

    // Log audit trail for note deletion
    try {
      await crudAuditLogger.logOpportunityOperation(
        'DELETE',
        noteId,
        existingNote.savedOpportunity.title,
        'NOTE',
        existingNote,
        null,
        {
          endpoint: `/api/v1/saved-opportunities/${savedOpportunityId}/notes/${noteId}`,
          method: 'DELETE',
          organizationId: user.organizationId,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          lifecycleAction: 'NOTE_DELETED',
          noteType: existingNote.type,
          isOwnNote: existingNote.userId === user.id,
          contentLength: existingNote.content.length
        }
      );
    } catch (auditError) {
      console.error('Failed to create note deletion audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting opportunity note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}