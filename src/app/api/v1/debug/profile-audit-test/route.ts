/**
 * Debug endpoint to test profile audit logging specifically
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { crudAuditLogger } from '@/lib/audit/crud-audit-logger';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🧪 DEBUG: Starting profile audit test');

    // Get user info
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { 
        id: true, 
        organizationId: true, 
        firstName: true, 
        lastName: true,
        email: true 
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('🧪 DEBUG: User found:', {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email
    });

    // Get user's profile
    const profile = await db.profile.findFirst({
      where: {
        organizationId: user.organizationId,
        deletedAt: null
      }
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    console.log('🧪 DEBUG: Profile found:', {
      profileId: profile.id,
      companyName: profile.companyName
    });

    // Check current audit log count
    const beforeCount = await db.auditLog.count({
      where: {
        organizationId: user.organizationId
      }
    });

    console.log('🧪 DEBUG: Audit logs before test:', beforeCount);

    // Test 1: Direct database insert
    try {
      console.log('🧪 DEBUG: Testing direct database insert...');
      
      const directInsert = await db.auditLog.create({
        data: {
          operation: 'UPDATE',
          entityType: 'Profile',
          entityId: profile.id,
          entityName: profile.companyName || 'Test Company',
          description: 'Direct database test insert',
          category: 'DATA_CHANGE',
          eventType: 'PROFILE_UPDATED',
          severity: 'INFO',
          organizationId: user.organizationId,
          userId: user.id,
          currentData: { test: 'direct_insert' },
          metadata: {
            test: true,
            endpoint: '/api/v1/debug/profile-audit-test',
            method: 'POST'
          }
        }
      });
      
      console.log('✅ Direct database insert successful:', directInsert.id);
      
    } catch (dbError) {
      console.error('❌ Direct database insert failed:', dbError);
      
      return NextResponse.json({
        success: false,
        error: 'Direct database insert failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown error',
        step: 'direct_insert'
      }, { status: 500 });
    }

    // Test 2: Using crudAuditLogger
    try {
      console.log('🧪 DEBUG: Testing crudAuditLogger...');
      
      await crudAuditLogger.logProfileOperation(
        'UPDATE',
        profile.id,
        profile.companyName || 'Test Company',
        { oldValue: 'test_old' },
        { newValue: 'test_new' },
        {
          test: true,
          endpoint: '/api/v1/debug/profile-audit-test',
          method: 'POST',
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
        }
      );
      
      console.log('✅ crudAuditLogger call successful');
      
    } catch (auditError) {
      console.error('❌ crudAuditLogger failed:', auditError);
      
      return NextResponse.json({
        success: false,
        error: 'Audit logger failed',
        details: auditError instanceof Error ? auditError.message : 'Unknown error',
        step: 'audit_logger'
      }, { status: 500 });
    }

    // Check audit log count after tests
    const afterCount = await db.auditLog.count({
      where: {
        organizationId: user.organizationId
      }
    });

    console.log('🧪 DEBUG: Audit logs after test:', afterCount);

    // Get the recent logs we just created
    const recentLogs = await db.auditLog.findMany({
      where: {
        organizationId: user.organizationId,
        createdAt: {
          gte: new Date(Date.now() - 60000) // Last minute
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('🧪 DEBUG: Recent logs found:', recentLogs.length);

    return NextResponse.json({
      success: true,
      message: 'Profile audit logging test completed',
      data: {
        userInfo: {
          userId: user.id,
          organizationId: user.organizationId,
          email: user.email
        },
        profileInfo: {
          profileId: profile.id,
          companyName: profile.companyName
        },
        testResults: {
          beforeCount,
          afterCount,
          logsCreated: afterCount - beforeCount,
          recentLogsFound: recentLogs.length
        },
        recentLogs: recentLogs.map(log => ({
          id: log.id,
          operation: log.operation,
          entityType: log.entityType,
          description: log.description,
          createdAt: log.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('🚨 DEBUG: Profile audit test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Profile audit test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}