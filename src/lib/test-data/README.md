# Centralized Test Data System

This directory contains the single source of truth for all test data across the GovMatch AI application. By centralizing test data, we ensure consistency, reduce duplication, and maintain data integrity across tests, seed scripts, and development APIs.

## Overview

The test data system provides:
- **Factory Functions**: Create consistent test data with sensible defaults
- **Builder Pattern**: Fluent API for complex test scenarios
- **Constants**: Reusable test values (NAICS codes, agencies, certifications, etc.)
- **Validators**: Ensure test data conforms to TypeScript types
- **Type Safety**: Full TypeScript support with proper typing

## Usage

### Basic Factory Functions

```typescript
import { createOpportunity, createProfile, createMatchScore } from '@/lib/test-data';

// Create a basic opportunity
const opportunity = createOpportunity();

// Create with overrides
const customOpp = createOpportunity({
  title: 'Custom IT Services',
  agency: 'Department of Defense',
  estimatedValue: { min: 1000000, max: 5000000, currency: 'USD' }
});

// Create multiple opportunities
const opportunities = createOpportunities(10);
```

### Builder Pattern

For complex scenarios, use the builder pattern:

```typescript
import { ProfileBuilder, OpportunityBuilder } from '@/lib/test-data';

// Create a small business profile
const smallBizProfile = new ProfileBuilder()
  .forSmallBusiness()
  .withNaicsCodes('541511', '541512')
  .withClearance('SECRET')
  .inLocation('VA', 'Arlington')
  .build();

// Create a high-value DoD opportunity
const dodOpp = new OpportunityBuilder()
  .forAgency('DOD')
  .withValue(50000000, 100000000)
  .withClearanceRequired('TOP_SECRET')
  .dueSoon(14) // Due in 14 days
  .build();
```

### Using Constants

```typescript
import { TEST_NAICS_CODES, TEST_AGENCIES, TEST_CERTIFICATIONS } from '@/lib/test-data';

// Use predefined NAICS codes
const softwareNaics = TEST_NAICS_CODES.SOFTWARE_DEV;

// Use predefined agencies
const dodAgency = TEST_AGENCIES.DOD;

// Use predefined certifications
const cert8a = TEST_CERTIFICATIONS.SBA_8A;
```

### In Tests

```typescript
// In Jest tests
import { createProfile, createOpportunity } from '@/lib/test-data';

describe('Match Score Algorithm', () => {
  const mockProfile = createProfile({
    certifications: [
      { type: 'SBA_8A', status: 'ACTIVE' }
    ]
  });
  
  const mockOpp = createOpportunity({
    setAside: 'SMALL_BUSINESS'
  });
  
  it('should calculate score correctly', () => {
    const score = calculateMatchScore(mockProfile, mockOpp);
    expect(score).toBeGreaterThan(0);
  });
});
```

### In Seed Scripts

```typescript
// In database seed scripts
import { createOrganization, createUser, createProfile } from '@/lib/test-data';

async function seed() {
  const org = createOrganization({ name: 'Demo Organization' });
  await prisma.organization.create({ data: org });
  
  const user = createUser({ organizationId: org.id });
  await prisma.user.create({ data: user });
  
  const profile = createProfile({ userId: user.id });
  await prisma.profile.create({ data: profile });
}
```

### In Development APIs

```typescript
// In mock API routes
import { createOpportunities } from '@/lib/test-data';

export async function GET() {
  const opportunities = createOpportunities(20);
  
  return NextResponse.json({
    success: true,
    data: opportunities
  });
}
```

## Data Validation

Use validators to ensure data consistency:

```typescript
import { validateOpportunity, validateRelationships } from '@/lib/test-data';

// Validate single entity
const opp = createOpportunity();
if (!validateOpportunity(opp)) {
  throw new Error('Invalid opportunity data');
}

// Validate relationships
const result = validateRelationships({
  organizations: [org1, org2],
  users: [user1, user2],
  profiles: [profile1, profile2]
});

if (!result.valid) {
  console.error('Relationship errors:', result.errors);
}
```

## Best Practices

1. **Always use factories for test data** - Don't hardcode test objects
2. **Use builders for complex scenarios** - When you need specific combinations
3. **Leverage constants** - For commonly used values like NAICS codes
4. **Validate relationships** - Ensure referential integrity in test data
5. **Override only what's needed** - Let factories provide sensible defaults

## Migration Guide

If you have existing hardcoded test data:

1. Replace hardcoded objects with factory calls:
   ```typescript
   // Before
   const mockOpp = {
     id: 'test123',
     title: 'Test Opportunity',
     // ... many fields
   };
   
   // After
   const mockOpp = createOpportunity({
     id: 'test123',
     title: 'Test Opportunity'
   });
   ```

2. Use builders for complex scenarios:
   ```typescript
   // Before
   const profile = {
     // Complex nested object
   };
   
   // After
   const profile = new ProfileBuilder()
     .forSmallBusiness()
     .withClearance('SECRET')
     .build();
   ```

3. Replace magic strings with constants:
   ```typescript
   // Before
   const naics = '541511';
   
   // After
   const naics = TEST_NAICS_CODES.SOFTWARE_DEV.code;
   ```

## Adding New Test Data

When adding new test data types:

1. Add factory function in `factories.ts`
2. Add builder class in `builders.ts` (if needed)
3. Add constants in `constants.ts`
4. Add validators in `validators.ts`
5. Export from `index.ts`

Example:
```typescript
// In factories.ts
export function createInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: generateId('inv'),
    amount: 10000,
    status: 'PENDING',
    dueDate: TEST_DATES.NEXT_MONTH,
    ...overrides
  };
}

// In builders.ts
export class InvoiceBuilder {
  private data: Partial<Invoice> = {};
  
  forAmount(amount: number): this {
    this.data.amount = amount;
    return this;
  }
  
  build(): Invoice {
    return createInvoice(this.data);
  }
}
```

## Type Safety

All factories and builders are fully typed:

```typescript
// TypeScript will enforce correct types
const opp = createOpportunity({
  title: 'Test', // ✅ string
  estimatedValue: { min: 1000, max: 5000 } // ✅ correct shape
  // naicsCodes: 'wrong' // ❌ TypeScript error - expects string[]
});
```

## Performance Considerations

- Factories are lightweight - safe to use in loops
- Builders create new instances - no shared state
- Constants are frozen objects - immutable
- ID generation includes timestamp - ensures uniqueness

## Common Patterns

### Testing Different User Roles
```typescript
const owner = new UserBuilder().asOwner().build();
const admin = new UserBuilder().asAdmin().build();
const member = new UserBuilder().asMember().build();
const viewer = new UserBuilder().asViewer().build();
```

### Testing Match Scores
```typescript
const perfectMatch = new MatchScoreBuilder()
  .forProfile(profile)
  .forOpportunity(opportunity)
  .withPerfectMatch()
  .build();

const poorMatch = new MatchScoreBuilder()
  .forProfile(profile)
  .forOpportunity(opportunity)
  .withPoorMatch()
  .build();
```

### Creating Related Data
```typescript
const { organization, users } = new OrganizationBuilder()
  .withName('Test Corp')
  .withUsers(5, 'MEMBER')
  .buildWithUsers();

const { opportunities, matchScores } = createMatchedOpportunities(
  profile.id,
  10 // Create 10 opportunities with scores
);
```

## Troubleshooting

### Issue: Test data doesn't match schema
Solution: Update the factory to match current schema, then run validators

### Issue: Duplicate IDs in tests
Solution: Use factory functions which auto-generate unique IDs

### Issue: Relationships are broken
Solution: Use builders or validateRelationships() to ensure integrity

### Issue: Tests are flaky due to dates
Solution: Use TEST_DATES constants for consistent date values