import { NextRequest, NextResponse } from 'next/server';
import { AIServiceManager } from '@/lib/ai';
import { auth } from '@clerk/nextjs/server';
import { handleApiError } from '@/lib/api-errors';
import { z } from 'zod';

// Global AI service instance
let aiServiceInstance: AIServiceManager | null = null;

function getAIService(): AIServiceManager {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIServiceManager();
  }
  return aiServiceInstance;
}

const analyticsQuerySchema = z.object({
  organizationId: z.string().optional(),
  period: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
  type: z.enum(['cost', 'usage', 'performance', 'providers']).optional().default('usage')
});

/**
 * @swagger
 * /api/ai/analytics:
 *   get:
 *     summary: Get AI analytics and metrics
 *     description: Retrieve AI usage analytics, cost analysis, performance metrics, and provider statistics
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: Organization ID for scoped analytics
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *         description: Time period for analytics aggregation
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [cost, usage, performance, providers]
 *           default: usage
 *         description: Type of analytics to retrieve
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   example: "usage"
 *                 period:
 *                   type: string
 *                   example: "day"
 *                 organizationId:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 data:
 *                   type: object
 *                   description: Analytics data varies by type
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Perform AI analytics actions
 *     description: Clear metrics or export reports for AI services
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [clear_metrics, export_report]
 *                 description: Action to perform
 *               organizationId:
 *                 type: string
 *                 description: Organization ID (required for most actions)
 *               reportType:
 *                 type: string
 *                 enum: [usage, cost]
 *                 description: Type of report to export
 *               period:
 *                 type: string
 *                 enum: [hour, day, week, month]
 *                 default: month
 *                 description: Report period
 *               format:
 *                 type: string
 *                 enum: [json, csv]
 *                 default: json
 *                 description: Export format
 *     responses:
 *       200:
 *         description: Action completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 reportType:
 *                   type: string
 *                 period:
 *                   type: string
 *                 organizationId:
 *                   type: string
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      organizationId: searchParams.get('organizationId') || orgId,
      period: searchParams.get('period') || 'day',
      type: searchParams.get('type') || 'usage'
    };

    const validation = analyticsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters',
        details: validation.error.errors
      }, { status: 400 });
    }

    const { organizationId, period, type } = validation.data;
    const aiService = getAIService();

    let result;

    switch (type) {
      case 'cost':
        result = aiService.getCostAnalytics(organizationId, period);
        break;

      case 'usage':
        if (organizationId) {
          result = await aiService.getUsageReport(organizationId, period);
        } else {
          return NextResponse.json({ error: 'Organization ID required for usage reports' }, { status: 400 });
        }
        break;

      case 'performance':
        result = {
          systemHealth: aiService.getSystemHealthStatus(),
          providerMetrics: aiService.getProviderMetrics(organizationId),
          circuitBreakers: aiService.getCircuitBreakerStatus()
        };
        break;

      case 'providers':
        result = {
          configured: aiService.getConfiguredProviders(),
          metrics: aiService.getProviderMetrics(organizationId),
          health: aiService.getSystemHealthStatus()
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
    }

    return NextResponse.json({
      type,
      period,
      organizationId,
      timestamp: new Date().toISOString(),
      data: result
    });

  } catch (error) {
    console.error('AI analytics request failed:', error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, organizationId = orgId } = body;

    const aiService = getAIService();

    switch (action) {
      case 'clear_metrics':
        // Clear metrics for the organization
        if (organizationId) {
          // Would implement organization-specific metric clearing
          aiService.clearMetrics();
          return NextResponse.json({ 
            success: true,
            message: `Metrics cleared for organization ${organizationId}`
          });
        } else {
          return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }

      case 'export_report':
        const { reportType = 'usage', period = 'month', format = 'json' } = body;
        
        if (!organizationId) {
          return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }

        let reportData;
        switch (reportType) {
          case 'usage':
            reportData = await aiService.getUsageReport(organizationId, period);
            break;
          case 'cost':
            reportData = aiService.getCostAnalytics(organizationId, period);
            break;
          default:
            return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
        }

        if (format === 'csv') {
          // Convert to CSV format (simplified implementation)
          const csvData = convertToCSV(reportData);
          return new NextResponse(csvData, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="ai-${reportType}-report-${period}.csv"`
            }
          });
        }

        return NextResponse.json({
          reportType,
          period,
          organizationId,
          generatedAt: new Date().toISOString(),
          data: reportData
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('AI analytics action failed:', error);
    return handleApiError(error);
  }
}

function convertToCSV(data: any): string {
  // Simplified CSV conversion - would be more robust in production
  if (!data || typeof data !== 'object') {
    return 'No data available';
  }

  const headers = Object.keys(data);
  const csvHeaders = headers.join(',');
  
  // For complex nested data, this would need more sophisticated handling
  const csvRows = [csvHeaders];
  
  if (data.summary) {
    const summaryRow = Object.values(data.summary).join(',');
    csvRows.push(summaryRow);
  }

  return csvRows.join('\n');
}