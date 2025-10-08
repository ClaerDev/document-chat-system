// Integration examples for key Document Chat System application areas
import { auditLogger } from './audit-logger';
import { AuditUserAction, AuditDataAccess, AuditSecurityEvent } from './decorators';
import { useAuditLog, useFormAudit } from './hooks';
import { AuditEventType } from '@prisma/client';

// =============================================================================
// 1. OPPORTUNITY MANAGEMENT INTEGRATION
// =============================================================================

export class OpportunityManagementService {
  
  @AuditDataAccess(AuditEventType.OPPORTUNITY_SEARCH, 'opportunity')
  async searchOpportunities(filters: any, userId: string) {
    const results = await this.performSearch(filters);
    
    // Additional manual logging for search analytics
    await auditLogger.logUserAction(
      AuditEventType.OPPORTUNITY_SEARCH,
      'search-query',
      'search',
      `User searched opportunities with ${Object.keys(filters).length} filters`,
      {
        filterCount: Object.keys(filters).length,
        activeFilters: Object.keys(filters),
        resultCount: results.length,
        searchDuration: results.searchTime,
      }
    );
    
    return results;
  }

  @AuditUserAction(AuditEventType.OPPORTUNITY_SAVE, 'opportunity')
  async saveOpportunityToFavorites(opportunityId: string, userId: string) {
    const opportunity = await this.getOpportunity(opportunityId);
    
    await prisma.favoriteOpportunity.create({
      data: { opportunityId, userId }
    });

    await auditLogger.logUserAction(
      AuditEventType.OPPORTUNITY_SAVE,
      opportunityId,
      'opportunity',
      `User saved opportunity to favorites: ${opportunity.title}`,
      {
        opportunityTitle: opportunity.title,
        agency: opportunity.agency,
        contractValue: opportunity.contractValue,
        deadline: opportunity.deadline,
      }
    );
  }

  @AuditUserAction(AuditEventType.OPPORTUNITY_STATUS_CHANGE, 'opportunity')
  async updateOpportunityStatus(opportunityId: string, newStatus: string, userId: string) {
    const before = await prisma.opportunityStatus.findFirst({
      where: { opportunityId, userId }
    });

    await prisma.opportunityStatus.upsert({
      where: { opportunityId_userId: { opportunityId, userId } },
      update: { status: newStatus },
      create: { opportunityId, userId, status: newStatus }
    });

    await auditLogger.logUserAction(
      AuditEventType.OPPORTUNITY_STATUS_CHANGE,
      opportunityId,
      'opportunity',
      `Opportunity status changed from ${before?.status || 'none'} to ${newStatus}`,
      {
        previousStatus: before?.status,
        newStatus,
        opportunityId,
        statusHistory: await this.getStatusHistory(opportunityId, userId),
      }
    );
  }

  private async performSearch(filters: any) {
    // Your search implementation
    return { length: 10, searchTime: 150 };
  }

  private async getOpportunity(id: string) {
    return { title: 'Sample Opportunity', agency: 'DOD', contractValue: 100000, deadline: new Date() };
  }

  private async getStatusHistory(opportunityId: string, userId: string) {
    return [];
  }
}

// =============================================================================
// 2. MATCH SCORE CALCULATION INTEGRATION
// =============================================================================

export class MatchScoreService {

  @AuditUserAction(AuditEventType.MATCH_SCORE_CALCULATE, 'match_score')
  async calculateMatchScore(opportunityId: string, profileId: string) {
    const startTime = Date.now();
    
    try {
      // Check usage limits first
      const usageCheck = await this.checkUsageLimits(profileId);
      if (!usageCheck.allowed) {
        await auditLogger.logUserAction(
          AuditEventType.USAGE_LIMIT_EXCEEDED,
          profileId,
          'usage_limit',
          `Match score calculation blocked: ${usageCheck.reason}`,
          {
            profileId,
            opportunityId,
            limitType: usageCheck.limitType,
            currentUsage: usageCheck.currentUsage,
            limit: usageCheck.limit,
          }
        );
        throw new Error(`Usage limit exceeded: ${usageCheck.reason}`);
      }

      const matchScore = await this.performCalculation(opportunityId, profileId);
      const duration = Date.now() - startTime;

      await auditLogger.logUserAction(
        AuditEventType.MATCH_SCORE_CALCULATE,
        matchScore.id,
        'match_score',
        `Match score calculated: ${matchScore.score}% match`,
        {
          opportunityId,
          profileId,
          score: matchScore.score,
          confidence: matchScore.confidence,
          calculationTime: duration,
          factors: matchScore.factors.map(f => f.name),
          algorithm: matchScore.algorithmVersion,
        }
      );

      return matchScore;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await auditLogger.logUserAction(
        AuditEventType.MATCH_SCORE_ERROR,
        opportunityId,
        'match_score',
        `Match score calculation failed: ${error.message}`,
        {
          opportunityId,
          profileId,
          error: error.message,
          calculationTime: duration,
          errorType: error.constructor.name,
        }
      );
      throw error;
    }
  }

  @AuditUserAction(AuditEventType.MATCH_SCORE_FEEDBACK, 'match_score')
  async submitFeedback(matchScoreId: string, feedback: 'positive' | 'negative', comment?: string) {
    await prisma.matchScoreFeedback.create({
      data: {
        matchScoreId,
        feedback,
        comment,
        submittedAt: new Date(),
      }
    });

    await auditLogger.logUserAction(
      AuditEventType.MATCH_SCORE_FEEDBACK,
      matchScoreId,
      'match_score',
      `User provided ${feedback} feedback on match score`,
      {
        matchScoreId,
        feedback,
        hasComment: !!comment,
        commentLength: comment?.length || 0,
      }
    );
  }

  private async checkUsageLimits(profileId: string) {
    return { allowed: true, reason: '', limitType: '', currentUsage: 0, limit: 100 };
  }

  private async performCalculation(opportunityId: string, profileId: string) {
    return {
      id: 'ms_123',
      score: 85,
      confidence: 0.9,
      factors: [{ name: 'NAICS Alignment' }],
      algorithmVersion: '2.0',
    };
  }
}

// =============================================================================
// 3. USER AUTHENTICATION INTEGRATION
// =============================================================================

export class AuthenticationService {

  @AuditSecurityEvent(AuditEventType.USER_LOGIN)
  async handleLogin(email: string, loginMethod: 'password' | 'oauth' | 'sso') {
    try {
      const user = await this.authenticateUser(email, loginMethod);
      
      await auditLogger.logSecurityEvent(
        AuditEventType.USER_LOGIN,
        `User login successful: ${email}`,
        'INFO',
        {
          userEmail: email,
          userId: user.id,
          loginMethod,
          success: true,
          lastLoginAt: user.lastLoginAt,
          loginCount: user.loginCount + 1,
        }
      );

      // Update user login stats
      await this.updateLoginStats(user.id);

      return user;
    } catch (error) {
      await auditLogger.logSecurityEvent(
        AuditEventType.LOGIN_FAILED,
        `User login failed: ${email}`,
        'WARNING',
        {
          userEmail: email,
          loginMethod,
          success: false,
          error: error.message,
          attemptedAt: new Date(),
        }
      );

      // Track failed attempts for security monitoring
      await this.trackFailedAttempt(email);
      throw error;
    }
  }

  @AuditSecurityEvent(AuditEventType.PASSWORD_CHANGE)
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    try {
      await this.validateOldPassword(userId, oldPassword);
      await this.updatePassword(userId, newPassword);

      await auditLogger.logSecurityEvent(
        AuditEventType.PASSWORD_CHANGE,
        'User password changed successfully',
        'INFO',
        {
          userId,
          changedAt: new Date(),
          passwordStrength: this.assessPasswordStrength(newPassword),
        }
      );
    } catch (error) {
      await auditLogger.logSecurityEvent(
        AuditEventType.PASSWORD_CHANGE_FAILED,
        `Password change failed: ${error.message}`,
        'WARNING',
        {
          userId,
          error: error.message,
          attemptedAt: new Date(),
        }
      );
      throw error;
    }
  }

  async detectSuspiciousActivity(userId: string, ipAddress: string, userAgent: string) {
    const recentLogins = await this.getRecentLogins(userId, 24); // Last 24 hours
    const uniqueIPs = [...new Set(recentLogins.map(l => l.ipAddress))];
    const uniqueUserAgents = [...new Set(recentLogins.map(l => l.userAgent))];

    if (uniqueIPs.length > 5 || uniqueUserAgents.length > 3) {
      await auditLogger.logSecurityEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        'Suspicious login activity detected',
        'WARNING',
        {
          userId,
          uniqueIPCount: uniqueIPs.length,
          uniqueUserAgentCount: uniqueUserAgents.length,
          recentLoginCount: recentLogins.length,
          currentIP: ipAddress,
          currentUserAgent: userAgent,
          timeframe: '24h',
        }
      );

      // Create security incident for investigation
      await this.createSecurityIncident(userId, 'SUSPICIOUS_LOGIN', {
        uniqueIPs,
        recentLogins: recentLogins.slice(0, 10), // Recent 10 logins
      });
    }
  }

  private async authenticateUser(email: string, method: string) {
    return { id: 'user_123', email, lastLoginAt: new Date(), loginCount: 5 };
  }

  private async updateLoginStats(userId: string) {}
  private async trackFailedAttempt(email: string) {}
  private async validateOldPassword(userId: string, password: string) {}
  private async updatePassword(userId: string, password: string) {}
  private assessPasswordStrength(password: string) { return 'strong'; }
  private async getRecentLogins(userId: string, hours: number) { return []; }
  private async createSecurityIncident(userId: string, type: string, metadata: any) {}
}

// =============================================================================
// 4. BILLING AND SUBSCRIPTION INTEGRATION
// =============================================================================

export class BillingService {

  @AuditUserAction(AuditEventType.SUBSCRIPTION_CREATE, 'subscription')
  async createSubscription(userId: string, planId: string, paymentMethodId: string) {
    try {
      const subscription = await this.createStripeSubscription(userId, planId, paymentMethodId);
      
      await auditLogger.logUserAction(
        AuditEventType.SUBSCRIPTION_CREATE,
        subscription.id,
        'subscription',
        `Subscription created for plan: ${planId}`,
        {
          userId,
          planId,
          subscriptionId: subscription.id,
          amount: subscription.amount,
          currency: subscription.currency,
          interval: subscription.interval,
          trialEnd: subscription.trialEnd,
          paymentMethodType: subscription.paymentMethod.type,
        }
      );

      return subscription;
    } catch (error) {
      await auditLogger.logUserAction(
        AuditEventType.SUBSCRIPTION_FAILED,
        userId,
        'subscription',
        `Subscription creation failed: ${error.message}`,
        {
          userId,
          planId,
          error: error.message,
          paymentMethodId,
        }
      );
      throw error;
    }
  }

  @AuditUserAction(AuditEventType.PAYMENT_PROCESSED, 'payment')
  async processPayment(subscriptionId: string, amount: number, currency: string) {
    try {
      const payment = await this.chargeSubscription(subscriptionId, amount, currency);

      await auditLogger.logUserAction(
        AuditEventType.PAYMENT_PROCESSED,
        payment.id,
        'payment',
        `Payment processed successfully: ${currency} ${amount}`,
        {
          subscriptionId,
          paymentId: payment.id,
          amount,
          currency,
          paymentMethod: payment.paymentMethod,
          stripeChargeId: payment.stripeChargeId,
          processedAt: payment.processedAt,
        }
      );

      return payment;
    } catch (error) {
      await auditLogger.logUserAction(
        AuditEventType.PAYMENT_FAILED,
        subscriptionId,
        'payment',
        `Payment processing failed: ${error.message}`,
        {
          subscriptionId,
          amount,
          currency,
          error: error.message,
          failureCode: error.code,
          failureReason: error.decline_code,
        }
      );
      throw error;
    }
  }

  private async createStripeSubscription(userId: string, planId: string, paymentMethodId: string) {
    return {
      id: 'sub_123',
      amount: 9900,
      currency: 'USD',
      interval: 'month',
      trialEnd: new Date(),
      paymentMethod: { type: 'card' },
    };
  }

  private async chargeSubscription(subscriptionId: string, amount: number, currency: string) {
    return {
      id: 'pay_123',
      paymentMethod: 'card',
      stripeChargeId: 'ch_123',
      processedAt: new Date(),
    };
  }
}

// =============================================================================
// 5. REACT COMPONENT INTEGRATION EXAMPLES
// =============================================================================

// Example: Opportunity List Component
export function OpportunityListComponent() {
  const { logUserInteraction, logPageView } = useAuditLog();

  useEffect(() => {
    logPageView('opportunities-list', {
      viewType: 'list',
      filterCount: 0,
    });
  }, [logPageView]);

  const handleOpportunityClick = async (opportunityId: string, opportunityTitle: string) => {
    await logUserInteraction(
      AuditEventType.OPPORTUNITY_VIEW,
      `User clicked on opportunity: ${opportunityTitle}`,
      {
        opportunityId,
        opportunityTitle,
        clickedAt: new Date(),
        source: 'opportunity_list',
      }
    );
  };

  const handleSearchFilter = async (filters: any) => {
    await logUserInteraction(
      AuditEventType.OPPORTUNITY_SEARCH,
      `User applied ${Object.keys(filters).length} search filters`,
      {
        filterCount: Object.keys(filters).length,
        activeFilters: Object.keys(filters),
        filterValues: filters,
      }
    );
  };

  return null; // JSX component implementation would go here
}

// Example: Profile Form Component
export function ProfileFormComponent() {
  const { logFieldChange, logSubmit, logValidationError } = useFormAudit('profile-form');

  const handleFieldChange = (fieldName: string, value: any) => {
    logFieldChange(fieldName, value);
  };

  const handleSubmit = async (formData: any) => {
    try {
      await updateProfile(formData);
      await logSubmit(formData);
    } catch (error) {
      if (error.validationErrors) {
        for (const [field, message] of Object.entries(error.validationErrors)) {
          await logValidationError(field, message as string);
        }
      }
    }
  };

  return null; // JSX form implementation would go here
}

// =============================================================================
// 6. API MIDDLEWARE INTEGRATION
// =============================================================================

// Example: Next.js API Route with Audit Logging
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  try {
    const body = await request.json();
    
    // Log API request start
    await auditLogger.log({
      eventType: AuditEventType.API_REQUEST,
      category: 'SYSTEM',
      severity: 'INFO',
      description: `API request started: POST /api/opportunities/create`,
      metadata: {
        endpoint: '/api/opportunities/create',
        method: 'POST',
        hasBody: !!body,
        bodySize: JSON.stringify(body).length,
        userAgent: request.headers.get('user-agent'),
      },
      correlationId,
    });

    // Process the request
    const result = await createOpportunity(body);
    const duration = Date.now() - startTime;

    // Log successful completion
    await auditLogger.log({
      eventType: AuditEventType.API_REQUEST,
      category: 'SYSTEM',
      severity: 'INFO',
      description: `API request completed successfully`,
      metadata: {
        endpoint: '/api/opportunities/create',
        method: 'POST',
        statusCode: 200,
        duration,
        resultId: result.id,
      },
      correlationId,
    });

    return NextResponse.json(result);
    
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error
    await auditLogger.log({
      eventType: AuditEventType.API_ERROR,
      category: 'SYSTEM',
      severity: 'ERROR',
      description: `API request failed: ${error.message}`,
      metadata: {
        endpoint: '/api/opportunities/create',
        method: 'POST',
        statusCode: 500,
        duration,
        error: error.message,
        stack: error.stack,
      },
      correlationId,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// 7. BACKGROUND JOB INTEGRATION
// =============================================================================

export const processDataImport = inngest.createFunction(
  { id: 'process-data-import' },
  { event: 'data.import.started' },
  async ({ event, step }) => {
    const { importId, source, recordCount } = event.data;

    // Log import start
    await step.run('log-import-start', async () => {
      await auditLogger.logSystemEvent(
        AuditEventType.DATA_IMPORT_START,
        `Data import started from ${source}`,
        'INFO',
        {
          importId,
          source,
          recordCount,
          startedAt: new Date(),
        }
      );
    });

    // Process import
    const result = await step.run('process-import', async () => {
      return await processImport(importId, source);
    });

    // Log completion
    await step.run('log-import-complete', async () => {
      await auditLogger.logSystemEvent(
        AuditEventType.DATA_IMPORT_COMPLETE,
        `Data import completed: ${result.processedCount}/${recordCount} records`,
        'INFO',
        {
          importId,
          source,
          totalRecords: recordCount,
          processedRecords: result.processedCount,
          errorCount: result.errorCount,
          duration: result.duration,
          completedAt: new Date(),
        }
      );
    });

    return result;
  }
);

async function updateProfile(data: any) { }
async function createOpportunity(data: any) { return { id: 'opp_123' }; }
async function processImport(id: string, source: string) {
  return { processedCount: 100, errorCount: 0, duration: 5000 };
}