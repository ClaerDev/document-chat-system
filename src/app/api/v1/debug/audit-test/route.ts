/**
 * Debug endpoint to test audit logging functionality
 * Temporary endpoint to help troubleshoot audit log issues
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

    // Get user info
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true, firstName: true, lastName: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Test audit logging
    console.log('🧪 Testing audit logging...');
    
    try {
      await crudAuditLogger.logProfileOperation(
        'UPDATE',
        'test-profile-id',
        'Test Company',
        { testField: 'old_value' },
        { testField: 'new_value' },
        {
          endpoint: '/api/v1/debug/audit-test',
          method: 'POST',
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          isTest: true,
          timestamp: new Date().toISOString()
        }
      );
      
      console.log('✅ Audit log created successfully');
      
      // Check if the audit log was actually saved
      const recentLogs = await db.auditLog.findMany({
        where: {
          organizationId: user.organizationId,
          entityType: 'Profile',
          description: { contains: 'Test Company' }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      console.log(`🔍 Found ${recentLogs.length} recent test audit logs`);
      
      return NextResponse.json({
        success: true,
        message: 'Audit logging test completed',
        data: {
          auditLogCreated: true,
          recentTestLogs: recentLogs.length,
          testTimestamp: new Date().toISOString(),
          userInfo: {
            organizationId: user.organizationId,
            userName: `${user.firstName} ${user.lastName}`
          },
          logs: recentLogs
        }
      });
      
    } catch (auditError) {
      console.error('❌ Audit logging failed:', auditError);
      
      return NextResponse.json({
        success: false,
        error: 'Audit logging test failed',
        details: {
          errorMessage: auditError instanceof Error ? auditError.message : 'Unknown error',
          errorStack: auditError instanceof Error ? auditError.stack : undefined,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('🚨 Debug endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}