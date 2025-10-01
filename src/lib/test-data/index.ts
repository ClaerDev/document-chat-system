/**
 * Centralized Test Data Factory
 * 
 * Single source of truth for all mock data across the application.
 * Used by tests, seed scripts, and development APIs.
 * 
 * @module test-data
 */

export * from './factories';
export * from './builders';
export * from './constants';
export * from './validators';

// Re-export main factory functions for convenience
export { 
  createOrganization,
  createUser,
  createProfile,
  createOpportunity,
  createMatchScore,
  createBillingSubscription,
  createUsageRecord,
} from './factories';

// Re-export builders for complex scenarios
export {
  OrganizationBuilder,
  UserBuilder,
  ProfileBuilder,
  OpportunityBuilder,
  MatchScoreBuilder,
} from './builders';

// Re-export common test data sets
export {
  TEST_ORGANIZATIONS,
  TEST_USERS,
  TEST_PROFILES,
  TEST_OPPORTUNITIES,
  TEST_CERTIFICATIONS,
  TEST_NAICS_CODES,
  TEST_AGENCIES,
} from './constants';