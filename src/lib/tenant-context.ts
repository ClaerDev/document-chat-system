import { db } from './db'

/**
 * TenantContext class for managing multi-tenant database operations
 * Ensures Row-Level Security (RLS) policies are enforced by setting organization context
 */
export class TenantContext {
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  /**
   * Execute a database operation within the organization context
   * This sets the organization context before executing and cleans up after
   */
  async executeInContext<T>(operation: () => Promise<T>): Promise<T> {
    // Set the organization context for RLS
    await db.$executeRaw`SELECT set_organization_context(${this.organizationId})`

    try {
      // Execute the operation
      const result = await operation()
      return result
    } finally {
      // Clean up the context (optional, as it's session-scoped)
      await db.$executeRaw`SELECT set_organization_context('')`
    }
  }

  /**
   * Get the current organization ID
   */
  getOrganizationId(): string {
    return this.organizationId
  }

  /**
   * Create a new tenant context for a different organization
   */
  static forOrganization(organizationId: string): TenantContext {
    return new TenantContext(organizationId)
  }
}

/**
 * Helper function to create a tenant-scoped database client
 * This is the recommended way to interact with the database in multi-tenant operations
 */
export function createTenantDb(organizationId: string) {
  const context = new TenantContext(organizationId)
  
  return {
    // Wrapper for Prisma operations that automatically sets tenant context
    executeInContext: context.executeInContext.bind(context),
    
    // Direct access to the underlying Prisma client (use with caution)
    prisma: db,
    
    // Get the organization ID
    organizationId: context.getOrganizationId(),
  }
}

/**
 * Type for tenant-scoped database operations
 */
export type TenantDb = ReturnType<typeof createTenantDb>