/**
 * Simple audit test to verify database connection and schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🧪 SIMPLE TEST: Starting audit test');

    // Get user info
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { 
        id: true, 
        organizationId: true, 
        email: true 
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('🧪 SIMPLE TEST: User found:', {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email
    });

    // Test direct database insert using correct schema fields
    try {
      console.log('🧪 SIMPLE TEST: Testing direct database insert with correct schema...');
      
      const auditLog = await db.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          eventType: 'PROFILE_UPDATED',
          category: 'PROFILE_MANAGEMENT',
          severity: 'INFO',
          source: 'simple_test',
          action: 'UPDATE',
          resource: 'Profile',
          resourceId: 'test-profile-id',
          entityType: 'Profile',
          entityId: 'test-profile-id',
          endpoint: '/api/v1/debug/simple-audit-test',
          httpMethod: 'POST',
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          message: 'Simple audit test - direct database insert',
          description: 'Testing audit logging with correct schema fields',
          oldValues: { test: 'old_value' },
          newValues: { test: 'new_value' },
          metadata: {
            test: true,
            userEmail: user.email,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      console.log('✅ SIMPLE TEST: Direct database insert successful:', auditLog.id);
      
      // Verify it was actually created
      const verifyLog = await db.auditLog.findUnique({
        where: { id: auditLog.id }
      });
      
      if (verifyLog) {
        console.log('✅ SIMPLE TEST: Audit log verified in database');
      } else {
        console.error('❌ SIMPLE TEST: Audit log not found after creation');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Simple audit test completed successfully',
        data: {
          auditLogId: auditLog.id,
          userInfo: {
            userId: user.id,
            organizationId: user.organizationId,
            email: user.email
          },
          verified: !!verifyLog,
          auditLog: {
            id: auditLog.id,
            message: auditLog.message,
            eventType: auditLog.eventType,
            category: auditLog.category,
            createdAt: auditLog.createdAt
          }
        }
      });
      
    } catch (dbError) {
      console.error('❌ SIMPLE TEST: Database insert failed:', dbError);
      
      return NextResponse.json({
        success: false,
        error: 'Database insert failed',
        details: {
          message: dbError instanceof Error ? dbError.message : 'Unknown error',
          stack: dbError instanceof Error ? dbError.stack : undefined
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('🚨 SIMPLE TEST: Test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Simple audit test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}