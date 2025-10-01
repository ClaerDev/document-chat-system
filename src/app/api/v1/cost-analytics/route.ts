/**
 * @swagger
 * /api/v1/cost-analytics:
 *   get:
 *     summary: Get AI cost analytics and optimization recommendations
 *     description: Provides detailed cost analysis, usage metrics, and optimization recommendations for AI operations
 *     tags: [Cost Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: weekly
 *         description: Time period for cost analysis
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period (ISO format)
 *     responses:
 *       200:
 *         description: Cost analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 costSummary:
 *                   type: object
 *                   properties:
 *                     totalCost:
 *                       type: number
 *                       description: Total cost in USD
 *                     tokenCount:
 *                       type: integer
 *                       description: Total tokens processed
 *                     operationCount:
 *                       type: integer
 *                       description: Total number of operations
 *                     averageCostPerOperation:
 *                       type: number
 *                       description: Average cost per operation in USD
 *                     costByModel:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                     costByOperation:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [model_switch, batch_optimization, deduplication, caching]
 *                       priority:
 *                         type: string
 *                         enum: [high, medium, low]
 *                       description:
 *                         type: string
 *                       potentialSavings:
 *                         type: number
 *                       implementation:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { CostOptimizationService } from '@/lib/ai/services/cost-optimization'
import { prisma } from '@/lib/prisma'

const AnalyticsQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']).optional().default('weekly'),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      period: searchParams.get('period') || 'weekly',
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate')
    }

    const validatedParams = AnalyticsQuerySchema.parse(queryParams)

    // Calculate date range
    let startDate: Date
    let endDate: Date = new Date()

    if (validatedParams.startDate && validatedParams.endDate) {
      startDate = new Date(validatedParams.startDate)
      endDate = new Date(validatedParams.endDate)
    } else {
      // Calculate based on period
      const now = new Date()
      switch (validatedParams.period) {
        case 'daily':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'monthly':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }
    }

    // Get cost summary
    const costSummary = await CostOptimizationService.getCostSummary(
      user.organizationId,
      startDate,
      endDate
    )

    // Generate optimization recommendations
    const recommendations = await CostOptimizationService.generateRecommendations(
      user.organizationId,
      costSummary
    )

    // Calculate additional metrics
    const dailyAverage = costSummary.totalCost / Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)))
    const monthlyProjection = dailyAverage * 30

    // Get cost trends (simplified for now)
    const costTrends = await getCostTrends(user.organizationId, startDate, endDate)

    return NextResponse.json({
      success: true,
      costSummary: {
        ...costSummary,
        dailyAverage,
        monthlyProjection
      },
      recommendations,
      trends: costTrends,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        type: validatedParams.period
      }
    })

  } catch (error) {
    console.error('Cost analytics error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getCostTrends(organizationId: string, startDate: Date, endDate: Date): Promise<Array<{
  date: string
  cost: number
  tokens: number
  operations: number
}>> {
  try {
    const trends = await prisma.$queryRaw<any[]>`
      SELECT 
        date_trunc('day', timestamp) as date,
        SUM(estimated_cost) as cost,
        SUM(tokens) as tokens,
        COUNT(*) as operations
      FROM cost_metrics
      WHERE organization_id = ${organizationId}
        AND timestamp BETWEEN ${startDate} AND ${endDate}
      GROUP BY date_trunc('day', timestamp)
      ORDER BY date ASC
    `

    return trends.map(row => ({
      date: row.date.toISOString().split('T')[0],
      cost: parseFloat(row.cost || 0),
      tokens: parseInt(row.tokens || 0),
      operations: parseInt(row.operations || 0)
    }))
  } catch (error) {
    console.warn('Cost trends unavailable:', error)
    return []
  }
}