/**
 * Admin Authentication and Authorization
 *
 * Provides utilities for verifying admin access to organization resources.
 */

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export interface AdminAuthResult {
  authorized: boolean;
  userId?: string;
  userRole?: UserRole;
  organizationId?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Verify that the current user has admin access to the specified organization
 *
 * @param organizationId - The organization ID to check access for
 * @param requiredRoles - Array of roles that are allowed (default: ADMIN, OWNER)
 * @returns AdminAuthResult with authorization status
 */
export async function verifyAdminAccess(
  organizationId: string,
  requiredRoles: UserRole[] = ['ADMIN', 'OWNER']
): Promise<AdminAuthResult> {
  try {
    // Check if user is authenticated
    const { userId } = await auth();

    if (!userId) {
      return {
        authorized: false,
        error: 'Unauthorized - Authentication required',
        statusCode: 401
      };
    }

    // Get user from database with organization access
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        role: true,
        organizationId: true,
        deletedAt: true
      }
    });

    if (!user || user.deletedAt) {
      return {
        authorized: false,
        error: 'User not found or has been deleted',
        statusCode: 403
      };
    }

    // Verify user belongs to the requested organization
    if (user.organizationId !== organizationId) {
      return {
        authorized: false,
        error: 'Forbidden - User does not belong to this organization',
        statusCode: 403
      };
    }

    // Verify user has required role
    if (!requiredRoles.includes(user.role)) {
      return {
        authorized: false,
        error: `Forbidden - Required role: ${requiredRoles.join(' or ')}. Current role: ${user.role}`,
        statusCode: 403
      };
    }

    // Authorization successful
    return {
      authorized: true,
      userId: user.id,
      userRole: user.role,
      organizationId: user.organizationId
    };

  } catch (error) {
    console.error('Admin auth verification error:', error);
    return {
      authorized: false,
      error: 'Internal server error during authorization',
      statusCode: 500
    };
  }
}

/**
 * Quick check if current user is an admin or owner
 *
 * @returns true if user is ADMIN or OWNER, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) return false;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, deletedAt: true }
    });

    if (!user || user.deletedAt) return false;

    return user.role === 'ADMIN' || user.role === 'OWNER';
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}

/**
 * Get current user's role and organization
 *
 * @returns User role and organization info, or null if not authenticated
 */
export async function getCurrentUserRole(): Promise<{
  userId: string;
  role: UserRole;
  organizationId: string;
} | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        role: true,
        organizationId: true,
        deletedAt: true
      }
    });

    if (!user || user.deletedAt) return null;

    return {
      userId: user.id,
      role: user.role,
      organizationId: user.organizationId
    };
  } catch (error) {
    console.error('Get user role error:', error);
    return null;
  }
}

/**
 * Verify user has at least MEMBER access to organization
 *
 * @param organizationId - The organization ID to check
 * @returns true if user has any access, false otherwise
 */
export async function verifyOrganizationAccess(organizationId: string): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) return false;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true, deletedAt: true }
    });

    if (!user || user.deletedAt) return false;

    return user.organizationId === organizationId;
  } catch (error) {
    console.error('Organization access check error:', error);
    return false;
  }
}
