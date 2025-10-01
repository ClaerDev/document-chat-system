/**
 * TenantContext for organization-scoped database queries
 * 
 * This class provides a context for multi-tenant applications to ensure
 * all database queries are automatically scoped to the correct organization.
 */

export class TenantContext {
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  /**
   * Get the organization ID for this tenant context
   */
  getOrganizationId(): string {
    return this.organizationId
  }

  /**
   * Apply organization filter to a Prisma where clause
   */
  applyFilter<T extends Record<string, any>>(whereClause: T): T & { organizationId: string } {
    return {
      ...whereClause,
      organizationId: this.organizationId
    }
  }

  /**
   * Create a scoped where clause with just the organization filter
   */
  createWhereClause(): { organizationId: string } {
    return {
      organizationId: this.organizationId
    }
  }

  /**
   * Validate that a resource belongs to this tenant
   */
  validateResourceAccess(resourceOrganizationId: string): boolean {
    return resourceOrganizationId === this.organizationId
  }

  /**
   * Throw an error if resource doesn't belong to this tenant
   */
  enforceResourceAccess(resourceOrganizationId: string): void {
    if (!this.validateResourceAccess(resourceOrganizationId)) {
      throw new Error('Access denied: Resource does not belong to organization')
    }
  }
}