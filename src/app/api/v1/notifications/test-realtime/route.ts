import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { NotificationService } from '@/lib/notifications';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins and owners can create test notifications
    if (!['ADMIN', 'OWNER'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { type = 'USER', message = 'Test real-time notification' } = body;

    let notification;

    if (type === 'USER') {
      // Create user-specific test notification
      notification = await NotificationService.create({
        organizationId: user.organizationId,
        userId: userId,
        type: 'SUCCESS',
        category: 'GENERAL',
        title: 'Real-time Test (User)',
        message: `${message} - sent at ${new Date().toLocaleTimeString()}`,
        priority: 'MEDIUM',
        metadata: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      });
    } else if (type === 'ORGANIZATION') {
      // Create organization-wide test notification
      notification = await NotificationService.createSystemNotification(
        user.organizationId,
        'Real-time Test (Organization)',
        `${message} - sent at ${new Date().toLocaleTimeString()}`,
        'MEDIUM'
      );
    } else {
      return NextResponse.json({ error: 'Invalid type. Use USER or ORGANIZATION' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      notification,
      message: `Test notification sent via real-time delivery`,
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}