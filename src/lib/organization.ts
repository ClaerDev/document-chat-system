import { db } from './db'
import { getCurrentUser } from './auth'
import { Organization, User, UserRole } from '@prisma/client'

/**
 * Get the current user's organization with all related data
 */
export async function getCurrentOrganization(): Promise<Organization | null> {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return null
    }

    return await db.organization.findUnique({
      where: { 
        id: user.organizationId,
        deletedAt: null,
      },
      include: {
        users: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            profiles: true,
            opportunities: true,
            documents: true,
          },
        },
      },
    })
  } catch (error) {
    console.error('Error getting current organization:', error)
    return null
  }
}

/**
 * Get all users in the current organization
 */
export async function getOrganizationUsers(): Promise<User[]> {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return []
    }

    return await db.user.findMany({
      where: { 
        organizationId: user.organizationId,
        deletedAt: null,
      },
      orderBy: [
        { role: 'desc' }, // Owners first, then admins, etc.
        { createdAt: 'asc' },
      ],
    })
  } catch (error) {
    console.error('Error getting organization users:', error)
    return []
  }
}

/**
 * Update organization details
 * Only admins and owners can update organization details
 */
export async function updateOrganization(
  organizationId: string,
  data: Partial<Pick<Organization, 'name' | 'billingEmail'>>
): Promise<Organization | null> {
  try {
    const user = await getCurrentUser()
    
    if (!user || !['ADMIN', 'OWNER'].includes(user.role)) {
      throw new Error('Insufficient permissions to update organization')
    }

    if (user.organizationId !== organizationId) {
      throw new Error('Cannot update organization that user does not belong to')
    }

    return await db.organization.update({
      where: { id: organizationId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Error updating organization:', error)
    return null
  }
}

/**
 * Invite a user to the organization
 * Only admins and owners can invite users
 */
export async function inviteUserToOrganization(
  email: string,
  role: UserRole = 'MEMBER'
): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    
    if (!user || !['ADMIN', 'OWNER'].includes(user.role)) {
      throw new Error('Insufficient permissions to invite users')
    }

    // Check if user is already in organization
    const existingUser = await db.user.findFirst({
      where: {
        email,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    })

    if (existingUser) {
      throw new Error('User is already a member of this organization')
    }

    // In a real implementation, this would send an invitation email
    // For now, we'll just log the invitation
    console.log(`Invitation sent to ${email} with role ${role}`)
    
    return true
  } catch (error) {
    console.error('Error inviting user to organization:', error)
    return false
  }
}

/**
 * Update user role in organization
 * Only owners can change roles, and they can't change their own role
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'OWNER') {
      throw new Error('Only organization owners can change user roles')
    }

    if (currentUser.id === userId) {
      throw new Error('Cannot change your own role')
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser || targetUser.organizationId !== currentUser.organizationId) {
      throw new Error('User not found in organization')
    }

    await db.user.update({
      where: { id: userId },
      data: { role: newRole },
    })

    return true
  } catch (error) {
    console.error('Error updating user role:', error)
    return false
  }
}

/**
 * Remove user from organization
 * Only owners can remove users, and they can't remove themselves
 */
export async function removeUserFromOrganization(userId: string): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'OWNER') {
      throw new Error('Only organization owners can remove users')
    }

    if (currentUser.id === userId) {
      throw new Error('Cannot remove yourself from organization')
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser || targetUser.organizationId !== currentUser.organizationId) {
      throw new Error('User not found in organization')
    }

    // Soft delete the user
    await db.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    })

    return true
  } catch (error) {
    console.error('Error removing user from organization:', error)
    return false
  }
}

/**
 * Get organization statistics
 */
export async function getOrganizationStats(organizationId: string) {
  try {
    const [
      userCount,
      profileCount,
      opportunityCount,
      documentCount,
      activeOpportunityCount,
    ] = await Promise.all([
      db.user.count({
        where: { organizationId, deletedAt: null },
      }),
      db.profile.count({
        where: { organizationId, deletedAt: null },
      }),
      db.opportunity.count({
        where: { organizationId, deletedAt: null },
      }),
      db.document.count({
        where: { organizationId, deletedAt: null },
      }),
      db.opportunity.count({
        where: { 
          organizationId, 
          deletedAt: null,
          status: 'ACTIVE',
        },
      }),
    ])

    return {
      users: userCount,
      profiles: profileCount,
      opportunities: opportunityCount,
      documents: documentCount,
      activeOpportunities: activeOpportunityCount,
    }
  } catch (error) {
    console.error('Error getting organization stats:', error)
    return {
      users: 0,
      profiles: 0,
      opportunities: 0,
      documents: 0,
      activeOpportunities: 0,
    }
  }
}

/**
 * Check if organization has reached its limits based on plan
 */
export async function checkOrganizationLimits(organizationId: string) {
  try {
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    })

    if (!organization) {
      throw new Error('Organization not found')
    }

    const stats = await getOrganizationStats(organizationId)

    // Define limits based on plan type
    const planLimits = {
      STARTER: {
        users: 3,
        profiles: 1,
        opportunities: 100,
        documents: 50,
      },
      PROFESSIONAL: {
        users: 10,
        profiles: 3,
        opportunities: 1000,
        documents: 500,
      },
      ENTERPRISE: {
        users: -1, // Unlimited
        profiles: -1,
        opportunities: -1,
        documents: -1,
      },
    }

    const limits = planLimits[organization.planType as keyof typeof planLimits] || planLimits.STARTER

    return {
      users: {
        current: stats.users,
        limit: limits.users,
        canAdd: limits.users === -1 || stats.users < limits.users,
      },
      profiles: {
        current: stats.profiles,
        limit: limits.profiles,
        canAdd: limits.profiles === -1 || stats.profiles < limits.profiles,
      },
      opportunities: {
        current: stats.opportunities,
        limit: limits.opportunities,
        canAdd: limits.opportunities === -1 || stats.opportunities < limits.opportunities,
      },
      documents: {
        current: stats.documents,
        limit: limits.documents,
        canAdd: limits.documents === -1 || stats.documents < limits.documents,
      },
    }
  } catch (error) {
    console.error('Error checking organization limits:', error)
    return null
  }
}