/**
 * Opportunity Analysis Polling API
 * 
 * Allows clients to poll for completed analysis data and update their stores.
 * This enables real-time UI updates when background analysis completes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const ParamsSchema = z.object({
  id: z.string().min(1).describe("Opportunity ID to poll analysis for")
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization required' },
        { status: 400 }
      );
    }

    const params = await context.params;
    const { id: opportunityId } = ParamsSchema.parse(params);

    // Get the current cache timestamps from query params (to avoid refetching unchanged data)
    const searchParams = request.nextUrl.searchParams;
    const lastAICheck = searchParams.get('lastAICheck');
    const lastCompetitorsCheck = searchParams.get('lastCompetitorsCheck');
    const lastSimilarContractsCheck = searchParams.get('lastSimilarContractsCheck');

    // Check for fresh analysis data
    const [aiAnalysis, competitors, similarContracts] = await Promise.all([
      // AI Analysis
      supabase
        .from('opportunity_ai_analysis')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .eq('organization_id', orgId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) return null;
          
          // Only return if data is newer than last check
          const dataTime = new Date(data.updated_at || data.created_at).getTime();
          const lastCheck = lastAICheck ? parseInt(lastAICheck) : 0;
          
          return dataTime > lastCheck ? {
            data: data.analysis_data,
            timestamp: dataTime,
            type: 'aiInsights'
          } : null;
        })
        .catch(() => null),

      // Competitors
      supabase
        .from('opportunity_competitors_cache')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .eq('organization_id', orgId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) return null;
          
          const dataTime = new Date(data.created_at).getTime();
          const lastCheck = lastCompetitorsCheck ? parseInt(lastCompetitorsCheck) : 0;
          
          return dataTime > lastCheck ? {
            data: data.competitors_data,
            timestamp: dataTime,
            type: 'competitors'
          } : null;
        })
        .catch(() => null),

      // Similar Contracts
      supabase
        .from('opportunity_similar_contracts_cache')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .eq('organization_id', orgId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) return null;
          
          const dataTime = new Date(data.created_at).getTime();
          const lastCheck = lastSimilarContractsCheck ? parseInt(lastSimilarContractsCheck) : 0;
          
          return dataTime > lastCheck ? {
            data: data.contracts_data,
            timestamp: dataTime,
            type: 'similarContracts'
          } : null;
        })
        .catch(() => null),
    ]);

    // Prepare response with only new data
    const updates: any = {};
    let hasUpdates = false;

    if (aiAnalysis) {
      updates.aiAnalysis = aiAnalysis;
      hasUpdates = true;
    }

    if (competitors) {
      updates.competitors = competitors;
      hasUpdates = true;
    }

    if (similarContracts) {
      updates.similarContracts = similarContracts;
      hasUpdates = true;
    }

    return NextResponse.json({
      success: true,
      hasUpdates,
      updates,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Analysis polling error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}