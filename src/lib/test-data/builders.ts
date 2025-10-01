/**
 * Test Data Builders
 * 
 * Builder pattern implementations for complex test data scenarios.
 * Provides fluent API for creating test data with specific characteristics.
 */

import type { 
  Organization, 
  User, 
  Profile, 
  Opportunity,
  MatchScore,
  Certification,
  PastPerformance,
} from '../../types';

import { 
  createOrganization,
  createUser,
  createProfile,
  createOpportunity,
  createMatchScore,
  createCertification,
  createPastPerformance,
} from './factories';

import { 
  TEST_NAICS_CODES,
  TEST_CERTIFICATIONS,
  TEST_AGENCIES,
  TEST_ADDRESSES,
} from './constants';

/**
 * Organization Builder for complex scenarios
 */
export class OrganizationBuilder {
  private data: Partial<Organization> = {};
  private users: User[] = [];

  withName(name: string): this {
    this.data.name = name;
    this.data.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    this.data.domain = `${this.data.slug}.com`;
    return this;
  }

  withOwner(user: User): this {
    this.data.ownerId = user.id;
    this.users.push(user);
    return this;
  }

  withUsers(count: number, role: User['role'] = 'MEMBER'): this {
    const org = this.build();
    for (let i = 0; i < count; i++) {
      this.users.push(createUser({ 
        organizationId: org.id, 
        role,
        email: `user${i + 1}@${org.domain}`,
      }));
    }
    return this;
  }

  build(): Organization {
    const org = createOrganization(this.data);
    if (!this.data.ownerId && this.users.length === 0) {
      // Create default owner if none specified
      const owner = createUser({ 
        organizationId: org.id, 
        role: 'OWNER',
        email: `owner@${org.domain}`,
      });
      org.ownerId = owner.id;
      this.users.push(owner);
    }
    return org;
  }

  buildWithUsers(): { organization: Organization; users: User[] } {
    const organization = this.build();
    return { organization, users: this.users };
  }
}

/**
 * Profile Builder for specific contractor types
 */
export class ProfileBuilder {
  private data: Partial<Profile> = {};

  forSmallBusiness(): this {
    this.data = {
      ...this.data,
      companyName: 'Small Business Contractor LLC',
      employeeCount: 25,
      annualRevenue: 2500000,
      certifications: [
        createCertification({ type: 'SBA_8A' }),
        createCertification({ type: 'HUBZONE' }),
      ],
    };
    return this;
  }

  forWomanOwned(): this {
    this.data = {
      ...this.data,
      companyName: 'Woman-Owned Business Corp',
      certifications: [
        createCertification({ type: 'WOSB' }),
        ...(this.data.certifications || []),
      ],
    };
    return this;
  }

  forVeteranOwned(): this {
    this.data = {
      ...this.data,
      companyName: 'Veteran-Owned Solutions Inc',
      certifications: [
        createCertification({ type: 'SDVOSB' }),
        ...(this.data.certifications || []),
      ],
    };
    return this;
  }

  withNaicsCodes(...codes: string[]): this {
    const [primary, ...secondary] = codes;
    if (primary) {
      const naicsInfo = Object.values(TEST_NAICS_CODES).find(n => n.code === primary);
      this.data.primaryNaics = naicsInfo || { code: primary, title: 'Custom Services' };
    }
    if (secondary.length) {
      this.data.secondaryNaics = secondary.map(code => {
        const naicsInfo = Object.values(TEST_NAICS_CODES).find(n => n.code === code);
        return naicsInfo || { code, title: 'Custom Services' };
      });
    }
    return this;
  }

  withClearance(level: string): this {
    this.data.securityClearance = {
      level,
      facilityCleared: true,
      personnelCleared: Math.floor(this.data.employeeCount || 50 * 0.3),
    };
    return this;
  }

  withPastPerformance(agency: string, value: number, rating: string = 'EXCELLENT'): this {
    const perf = createPastPerformance({
      agency,
      value,
      performance: rating as any,
    });
    this.data.pastPerformance = [...(this.data.pastPerformance || []), perf];
    return this;
  }

  inLocation(state: string, city?: string): this {
    const address = Object.values(TEST_ADDRESSES).find(a => a.state === state) || {
      street: '123 Business St',
      city: city || 'Capital City',
      state,
      zipCode: '00000',
      country: 'USA',
    };
    this.data.businessAddress = address;
    return this;
  }

  build(): Profile {
    return createProfile(this.data);
  }
}

/**
 * Opportunity Builder for specific opportunity types
 */
export class OpportunityBuilder {
  private data: Partial<Opportunity> = {};

  forAgency(agencyCode: keyof typeof TEST_AGENCIES): this {
    const agency = TEST_AGENCIES[agencyCode];
    this.data.agency = agency.name;
    this.data.office = agency.offices[0];
    return this;
  }

  withValue(min: number, max: number): this {
    this.data.estimatedValue = { min, max, currency: 'USD' };
    return this;
  }

  withSetAside(type: string | null): this {
    this.data.setAside = type;
    return this;
  }

  withNaics(...codes: string[]): this {
    this.data.naicsCodes = codes;
    return this;
  }

  withClearanceRequired(level: string): this {
    this.data.securityClearance = level;
    return this;
  }

  inLocation(state: string, city?: string): this {
    const location = Object.values(TEST_ADDRESSES).find(a => a.state === state) || {
      street: '123 Agency Blvd',
      city: city || 'Capital City',
      state,
      zipCode: '00000',
      country: 'USA',
    };
    this.data.location = location;
    this.data.placeOfPerformance = location;
    return this;
  }

  dueSoon(days: number = 7): this {
    this.data.postedDate = new Date();
    this.data.dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this;
  }

  build(): Opportunity {
    return createOpportunity(this.data);
  }
}

/**
 * Match Score Builder for testing scenarios
 */
export class MatchScoreBuilder {
  private data: Partial<MatchScore> = {};
  private profileData: Partial<Profile> = {};
  private opportunityData: Partial<Opportunity> = {};

  forProfile(profile: Profile | string): this {
    if (typeof profile === 'string') {
      this.data.userId = profile;
    } else {
      this.data.userId = profile.userId;
      this.profileData = profile;
    }
    return this;
  }

  forOpportunity(opportunity: Opportunity | string): this {
    if (typeof opportunity === 'string') {
      this.data.opportunityId = opportunity;
    } else {
      this.data.opportunityId = opportunity.id;
      this.opportunityData = opportunity;
    }
    return this;
  }

  withPerfectMatch(): this {
    this.data.overallScore = 100;
    this.data.factors = {
      naicsAlignment: { score: 100, weight: 40, contribution: 40, details: 'Perfect NAICS match' },
      geographicProximity: { score: 100, weight: 25, contribution: 25, details: 'Same location' },
      certificationMatch: { score: 100, weight: 20, contribution: 20, details: 'All certifications match' },
      pastPerformance: { score: 100, weight: 15, contribution: 15, details: 'Excellent past performance' },
    };
    return this;
  }

  withPoorMatch(): this {
    this.data.overallScore = 25;
    this.data.factors = {
      naicsAlignment: { score: 0, weight: 40, contribution: 0, details: 'No NAICS alignment' },
      geographicProximity: { score: 25, weight: 25, contribution: 6.25, details: 'Different state' },
      certificationMatch: { score: 50, weight: 20, contribution: 10, details: 'Some certifications' },
      pastPerformance: { score: 50, weight: 15, contribution: 7.5, details: 'No relevant experience' },
    };
    return this;
  }

  withScore(score: number): this {
    this.data.overallScore = score;
    return this;
  }

  build(): MatchScore {
    return createMatchScore(this.data);
  }

  buildWithContext(): { 
    matchScore: MatchScore; 
    profile?: Profile; 
    opportunity?: Opportunity;
  } {
    const matchScore = this.build();
    const profile = this.profileData ? createProfile(this.profileData) : undefined;
    const opportunity = this.opportunityData ? createOpportunity(this.opportunityData) : undefined;
    
    return { matchScore, profile, opportunity };
  }
}

/**
 * User Builder for different roles and permissions
 */
export class UserBuilder {
  private data: Partial<User> = {};

  asOwner(): this {
    this.data.role = 'OWNER';
    return this;
  }

  asAdmin(): this {
    this.data.role = 'ADMIN';
    return this;
  }

  asMember(): this {
    this.data.role = 'MEMBER';
    return this;
  }

  asViewer(): this {
    this.data.role = 'VIEWER';
    return this;
  }

  inOrganization(org: Organization | string): this {
    this.data.organizationId = typeof org === 'string' ? org : org.id;
    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  build(): User {
    return createUser(this.data);
  }
}